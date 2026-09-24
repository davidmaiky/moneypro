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
  Download,
  Edit3,
  Eye,
  Copy,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PaymentMethod, Transaction, TransactionType } from '../../types/finance';
import { formatCurrency, formatDate, formatMonthYear, getTodayDateString } from '../../utils/formatters';
import { exportTransactionsToCSV } from '../../utils/exportUtils';
import { TransactionModal } from '../modals/TransactionModal';
import { TransactionDetailsModal } from './TransactionDetailsModal';

interface TransactionsViewProps {
  onOpenNewTransaction: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'description_asc';

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenNewTransaction,
  onEditTransaction,
}) => {
  const {
    transactions,
    accounts,
    cards,
    categories,
    selectedMonth,
    deleteTransaction,
    deleteTransactionsBatch,
    updateTransaction,
    addTransaction,
  } = useFinance();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'credit_card' | 'recurring'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all'); // accountId or cardId
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [monthScope, setMonthScope] = useState<'selected' | 'all'>('selected');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [detailsTarget, setDetailsTarget] = useState<Transaction | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
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

        // Status filter
        if (statusFilter !== 'all' && (t.status || 'completed') !== statusFilter) return false;

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
          const amountMatch = t.amount.toString().includes(term) || formatCurrency(t.amount).toLowerCase().includes(term);
          if (!descMatch && !notesMatch && !catMatch && !amountMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        if (sortBy === 'description_asc') return a.description.localeCompare(b.description);
        return 0;
      });
  }, [
    transactions,
    monthScope,
    selectedMonth,
    typeFilter,
    statusFilter,
    categoryFilter,
    sourceFilter,
    searchTerm,
    categories,
    sortBy,
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

  // Bulk actions calculations
  const selectedTransactions = useMemo(() => {
    const set = new Set(selectedIds);
    return transactions.filter(t => set.has(t.id));
  }, [transactions, selectedIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
  }, [selectedTransactions]);

  // Selection handlers
  const isAllSelected = filteredTransactions.length > 0 && filteredTransactions.every(t => selectedIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  // Single transaction delete
  const handleDeleteConfirm = (deleteEntireSeries: boolean) => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id, deleteEntireSeries);
      setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  // Bulk delete confirmation
  const handleBulkDeleteConfirm = () => {
    if (selectedIds.length > 0) {
      deleteTransactionsBatch(selectedIds);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Bulk mark status
  const handleBulkMarkStatus = (newStatus: 'completed' | 'pending') => {
    selectedIds.forEach(id => {
      updateTransaction(id, { status: newStatus });
    });
  };

  // Quick single-click status toggle
  const handleToggleStatus = (t: Transaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = t.status === 'completed' ? 'pending' : 'completed';
    updateTransaction(t.id, { status: newStatus });
  };

  // Duplicate a transaction (Instant clone)
  const handleDuplicate = (t: Transaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addTransaction({
      description: `${t.description} (Cópia)`,
      amount: t.amount,
      type: t.type,
      date: getTodayDateString(),
      categoryId: t.categoryId,
      paymentMethod: t.paymentMethod,
      accountId: t.accountId,
      creditCardId: t.creditCardId,
      status: 'completed',
      notes: t.notes ? `${t.notes} [Duplicado]` : undefined,
    });
  };

  // Handle edit trigger
  const handleEdit = (t: Transaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onEditTransaction) {
      onEditTransaction(t);
    } else {
      setEditTarget(t);
    }
  };

  // Export to CSV
  const handleExportCSV = (exportOnlySelected = false) => {
    const listToExport = exportOnlySelected ? selectedTransactions : filteredTransactions;
    const filename = `extrato-${monthScope === 'selected' ? selectedMonth : 'geral'}.csv`;
    exportTransactionsToCSV(listToExport, categories, accounts, cards, filename);
  };

  return (
    <div className="space-y-4 relative pb-20">
      {/* Top Controls & Extrato Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 space-y-4 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Lançamentos & Extrato</span>
              <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {stats.count} registros
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualize, adicione, edite, gerencie e exporte o extrato financeiro completo
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleExportCSV(false)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200/80 dark:border-slate-700 cursor-pointer flex-1 sm:flex-initial"
              title="Exportar lançamentos filtrados para arquivo CSV (Excel)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Exportar Extrato</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98 flex-1 sm:flex-initial"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="global-search-input"
              data-search-input="true"
              type="text"
              placeholder="Buscar por descrição, anotação ou valor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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

          {/* Source Filter (Account / Card) */}
          <div>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Todas as Origens</option>
              <optgroup label="Contas Bancárias">
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cartões de Crédito">
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (•••• {c.last4})
                  </option>
                ))}
              </optgroup>
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

        {/* Secondary Filter Row: Status & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Situação:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  statusFilter === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Concluídos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Pendentes
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Ordenar por:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="date_desc">Data (Mais recentes)</option>
              <option value="date_asc">Data (Mais antigos)</option>
              <option value="amount_desc">Valor (Maior)</option>
              <option value="amount_asc">Valor (Menor)</option>
              <option value="description_asc">Descrição (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
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
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Selecionar todos os lançamentos filtrados"
                  />
                </th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Forma / Origem</th>
                <th className="py-3 px-3">Parcela / Fatura</th>
                <th className="py-3 px-3 text-center">Situação</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
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
                  const isCompleted = t.status === 'completed';
                  const isSelected = selectedIds.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setDetailsTarget(t)}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => handleToggleSelectRow(t.id, e as any)}
                          className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400">
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
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category?.color || '#94a3b8' }}
                          />
                          <span className="text-slate-700 dark:text-slate-300">{category?.name || 'Outros'}</span>
                        </div>
                      </td>

                      {/* Source / Method */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {isCard ? (
                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                            <CardIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{card?.name || 'Cartão'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{account?.name || 'Conta Bancária'}</span>
                          </div>
                        )}
                      </td>

                      {/* Installment / Invoice cycle */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                        {t.installments ? (
                          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <Layers className="w-3 h-3 shrink-0" />
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

                      {/* Status Badge (Clickable to quick-toggle) */}
                      <td className="py-3 px-3 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={e => handleToggleStatus(t, e)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/60 dark:border-emerald-800/40'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-800/40'
                          }`}
                          title="Clique para alternar situação"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-amber-500" />
                          )}
                          <span>{isCompleted ? 'Concluído' : 'Pendente'}</span>
                        </button>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-xs">
                        <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}>
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(t.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailsTarget(t)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                            title="Ver detalhes do lançamento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={e => handleEdit(t, e)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400 rounded-md transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={e => handleDuplicate(t, e)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 rounded-md transition-colors cursor-pointer"
                            title="Duplicar lançamento"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
            <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              {selectedIds.length} {selectedIds.length === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <span className="text-xs text-slate-300 font-mono hidden sm:inline">
              (Total: {formatCurrency(selectedTotalAmount)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkMarkStatus('completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Concluir</span>
            </button>

            <button
              onClick={() => handleBulkMarkStatus('pending')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendente</span>
            </button>

            <button
              onClick={() => handleExportCSV(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          </div>

          <button
            onClick={() => setSelectedIds([])}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer ml-1"
            title="Desmarcar todos"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={Boolean(detailsTarget)}
        onClose={() => setDetailsTarget(null)}
        transaction={detailsTarget}
        categories={categories}
        accounts={accounts}
        cards={cards}
        onEdit={t => {
          setDetailsTarget(null);
          handleEdit(t);
        }}
        onDuplicate={t => {
          setDetailsTarget(null);
          handleDuplicate(t);
        }}
        onDelete={t => {
          setDetailsTarget(null);
          setDeleteTarget(t);
        }}
        onToggleStatus={t => {
          handleToggleStatus(t);
          setDetailsTarget(prev => (prev && prev.id === t.id ? { ...prev, status: prev.status === 'completed' ? 'pending' : 'completed' } : prev));
        }}
      />

      {/* Edit Transaction Modal (Internal fallback when onEditTransaction is not handled by parent) */}
      <TransactionModal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        transactionToEdit={editTarget}
      />

      {/* Single Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Confirmar Exclusão
              </h3>
            </div>
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

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Excluir {selectedIds.length} Lançamentos?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Você está prestes a excluir permanentemente os <strong>{selectedIds.length}</strong> lançamentos selecionados.
              O saldo das contas bancárias vinculadas será recalculado automaticamente.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Sim, Excluir {selectedIds.length} Lançamentos
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
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
