import React from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Key,
  Layers,
} from 'lucide-react';
import { User, ROLE_DEFINITIONS, PERMISSION_GROUPS } from '../../types/user';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onEdit: (user: User) => void;
  onChangePassword?: (user: User) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  onEdit,
  onChangePassword,
}) => {
  if (!isOpen || !user) return null;

  const roleInfo = ROLE_DEFINITIONS[user.role] || {
    name: user.customRoleName || user.role,
    description: 'Perfil personalizado de acesso',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  const statusMap = {
    active: {
      label: 'Ativo',
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      icon: CheckCircle2,
    },
    inactive: {
      label: 'Inativo',
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      icon: XCircle,
    },
    pending: {
      label: 'Pendente',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      icon: Clock,
    },
  };

  const currentStatus = statusMap[user.status] || statusMap.active;
  const StatusIcon = currentStatus.icon;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Nunca acessou';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header decoration */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: user.avatarColor || '#10b981' }}
        />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
              style={{ backgroundColor: user.avatarColor || '#10b981' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {user.name}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.badgeClass}`}>
                  {roleInfo.name}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentStatus.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {currentStatus.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Departamento</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.department || 'Não informado'}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Telefone</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.phone || 'Não cadastrado'}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-2.5">
              {user.twoFactorEnabled ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Autenticação 2FA</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.twoFactorEnabled ? 'Habilitada (Ativa)' : 'Desativada'}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Último Acesso</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {formatDate(user.lastLogin)}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Cadastrado em</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {formatDate(user.createdAt)}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center gap-2.5">
              <Key className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Permissões Ativas</div>
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                  {user.permissions.length} módulos liberados
                </div>
              </div>
            </div>
          </div>

          {/* Notes if present */}
          {user.notes && (
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800/70">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Observações Internas</div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{user.notes}"
              </p>
            </div>
          )}

          {/* Granular Permissions Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Permissões de Acesso por Módulo
                </h4>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {user.permissions.length} ativas
              </span>
            </div>

            <div className="space-y-3">
              {PERMISSION_GROUPS.map(group => {
                const activeInGroup = group.permissions.filter(p => user.permissions.includes(p.id));
                const hasAny = activeInGroup.length > 0;
                const hasAll = activeInGroup.length === group.permissions.length;

                return (
                  <div
                    key={group.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasAny
                        ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50/40 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-200 flex items-center gap-2">
                        <span>{group.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-sm font-mono ${
                          hasAll
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : hasAny
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {activeInGroup.length}/{group.permissions.length}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {group.permissions.map(perm => {
                        const isGranted = user.permissions.includes(perm.id);
                        return (
                          <div
                            key={perm.id}
                            className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                              isGranted
                                ? 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                                : 'bg-transparent text-slate-400 dark:text-slate-600'
                            }`}
                          >
                            {isGranted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className={`font-medium ${isGranted ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                                {perm.name}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                {perm.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {onChangePassword && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangePassword(user);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-xl transition-all cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Alterar Senha</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(user);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Usuário & Permissões</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
