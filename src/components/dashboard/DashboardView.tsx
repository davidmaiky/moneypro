import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard as CardIcon,
  PiggyBank,
  ArrowRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Repeat,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate, formatMonthYear, formatPercent } from '../../utils/formatters';
import { calculateCardMetrics, getInvoiceDates, getBestCardForToday } from '../../utils/creditCardUtils';
import { getRecurringMonthStatus } from '../../utils/recurringUtils';
import { RecurringTransaction } from '../../types/finance';
import { CashFlowChart } from '../charts/CashFlowChart';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { CardUtilizationBar } from '../charts/CardUtilizationBar';
import { ActiveTab } from '../layout/Header';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTransaction: () => void;
  onPayCardInvoice: (cardId: string, invoiceMonth: string, amount: number) => void;
  onOpenNewAccount?: () => void;
  onOpenNewCard?: () => void;
  onOpenRecurringModal?: () => void;
  onOpenProcessModal?: (recurring: RecurringTransaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onOpenNewTransaction,
  onPayCardInvoice,
  onOpenNewAccount,
  onOpenNewCard,
  onOpenRecurringModal,
  onOpenProcessModal,
}) => {
  const {
    accounts,
    cards,
    categories,
    transactions,
    recurringTransactions,
    paidInvoices,
    selectedMonth,
    setSelectedMonth,
  } = useFinance();

  // Consolidate Total Bank Balance across all accounts
  const totalAccountBalance = React.useMemo(() => {
    return accounts.reduce((acc, a) => acc + a.balance, 0);
  }, [accounts]);

  // Current Month calculations
  const monthTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      if (t.paymentMethod === 'credit_card') {
        return t.invoiceMonth === selectedMonth;
      }
      return t.date.startsWith(selectedMonth);
    });
  }, [transactions, selectedMonth]);

  const totalIncome = React.useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const directExpenses = React.useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'account')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const creditCardExpenses = React.useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const totalExpense = directExpenses + creditCardExpenses;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Recent 6 transactions across the app
  const recentTransactions = React.useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* KPI METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Consolidado em Contas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Saldo Total em Contas</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(totalAccountBalance)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}</span>
              {onOpenNewAccount && (
                <button
                  type="button"
                  onClick={onOpenNewAccount}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova Conta</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Receitas do Mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Receitas ({selectedMonth})</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalIncome)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {monthTransactions.filter(t => t.type === 'income').length} entradas registradas
            </div>
          </div>
        </div>

        {/* Card 3: Faturas de Cartão de Crédito */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Faturas do Mês (Cartões)</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CardIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {formatCurrency(creditCardExpenses)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Despesas parceladas e avulsas
            </div>
          </div>
        </div>

        {/* Card 4: Saldo Líquido do Mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5 flex flex-col justify-between shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Saldo Líquido / Economia</span>
            <div className={`p-2 rounded-lg ${netSavings >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-mono ${netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netSavings >= 0 ? '+ ' : ''}{formatCurrency(netSavings)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Taxa de poupança: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatPercent(Math.max(0, savingsRate))}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW: FLUXO DE CAIXA + DESPESAS POR CATEGORIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Fluxo de Caixa Mensal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparativo histórico de Receitas vs Despesas (Contas e Cartão)
              </p>
            </div>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Ver extrato</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <CashFlowChart
            currentMonth={selectedMonth}
            transactions={transactions}
            onSelectMonth={m => setSelectedMonth(m)}
          />
        </div>

        {/* Right (1 col): Expenses by Category Donut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Despesas por Categoria
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  Gerenciar
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 capitalize">
                  {formatMonthYear(selectedMonth)}
                </span>
              </div>
            </div>

            <CategoryDonutChart
              categories={categories}
              transactions={transactions}
              currentMonth={selectedMonth}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3 text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Total Despesas: <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(totalExpense)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* CONTAS FIXAS & RECORRENTES DO MÊS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Contas Fixas & Recorrentes</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                ({formatMonthYear(selectedMonth)})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Acompanhe e lance suas despesas e receitas fixas programadas
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenRecurringModal && (
              <button
                type="button"
                onClick={onOpenRecurringModal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nova Conta Fixa</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('recurring')}
              className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recurringTransactions.length === 0 ? (
          <div className="py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhuma despesa ou receita fixa cadastrada ainda.
            </p>
            <button
              type="button"
              onClick={onOpenRecurringModal ? onOpenRecurringModal : () => setActiveTab('recurring')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configurar Contas Fixas (Salário, Aluguel, Netflix...)</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recurringTransactions.slice(0, 4).map(item => {
              const statusInfo = getRecurringMonthStatus(item, selectedMonth);
              const isIncome = item.type === 'income';

              return (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-col justify-between space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {item.description}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Todo dia {item.dayOfMonth}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-xs font-mono font-bold ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {formatCurrency(item.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {item.autoProcess ? 'Automático' : 'Manual'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/80 text-[11px]">
                    {/* Status badge */}
                    {statusInfo.status === 'generated' ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lançado</span>
                      </span>
                    ) : statusInfo.status === 'due_today' ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Vence hoje!</span>
                      </span>
                    ) : statusInfo.status === 'overdue' ? (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pendente</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        {statusInfo.daysUntil !== undefined ? `Vence em ${statusInfo.daysUntil}d` : `Vence ${statusInfo.dueDateFormatted}`}
                      </span>
                    )}

                    {/* Action button if pending */}
                    {statusInfo.status !== 'generated' && item.active && onOpenProcessModal && (
                      <button
                        type="button"
                        onClick={() => onOpenProcessModal(item)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors cursor-pointer"
                      >
                        Lançar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREDIT CARDS OVERVIEW & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards Summary (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CardIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Seus Cartões de Crédito</span>
            </h2>
            <button
              onClick={() => setActiveTab('cards')}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Gerenciar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {cards.length > 0 && (() => {
            const bestRec = getBestCardForToday(cards);
            if (!bestRec) return null;
            return (
              <div
                onClick={() => setActiveTab('cards')}
                className="cursor-pointer p-3 rounded-xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 text-white space-y-1 hover:border-purple-400/50 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Melhor Cartão Hoje</span>
                  </span>
                  <span className="font-mono text-purple-200 text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-400/30">
                    +{bestRec.maxDaysUntilDue}d de prazo
                  </span>
                </div>
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Hoje use o {bestRec.bestCard.name}</span>
                  <ArrowRight className="w-3 h-3 text-purple-300" />
                </div>
                <div className="text-[10px] text-slate-300">
                  Compras hoje vencem só em {formatDate(bestRec.analyses[0].dueDate)}
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            {cards.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 space-y-2.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum cartão de crédito cadastrado.</p>
                <button
                  type="button"
                  onClick={() => onOpenNewCard ? onOpenNewCard() : setActiveTab('cards')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Cartão</span>
                </button>
              </div>
            ) : (
              cards.map(card => {
                const metrics = calculateCardMetrics(card, transactions, paidInvoices, selectedMonth);
                const { closingDate, dueDate } = getInvoiceDates(card, selectedMonth);
                const isPaid = paidInvoices.some(p => p.cardId === card.id && p.invoiceMonth === selectedMonth);

                return (
                  <div
                    key={card.id}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: card.color }}
                          />
                          <span>{card.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          •••• {card.last4} · {card.bank}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(metrics.currentInvoiceTotal)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Fatura {formatMonthYear(selectedMonth).slice(0, 7)}
                        </div>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <CardUtilizationBar
                      card={card}
                      usedLimit={metrics.totalUsedLimit}
                      availableLimit={metrics.availableLimit}
                      usagePercentage={metrics.usagePercentage}
                    />

                    {/* Actions & Dates */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Vence em <strong className="text-slate-700 dark:text-slate-300">{formatDate(dueDate)}</strong>
                      </span>

                      {isPaid ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Fatura Paga</span>
                        </span>
                      ) : metrics.currentInvoiceTotal > 0 ? (
                        <button
                          onClick={() => onPayCardInvoice(card.id, selectedMonth, metrics.currentInvoiceTotal)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white bg-purple-100 dark:bg-purple-500/20 hover:bg-purple-200 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-purple-500/30 rounded-md transition-colors cursor-pointer"
                        >
                          Pagar Fatura
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">Sem lançamentos</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Últimos Lançamentos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Movimentações mais recentes cadastradas
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenNewTransaction}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Lançamento</span>
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            {recentTransactions.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 space-y-3 my-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum lançamento registrado ainda.</p>
                <button
                  type="button"
                  onClick={onOpenNewTransaction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Novo Lançamento</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentTransactions.map(t => {
                  const category = categories.find(c => c.id === t.categoryId);
                  const isIncome = t.type === 'income';
                  const isCard = t.paymentMethod === 'credit_card';
                  const card = isCard ? cards.find(c => c.id === t.creditCardId) : null;
                  const account = !isCard ? accounts.find(a => a.id === t.accountId) : null;

                  return (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : isCard
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : isCard ? (
                            <CardIcon className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {t.description}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{formatDate(t.date)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{category?.name || 'Geral'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {isCard
                                ? `${card?.name || 'Cartão'}${t.installments ? ` (${t.installments.current}/${t.installments.total})` : ''}`
                                : account?.name || 'Conta'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-xs font-mono font-bold ${
                            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(t.amount)}
                        </div>
                        {isCard && t.invoiceMonth && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                            Fatura {t.invoiceMonth}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{recentTransactions.length === 0 ? 'Sem histórico no momento' : 'Mostrando os lançamentos mais recentes'}</span>
            <button
              onClick={() => setActiveTab('forecast')}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium cursor-pointer"
            >
              Ver projeção de faturas futuras →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
