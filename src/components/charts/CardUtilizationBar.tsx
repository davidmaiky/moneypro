import React from 'react';
import { CreditCard } from '../../types/finance';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface CardUtilizationBarProps {
  card: CreditCard;
  usedLimit: number;
  availableLimit: number;
  usagePercentage: number;
}

export const CardUtilizationBar: React.FC<CardUtilizationBarProps> = ({
  card,
  usedLimit,
  availableLimit,
  usagePercentage,
}) => {
  // Color scale: < 40% green, 40-75% amber, > 75% red
  const getBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-rose-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = (pct: number) => {
    if (pct >= 85) return 'Limite Crítico';
    if (pct >= 50) return 'Atenção';
    return 'Limite Saudável';
  };

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
        <span className="font-medium text-slate-800 dark:text-slate-200">Uso do Limite</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="font-semibold text-slate-900 dark:text-white">{formatPercent(usagePercentage, 0)}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">({getStatusText(usagePercentage)})</span>
        </div>
      </div>

      {/* Progress track */}
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700/60">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor(usagePercentage)}`}
          style={{ width: `${Math.min(100, Math.max(2, usagePercentage))}%` }}
        />
      </div>

      {/* Values breakdown */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
        <div>
          Usado: <span className="text-slate-800 dark:text-slate-200 font-medium">{formatCurrency(usedLimit)}</span>
        </div>
        <div>
          Disponível: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(availableLimit)}</span>
        </div>
      </div>
    </div>
  );
};
