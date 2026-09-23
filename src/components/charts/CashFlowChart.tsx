import React, { useState } from 'react';
import { Transaction } from '../../types/finance';
import { addMonthsToMonthString, formatCurrency, formatMonthShort } from '../../utils/formatters';

interface CashFlowChartProps {
  currentMonth: string;
  transactions: Transaction[];
  onSelectMonth?: (month: string) => void;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  currentMonth,
  transactions,
  onSelectMonth,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Generate 6 months data window: 4 prior months, current month, 1 next month
  const months = React.useMemo(() => {
    const list: string[] = [];
    for (let i = -4; i <= 1; i++) {
      list.push(addMonthsToMonthString(currentMonth, i));
    }
    return list;
  }, [currentMonth]);

  const data = React.useMemo(() => {
    return months.map(m => {
      const monthTx = transactions.filter(t => {
        if (t.paymentMethod === 'credit_card') {
          return t.invoiceMonth === m;
        }
        return t.date.startsWith(m);
      });

      const income = monthTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const directExpense = monthTx
        .filter(t => t.type === 'expense' && t.paymentMethod === 'account')
        .reduce((acc, t) => acc + t.amount, 0);
      const cardExpense = monthTx
        .filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card')
        .reduce((acc, t) => acc + t.amount, 0);

      const totalExpense = directExpense + cardExpense;
      const net = income - totalExpense;

      return {
        month: m,
        label: formatMonthShort(m),
        income,
        directExpense,
        cardExpense,
        totalExpense,
        net,
        isCurrent: m === currentMonth,
      };
    });
  }, [months, transactions, currentMonth]);

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.income, d.totalExpense)),
    1000
  ) * 1.15;

  const chartHeight = 180;
  const chartWidth = 560;
  const paddingX = 40;
  const paddingBottom = 28;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingBottom - 10;
  const groupWidth = usableWidth / data.length;
  const barWidth = 14;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
            <span>Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
            <span>Despesas em Conta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 inline-block" />
            <span>Cartão de Crédito</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Últimos 6 meses</span>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto select-none"
        >
          {/* Subtle Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartHeight - paddingBottom - usableHeight * pct;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                  className="text-slate-200 dark:text-slate-700/80"
                />
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const groupX = paddingX + idx * groupWidth;
            const centerX = groupX + groupWidth / 2;

            const incomeH = (item.income / maxVal) * usableHeight;
            const directH = (item.directExpense / maxVal) * usableHeight;
            const cardH = (item.cardExpense / maxVal) * usableHeight;

            const incomeY = chartHeight - paddingBottom - incomeH;
            const cardY = chartHeight - paddingBottom - cardH;
            const directY = cardY - directH;

            const isHovered = hoveredIdx === idx;
            const isCurrent = item.isCurrent;

            return (
              <g
                key={item.month}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectMonth && onSelectMonth(item.month)}
              >
                {/* Active Column Highlight */}
                {isHovered && (
                  <rect
                    x={groupX + 4}
                    y={8}
                    width={groupWidth - 8}
                    height={chartHeight - paddingBottom}
                    fill="currentColor"
                    className="text-slate-200/70 dark:text-slate-700/40"
                    rx="4"
                  />
                )}

                {/* Selected month indicator marker */}
                {isCurrent && (
                  <circle
                    cx={centerX}
                    cy={chartHeight - 4}
                    r="2.5"
                    className="fill-emerald-500 dark:fill-emerald-400"
                  />
                )}

                {/* Income Bar (Green) */}
                <rect
                  x={centerX - barWidth - 1.5}
                  y={incomeY}
                  width={barWidth}
                  height={Math.max(2, incomeH)}
                  rx="2"
                  className="fill-emerald-500 hover:fill-emerald-400 transition-colors"
                />

                {/* Stacked Expense Bars: Card on bottom, direct on top */}
                {/* Card Expense (Purple) */}
                <rect
                  x={centerX + 1.5}
                  y={cardY}
                  width={barWidth}
                  height={Math.max(1, cardH)}
                  rx={directH > 0 ? '0' : '2'}
                  className="fill-purple-500 hover:fill-purple-400 transition-colors"
                />

                {/* Direct Expense (Rose) */}
                {directH > 0 && (
                  <rect
                    x={centerX + 1.5}
                    y={directY}
                    width={barWidth}
                    height={Math.max(1, directH)}
                    rx="2"
                    className="fill-rose-500 hover:fill-rose-400 transition-colors"
                  />
                )}

                {/* Month Label */}
                <text
                  x={centerX}
                  y={chartHeight - 12}
                  textAnchor="middle"
                  className={`text-[11px] font-sans ${
                    isCurrent
                      ? 'fill-emerald-600 dark:fill-emerald-400 font-semibold'
                      : 'fill-slate-500 dark:fill-slate-400 hover:fill-slate-900 dark:hover:fill-slate-200'
                  }`}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="absolute top-1 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs backdrop-blur-md pointer-events-none flex gap-5 z-20"
          >
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {data[hoveredIdx].label} {data[hoveredIdx].isCurrent && '(Atual)'}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                + {formatCurrency(data[hoveredIdx].income)}
              </div>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                Conta: {formatCurrency(data[hoveredIdx].directExpense)}
              </div>
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">
                Cartão: {formatCurrency(data[hoveredIdx].cardExpense)}
              </div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5 pt-0.5 border-t border-slate-200 dark:border-slate-800">
                Saldo: {formatCurrency(data[hoveredIdx].net)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
