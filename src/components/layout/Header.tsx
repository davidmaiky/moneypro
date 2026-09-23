import React from 'react';
import { Plus, FileDown, ChevronLeft, ChevronRight, Calendar, Sun, Moon, Repeat, Eye, EyeOff, Database, Keyboard } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useTheme } from '../../context/ThemeContext';
import { addMonthsToMonthString, formatMonthYear } from '../../utils/formatters';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export type ActiveTab = 'dashboard' | 'transactions' | 'cards' | 'recurring' | 'categories' | 'forecast' | 'reports' | 'users';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTransaction: () => void;
  onQuickExportPDF: () => void;
  onOpenBackupModal?: () => void;
  onOpenShortcutsModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  onQuickExportPDF,
  onOpenBackupModal,
  onOpenShortcutsModal,
}) => {
  const { selectedMonth, setSelectedMonth, recurringTransactions, isPrivacyMode, togglePrivacyMode } = useFinance();
  const { resolvedTheme, toggleTheme } = useTheme();

  const handlePrevMonth = () => {
    setSelectedMonth(addMonthsToMonthString(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonthsToMonthString(selectedMonth, 1));
  };

  const pendingRecurringCount = recurringTransactions.filter(
    r => r.active && (!r.generatedMonths || !r.generatedMonths.includes(selectedMonth))
  ).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Zone 1 - Zone 2 - Zone 3 Row */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand title, one line */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-left group cursor-pointer focus:outline-hidden"
            >
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                FinanFlow
              </span>
            </button>

            {/* Month Navigator Segment */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-1 border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                className="p-1 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 select-none">
                <Calendar className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span className="capitalize">{formatMonthYear(selectedMonth)}</span>
              </div>
              <button
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                className="p-1 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zone 2: 4-6 Nav links with clean typography */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              Lançamentos
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              Cartões & Faturas
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'recurring'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              <span>Fixos & Recorrentes</span>
              {pendingRecurringCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {pendingRecurringCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              Categorias
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'forecast'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              Projeção Futura
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              Relatórios PDF
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs dark:shadow-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
              }`}
            >
              Usuários & Acesso
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions + theme toggle + privacy & backup */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Privacy Mode Toggle */}
            <button
              type="button"
              onClick={togglePrivacyMode}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isPrivacyMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title={isPrivacyMode ? 'Exibir valores (P) - Modo Privacidade Ativo' : 'Ocultar valores em público (P)'}
              aria-label="Modo Privacidade"
            >
              {isPrivacyMode ? (
                <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            {/* Backup & Restore JSON */}
            {onOpenBackupModal && (
              <button
                type="button"
                onClick={onOpenBackupModal}
                className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Backup & Restauração JSON (B)"
                aria-label="Backup e Restauração"
              >
                <Database className="w-4 h-4" />
              </button>
            )}

            {/* Keyboard Shortcuts */}
            {onOpenShortcutsModal && (
              <button
                type="button"
                onClick={onOpenShortcutsModal}
                className="hidden md:flex p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Atalhos Rápidos de Teclado (?)"
                aria-label="Atalhos de Teclado"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
              title={resolvedTheme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              aria-label="Alternar tema claro/escuro"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <button
              onClick={onQuickExportPDF}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Exportar PDF do mês selecionado"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-98"
              title="Novo Lançamento (N)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden items-center justify-between py-2 border-t border-slate-200 dark:border-slate-800/80 overflow-x-auto gap-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Lançamentos
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'cards'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Cartões & Faturas
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Recorrentes
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'forecast'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Projeção
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Relatórios
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Usuários
          </button>
          {/* Mobile month toggle */}
          <div className="flex sm:hidden items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[11px] gap-1 shrink-0 text-slate-700 dark:text-slate-200">
            <button onClick={handlePrevMonth}><ChevronLeft className="w-3 h-3" /></button>
            <span className="capitalize">{formatMonthYear(selectedMonth).slice(0, 7)}</span>
            <button onClick={handleNextMonth}><ChevronRight className="w-3 h-3" /></button>
          </div>
        </div>
      </div>
    </header>
  );
};
