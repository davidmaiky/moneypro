import React, { useState } from 'react';
import { Category, Transaction } from '../../types/finance';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface CategoryDonutChartProps {
  categories: Category[];
  transactions: Transaction[];
  currentMonth: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories,
  transactions,
  currentMonth,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter expenses for current month (direct + card)
  const monthExpenses = React.useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (t.paymentMethod === 'credit_card') {
        return t.invoiceMonth === currentMonth;
      }
      return t.date.startsWith(currentMonth);
    });
  }, [transactions, currentMonth]);

  const totalExpense = React.useMemo(() => {
    return monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [monthExpenses]);

  // Aggregate by category
  const categoryData = React.useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach(t => {
      const prev = map.get(t.categoryId) || 0;
      map.set(t.categoryId, prev + t.amount);
    });

    const items = categories
      .filter(c => c.type === 'expense')
      .map(cat => {
        const amount = map.get(cat.id) || 0;
        const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
        return {
          category: cat,
          amount,
          percent,
        };
      })
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return items;
  }, [monthExpenses, categories, totalExpense]);

  // SVG Donut geometry
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  const activeItem = categoryData.find(d => d.category.id === activeCategory);

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Donut SVG */}
      <div className="relative flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {categoryData.length === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700/60"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={0}
            />
          ) : (
            categoryData.map(item => {
              const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percent;

              const isSelected = activeCategory === item.category.id;

              return (
                <circle
                  key={item.category.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.category.color}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setActiveCategory(item.category.id)}
                  onMouseLeave={() => setActiveCategory(null)}
                />
              );
            })
          )}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
            {activeItem ? activeItem.category.name : 'Total Gasto'}
          </span>
          <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
            {activeItem ? formatCurrency(activeItem.amount) : formatCurrency(totalExpense)}
          </span>
          {activeItem && (
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              {formatPercent(activeItem.percent)}
            </span>
          )}
        </div>
      </div>

      {/* Legend & Breakdown List */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto max-h-48 pr-1">
        {categoryData.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
            Nenhuma despesa registrada neste mês.
          </div>
        ) : (
          categoryData.map(item => {
            const isSelected = activeCategory === item.category.id;
            const budget = item.category.budgetMonthly;
            const isOverBudget = budget ? item.amount > budget : false;

            return (
              <div
                key={item.category.id}
                className={`p-1.5 rounded-md transition-colors cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800/80'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
                onMouseEnter={() => setActiveCategory(item.category.id)}
                onMouseLeave={() => setActiveCategory(null)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.category.color }}
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {formatPercent(item.percent)}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>

                {/* Progress bar vs Budget if defined */}
                {budget && (
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (item.amount / budget) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">
                      {((item.amount / budget) * 100).toFixed(0)}% de {formatCurrency(budget)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
