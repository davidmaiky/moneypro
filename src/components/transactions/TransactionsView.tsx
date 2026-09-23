import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Calendar,
  CreditCard as CardIcon,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Layers,
  Repeat,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PaymentMethod, Transaction, TransactionType } from '../../types/finance';
import { formatCurrency, formatDate, formatMonthYear } from '../../utils/formatters';

interface TransactionsViewProps {
  onOpenNewTransaction: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenNewTransaction,
}) => {
  const {
    transactions,
    accounts,
    cards,
    categories,
    selectedMonth,
    deleteTransaction,
  } = useFinance();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'credit_card' | 'recurring'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all'); // accountId or cardId
  const [monthScope, setMonthScope] = useState<'selected' | 'all'>('selected');

  // Deletion modal confirmation for installments
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Month filter
      if (monthScope === 'selected') {
        if (t.paymentMethod === 'credit_card') {
          if (t.invoiceMonth !== selectedMonth) return false;
        } else {
          if (!t.date.startsWith(selectedMonth)) return false;
        }
      }

      // Type filter
      if (typeFilter === 'income' && t.type !== 'income') return false;
      if (typeFilter === 'expense' && (t.type !== 'expense' || t.paymentMethod === 'credit_card')) return false;
      if (typeFilter === 'credit_card' && t.paymentMethod !== 'credit_card') return false;
      if (typeFilter === 'recurring' && !t.recurringId) return false;

      // Category filter
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;

      // Source filter (Account or Card)
      if (sourceFilter !== 'all') {
        if (t.paymentMethod === 'credit_card') {
          if (t.creditCardId !== sourceFilter) return false;
        } else {
          if (t.accountId !== sourceFilter) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(term);
        const notesMatch = t.notes?.toLowerCase().includes(term);
        const cat = categories.find(c => c.id === t.categoryId);
        const catMatch = cat?.name.toLowerCase().includes(term);
        if (!descMatch && !notesMatch && !catMatch) return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [
    transactions,
    monthScope,
    selectedMonth,
    typeFilter,
    categoryFilter,
    sourceFilter,
    searchTerm,
    categories,
  ]);

  // Aggregate stats of filtered results
  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const cardExpenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income: totalIncome,
      expense: totalExpense,
      card: cardExpenses,
      net: totalIncome - totalExpense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleDeleteConfirm = (deleteEntireSeries: boolean) => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id, deleteEntireSeries);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Summary Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-4 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Lançamentos & Extrato</span>
              <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                ({stats.count} registros)
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualize, filtre e gerencie todas as receitas, despesas e compras no cartão
            </p>
          </div>

          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Lançamento</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="global-search-input"
              data-search-input="true"
              type="text"
              placeholder="Buscar por descrição ou anotação... (/)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
            <kbd className="hidden sm:inline-block absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 rounded">
              /
            </kbd>
          </div>

          {/* Type Segment */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="income">Apenas Receitas</option>
              <option value="expense">Despesas em Conta</option>
              <option value="credit_card">Compras no Cartão</option>
              <option value="recurring">Recorrentes / Fixos</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Todas Categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Scope Toggle */}
          <div>
            <select
              value={monthScope}
              onChange={e => setMonthScope(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="selected">Mês Atual ({formatMonthYear(selectedMonth).slice(0, 7)})</option>
              <option value="all">Todo o Histórico</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span>
              Receitas: <strong className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(stats.income)}</strong>
            </span>
            <span>
              Despesas: <strong className="text-rose-600 dark:text-rose-400">-{formatCurrency(stats.expense)}</strong>
            </span>
            <span>
              (Cartão: <strong className="text-purple-600 dark:text-purple-400">{formatCurrency(stats.card)}</strong>)
            </span>
          </div>

          <div className="text-slate-700 dark:text-slate-300">
            Saldo Período:{' '}
            <strong className={stats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {stats.net >= 0 ? '+' : ''}{formatCurrency(stats.net)}
            </strong>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Forma / Origem</th>
                <th className="py-3 px-4">Parcela / Fatura</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-sm">Nenhum lançamento encontrado para os filtros selecionados.</p>
                    <button
                      onClick={onOpenNewTransaction}
                      className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Cadastrar primeiro lançamento
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const category = categories.find(c => c.id === t.categoryId);
                  const isIncome = t.type === 'income';
                  const isCard = t.paymentMethod === 'credit_card';
                  const card = isCard ? cards.find(c => c.id === t.creditCardId) : null;
                  const account = !isCard ? accounts.find(a => a.id === t.accountId) : null;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400">
                        {formatDate(t.date)}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-xs">{t.description}</span>
                          {t.recurringId && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/40 shrink-0"
                              title="Lançamento gerado a partir de regra fixa / recorrente"
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Fixo</span>
                            </span>
                          )}
                        </div>
                        {t.notes && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate max-w-xs mt-0.5">
                            {t.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category?.color || '#94a3b8' }}
                          />
                          <span className="text-slate-700 dark:text-slate-300">{category?.name || 'Outros'}</span>
                        </div>
                      </td>

                      {/* Source / Method */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {isCard ? (
                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                            <CardIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>{card?.name || 'Cartão'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{account?.name || 'Conta Bancária'}</span>
                          </div>
                        )}
                      </td>

                      {/* Installment / Invoice cycle */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {t.installments ? (
                          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                            <Layers className="w-3 h-3" />
                            <span>
                              {t.installments.current}/{t.installments.total}x
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                              ({t.invoiceMonth})
                            </span>
                          </div>
                        ) : isCard && t.invoiceMonth ? (
                          <span className="text-slate-500 dark:text-slate-400">
                            Fatura {t.invoiceMonth}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">À vista</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-xs">
                        <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}>
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(t.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Confirmar Exclusão
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Deseja realmente excluir o lançamento <strong>"{deleteTarget.description}"</strong> de {formatCurrency(deleteTarget.amount)}?
            </p>

            {deleteTarget.installments && (
              <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 p-2.5 rounded-lg border border-purple-200 dark:border-purple-500/20">
                Esta compra faz parte de um parcelamento de {deleteTarget.installments.total} parcelas.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {deleteTarget.installments && (
                <button
                  type="button"
                  onClick={() => handleDeleteConfirm(true)}
                  className="w-full py-2 px-3 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 border border-rose-200 dark:border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  Excluir Todas as {deleteTarget.installments.total} Parcelas
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDeleteConfirm(false)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                {deleteTarget.installments ? 'Excluir Apenas Esta Parcela' : 'Excluir Lançamento'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
