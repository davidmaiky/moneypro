import React, { useState } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Edit2,
  Trash2,
  Layers,
  ArrowUpRight,
  Wifi,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CreditCard, InvoiceSummary } from '../../types/finance';
import {
  formatCurrency,
  formatDate,
  formatMonthYear,
  formatPercent,
  addMonthsToMonthString,
} from '../../utils/formatters';
import {
  calculateCardMetrics,
  getCardInvoices,
  getInvoiceDates,
  getCardBestPurchaseAnalysis,
} from '../../utils/creditCardUtils';
import { CardUtilizationBar } from '../charts/CardUtilizationBar';
import { BestCardTodayBanner } from './BestCardTodayBanner';

interface CreditCardsViewProps {
  onOpenNewPurchase: (cardId?: string) => void;
  onOpenCardModal: (card?: CreditCard) => void;
  onPayInvoice: (cardId: string, invoiceMonth: string, amount: number) => void;
  onOpenSimulator?: (cardId?: string) => void;
  onOpenAnticipateModal?: (parentTransactionId?: string) => void;
}

export const CreditCardsView: React.FC<CreditCardsViewProps> = ({
  onOpenNewPurchase,
  onOpenCardModal,
  onPayInvoice,
  onOpenSimulator,
  onOpenAnticipateModal,
}) => {
  const {
    cards,
    transactions,
    paidInvoices,
    selectedMonth,
    setSelectedMonth,
    deleteCreditCard,
  } = useFinance();

  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id || '');
  const [activeInvoiceMonth, setActiveInvoiceMonth] = useState<string>(selectedMonth);

  // Synchronize selected card when cards change
  React.useEffect(() => {
    if (cards.length > 0 && !cards.some(c => c.id === selectedCardId)) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  // Active selected card
  const currentCard = cards.find(c => c.id === selectedCardId) || cards[0];

  // Invoices for the active card
  const cardInvoices = React.useMemo(() => {
    if (!currentCard) return [];
    return getCardInvoices(currentCard, transactions, paidInvoices, selectedMonth);
  }, [currentCard, transactions, paidInvoices, selectedMonth]);

  const activeInvoice = cardInvoices.find(inv => inv.invoiceMonth === activeInvoiceMonth) ||
    cardInvoices.find(inv => inv.invoiceMonth === selectedMonth) ||
    cardInvoices[0];

  // Metrics for current card
  const metrics = currentCard
    ? calculateCardMetrics(currentCard, transactions, paidInvoices, selectedMonth)
    : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Gestão de Cartões de Crédito & Faturas</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe limites, faturas abertas e futuras, e compras parceladas
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenSimulator && (
            <button
              type="button"
              onClick={() => onOpenSimulator(currentCard?.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/40 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Simulador ("E se...?")</span>
            </button>
          )}

          {onOpenAnticipateModal && (
            <button
              type="button"
              onClick={() => onOpenAnticipateModal()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Antecipar Parcelas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenCardModal()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Cartão</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewPurchase(currentCard?.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-purple-400 hover:bg-purple-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Lançar Compra</span>
          </button>
        </div>
      </div>

      {/* Best Card Today Highlight Banner */}
      {cards.length > 0 && (
        <BestCardTodayBanner
          cards={cards}
          onSelectCard={cardId => setSelectedCardId(cardId)}
          onOpenNewPurchase={cardId => onOpenNewPurchase(cardId)}
          onOpenSimulator={cardId => onOpenSimulator && onOpenSimulator(cardId)}
        />
      )}

      {cards.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 my-8 shadow-xl transition-colors">
          <div className="w-14 h-14 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-purple-500/5">
            <CardIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Nenhum cartão cadastrado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cadastre seus cartões de crédito para acompanhar faturas abertas e futuras, limites totais e disponíveis, datas de fechamento e compras parceladas mês a mês.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCardModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-purple-400 hover:bg-purple-300 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Primeiro Cartão</span>
          </button>
        </div>
      ) : (
        <>
          {/* Cards Selector Carousel / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map(card => {
          const isSelected = card.id === currentCard?.id;
          const cardMetrics = calculateCardMetrics(card, transactions, paidInvoices, selectedMonth);
          const bestAnalysis = getCardBestPurchaseAnalysis(card);

          return (
            <div
              key={card.id}
              onClick={() => {
                setSelectedCardId(card.id);
              }}
              className={`relative cursor-pointer transition-all duration-200 rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-lg border ${
                isSelected
                  ? 'ring-2 ring-purple-400/80 scale-[1.01] border-purple-500/40'
                  : 'opacity-80 hover:opacity-100 border-slate-700/60 hover:border-slate-500'
              } bg-gradient-to-br ${card.gradient}`}
              style={{ minHeight: '190px' }}
            >
              {/* Subtle background overlay circles for credit card feel */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-black/20 rounded-full blur-md pointer-events-none" />

              {/* Card Top */}
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <div className="text-xs uppercase tracking-widest font-semibold text-white/80">
                    {card.bank}
                  </div>
                  <div className="text-sm font-bold text-white tracking-wide mt-0.5">
                    {card.name}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-white/80">
                    <Wifi className="w-4 h-4 rotate-90" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      {card.brand}
                    </span>
                  </div>

                  {/* Best Card / Grace Period Pill */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      bestAnalysis.isBestCard
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                        : 'bg-black/40 text-white/90 border border-white/15'
                    }`}
                  >
                    {bestAnalysis.isBestCard && <Sparkles className="w-2.5 h-2.5" />}
                    <span>{bestAnalysis.daysUntilDue}d prazo</span>
                  </span>
                </div>
              </div>

              {/* EMV Chip & Contactless */}
              <div className="my-2 flex items-center gap-3 relative z-10">
                <div className="w-8 h-6 bg-amber-400/80 rounded-sm border border-amber-300/60 shadow-xs flex items-center justify-center">
                  <div className="w-6 h-4 border-t border-b border-amber-600/40" />
                </div>
                <span className="text-xs font-mono text-white/90 tracking-widest">
                  •••• •••• •••• {card.last4}
                </span>
              </div>

              {/* Card Bottom: Balance & Limit */}
              <div className="relative z-10 pt-2 border-t border-white/10 flex items-end justify-between text-xs text-white">
                <div>
                  <div className="text-[10px] text-white/70 uppercase">Fatura Atual</div>
                  <div className="font-mono font-bold text-sm">
                    {formatCurrency(cardMetrics.currentInvoiceTotal)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-white/70 uppercase">Disponível</div>
                  <div className="font-mono font-semibold text-emerald-300">
                    {formatCurrency(cardMetrics.availableLimit)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Card Deep Dive Section */}
      {currentCard && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Card Details, Limit Management & Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentCard.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentCard.bank} · Final {currentCard.last4}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenCardModal(currentCard)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                  title="Editar cartão"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {cards.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Deseja remover o cartão ${currentCard.name}?`)) {
                        deleteCreditCard(currentCard.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                    title="Excluir cartão"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Limit Utilization */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Limite Total Concedido</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(currentCard.limitTotal)}
                </span>
              </div>

              <CardUtilizationBar
                card={currentCard}
                usedLimit={metrics.totalUsedLimit}
                availableLimit={metrics.availableLimit}
                usagePercentage={metrics.usagePercentage}
              />
            </div>

            {/* Best Purchase Day & Due Day */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Melhor Dia de Compra</div>
                <div className="text-base font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                  Dia {currentCard.closingDay}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Fechamento da fatura
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Dia de Vencimento</div>
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  Dia {currentCard.dueDay}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Prazo para quitação
                </div>
              </div>
            </div>

            {/* Smart tip */}
            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg text-[11px] text-purple-800 dark:text-purple-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong>Dica Inteligente:</strong> Compras feitas a partir do dia{' '}
                <strong>{currentCard.closingDay}</strong> só serão cobradas na fatura do mês seguinte, garantindo até 40 dias para pagar.
              </div>
            </div>
          </div>

          {/* Right Column: Invoices Explorer & Statement (2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
            {/* Invoice Month Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Faturas Mensais
              </h3>
              <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                {cardInvoices.slice(1, 6).map(inv => {
                  const isActive = inv.invoiceMonth === (activeInvoice?.invoiceMonth);
                  return (
                    <button
                      key={inv.invoiceMonth}
                      onClick={() => setActiveInvoiceMonth(inv.invoiceMonth)}
                      className={`px-3 py-1 text-xs rounded-md font-mono transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-purple-600 dark:bg-purple-500 text-white font-bold shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {formatMonthYear(inv.invoiceMonth).slice(0, 7)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Invoice Header Card */}
            {activeInvoice && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Fatura de {formatMonthYear(activeInvoice.invoiceMonth)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        activeInvoice.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          : activeInvoice.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                      }`}
                    >
                      {activeInvoice.status === 'paid'
                        ? 'Fatura Paga'
                        : activeInvoice.status === 'overdue'
                        ? 'Vencida'
                        : 'Aberta / A Vencer'}
                    </span>
                  </div>

                  <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(activeInvoice.totalAmount)}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                    <span>
                      Fecha em: <strong className="text-slate-700 dark:text-slate-300">{formatDate(activeInvoice.closingDate)}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Vence em: <strong className="text-slate-700 dark:text-slate-300">{formatDate(activeInvoice.dueDate)}</strong>
                    </span>
                  </div>
                </div>

                <div>
                  {activeInvoice.status === 'paid' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Liquidada</span>
                    </div>
                  ) : activeInvoice.totalAmount > 0 ? (
                    <button
                      onClick={() =>
                        onPayInvoice(
                          currentCard.id,
                          activeInvoice.invoiceMonth,
                          activeInvoice.totalAmount
                        )
                      }
                      className="px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                      Pagar Fatura Completa
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Sem débitos nesta fatura</span>
                  )}
                </div>
              </div>
            )}

            {/* List of transactions in this invoice */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Lançamentos desta fatura ({activeInvoice?.transactions.length || 0})
              </h4>

              {(!activeInvoice || activeInvoice.transactions.length === 0) ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Nenhuma compra registrada nesta fatura.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-80 overflow-y-auto pr-1">
                  {activeInvoice.transactions.map(t => (
                    <div
                      key={t.id}
                      className="py-2.5 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <CardIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {t.description}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{formatDate(t.date)}</span>
                            {t.installments && (
                              <>
                                <span>·</span>
                                <span className="text-purple-600 dark:text-purple-300 font-mono">
                                  Parcela {t.installments.current} de {t.installments.total}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {t.installments && onOpenAnticipateModal && (
                          <button
                            type="button"
                            onClick={() => onOpenAnticipateModal(t.installments?.parentTransactionId)}
                            className="text-[10px] text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 font-medium flex items-center gap-1 cursor-pointer bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800/40 transition-colors"
                            title="Antecipar parcelas desta compra com desconto"
                          >
                            <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Antecipar</span>
                          </button>
                        )}
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(t.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
  );
};
