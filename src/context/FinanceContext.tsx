import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Account, Category, CreditCard, RecurringTransaction, Transaction } from '../types/finance';
import { INITIAL_ACCOUNTS, INITIAL_CARDS, INITIAL_CATEGORIES, getInitialTransactions } from '../data/initialData';
import { createInstallmentTransactions, calculateInvoiceMonth } from '../utils/creditCardUtils';
import { getCurrentMonthString } from '../utils/formatters';
import { buildTransactionFromRecurring } from '../utils/recurringUtils';

interface PaidInvoiceRecord {
  cardId: string;
  invoiceMonth: string;
  paidAt: string;
  paidFromAccountId: string;
  amount: number;
}

interface FinanceContextType {
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  paidInvoices: PaidInvoiceRecord[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  
  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  addCreditCardPurchase: (params: {
    description: string;
    totalAmount: number;
    installmentsCount: number;
    purchaseDate: string;
    categoryId: string;
    cardId: string;
    notes?: string;
  }) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string, deleteEntireSeries?: boolean) => void;

  // Recurring Transactions
  addRecurringTransaction: (data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'generatedMonths'>) => void;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  toggleRecurringActive: (id: string) => void;
  processRecurringForMonth: (recurringId: string, targetMonth: string, customAmount?: number) => void;
  
  // Cards
  addCreditCard: (card: Omit<CreditCard, 'id'>) => void;
  updateCreditCard: (id: string, updates: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  
  // Accounts
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Categories & Budgets
  addCategory: (category: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string, reassignToCategoryId?: string) => { success: boolean; message: string };
  updateCategoryBudget: (categoryId: string, budget: number) => void;
  resetCategoriesToDefault: () => void;

  // Invoices
  payInvoice: (cardId: string, invoiceMonth: string, accountId: string) => void;

  // Installments Anticipation & Amortization
  anticipateInstallments: (params: {
    parentTransactionId: string;
    installmentsToAnticipateCount: number;
    discountAmount: number;
    destination: 'invoice' | 'account';
    targetInvoiceMonth?: string;
    accountId?: string;
  }) => { success: boolean; message: string };
  
  // Privacy Mode
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;

  // Backup & Restore
  exportBackupJSON: () => string;
  importBackupJSON: (jsonString: string, mode?: 'replace' | 'merge') => {
    success: boolean;
    message: string;
    summary?: {
      accounts: number;
      cards: number;
      categories: number;
      transactions: number;
      recurring: number;
      paidInvoices: number;
    };
  };

  // Utilities
  resetToDemoData: () => void;
  clearAllData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCOUNTS: 'finanflow_v3_accounts',
  CARDS: 'finanflow_v3_cards',
  CATEGORIES: 'finanflow_v3_categories',
  TRANSACTIONS: 'finanflow_v3_transactions',
  RECURRING: 'finanflow_v3_recurring',
  PAID_INVOICES: 'finanflow_v3_paid_invoices',
};

// Cleanup old demo keys if present in browser storage
try {
  [
    'finanflow_accounts_v1', 'finanflow_cards_v1', 'finanflow_categories_v1', 'finanflow_transactions_v1', 'finanflow_paid_invoices_v1',
    'finanflow_v2_accounts', 'finanflow_v2_cards', 'finanflow_v2_categories', 'finanflow_v2_transactions', 'finanflow_v2_paid_invoices'
  ].forEach(k => {
    localStorage.removeItem(k);
  });
} catch {
  // Ignore in SSR / restricted storage environments
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthString());

  // Load accounts
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return stored ? JSON.parse(stored) : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  });

  // Load cards
  const [cards, setCards] = useState<CreditCard[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CARDS);
      return stored ? JSON.parse(stored) : INITIAL_CARDS;
    } catch {
      return INITIAL_CARDS;
    }
  });

  // Load categories
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return stored ? JSON.parse(stored) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // Load transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return stored ? JSON.parse(stored) : getInitialTransactions();
    } catch {
      return getInitialTransactions();
    }
  });

  // Load paid invoices
  const [paidInvoices, setPaidInvoices] = useState<PaidInvoiceRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PAID_INVOICES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load recurring transactions
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECURRING);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist state updates to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(recurringTransactions));
  }, [recurringTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAID_INVOICES, JSON.stringify(paidInvoices));
  }, [paidInvoices]);

  // Add single direct transaction (income or account expense)
  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update account balance if it's directly tied to an account
    if (newTx.paymentMethod === 'account' && newTx.accountId) {
      setAccounts(prevAccounts =>
        prevAccounts.map(acc => {
          if (acc.id === newTx.accountId) {
            const diff = newTx.type === 'income' ? newTx.amount : -newTx.amount;
            return { ...acc, balance: Number((acc.balance + diff).toFixed(2)) };
          }
          return acc;
        })
      );
    }
  };

  // Process a recurring transaction for a given target month (e.g. '2026-09')
  const processRecurringForMonth = useCallback(
    (recurringId: string, targetMonth: string, customAmount?: number) => {
      setRecurringTransactions(prevRecurring => {
        const recurring = prevRecurring.find(r => r.id === recurringId);
        if (!recurring) return prevRecurring;

        // Skip if already generated for this month
        if (recurring.generatedMonths && recurring.generatedMonths.includes(targetMonth)) {
          return prevRecurring;
        }

        const card =
          recurring.paymentMethod === 'credit_card' && recurring.creditCardId
            ? cards.find(c => c.id === recurring.creditCardId)
            : undefined;

        const txData = buildTransactionFromRecurring(recurring, targetMonth, card, customAmount);
        
        // Add transaction
        addTransaction(txData);

        // Mark month as generated
        return prevRecurring.map(r =>
          r.id === recurringId
            ? { ...r, generatedMonths: [...(r.generatedMonths || []), targetMonth] }
            : r
        );
      });
    },
    [cards]
  );

  // Automatic processing: triggers for active recurring transactions on their due day
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

    recurringTransactions.forEach(r => {
      if (!r.active || !r.autoProcess) return;

      const alreadyGenerated = r.generatedMonths && r.generatedMonths.includes(currentMonthStr);
      if (alreadyGenerated) return;

      // If today has reached or passed the due day of the current calendar month
      if (currentDay >= r.dayOfMonth) {
        processRecurringForMonth(r.id, currentMonthStr);
      }
    });
  }, [recurringTransactions, processRecurringForMonth]);

  // Add Credit Card Purchase (supports single or multi-installments)
  const addCreditCardPurchase = (params: {
    description: string;
    totalAmount: number;
    installmentsCount: number;
    purchaseDate: string;
    categoryId: string;
    cardId: string;
    notes?: string;
  }) => {
    const targetCard = cards.find(c => c.id === params.cardId);
    if (!targetCard) return;

    const newTxs = createInstallmentTransactions({
      description: params.description,
      totalAmount: params.totalAmount,
      installmentsCount: Math.max(1, params.installmentsCount),
      purchaseDate: params.purchaseDate,
      categoryId: params.categoryId,
      card: targetCard,
      notes: params.notes,
    });

    setTransactions(prev => [...newTxs, ...prev]);
  };

  // Update transaction
  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Delete transaction (optionally delete all installments in series)
  const deleteTransaction = (id: string, deleteEntireSeries = false) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    if (deleteEntireSeries && target.installments?.parentTransactionId) {
      const parentId = target.installments.parentTransactionId;
      setTransactions(prev => prev.filter(t => t.installments?.parentTransactionId !== parentId));
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }

    // Revert account balance if applicable
    if (target.paymentMethod === 'account' && target.accountId) {
      setAccounts(prevAccounts =>
        prevAccounts.map(acc => {
          if (acc.id === target.accountId) {
            const revertDiff = target.type === 'income' ? -target.amount : target.amount;
            return { ...acc, balance: Number((acc.balance + revertDiff).toFixed(2)) };
          }
          return acc;
        })
      );
    }

    // If it was generated by a recurring transaction, unmark the month so it can be re-run or re-launched
    if (target.recurringId) {
      const targetMonth = target.date.slice(0, 7);
      setRecurringTransactions(prev =>
        prev.map(r => {
          if (r.id === target.recurringId) {
            return {
              ...r,
              generatedMonths: (r.generatedMonths || []).filter(m => m !== targetMonth),
            };
          }
          return r;
        })
      );
    }
  };

  // Recurring Transactions CRUD
  const addRecurringTransaction = (
    data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'generatedMonths'>
  ) => {
    const newRecurring: RecurringTransaction = {
      ...data,
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      generatedMonths: [],
    };
    setRecurringTransactions(prev => [...prev, newRecurring]);
  };

  const updateRecurringTransaction = (id: string, updates: Partial<RecurringTransaction>) => {
    setRecurringTransactions(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteRecurringTransaction = (id: string) => {
    setRecurringTransactions(prev => prev.filter(r => r.id !== id));
  };

  const toggleRecurringActive = (id: string) => {
    setRecurringTransactions(prev =>
      prev.map(r => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  // Add credit card
  const addCreditCard = (cardData: Omit<CreditCard, 'id'>) => {
    const newCard: CreditCard = {
      ...cardData,
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setCards(prev => [...prev, newCard]);
  };

  // Update credit card
  const updateCreditCard = (id: string, updates: Partial<CreditCard>) => {
    setCards(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Delete credit card
  const deleteCreditCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  // Add account
  const addAccount = (accountData: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...accountData,
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setAccounts(prev => [...prev, newAccount]);
  };

  // Update account
  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  };

  // Delete account
  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  // Category CRUD
  const addCategory = (categoryData: Omit<Category, 'id'>): Category => {
    const newCategory: Category = {
      ...categoryData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCategory = (id: string, reassignToCategoryId?: string): { success: boolean; message: string } => {
    if (id === 'cat_fatura') {
      return {
        success: false,
        message: 'A categoria "Pagamento de Fatura" é reservada pelo sistema e não pode ser excluída.',
      };
    }

    const categoryToDelete = categories.find(c => c.id === id);
    if (!categoryToDelete) {
      return { success: false, message: 'Categoria não encontrada.' };
    }

    // Determine target category to reassign to (if not explicitly given, pick a default category of matching type)
    let fallbackId = reassignToCategoryId;
    if (!fallbackId) {
      const defaultFallback = categories.find(c => c.id !== id && c.type === categoryToDelete.type);
      fallbackId = defaultFallback?.id || (categoryToDelete.type === 'income' ? 'cat_outras_receitas' : 'cat_outros');
    }

    // Reassign any matching transactions
    setTransactions(prev =>
      prev.map(t => (t.categoryId === id ? { ...t, categoryId: fallbackId! } : t))
    );

    // Reassign any recurring rules
    setRecurringTransactions(prev =>
      prev.map(r => (r.categoryId === id ? { ...r, categoryId: fallbackId! } : r))
    );

    // Remove category
    setCategories(prev => prev.filter(c => c.id !== id));

    return {
      success: true,
      message: `Categoria "${categoryToDelete.name}" excluída com sucesso.`,
    };
  };

  // Update Category Budget
  const updateCategoryBudget = (categoryId: string, budget: number) => {
    setCategories(prev =>
      prev.map(c => (c.id === categoryId ? { ...c, budgetMonthly: budget } : c))
    );
  };

  // Reset Categories to default list
  const resetCategoriesToDefault = () => {
    setCategories(INITIAL_CATEGORIES);
  };

  // Pay credit card invoice:
  // 1. Records paid invoice
  // 2. Debits from chosen account
  // 3. Creates an expense transaction in the bank account log
  const payInvoice = (cardId: string, invoiceMonth: string, accountId: string) => {
    const card = cards.find(c => c.id === cardId);
    const account = accounts.find(a => a.id === accountId);
    if (!card || !account) return;

    // Calculate total for this invoice
    const invoiceTxs = transactions.filter(
      t => t.paymentMethod === 'credit_card' && t.creditCardId === cardId && t.invoiceMonth === invoiceMonth
    );
    const invoiceTotal = invoiceTxs.reduce((sum, t) => sum + t.amount, 0);

    const now = new Date().toISOString();

    const record: PaidInvoiceRecord = {
      cardId,
      invoiceMonth,
      paidAt: now,
      paidFromAccountId: accountId,
      amount: invoiceTotal,
    };

    setPaidInvoices(prev => {
      // Remove any existing record for this card and month, then append
      const filtered = prev.filter(p => !(p.cardId === cardId && p.invoiceMonth === invoiceMonth));
      return [...filtered, record];
    });

    // Debit the account
    setAccounts(prev =>
      prev.map(acc => {
        if (acc.id === accountId) {
          return { ...acc, balance: Number((acc.balance - invoiceTotal).toFixed(2)) };
        }
        return acc;
      })
    );

    // Create a corresponding bank expense transaction for clarity
    const bankExpenseTx: Transaction = {
      id: `tx_pay_inv_${Date.now()}`,
      description: `Pagamento Fatura ${card.name} (${invoiceMonth})`,
      amount: invoiceTotal,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'cat_fatura',
      paymentMethod: 'account',
      accountId: accountId,
      status: 'completed',
      notes: `Fatura paga via ${account.name}`,
      createdAt: now,
    };

    setTransactions(prev => [bankExpenseTx, ...prev]);
  };

  // Anticipate and Amortize Installments (Nubank style with discount)
  const anticipateInstallments = (params: {
    parentTransactionId: string;
    installmentsToAnticipateCount: number;
    discountAmount: number;
    destination: 'invoice' | 'account';
    targetInvoiceMonth?: string;
    accountId?: string;
  }): { success: boolean; message: string } => {
    // 1. Find all transactions in this installment series
    const seriesTxs = transactions.filter(
      t => t.installments?.parentTransactionId === params.parentTransactionId
    );

    if (seriesTxs.length === 0) {
      return { success: false, message: 'Parcelamento não encontrado.' };
    }

    // 2. Identify unpaid installments
    const unpaidTxs = seriesTxs.filter(t => {
      if (!t.invoiceMonth || !t.creditCardId) return true;
      return !paidInvoices.some(p => p.cardId === t.creditCardId && p.invoiceMonth === t.invoiceMonth);
    });

    if (unpaidTxs.length === 0) {
      return { success: false, message: 'Não há parcelas pendentes para antecipar.' };
    }

    // Sort by installment number ascending
    unpaidTxs.sort((a, b) => (a.installments?.current || 0) - (b.installments?.current || 0));

    // Choose the last N installments (Nubank style gives highest discount on furthest installments)
    const count = Math.min(Math.max(1, params.installmentsToAnticipateCount), unpaidTxs.length);
    const targetTxs = unpaidTxs.slice(unpaidTxs.length - count);
    const targetIds = new Set(targetTxs.map(t => t.id));

    const grossAmount = targetTxs.reduce((sum, t) => sum + t.amount, 0);
    const discount = Math.max(0, Math.min(params.discountAmount, grossAmount));
    const netAmount = Number(Math.max(0, grossAmount - discount).toFixed(2));

    const firstTx = seriesTxs[0];
    const originalTitle = firstTx.description.replace(/\s*\(\d+\/\d+\)$/, '');
    const cardId = targetTxs[0].creditCardId || firstTx.creditCardId || cards[0]?.id;
    const categoryId = targetTxs[0].categoryId || firstTx.categoryId;
    const card = cards.find(c => c.id === cardId);
    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];
    const installmentNumbers = targetTxs.map(t => t.installments?.current).join(', ');

    if (params.destination === 'invoice') {
      const invoiceMonth = params.targetInvoiceMonth || selectedMonth;
      const newTx: Transaction = {
        id: `tx_anticipate_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        description: `Antecipação ${count}x - ${originalTitle}`,
        amount: netAmount,
        type: 'expense',
        date: todayStr,
        categoryId,
        paymentMethod: 'credit_card',
        creditCardId: cardId,
        invoiceMonth,
        status: 'completed',
        notes: `Antecipação de ${count} parcelas [${installmentNumbers}/${firstTx.installments?.total}]. Desconto aplicado: R$ ${discount.toFixed(2)}.`,
        createdAt: now,
      };

      // Remove anticipated future installments, add consolidated discounted invoice transaction
      setTransactions(prev => [newTx, ...prev.filter(t => !targetIds.has(t.id))]);

      return {
        success: true,
        message: `${count} parcela(s) antecipada(s) para a fatura de ${invoiceMonth} com R$ ${discount.toFixed(2)} de desconto!`,
      };
    } else {
      // Direct payment from bank account
      const accountId = params.accountId || accounts[0]?.id;
      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        return { success: false, message: 'Conta bancária selecionada não encontrada.' };
      }

      const newTx: Transaction = {
        id: `tx_anticipate_paid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        description: `Quitação Antecipada ${count}x - ${originalTitle}`,
        amount: netAmount,
        type: 'expense',
        date: todayStr,
        categoryId,
        paymentMethod: 'account',
        accountId: account.id,
        status: 'completed',
        notes: `Quitação imediata de ${count} parcelas [${installmentNumbers}/${firstTx.installments?.total}] via ${account.name}. Desconto: R$ ${discount.toFixed(2)}. Limite liberado no ${card?.name || 'cartão'}.`,
        createdAt: now,
      };

      // Remove anticipated future installments from card
      setTransactions(prev => [newTx, ...prev.filter(t => !targetIds.has(t.id))]);

      // Deduct from bank account balance
      setAccounts(prev =>
        prev.map(acc => {
          if (acc.id === account.id) {
            return { ...acc, balance: Number((acc.balance - netAmount).toFixed(2)) };
          }
          return acc;
        })
      );

      return {
        success: true,
        message: `${count} parcela(s) quitada(s) à vista via ${account.name} com R$ ${discount.toFixed(2)} de economia! Limite do cartão liberado.`,
      };
    }
  };

  // Reset to initial clean state (no demo data)
  const resetToDemoData = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setCards(INITIAL_CARDS);
    setCategories(INITIAL_CATEGORIES);
    setTransactions(getInitialTransactions());
    setRecurringTransactions([]);
    setPaidInvoices([]);
    setSelectedMonth(getCurrentMonthString());
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  };

  // Clear all data
  const clearAllData = () => {
    setAccounts([]);
    setCards([]);
    setTransactions([]);
    setRecurringTransactions([]);
    setPaidInvoices([]);
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  };

  // Privacy Mode (Ocultar Valores)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('finanflow_privacy_mode') === 'true';
    } catch {
      return false;
    }
  });

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('finanflow_privacy_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    if (isPrivacyMode) {
      document.documentElement.classList.add('privacy-active');
    } else {
      document.documentElement.classList.remove('privacy-active');
    }
  }, [isPrivacyMode]);

  // Export full JSON backup
  const exportBackupJSON = () => {
    const backupData = {
      app: 'FinanFlow',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      accounts,
      cards,
      categories,
      transactions,
      recurringTransactions,
      paidInvoices,
      meta: {
        accountsCount: accounts.length,
        cardsCount: cards.length,
        categoriesCount: categories.length,
        transactionsCount: transactions.length,
        recurringCount: recurringTransactions.length,
        paidInvoicesCount: paidInvoices.length,
      },
    };
    return JSON.stringify(backupData, null, 2);
  };

  // Import JSON backup
  const importBackupJSON = (jsonString: string, mode: 'replace' | 'merge' = 'replace') => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'O arquivo JSON não é válido ou está corrompido.' };
      }

      const incomingAccounts: Account[] = Array.isArray(data.accounts) ? data.accounts : [];
      const incomingCards: CreditCard[] = Array.isArray(data.cards) ? data.cards : [];
      const incomingCategories: Category[] = Array.isArray(data.categories) ? data.categories : [];
      const incomingTransactions: Transaction[] = Array.isArray(data.transactions) ? data.transactions : [];
      const incomingRecurring: RecurringTransaction[] = Array.isArray(data.recurringTransactions)
        ? data.recurringTransactions
        : Array.isArray(data.recurring)
        ? data.recurring
        : [];
      const incomingPaidInvoices: PaidInvoiceRecord[] = Array.isArray(data.paidInvoices) ? data.paidInvoices : [];

      if (
        incomingAccounts.length === 0 &&
        incomingCards.length === 0 &&
        incomingTransactions.length === 0 &&
        incomingCategories.length === 0
      ) {
        return {
          success: false,
          message: 'O arquivo JSON não contém coleções financeiras reconhecíveis do FinanFlow.',
        };
      }

      if (mode === 'replace') {
        if (incomingAccounts.length > 0) setAccounts(incomingAccounts);
        if (incomingCards.length > 0) setCards(incomingCards);
        if (incomingCategories.length > 0) setCategories(incomingCategories);
        if (incomingTransactions.length > 0) setTransactions(incomingTransactions);
        setRecurringTransactions(incomingRecurring);
        setPaidInvoices(incomingPaidInvoices);

        try {
          if (incomingAccounts.length > 0) localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(incomingAccounts));
          if (incomingCards.length > 0) localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(incomingCards));
          if (incomingCategories.length > 0) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(incomingCategories));
          if (incomingTransactions.length > 0) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(incomingTransactions));
          localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(incomingRecurring));
          localStorage.setItem(STORAGE_KEYS.PAID_INVOICES, JSON.stringify(incomingPaidInvoices));
        } catch {
          // ignore
        }
      } else {
        const mergeById = <T extends { id: string }>(currentList: T[], incomingList: T[]): T[] => {
          const map = new Map<string, T>();
          currentList.forEach(item => map.set(item.id, item));
          incomingList.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        };

        const mergeInvoices = (
          currentList: PaidInvoiceRecord[],
          incomingList: PaidInvoiceRecord[]
        ): PaidInvoiceRecord[] => {
          const map = new Map<string, PaidInvoiceRecord>();
          currentList.forEach(item => map.set(`${item.cardId}_${item.invoiceMonth}`, item));
          incomingList.forEach(item => map.set(`${item.cardId}_${item.invoiceMonth}`, item));
          return Array.from(map.values());
        };

        const mergedAccounts = mergeById(accounts, incomingAccounts);
        const mergedCards = mergeById(cards, incomingCards);
        const mergedCategories = mergeById(categories, incomingCategories);
        const mergedTransactions = mergeById(transactions, incomingTransactions);
        const mergedRecurring = mergeById(recurringTransactions, incomingRecurring);
        const mergedInvoices = mergeInvoices(paidInvoices, incomingPaidInvoices);

        setAccounts(mergedAccounts);
        setCards(mergedCards);
        setCategories(mergedCategories);
        setTransactions(mergedTransactions);
        setRecurringTransactions(mergedRecurring);
        setPaidInvoices(mergedInvoices);

        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(mergedAccounts));
          localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(mergedCards));
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(mergedCategories));
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mergedTransactions));
          localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(mergedRecurring));
          localStorage.setItem(STORAGE_KEYS.PAID_INVOICES, JSON.stringify(mergedInvoices));
        } catch {
          // ignore
        }
      }

      return {
        success: true,
        message: 'Backup restaurado com sucesso!',
        summary: {
          accounts: incomingAccounts.length,
          cards: incomingCards.length,
          categories: incomingCategories.length,
          transactions: incomingTransactions.length,
          recurring: incomingRecurring.length,
          paidInvoices: incomingPaidInvoices.length,
        },
      };
    } catch (err) {
      return {
        success: false,
        message: `Falha ao interpretar o arquivo JSON: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      };
    }
  };

  const value = useMemo(
    () => ({
      accounts,
      cards,
      categories,
      transactions,
      recurringTransactions,
      paidInvoices,
      selectedMonth,
      setSelectedMonth,
      addTransaction,
      addCreditCardPurchase,
      updateTransaction,
      deleteTransaction,
      addRecurringTransaction,
      updateRecurringTransaction,
      deleteRecurringTransaction,
      toggleRecurringActive,
      processRecurringForMonth,
      addCreditCard,
      updateCreditCard,
      deleteCreditCard,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      updateCategoryBudget,
      resetCategoriesToDefault,
      payInvoice,
      anticipateInstallments,
      isPrivacyMode,
      togglePrivacyMode,
      exportBackupJSON,
      importBackupJSON,
      resetToDemoData,
      clearAllData,
    }),
    [
      accounts,
      cards,
      categories,
      transactions,
      recurringTransactions,
      paidInvoices,
      selectedMonth,
      processRecurringForMonth,
      isPrivacyMode,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
