import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { User, ROLE_DEFINITIONS } from '../../types/user';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: User | null;
  isLastAdmin?: boolean;
  isDeleting?: boolean;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLastAdmin = false,
  isDeleting = false,
}) => {
  if (!isOpen || !user) return null;

  const roleInfo = ROLE_DEFINITIONS[user.role] || {
    name: user.customRoleName || user.role,
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden scale-100 transition-all">
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-rose-500 to-amber-500" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/50">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Excluir Usuário
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação removerá o acesso permanentemente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info Preview Card */}
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800/80 mb-5 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
              style={{ backgroundColor: user.avatarColor || '#6366f1' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {user.name}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleInfo.badgeClass}`}>
                  {roleInfo.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Departamento: {user.department || 'Geral'}
              </p>
            </div>
          </div>

          {/* Warning Message */}
          {isLastAdmin ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 mb-5 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Ação Bloqueada</p>
                Este usuário é o <strong>único administrador ativo</strong> cadastrado. Para excluí-lo, promova outro usuário à função de Administrador primeiro para garantir o acesso ao sistema.
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Tem certeza de que deseja excluir <strong>{user.name}</strong>? Todo o histórico de transações associadas será mantido, mas o usuário perderá imediatamente o login e todas as permissões.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLastAdmin || isDeleting}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-md transition-all ${
                isLastAdmin || isDeleting
                  ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 active:scale-95 cursor-pointer'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
