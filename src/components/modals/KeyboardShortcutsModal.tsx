import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      key: 'N',
      description: 'Abrir modal de Novo Lançamento (Despesa / Receita / Cartão)',
    },
    {
      key: '/',
      description: 'Focar na barra de busca de transações / categorias',
    },
    {
      key: 'P',
      description: 'Alternar Modo Privacidade (Ocultar / Revelar saldos)',
    },
    {
      key: 'B',
      description: 'Abrir Backup & Restauração (Exportar / Importar JSON)',
    },
    {
      key: 'ESC',
      description: 'Fechar modais abertos ou cancelar ação em andamento',
    },
    {
      key: '?',
      description: 'Abrir este painel de atalhos rápidos',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Atalhos Rápidos de Teclado
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aumente sua produtividade usando as teclas de atalho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 space-y-2.5">
          {shortcuts.map(sc => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60"
            >
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {sc.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-md shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2">
            Os atalhos funcionam quando você não estiver digitando em campos de texto.
          </p>
        </div>
      </div>
    </div>
  );
};
