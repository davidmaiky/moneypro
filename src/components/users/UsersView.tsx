import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Eye,
  Key,
  Download,
  RefreshCw,
  Building2,
  Lock,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  MoreVertical,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  User,
  UserRole,
  UserStatus,
  AuditLog,
  ROLE_DEFINITIONS,
  PERMISSION_GROUPS,
  ALL_PERMISSION_IDS,
} from '../../types/user';
import { api } from '../../services/api';
import { UserModal } from './UserModal';
import { DeleteUserModal } from './DeleteUserModal';
import { UserDetailModal } from './UserDetailModal';
import { InviteUserModal } from './InviteUserModal';

export const UsersView: React.FC = () => {
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tabs inside Users View: 'members' | 'matrix' | 'audit'
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'matrix' | 'audit'>('members');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modals State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [userToView, setUserToView] = useState<User | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Matrix Filter State
  const [matrixSearch, setMatrixSearch] = useState('');

  // Audit Logs Search
  const [auditSearch, setAuditSearch] = useState('');

  // Fetch users & logs
  const loadData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);

      const [usersRes, logsRes] = await Promise.all([
        api.getUsers(),
        api.getAuditLogs(),
      ]);

      if (usersRes.users) {
        setUsers(usersRes.users);
      }
      if (logsRes.logs) {
        setAuditLogs(logsRes.logs);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar dados de usuários', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.department && user.department.toLowerCase().includes(query)) ||
        (user.phone && user.phone.includes(query));

      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesDept = departmentFilter === 'all' || user.department === departmentFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesDept;
    });
  }, [users, searchQuery, roleFilter, statusFilter, departmentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const pending = users.filter(u => u.status === 'pending').length;
    const adminsAndManagers = users.filter(u => u.role === 'admin' || u.role === 'manager').length;
    const withTwoFactor = users.filter(u => u.twoFactorEnabled).length;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const twoFactorRate = total > 0 ? Math.round((withTwoFactor / total) * 100) : 0;

    return {
      total,
      active,
      inactive,
      pending,
      adminsAndManagers,
      withTwoFactor,
      activeRate,
      twoFactorRate,
    };
  }, [users]);

  // Active Admin check for delete protection
  const activeAdminsCount = useMemo(() => {
    return users.filter(u => u.role === 'admin' && u.status === 'active').length;
  }, [users]);

  const isUserLastAdmin = (user: User) => {
    return user.role === 'admin' && user.status === 'active' && activeAdminsCount <= 1;
  };

  // User Handlers
  const handleOpenCreateUser = () => {
    setUserToEdit(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setUserToEdit(user);
    setIsUserModalOpen(true);
  };

  const handleOpenViewUser = (user: User) => {
    setUserToView(user);
    setIsDetailModalOpen(true);
  };

  const handleOpenDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      const res = await api.saveUser(userData);
      showToast(
        userData.id
          ? `Usuário ${res.user.name} atualizado com sucesso!`
          : `Novo usuário ${res.user.name} cadastrado com sucesso!`,
        'success'
      );
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar usuário', 'error');
      throw err;
    }
  };

  const handleToggleStatus = async (user: User, newStatus: UserStatus) => {
    if (user.role === 'admin' && user.status === 'active' && newStatus !== 'active' && activeAdminsCount <= 1) {
      showToast('Não é possível desativar o único administrador ativo do sistema', 'error');
      return;
    }

    try {
      await api.updateUserStatus(user.id, newStatus);
      showToast(`Status de ${user.name} alterado para ${newStatus === 'active' ? 'Ativo' : newStatus === 'inactive' ? 'Inativo' : 'Pendente'}`);
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      // Reload logs in background
      api.getAuditLogs().then(res => {
        if (res.logs) setAuditLogs(res.logs);
      });
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar status', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteUser(userToDelete.id);
      showToast(`Usuário ${userToDelete.name} excluído com sucesso!`, 'success');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir usuário', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Users to CSV
  const handleExportCSV = () => {
    if (users.length === 0) {
      showToast('Nenhum usuário para exportar', 'error');
      return;
    }

    const headers = ['ID', 'Nome', 'Email', 'Cargo', 'Departamento', 'Status', '2FA', 'Permissões Ativas', 'Último Acesso', 'Data Cadastro'];
    const rows = users.map(u => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${ROLE_DEFINITIONS[u.role]?.name || u.role}"`,
      `"${(u.department || '').replace(/"/g, '""')}"`,
      u.status,
      u.twoFactorEnabled ? 'Sim' : 'Não',
      u.permissions.length,
      u.lastLogin || 'Nunca',
      u.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `usuarios_moneypro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Planilha de usuários exportada com sucesso!');
  };

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(
      l =>
        l.userName.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Nunca acessou';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 5) return 'Agora mesmo';
      if (diffMins < 60) return `${diffMins}m atrás`;
      if (diffHours < 24) return `${diffHours}h atrás`;
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 30) return `${diffDays}d atrás`;
      return new Date(isoString).toLocaleDateString('pt-BR');
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-950/20'
              : 'bg-rose-900/90 text-white border-rose-700 shadow-rose-950/20'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Gestão de Usuários & Controle de Acesso
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administre perfis de acesso (RBAC), credenciais de colaboradores e auditoria de segurança
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
            title="Exportar para arquivo CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl transition-all cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Convidar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateUser}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total de Membros
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{departments.length} departamentos ativos</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${stats.activeRate}%` }}
              title={`${stats.active} ativos`}
            />
            <div
              className="bg-amber-400 h-full"
              style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
              title={`${stats.pending} pendentes`}
            />
            <div
              className="bg-slate-300 dark:bg-slate-600 h-full"
              style={{ width: `${stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0}%` }}
              title={`${stats.inactive} inativos`}
            />
          </div>
        </div>

        {/* Active Users */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Usuários Ativos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.active}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span>{stats.activeRate}% da equipe ativa</span>
            {stats.pending > 0 && (
              <span className="text-slate-400 font-normal">· {stats.pending} convites</span>
            )}
          </div>
        </div>

        {/* Admins & Managers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gestão & Liderança
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.adminsAndManagers}
          </div>
          <div className="mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
            {activeAdminsCount} {activeAdminsCount === 1 ? 'Administrador raiz' : 'Administradores'}
          </div>
        </div>

        {/* 2FA Protection */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Proteção 2FA Ativa
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.withTwoFactor} <span className="text-sm font-normal text-slate-400">/ {stats.total}</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            {stats.twoFactorRate}% com TOTP habilitado
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-px">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membros & Permissões</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
              {filteredUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('matrix')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Matriz de Perfis (RBAC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('audit')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'audit'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Trilha de Auditoria</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Members List (CRUD) */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou setor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  <option value="all">Todos os Perfis</option>
                  <option value="admin">Administrador</option>
                  <option value="manager">Gestor</option>
                  <option value="analyst">Analista</option>
                  <option value="viewer">Visualizador</option>
                  <option value="custom">Personalizado</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                  <option value="pending">Pendentes</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>

              {/* Department Filter */}
              {departments.length > 0 && (
                <div className="relative">
                  <select
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    className="pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="all">Todos os Setores</option>
                    {departments.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              )}

              {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('all');
                    setStatusFilter('all');
                    setDepartmentFilter('all');
                  }}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Users Table / List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs font-semibold">Carregando usuários e permissões...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nenhum usuário encontrado
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Tente ajustar os filtros de busca ou cadastre um novo membro
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateUser}
                  className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/40">
                      <th className="px-5 py-3.5">Membro</th>
                      <th className="px-4 py-3.5">Função (Role)</th>
                      <th className="px-4 py-3.5">Permissões</th>
                      <th className="px-4 py-3.5">Segurança (2FA)</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Último Acesso</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {filteredUsers.map(user => {
                      const roleInfo = ROLE_DEFINITIONS[user.role] || {
                        name: user.customRoleName || user.role,
                        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                      };

                      const isLastAdmin = isUserLastAdmin(user);

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Member Name & Email */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 relative"
                                style={{ backgroundColor: user.avatarColor || '#10b981' }}
                              >
                                {user.name.charAt(0).toUpperCase()}
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                    user.status === 'active'
                                      ? 'bg-emerald-500'
                                      : user.status === 'pending'
                                      ? 'bg-amber-400'
                                      : 'bg-slate-400'
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {user.email}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3" />
                                  <span>{user.department || 'Geral'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleInfo.badgeClass}`}>
                              {user.role === 'admin' && <Lock className="w-3 h-3" />}
                              <span>{roleInfo.name}</span>
                            </span>
                          </td>

                          {/* Permissions */}
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => handleOpenViewUser(user)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-900/60 transition-colors cursor-pointer"
                              title="Clique para visualizar permissões detalhadas"
                            >
                              <Key className="w-3 h-3" />
                              <span>{user.permissions.length} módulos</span>
                            </button>
                          </td>

                          {/* 2FA */}
                          <td className="px-4 py-3.5">
                            {user.twoFactorEnabled ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span>2FA Ativo</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
                                <ShieldAlert className="w-4 h-4 text-slate-400" />
                                <span>Desativado</span>
                              </div>
                            )}
                          </td>

                          {/* Status Dropdown/Toggle */}
                          <td className="px-4 py-3.5">
                            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800">
                              {(['active', 'inactive', 'pending'] as UserStatus[]).map(st => {
                                const isCurrent = user.status === st;
                                const labels = { active: 'Ativo', inactive: 'Inat.', pending: 'Pend.' };

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleToggleStatus(user, st)}
                                    disabled={isCurrent}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                      isCurrent
                                        ? st === 'active'
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : st === 'pending'
                                          ? 'bg-amber-400 text-slate-900 shadow-xs'
                                          : 'bg-slate-400 text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                    title={`Alterar status para ${labels[st]}`}
                                  >
                                    {labels[st]}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Last Login */}
                          <td className="px-4 py-3.5">
                            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              {getRelativeTime(user.lastLogin)}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              {user.lastLogin ? formatTimestamp(user.lastLogin).split(' ')[0] : 'Pendente'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenViewUser(user)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                title="Visualizar detalhes do perfil"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(user)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                title="Editar usuário e permissões"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteUser(user)}
                                disabled={isLastAdmin}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isLastAdmin
                                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer'
                                }`}
                                title={isLastAdmin ? 'Não é possível excluir o único administrador ativo' : 'Excluir usuário'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Permissions Matrix (RBAC) */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Matriz de Controle de Acesso Baseado em Funções (RBAC)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualização comparativa de privilégios e permissões por perfil padrão
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar permissão..."
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/40">
                    <th className="px-5 py-3.5 w-1/3">Módulo & Permissão</th>
                    <th className="px-3 py-3.5 text-center">
                      <span className="text-purple-600 dark:text-purple-400">Administrador</span>
                    </th>
                    <th className="px-3 py-3.5 text-center">
                      <span className="text-blue-600 dark:text-blue-400">Gestor</span>
                    </th>
                    <th className="px-3 py-3.5 text-center">
                      <span className="text-emerald-600 dark:text-emerald-400">Analista</span>
                    </th>
                    <th className="px-3 py-3.5 text-center">
                      <span className="text-slate-600 dark:text-slate-400">Visualizador</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {PERMISSION_GROUPS.map(group => {
                    const filteredGroupPerms = group.permissions.filter(
                      p =>
                        !matrixSearch.trim() ||
                        p.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                        p.description.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                        group.name.toLowerCase().includes(matrixSearch.toLowerCase())
                    );

                    if (filteredGroupPerms.length === 0) return null;

                    return (
                      <React.Fragment key={group.id}>
                        {/* Group Header Row */}
                        <tr className="bg-slate-50/70 dark:bg-slate-950/70 font-bold text-slate-800 dark:text-slate-200">
                          <td colSpan={5} className="px-5 py-2.5 text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                            <span>{group.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              — {group.description}
                            </span>
                          </td>
                        </tr>

                        {filteredGroupPerms.map(perm => (
                          <tr
                            key={perm.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="px-5 py-3 pl-8">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {perm.name}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                {perm.description}
                              </div>
                            </td>

                            {/* Admin */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </span>
                              </div>
                            </td>

                            {/* Manager */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                {ROLE_DEFINITIONS.manager.defaultPermissions.includes(perm.id) ? (
                                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 text-base font-bold">—</span>
                                )}
                              </div>
                            </td>

                            {/* Analyst */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                {ROLE_DEFINITIONS.analyst.defaultPermissions.includes(perm.id) ? (
                                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 text-base font-bold">—</span>
                                )}
                              </div>
                            </td>

                            {/* Viewer */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                {ROLE_DEFINITIONS.viewer.defaultPermissions.includes(perm.id) ? (
                                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 text-base font-bold">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Trilha de Auditoria & Registro de Atividades
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histórico imutável de alterações cadastrais, permissões e status no sistema
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar por usuário ou ação..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                Nenhum registro de auditoria encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAuditLogs.map(log => {
                  const actionMap: Record<string, { label: string; color: string }> = {
                    create: { label: 'Criação', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
                    update: { label: 'Atualização', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
                    delete: { label: 'Exclusão', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
                    status_change: { label: 'Alteração de Status', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
                    role_change: { label: 'Mudança de Perfil', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
                  };

                  const currentAction = actionMap[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };

                  return (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {log.userName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentAction.color}`}>
                              {currentAction.label}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              em <strong className="text-slate-700 dark:text-slate-300">{log.target}</strong>
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </div>

                      <div className="text-right sm:text-right shrink-0">
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {formatTimestamp(log.timestamp)}
                        </div>
                        {log.ipAddress && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            IP: {log.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Create / Edit Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
        userToEdit={userToEdit}
      />

      {/* User Details Modal */}
      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={userToView}
        onEdit={user => {
          setIsDetailModalOpen(false);
          handleOpenEditUser(user);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        user={userToDelete}
        isLastAdmin={userToDelete ? isUserLastAdmin(userToDelete) : false}
        isDeleting={isDeleting}
      />

      {/* Invite Member Modal */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          loadData(true);
        }}
      />
    </div>
  );
};
