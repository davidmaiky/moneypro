import React from 'react';
import {
  Menu,
  Plus,
  FileDown,
  Eye,
  EyeOff,
  Database,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ActiveTab } from './Header';

interface TopBarProps {
  activeTab: ActiveTab;
  onToggleMobileMenu: () => void;
  onOpenNewTransaction: () => void;
  onQuickExportPDF: () => void;
  onOpenBackupModal?: () => void;
  onOpenShortcutsModal?: () => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Visão Geral',
    subtitle: 'Resumo das finanças, saldos em conta e faturas do mês',
  },
  transactions: {
    title: 'Lançamentos & Extrato',
    subtitle: 'Histórico completo de despesas, receitas e compras parceladas',
  },
  cards: {
    title: 'Cartões de Crédito',
    subtitle: 'Gestão de faturas, limites disponíveis e simulador de parcelas',
  },
  recurring: {
    title: 'Lançamentos Fixos',
    subtitle: 'Assinaturas, contas fixas e receitas automáticas mensais',
  },
  categories: {
    title: 'Categorias & Metas',
    subtitle: 'Classificação de despesas e limites orçamentários',
  },
  forecast: {
    title: 'Projeção Futura',
    subtitle: 'Previsão de fluxo de caixa e impacto das faturas nos próximos meses',
  },
  reports: {
    title: 'Relatórios & Exportação',
    subtitle: 'Gere demonstrativos e relatórios em PDF para impressão ou arquivamento',
  },
  users: {
    title: 'Usuários & Permissões',
    subtitle: 'Gerenciamento de membros da equipe, controle de acesso e regras RBAC',
  },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onToggleMobileMenu,
  onOpenNewTransaction,
  onQuickExportPDF,
}) => {
  const {
    isPrivacyMode,
    togglePrivacyMode,
    isDbConnected,
  } = useFinance();

  const pageInfo = TAB_TITLES[activeTab] || {
    title: 'Money Pro',
    subtitle: 'Gestão Financeira Pessoal',
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left Section: Mobile Menu Trigger & Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Name */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                Money Pro
              </span>
            </div>

            {/* Desktop Page Title & Subtitle */}
            <div className="hidden lg:block truncate">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                {pageInfo.title}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {pageInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Database Status Badge */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isDbConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}
              title={
                isDbConnected
                  ? 'Banco de Dados SQLite conectado e persistindo dados em disco'
                  : 'Modo Local / Offline'
              }
            >
              <Database className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">{isDbConnected ? 'SQLite Conectado' : 'Offline'}</span>
            </div>

            {/* Privacy Mode Toggle */}
            <button
              type="button"
              onClick={togglePrivacyMode}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isPrivacyMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title={
                isPrivacyMode
                  ? 'Exibir valores (P) - Modo Privacidade Ativo'
                  : 'Ocultar valores em público (P)'
              }
              aria-label="Modo Privacidade"
            >
              {isPrivacyMode ? (
                <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            {/* Quick Export PDF */}
            <button
              type="button"
              onClick={onQuickExportPDF}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Exportar PDF do mês selecionado"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar PDF</span>
            </button>

            {/* Novo Lançamento Primary Button */}
            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-xs transition-all whitespace-nowrap cursor-pointer active:scale-98"
              title="Novo Lançamento (Atalho: N)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
              <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/30 text-emerald-950 rounded">
                N
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
