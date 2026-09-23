import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wallet,
  CreditCard as CardIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Edit2,
  Trash2,
  Zap,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { RecurringTransaction, TransactionType } from '../../types/finance';
import { formatCurrency, formatMonthYear, formatPercent } from '../../utils/formatters';
import { getRecurringMonthStatus } from '../../utils/recurringUtils';

interface RecurringViewProps {
  onOpenRecurringModal: (recurring?: RecurringTransaction | null, defaultType?: TransactionType) => void;
  onOpenProcessModal: (recurring: RecurringTransaction) => void;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  onOpenRecurringModal,
  onOpenProcessModal,
}) => {
  const {
    recurringTransactions,
    accounts,
    cards,
    categories,
    selectedMonth,
    deleteRecurringTransaction,
    toggleRecurringActive,
  } = useFinance();

  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'generated'>('all');
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);

  // Financial summary metrics
  const activeRecurring = useMemo(() => {
    return recurringTransactions.filter(r => r.active);
  }, [recurringTransactions]);

  const totalFixedIncome = useMemo(() => {
    return activeRecurring
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [activeRecurring]);

  const totalFixedExpense = useMemo(() => {
    return activeRecurring
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [activeRecurring]);

  const netFixedMargin = totalFixedIncome - totalFixedExpense;
  const commitmentRatio = totalFixedIncome > 0 ? (totalFixedExpense / totalFixedIncome) * 100 : 0;

  // Filtered recurring items
  const filteredItems = useMemo(() => {
    return recurringTransactions.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      const statusInfo = getRecurringMonthStatus(item, selectedMonth);

      if (statusFilter === 'pending') {
        if (statusInfo.status === 'generated' || statusInfo.status === 'paused') return false;
      } else if (statusFilter === 'generated') {
        if (statusInfo.status !== 'generated') return false;
      }

      return true;
    }).sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [recurringTransactions, typeFilter, statusFilter, selectedMonth]);

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteRecurringTransaction(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Lançamentos Recorrentes & Despesas Fixas</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automatize contas que se repetem todo mês (Salário, Aluguel, Netflix, Academia, Condomínio)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenRecurringModal(null, 'income')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+ Receita Fixa</span>
            </button>
            <button
              onClick={() => onOpenRecurringModal(null, 'expense')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Nova Despesa Fixa</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Receitas Fixas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Receitas Fixas Mensais</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalFixedIncome)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {activeRecurring.filter(r => r.type === 'income').length} receitas configuradas
            </div>
          </div>
        </div>

        {/* Card 2: Despesas Fixas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Despesas Fixas Mensais</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(totalFixedExpense)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {activeRecurring.filter(r => r.type === 'expense').length} contas fixas ativas
            </div>
          </div>
        </div>

        {/* Card 3: Margem Fixa Líquida */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Margem Fixa Líquida</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-mono ${
              netFixedMargin >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(netFixedMargin)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Renda livre após contas fixas
            </div>
          </div>
        </div>

        {/* Card 4: Taxa de Comprometimento */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Comprometimento da Renda</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {totalFixedIncome > 0 ? formatPercent(commitmentRatio) : '---'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {commitmentRatio <= 50
                ? 'Nível saudável de custos fixos'
                : 'Atenção aos custos fixos elevados'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          {/* Type filters */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({recurringTransactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                typeFilter === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Despesas Fixas
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                typeFilter === 'income'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Receitas Fixas
            </button>
          </div>

          {/* Month Status filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 capitalize">
              Em {formatMonthYear(selectedMonth)}:
            </span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Apenas Pendentes para este mês</option>
              <option value="generated">Apenas Já Lançados neste mês</option>
            </select>
          </div>
        </div>

        {/* Empty state with suggestions */}
        {filteredItems.length === 0 ? (
          <div className="py-12 px-4 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Nenhuma recorrência cadastrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure suas despesas e receitas fixas uma única vez para que o FinanFlow projete seu fluxo de caixa e lance automaticamente todo mês!
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenRecurringModal(null, 'expense')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Adicionar Primeiro Lançamento Fixo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Status ({formatMonthYear(selectedMonth).slice(0, 7)})</th>
                  <th className="py-3 px-4">Descrição / Categoria</th>
                  <th className="py-3 px-4">Dia do Mês</th>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4">Tipo de Execução</th>
                  <th className="py-3 px-4 text-right">Valor Mensal</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredItems.map(item => {
                  const statusInfo = getRecurringMonthStatus(item, selectedMonth);
                  const category = categories.find(c => c.id === item.categoryId);
                  const account = accounts.find(a => a.id === item.accountId);
                  const card = cards.find(c => c.id === item.creditCardId);
                  const isIncome = item.type === 'income';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        !item.active ? 'opacity-55' : ''
                      }`}
                    >
                      {/* Status Badge in Selected Month */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {!item.active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Pausado</span>
                          </span>
                        ) : statusInfo.status === 'generated' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Lançado no Mês</span>
                          </span>
                        ) : statusInfo.status === 'due_today' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Vence Hoje!</span>
                          </span>
                        ) : statusInfo.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendente ({statusInfo.dueDateFormatted})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {statusInfo.daysUntil !== undefined
                                ? `Vence em ${statusInfo.daysUntil} dias`
                                : `Vence ${statusInfo.dueDateFormatted}`}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Description / Category */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {item.description}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: category?.color || '#94a3b8' }}
                          />
                          <span>{category?.name || 'Geral'}</span>
                          {item.notes && (
                            <>
                              <span>·</span>
                              <span className="italic truncate max-w-xs">{item.notes}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Due day */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Dia {item.dayOfMonth}</span>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.paymentMethod === 'credit_card' ? (
                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                            <CardIcon className="w-3.5 h-3.5" />
                            <span>{card?.name || 'Cartão de Crédito'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                            <Wallet className="w-3.5 h-3.5" />
                            <span>{account?.name || 'Conta Bancária'}</span>
                          </div>
                        )}
                      </td>

                      {/* Execution mode */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.autoProcess ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-medium text-[11px]" title="Lança automaticamente no dia do vencimento">
                            <Zap className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                            <span>Automático</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]" title="Apenas projeta e solicita confirmação manual">
                            <Clock className="w-3 h-3" />
                            <span>Sob Confirmação</span>
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-xs">
                        <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}>
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(item.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Launch button for this month */}
                          {item.active && statusInfo.status !== 'generated' ? (
                            <button
                              type="button"
                              onClick={() => onOpenProcessModal(item)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-all shadow-2xs cursor-pointer active:scale-95"
                              title="Lançar neste mês"
                            >
                              Lançar agora
                            </button>
                          ) : null}

                          {/* Pause / Resume toggle */}
                          <button
                            type="button"
                            onClick={() => toggleRecurringActive(item.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded-md transition-colors cursor-pointer"
                            title={item.active ? 'Pausar recorrência' : 'Reativar recorrência'}
                          >
                            {item.active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4 text-emerald-500" />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onOpenRecurringModal(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded-md transition-colors cursor-pointer"
                            title="Editar recorrência"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                            title="Excluir recorrência"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Excluir Recorrência
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Deseja realmente remover o lançamento fixo <strong>"{deleteTarget.description}"</strong> de {formatCurrency(deleteTarget.amount)}?
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nota: Lançamentos já gerados e debitados em meses anteriores não serão apagados do seu extrato histórico.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
