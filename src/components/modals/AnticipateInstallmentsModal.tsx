import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Percent,
  CreditCard as CardIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Building2,
  Calendar,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CreditCard, Transaction } from '../../types/finance';
import { formatCurrency, formatMonthYear, parseCurrencyInput } from '../../utils/formatters';

interface AnticipateInstallmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialParentTransactionId?: string;
}

export const AnticipateInstallmentsModal: React.FC<AnticipateInstallmentsModalProps> = ({
  isOpen,
  onClose,
  initialParentTransactionId,
}) => {
  const {
    cards,
    accounts,
    transactions,
    paidInvoices,
    selectedMonth,
    anticipateInstallments,
  } = useFinance();

  // Extract all unique installment series
  const installmentSeries = useMemo(() => {
    const seriesMap = new Map<
      string,
      {
        parentTransactionId: string;
        title: string;
        cardId: string;
        totalAmount: number;
        monthlyAmount: number;
        totalInstallments: number;
        transactions: Transaction[];
        paidInstallmentsCount: number;
        unpaidTransactions: Transaction[];
      }
    >();

    transactions.forEach(t => {
      if (t.installments?.parentTransactionId) {
        const pId = t.installments.parentTransactionId;
        if (!seriesMap.has(pId)) {
          const cleanTitle = t.description.replace(/\s*\(\d+\/\d+\)$/, '');
          seriesMap.set(pId, {
            parentTransactionId: pId,
            title: cleanTitle,
            cardId: t.creditCardId || '',
            totalAmount: t.installments.totalPurchaseAmount || t.amount * t.installments.total,
            monthlyAmount: t.amount,
            totalInstallments: t.installments.total,
            transactions: [],
            paidInstallmentsCount: 0,
            unpaidTransactions: [],
          });
        }

        const entry = seriesMap.get(pId)!;
        entry.transactions.push(t);

        const isPaid =
          t.invoiceMonth &&
          t.creditCardId &&
          paidInvoices.some(p => p.cardId === t.creditCardId && p.invoiceMonth === t.invoiceMonth);

        if (isPaid) {
          entry.paidInstallmentsCount++;
        } else {
          entry.unpaidTransactions.push(t);
        }
      }
    });

    // Only return series with at least 1 unpaid installment
    return Array.from(seriesMap.values()).filter(s => s.unpaidTransactions.length > 0);
  }, [transactions, paidInvoices]);

  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [anticipateCount, setAnticipateCount] = useState<number>(1);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountPercent, setDiscountPercent] = useState<number>(5.5); // Nubank default is around 5% to 6%
  const [fixedDiscountInput, setFixedDiscountInput] = useState<string>('');
  const [destination, setDestination] = useState<'invoice' | 'account'>('invoice');
  const [targetInvoiceMonth, setTargetInvoiceMonth] = useState<string>(selectedMonth);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize selected parent series
  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      if (initialParentTransactionId && installmentSeries.some(s => s.parentTransactionId === initialParentTransactionId)) {
        setSelectedParentId(initialParentTransactionId);
      } else if (installmentSeries.length > 0) {
        setSelectedParentId(installmentSeries[0].parentTransactionId);
      }
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
      setTargetInvoiceMonth(selectedMonth);
    }
  }, [isOpen, initialParentTransactionId, installmentSeries, accounts, selectedMonth]);

  const activeSeries = installmentSeries.find(s => s.parentTransactionId === selectedParentId);
  const maxAvailable = activeSeries?.unpaidTransactions.length || 1;

  // Auto-adjust anticipateCount when active series changes
  useEffect(() => {
    if (activeSeries) {
      setAnticipateCount(Math.min(activeSeries.unpaidTransactions.length, Math.max(1, anticipateCount)));
    }
  }, [activeSeries]);

  const card = cards.find(c => c.id === activeSeries?.cardId);

  // Sort unpaid transactions by installment number
  const sortedUnpaid = useMemo(() => {
    if (!activeSeries) return [];
    return [...activeSeries.unpaidTransactions].sort(
      (a, b) => (a.installments?.current || 0) - (b.installments?.current || 0)
    );
  }, [activeSeries]);

  // Selected target installments (furthest installments backwards, standard Nubank behavior)
  const targetInstallments = useMemo(() => {
    if (sortedUnpaid.length === 0) return [];
    const count = Math.min(anticipateCount, sortedUnpaid.length);
    return sortedUnpaid.slice(sortedUnpaid.length - count);
  }, [sortedUnpaid, anticipateCount]);

  const grossAmount = useMemo(() => {
    return targetInstallments.reduce((sum, t) => sum + t.amount, 0);
  }, [targetInstallments]);

  // Discount calculation
  const discountAmount = useMemo(() => {
    if (grossAmount <= 0) return 0;
    if (discountType === 'percent') {
      return Number(((grossAmount * discountPercent) / 100).toFixed(2));
    } else {
      const fixed = parseCurrencyInput(fixedDiscountInput);
      return Math.min(grossAmount, fixed);
    }
  }, [grossAmount, discountType, discountPercent, fixedDiscountInput]);

  const netAmount = Math.max(0, grossAmount - discountAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeries) return;

    const res = anticipateInstallments({
      parentTransactionId: activeSeries.parentTransactionId,
      installmentsToAnticipateCount: anticipateCount,
      discountAmount,
      destination,
      targetInvoiceMonth,
      accountId: selectedAccountId,
    });

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 transition-colors relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Antecipar & Quitar Parcelas</span>
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/40">
                  Estilo Nubank
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pague parcelas futuras adiantadas e receba desconto proporcional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {installmentSeries.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CardIcon className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Você não possui nenhuma compra parcelada pendente no momento para antecipar.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Purchase Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Selecione a Compra Parcelada
              </label>
              <select
                value={selectedParentId}
                onChange={e => setSelectedParentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              >
                {installmentSeries.map(s => {
                  const sCard = cards.find(c => c.id === s.cardId);
                  return (
                    <option key={s.parentTransactionId} value={s.parentTransactionId}>
                      {s.title} ({s.unpaidTransactions.length} parcelas restantes de {s.totalInstallments}x) - {sCard?.name || 'Cartão'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Purchase Details Card */}
            {activeSeries && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CardIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{card?.name || 'Cartão de Crédito'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Original: {activeSeries.totalInstallments}x de {formatCurrency(activeSeries.monthlyAmount)} (Total: {formatCurrency(activeSeries.totalAmount)})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                    {activeSeries.unpaidTransactions.length} pendentes
                  </div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400">
                    {activeSeries.paidInstallmentsCount} já quitadas
                  </div>
                </div>
              </div>
            )}

            {/* Number of Installments to Anticipate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Quantas parcelas deseja antecipar?
                </label>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {anticipateCount} de {maxAvailable} parcela(s)
                </span>
              </div>

              {/* Quick count buttons */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, maxAvailable].filter((v, i, a) => v <= maxAvailable && a.indexOf(v) === i).map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setAnticipateCount(count)}
                    className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                      anticipateCount === count
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {count === maxAvailable ? `Todas (${count}x)` : `${count}x`}
                  </button>
                ))}
              </div>

              {/* Visual which installments will be anticipated */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-lg border border-purple-200/40 dark:border-purple-800/30">
                <span>Serão antecipadas as parcelas: </span>
                <strong className="text-purple-700 dark:text-purple-300 font-mono">
                  {targetInstallments.map(t => `#${t.installments?.current}`).join(', ')}
                </strong>{' '}
                (das últimas faturas para maximizar seu desconto).
              </div>
            </div>

            {/* Nubank Discount Rate Simulator */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Desconto de Antecipação (Nubank)</span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      discountType === 'percent'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    % Porcentagem
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      discountType === 'fixed'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    R$ Valor Fixo
                  </button>
                </div>
              </div>

              {discountType === 'percent' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {[3, 5, 5.5, 7.5, 10].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDiscountPercent(pct)}
                        className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                          discountPercent === pct
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="15"
                      step="0.5"
                      value={discountPercent}
                      onChange={e => setDiscountPercent(parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-600"
                    />
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 w-12 text-right">
                      {discountPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={fixedDiscountInput}
                    onChange={e => setFixedDiscountInput(e.target.value)}
                    placeholder="Ex: 45,00"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Real-time Math Summary */}
              <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Valor Bruto</div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(grossAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Desconto Ganho</div>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    - {formatCurrency(discountAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Total a Pagar</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(netAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Destination */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Forma de Liquidação da Antecipação
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`p-3 rounded-xl border cursor-pointer text-xs transition-all flex flex-col justify-between ${
                    destination === 'invoice'
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === 'invoice'}
                      onChange={() => setDestination('invoice')}
                      className="accent-purple-600"
                    />
                    <span className="font-semibold">Na Fatura do Cartão</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Cobra na fatura atual com o desconto e apaga as parcelas futuras
                  </p>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer text-xs transition-all flex flex-col justify-between ${
                    destination === 'account'
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === 'account'}
                      onChange={() => setDestination('account')}
                      className="accent-purple-600"
                    />
                    <span className="font-semibold">À Vista na Conta</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Debita da conta bancária agora e libera o limite na hora
                  </p>
                </label>
              </div>

              {destination === 'invoice' ? (
                <div className="pt-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Fatura de destino:
                  </label>
                  <input
                    type="month"
                    value={targetInvoiceMonth}
                    onChange={e => setTargetInvoiceMonth(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              ) : (
                <div className="pt-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Debitar de qual conta:
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-sm cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Confirmar Antecipação ({formatCurrency(netAmount)})
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
