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
  closeDatabase,
} from './db';
import { INITIAL_CATEGORIES } from '../src/data/initialData';
import { PERMISSION_GROUPS, ROLE_DEFINITIONS, ALL_PERMISSION_IDS, User, UserRole, UserStatus } from '../src/types/user';

export const apiRouter = Router();

// Health check endpoint for Easypanel, Docker and status monitoring (Public)
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'finanflow-api',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// --- Authentication Endpoints (Public Login) ---
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const userWithHash = getUserByEmail(email.trim());
    if (!userWithHash || !userWithHash.passwordHash) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const isValid = verifyPassword(password, userWithHash.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    if (userWithHash.status !== 'active') {
      return res.status(403).json({
        error: userWithHash.status === 'pending'
          ? 'Sua conta ainda está pendente de ativação pelo administrador.'
          : 'Sua conta de usuário está desativada no sistema.'
      });
    }

    // Update last login
    updateUserLastLogin(userWithHash.id);

    // Create session (30 days if rememberMe, else 7 days)
    const token = createSession(userWithHash.id, rememberMe ? 30 : 7);

    // Audit log
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    addAuditLog({
      userId: userWithHash.id,
      userName: userWithHash.name,
      action: 'login',
      target: userWithHash.email,
      details: `Login efetuado com sucesso via formulário seguro (${userWithHash.role})`,
      ipAddress: clientIp.toString().split(',')[0].trim(),
    });

    // Strip password hash from returned user object
    const { passwordHash: _, ...safeUser } = userWithHash;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro durante o processo de autenticação' });
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
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.substring(7).trim();
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Por favor, autentique-se novamente.' });
  }

  const user = getUserById(session.userId);
  if (!user || user.status !== 'active') {
    return res.status(403).json({ error: 'Acesso negado. Usuário inativo ou inexistente.' });
  }

  // Attach authenticated user to request
  (req as any).user = user;
  (req as any).authToken = token;
  next();
});

// --- Protected Auth Endpoints ---
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    user: (req as any).user,
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  try {
    const token = (req as any).authToken;
    if (token) {
      deleteSession(token);
    }
    res.json({ success: true, message: 'Sessão encerrada com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao realizar logout' });
  }
});

apiRouter.post('/auth/change-password', (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres' });
    }

    const userWithHash = getUserByEmail(user.email);
    if (!userWithHash || !userWithHash.passwordHash) {
      return res.status(400).json({ error: 'Erro ao verificar cadastro do usuário' });
    }

    if (!verifyPassword(currentPassword, userWithHash.passwordHash)) {
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

    res.json({ success: true, message: 'Senha atualizada com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao atualizar senha' });
  }
});

// 1. Bootstrap
apiRouter.get('/bootstrap', (_req: Request, res: Response) => {
  try {
    const data = getBootstrapData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao carregar dados do banco' });
  }
});

// 2. Accounts
apiRouter.post('/accounts', (req: Request, res: Response) => {
  try {
    const account = req.body;
    if (!account.id || !account.name) {
      return res.status(400).json({ error: 'ID e nome da conta são obrigatórios' });
    }
    saveAccount(account);
    res.json({ success: true, account });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao salvar conta' });
  }
});

apiRouter.delete('/accounts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    deleteAccountById(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir conta' });
  }
});

// 3. Credit Cards
apiRouter.post('/cards', (req: Request, res: Response) => {
  try {
    const card = req.body;
    if (!card.id || !card.name) {
      return res.status(400).json({ error: 'ID e nome do cartão são obrigatórios' });
    }
    saveCard(card);
    res.json({ success: true, card });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao salvar cartão' });
  }
});

apiRouter.delete('/cards/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    deleteCardById(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir cartão' });
  }
});

// 4. Categories
apiRouter.post('/categories', (req: Request, res: Response) => {
  try {
    const category = req.body;
    if (!category.id || !category.name) {
      return res.status(400).json({ error: 'ID e nome da categoria são obrigatórios' });
    }
    saveCategory(category);
    res.json({ success: true, category });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao salvar categoria' });
  }
});

apiRouter.delete('/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reassignToCategoryId = req.query.reassignTo as string | undefined;
    deleteCategoryById(id, reassignToCategoryId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir categoria' });
  }
});

apiRouter.post('/categories/reset-defaults', (_req: Request, res: Response) => {
  try {
    for (const cat of INITIAL_CATEGORIES) {
      saveCategory(cat);
    }
    res.json({ success: true, categories: getAllCategories() });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao restaurar categorias padrão' });
  }
});

// 5. Transactions
apiRouter.post('/transactions', (req: Request, res: Response) => {
  try {
    const tx = req.body;
    if (!tx.id || !tx.description) {
      return res.status(400).json({ error: 'ID e descrição da transação são obrigatórios' });
    }
    saveTransaction(tx);
    res.json({ success: true, transaction: tx });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao salvar transação' });
  }
});

apiRouter.post('/transactions/batch', (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Lista de transações inválida' });
    }
    saveTransactionsBatch(transactions);
    res.json({ success: true, count: transactions.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao salvar transações em lote' });
  }
});

apiRouter.delete('/transactions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteEntireSeries = req.query.series === 'true';
    deleteTransactionById(id, deleteEntireSeries);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir transação' });
  }
});

apiRouter.post('/transactions/delete-batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Lista de IDs inválida' });
    }
    deleteTransactionsBatch(ids);
    res.json({ success: true, count: ids.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir transações em lote' });
  }
});

// 6. Recurring Transactions
apiRouter.post('/recurring', (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item.id || !item.description) {
      return res.status(400).json({ error: 'ID e descrição da transação recorrente são obrigatórios' });
    }
    saveRecurring(item);
    res.json({ success: true, recurring: item });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao salvar transação recorrente' });
  }
});

apiRouter.delete('/recurring/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    deleteRecurringById(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir transação recorrente' });
  }
});

// 7. Paid Invoices
apiRouter.post('/invoices/pay', (req: Request, res: Response) => {
  try {
    const record = req.body;
    if (!record.cardId || !record.invoiceMonth || !record.paidFromAccountId) {
      return res.status(400).json({ error: 'Dados incompletos para pagamento de fatura' });
    }
    savePaidInvoice(record);
    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao registrar pagamento de fatura' });
  }
});

// 8. Backup / Restore / Reset
apiRouter.post('/backup/import', (req: Request, res: Response) => {
  try {
    const { data, mode } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Dados de backup ausentes' });
    }
    const updated = importFullBackup(data, mode || 'replace');
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao importar backup' });
  }
});

apiRouter.post('/backup/clear', (_req: Request, res: Response) => {
  try {
    clearDatabase();
    // Re-seed default categories
    for (const cat of INITIAL_CATEGORIES) {
      saveCategory(cat);
    }
    res.json({ success: true, data: getBootstrapData() });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao limpar banco de dados' });
  }
});

// 9. Users & Permissions (RBAC) CRUD
apiRouter.get('/users', (_req: Request, res: Response) => {
  try {
    const users = getAllUsers();
    res.json({
      success: true,
      users,
      roles: ROLE_DEFINITIONS,
      permissionGroups: PERMISSION_GROUPS,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao buscar lista de usuários' });
  }
});

apiRouter.get('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao buscar usuário' });
  }
});

apiRouter.post('/users', (req: Request, res: Response) => {
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

    // Audit log
    const actorName = (req as any).user?.name || 'Administrador';
    addAuditLog({
      userId: (req as any).user?.id || user.id,
      userName: actorName,
      action: isNew ? 'create' : 'update',
      target: user.name,
      details: isNew
        ? `Usuário criado com perfil ${ROLE_DEFINITIONS[user.role]?.name || user.role} e ${user.permissions.length} permissões`
        : `Cadastro atualizado. Perfil: ${ROLE_DEFINITIONS[user.role]?.name || user.role}. Status: ${user.status}`,
    });

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao salvar usuário' });
  }
});

apiRouter.patch('/users/:id/status', (req: Request, res: Response) => {
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
      userName: 'Administrador',
      action: 'status_change',
      target: user.name,
      details: `Status alterado de "${user.status}" para "${status}"`,
    });

    res.json({ success: true, id, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao alterar status do usuário' });
  }
});

apiRouter.delete('/users/:id', (req: Request, res: Response) => {
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
      userName: 'Administrador',
      action: 'delete',
      target: user.name,
      details: `Usuário (${user.email}) removido permanentemente do sistema`,
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir usuário' });
  }
});

apiRouter.get('/audit-logs', (_req: Request, res: Response) => {
  try {
    const logs = getAllAuditLogs(100);
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao carregar logs de auditoria' });
  }
});

apiRouter.post('/users/invite', (req: Request, res: Response) => {
  try {
    const { email, role, department } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório para envio do convite' });
    }

    addAuditLog({
      userName: 'Administrador',
      action: 'create',
      target: email,
      details: `Convite de acesso enviado para ${email} com função ${role || 'analyst'} (${department || 'Geral'})`,
    });

    res.json({
      success: true,
      message: `Convite enviado com sucesso para ${email}!`,
      inviteLink: `https://moneypro.app/join?token=inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao enviar convite' });
  }
});
