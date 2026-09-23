import React, { useState } from 'react';
import { CreditCard, Transaction } from '../../types/finance';
import { addMonthsToMonthString, formatCurrency, formatMonthShort } from '../../utils/formatters';

interface InstallmentsForecastChartProps {
  cards: CreditCard[];
  transactions: Transaction[];
  currentMonth: string;
}

export const InstallmentsForecastChart: React.FC<InstallmentsForecastChartProps> = ({
  cards,
  transactions,
  currentMonth,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Next 8 months
  const months = React.useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < 8; i++) {
      list.push(addMonthsToMonthString(currentMonth, i));
    }
    return list;
  }, [currentMonth]);

  const forecastData = React.useMemo(() => {
    return months.map((m, index) => {
      // Find all credit card transactions billed in this month
      const monthCardTx = transactions.filter(
        t => t.paymentMethod === 'credit_card' && t.invoiceMonth === m
      );

      const total = monthCardTx.reduce((sum, t) => sum + t.amount, 0);
      const installmentTxCount = monthCardTx.filter(t => !!t.installments).length;

      // Group by card
      const byCard: { card: CreditCard; amount: number }[] = cards.map(c => {
        const amt = monthCardTx
          .filter(t => t.creditCardId === c.id)
          .reduce((sum, t) => sum + t.amount, 0);
        return { card: c, amount: amt };
      }).filter(c => c.amount > 0);

      return {
        month: m,
        label: formatMonthShort(m),
        total,
        txCount: monthCardTx.length,
        installmentTxCount,
        byCard,
        isCurrent: index === 0,
      };
    });
  }, [months, transactions, cards]);

  const maxVal = Math.max(...forecastData.map(d => d.total), 500) * 1.15;
  const chartHeight = 160;
  const chartWidth = 540;
  const paddingX = 35;
  const paddingBottom = 26;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingBottom - 10;
  const groupWidth = usableWidth / forecastData.length;
  const barWidth = 22;

  const totalFutureCommitment = forecastData
    .filter((_, idx) => idx > 0)
    .reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Total já comprometido (próximos 7 meses):</span>
          <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
            {formatCurrency(totalFutureCommitment)}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Projeção Parcelas</span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto select-none"
        >
          {/* Subtle Gridlines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = chartHeight - paddingBottom - usableHeight * pct;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="2 3"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Forecast Bars */}
          {forecastData.map((item, idx) => {
            const groupX = paddingX + idx * groupWidth;
            const centerX = groupX + groupWidth / 2;
            const barH = (item.total / maxVal) * usableHeight;
            const barY = chartHeight - paddingBottom - barH;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={item.month}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Column Hover */}
                {isHovered && (
                  <rect
                    x={groupX + 2}
                    y={6}
                    width={groupWidth - 4}
                    height={chartHeight - paddingBottom}
                    className="fill-slate-200/50 dark:fill-slate-700/40"
                    rx="4"
                  />
                )}

                {/* Base bar */}
                <rect
                  x={centerX - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={Math.max(2, barH)}
                  rx="3"
                  className={`transition-colors ${
                    item.isCurrent
                      ? 'fill-purple-500 hover:fill-purple-400'
                      : 'fill-indigo-600/80 hover:fill-indigo-500 dark:fill-indigo-500/80 dark:hover:fill-indigo-400'
                  }`}
                />

                {/* Top value */}
                {item.total > 0 && (
                  <text
                    x={centerX}
                    y={Math.max(12, barY - 4)}
                    textAnchor="middle"
                    className="text-[9.5px] fill-slate-700 dark:fill-slate-300 font-mono font-medium"
                  >
                    R$ {Math.round(item.total)}
                  </text>
                )}

                {/* Month label */}
                <text
                  x={centerX}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className={`text-[10.5px] font-sans ${
                    item.isCurrent
                      ? 'fill-purple-600 dark:fill-purple-400 font-bold'
                      : 'fill-slate-500 dark:fill-slate-400'
                  }`}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIdx !== null && forecastData[hoveredIdx] && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs backdrop-blur-md pointer-events-none z-20 min-w-44">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1.5">
              <span>{forecastData[hoveredIdx].label}</span>
              <span className="font-mono text-purple-600 dark:text-purple-400">
                {formatCurrency(forecastData[hoveredIdx].total)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div>Lançamentos: {forecastData[hoveredIdx].txCount} ({forecastData[hoveredIdx].installmentTxCount} parcelas)</div>
              {forecastData[hoveredIdx].byCard.map(bc => (
                <div key={bc.card.id} className="flex justify-between text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                  <span>{bc.card.name}:</span>
                  <span>{formatCurrency(bc.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
