import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { Account, Category, CreditCard, RecurringTransaction, Transaction } from '../src/types/finance';
import { INITIAL_CATEGORIES } from '../src/data/initialData';
import { User, AuditLog, ALL_PERMISSION_IDS, ROLE_DEFINITIONS } from '../src/types/user';
import { logger } from './logger';
import { RLSContext, RLSSecurityError, canMutateRow, canReadRow } from './rls';

export interface PaidInvoiceRecord {
  cardId: string;
  invoiceMonth: string;
  paidAt: string;
  paidFromAccountId: string;
  amount: number;
  userId?: string;
}

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finanflow.sqlite');
export const db = new Database(dbPath);

// Performance & integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Security & Password hashing utilities (node:crypto)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      logger.warn('Password verification failed: malformed stored hash format');
      return false;
    }
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    logger.error('Cryptographic failure during password verification', err);
    return false;
  }
}

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
      user_id TEXT DEFAULT 'usr_admin_01',
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
      user_id TEXT DEFAULT 'usr_admin_01',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      color TEXT NOT NULL,
      budget_monthly REAL,
      user_id TEXT DEFAULT 'usr_admin_01',
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
      user_id TEXT DEFAULT 'usr_admin_01',
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
      user_id TEXT DEFAULT 'usr_admin_01',
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
      user_id TEXT DEFAULT 'usr_admin_01',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(card_id, invoice_month)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL,
      custom_role_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      department TEXT NOT NULL,
      phone TEXT,
      avatar_color TEXT NOT NULL DEFAULT '#10b981',
      two_factor_enabled INTEGER NOT NULL DEFAULT 0,
      permissions TEXT NOT NULL DEFAULT '[]',
      last_login TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
  `);

  // Helper for safe column migrations
  function ensureColumn(table: string, col: string, def: string) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      if (!cols.some(c => c.name === col)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
        logger.info(`Schema migration applied: added ${col} to ${table}`);
      }
    } catch (err) {
      logger.error(`Migration error adding ${col} to ${table}:`, err);
    }
  }

  // Ensure password_hash column exists
  ensureColumn('users', 'password_hash', 'TEXT');

  // Ensure RLS ownership columns (user_id) exist on all core financial tables
  ensureColumn('accounts', 'user_id', "TEXT DEFAULT 'usr_admin_01'");
  ensureColumn('credit_cards', 'user_id', "TEXT DEFAULT 'usr_admin_01'");
  ensureColumn('categories', 'user_id', "TEXT DEFAULT 'usr_admin_01'");
  ensureColumn('transactions', 'user_id', "TEXT DEFAULT 'usr_admin_01'");
  ensureColumn('recurring_transactions', 'user_id', "TEXT DEFAULT 'usr_admin_01'");
  ensureColumn('paid_invoices', 'user_id', "TEXT DEFAULT 'usr_admin_01'");

  // RLS Indexes for high performance isolation queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_paid_invoices_user_id ON paid_invoices(user_id);
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

  // Seed default users if empty
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCountRow.count === 0) {
    const defaultUsers: User[] = [
      {
        id: 'usr_admin_01',
        name: 'David Maiky',
        email: 'david@empresa.com',
        role: 'admin',
        status: 'active',
        department: 'Diretoria & Tecnologia',
        phone: '(11) 98765-4321',
        avatarColor: '#8b5cf6',
        twoFactorEnabled: true,
        permissions: ALL_PERMISSION_IDS,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        notes: 'Administrador geral do sistema com privilégios totais de gestão e segurança.',
      },
      {
        id: 'usr_mgr_02',
        name: 'Mariana Souza',
        email: 'mariana.souza@empresa.com',
        role: 'manager',
        status: 'active',
        department: 'Controladoria & Finanças',
        phone: '(11) 97123-4567',
        avatarColor: '#3b82f6',
        twoFactorEnabled: true,
        permissions: ROLE_DEFINITIONS.manager.defaultPermissions,
        lastLogin: new Date(Date.now() - 3600000 * 4).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        notes: 'Responsável pelo fechamento mensal, faturas de cartões e orçamentos.',
      },
      {
        id: 'usr_ana_03',
        name: 'Carlos Eduardo',
        email: 'carlos.eduardo@empresa.com',
        role: 'analyst',
        status: 'active',
        department: 'Contabilidade & Operações',
        phone: '(21) 99888-1234',
        avatarColor: '#10b981',
        twoFactorEnabled: false,
        permissions: ROLE_DEFINITIONS.analyst.defaultPermissions,
        lastLogin: new Date(Date.now() - 3600000 * 18).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        notes: 'Analista de conciliação bancária e lançamento de despesas.',
      },
      {
        id: 'usr_view_04',
        name: 'Beatriz Lima',
        email: 'beatriz.lima@empresa.com',
        role: 'viewer',
        status: 'active',
        department: 'Compliance & Auditoria',
        phone: '(31) 98456-7890',
        avatarColor: '#64748b',
        twoFactorEnabled: true,
        permissions: ROLE_DEFINITIONS.viewer.defaultPermissions,
        lastLogin: new Date(Date.now() - 3600000 * 48).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
        notes: 'Auditora fiscal com acesso exclusivo de leitura de demonstrativos e relatórios.',
      },
      {
        id: 'usr_pend_05',
        name: 'Lucas Andrade',
        email: 'lucas.andrade@empresa.com',
        role: 'analyst',
        status: 'pending',
        department: 'Financeiro',
        phone: '(41) 99123-9988',
        avatarColor: '#f59e0b',
        twoFactorEnabled: false,
        permissions: ROLE_DEFINITIONS.analyst.defaultPermissions,
        lastLogin: undefined,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        notes: 'Convite enviado aguardando primeiro login e ativação de credencial.',
      },
    ];

    const defaultPasswords: Record<string, string> = {
      'david@empresa.com': 'admin123',
      'mariana.souza@empresa.com': 'gestor123',
      'carlos.eduardo@empresa.com': 'analista123',
      'beatriz.lima@empresa.com': 'auditor123',
      'lucas.andrade@empresa.com': 'analista123',
    };

    const insertUserStmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, custom_role_name, status, department, phone, avatar_color, two_factor_enabled, permissions, last_login, notes, created_at)
      VALUES (@id, @name, @email, @passwordHash, @role, @customRoleName, @status, @department, @phone, @avatarColor, @twoFactorEnabled, @permissions, @lastLogin, @notes, @createdAt)
    `);

    for (const u of defaultUsers) {
      const pass = defaultPasswords[u.email] || 'senha123';
      insertUserStmt.run({
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: hashPassword(pass),
        role: u.role,
        customRoleName: u.customRoleName || null,
        status: u.status,
        department: u.department,
        phone: u.phone || null,
        avatarColor: u.avatarColor,
        twoFactorEnabled: u.twoFactorEnabled ? 1 : 0,
        permissions: JSON.stringify(u.permissions),
        lastLogin: u.lastLogin || null,
        notes: u.notes || null,
        createdAt: u.createdAt,
      });
    }

    const insertAuditStmt = db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, target, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAuditStmt.run(
      'log_init_01',
      'Sistema FinanFlow',
      'create',
      'Permissões & Usuários',
      'Inicialização do módulo de controle de acesso (RBAC) com usuários padrão',
      '127.0.0.1',
      new Date().toISOString()
    );
  }

  // Ensure any existing users without a password receive one
  try {
    const defaultPasswords: Record<string, string> = {
      'david@empresa.com': 'admin123',
      'mariana.souza@empresa.com': 'gestor123',
      'carlos.eduardo@empresa.com': 'analista123',
      'beatriz.lima@empresa.com': 'auditor123',
      'lucas.andrade@empresa.com': 'analista123',
    };
    const usersWithoutPassword = db.prepare(`SELECT id, email FROM users WHERE password_hash IS NULL OR password_hash = ''`).all() as { id: string; email: string }[];
    const updatePassStmt = db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`);
    for (const u of usersWithoutPassword) {
      const pass = defaultPasswords[u.email] || 'senha123';
      updatePassStmt.run(hashPassword(pass), u.id);
    }
  } catch (err) {
    console.error('Warning initializing existing user passwords:', err);
  }
}

// Ensure tables exist on load
initDatabase();

// --- Accounts Operations ---
export function getAllAccounts(ctx?: RLSContext): Account[] {
  let query = 'SELECT id, name, type, bank_name as bankName, balance, color, user_id as userId FROM accounts';
  const params: any[] = [];
  if (ctx && ctx.role !== 'admin' && ctx.role !== 'manager') {
    query += ' WHERE user_id = ? OR user_id = "usr_admin_01" OR user_id IS NULL';
    params.push(ctx.userId);
  }
  query += ' ORDER BY rowid ASC';
  const rows = (params.length ? db.prepare(query).all(...params) : db.prepare(query).all()) as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    bankName: r.bankName,
    balance: Number(r.balance),
    color: r.color,
    userId: r.userId || undefined,
  }));
}

export function saveAccount(account: Account, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM accounts WHERE id = ?').get(account.id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para alterar contas de outro usuário.');
    }
  }

  const assignedUserId = account.userId || ctx?.userId || 'usr_admin_01';
  const stmt = db.prepare(`
    INSERT INTO accounts (id, name, type, bank_name, balance, color, user_id)
    VALUES (@id, @name, @type, @bankName, @balance, @color, @userId)
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
    userId: assignedUserId,
  });
}

export function deleteAccountById(id: string, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM accounts WHERE id = ?').get(id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para excluir esta conta.');
    }
  }
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

// --- Cards Operations ---
export function getAllCards(ctx?: RLSContext): CreditCard[] {
  let query = `
    SELECT id, name, bank, last4, brand, color, gradient,
           limit_total as limitTotal, closing_day as closingDay, due_day as dueDay,
           user_id as userId
    FROM credit_cards
  `;
  const params: any[] = [];
  if (ctx && ctx.role !== 'admin' && ctx.role !== 'manager') {
    query += ' WHERE user_id = ? OR user_id = "usr_admin_01" OR user_id IS NULL';
    params.push(ctx.userId);
  }
  query += ' ORDER BY rowid ASC';
  const rows = (params.length ? db.prepare(query).all(...params) : db.prepare(query).all()) as any[];

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
    userId: r.userId || undefined,
  }));
}

export function saveCard(card: CreditCard, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM credit_cards WHERE id = ?').get(card.id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para alterar este cartão de crédito.');
    }
  }

  const assignedUserId = card.userId || ctx?.userId || 'usr_admin_01';
  const stmt = db.prepare(`
    INSERT INTO credit_cards (id, name, bank, last4, brand, color, gradient, limit_total, closing_day, due_day, user_id)
    VALUES (@id, @name, @bank, @last4, @brand, @color, @gradient, @limitTotal, @closingDay, @dueDay, @userId)
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
    userId: assignedUserId,
  });
}

export function deleteCardById(id: string, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM credit_cards WHERE id = ?').get(id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para excluir este cartão.');
    }
  }
  db.prepare('DELETE FROM credit_cards WHERE id = ?').run(id);
}

// --- Categories Operations ---
export function getAllCategories(ctx?: RLSContext): Category[] {
  let query = `
    SELECT id, name, type, icon_name as iconName, color, budget_monthly as budgetMonthly,
           user_id as userId
    FROM categories
  `;
  const params: any[] = [];
  if (ctx && ctx.role !== 'admin' && ctx.role !== 'manager') {
    query += ' WHERE user_id = ? OR user_id = "usr_admin_01" OR user_id IS NULL';
    params.push(ctx.userId);
  }
  query += ' ORDER BY rowid ASC';
  const rows = (params.length ? db.prepare(query).all(...params) : db.prepare(query).all()) as any[];

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    iconName: r.iconName,
    color: r.color,
    budgetMonthly: r.budgetMonthly !== null ? Number(r.budgetMonthly) : undefined,
    userId: r.userId || undefined,
  }));
}

export function saveCategory(category: Category, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM categories WHERE id = ?').get(category.id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para alterar esta categoria.');
    }
  }

  const assignedUserId = category.userId || ctx?.userId || 'usr_admin_01';
  const stmt = db.prepare(`
    INSERT INTO categories (id, name, type, icon_name, color, budget_monthly, user_id)
    VALUES (@id, @name, @type, @iconName, @color, @budgetMonthly, @userId)
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
    userId: assignedUserId,
  });
}

export function deleteCategoryById(id: string, reassignToCategoryId?: string, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM categories WHERE id = ?').get(id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para excluir esta categoria.');
    }
  }

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
export function getAllTransactions(ctx?: RLSContext): Transaction[] {
  let query = `
    SELECT id, description, amount, type, date, category_id as categoryId,
           payment_method as paymentMethod, account_id as accountId,
           credit_card_id as creditCardId, installments, invoice_month as invoiceMonth,
           status, recurring_id as recurringId, notes, created_at as createdAt,
           user_id as userId
    FROM transactions
  `;
  const params: any[] = [];
  if (ctx && ctx.role !== 'admin' && ctx.role !== 'manager') {
    query += ' WHERE user_id = ? OR user_id = "usr_admin_01" OR user_id IS NULL';
    params.push(ctx.userId);
  }
  query += ' ORDER BY date DESC, created_at DESC';
  const rows = (params.length ? db.prepare(query).all(...params) : db.prepare(query).all()) as any[];

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
    userId: r.userId || undefined,
  }));
}

export function saveTransaction(tx: Transaction, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM transactions WHERE id = ?').get(tx.id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para alterar transações de outro usuário.');
    }
  }

  const assignedUserId = tx.userId || ctx?.userId || 'usr_admin_01';
  const stmt = db.prepare(`
    INSERT INTO transactions (
      id, description, amount, type, date, category_id,
      payment_method, account_id, credit_card_id, installments,
      invoice_month, status, recurring_id, notes, created_at, user_id
    )
    VALUES (
      @id, @description, @amount, @type, @date, @categoryId,
      @paymentMethod, @accountId, @creditCardId, @installments,
      @invoiceMonth, @status, @recurringId, @notes, @createdAt, @userId
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
    status: tx.status || 'completed',
    recurringId: tx.recurringId ?? null,
    notes: tx.notes ?? null,
    createdAt: tx.createdAt || new Date().toISOString(),
    userId: assignedUserId,
  });
}

export function saveTransactionsBatch(txList: Transaction[], ctx?: RLSContext): void {
  const insertMany = db.transaction((list: Transaction[]) => {
    for (const tx of list) {
      saveTransaction(tx, ctx);
    }
  });
  insertMany(txList);
}

export function deleteTransactionById(id: string, deleteEntireSeries = false, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM transactions WHERE id = ?').get(id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para excluir transações de outro usuário.');
    }
  }

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
      } catch (err) {
        logger.warn('Failed parsing installment payload during series deletion', { id, err });
      }
    }
  }
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

export function deleteTransactionsBatch(ids: string[], ctx?: RLSContext): void {
  if (!ids || ids.length === 0) return;
  const deleteMany = db.transaction((list: string[]) => {
    for (const id of list) {
      deleteTransactionById(id, false, ctx);
    }
  });
  deleteMany(ids);
}

// --- Recurring Transactions Operations ---
export function getAllRecurring(ctx?: RLSContext): RecurringTransaction[] {
  let query = `
    SELECT id, description, amount, type, category_id as categoryId,
           payment_method as paymentMethod, account_id as accountId,
           credit_card_id as creditCardId, day_of_month as dayOfMonth,
           auto_process as autoProcess, active, notes,
           created_at as createdAt, generated_months as generatedMonths,
           user_id as userId
    FROM recurring_transactions
  `;
  const params: any[] = [];
  if (ctx && ctx.role !== 'admin' && ctx.role !== 'manager') {
    query += ' WHERE user_id = ? OR user_id = "usr_admin_01" OR user_id IS NULL';
    params.push(ctx.userId);
  }
  query += ' ORDER BY day_of_month ASC';
  const rows = (params.length ? db.prepare(query).all(...params) : db.prepare(query).all()) as any[];

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
    userId: r.userId || undefined,
  }));
}

export function saveRecurring(item: RecurringTransaction, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM recurring_transactions WHERE id = ?').get(item.id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para alterar recorrências de outro usuário.');
    }
  }

  const assignedUserId = item.userId || ctx?.userId || 'usr_admin_01';
  const stmt = db.prepare(`
    INSERT INTO recurring_transactions (
      id, description, amount, type, category_id,
      payment_method, account_id, credit_card_id, day_of_month,
      auto_process, active, notes, created_at, generated_months, user_id
    )
    VALUES (
      @id, @description, @amount, @type, @categoryId,
      @paymentMethod, @accountId, @creditCardId, @dayOfMonth,
      @autoProcess, @active, @notes, @createdAt, @generatedMonths, @userId
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
    userId: assignedUserId,
  });
}

export function deleteRecurringById(id: string, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM recurring_transactions WHERE id = ?').get(id) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para excluir esta recorrência.');
    }
  }
  db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(id);
}

// --- Paid Invoices Operations ---
export function getAllPaidInvoices(ctx?: RLSContext): PaidInvoiceRecord[] {
  let query = `
    SELECT card_id as cardId, invoice_month as invoiceMonth,
           paid_at as paidAt, paid_from_account_id as paidFromAccountId, amount,
           user_id as userId
    FROM paid_invoices
  `;
  const params: any[] = [];
  if (ctx && ctx.role !== 'admin' && ctx.role !== 'manager') {
    query += ' WHERE user_id = ? OR user_id = "usr_admin_01" OR user_id IS NULL';
    params.push(ctx.userId);
  }
  query += ' ORDER BY paid_at DESC';
  const rows = (params.length ? db.prepare(query).all(...params) : db.prepare(query).all()) as any[];

  return rows.map(r => ({
    cardId: r.cardId,
    invoiceMonth: r.invoiceMonth,
    paidAt: r.paidAt,
    paidFromAccountId: r.paidFromAccountId,
    amount: Number(r.amount),
    userId: r.userId || undefined,
  }));
}

export function savePaidInvoice(record: PaidInvoiceRecord, ctx?: RLSContext): void {
  if (ctx) {
    if (ctx.role === 'viewer') {
      throw new RLSSecurityError('Acesso negado: Perfil visualizador (viewer) possui permissão apenas de leitura.');
    }
    const existing = db.prepare('SELECT user_id as userId FROM paid_invoices WHERE card_id = ? AND invoice_month = ?').get(record.cardId, record.invoiceMonth) as any;
    if (existing && !canMutateRow(ctx, existing.userId)) {
      throw new RLSSecurityError('Violação de RLS: você não tem permissão para alterar faturas pagas de outro usuário.');
    }
  }

  const assignedUserId = record.userId || ctx?.userId || 'usr_admin_01';
  const id = `${record.cardId}_${record.invoiceMonth}`;
  const stmt = db.prepare(`
    INSERT INTO paid_invoices (id, card_id, invoice_month, paid_at, paid_from_account_id, amount, user_id)
    VALUES (@id, @cardId, @invoiceMonth, @paidAt, @paidFromAccountId, @amount, @userId)
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
    userId: assignedUserId,
  });
}

// --- Bootstrap & Bulk Import/Export ---
export function getBootstrapData(ctx?: RLSContext) {
  return {
    accounts: getAllAccounts(ctx),
    cards: getAllCards(ctx),
    categories: getAllCategories(ctx),
    transactions: getAllTransactions(ctx),
    recurringTransactions: getAllRecurring(ctx),
    paidInvoices: getAllPaidInvoices(ctx),
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

// --- Users & Access Operations ---
export function getAllUsers(): User[] {
  const rows = db.prepare(`
    SELECT id, name, email, role, custom_role_name as customRoleName, status,
           department, phone, avatar_color as avatarColor, two_factor_enabled as twoFactorEnabled,
           permissions, last_login as lastLogin, notes, created_at as createdAt
    FROM users
    ORDER BY
      CASE role
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'analyst' THEN 3
        WHEN 'viewer' THEN 4
        ELSE 5
      END,
      name ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    customRoleName: r.customRoleName || undefined,
    status: r.status,
    department: r.department,
    phone: r.phone || undefined,
    avatarColor: r.avatarColor || '#10b981',
    twoFactorEnabled: Boolean(r.twoFactorEnabled),
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []),
    lastLogin: r.lastLogin || undefined,
    notes: r.notes || undefined,
    createdAt: r.createdAt,
  }));
}

export function getUserById(id: string): User | undefined {
  const r = db.prepare(`
    SELECT id, name, email, role, custom_role_name as customRoleName, status,
           department, phone, avatar_color as avatarColor, two_factor_enabled as twoFactorEnabled,
           permissions, last_login as lastLogin, notes, created_at as createdAt
    FROM users WHERE id = ?
  `).get(id) as any;

  if (!r) return undefined;

  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    customRoleName: r.customRoleName || undefined,
    status: r.status,
    department: r.department,
    phone: r.phone || undefined,
    avatarColor: r.avatarColor || '#10b981',
    twoFactorEnabled: Boolean(r.twoFactorEnabled),
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []),
    lastLogin: r.lastLogin || undefined,
    notes: r.notes || undefined,
    createdAt: r.createdAt,
  };
}

export function getUserByEmail(email: string): (User & { passwordHash?: string }) | undefined {
  const r = db.prepare(`
    SELECT id, name, email, password_hash as passwordHash, role, custom_role_name as customRoleName, status,
           department, phone, avatar_color as avatarColor, two_factor_enabled as twoFactorEnabled,
           permissions, last_login as lastLogin, notes, created_at as createdAt
    FROM users WHERE LOWER(email) = LOWER(?)
  `).get(email) as any;

  if (!r) return undefined;

  return {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.passwordHash || undefined,
    role: r.role,
    customRoleName: r.customRoleName || undefined,
    status: r.status,
    department: r.department,
    phone: r.phone || undefined,
    avatarColor: r.avatarColor || '#10b981',
    twoFactorEnabled: Boolean(r.twoFactorEnabled),
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []),
    lastLogin: r.lastLogin || undefined,
    notes: r.notes || undefined,
    createdAt: r.createdAt,
  };
}

export function saveUser(user: User, rawPassword?: string): void {
  const passwordHash = rawPassword ? hashPassword(rawPassword) : undefined;

  const stmt = db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, custom_role_name, status, department, phone,
      avatar_color, two_factor_enabled, permissions, last_login, notes, created_at
    )
    VALUES (
      @id, @name, @email, @passwordHash, @role, @customRoleName, @status, @department, @phone,
      @avatarColor, @twoFactorEnabled, @permissions, @lastLogin, @notes, @createdAt
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      password_hash = COALESCE(excluded.password_hash, users.password_hash),
      role = excluded.role,
      custom_role_name = excluded.custom_role_name,
      status = excluded.status,
      department = excluded.department,
      phone = excluded.phone,
      avatar_color = excluded.avatar_color,
      two_factor_enabled = excluded.two_factor_enabled,
      permissions = excluded.permissions,
      notes = excluded.notes
  `);

  stmt.run({
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: passwordHash || null,
    role: user.role,
    customRoleName: user.customRoleName || null,
    status: user.status,
    department: user.department,
    phone: user.phone || null,
    avatarColor: user.avatarColor || '#10b981',
    twoFactorEnabled: user.twoFactorEnabled ? 1 : 0,
    permissions: JSON.stringify(user.permissions || []),
    lastLogin: user.lastLogin || null,
    notes: user.notes || null,
    createdAt: user.createdAt || new Date().toISOString(),
  });
}

export function updateUserPassword(id: string, newPassword: string): void {
  const hash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
}

export function updateUserLastLogin(id: string): void {
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(id);
}

export function deleteUserById(id: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function updateUserStatus(id: string, status: string): void {
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  if (status !== 'active') {
    deleteUserSessions(id);
  }
}

// --- Session Operations (SQLite) ---
export function createSession(userId: string, expiresInDays = 7): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt);
  return token;
}

export function getSession(token: string): { userId: string; expiresAt: string } | null {
  const row = db.prepare(`
    SELECT user_id as userId, expires_at as expiresAt
    FROM sessions
    WHERE token = ?
  `).get(token) as { userId: string; expiresAt: string } | undefined;

  if (!row) return null;

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }

  return row;
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function deleteUserSessions(userId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function cleanupExpiredSessions(): void {
  try {
    db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  } catch (err) {
    logger.error('Error cleaning expired sessions', err);
  }
}

export function getAllAuditLogs(limit = 100): AuditLog[] {
  const rows = db.prepare(`
    SELECT id, user_id as userId, user_name as userName, action, target, details, ip_address as ipAddress, timestamp
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map(r => ({
    id: r.id,
    userId: r.userId || undefined,
    userName: r.userName,
    action: r.action,
    target: r.target,
    details: r.details,
    ipAddress: r.ipAddress || undefined,
    timestamp: r.timestamp,
  }));
}

export function addAuditLog(entry: {
  userId?: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'role_change' | 'login' | 'export';
  target: string;
  details: string;
  ipAddress?: string;
}): AuditLog {
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, target, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.userId || null,
    entry.userName,
    entry.action,
    entry.target,
    entry.details,
    entry.ipAddress || '127.0.0.1',
    timestamp
  );

  return {
    id,
    ...entry,
    timestamp,
  };
}

export function closeDatabase() {
  try {
    if (db && db.open) {
      db.close();
      logger.info('SQLite database closed successfully.');
    }
  } catch (error) {
    logger.error('Error closing SQLite database', error);
  }
}

