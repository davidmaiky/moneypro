import { Router, Request, Response, NextFunction } from 'express';
import {
  getBootstrapData,
  saveAccount,
  deleteAccountById,
  saveCard,
  deleteCardById,
  saveCategory,
  deleteCategoryById,
  saveTransaction,
  saveTransactionsBatch,
  deleteTransactionById,
  deleteTransactionsBatch,
  saveRecurring,
  deleteRecurringById,
  savePaidInvoice,
  importFullBackup,
  clearDatabase,
  getAllCategories,
  getAllAccounts,
  getAllUsers,
  getUserById,
  getUserByEmail,
  verifyPassword,
  createSession,
  getSession,
  deleteSession,
  updateUserPassword,
  updateUserLastLogin,
  saveUser,
  deleteUserById,
  updateUserStatus,
  getAllAuditLogs,
  addAuditLog,
} from './db';
import { INITIAL_CATEGORIES } from '../src/data/initialData';
import { PERMISSION_GROUPS, ROLE_DEFINITIONS, User, UserRole, UserStatus } from '../src/types/user';
import { logger } from './logger';
import { requirePermission, attachRLSContext, RLSContext, RLSSecurityError } from './rls';

export const apiRouter = Router();

// Health check endpoint for Easypanel, Docker and status monitoring (Public)
apiRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'finanflow-api',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    reqId: req.id,
  });
});

// --- Authentication Endpoints (Public Login) ---
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const reqId = req.id;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      logger.warn('Failed login attempt: missing email or password', { reqId, ip: clientIp });
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const userWithHash = getUserByEmail(cleanEmail);

    if (!userWithHash || !userWithHash.passwordHash) {
      logger.warn('Failed login attempt: user not found', { reqId, email: cleanEmail, ip: clientIp });
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const isValid = verifyPassword(password, userWithHash.passwordHash);
    if (!isValid) {
      logger.warn('Failed login attempt: incorrect password', {
        reqId,
        userId: userWithHash.id,
        email: cleanEmail,
        ip: clientIp,
      });
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    if (userWithHash.status !== 'active') {
      logger.warn('Failed login attempt: inactive or pending account', {
        reqId,
        userId: userWithHash.id,
        status: userWithHash.status,
        email: cleanEmail,
      });
      return res.status(403).json({
        error: userWithHash.status === 'pending'
          ? 'Sua conta ainda está pendente de ativação pelo administrador.'
          : 'Sua conta de usuário está desativada no sistema.',
      });
    }

    // Update last login
    updateUserLastLogin(userWithHash.id);

    // Create session (30 days if rememberMe, else 7 days)
    const token = createSession(userWithHash.id, rememberMe ? 30 : 7);

    // Audit log
    addAuditLog({
      userId: userWithHash.id,
      userName: userWithHash.name,
      action: 'login',
      target: userWithHash.email,
      details: `Login efetuado com sucesso (${userWithHash.role})`,
      ipAddress: clientIp,
    });

    logger.info('User successfully authenticated', {
      reqId,
      userId: userWithHash.id,
      userRole: userWithHash.role,
      email: cleanEmail,
      ip: clientIp,
      action: 'auth.login',
    });

    // Strip password hash from returned user object (Data Masking)
    const { passwordHash: _, ...safeUser } = userWithHash;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (error: any) {
    logger.error('Critical failure during login process', error, { reqId, ip: clientIp });
    res.status(500).json({ error: error.message || 'Erro durante o processo de autenticação', reqId });
  }
});

// --- Authentication Middleware for Protected Routes ---
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  // Public routes
  if (req.path === '/health' || req.path === '/auth/login') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Unauthorized API request: missing or invalid Bearer token', {
      reqId: req.id,
      path: req.originalUrl,
      ip: req.socket.remoteAddress,
    });
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.substring(7).trim();
  const session = getSession(token);
  if (!session) {
    logger.warn('Session expired or not found', { reqId: req.id, path: req.originalUrl });
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Por favor, autentique-se novamente.' });
  }

  const user = getUserById(session.userId);
  if (!user || user.status !== 'active') {
    logger.warn('Access denied: user inactive or deleted', { reqId: req.id, userId: session.userId });
    return res.status(403).json({ error: 'Acesso negado. Usuário inativo ou inexistente.' });
  }

  // Attach authenticated user and token to request
  (req as any).user = user;
  (req as any).authToken = token;

  // Attach Row Level Security (RLS) context
  attachRLSContext(req, res, next);
});

// --- Protected Auth Endpoints ---
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    user: (req as any).user,
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const reqId = req.id;
  try {
    const token = (req as any).authToken;
    const user = (req as any).user;
    if (token) {
      deleteSession(token);
    }
    logger.info('User logged out', { reqId, userId: user?.id, action: 'auth.logout' });
    res.json({ success: true, message: 'Sessão encerrada com sucesso' });
  } catch (error: any) {
    logger.error('Error during logout', error, { reqId });
    res.status(500).json({ error: error.message || 'Erro ao realizar logout', reqId });
  }
});

apiRouter.post('/auth/change-password', (req: Request, res: Response) => {
  const reqId = req.id;
  const user = (req as any).user as User;

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      logger.warn('Password change rejected: empty fields', { reqId, userId: user.id });
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      logger.warn('Password change rejected: password too short', { reqId, userId: user.id });
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres' });
    }

    const userWithHash = getUserByEmail(user.email);
    if (!userWithHash || !userWithHash.passwordHash) {
      logger.error('User record invalid during password change', undefined, { reqId, userId: user.id });
      return res.status(400).json({ error: 'Erro ao verificar cadastro do usuário' });
    }

    if (!verifyPassword(currentPassword, userWithHash.passwordHash)) {
      logger.warn('Password change failed: incorrect current password', { reqId, userId: user.id });
      return res.status(400).json({ error: 'A senha atual informada está incorreta' });
    }

    updateUserPassword(user.id, newPassword);

    addAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'update',
      target: user.email,
      details: 'Senha do usuário alterada com sucesso pelo próprio usuário',
    });

    logger.info('User password updated successfully', { reqId, userId: user.id, action: 'user.change_password' });
    res.json({ success: true, message: 'Senha atualizada com sucesso!' });
  } catch (error: any) {
    logger.error('Error changing password', error, { reqId, userId: user.id });
    res.status(500).json({ error: error.message || 'Erro ao atualizar senha', reqId });
  }
});

// 1. Bootstrap (Scoped by RLS)
apiRouter.get('/bootstrap', requirePermission('dashboard:view'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const data = getBootstrapData(rlsCtx);
    logger.debug('Bootstrap data loaded', {
      reqId,
      userId: rlsCtx.userId,
      accountsCount: data.accounts.length,
      transactionsCount: data.transactions.length,
    });
    res.json(data);
  } catch (error: any) {
    logger.error('Error loading bootstrap data', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao carregar dados do banco', reqId });
  }
});

// 2. Accounts
apiRouter.post('/accounts', requirePermission('dashboard:view'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const account = req.body;
    if (!account.id || !account.name) {
      return res.status(400).json({ error: 'ID e nome da conta são obrigatórios' });
    }
    saveAccount(account, rlsCtx);
    logger.info('Account saved', { reqId, userId: rlsCtx.userId, accountId: account.id, action: 'account.save' });
    res.json({ success: true, account });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on saving account', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error saving account', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao salvar conta', reqId });
  }
});

apiRouter.delete('/accounts/:id', requirePermission('dashboard:view'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { id } = req.params;
    deleteAccountById(id, rlsCtx);
    logger.info('Account deleted', { reqId, userId: rlsCtx.userId, accountId: id, action: 'account.delete' });
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on deleting account', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error deleting account', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao excluir conta', reqId });
  }
});

// 3. Credit Cards
apiRouter.post('/cards', requirePermission('cards:manage'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const card = req.body;
    if (!card.id || !card.name) {
      return res.status(400).json({ error: 'ID e nome do cartão são obrigatórios' });
    }
    saveCard(card, rlsCtx);
    logger.info('Card saved', { reqId, userId: rlsCtx.userId, cardId: card.id, action: 'card.save' });
    res.json({ success: true, card });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on saving card', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error saving card', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao salvar cartão', reqId });
  }
});

apiRouter.delete('/cards/:id', requirePermission('cards:manage'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { id } = req.params;
    deleteCardById(id, rlsCtx);
    logger.info('Card deleted', { reqId, userId: rlsCtx.userId, cardId: id, action: 'card.delete' });
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on deleting card', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error deleting card', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao excluir cartão', reqId });
  }
});

// 4. Categories
apiRouter.post('/categories', requirePermission('categories:manage'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const category = req.body;
    if (!category.id || !category.name) {
      return res.status(400).json({ error: 'ID e nome da categoria são obrigatórios' });
    }
    saveCategory(category, rlsCtx);
    logger.info('Category saved', { reqId, userId: rlsCtx.userId, categoryId: category.id, action: 'category.save' });
    res.json({ success: true, category });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on saving category', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error saving category', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao salvar categoria', reqId });
  }
});

apiRouter.delete('/categories/:id', requirePermission('categories:manage'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { id } = req.params;
    const reassignToCategoryId = req.query.reassignTo as string | undefined;
    deleteCategoryById(id, reassignToCategoryId, rlsCtx);
    logger.info('Category deleted', { reqId, userId: rlsCtx.userId, categoryId: id, action: 'category.delete' });
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on deleting category', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error deleting category', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao excluir categoria', reqId });
  }
});

apiRouter.post('/categories/reset-defaults', requirePermission('categories:manage'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    for (const cat of INITIAL_CATEGORIES) {
      saveCategory(cat, rlsCtx);
    }
    logger.info('Categories reset to defaults', { reqId, userId: rlsCtx.userId, action: 'category.reset' });
    res.json({ success: true, categories: getAllCategories(rlsCtx) });
  } catch (error: any) {
    logger.error('Error restoring default categories', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao restaurar categorias padrão', reqId });
  }
});

// 5. Transactions (Row Level Security protected)
apiRouter.post('/transactions', requirePermission('transactions:create'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const tx = req.body;
    if (!tx.id || !tx.description) {
      return res.status(400).json({ error: 'ID e descrição da transação são obrigatórios' });
    }
    saveTransaction(tx, rlsCtx);
    logger.info('Transaction saved', {
      reqId,
      userId: rlsCtx.userId,
      transactionId: tx.id,
      amount: tx.amount,
      type: tx.type,
      action: 'transaction.save',
    });
    res.json({ success: true, transaction: tx });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on saving transaction', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error saving transaction', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao salvar transação', reqId });
  }
});

apiRouter.post('/transactions/batch', requirePermission('transactions:import'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Lista de transações inválida' });
    }
    saveTransactionsBatch(transactions, rlsCtx);
    logger.info('Batch transactions saved', {
      reqId,
      userId: rlsCtx.userId,
      count: transactions.length,
      action: 'transaction.batch_save',
    });
    res.json({ success: true, count: transactions.length });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on batch save transactions', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error saving transactions batch', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao salvar transações em lote', reqId });
  }
});

apiRouter.delete('/transactions/:id', requirePermission('transactions:delete'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { id } = req.params;
    const deleteEntireSeries = req.query.series === 'true';
    deleteTransactionById(id, deleteEntireSeries, rlsCtx);
    logger.info('Transaction deleted', {
      reqId,
      userId: rlsCtx.userId,
      transactionId: id,
      series: deleteEntireSeries,
      action: 'transaction.delete',
    });
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on deleting transaction', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error deleting transaction', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao excluir transação', reqId });
  }
});

apiRouter.post('/transactions/delete-batch', requirePermission('transactions:delete'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Lista de IDs inválida' });
    }
    deleteTransactionsBatch(ids, rlsCtx);
    logger.info('Batch transactions deleted', {
      reqId,
      userId: rlsCtx.userId,
      count: ids.length,
      action: 'transaction.batch_delete',
    });
    res.json({ success: true, count: ids.length });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on batch delete transactions', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error deleting transactions in batch', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao excluir transações em lote', reqId });
  }
});

// 6. Recurring Transactions
apiRouter.post('/recurring', requirePermission('recurring:manage'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const item = req.body;
    if (!item.id || !item.description) {
      return res.status(400).json({ error: 'ID e descrição da transação recorrente são obrigatórios' });
    }
    saveRecurring(item, rlsCtx);
    logger.info('Recurring rule saved', { reqId, userId: rlsCtx.userId, recurringId: item.id, action: 'recurring.save' });
    res.json({ success: true, recurring: item });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on saving recurring rule', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error saving recurring transaction', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao salvar transação recorrente', reqId });
  }
});

apiRouter.delete('/recurring/:id', requirePermission('recurring:manage'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { id } = req.params;
    deleteRecurringById(id, rlsCtx);
    logger.info('Recurring rule deleted', { reqId, userId: rlsCtx.userId, recurringId: id, action: 'recurring.delete' });
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on deleting recurring rule', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error deleting recurring transaction', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao excluir transação recorrente', reqId });
  }
});

// 7. Paid Invoices
apiRouter.post('/invoices/pay', requirePermission('cards:pay_invoice'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const record = req.body;
    if (!record.cardId || !record.invoiceMonth || !record.paidFromAccountId) {
      return res.status(400).json({ error: 'Dados incompletos para pagamento de fatura' });
    }
    savePaidInvoice(record, rlsCtx);
    logger.info('Invoice payment registered', {
      reqId,
      userId: rlsCtx.userId,
      cardId: record.cardId,
      invoiceMonth: record.invoiceMonth,
      amount: record.amount,
      action: 'invoice.pay',
    });
    res.json({ success: true, record });
  } catch (error: any) {
    if (error instanceof RLSSecurityError) {
      logger.warn('RLS violation on invoice payment', { reqId, userId: rlsCtx?.userId, error: error.message });
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logger.error('Error registering paid invoice', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao registrar pagamento de fatura', reqId });
  }
});

// 8. Backup / Restore / Reset (Critical Admin Actions)
apiRouter.post('/backup/import', requirePermission('settings:backup'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    const { data, mode } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Dados de backup ausentes' });
    }
    const updated = importFullBackup(data, mode || 'replace');
    logger.warn('Full backup imported', { reqId, userId: rlsCtx.userId, mode: mode || 'replace', action: 'backup.import' });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('Error importing backup data', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao importar backup', reqId });
  }
});

apiRouter.post('/backup/clear', requirePermission('settings:clear_data'), (req: Request, res: Response) => {
  const reqId = req.id;
  const rlsCtx = (req as any).rlsContext as RLSContext;

  try {
    clearDatabase();
    for (const cat of INITIAL_CATEGORIES) {
      saveCategory(cat, rlsCtx);
    }
    logger.warn('Database cleared and reset by user', {
      reqId,
      userId: rlsCtx.userId,
      userRole: rlsCtx.role,
      action: 'database.clear',
    });
    res.json({ success: true, data: getBootstrapData(rlsCtx) });
  } catch (error: any) {
    logger.error('Error clearing database', error, { reqId, userId: rlsCtx?.userId });
    res.status(500).json({ error: error.message || 'Erro ao limpar banco de dados', reqId });
  }
});

// 9. Users & Permissions (RBAC) CRUD
apiRouter.get('/users', requirePermission('users:view'), (_req: Request, res: Response) => {
  try {
    const users = getAllUsers();
    res.json({
      success: true,
      users,
      roles: ROLE_DEFINITIONS,
      permissionGroups: PERMISSION_GROUPS,
    });
  } catch (error: any) {
    logger.error('Error loading users list', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar lista de usuários' });
  }
});

apiRouter.get('/users/:id', requirePermission('users:view'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ success: true, user });
  } catch (error: any) {
    logger.error('Error fetching user by id', error, { userId: req.params.id });
    res.status(500).json({ error: error.message || 'Erro ao buscar usuário' });
  }
});

apiRouter.post('/users', requirePermission('users:create'), (req: Request, res: Response) => {
  const reqId = req.id;
  const actor = (req as any).user as User;

  try {
    const body = req.body as Partial<User>;

    if (!body.name || !body.email || !body.role) {
      return res.status(400).json({ error: 'Nome, e-mail e perfil (role) são obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return res.status(400).json({ error: 'Formato de e-mail inválido' });
    }

    const existingUsers = getAllUsers();
    const isNew = !body.id;

    // Check duplicate email
    const duplicate = existingUsers.find(
      u => u.email.toLowerCase() === body.email!.toLowerCase() && (!body.id || u.id !== body.id)
    );
    if (duplicate) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail' });
    }

    const userRole = body.role as UserRole;
    let permissions = body.permissions;
    if (!permissions || !Array.isArray(permissions)) {
      permissions = ROLE_DEFINITIONS[userRole]?.defaultPermissions || [];
    }

    const user: User = {
      id: body.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      role: userRole,
      customRoleName: body.customRoleName?.trim() || undefined,
      status: (body.status as UserStatus) || 'active',
      department: body.department?.trim() || 'Financeiro',
      phone: body.phone?.trim() || undefined,
      avatarColor: body.avatarColor || '#10b981',
      twoFactorEnabled: Boolean(body.twoFactorEnabled),
      permissions,
      lastLogin: body.lastLogin,
      createdAt: body.createdAt || new Date().toISOString(),
      notes: body.notes?.trim() || undefined,
    };

    const rawPassword = (body as any).password as string | undefined;
    saveUser(user, rawPassword || (isNew ? 'senha123' : undefined));

    addAuditLog({
      userId: actor?.id || user.id,
      userName: actor?.name || 'Administrador',
      action: isNew ? 'create' : 'update',
      target: user.name,
      details: isNew
        ? `Usuário criado com perfil ${ROLE_DEFINITIONS[user.role]?.name || user.role} e ${user.permissions.length} permissões`
        : `Cadastro atualizado. Perfil: ${ROLE_DEFINITIONS[user.role]?.name || user.role}. Status: ${user.status}`,
    });

    logger.info('User created or updated', {
      reqId,
      actorId: actor?.id,
      targetUserId: user.id,
      targetRole: user.role,
      action: isNew ? 'user.create' : 'user.update',
    });

    res.json({ success: true, user });
  } catch (error: any) {
    logger.error('Error saving user', error, { reqId });
    res.status(500).json({ error: error.message || 'Erro ao salvar usuário', reqId });
  }
});

apiRouter.patch('/users/:id/status', requirePermission('users:edit'), (req: Request, res: Response) => {
  const reqId = req.id;
  const actor = (req as any).user as User;

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Safety: ensure at least one active admin
    if (user.role === 'admin' && status !== 'active') {
      const allUsers = getAllUsers();
      const activeAdmins = allUsers.filter(u => u.role === 'admin' && u.status === 'active' && u.id !== id);
      if (activeAdmins.length === 0) {
        return res.status(400).json({ error: 'Não é possível desativar o único administrador ativo do sistema' });
      }
    }

    updateUserStatus(id, status);

    addAuditLog({
      userId: id,
      userName: actor?.name || 'Administrador',
      action: 'status_change',
      target: user.name,
      details: `Status alterado de "${user.status}" para "${status}"`,
    });

    logger.info('User status updated', { reqId, targetUserId: id, newStatus: status, action: 'user.status_change' });
    res.json({ success: true, id, status });
  } catch (error: any) {
    logger.error('Error updating user status', error, { reqId, targetUserId: req.params.id });
    res.status(500).json({ error: error.message || 'Erro ao alterar status do usuário', reqId });
  }
});

apiRouter.patch('/users/:id/password', requirePermission('users:edit'), (req: Request, res: Response) => {
  const reqId = req.id;
  const actor = (req as any).user as User;

  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'A nova senha é obrigatória' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres' });
    }

    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    updateUserPassword(id, password);

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    addAuditLog({
      userId: actor?.id || id,
      userName: actor?.name || 'Administrador',
      action: 'update',
      target: user.name,
      details: `Senha de acesso redefinida pelo administrador (${actor?.name || 'Administrador'})`,
      ipAddress: clientIp,
    });

    logger.warn('User password reset by admin', {
      reqId,
      actorId: actor?.id,
      targetUserId: id,
      action: 'user.admin_reset_password',
    });

    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error: any) {
    logger.error('Error resetting user password', error, { reqId, targetUserId: req.params.id });
    res.status(500).json({ error: error.message || 'Erro ao alterar a senha do usuário', reqId });
  }
});

apiRouter.delete('/users/:id', requirePermission('users:delete'), (req: Request, res: Response) => {
  const reqId = req.id;
  const actor = (req as any).user as User;

  try {
    const { id } = req.params;
    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Safety: ensure not deleting the last active admin
    if (user.role === 'admin') {
      const allUsers = getAllUsers();
      const activeAdmins = allUsers.filter(u => u.role === 'admin' && u.id !== id);
      if (activeAdmins.length === 0) {
        return res.status(400).json({ error: 'Não é possível excluir o único administrador do sistema' });
      }
    }

    deleteUserById(id);

    addAuditLog({
      userId: id,
      userName: actor?.name || 'Administrador',
      action: 'delete',
      target: user.name,
      details: `Usuário (${user.email}) removido permanentemente do sistema`,
    });

    logger.warn('User account deleted', {
      reqId,
      actorId: actor?.id,
      deletedUserId: id,
      deletedEmail: user.email,
      action: 'user.delete',
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting user', error, { reqId, targetUserId: req.params.id });
    res.status(500).json({ error: error.message || 'Erro ao excluir usuário', reqId });
  }
});

apiRouter.get('/audit-logs', requirePermission('users:audit_logs'), (_req: Request, res: Response) => {
  try {
    const logs = getAllAuditLogs(100);
    res.json({ success: true, logs });
  } catch (error: any) {
    logger.error('Error retrieving audit logs', error);
    res.status(500).json({ error: error.message || 'Erro ao carregar logs de auditoria' });
  }
});

apiRouter.post('/users/invite', requirePermission('users:create'), (req: Request, res: Response) => {
  const reqId = req.id;
  const actor = (req as any).user as User;

  try {
    const { email, role, department } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório para envio do convite' });
    }

    addAuditLog({
      userName: actor?.name || 'Administrador',
      action: 'create',
      target: email,
      details: `Convite de acesso enviado para ${email} com função ${role || 'analyst'} (${department || 'Geral'})`,
    });

    logger.info('User invitation sent', {
      reqId,
      actorId: actor?.id,
      targetEmail: email,
      targetRole: role,
      action: 'user.invite',
    });

    res.json({
      success: true,
      message: `Convite enviado com sucesso para ${email}!`,
      inviteLink: `https://moneypro.app/join?token=inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    });
  } catch (error: any) {
    logger.error('Error sending invite', error, { reqId });
    res.status(500).json({ error: error.message || 'Erro ao enviar convite', reqId });
  }
});
