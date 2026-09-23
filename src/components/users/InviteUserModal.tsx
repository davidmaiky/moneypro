import React, { useState } from 'react';
import { Mail, Send, X, Copy, Check, Shield, Building2, CheckCircle2 } from 'lucide-react';
import { UserRole, ROLE_DEFINITIONS } from '../../types/user';
import { api } from '../../services/api';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('analyst');
  const [department, setDepartment] = useState('Financeiro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ message: string; inviteLink: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, informe o e-mail do colaborador');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.inviteUser(email.trim(), role, department);
      setInviteResult({
        message: res.message,
        inviteLink: res.inviteLink,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar convite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteResult?.inviteLink) {
      navigator.clipboard.writeText(inviteResult.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    setEmail('');
    setRole('analyst');
    setDepartment('Financeiro');
    setInviteResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-indigo-600" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/80 dark:border-indigo-900/50">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Convidar Novo Membro
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Envie um convite de acesso para sua equipe
                </p>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {inviteResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-300">
                  <p className="font-bold mb-1">Convite gerado com sucesso!</p>
                  <p>{inviteResult.message}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Link de Acesso Único (Válido por 7 dias)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.inviteLink}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="exemplo@suaempresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Perfil de Acesso Inicial *
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="admin">Administrador (Total)</option>
                    <option value="manager">Gestor Financeiro</option>
                    <option value="analyst">Analista Financeiro</option>
                    <option value="viewer">Visualizador / Auditor</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  {ROLE_DEFINITIONS[role]?.description}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Departamento / Setor
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex: Financeiro, Controladoria, Diretoria..."
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Gerando...' : 'Gerar Convite'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
