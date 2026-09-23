import React from 'react';
import { Sparkles, Calendar, ArrowRight, ShieldCheck, CreditCard as CardIcon, Clock, ChevronRight } from 'lucide-react';
import { CreditCard } from '../../types/finance';
import { getBestCardForToday } from '../../utils/creditCardUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BestCardTodayBannerProps {
  cards: CreditCard[];
  onSelectCard?: (cardId: string) => void;
  onOpenNewPurchase?: (cardId?: string) => void;
  onOpenSimulator?: (cardId?: string) => void;
}

export const BestCardTodayBanner: React.FC<BestCardTodayBannerProps> = ({
  cards,
  onSelectCard,
  onOpenNewPurchase,
  onOpenSimulator,
}) => {
  const recommendation = React.useMemo(() => {
    return getBestCardForToday(cards);
  }, [cards]);

  if (!recommendation || cards.length === 0) {
    return null;
  }

  const { bestCard, maxDaysUntilDue, highlightText, subText, analyses } = recommendation;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white border border-purple-500/30 p-5 shadow-lg">
      {/* Glow decorative effects */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        {/* Left: Recommendation Callout */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Melhor Cartão para Comprar Hoje</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>{highlightText}</span>
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            {subText} Ao concentrar suas compras neste cartão hoje, você maximiza seu fluxo de caixa e ganha até{' '}
            <strong className="text-amber-300 font-semibold">{maxDaysUntilDue} dias</strong> até o desembolso real.
          </p>

          {/* Cards Comparison Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Prazo por cartão:</span>
            {analyses.map(item => {
              const isBest = item.isBestCard;
              return (
                <button
                  key={item.card.id}
                  onClick={() => onSelectCard && onSelectCard(item.card.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isBest
                      ? 'bg-purple-500/40 text-purple-200 border border-purple-400/50 shadow-xs font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                  }`}
                  title={`Fechamento: ${formatDate(item.closingDate)} · Vencimento: ${formatDate(item.dueDate)}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.card.color }}
                  />
                  <span className="font-sans font-medium">{item.card.name}:</span>
                  <span className={isBest ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                    {item.daysUntilDue}d de prazo
                  </span>
                  {isBest && (
                    <span className="text-[9px] font-sans uppercase font-bold text-emerald-300 bg-emerald-950/60 px-1 py-0.2 rounded">
                      Top
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex flex-row sm:flex-col lg:flex-row items-center gap-2.5 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={() => onOpenNewPurchase && onOpenNewPurchase(bestCard.id)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md cursor-pointer active:scale-98"
          >
            <CardIcon className="w-4 h-4" />
            <span>Comprar com {bestCard.name}</span>
          </button>

          {onOpenSimulator && (
            <button
              type="button"
              onClick={() => onOpenSimulator(bestCard.id)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-purple-200 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/40 rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Simular Compra ("E se...?")</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
