import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Category, TransactionType } from '../../types/finance';
import { CategoryIcon } from '../../utils/categoryUtils';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';

interface CategoriesViewProps {
  onOpenCategoryModal: (category?: Category | null, defaultType?: TransactionType) => void;
  onOpenDeleteModal: (category: Category) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  onOpenCategoryModal,
  onOpenDeleteModal,
}) => {
  const {
    categories,
    transactions,
    selectedMonth,
    updateCategoryBudget,
    resetCategoriesToDefault,
  } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [tempBudgetValue, setTempBudgetValue] = useState<string>('');

  // Calculate current month expenses per category (direct bank expenses + credit card transactions billed in selectedMonth)
  const categoryMonthSpent = useMemo(() => {
    const map = new Map<string, number>();

    transactions.forEach(t => {
      let isCurrentMonth = false;
      if (t.paymentMethod === 'credit_card') {
        isCurrentMonth = t.invoiceMonth === selectedMonth;
      } else {
        isCurrentMonth = t.date.startsWith(selectedMonth);
      }

      if (isCurrentMonth) {
        const prev = map.get(t.categoryId) || 0;
        map.set(t.categoryId, prev + t.amount);
      }
    });

    return map;
  }, [transactions, selectedMonth]);

  // Count total transactions per category across all time
  const categoryTransactionsCount = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      const prev = map.get(t.categoryId) || 0;
      map.set(t.categoryId, prev + 1);
    });
    return map;
  }, [transactions]);

  // Overall budget summary
  const budgetSummary = useMemo(() => {
    let totalBudget = 0;
    let totalSpentInBudgeted = 0;
    let budgetedCategoriesCount = 0;

    categories.forEach(c => {
      if (c.type === 'expense' && c.budgetMonthly && c.budgetMonthly > 0) {
        totalBudget += c.budgetMonthly;
        totalSpentInBudgeted += categoryMonthSpent.get(c.id) || 0;
        budgetedCategoriesCount += 1;
      }
    });

    const percentUsed = totalBudget > 0 ? (totalSpentInBudgeted / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalSpentInBudgeted,
      budgetedCategoriesCount,
      percentUsed,
    };
  }, [categories, categoryMonthSpent]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      if (filterType !== 'all' && cat.type !== filterType) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return cat.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [categories, filterType, searchTerm]);

  const expenseCount = categories.filter(c => c.type === 'expense').length;
  const incomeCount = categories.filter(c => c.type === 'income').length;

  const handleSaveBudget = (categoryId: string) => {
    const parsed = tempBudgetValue ? parseFloat(tempBudgetValue.replace(',', '.')) : 0;
    updateCategoryBudget(categoryId, isNaN(parsed) ? 0 : parsed);
    setEditingBudgetId(null);
    setTempBudgetValue('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Categories */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Categorias Cadastradas</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {categories.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {expenseCount} Despesas
              </span>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {incomeCount} Receitas
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Budget Planned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Orçamento Mensal Planejado</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(budgetSummary.totalBudget)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Distribuído em {budgetSummary.budgetedCategoriesCount} categorias com meta definida
            </div>
          </div>
        </div>

        {/* Card 3: Budget Health */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Consumo do Orçamento ({formatMonthYear(selectedMonth)})</span>
            <div className={`p-2 rounded-lg ${
              budgetSummary.percentUsed > 100
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            }`}>
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatCurrency(budgetSummary.totalSpentInBudgeted)}
              </div>
              <div className={`text-xs font-mono font-bold ${
                budgetSummary.percentUsed > 100
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-indigo-600 dark:text-indigo-400'
              }`}>
                {budgetSummary.percentUsed.toFixed(0)}%
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetSummary.percentUsed > 100
                    ? 'bg-rose-500'
                    : budgetSummary.percentUsed > 80
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(budgetSummary.percentUsed, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar categoria..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Despesas ({expenseCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('income')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'income'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Receitas ({incomeCount})
            </button>
          </div>

          {/* New Category Button */}
          <button
            type="button"
            onClick={() => onOpenCategoryModal(null, filterType === 'income' ? 'income' : 'expense')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Categoria</span>
          </button>

          {/* Reset Defaults */}
          <button
            type="button"
            title="Restaurar categorias padrão do sistema"
            onClick={() => {
              if (confirm('Deseja restaurar as categorias padrão do FinanFlow?')) {
                resetCategoriesToDefault();
              }
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400 dark:text-slate-500">
          <Tag className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nenhuma categoria encontrada
          </p>
          <p className="text-xs mt-1">
            Crie sua primeira categoria ou ajuste o termo de busca.
          </p>
          <button
            type="button"
            onClick={() => onOpenCategoryModal(null, 'expense')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Categoria</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map(cat => {
            const isIncome = cat.type === 'income';
            const spentThisMonth = categoryMonthSpent.get(cat.id) || 0;
            const txCount = categoryTransactionsCount.get(cat.id) || 0;
            const hasBudget = !isIncome && cat.budgetMonthly && cat.budgetMonthly > 0;
            const budget = cat.budgetMonthly || 0;
            const budgetPercent = hasBudget ? (spentThisMonth / budget) * 100 : 0;
            const isOverBudget = hasBudget && spentThisMonth > budget;
            const isSystem = cat.id === 'cat_fatura';

            return (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-3.5 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.iconName} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {cat.name}
                        </span>
                        {isSystem && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                            Sistema
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span
                          className={`font-medium ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? 'Receita' : 'Despesa'}
                        </span>
                        <span>·</span>
                        <span>{txCount} {txCount === 1 ? 'registro' : 'registros'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Editar categoria"
                      onClick={() => onOpenCategoryModal(cat)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!isSystem && (
                      <button
                        type="button"
                        title="Excluir categoria"
                        onClick={() => onOpenDeleteModal(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Monthly Volume */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Total em {formatMonthYear(selectedMonth)}:
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : spentThisMonth > 0
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(spentThisMonth)}
                    </span>
                  </div>

                  {/* Budget bar for expenses */}
                  {!isIncome && (
                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Target className="w-3 h-3 text-indigo-500" />
                          <span>Meta Orçamento:</span>
                        </span>

                        {editingBudgetId === cat.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempBudgetValue}
                              onChange={e => setTempBudgetValue(e.target.value.replace(/[^0-9,.]/g, ''))}
                              placeholder="0,00"
                              autoFocus
                              className="w-20 px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-slate-900 border border-indigo-500 rounded text-right focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveBudget(cat.id)}
                              className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudgetId(cat.id);
                              setTempBudgetValue(cat.budgetMonthly ? cat.budgetMonthly.toString() : '');
                            }}
                            className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                            title="Clique para editar a meta de orçamento"
                          >
                            <span>{hasBudget ? formatCurrency(budget) : '+ Definir meta'}</span>
                          </button>
                        )}
                      </div>

                      {hasBudget && (
                        <>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOverBudget
                                  ? 'bg-rose-500'
                                  : budgetPercent > 80
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>{budgetPercent.toFixed(0)}% utilizado</span>
                            <span className={isOverBudget ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400'}>
                              {isOverBudget
                                ? `Estourou em ${formatCurrency(spentThisMonth - budget)}`
                                : `Resta ${formatCurrency(budget - spentThisMonth)}`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
