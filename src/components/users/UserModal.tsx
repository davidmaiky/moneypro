import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Building2,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Save,
  Palette,
} from 'lucide-react';
import {
  User,
  UserRole,
  UserStatus,
  ROLE_DEFINITIONS,
  PERMISSION_GROUPS,
  ALL_PERMISSION_IDS,
} from '../../types/user';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Partial<User>) => Promise<void>;
  userToEdit: User | null;
}

const AVATAR_COLORS = [
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userToEdit,
}) => {
  const isEditing = Boolean(userToEdit);

  const [activeTab, setActiveTab] = useState<'profile' | 'permissions'>('profile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('analyst');
  const [customRoleName, setCustomRoleName] = useState('');
  const [department, setDepartment] = useState('Financeiro');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [avatarColor, setAvatarColor] = useState('#10b981');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setName(userToEdit.name);
        setEmail(userToEdit.email);
        setRole(userToEdit.role);
        setCustomRoleName(userToEdit.customRoleName || '');
        setDepartment(userToEdit.department || 'Financeiro');
        setPhone(userToEdit.phone || '');
        setStatus(userToEdit.status);
        setAvatarColor(userToEdit.avatarColor || '#10b981');
        setTwoFactorEnabled(userToEdit.twoFactorEnabled);
        setNotes(userToEdit.notes || '');
        setSelectedPermissions(userToEdit.permissions || []);
      } else {
        // Defaults for new user
        setName('');
        setEmail('');
        setRole('analyst');
        setCustomRoleName('');
        setDepartment('Financeiro');
        setPhone('');
        setStatus('active');
        setAvatarColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
        setTwoFactorEnabled(false);
        setNotes('');
        setSelectedPermissions(ROLE_DEFINITIONS.analyst.defaultPermissions);
      }
      setActiveTab('profile');
      setErrorMessage(null);
    }
  }, [isOpen, userToEdit]);

  if (!isOpen) return null;

  // When changing role, pre-fill standard permissions if user agrees or for convenience
  const handleSelectRole = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole !== 'custom') {
      setSelectedPermissions(ROLE_DEFINITIONS[newRole].defaultPermissions);
    }
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permId)) {
        return prev.filter(id => id !== permId);
      } else {
        return [...prev, permId];
      }
    });
  };

  const handleSelectAllGroup = (groupPermissions: string[]) => {
    setSelectedPermissions(prev => {
      const set = new Set(prev);
      groupPermissions.forEach(p => set.add(p));
      return Array.from(set);
    });
  };

  const handleDeselectAllGroup = (groupPermissions: string[]) => {
    setSelectedPermissions(prev => prev.filter(p => !groupPermissions.includes(p)));
  };

  const handleSelectAllGlobal = () => {
    setSelectedPermissions(ALL_PERMISSION_IDS);
  };

  const handleDeselectAllGlobal = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Por favor, informe o nome completo do usuário');
      setActiveTab('profile');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Por favor, informe o e-mail do usuário');
      setActiveTab('profile');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload: Partial<User> = {
        id: userToEdit?.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        customRoleName: role === 'custom' ? customRoleName.trim() : undefined,
        department: department.trim() || 'Geral',
        phone: phone.trim() || undefined,
        status,
        avatarColor,
        twoFactorEnabled,
        notes: notes.trim() || undefined,
        permissions: selectedPermissions,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Gradient bar */}
        <div
          className="h-2 w-full transition-all duration-300"
          style={{ backgroundColor: avatarColor }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm transition-colors"
              style={{ backgroundColor: avatarColor }}
            >
              {name.trim() ? name.trim().charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? `Editar: ${userToEdit?.name}` : 'Cadastrar Novo Usuário'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing ? 'Atualize as credenciais, permissões e status' : 'Adicione um novo membro com permissões personalizadas'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Dados do Usuário</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Perfil & Permissões Granulares</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
              {selectedPermissions.length}
            </span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex-1 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-5">
                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      E-mail Corporativo *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="joao@empresa.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Department & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Telefone / Celular
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="(11) 98765-4321"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Avatar Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Status da Conta
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['active', 'inactive', 'pending'] as UserStatus[]).map(st => {
                        const labels = { active: 'Ativo', inactive: 'Inativo', pending: 'Pendente' };
                        const isSelected = status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatus(st)}
                            className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-400 dark:text-indigo-300 font-bold shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {labels[st]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cor do Avatar</span>
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {AVATAR_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAvatarColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                            avatarColor === c ? 'scale-115 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                        >
                          {avatarColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2FA Toggle & Security */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      twoFactorEnabled
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Autenticação em Duas Etapas (2FA)</span>
                        {twoFactorEnabled && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-sm">
                            Ativada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Exige código de verificação adicional via aplicativo autenticador ao efetuar login
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={e => setTwoFactorEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Observações Internas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais sobre o colaborador, escopo de atuação ou horários..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="space-y-6">
                {/* Role Presets Cards */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">
                    1. Escolha o Perfil Base de Acesso (Role)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map(rKey => {
                      const rDef = ROLE_DEFINITIONS[rKey];
                      const isSelected = role === rKey;

                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => handleSelectRole(rKey)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {rDef.name}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                              {rDef.description}
                            </p>
                          </div>
                          <div className="mt-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <span>{rDef.defaultPermissions.length} permissões padrão</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {role === 'custom' && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nome do Cargo Personalizado
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Auditor Noturno, Conciliador de Cartões..."
                        value={customRoleName}
                        onChange={e => setCustomRoleName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Granular Permission Checklist Header */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Key className="w-4 h-4 text-indigo-500" />
                        <span>2. Ajuste Fino das Permissões ({selectedPermissions.length} / {ALL_PERMISSION_IDS.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Marque ou desmarque permissões específicas para este usuário
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllGlobal}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                      >
                        Marcar Todas
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllGlobal}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Limpar Todas
                      </button>
                    </div>
                  </div>

                  {/* Modules Group Accordion / Blocks */}
                  <div className="space-y-3.5 mt-3">
                    {PERMISSION_GROUPS.map(group => {
                      const groupIds = group.permissions.map(p => p.id);
                      const selectedInGroup = group.permissions.filter(p => selectedPermissions.includes(p.id));
                      const isAllSelected = selectedInGroup.length === group.permissions.length;
                      const isNoneSelected = selectedInGroup.length === 0;

                      return (
                        <div
                          key={group.id}
                          className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{group.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-sm font-mono ${
                                  isAllSelected
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold'
                                    : !isNoneSelected
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-bold'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {selectedInGroup.length} de {group.permissions.length}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {group.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleSelectAllGroup(groupIds)}
                                className="px-2 py-0.5 rounded-md font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                              >
                                Todos
                              </button>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <button
                                type="button"
                                onClick={() => handleDeselectAllGroup(groupIds)}
                                className="px-2 py-0.5 rounded-md font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                Nenhum
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                            {group.permissions.map(perm => {
                              const isChecked = selectedPermissions.includes(perm.id);

                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-white shadow-xs'
                                      : 'bg-slate-100/50 dark:bg-slate-900/40 border-transparent text-slate-500 hover:bg-white dark:hover:bg-slate-900'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.id)}
                                    className="mt-0.5 rounded-md text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold leading-tight">
                                      {perm.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                                      {perm.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {activeTab === 'profile' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  <span>Avançar para Permissões</span>
                  <Key className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <span>Voltar aos Dados</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Usuário'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
