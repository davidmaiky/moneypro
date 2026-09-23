import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Database,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  FolderArchive,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { getTodayDateString } from '../../utils/formatters';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    cards,
    categories,
    transactions,
    recurringTransactions,
    paidInvoices,
    exportBackupJSON,
    importBackupJSON,
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);

  // Import flow state
  const [importFileContent, setImportFileContent] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<{
    valid: boolean;
    error?: string;
    summary?: {
      accounts: number;
      cards: number;
      categories: number;
      transactions: number;
      recurring: number;
      paidInvoices: number;
      exportedAt?: string;
    };
  } | null>(null);

  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  // Handle Export Download
  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanflow-backup-${getTodayDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const handleCopyBackup = async () => {
    try {
      const jsonStr = exportBackupJSON();
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setImportFileContent(content);

      try {
        const parsed = JSON.parse(content);
        const accountsCount = Array.isArray(parsed.accounts) ? parsed.accounts.length : 0;
        const cardsCount = Array.isArray(parsed.cards) ? parsed.cards.length : 0;
        const categoriesCount = Array.isArray(parsed.categories) ? parsed.categories.length : 0;
        const transactionsCount = Array.isArray(parsed.transactions) ? parsed.transactions.length : 0;
        const recurringCount = Array.isArray(parsed.recurringTransactions)
          ? parsed.recurringTransactions.length
          : Array.isArray(parsed.recurring)
          ? parsed.recurring.length
          : 0;
        const invoicesCount = Array.isArray(parsed.paidInvoices) ? parsed.paidInvoices.length : 0;

        if (accountsCount === 0 && cardsCount === 0 && transactionsCount === 0) {
          setParsedPreview({
            valid: false,
            error: 'O arquivo JSON não contém coleções financeiras reconhecíveis do FinanFlow.',
          });
        } else {
          setParsedPreview({
            valid: true,
            summary: {
              accounts: accountsCount,
              cards: cardsCount,
              categories: categoriesCount,
              transactions: transactionsCount,
              recurring: recurringCount,
              paidInvoices: invoicesCount,
              exportedAt: parsed.exportedAt,
            },
          });
        }
      } catch (err) {
        setParsedPreview({
          valid: false,
          error: 'Formato de arquivo inválido. Certifique-se de que é um JSON legível.',
        });
      }
    };
    reader.readAsText(file);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (!importFileContent) return;
    const result = importBackupJSON(importFileContent, importMode);
    if (result.success) {
      setImportStatus({
        type: 'success',
        message: result.message,
      });
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setImportStatus({
        type: 'error',
        message: result.message,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Backup & Restauração Completa
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exporte para Google Drive ou migre para outro dispositivo com segurança
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Arquivo JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar / Importar</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                    <p className="font-semibold text-sm">Privacidade Total e Portabilidade</p>
                    <p className="text-slate-600 dark:text-slate-300">
                      O arquivo <code className="bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded text-[11px]">.json</code> gerado contém 100% dos seus dados (contas bancárias, limites de cartão, faturas, categorias personalizadas e histórico de lançamentos). Salve-o no seu Google Drive, pen-drive ou envie para outro computador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Dados inclusos no arquivo de backup:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-slate-400 text-[11px] block">Contas Bancárias</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {accounts.length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-slate-400 text-[11px] block">Cartões de Crédito</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {cards.length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-slate-400 text-[11px] block">Categorias</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {categories.length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-slate-400 text-[11px] block">Lançamentos</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {transactions.length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-slate-400 text-[11px] block">Recorrentes</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {recurringTransactions.length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-slate-400 text-[11px] block">Faturas Pagas</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {paidInvoices.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo .JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyBackup}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File input trigger */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              {!parsedPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <FileJson className="w-10 h-10 mx-auto text-indigo-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Clique aqui para selecionar o arquivo .JSON de backup
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Suporta arquivos gerados pelo FinanFlow
                  </p>
                </div>
              ) : parsedPreview.valid && parsedPreview.summary ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                        {importFileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedPreview(null);
                        setImportFileContent('');
                        setImportFileName('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Trocar arquivo
                    </button>
                  </div>

                  {/* Summary of what will be restored */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Conteúdo detectado no backup:
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400">
                        • {parsedPreview.summary.transactions} lançamentos
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        • {parsedPreview.summary.accounts} contas
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        • {parsedPreview.summary.cards} cartões
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        • {parsedPreview.summary.categories} categorias
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        • {parsedPreview.summary.recurring} recorrentes
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        • {parsedPreview.summary.paidInvoices} faturas pagas
                      </span>
                    </div>
                  </div>

                  {/* Mode selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Como deseja aplicar este backup?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          importMode === 'replace'
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center justify-between">
                          <span>Substituir Tudo</span>
                          {importMode === 'replace' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Substitui os dados atuais pelo conteúdo completo deste arquivo. Ideal para migração.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          importMode === 'merge'
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center justify-between">
                          <span>Mesclar / Unificar</span>
                          {importMode === 'merge' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Mantém os dados atuais e adiciona os itens do arquivo sem duplicar IDs iguais.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Confirmar e Restaurar Backup</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Erro ao analisar arquivo</span>
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-300">
                    {parsedPreview.error}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedPreview(null);
                      setImportFileContent('');
                      setImportFileName('');
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 underline font-medium cursor-pointer"
                  >
                    Tentar outro arquivo
                  </button>
                </div>
              )}

              {importStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    importStatus.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
