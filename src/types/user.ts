export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer' | 'custom';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface PermissionItem {
  id: string;
  name: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customRoleName?: string;
  status: UserStatus;
  department: string;
  phone?: string;
  avatarColor: string;
  twoFactorEnabled: boolean;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
  notes?: string;
}

export interface RoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  color: string;
  badgeClass: string;
  defaultPermissions: string[];
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'role_change' | 'login' | 'export';
  target: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'dashboard',
    name: 'Visão Geral & Métricas',
    description: 'Acesso aos dashboards de saldo, faturas do mês e indicadores gerais',
    permissions: [
      { id: 'dashboard:view', name: 'Visualizar Dashboard', description: 'Permite visualizar saldos, faturas e resumos consolidados' },
      { id: 'dashboard:export', name: 'Exportar Métricas', description: 'Exportar resumos do painel principal' },
    ],
  },
  {
    id: 'transactions',
    name: 'Transações & Extrato',
    description: 'Gestão de despesas, receitas, transferências e fluxo de caixa diário',
    permissions: [
      { id: 'transactions:view', name: 'Visualizar Lançamentos', description: 'Consultar histórico de transações e filtros avançados' },
      { id: 'transactions:create', name: 'Novo Lançamento', description: 'Criar novas receitas e despesas manuais' },
      { id: 'transactions:edit', name: 'Editar Lançamento', description: 'Modificar valores, categorias e datas de transações existentes' },
      { id: 'transactions:delete', name: 'Excluir Lançamento', description: 'Remover transações individuais ou séries' },
      { id: 'transactions:import', name: 'Importar Extratos', description: 'Importar lançamentos em lote ou via arquivos de conciliação' },
    ],
  },
  {
    id: 'cards',
    name: 'Cartões de Crédito',
    description: 'Gestão de faturas, limites de crédito, parcelamentos e simulações',
    permissions: [
      { id: 'cards:view', name: 'Visualizar Cartões', description: 'Consultar cartões, faturas abertas e fechadas' },
      { id: 'cards:manage', name: 'Cadastrar / Editar Cartões', description: 'Criar novos cartões, alterar limites e datas de corte' },
      { id: 'cards:pay_invoice', name: 'Pagar Fatura', description: 'Efetuar baixa de pagamento de faturas de cartões' },
      { id: 'cards:simulate', name: 'Simulador & Antecipação', description: 'Simular impacto de compras parceladas e antecipar parcelas' },
    ],
  },
  {
    id: 'recurring',
    name: 'Fixos & Recorrentes',
    description: 'Automação de assinaturas, contas recorrentes e lançamentos programados',
    permissions: [
      { id: 'recurring:view', name: 'Visualizar Recorrentes', description: 'Ver lista de despesas e receitas programadas' },
      { id: 'recurring:manage', name: 'Cadastrar Recorrentes', description: 'Criar e alterar regras de lançamentos fixos' },
      { id: 'recurring:process', name: 'Processar Lançamentos', description: 'Lançar manualmente débitos ou créditos do mês' },
    ],
  },
  {
    id: 'categories',
    name: 'Categorias & Metas',
    description: 'Controle de classificação e limites orçamentários por categoria',
    permissions: [
      { id: 'categories:view', name: 'Visualizar Categorias', description: 'Consultar categorias cadastradas' },
      { id: 'categories:manage', name: 'Gerenciar Categorias', description: 'Criar, editar e excluir categorias e tetos de gastos' },
    ],
  },
  {
    id: 'forecast',
    name: 'Projeção & Planejamento',
    description: 'Previsão de fluxo de caixa para os próximos meses',
    permissions: [
      { id: 'forecast:view', name: 'Visualizar Projeções', description: 'Consultar estimativas futuras de receitas e despesas' },
      { id: 'forecast:manage', name: 'Simular Cenários', description: 'Adicionar premissas e simulações financeiras' },
    ],
  },
  {
    id: 'reports',
    name: 'Relatórios & Exportação',
    description: 'Emissão de relatórios em PDF, balanços mensais e auditoria',
    permissions: [
      { id: 'reports:view', name: 'Acessar Central de Relatórios', description: 'Visualizar demonstrativos mensais' },
      { id: 'reports:export_pdf', name: 'Exportar PDF Executivo', description: 'Gerar relatórios formatados para diretoria ou contabilidade' },
    ],
  },
  {
    id: 'users',
    name: 'Gestão de Usuários & Acesso (RBAC)',
    description: 'Administração de contas de usuários, permissões e trilha de auditoria',
    permissions: [
      { id: 'users:view', name: 'Visualizar Usuários', description: 'Ver lista de membros e status de acesso' },
      { id: 'users:create', name: 'Convidar / Criar Usuário', description: 'Cadastrar novos colaboradores na organização' },
      { id: 'users:edit', name: 'Editar Usuário & Permissões', description: 'Alterar perfis de acesso, status e permissões' },
      { id: 'users:delete', name: 'Excluir Usuário', description: 'Remover membros do sistema' },
      { id: 'users:audit_logs', name: 'Trilha de Auditoria', description: 'Acessar histórico de eventos e alterações no sistema' },
    ],
  },
  {
    id: 'settings',
    name: 'Configurações do Sistema & Dados',
    description: 'Controle de infraestrutura, backups e redefinição de dados',
    permissions: [
      { id: 'settings:backup', name: 'Exportar / Importar Backup', description: 'Gerar e restaurar snapshots JSON completos do banco' },
      { id: 'settings:clear_data', name: 'Zerar Banco de Dados', description: 'Ação crítica: limpar todos os registros financeiros' },
    ],
  },
];

// Flat list of all available permission IDs
export const ALL_PERMISSION_IDS: string[] = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id));

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    id: 'admin',
    name: 'Administrador',
    description: 'Acesso irrestrito a todos os módulos, relatórios, gestão de usuários e configurações avançadas.',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    defaultPermissions: ALL_PERMISSION_IDS,
  },
  manager: {
    id: 'manager',
    name: 'Gestor Financeiro',
    description: 'Acesso completo às finanças, cartões, relatórios e projeções, com permissão para gerenciar categorias e transações.',
    color: '#3b82f6',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    defaultPermissions: [
      'dashboard:view',
      'dashboard:export',
      'transactions:view',
      'transactions:create',
      'transactions:edit',
      'transactions:delete',
      'transactions:import',
      'cards:view',
      'cards:manage',
      'cards:pay_invoice',
      'cards:simulate',
      'recurring:view',
      'recurring:manage',
      'recurring:process',
      'categories:view',
      'categories:manage',
      'forecast:view',
      'forecast:manage',
      'reports:view',
      'reports:export_pdf',
      'users:view',
      'settings:backup',
    ],
  },
  analyst: {
    id: 'analyst',
    name: 'Analista Financeiro',
    description: 'Operações diárias: lançamentos, cartões, categorizações, conciliação e geração de relatórios.',
    color: '#10b981',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    defaultPermissions: [
      'dashboard:view',
      'transactions:view',
      'transactions:create',
      'transactions:edit',
      'transactions:import',
      'cards:view',
      'cards:simulate',
      'recurring:view',
      'categories:view',
      'forecast:view',
      'reports:view',
      'reports:export_pdf',
    ],
  },
  viewer: {
    id: 'viewer',
    name: 'Visualizador / Auditor',
    description: 'Apenas leitura de dashboards, relatórios e extratos, sem permissão para criar ou modificar dados.',
    color: '#64748b',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    defaultPermissions: [
      'dashboard:view',
      'transactions:view',
      'cards:view',
      'recurring:view',
      'categories:view',
      'forecast:view',
      'reports:view',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Personalizado',
    description: 'Perfil flexível com permissões definidas individualmente pelo administrador.',
    color: '#f59e0b',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    defaultPermissions: ['dashboard:view', 'transactions:view'],
  },
};
