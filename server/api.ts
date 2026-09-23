import { Router, Request, Response } from 'express';
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
  saveRecurring,
  deleteRecurringById,
  savePaidInvoice,
  importFullBackup,
  clearDatabase,
  getAllCategories,
  getAllAccounts,
  closeDatabase,
} from './db';
import { INITIAL_CATEGORIES } from '../src/data/initialData';

export const apiRouter = Router();

// Health check endpoint for Easypanel, Docker and status monitoring
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'finanflow-api',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
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
