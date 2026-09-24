import { Account, Category, CreditCard, RecurringTransaction, Transaction } from '../types/finance';
import { User, AuditLog, RoleDefinition, PermissionGroup } from '../types/user';

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

export const TOKEN_KEY = 'finanflow_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string, rememberMe = true): void {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  });

  if (res.status === 401 && !url.includes('/api/auth/login')) {
    clearAuthToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

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

  async deleteTransactionsBatch(ids: string[]): Promise<{ success: boolean; count: number }> {
    return request('/api/transactions/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
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

  // Users & Permissions (RBAC) CRUD
  async getUsers(): Promise<{
    success: boolean;
    users: User[];
    roles: Record<string, RoleDefinition>;
    permissionGroups: PermissionGroup[];
  }> {
    return request('/api/users');
  },

  async getUser(id: string): Promise<{ success: boolean; user: User }> {
    return request(`/api/users/${id}`);
  },

  async saveUser(user: Partial<User>): Promise<{ success: boolean; user: User }> {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateUserStatus(id: string, status: 'active' | 'inactive' | 'pending'): Promise<{
    success: boolean;
    id: string;
    status: string;
  }> {
    return request(`/api/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async updateUserPassword(id: string, password: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return request(`/api/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  async getAuditLogs(): Promise<{ success: boolean; logs: AuditLog[] }> {
    return request('/api/audit-logs');
  },

  async inviteUser(email: string, role: string, department?: string): Promise<{
    success: boolean;
    message: string;
    inviteLink: string;
  }> {
    return request('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role, department }),
    });
  },

  // Auth Operations
  async login(credentials: { email: string; password: string; rememberMe?: boolean }): Promise<{
    success: boolean;
    token: string;
    user: User;
  }> {
    const data = await request<{ success: boolean; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.token) {
      setAuthToken(data.token, credentials.rememberMe ?? true);
    }
    return data;
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/me');
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const data = await request<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST',
      });
      clearAuthToken();
      return data;
    } catch {
      clearAuthToken();
      return { success: true, message: 'Desconectado localmente' };
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
