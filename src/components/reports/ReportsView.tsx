import React, { useState } from 'react';
import {
  FileDown,
  Printer,
  Calendar,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  CreditCard as CardIcon,
  Layers,
  FileText,
  Eye,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  formatCurrency,
  formatDate,
  formatMonthYear,
  formatPercent,
  addMonthsToMonthString,
} from '../../utils/formatters';
import { generateFinancialPDFReport } from '../../utils/pdfGenerator';
import { calculateCardMetrics, getInvoiceDates } from '../../utils/creditCardUtils';

export const ReportsView: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    cards,
    paidInvoices,
    selectedMonth,
    setSelectedMonth,
  } = useFinance();

  const [isExporting, setIsExporting] = useState(false);
  const [reportMonth, setReportMonth] = useState<string>(selectedMonth);

  // Filter transactions for report preview
  const monthTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      if (t.paymentMethod === 'credit_card') {
        return t.invoiceMonth === reportMonth;
      }
      return t.date.startsWith(reportMonth);
    });
  }, [transactions, reportMonth]);

  const incomes = monthTransactions.filter(t => t.type === 'income');
  const expenses = monthTransactions.filter(t => t.type === 'expense');
  const cardExpenses = monthTransactions.filter(
    t => t.type === 'expense' && t.paymentMethod === 'credit_card'
  );
  const directExpenses = monthTransactions.filter(
    t => t.type === 'expense' && t.paymentMethod === 'account'
  );

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalCard = cardExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalDirect = directExpenses.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      generateFinancialPDFReport({
        month: reportMonth,
        transactions,
        categories,
        accounts,
        cards,
        paidInvoices,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportação de Relatórios em PDF</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gere relatórios executivos para arquivamento pessoal, declaração de imposto de renda ou análise mensal
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Month Picker */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <input
                type="month"
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="bg-transparent text-xs font-mono text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Export PDF Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4 stroke-[2.5]" />
              <span>{isExporting ? 'Gerando PDF...' : 'Baixar Relatório em PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Live Document Preview Box */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl space-y-8 max-w-4xl mx-auto transition-colors">
        {/* Document Header Band */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                FinanFlow
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Relatório Consolidado de Gestão Financeira & Cartões
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <div>
              Mês de Referência:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 capitalize">
                {formatMonthYear(reportMonth)}
              </strong>
            </div>
            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Gerado em {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
            01. Resumo Executivo
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Receitas Totais</div>
              <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalIncome)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {incomes.length} entradas
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Despesas Totais</div>
              <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(totalExpense)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Conta + Cartão
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Faturas Cartão</div>
              <div className="text-base font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                {formatCurrency(totalCard)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {cardExpenses.length} lançamentos
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Saldo Líquido</div>
              <div
                className={`text-base font-bold font-mono mt-1 ${
                  netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {netBalance >= 0 ? '+ ' : ''}{formatCurrency(netBalance)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Poupança: {formatPercent(Math.max(0, savingsRate))}
              </div>
            </div>
          </div>
        </div>

        {/* Credit Card Invoices Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
            02. Faturas de Cartão de Crédito do Período
          </h3>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Cartão</th>
                  <th className="py-2.5 px-3">Banco</th>
                  <th className="py-2.5 px-3">Fechamento</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Fatura</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                {cards.map(c => {
                  const m = calculateCardMetrics(c, transactions, paidInvoices, reportMonth);
                  const { closingDate, dueDate } = getInvoiceDates(c, reportMonth);
                  const isPaid = paidInvoices.some(
                    p => p.cardId === c.id && p.invoiceMonth === reportMonth
                  );

                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {c.name} (•••• {c.last4})
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{c.bank}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {formatDate(closingDate)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {formatDate(dueDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-300">
                        {formatCurrency(m.currentInvoiceTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : m.currentInvoiceTotal === 0
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300'
                          }`}
                        >
                          {isPaid ? 'Paga' : m.currentInvoiceTotal === 0 ? 'Sem Débito' : 'Aberta'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions Extract */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
              03. Extrato de Lançamentos ({monthTransactions.length})
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Ordenado por data mais recente
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Forma</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                {monthTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 dark:text-slate-500">
                      Nenhum lançamento registrado neste mês.
                    </td>
                  </tr>
                ) : (
                  [...monthTransactions]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(t => {
                      const cat = categories.find(c => c.id === t.categoryId);
                      const isIncome = t.type === 'income';
                      const isCard = t.paymentMethod === 'credit_card';
                      const card = isCard ? cards.find(c => c.id === t.creditCardId) : null;
                      const acc = !isCard ? accounts.find(a => a.id === t.accountId) : null;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDate(t.date)}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {t.description}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {cat?.name || 'Geral'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {isCard
                              ? `${card?.name || 'Cartão'}${t.installments ? ` (${t.installments.current}/${t.installments.total})` : ''}`
                              : acc?.name || 'Conta'}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {isIncome ? '+ ' : '- '}
                            {formatCurrency(t.amount)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Call to Action */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Pronto para imprimir ou arquivar este período?
          </span>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <FileDown className="w-4 h-4 stroke-[2.5]" />
            <span>Baixar Relatório em PDF Completo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
