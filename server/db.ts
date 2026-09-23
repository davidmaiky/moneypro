import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Account, Category, CreditCard, RecurringTransaction, Transaction } from '../src/types/finance';
import { INITIAL_CATEGORIES } from '../src/data/initialData';

export interface PaidInvoiceRecord {
  cardId: string;
  invoiceMonth: string;
  paidAt: string;
  paidFromAccountId: string;
  amount: number;
}

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finanflow.sqlite');
export const db = new Database(dbPath);

// Performance & integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bank TEXT NOT NULL,
      last4 TEXT NOT NULL,
      brand TEXT NOT NULL,
      color TEXT NOT NULL,
      gradient TEXT NOT NULL,
      limit_total REAL NOT NULL DEFAULT 0,
      closing_day INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      color TEXT NOT NULL,
      budget_monthly REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      account_id TEXT,
      credit_card_id TEXT,
      installments TEXT,
      invoice_month TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      recurring_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_card ON transactions(credit_card_id, invoice_month);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      account_id TEXT,
      credit_card_id TEXT,
      day_of_month INTEGER NOT NULL,
      auto_process INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      generated_months TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS paid_invoices (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      invoice_month TEXT NOT NULL,
      paid_at TEXT NOT NULL,
      paid_from_account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(card_id, invoice_month)
    );
  `);

  // Seed default categories if empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (countRow.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, type, icon_name, color, budget_monthly)
      VALUES (@id, @name, @type, @iconName, @color, @budgetMonthly)
    `);
    const insertMany = db.transaction((cats: Category[]) => {
      for (const cat of cats) {
        insertCat.run({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          iconName: cat.iconName,
          color: cat.color,
          budgetMonthly: cat.budgetMonthly ?? null,
        });
      }
    });
    insertMany(INITIAL_CATEGORIES);
  }
}

// Ensure tables exist on load
initDatabase();

// --- Accounts Operations ---
export function getAllAccounts(): Account[] {
  const rows = db.prepare('SELECT id, name, type, bank_name as bankName, balance, color FROM accounts ORDER BY rowid ASC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    bankName: r.bankName,
    balance: Number(r.balance),
    color: r.color,
  }));
}

export function saveAccount(account: Account): void {
  const stmt = db.prepare(`
    INSERT INTO accounts (id, name, type, bank_name, balance, color)
    VALUES (@id, @name, @type, @bankName, @balance, @color)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      bank_name = excluded.bank_name,
      balance = excluded.balance,
      color = excluded.color
  `);
  stmt.run({
    id: account.id,
    name: account.name,
    type: account.type,
    bankName: account.bankName,
    balance: account.balance,
    color: account.color,
  });
}

export function deleteAccountById(id: string): void {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

// --- Cards Operations ---
export function getAllCards(): CreditCard[] {
  const rows = db.prepare(`
    SELECT id, name, bank, last4, brand, color, gradient,
           limit_total as limitTotal, closing_day as closingDay, due_day as dueDay
    FROM credit_cards ORDER BY rowid ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    bank: r.bank,
    last4: r.last4,
    brand: r.brand,
    color: r.color,
    gradient: r.gradient,
    limitTotal: Number(r.limitTotal),
    closingDay: Number(r.closingDay),
    dueDay: Number(r.dueDay),
  }));
}

export function saveCard(card: CreditCard): void {
  const stmt = db.prepare(`
    INSERT INTO credit_cards (id, name, bank, last4, brand, color, gradient, limit_total, closing_day, due_day)
    VALUES (@id, @name, @bank, @last4, @brand, @color, @gradient, @limitTotal, @closingDay, @dueDay)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      bank = excluded.bank,
      last4 = excluded.last4,
      brand = excluded.brand,
      color = excluded.color,
      gradient = excluded.gradient,
      limit_total = excluded.limit_total,
      closing_day = excluded.closing_day,
      due_day = excluded.due_day
  `);
  stmt.run({
    id: card.id,
    name: card.name,
    bank: card.bank,
    last4: card.last4,
    brand: card.brand,
    color: card.color,
    gradient: card.gradient,
    limitTotal: card.limitTotal,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
  });
}

export function deleteCardById(id: string): void {
  db.prepare('DELETE FROM credit_cards WHERE id = ?').run(id);
}

// --- Categories Operations ---
export function getAllCategories(): Category[] {
  const rows = db.prepare(`
    SELECT id, name, type, icon_name as iconName, color, budget_monthly as budgetMonthly
    FROM categories ORDER BY rowid ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    iconName: r.iconName,
    color: r.color,
    budgetMonthly: r.budgetMonthly !== null ? Number(r.budgetMonthly) : undefined,
  }));
}

export function saveCategory(category: Category): void {
  const stmt = db.prepare(`
    INSERT INTO categories (id, name, type, icon_name, color, budget_monthly)
    VALUES (@id, @name, @type, @iconName, @color, @budgetMonthly)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      icon_name = excluded.icon_name,
      color = excluded.color,
      budget_monthly = excluded.budget_monthly
  `);
  stmt.run({
    id: category.id,
    name: category.name,
    type: category.type,
    iconName: category.iconName,
    color: category.color,
    budgetMonthly: category.budgetMonthly ?? null,
  });
}

export function deleteCategoryById(id: string, reassignToCategoryId?: string): void {
  const tx = db.transaction(() => {
    if (reassignToCategoryId) {
      db.prepare('UPDATE transactions SET category_id = ? WHERE category_id = ?').run(reassignToCategoryId, id);
      db.prepare('UPDATE recurring_transactions SET category_id = ? WHERE category_id = ?').run(reassignToCategoryId, id);
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  });
  tx();
}

// --- Transactions Operations ---
export function getAllTransactions(): Transaction[] {
  const rows = db.prepare(`
    SELECT id, description, amount, type, date, category_id as categoryId,
           payment_method as paymentMethod, account_id as accountId,
           credit_card_id as creditCardId, installments, invoice_month as invoiceMonth,
           status, recurring_id as recurringId, notes, created_at as createdAt
    FROM transactions
    ORDER BY date DESC, created_at DESC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    type: r.type,
    date: r.date,
    categoryId: r.categoryId,
    paymentMethod: r.paymentMethod,
    accountId: r.accountId || undefined,
    creditCardId: r.creditCardId || undefined,
    installments: r.installments ? JSON.parse(r.installments) : undefined,
    invoiceMonth: r.invoiceMonth || undefined,
    status: r.status,
    recurringId: r.recurringId || undefined,
    notes: r.notes || undefined,
    createdAt: r.createdAt,
  }));
}

export function saveTransaction(tx: Transaction): void {
  const stmt = db.prepare(`
    INSERT INTO transactions (
      id, description, amount, type, date, category_id,
      payment_method, account_id, credit_card_id, installments,
      invoice_month, status, recurring_id, notes, created_at
    )
    VALUES (
      @id, @description, @amount, @type, @date, @categoryId,
      @paymentMethod, @accountId, @creditCardId, @installments,
      @invoiceMonth, @status, @recurringId, @notes, @createdAt
    )
    ON CONFLICT(id) DO UPDATE SET
      description = excluded.description,
      amount = excluded.amount,
      type = excluded.type,
      date = excluded.date,
      category_id = excluded.category_id,
      payment_method = excluded.payment_method,
      account_id = excluded.account_id,
      credit_card_id = excluded.credit_card_id,
      installments = excluded.installments,
      invoice_month = excluded.invoice_month,
      status = excluded.status,
      recurring_id = excluded.recurring_id,
      notes = excluded.notes
  `);

  stmt.run({
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    date: tx.date,
    categoryId: tx.categoryId,
    paymentMethod: tx.paymentMethod,
    accountId: tx.accountId ?? null,
    creditCardId: tx.creditCardId ?? null,
    installments: tx.installments ? JSON.stringify(tx.installments) : null,
    invoiceMonth: tx.invoiceMonth ?? null,
    status: tx.status,
    recurringId: tx.recurringId ?? null,
    notes: tx.notes ?? null,
    createdAt: tx.createdAt || new Date().toISOString(),
  });
}

export function saveTransactionsBatch(txList: Transaction[]): void {
  const insertMany = db.transaction((list: Transaction[]) => {
    for (const tx of list) {
      saveTransaction(tx);
    }
  });
  insertMany(txList);
}

export function deleteTransactionById(id: string, deleteEntireSeries = false): void {
  if (deleteEntireSeries) {
    const tx = db.prepare('SELECT installments FROM transactions WHERE id = ?').get(id) as any;
    if (tx && tx.installments) {
      try {
        const info = JSON.parse(tx.installments);
        if (info.parentTransactionId) {
          db.prepare(`
            DELETE FROM transactions
            WHERE json_extract(installments, '$.parentTransactionId') = ?
               OR id = ?
          `).run(info.parentTransactionId, info.parentTransactionId);
          return;
        }
      } catch {
        // Fallback to single delete
      }
    }
  }
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

// --- Recurring Transactions Operations ---
export function getAllRecurring(): RecurringTransaction[] {
  const rows = db.prepare(`
    SELECT id, description, amount, type, category_id as categoryId,
           payment_method as paymentMethod, account_id as accountId,
           credit_card_id as creditCardId, day_of_month as dayOfMonth,
           auto_process as autoProcess, active, notes,
           created_at as createdAt, generated_months as generatedMonths
    FROM recurring_transactions
    ORDER BY day_of_month ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    type: r.type,
    categoryId: r.categoryId,
    paymentMethod: r.paymentMethod,
    accountId: r.accountId || undefined,
    creditCardId: r.creditCardId || undefined,
    dayOfMonth: Number(r.dayOfMonth),
    autoProcess: Boolean(r.autoProcess),
    active: Boolean(r.active),
    notes: r.notes || undefined,
    createdAt: r.createdAt,
    generatedMonths: r.generatedMonths ? JSON.parse(r.generatedMonths) : [],
  }));
}

export function saveRecurring(item: RecurringTransaction): void {
  const stmt = db.prepare(`
    INSERT INTO recurring_transactions (
      id, description, amount, type, category_id,
      payment_method, account_id, credit_card_id, day_of_month,
      auto_process, active, notes, created_at, generated_months
    )
    VALUES (
      @id, @description, @amount, @type, @categoryId,
      @paymentMethod, @accountId, @creditCardId, @dayOfMonth,
      @autoProcess, @active, @notes, @createdAt, @generatedMonths
    )
    ON CONFLICT(id) DO UPDATE SET
      description = excluded.description,
      amount = excluded.amount,
      type = excluded.type,
      category_id = excluded.category_id,
      payment_method = excluded.payment_method,
      account_id = excluded.account_id,
      credit_card_id = excluded.credit_card_id,
      day_of_month = excluded.day_of_month,
      auto_process = excluded.auto_process,
      active = excluded.active,
      notes = excluded.notes,
      generated_months = excluded.generated_months
  `);

  stmt.run({
    id: item.id,
    description: item.description,
    amount: item.amount,
    type: item.type,
    categoryId: item.categoryId,
    paymentMethod: item.paymentMethod,
    accountId: item.accountId ?? null,
    creditCardId: item.creditCardId ?? null,
    dayOfMonth: item.dayOfMonth,
    autoProcess: item.autoProcess ? 1 : 0,
    active: item.active ? 1 : 0,
    notes: item.notes ?? null,
    createdAt: item.createdAt || new Date().toISOString(),
    generatedMonths: JSON.stringify(item.generatedMonths || []),
  });
}

export function deleteRecurringById(id: string): void {
  db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(id);
}

// --- Paid Invoices Operations ---
export function getAllPaidInvoices(): PaidInvoiceRecord[] {
  const rows = db.prepare(`
    SELECT card_id as cardId, invoice_month as invoiceMonth,
           paid_at as paidAt, paid_from_account_id as paidFromAccountId, amount
    FROM paid_invoices
    ORDER BY paid_at DESC
  `).all() as any[];

  return rows.map(r => ({
    cardId: r.cardId,
    invoiceMonth: r.invoiceMonth,
    paidAt: r.paidAt,
    paidFromAccountId: r.paidFromAccountId,
    amount: Number(r.amount),
  }));
}

export function savePaidInvoice(record: PaidInvoiceRecord): void {
  const id = `${record.cardId}_${record.invoiceMonth}`;
  const stmt = db.prepare(`
    INSERT INTO paid_invoices (id, card_id, invoice_month, paid_at, paid_from_account_id, amount)
    VALUES (@id, @cardId, @invoiceMonth, @paidAt, @paidFromAccountId, @amount)
    ON CONFLICT(card_id, invoice_month) DO UPDATE SET
      paid_at = excluded.paid_at,
      paid_from_account_id = excluded.paid_from_account_id,
      amount = excluded.amount
  `);
  stmt.run({
    id,
    cardId: record.cardId,
    invoiceMonth: record.invoiceMonth,
    paidAt: record.paidAt,
    paidFromAccountId: record.paidFromAccountId,
    amount: record.amount,
  });
}

// --- Bootstrap & Bulk Import/Export ---
export function getBootstrapData() {
  return {
    accounts: getAllAccounts(),
    cards: getAllCards(),
    categories: getAllCategories(),
    transactions: getAllTransactions(),
    recurringTransactions: getAllRecurring(),
    paidInvoices: getAllPaidInvoices(),
  };
}

export function clearDatabase() {
  const clearTx = db.transaction(() => {
    db.prepare('DELETE FROM paid_invoices').run();
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM recurring_transactions').run();
    db.prepare('DELETE FROM accounts').run();
    db.prepare('DELETE FROM credit_cards').run();
    db.prepare('DELETE FROM categories').run();
  });
  clearTx();
}

export function importFullBackup(data: {
  accounts?: Account[];
  cards?: CreditCard[];
  categories?: Category[];
  transactions?: Transaction[];
  recurring?: RecurringTransaction[];
  paidInvoices?: PaidInvoiceRecord[];
}, mode: 'replace' | 'merge' = 'replace') {
  const importTx = db.transaction(() => {
    if (mode === 'replace') {
      clearDatabase();
    }

    if (data.categories && Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        saveCategory(cat);
      }
    }

    if (data.accounts && Array.isArray(data.accounts)) {
      for (const acc of data.accounts) {
        saveAccount(acc);
      }
    }

    if (data.cards && Array.isArray(data.cards)) {
      for (const card of data.cards) {
        saveCard(card);
      }
    }

    if (data.transactions && Array.isArray(data.transactions)) {
      for (const tx of data.transactions) {
        saveTransaction(tx);
      }
    }

    if (data.recurring && Array.isArray(data.recurring)) {
      for (const r of data.recurring) {
        saveRecurring(r);
      }
    }

    if (data.paidInvoices && Array.isArray(data.paidInvoices)) {
      for (const pi of data.paidInvoices) {
        savePaidInvoice(pi);
      }
    }
  });

  importTx();
  return getBootstrapData();
}
