import { Account, Category, CreditCard, Transaction } from '../types/finance';

export const INITIAL_ACCOUNTS: Account[] = [];

export const INITIAL_CARDS: CreditCard[] = [];

export const INITIAL_CATEGORIES: Category[] = [
  // Receitas
  { id: 'cat_salario', name: 'Salário & Remuneração', type: 'income', iconName: 'Briefcase', color: '#10b981' },
  { id: 'cat_freelance', name: 'Freelance & Serviços', type: 'income', iconName: 'Laptop', color: '#06b6d4' },
  { id: 'cat_investimentos', name: 'Rendimentos & Dividendos', type: 'income', iconName: 'TrendingUp', color: '#8b5cf6' },
  { id: 'cat_outras_receitas', name: 'Outras Receitas', type: 'income', iconName: 'PlusCircle', color: '#14b8a6' },
  
  // Despesas
  { id: 'cat_moradia', name: 'Moradia & Condomínio', type: 'expense', iconName: 'Home', color: '#3b82f6' },
  { id: 'cat_alimentacao', name: 'Alimentação & Mercado', type: 'expense', iconName: 'ShoppingCart', color: '#f59e0b' },
  { id: 'cat_transporte', name: 'Transporte & Combustível', type: 'expense', iconName: 'Car', color: '#ef4444' },
  { id: 'cat_lazer', name: 'Lazer & Restaurantes', type: 'expense', iconName: 'UtensilsCrossed', color: '#ec4899' },
  { id: 'cat_eletronicos', name: 'Eletrônicos & Tecnologia', type: 'expense', iconName: 'Smartphone', color: '#6366f1' },
  { id: 'cat_saude', name: 'Saúde & Farmácia', type: 'expense', iconName: 'HeartPulse', color: '#14b8a6' },
  { id: 'cat_servicos', name: 'Assinaturas & Serviços', type: 'expense', iconName: 'Tv', color: '#8b5cf6' },
  { id: 'cat_educacao', name: 'Educação & Cursos', type: 'expense', iconName: 'GraduationCap', color: '#f97316' },
  { id: 'cat_vestuario', name: 'Vestuário & Compras', type: 'expense', iconName: 'Shirt', color: '#d946ef' },
  { id: 'cat_fatura', name: 'Pagamento de Fatura', type: 'expense', iconName: 'CreditCard', color: '#64748b' },
  { id: 'cat_outros', name: 'Outros Gastos', type: 'expense', iconName: 'CircleEllipsis', color: '#94a3b8' },
];

/**
 * Returns initial transactions (empty clean state without demo entries)
 */
export function getInitialTransactions(): Transaction[] {
  return [];
}
