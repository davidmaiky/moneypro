import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  CreditCard as CardIcon,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  DollarSign,
  Layers,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CreditCard, Transaction } from '../../types/finance';
import {
  calculateCardMetrics,
  calculateInvoiceMonth,
  getInvoiceDates,
} from '../../utils/creditCardUtils';
import {
  addMonthsToMonthString,
  formatCurrency,
  formatDate,
  formatMonthShort,
  formatMonthYear,
  formatPercent,
  parseCurrencyInput,
} from '../../utils/formatters';

interface PurchaseSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCardId?: string;
  onPurchaseCreated?: () => void;
}

export const PurchaseSimulatorModal: React.FC<PurchaseSimulatorModalProps> = ({
  isOpen,
  onClose,
  defaultCardId,
  onPurchaseCreated,
}) => {
  const {
    cards,
    transactions,
    recurringTransactions,
    paidInvoices,
    categories,
    selectedMonth,
    addCreditCardPurchase,
  } = useFinance();

  const todayStr = new Date().toISOString().split('T')[0];

  // Simulator Form State
  const [amountInput, setAmountInput] = useState<string>('1800,00');
  const [description, setDescription] = useState<string>('Smartphone Novo');
  const [installmentsCount, setInstallmentsCount] = useState<number>(10);
  const [selectedCardId, setSelectedCardId] = useState<string>(
    defaultCardId || cards[0]?.id || ''
  );
  const [purchaseDate, setPurchaseDate] = useState<string>(todayStr);
  const [categoryId, setCategoryId] = useState<string>(
    categories.find(c => c.name.toLowerCase().includes('lazer') || c.name.toLowerCase().includes('outros'))?.id || categories[0]?.id || ''
  );
  const [successCreated, setSuccessCreated] = useState<boolean>(false);

  // Sync card if defaultCardId changes
  React.useEffect(() => {
    if (defaultCardId && cards.some(c => c.id === defaultCardId)) {
      setSelectedCardId(defaultCardId);
    } else if (cards.length > 0 && !cards.some(c => c.id === selectedCardId)) {
      setSelectedCardId(cards[0].id);
    }
  }, [defaultCardId, cards]);

  const targetCard = cards.find(c => c.id === selectedCardId) || cards[0];
  const purchaseAmount = Math.max(0, parseCurrencyInput(amountInput));
  const safeInstallments = Math.max(1, Math.min(36, installmentsCount));
  const monthlyInstallmentAmount = purchaseAmount > 0 ? purchaseAmount / safeInstallments : 0;

  // Credit Card Metrics
  const cardMetrics = useMemo(() => {
    if (!targetCard) return null;
    return calculateCardMetrics(targetCard, transactions, paidInvoices, selectedMonth);
  }, [targetCard, transactions, paidInvoices, selectedMonth]);

  const availableLimit = cardMetrics ? cardMetrics.availableLimit : 0;
  const limitAfterPurchase = availableLimit - purchaseAmount;
  const isLimitInsufficient = purchaseAmount > availableLimit;

  // Invoice & Term calculations
  const firstInvoiceMonth = useMemo(() => {
    if (!targetCard) return selectedMonth;
    return calculateInvoiceMonth(purchaseDate, targetCard);
  }, [purchaseDate, targetCard, selectedMonth]);

  const firstInvoiceDates = useMemo(() => {
    if (!targetCard) return null;
    return getInvoiceDates(targetCard, firstInvoiceMonth);
  }, [targetCard, firstInvoiceMonth]);

  const daysUntilDue = useMemo(() => {
    if (!firstInvoiceDates) return 30;
    const pDate = new Date(purchaseDate + 'T00:00:00');
    const dDate = new Date(firstInvoiceDates.dueDate + 'T00:00:00');
    return Math.max(1, Math.round((dDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
  }, [purchaseDate, firstInvoiceDates]);

  // Monthly Cash Flow Forecast Analysis (Next 6 months)
  const monthlyIncome = useMemo(() => {
    const activeFixedIncome = recurringTransactions
      .filter(r => r.active && r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    if (activeFixedIncome > 0) return activeFixedIncome;

    // Fallback: average positive income from completed transactions
    const incomeTxs = transactions.filter(t => t.type === 'income');
    const total = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
    return incomeTxs.length > 0 ? total / Math.max(1, new Set(incomeTxs.map(t => t.date.slice(0, 7))).size) : 4500;
  }, [recurringTransactions, transactions]);

  const monthlyFixedExpenses = useMemo(() => {
    return recurringTransactions
      .filter(r => r.active && r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringTransactions]);

  const simulationMonths = useMemo(() => {
    const months: {
      month: string;
      label: string;
      currentInvoice: number;
      simulatedInstallment: number;
      totalSimulatedInvoice: number;
      totalExpensesCurrent: number;
      totalExpensesSimulated: number;
      freeCashCurrent: number;
      freeCashSimulated: number;
      commitmentRateSimulated: number;
    }[] = [];

    // Check next 6 months starting from selectedMonth
    for (let i = 0; i < 6; i++) {
      const m = addMonthsToMonthString(selectedMonth, i);
      const label = formatMonthShort(m);

      // Existing credit card invoice for this month
      const currentInvoice = transactions
        .filter(t => t.paymentMethod === 'credit_card' && t.invoiceMonth === m)
        .reduce((sum, t) => sum + t.amount, 0);

      // Check if simulated purchase has an installment in month m
      let simulatedInstallment = 0;
      for (let instIdx = 0; instIdx < safeInstallments; instIdx++) {
        const instMonth = addMonthsToMonthString(firstInvoiceMonth, instIdx);
        if (instMonth === m) {
          simulatedInstallment = monthlyInstallmentAmount;
          break;
        }
      }

      const totalSimulatedInvoice = currentInvoice + simulatedInstallment;
      const totalExpensesCurrent = monthlyFixedExpenses + currentInvoice;
      const totalExpensesSimulated = monthlyFixedExpenses + totalSimulatedInvoice;

      const freeCashCurrent = monthlyIncome - totalExpensesCurrent;
      const freeCashSimulated = monthlyIncome - totalExpensesSimulated;
      const commitmentRateSimulated = monthlyIncome > 0 ? (totalExpensesSimulated / monthlyIncome) * 100 : 0;

      months.push({
        month: m,
        label,
        currentInvoice,
        simulatedInstallment,
        totalSimulatedInvoice,
        totalExpensesCurrent,
        totalExpensesSimulated,
        freeCashCurrent,
        freeCashSimulated,
        commitmentRateSimulated,
      });
    }

    return months;
  }, [
    selectedMonth,
    firstInvoiceMonth,
    safeInstallments,
    monthlyInstallmentAmount,
    transactions,
    monthlyFixedExpenses,
    monthlyIncome,
  ]);

  // Max commitment rate across the simulated months
  const maxCommitment = Math.max(...simulationMonths.map(m => m.commitmentRateSimulated));
  const currentCommitment = monthlyIncome > 0
    ? ((monthlyFixedExpenses + (simulationMonths[0]?.currentInvoice || 0)) / monthlyIncome) * 100
    : 0;

  // Diagnostic Risk Rating
  const riskAnalysis = useMemo(() => {
    if (isLimitInsufficient) {
      return {
        level: 'danger',
        label: 'Limite Insuficiente',
        color: 'rose',
        message: `Esta compra excede o limite disponível do cartão em ${formatCurrency(Math.abs(limitAfterPurchase))}. A transação seria recusada pelo banco.`,
      };
    }
    if (maxCommitment >= 80) {
      return {
        level: 'danger',
        label: 'Alto Risco de Endividamento',
        color: 'rose',
        message: `O comprometimento da sua renda atingirá ${maxCommitment.toFixed(0)}%, deixando pouca margem para imprevistos.`,
      };
    }
    if (maxCommitment >= 60) {
      return {
        level: 'warning',
        label: 'Atenção ao Orçamento',
        color: 'amber',
        message: `Comprometimento de até ${maxCommitment.toFixed(0)}%. O orçamento ficará mais justo durante o parcelamento.`,
      };
    }
    return {
      level: 'safe',
      label: 'Compra Confortável & Saudável',
      color: 'emerald',
      message: `Comprometimento médio em torno de ${maxCommitment.toFixed(0)}% com limite de cartão preservado.`,
    };
  }, [isLimitInsufficient, limitAfterPurchase, maxCommitment]);

  // Execute and convert simulation to real purchase
  const handleExecutePurchase = () => {
    if (!targetCard || purchaseAmount <= 0) return;

    addCreditCardPurchase({
      description: description.trim() || 'Compra Simulada',
      totalAmount: purchaseAmount,
      installmentsCount: safeInstallments,
      purchaseDate,
      categoryId,
      cardId: targetCard.id,
      notes: `Compra planejada no simulador ("E se eu comprar...?") em ${safeInstallments}x de ${formatCurrency(monthlyInstallmentAmount)}`,
    });

    setSuccessCreated(true);
    setTimeout(() => {
      if (onPurchaseCreated) onPurchaseCreated();
      onClose();
    }, 1400);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-5 transition-colors relative my-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Simulador de Compra Futura
                </h2>
                <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/40">
                  "E se eu comprar...?"
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Simule parcelas e veja o impacto exato nas suas faturas e renda livre antes de passar o cartão
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

        {successCreated ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Compra Lançada com Sucesso!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              As {safeInstallments} parcelas de {formatCurrency(monthlyInstallmentAmount)} foram registradas no cartão {targetCard?.name}.
            </p>
          </div>
        ) : (
          <>
            {/* Input Simulation Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Purchase Value */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Valor Total da Compra (R$)</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 text-xs">
                    {formatCurrency(purchaseAmount)}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">R$</span>
                  <input
                    type="text"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-1.5 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {['500', '1.200', '2.500', '5.000'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountInput(val + ',00')}
                      className="px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Installments count */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Número de Parcelas
                  </label>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    {safeInstallments}x de {formatCurrency(monthlyInstallmentAmount)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 3, 6, 10, 12, 18, 24].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallmentsCount(n)}
                      className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                        safeInstallments === n
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {n === 1 ? '1x (À vista)' : `${n}x`}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="1"
                  max="24"
                  value={safeInstallments}
                  onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)}
                  className="w-full accent-purple-600 mt-1 cursor-pointer"
                />
              </div>

              {/* Card Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Cartão Pretendido
                </label>
                <select
                  value={selectedCardId}
                  onChange={e => setSelectedCardId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  {cards.map(c => {
                    const m = calculateCardMetrics(c, transactions, paidInvoices, selectedMonth);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} · Disponível: {formatCurrency(m.availableLimit)} (Fecha dia {c.closingDay})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Description & Purchase Date */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    O que vai comprar?
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: Celular, Viagem"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Data da Compra
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Impact Metric Cards (3 KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Limit Impact */}
              <div
                className={`p-3.5 rounded-xl border transition-colors ${
                  isLimitInsufficient
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Limite do Cartão</span>
                  <CardIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mt-1">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Atual: {formatCurrency(availableLimit)}
                  </div>
                  <div
                    className={`text-base font-bold font-mono ${
                      isLimitInsufficient
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    Novo: {formatCurrency(limitAfterPurchase)}
                  </div>
                </div>
                {isLimitInsufficient && (
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Excede limite!</span>
                  </div>
                )}
              </div>

              {/* First Due Date & Term */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>1ª Fatura & Prazo</span>
                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mt-1">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {firstInvoiceDates ? formatDate(firstInvoiceDates.dueDate) : 'Próximo mês'}
                  </div>
                  <div className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                    {daysUntilDue} dias de prazo
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Fatura de {formatMonthYear(firstInvoiceMonth)}
                </div>
              </div>

              {/* Budget Commitment */}
              <div
                className={`p-3.5 rounded-xl border transition-colors ${
                  riskAnalysis.level === 'danger'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
                    : riskAnalysis.level === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Comprometimento
                  </span>
                  <ShieldCheck
                    className={`w-3.5 h-3.5 ${
                      riskAnalysis.level === 'danger'
                        ? 'text-rose-600'
                        : riskAnalysis.level === 'warning'
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                    }`}
                  />
                </div>
                <div className="mt-1">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Antes: {currentCommitment.toFixed(0)}%
                  </div>
                  <div
                    className={`text-base font-bold font-mono ${
                      riskAnalysis.level === 'danger'
                        ? 'text-rose-600 dark:text-rose-400'
                        : riskAnalysis.level === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    Novo: {maxCommitment.toFixed(0)}%
                  </div>
                </div>
                <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1">
                  {riskAnalysis.label}
                </div>
              </div>
            </div>

            {/* Diagnostic Alert Box */}
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                riskAnalysis.level === 'danger'
                  ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 border-rose-200 dark:border-rose-800/50'
                  : riskAnalysis.level === 'warning'
                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200 dark:border-amber-800/50'
                  : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50'
              }`}
            >
              <Zap className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Diagnóstico de Viabilidade: </strong>
                <span>{riskAnalysis.message}</span>
              </div>
            </div>

            {/* Graphical Comparison of Next 6 Months */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Impacto Mensal nas Faturas & Renda Livre
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-purple-400" />
                    <span>Fatura Atual</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-amber-400" />
                    <span>+ Nova Parcela</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Saldo Livre Restante</span>
                  </span>
                </div>
              </div>

              {/* Responsive comparison table & visual bars */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {simulationMonths.map(row => {
                    return (
                      <div
                        key={row.month}
                        className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="w-24 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span className="capitalize">{row.label}</span>
                          {row.simulatedInstallment > 0 && (
                            <span className="text-[9px] font-mono bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1 rounded">
                              +1x
                            </span>
                          )}
                        </div>

                        {/* Visual stacked bar */}
                        <div className="flex-1 w-full sm:max-w-xs space-y-1">
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            {/* Existing invoice portion */}
                            <div
                              className="h-full bg-purple-500"
                              style={{
                                width: `${Math.min(100, (row.currentInvoice / Math.max(1, monthlyIncome)) * 100)}%`,
                              }}
                              title={`Fatura atual: ${formatCurrency(row.currentInvoice)}`}
                            />
                            {/* Simulated installment portion */}
                            {row.simulatedInstallment > 0 && (
                              <div
                                className="h-full bg-amber-400"
                                style={{
                                  width: `${Math.min(100, (row.simulatedInstallment / Math.max(1, monthlyIncome)) * 100)}%`,
                                }}
                                title={`Nova parcela: ${formatCurrency(row.simulatedInstallment)}`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Numbers */}
                        <div className="flex items-center gap-4 text-right font-mono text-xs w-full sm:w-auto justify-between sm:justify-end">
                          <div>
                            <span className="text-[10px] text-slate-400 block sm:hidden">Fatura:</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {formatCurrency(row.totalSimulatedInvoice)}
                            </span>
                          </div>

                          <div className="min-w-[110px]">
                            <span className="text-[10px] text-slate-400 block sm:hidden">Saldo Livre:</span>
                            <span
                              className={`font-bold ${
                                row.freeCashSimulated >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {formatCurrency(row.freeCashSimulated)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Fechar Simulação
              </button>

              <button
                type="button"
                onClick={handleExecutePurchase}
                disabled={purchaseAmount <= 0}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-98 ${
                  isLimitInsufficient
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-purple-500 hover:bg-purple-400 text-slate-950'
                }`}
              >
                <CardIcon className="w-4 h-4" />
                <span>
                  {isLimitInsufficient
                    ? 'Efetivar Compra Mesmo Assim'
                    : `Efetivar Compra (${safeInstallments}x de ${formatCurrency(monthlyInstallmentAmount)})`}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
