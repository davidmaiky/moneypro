export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'account' | 'credit_card';

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'cash';
  bankName: string;
  balance: number;
  color: string;
  userId?: string;
}

export type CardBrand = 'mastercard' | 'visa' | 'elo' | 'amex';

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  last4: string;
  brand: CardBrand;
  color: string;
  gradient: string;
  limitTotal: number;
  closingDay: number; // Dia de fechamento da fatura (ex: 20)
  dueDay: number;     // Dia de vencimento da fatura (ex: 27)
  userId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  iconName: string;
  color: string;
  budgetMonthly?: number;
  userId?: string;
}

export interface InstallmentInfo {
  current: number;
  total: number;
  parentTransactionId: string;
  totalPurchaseAmount: number;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  paymentMethod: PaymentMethod;
  accountId?: string;
  creditCardId?: string;
  dayOfMonth: number; // 1 to 31
  autoProcess: boolean; // Se true, lança automaticamente no dia do vencimento
  active: boolean; // Se false, pausado
  notes?: string;
  createdAt: string;
  generatedMonths: string[]; // Registros dos meses já gerados (ex: ['2026-09', '2026-10'])
  userId?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  categoryId: string;
  paymentMethod: PaymentMethod;
  accountId?: string;        // Se débito/dinheiro/transferência
  creditCardId?: string;     // Se compra no cartão de crédito
  installments?: InstallmentInfo; // Se compra parcelada
  invoiceMonth?: string;     // YYYY-MM correspondente à fatura do cartão
  status: 'completed' | 'pending';
  recurringId?: string;      // ID da regra recorrente de origem se aplicável
  notes?: string;
  createdAt: string;
  userId?: string;
}

export interface InvoiceSummary {
  cardId: string;
  invoiceMonth: string; // YYYY-MM
  closingDate: string;  // YYYY-MM-DD
  dueDate: string;      // YYYY-MM-DD
  totalAmount: number;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  transactions: Transaction[];
  paidAt?: string;
  paidFromAccountId?: string;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  creditCardExpense: number;
  netBalance: number;
}
