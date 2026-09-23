import { CreditCard, InstallmentInfo, InvoiceSummary, Transaction } from '../types/finance';
import { addMonthsToMonthString } from './formatters';

/**
 * Calculates which credit card invoice month a purchase belongs to based on the closing day.
 * If purchase day >= card.closingDay, it falls into the NEXT month's invoice (melhor dia de compra).
 * If purchase day < card.closingDay, it falls into the CURRENT month's invoice.
 */
export function calculateInvoiceMonth(purchaseDate: string, card: CreditCard): string {
  const [year, month, day] = purchaseDate.split('-').map(Number);
  
  if (day >= card.closingDay) {
    // Falls into the following month's bill
    const nextDate = new Date(year, month, 1); // month is already 1-indexed for the next month
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    return `${nextYear}-${nextMonth}`;
  } else {
    // Falls into current month's bill
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}

/**
 * Generates dates for invoice closing and due dates
 */
export function getInvoiceDates(card: CreditCard, invoiceMonth: string): { closingDate: string; dueDate: string } {
  const [year, month] = invoiceMonth.split('-').map(Number);
  
  // Closing date is in the same month as invoiceMonth, or previous month depending on dueDay vs closingDay
  // Standard Brazilian credit card rule:
  // If closingDay < dueDay: both closing and due are in invoiceMonth
  // If closingDay > dueDay: closing was late in previous month, due is early in invoiceMonth
  let closingYear = year;
  let closingMonth = month;
  
  if (card.closingDay > card.dueDay) {
    // Closing is in the previous calendar month
    const prevDate = new Date(year, month - 2, 1);
    closingYear = prevDate.getFullYear();
    closingMonth = prevDate.getMonth() + 1;
  }
  
  const closingDate = `${closingYear}-${String(closingMonth).padStart(2, '0')}-${String(card.closingDay).padStart(2, '0')}`;
  const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(card.dueDay).padStart(2, '0')}`;
  
  return { closingDate, dueDate };
}

/**
 * Creates installment transactions for a credit card purchase.
 * Divides the total amount into N equal installments with exact cent precision.
 */
export function createInstallmentTransactions(params: {
  description: string;
  totalAmount: number;
  installmentsCount: number;
  purchaseDate: string;
  categoryId: string;
  card: CreditCard;
  notes?: string;
}): Transaction[] {
  const { description, totalAmount, installmentsCount, purchaseDate, categoryId, card, notes } = params;
  const parentId = `tx_parent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const firstInvoiceMonth = calculateInvoiceMonth(purchaseDate, card);
  
  const rawPerInstallment = totalAmount / installmentsCount;
  const roundedPerInstallment = Math.floor(rawPerInstallment * 100) / 100;
  const remainderCents = Math.round((totalAmount - roundedPerInstallment * installmentsCount) * 100);
  
  const transactions: Transaction[] = [];
  
  for (let i = 1; i <= installmentsCount; i++) {
    const isFirst = i === 1;
    // Add leftover cents to the first installment so the sum equals exact total
    const installmentAmount = isFirst 
      ? Number((roundedPerInstallment + remainderCents / 100).toFixed(2))
      : Number(roundedPerInstallment.toFixed(2));
      
    const currentInvoiceMonth = addMonthsToMonthString(firstInvoiceMonth, i - 1);
    
    // Installment date: purchase date for first installment, subsequent months for others
    const [pYear, pMonth, pDay] = purchaseDate.split('-').map(Number);
    const instDateObj = new Date(pYear, pMonth - 1 + (i - 1), pDay);
    const instDate = `${instDateObj.getFullYear()}-${String(instDateObj.getMonth() + 1).padStart(2, '0')}-${String(instDateObj.getDate()).padStart(2, '0')}`;
    
    const installmentInfo: InstallmentInfo = {
      current: i,
      total: installmentsCount,
      parentTransactionId: parentId,
      totalPurchaseAmount: totalAmount,
    };
    
    transactions.push({
      id: `tx_${Date.now()}_inst_${i}_${Math.random().toString(36).substring(2, 7)}`,
      description: installmentsCount > 1 ? `${description} (${i}/${installmentsCount})` : description,
      amount: installmentAmount,
      type: 'expense',
      date: instDate,
      categoryId,
      paymentMethod: 'credit_card',
      creditCardId: card.id,
      installments: installmentInfo,
      invoiceMonth: currentInvoiceMonth,
      status: 'completed',
      notes: notes || (installmentsCount > 1 ? `Compra parcelada em ${installmentsCount}x de R$ ${installmentAmount.toFixed(2)}` : undefined),
      createdAt: new Date().toISOString(),
    });
  }
  
  return transactions;
}

/**
 * Calculates used and available credit limit for a card
 */
export function calculateCardMetrics(
  card: CreditCard,
  transactions: Transaction[],
  paidInvoices: { cardId: string; invoiceMonth: string }[] = [],
  currentMonth: string
) {
  // Unpaid credit card transactions
  const cardTransactions = transactions.filter(t => t.paymentMethod === 'credit_card' && t.creditCardId === card.id);
  
  // Filter out transactions that belong to paid invoices
  const unpaidTransactions = cardTransactions.filter(t => {
    if (!t.invoiceMonth) return true;
    const isPaid = paidInvoices.some(p => p.cardId === card.id && p.invoiceMonth === t.invoiceMonth);
    return !isPaid;
  });
  
  const totalUsedLimit = unpaidTransactions.reduce((acc, t) => acc + t.amount, 0);
  const availableLimit = Math.max(0, card.limitTotal - totalUsedLimit);
  const usagePercentage = Math.min(100, (totalUsedLimit / card.limitTotal) * 100);
  
  // Current month invoice
  const currentInvoiceTx = cardTransactions.filter(t => t.invoiceMonth === currentMonth);
  const currentInvoiceTotal = currentInvoiceTx.reduce((acc, t) => acc + t.amount, 0);
  const isCurrentInvoicePaid = paidInvoices.some(p => p.cardId === card.id && p.invoiceMonth === currentMonth);
  
  // Next month invoice
  const nextMonth = addMonthsToMonthString(currentMonth, 1);
  const nextInvoiceTx = cardTransactions.filter(t => t.invoiceMonth === nextMonth);
  const nextInvoiceTotal = nextInvoiceTx.reduce((acc, t) => acc + t.amount, 0);
  
  return {
    totalUsedLimit,
    availableLimit,
    usagePercentage,
    currentInvoiceTotal,
    isCurrentInvoicePaid,
    nextInvoiceTotal,
    unpaidCount: unpaidTransactions.length,
  };
}

/**
 * Groups credit card transactions into monthly invoices
 */
export function getCardInvoices(
  card: CreditCard,
  transactions: Transaction[],
  paidInvoices: { cardId: string; invoiceMonth: string; paidAt?: string; paidFromAccountId?: string }[],
  currentMonth: string
): InvoiceSummary[] {
  const cardTx = transactions.filter(t => t.paymentMethod === 'credit_card' && t.creditCardId === card.id);
  
  // Collect all unique invoice months
  const invoiceMonthsSet = new Set<string>();
  
  // Ensure we show at least 2 previous months, current month, and next 5 future months
  for (let i = -2; i <= 6; i++) {
    invoiceMonthsSet.add(addMonthsToMonthString(currentMonth, i));
  }
  
  cardTx.forEach(t => {
    if (t.invoiceMonth) invoiceMonthsSet.add(t.invoiceMonth);
  });
  
  const sortedMonths = Array.from(invoiceMonthsSet).sort();
  
  return sortedMonths.map(month => {
    const monthTx = cardTx.filter(t => t.invoiceMonth === month);
    const totalAmount = monthTx.reduce((acc, t) => acc + t.amount, 0);
    const { closingDate, dueDate } = getInvoiceDates(card, month);
    
    const paidRecord = paidInvoices.find(p => p.cardId === card.id && p.invoiceMonth === month);
    
    let status: InvoiceSummary['status'] = 'open';
    if (paidRecord) {
      status = 'paid';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (today > dueDate && totalAmount > 0) {
        status = 'overdue';
      } else if (today >= closingDate && totalAmount > 0) {
        status = 'closed';
      } else {
        status = 'open';
      }
    }
    
    return {
      cardId: card.id,
      invoiceMonth: month,
      closingDate,
      dueDate,
      totalAmount,
      status,
      transactions: monthTx,
      paidAt: paidRecord?.paidAt,
      paidFromAccountId: paidRecord?.paidFromAccountId,
    };
  });
}

export interface CardTodayAnalysis {
  card: CreditCard;
  invoiceMonthForToday: string;
  closingDate: string;
  dueDate: string;
  daysUntilDue: number; // grace period days until invoice payment
  daysUntilClosing: number; // days until invoice closes
  isBestDayToday: boolean; // close to or right after closing day
  isBestCard: boolean;
}

export interface BestCardRecommendation {
  bestCard: CreditCard;
  maxDaysUntilDue: number;
  highlightText: string;
  subText: string;
  analyses: CardTodayAnalysis[];
}

/**
 * Calculates the exact grace period (dias de prazo) and invoice dates for a purchase made today
 */
export function getCardBestPurchaseAnalysis(card: CreditCard, referenceDate: Date = new Date()): CardTodayAnalysis {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed
  const refDay = referenceDate.getDate();

  // Determine the next closing date for a purchase made today:
  // If today is strictly before closingDay, the purchase enters this month's closing.
  // If today is >= closingDay, the current invoice is closed, so purchase enters NEXT month's closing.
  let nextClosingDate: Date;
  if (refDay < card.closingDay) {
    nextClosingDate = new Date(refYear, refMonth, card.closingDay);
  } else {
    nextClosingDate = new Date(refYear, refMonth + 1, card.closingDay);
  }

  // Determine the due date for that invoice:
  // If card.dueDay > card.closingDay: due date is in the same calendar month as the closing date.
  // If card.dueDay <= card.closingDay: due date is in the month following the closing date.
  let nextDueDate: Date;
  if (card.dueDay > card.closingDay) {
    nextDueDate = new Date(nextClosingDate.getFullYear(), nextClosingDate.getMonth(), card.dueDay);
  } else {
    nextDueDate = new Date(nextClosingDate.getFullYear(), nextClosingDate.getMonth() + 1, card.dueDay);
  }

  const todayMidnight = new Date(refYear, refMonth, refDay);
  const daysUntilDue = Math.max(
    1,
    Math.round((nextDueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysUntilClosing = Math.max(
    0,
    Math.round((nextClosingDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Best day is when you buy on or immediately after the closing day
  const isBestDayToday =
    refDay === card.closingDay ||
    refDay === card.closingDay + 1 ||
    daysUntilClosing >= 27 ||
    daysUntilDue >= 35;

  const closingDateStr = `${nextClosingDate.getFullYear()}-${String(nextClosingDate.getMonth() + 1).padStart(2, '0')}-${String(nextClosingDate.getDate()).padStart(2, '0')}`;
  const dueDateStr = `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, '0')}-${String(nextDueDate.getDate()).padStart(2, '0')}`;
  const invoiceMonthForToday = `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, '0')}`;

  return {
    card,
    invoiceMonthForToday,
    closingDate: closingDateStr,
    dueDate: dueDateStr,
    daysUntilDue,
    daysUntilClosing,
    isBestDayToday,
    isBestCard: false,
  };
}

/**
 * Analyzes all credit cards to find the best card to buy today for maximum term (até 40 dias de prazo)
 */
export function getBestCardForToday(cards: CreditCard[], referenceDate: Date = new Date()): BestCardRecommendation | null {
  if (!cards || cards.length === 0) return null;

  const analyses = cards.map(c => getCardBestPurchaseAnalysis(c, referenceDate));

  // Sort by daysUntilDue descending; tie-breaker: higher available credit limit
  analyses.sort((a, b) => {
    if (b.daysUntilDue !== a.daysUntilDue) {
      return b.daysUntilDue - a.daysUntilDue;
    }
    return b.card.limitTotal - a.card.limitTotal;
  });

  analyses[0].isBestCard = true;
  const best = analyses[0];

  const highlightText = `Hoje use o ${best.card.name} para ganhar até ${best.daysUntilDue} dias de prazo`;
  const subText = `Compras feitas hoje só vencem em ${nextDueDateFormatted(best.dueDate)} (fatura fecha em ${nextDueDateFormatted(best.closingDate)}).`;

  return {
    bestCard: best.card,
    maxDaysUntilDue: best.daysUntilDue,
    highlightText,
    subText,
    analyses,
  };
}

function nextDueDateFormatted(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
