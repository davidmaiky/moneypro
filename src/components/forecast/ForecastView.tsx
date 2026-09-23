import React from 'react';
import {
  Layers,
  Calendar,
  CreditCard as CardIcon,
  TrendingDown,
  ArrowRight,
  Repeat,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatMonthYear, addMonthsToMonthString, formatMonthShort } from '../../utils/formatters';
import { InstallmentsForecastChart } from '../charts/InstallmentsForecastChart';

interface ForecastViewProps {
  onOpenSimulator?: () => void;
  onOpenAnticipateModal?: (parentTransactionId?: string) => void;
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  onOpenSimulator,
  onOpenAnticipateModal,
}) => {
  const { cards, transactions, recurringTransactions, selectedMonth } = useFinance();

  // Extract all unique installment series
  const installmentSeries = React.useMemo(() => {
    const map = new Map<string, {
      parentId: string;
      title: string;
      cardId: string;
      totalAmount: number;
      totalInstallments: number;
      currentInstallmentsBilled: number;
      remainingAmount: number;
      monthlyAmount: number;
      transactions: typeof transactions;
    }>();

    transactions.forEach(t => {
      if (t.paymentMethod === 'credit_card' && t.installments) {
        const parentId = t.installments.parentTransactionId;
        const existing = map.get(parentId);

        if (!existing) {
          const cleanTitle = t.description.replace(/\s\(\d+\/\d+\)$/, '');
          map.set(parentId, {
            parentId,
            title: cleanTitle,
            cardId: t.creditCardId || '',
            totalAmount: t.installments.totalPurchaseAmount,
            totalInstallments: t.installments.total,
            currentInstallmentsBilled: 1,
            remainingAmount: t.installments.totalPurchaseAmount - t.amount,
            monthlyAmount: t.amount,
            transactions: [t],
          });
        } else {
          existing.transactions.push(t);
          existing.currentInstallmentsBilled = Math.max(
            existing.currentInstallmentsBilled,
            t.installments.current
          );
          existing.remainingAmount = Math.max(
            0,
            existing.totalAmount - existing.transactions.reduce((s, x) => s + x.amount, 0)
          );
        }
      }
    });

    return Array.from(map.values());
  }, [transactions]);

  // Total committed future installment amounts across all upcoming months
  const totalCommittedFuture = React.useMemo(() => {
    return installmentSeries.reduce((acc, s) => acc + s.remainingAmount, 0);
  }, [installmentSeries]);

  // Recurring totals
  const activeRecurring = React.useMemo(() => {
    return recurringTransactions.filter(r => r.active);
  }, [recurringTransactions]);

  const monthlyFixedIncome = React.useMemo(() => {
    return activeRecurring.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  }, [activeRecurring]);

  const monthlyFixedExpense = React.useMemo(() => {
    return activeRecurring.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  }, [activeRecurring]);

  // Next 6 months projection table
  const next6Months = React.useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(addMonthsToMonthString(selectedMonth, i));
    }
    return list.map((m, idx) => {
      // Installments in month m
      const cardInstallmentsTotal = transactions
        .filter(t => t.paymentMethod === 'credit_card' && t.invoiceMonth === m)
        .reduce((sum, t) => sum + t.amount, 0);

      const projectedIncome = monthlyFixedIncome;
      const projectedExpenses = monthlyFixedExpense + cardInstallmentsTotal;
      const netProjected = projectedIncome - projectedExpenses;

      return {
        month: m,
        label: formatMonthShort(m),
        isCurrent: idx === 0,
        fixedIncome: monthlyFixedIncome,
        fixedExpense: monthlyFixedExpense,
        cardTotal: cardInstallmentsTotal,
        totalExpenses: projectedExpenses,
        netProjected,
      };
    });
  }, [selectedMonth, transactions, monthlyFixedIncome, monthlyFixedExpense]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Projeção Futura: Contas Fixas & Parcelamentos</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Previsibilidade orçamentária dos próximos meses combinando despesas fixas recorrentes e faturas de cartão
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {onOpenSimulator && (
              <button
                type="button"
                onClick={onOpenSimulator}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulador ("E se eu comprar...?")</span>
              </button>
            )}

            <div className="text-right bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Gastos Fixos Mensais</div>
              <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(monthlyFixedExpense)}
              </div>
            </div>

            <div className="text-right bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Parcelas Futuras Cartão</div>
              <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatCurrency(totalCommittedFuture)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projection Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Fluxo Projetado nos Próximos 6 Meses</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Receitas Fixas vs Despesas Fixas vs Faturas de Cartão já contratadas
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="py-3 px-4">Mês</th>
                <th className="py-3 px-4 text-right">Receitas Fixas (+)</th>
                <th className="py-3 px-4 text-right">Despesas Fixas (-)</th>
                <th className="py-3 px-4 text-right">Fatura Cartão / Parcelas (-)</th>
                <th className="py-3 px-4 text-right">Total Despesas Previstas</th>
                <th className="py-3 px-4 text-right font-semibold">Saldo Livre Projetado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
              {next6Months.map(row => (
                <tr
                  key={row.month}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    row.isCurrent ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="capitalize">{row.label}</span>
                    {row.isCurrent && (
                      <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                        Atual
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    + {formatCurrency(row.fixedIncome)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                    - {formatCurrency(row.fixedExpense)}
                  </td>
                  <td className="py-3 px-4 text-right text-purple-600 dark:text-purple-400">
                    - {formatCurrency(row.cardTotal)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold">
                    {formatCurrency(row.totalExpenses)}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold text-xs ${
                    row.netProjected >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {row.netProjected >= 0 ? '+ ' : ''}{formatCurrency(row.netProjected)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Interactive Forecast Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Evolução das Faturas de Cartão de Crédito
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Soma de faturas projetadas mês a mês com base nas parcelas já lançadas
        </p>

        <InstallmentsForecastChart
          cards={cards}
          transactions={transactions}
          currentMonth={selectedMonth}
        />
      </div>

      {/* Ongoing Installment Contracts List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Compras Parceladas em Andamento ({installmentSeries.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Acompanhe o progresso de quitação de cada compra parcelada
            </p>
          </div>
        </div>

        {installmentSeries.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            Nenhuma compra parcelada em andamento no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {installmentSeries.map((series, idx) => {
              const card = cards.find(c => c.id === series.cardId);
              const progressPct = (series.currentInstallmentsBilled / series.totalInstallments) * 100;

              return (
                <div
                  key={idx}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {series.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <CardIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>{card?.name || 'Cartão'}</span>
                        <span>·</span>
                        <span className="font-mono">{series.totalInstallments}x de {formatCurrency(series.monthlyAmount)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(series.totalAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Total da Compra</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        Parcela {series.currentInstallmentsBilled} de {series.totalInstallments}
                      </span>
                      <span className="font-mono text-purple-600 dark:text-purple-300 font-semibold">
                        {progressPct.toFixed(0)}% pago
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Saldo Restante: </span>
                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(series.remainingAmount)}
                      </span>
                    </div>

                    {onOpenAnticipateModal && (
                      <button
                        type="button"
                        onClick={() => onOpenAnticipateModal(series.parentId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/40 rounded-lg transition-colors cursor-pointer"
                        title="Antecipar parcelas desta compra com desconto Nubank"
                      >
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Antecipar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
