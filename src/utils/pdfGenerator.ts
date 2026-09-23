import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Account, Category, CreditCard, Transaction } from '../types/finance';
import { formatCurrency, formatDate, formatMonthYear } from './formatters';
import { calculateCardMetrics, getInvoiceDates } from './creditCardUtils';

interface GenerateReportOptions {
  month: string; // YYYY-MM
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  paidInvoices: { cardId: string; invoiceMonth: string }[];
  includeInstallmentsForecast?: boolean;
}

export function generateFinancialPDFReport(options: GenerateReportOptions) {
  const {
    month,
    transactions,
    categories,
    accounts,
    cards,
    paidInvoices,
    includeInstallmentsForecast = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const monthLabel = formatMonthYear(month);

  // Filter transactions for the selected month
  // For accounts: tx.date starts with month
  // For credit cards: tx.invoiceMonth === month
  const monthTransactions = transactions.filter(t => {
    if (t.paymentMethod === 'credit_card') {
      return t.invoiceMonth === month;
    }
    return t.date.startsWith(month);
  });

  const incomes = monthTransactions.filter(t => t.type === 'income');
  const expenses = monthTransactions.filter(t => t.type === 'expense');
  const creditCardExpenses = monthTransactions.filter(t => t.type === 'expense' && t.paymentMethod === 'credit_card');
  const directExpenses = monthTransactions.filter(t => t.type === 'expense' && t.paymentMethod === 'account');

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalCreditCard = creditCardExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalDirect = directExpenses.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, (netBalance / totalIncome) * 100) : 0;

  // --- HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 27, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Money Pro · Relatório Financeiro Pessoal', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Período de Referência: ${monthLabel.toUpperCase()}  |  Emitido em: ${todayFormatted}`, 14, 20);

  let currentY = 36;

  // --- EXECUTIVE SUMMARY CARDS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Resumo Executivo do Mês', 14, currentY);
  currentY += 4;

  const cardWidth = (pageWidth - 28 - 12) / 4; // 4 cards with 4mm spacing
  const cardHeight = 20;

  const kpis = [
    { label: 'Receitas Totais', value: formatCurrency(totalIncome), color: [16, 185, 129] },
    { label: 'Despesas Totais', value: formatCurrency(totalExpense), color: [239, 68, 68] },
    { label: 'Faturas de Cartão', value: formatCurrency(totalCreditCard), color: [139, 92, 246] },
    { 
      label: 'Saldo Líquido', 
      value: (netBalance >= 0 ? '+ ' : '') + formatCurrency(netBalance), 
      color: netBalance >= 0 ? [5, 150, 105] : [220, 38, 38] 
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 4);
    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Indicator bar
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, currentY, cardWidth, 1.2, 'F');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, currentY + 6.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, currentY + 14.5);
  });

  currentY += cardHeight + 8;

  // --- SEÇÃO: CARTÕES DE CRÉDITO & FATURAS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Faturas de Cartão de Crédito no Período', 14, currentY);
  currentY += 2;

  const cardRows = cards.map(c => {
    const metrics = calculateCardMetrics(c, transactions, paidInvoices, month);
    const { closingDate, dueDate } = getInvoiceDates(c, month);
    const isPaid = paidInvoices.some(p => p.cardId === c.id && p.invoiceMonth === month);
    const statusText = isPaid ? 'PAGA' : (metrics.currentInvoiceTotal === 0 ? 'SEM GASTOS' : 'ABERTA / A PAGAR');
    
    return [
      `${c.name} (•••• ${c.last4})`,
      c.bank,
      formatCurrency(c.limitTotal),
      formatDate(closingDate),
      formatDate(dueDate),
      formatCurrency(metrics.currentInvoiceTotal),
      statusText
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Cartão', 'Banco', 'Limite Total', 'Fechamento', 'Vencimento', 'Total Fatura', 'Status']],
    body: cardRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // --- SEÇÃO: DESPESAS POR CATEGORIA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Distribuição de Gastos por Categoria', 14, currentY);
  currentY += 2;

  // Calculate expenses grouped by category
  const categorySpendingMap = new Map<string, number>();
  expenses.forEach(t => {
    const prev = categorySpendingMap.get(t.categoryId) || 0;
    categorySpendingMap.set(t.categoryId, prev + t.amount);
  });

  const sortedCategories = categories
    .filter(cat => cat.type === 'expense' && (categorySpendingMap.get(cat.id) || 0) > 0)
    .sort((a, b) => (categorySpendingMap.get(b.id) || 0) - (categorySpendingMap.get(a.id) || 0));

  const categoryRows = sortedCategories.map(cat => {
    const spent = categorySpendingMap.get(cat.id) || 0;
    const share = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
    const budget = cat.budgetMonthly || 0;
    const budgetPct = budget > 0 ? (spent / budget) * 100 : null;
    const budgetStatus = budgetPct === null ? '-' : budgetPct > 100 ? `Excedido (${budgetPct.toFixed(0)}%)` : `${budgetPct.toFixed(0)}%`;

    return [
      cat.name,
      formatCurrency(spent),
      budget > 0 ? formatCurrency(budget) : 'Não definido',
      `${share.toFixed(1)}%`,
      budgetStatus
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Categoria', 'Total Gasto', 'Orçamento Mensal', '% do Total', 'Status Orçamento']],
    body: categoryRows.length > 0 ? categoryRows : [['Nenhuma despesa registrada no período', '-', '-', '-', '-']],
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // Check if we need a new page for detailed transactions table
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 18;
  }

  // --- SEÇÃO: EXTRATO DETALHADO DE TRANSAÇÕES ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Extrato Completo de Lançamentos do Período', 14, currentY);
  currentY += 2;

  const sortedTx = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date));

  const txRows = sortedTx.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    let method = 'Conta Corrente';
    if (t.paymentMethod === 'credit_card') {
      const card = cards.find(c => c.id === t.creditCardId);
      const inst = t.installments ? ` (${t.installments.current}/${t.installments.total})` : '';
      method = `${card ? card.name : 'Cartão'}${inst}`;
    } else if (t.accountId) {
      const acc = accounts.find(a => a.id === t.accountId);
      method = acc ? acc.name : 'Conta Bancária';
    }

    const typeSign = t.type === 'income' ? '+ ' : '- ';
    const formattedAmount = `${typeSign}${formatCurrency(t.amount)}`;

    return [
      formatDate(t.date),
      t.description,
      cat ? cat.name : 'Outros',
      method,
      t.type === 'income' ? 'Receita' : 'Despesa',
      formattedAmount
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Descrição', 'Categoria', 'Forma / Cartão', 'Tipo', 'Valor']],
    body: txRows.length > 0 ? txRows : [['Nenhum lançamento no período', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (text.startsWith('-')) {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // --- FOOTERS ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('FinanFlow - Sistema de Gestão Financeira Pessoal & Cartões de Crédito', 14, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  // Save the PDF
  const filename = `Relatorio_Financeiro_${month}.pdf`;
  doc.save(filename);
}
