import { CreditCard, RecurringTransaction, Transaction } from '../types/finance';
import { calculateInvoiceMonth } from './creditCardUtils';

export type RecurringMonthStatus =
  | 'generated' // Já lançado neste mês
  | 'due_today' // Vence hoje
  | 'upcoming' // Vence em breve neste mês
  | 'overdue' // Vencido (passou do dia ou mês anterior)
  | 'future' // Mês futuro (projetado)
  | 'paused'; // Pausado

export function getRecurringMonthStatus(
  recurring: RecurringTransaction,
  targetMonth: string,
  today: Date = new Date()
): { status: RecurringMonthStatus; daysUntil?: number; dueDateFormatted: string } {
  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  // Max day in the target month (e.g. 28, 29, 30, 31)
  const daysInTargetMonth = new Date(targetYear, targetMonthNum, 0).getDate();
  const actualDueDay = Math.min(recurring.dayOfMonth, daysInTargetMonth);
  const dueDateFormatted = `${String(actualDueDay).padStart(2, '0')}/${String(targetMonthNum).padStart(2, '0')}`;

  if (!recurring.active) {
    return { status: 'paused', dueDateFormatted };
  }

  if (recurring.generatedMonths && recurring.generatedMonths.includes(targetMonth)) {
    return { status: 'generated', dueDateFormatted };
  }

  if (targetMonth < currentMonthStr) {
    return { status: 'overdue', dueDateFormatted };
  }

  if (targetMonth > currentMonthStr) {
    return { status: 'future', dueDateFormatted };
  }

  // Same month:
  if (currentDay === actualDueDay) {
    return { status: 'due_today', daysUntil: 0, dueDateFormatted };
  } else if (currentDay < actualDueDay) {
    return { status: 'upcoming', daysUntil: actualDueDay - currentDay, dueDateFormatted };
  } else {
    return { status: 'overdue', daysUntil: currentDay - actualDueDay, dueDateFormatted };
  }
}

export function buildTransactionFromRecurring(
  recurring: RecurringTransaction,
  targetMonth: string,
  card?: CreditCard,
  customAmount?: number
): Omit<Transaction, 'id' | 'createdAt'> {
  const [year, month] = targetMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.min(recurring.dayOfMonth, daysInMonth);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const amount = customAmount !== undefined ? customAmount : recurring.amount;

  let invoiceMonth: string | undefined;
  if (recurring.paymentMethod === 'credit_card' && card) {
    invoiceMonth = calculateInvoiceMonth(dateStr, card);
  }

  return {
    description: recurring.description,
    amount,
    type: recurring.type,
    date: dateStr,
    categoryId: recurring.categoryId,
    paymentMethod: recurring.paymentMethod,
    accountId: recurring.paymentMethod === 'account' ? recurring.accountId : undefined,
    creditCardId: recurring.paymentMethod === 'credit_card' ? recurring.creditCardId : undefined,
    invoiceMonth,
    status: 'completed',
    recurringId: recurring.id,
    notes: recurring.notes
      ? `${recurring.notes} (Recorrente)`
      : `Lançamento fixo recorrente do dia ${recurring.dayOfMonth}`,
  };
}
