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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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
  RotateCcw,
  SlidersHorizontal,
  CalendarDays,
  DollarSign,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PaymentMethod, Transaction, TransactionType } from '../../types/finance';
import {
  formatCurrency,
  formatDate,
  formatMonthYear,
  formatMonthShort,
  getTodayDateString,
  getCurrentMonthString,
  addMonthsToMonthString,
} from '../../utils/formatters';
import { exportTransactionsToCSV } from '../../utils/exportUtils';
import { TransactionModal } from '../modals/TransactionModal';
import { TransactionDetailsModal } from './TransactionDetailsModal';

function getSubtractedDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
    setSelectedMonth,
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
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Enhanced Period & Advanced Filters state
  const [periodMode, setPeriodMode] = useState<'month' | 'range' | 'all'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const currentActualMonth = useMemo(() => getCurrentMonthString(), []);
  const previousMonthStr = useMemo(() => addMonthsToMonthString(currentActualMonth, -1), [currentActualMonth]);
  const nextMonthStr = useMemo(() => addMonthsToMonthString(currentActualMonth, 1), [currentActualMonth]);

  // Steppers for month mode
  const handlePrevMonth = () => {
    setSelectedMonth(addMonthsToMonthString(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonthsToMonthString(selectedMonth, 1));
  };

  const handleSetCurrentMonth = () => {
    setSelectedMonth(currentActualMonth);
  };

  // Preset button action
  const handleApplyPreset = (preset: '7d' | '15d' | '30d' | '90d' | 'year' | 'last_month' | 'this_month' | 'next_month' | 'all') => {
    if (preset === '7d') {
      setPeriodMode('range');
      setStartDate(getSubtractedDateString(7));
      setEndDate(getTodayDateString());
    } else if (preset === '15d') {
      setPeriodMode('range');
      setStartDate(getSubtractedDateString(15));
      setEndDate(getTodayDateString());
    } else if (preset === '30d') {
      setPeriodMode('range');
      setStartDate(getSubtractedDateString(30));
      setEndDate(getTodayDateString());
    } else if (preset === '90d') {
      setPeriodMode('range');
      setStartDate(getSubtractedDateString(90));
      setEndDate(getTodayDateString());
    } else if (preset === 'year') {
      setPeriodMode('range');
      setStartDate(`${new Date().getFullYear()}-01-01`);
      setEndDate(getTodayDateString());
    } else if (preset === 'last_month') {
      setPeriodMode('month');
      setSelectedMonth(previousMonthStr);
    } else if (preset === 'this_month') {
      setPeriodMode('month');
      setSelectedMonth(currentActualMonth);
    } else if (preset === 'next_month') {
      setPeriodMode('month');
      setSelectedMonth(nextMonthStr);
    } else if (preset === 'all') {
      setPeriodMode('all');
    }
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (periodMode === 'range') count++;
    if (periodMode === 'month' && selectedMonth !== currentActualMonth) count++;
    if (periodMode === 'all') count++;
    if (typeFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (sourceFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (minAmount.trim() !== '') count++;
    if (maxAmount.trim() !== '') count++;
    return count;
  }, [searchTerm, periodMode, selectedMonth, currentActualMonth, typeFilter, categoryFilter, sourceFilter, statusFilter, minAmount, maxAmount]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setPeriodMode('month');
    setSelectedMonth(currentActualMonth);
    setStartDate('');
    setEndDate('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSourceFilter('all');
    setStatusFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date_desc');
  };

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
        // Period filter
        if (periodMode === 'month') {
          if (t.paymentMethod === 'credit_card') {
            if (t.invoiceMonth !== selectedMonth) return false;
          } else {
            if (!t.date.startsWith(selectedMonth)) return false;
          }
        } else if (periodMode === 'range') {
          if (startDate && t.date < startDate) return false;
          if (endDate && t.date > endDate) return false;
        }
        // If 'all', pass through without date filter

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

        // Amount min / max
        if (minAmount.trim() !== '') {
          const min = parseFloat(minAmount);
          if (!isNaN(min) && t.amount < min) return false;
        }
        if (maxAmount.trim() !== '') {
          const max = parseFloat(maxAmount);
          if (!isNaN(max) && t.amount > max) return false;
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
    periodMode,
    selectedMonth,
    startDate,
    endDate,
    typeFilter,
    statusFilter,
    categoryFilter,
    sourceFilter,
    minAmount,
    maxAmount,
    searchTerm,
    categories,
    sortBy,
  ]);

  // Aggregate stats of filtered results
  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const directExpense = filteredTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'account')
      .reduce((sum, t) => sum + t.amount, 0);

    const cardExpenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = directExpense + cardExpenses;
    const net = totalIncome - totalExpense;

    return {
      income: totalIncome,
      directExpense,
      card: cardExpenses,
      expense: totalExpense,
      net,
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
    let suffix = 'geral';
    if (periodMode === 'month') suffix = selectedMonth;
    else if (periodMode === 'range') suffix = `${startDate || 'inicio'}_${endDate || 'fim'}`;
    const filename = `extrato-${suffix}.csv`;
    exportTransactionsToCSV(listToExport, categories, accounts, cards, filename);
  };

  return (
    <div className="space-y-4 relative pb-20">
      {/* Top Controls & Extrato Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs transition-colors">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Lançamentos & Extrato</span>
              </h1>
              <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/60">
                {stats.count} {stats.count === 1 ? 'registro' : 'registros'}
                {stats.count !== transactions.length && (
                  <span className="text-slate-400 dark:text-slate-500 ml-1">
                    (de {transactions.length})
                  </span>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualize, adicione, edite, gerencie e exporte o extrato financeiro completo
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleExportCSV(false)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/80 dark:border-slate-700 cursor-pointer flex-1 sm:flex-initial"
              title="Exportar lançamentos filtrados para arquivo CSV (Excel)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Exportar Extrato</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98 flex-1 sm:flex-initial"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>

        {/* PERIOD SELECTOR ROW */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Period Mode Selector Tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs w-fit">
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  periodMode === 'month'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mês Específico</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPeriodMode('range');
                  if (!startDate) setStartDate(getSubtractedDateString(30));
                  if (!endDate) setEndDate(getTodayDateString());
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  periodMode === 'range'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                <span>Intervalo de Datas</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriodMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  periodMode === 'all'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>Todo o Histórico</span>
              </button>
            </div>

            {/* Sub-controls according to active mode */}
            {periodMode === 'month' && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Stepper with Native Month Picker Overlay */}
                <div className="inline-flex items-center bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Mês anterior"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex items-center px-2">
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => e.target.value && setSelectedMonth(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      title="Clique para selecionar mês e ano"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 select-none py-1">
                      <span className="capitalize">{formatMonthYear(selectedMonth)}</span>
                      <Calendar className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 ml-0.5" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Próximo mês"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Month Presets */}
                <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('last_month')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedMonth === previousMonthStr
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Mês Passado
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('this_month')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedMonth === currentActualMonth
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Mês Atual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('next_month')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedMonth === nextMonthStr
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Próximo Mês
                  </button>
                </div>
              </div>
            )}

            {periodMode === 'range' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-400 font-medium">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden"
                  />
                  <span className="text-slate-400 font-medium ml-1">Até:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden"
                  />
                </div>

                {/* Range Presets */}
                <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('7d')}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    7D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('15d')}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    15D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('30d')}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    30D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('90d')}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    90D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('year')}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Este Ano
                  </button>
                </div>
              </div>
            )}

            {periodMode === 'all' && (
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1.5 py-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Exibindo todo o histórico completo de lançamentos</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Toolbar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-7 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
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

          {/* Advanced Filters Button Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                showAdvancedFilters || minAmount || maxAmount
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Mais Filtros</span>
                {(minAmount || maxAmount) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </span>
              {showAdvancedFilters ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* ADVANCED FILTERS PANEL (COLLAPSIBLE) */}
        {showAdvancedFilters && (
          <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Valor Mínimo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 font-mono">R$</span>
                <input
                  type="number"
                  step="any"
                  placeholder="0,00"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Valor Máximo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 font-mono">R$</span>
                <input
                  type="number"
                  step="any"
                  placeholder="Sem limite"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Situação do Lançamento
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Todas as Situações</option>
                <option value="completed">Apenas Concluídos</option>
                <option value="pending">Apenas Pendentes</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Ordenação dos Registros
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="date_desc">Data (Mais recentes)</option>
                <option value="date_asc">Data (Mais antigos)</option>
                <option value="amount_desc">Valor (Maior)</option>
                <option value="amount_asc">Valor (Menor)</option>
                <option value="description_asc">Descrição (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* ACTIVE FILTERS CHIPS ROW */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-500" />
                Filtros ativos ({activeFiltersCount}):
              </span>

              {searchTerm.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                  <span>Busca: "{searchTerm}"</span>
                  <button onClick={() => setSearchTerm('')} className="cursor-pointer hover:text-emerald-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {periodMode === 'month' && selectedMonth !== currentActualMonth && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] capitalize">
                  <span>Mês: {formatMonthYear(selectedMonth)}</span>
                  <button onClick={() => setSelectedMonth(currentActualMonth)} className="cursor-pointer hover:text-blue-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {periodMode === 'range' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px]">
                  <span>Período: {formatDate(startDate)} a {formatDate(endDate)}</span>
                  <button onClick={() => { setPeriodMode('month'); setStartDate(''); setEndDate(''); }} className="cursor-pointer hover:text-indigo-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px]">
                  <span>
                    Tipo:{' '}
                    {typeFilter === 'income'
                      ? 'Receitas'
                      : typeFilter === 'expense'
                      ? 'Despesas'
                      : typeFilter === 'credit_card'
                      ? 'Cartão'
                      : 'Recorrentes'}
                  </span>
                  <button onClick={() => setTypeFilter('all')} className="cursor-pointer hover:text-purple-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <span>Cat: {categories.find(c => c.id === categoryFilter)?.name}</span>
                  <button onClick={() => setCategoryFilter('all')} className="cursor-pointer hover:text-slate-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {sourceFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <span>
                    Origem:{' '}
                    {accounts.find(a => a.id === sourceFilter)?.name ||
                      cards.find(c => c.id === sourceFilter)?.name}
                  </span>
                  <button onClick={() => setSourceFilter('all')} className="cursor-pointer hover:text-slate-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px]">
                  <span>Status: {statusFilter === 'completed' ? 'Concluído' : 'Pendente'}</span>
                  <button onClick={() => setStatusFilter('all')} className="cursor-pointer hover:text-amber-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(minAmount || maxAmount) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono">
                  <span>
                    Valor:{' '}
                    {minAmount && maxAmount
                      ? `R$ ${minAmount} a ${maxAmount}`
                      : minAmount
                      ? `>= R$ ${minAmount}`
                      : `<= R$ ${maxAmount}`}
                  </span>
                  <button onClick={() => { setMinAmount(''); setMaxAmount(''); }} className="cursor-pointer hover:text-emerald-900 dark:hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar todos os filtros</span>
            </button>
          </div>
        )}

        {/* Filter Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
            <span>
              Receitas: <strong className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(stats.income)}</strong>
            </span>
            <span>
              Despesas em Conta: <strong className="text-rose-600 dark:text-rose-400">-{formatCurrency(stats.directExpense)}</strong>
            </span>
            <span>
              Fatura Cartão: <strong className="text-purple-600 dark:text-purple-400">{formatCurrency(stats.card)}</strong>
            </span>
            <span>
              Total Despesas: <strong className="text-rose-600 dark:text-rose-400">-{formatCurrency(stats.expense)}</strong>
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
