import { Account, Category, CreditCard, RecurringTransaction, Transaction } from '../types/finance';

export interface BootstrapResponse {
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  paidInvoices: {
    cardId: string;
    invoiceMonth: string;
    paidAt: string;
    paidFromAccountId: string;
    amount: number;
  }[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `Erro HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) errorMessage = parsed.error;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export const api = {
  // Bootstrap
  async getBootstrap(): Promise<BootstrapResponse> {
    return request<BootstrapResponse>('/api/bootstrap');
  },

  // Accounts
  async saveAccount(account: Account): Promise<{ success: boolean; account: Account }> {
    return request('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  },

  async deleteAccount(id: string): Promise<{ success: boolean }> {
    return request(`/api/accounts/${id}`, {
      method: 'DELETE',
    });
  },

  // Cards
  async saveCard(card: CreditCard): Promise<{ success: boolean; card: CreditCard }> {
    return request('/api/cards', {
      method: 'POST',
      body: JSON.stringify(card),
    });
  },

  async deleteCard(id: string): Promise<{ success: boolean }> {
    return request(`/api/cards/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories
  async saveCategory(category: Category): Promise<{ success: boolean; category: Category }> {
    return request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  async deleteCategory(id: string, reassignToCategoryId?: string): Promise<{ success: boolean }> {
    const query = reassignToCategoryId ? `?reassignTo=${encodeURIComponent(reassignToCategoryId)}` : '';
    return request(`/api/categories/${id}${query}`, {
      method: 'DELETE',
    });
  },

  async resetCategoriesToDefault(): Promise<{ success: boolean; categories: Category[] }> {
    return request('/api/categories/reset-defaults', {
      method: 'POST',
    });
  },

  // Transactions
  async saveTransaction(transaction: Transaction): Promise<{ success: boolean; transaction: Transaction }> {
    return request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },

  async saveTransactionsBatch(transactions: Transaction[]): Promise<{ success: boolean; count: number }> {
    return request('/api/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
  },

  async deleteTransaction(id: string, deleteEntireSeries = false): Promise<{ success: boolean }> {
    const query = deleteEntireSeries ? '?series=true' : '';
    return request(`/api/transactions/${id}${query}`, {
      method: 'DELETE',
    });
  },

  // Recurring
  async saveRecurring(recurring: RecurringTransaction): Promise<{ success: boolean; recurring: RecurringTransaction }> {
    return request('/api/recurring', {
      method: 'POST',
      body: JSON.stringify(recurring),
    });
  },

  async deleteRecurring(id: string): Promise<{ success: boolean }> {
    return request(`/api/recurring/${id}`, {
      method: 'DELETE',
    });
  },

  // Invoices
  async payInvoice(record: {
    cardId: string;
    invoiceMonth: string;
    paidAt: string;
    paidFromAccountId: string;
    amount: number;
  }): Promise<{ success: boolean }> {
    return request('/api/invoices/pay', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  // Backup / Clear
  async importBackup(data: any, mode: 'replace' | 'merge' = 'replace'): Promise<{ success: boolean; data: BootstrapResponse }> {
    return request('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify({ data, mode }),
    });
  },

  async clearDatabase(): Promise<{ success: boolean; data: BootstrapResponse }> {
    return request('/api/backup/clear', {
      method: 'POST',
    });
  },
};
