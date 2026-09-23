import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Repeat,
  FolderTree,
  TrendingUp,
  FileText,
  Users,
  Eye,
  EyeOff,
  Database,
  Keyboard,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useTheme } from '../../context/ThemeContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { ActiveTab } from './Header';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenNewTransaction?: () => void;
  onOpenBackupModal: () => void;
  onOpenShortcutsModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
  onOpenBackupModal,
  onOpenShortcutsModal,
}) => {
  const {
    selectedMonth,
    recurringTransactions,
    isPrivacyMode,
    togglePrivacyMode,
  } = useFinance();
  const { resolvedTheme, toggleTheme } = useTheme();

  const pendingRecurringCount = recurringTransactions.filter(
    r => r.active && (!r.generatedMonths || !r.generatedMonths.includes(selectedMonth))
  ).length;

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Visão Geral',
      icon: LayoutDashboard,
    },
    {
      id: 'transactions',
      label: 'Lançamentos',
      icon: Receipt,
    },
    {
      id: 'cards',
      label: 'Cartões de Crédito',
      icon: CreditCard,
    },
    {
      id: 'recurring',
      label: 'Fixos & Recorrentes',
      icon: Repeat,
      badge: pendingRecurringCount,
      badgeColor: 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-900',
    },
    {
      id: 'categories',
      label: 'Categorias',
      icon: FolderTree,
    },
    {
      id: 'forecast',
      label: 'Projeção Futura',
      icon: TrendingUp,
    },
    {
      id: 'reports',
      label: 'Relatórios PDF',
      icon: FileText,
    },
    {
      id: 'users',
      label: 'Usuários & Acesso',
      icon: Users,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
            M
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Money Pro
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight font-medium">
              Gestão Financeira & Cartões
            </span>
          </div>
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          aria-label="Fechar menu lateral"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navegação
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Utility Tools */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Privacy Mode */}
        <button
          type="button"
          onClick={togglePrivacyMode}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isPrivacyMode
              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
          }`}
          title="Modo Privacidade (Ocultar Saldos - Tecla P)"
        >
          <div className="flex items-center gap-2">
            {isPrivacyMode ? (
              <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isPrivacyMode ? 'Valores Ocultos' : 'Modo Privacidade'}</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            P
          </kbd>
        </button>

        {/* Backup & Restore */}
        <button
          type="button"
          onClick={() => {
            onOpenBackupModal();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Backup e Restauração JSON (Tecla B)"
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Backup / Importar</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            B
          </kbd>
        </button>

        {/* Shortcuts */}
        <button
          type="button"
          onClick={() => {
            onOpenShortcutsModal();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Atalhos de Teclado (Tecla ?)"
        >
          <div className="flex items-center gap-2">
            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
            <span>Atalhos de Teclado</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ?
          </kbd>
        </button>

        {/* PWA Install Button row */}
        <div className="pt-1">
          <PWAInstallButton />
        </div>

        {/* Theme Toggle */}
        <div className="pt-1 flex items-center justify-between px-1">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Aparência</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors cursor-pointer"
            title={resolvedTheme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3 h-3 text-slate-600" />
                <span>Escuro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left, 64 = 16rem = 256px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:fixed lg:inset-y-0 lg:z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer (Slide-in Left) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-200 ease-in-out lg:hidden shadow-2xl ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
