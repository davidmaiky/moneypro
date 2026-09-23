import React, { useState, useEffect, useCallback } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ActiveTab } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { CreditCardsView } from './components/credit-cards/CreditCardsView';
import { ForecastView } from './components/forecast/ForecastView';
import { ReportsView } from './components/reports/ReportsView';
import { RecurringView } from './components/recurring/RecurringView';
import { CategoriesView } from './components/categories/CategoriesView';
import { TransactionModal } from './components/modals/TransactionModal';
import { CreditCardModal } from './components/modals/CreditCardModal';
import { PayInvoiceModal } from './components/modals/PayInvoiceModal';
import { AccountModal } from './components/modals/AccountModal';
import { RecurringModal } from './components/modals/RecurringModal';
import { ProcessRecurringModal } from './components/modals/ProcessRecurringModal';
import { PurchaseSimulatorModal } from './components/modals/PurchaseSimulatorModal';
import { AnticipateInstallmentsModal } from './components/modals/AnticipateInstallmentsModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { DeleteCategoryModal } from './components/modals/DeleteCategoryModal';
import { BackupRestoreModal } from './components/modals/BackupRestoreModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { CreditCard, Account, PaymentMethod, TransactionType, RecurringTransaction, Category } from './types/finance';
import { generateFinancialPDFReport } from './utils/pdfGenerator';
import { RotateCcw, ShieldCheck, Database, Keyboard } from 'lucide-react';

function MainApp() {
  const {
    cards,
    accounts,
    categories,
    transactions,
    paidInvoices,
    selectedMonth,
    resetToDemoData,
    togglePrivacyMode,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalDefaults, setTransactionModalDefaults] = useState<{
    type?: TransactionType;
    paymentMethod?: PaymentMethod;
    cardId?: string;
  }>({});

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);
  const [payInvoiceData, setPayInvoiceData] = useState<{
    card: CreditCard | null;
    invoiceMonth: string;
    amount: number;
  }>({ card: null, invoiceMonth: selectedMonth, amount: 0 });

  // Recurring modals state
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringToEdit, setRecurringToEdit] = useState<RecurringTransaction | null>(null);
  const [recurringDefaultType, setRecurringDefaultType] = useState<TransactionType>('expense');

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [recurringToProcess, setRecurringToProcess] = useState<RecurringTransaction | null>(null);

  // Credit Card Simulator & Anticipation state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorCardId, setSimulatorCardId] = useState<string | undefined>(undefined);

  const [isAnticipateModalOpen, setIsAnticipateModalOpen] = useState(false);
  const [anticipateParentTransactionId, setAnticipateParentTransactionId] = useState<string | undefined>(undefined);

  // Category modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryDefaultType, setCategoryDefaultType] = useState<TransactionType>('expense');

  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Backup & Shortcuts modals
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const handleOpenCategoryModal = (category?: Category | null, defaultType: TransactionType = 'expense') => {
    setCategoryToEdit(category || null);
    setCategoryDefaultType(category ? category.type : defaultType);
    setIsCategoryModalOpen(true);
  };

  const handleOpenDeleteCategoryModal = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteCategoryModalOpen(true);
  };

  const handleOpenSimulator = (cardId?: string) => {
    setSimulatorCardId(cardId);
    setIsSimulatorOpen(true);
  };

  const handleOpenAnticipateModal = (parentTransactionId?: string) => {
    setAnticipateParentTransactionId(parentTransactionId);
    setIsAnticipateModalOpen(true);
  };

  // Quick export PDF from header
  const handleQuickExportPDF = () => {
    generateFinancialPDFReport({
      month: selectedMonth,
      transactions,
      categories,
      accounts,
      cards,
      paidInvoices,
    });
  };

  const handleOpenNewTransaction = useCallback((defaults?: {
    type?: TransactionType;
    paymentMethod?: PaymentMethod;
    cardId?: string;
  }) => {
    setTransactionModalDefaults(defaults || { type: 'expense', paymentMethod: 'credit_card' });
    setIsTransactionModalOpen(true);
  }, []);

  // Global Keyboard Shortcuts (N, ESC, /, P, B, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // ESC: Close all open modals
      if (e.key === 'Escape') {
        setIsTransactionModalOpen(false);
        setIsCardModalOpen(false);
        setIsAccountModalOpen(false);
        setIsPayInvoiceModalOpen(false);
        setIsRecurringModalOpen(false);
        setIsProcessModalOpen(false);
        setIsSimulatorOpen(false);
        setIsAnticipateModalOpen(false);
        setIsCategoryModalOpen(false);
        setIsDeleteCategoryModalOpen(false);
        setIsBackupModalOpen(false);
        setIsShortcutsModalOpen(false);
        return;
      }

      // Do not trigger single-key actions if the user is typing in an input/textarea
      if (isInput) return;

      // N: Open New Transaction Modal
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleOpenNewTransaction();
        return;
      }

      // /: Focus search input
      if (e.key === '/') {
        e.preventDefault();
        setActiveTab('transactions');
        setTimeout(() => {
          const searchInput = document.getElementById('global-search-input') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 50);
        return;
      }

      // P: Toggle Privacy Mode (Ocultar Valores)
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePrivacyMode();
        return;
      }

      // B: Open Backup & Restore JSON Modal
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setIsBackupModalOpen(true);
        return;
      }

      // ?: Open Keyboard Shortcuts cheat sheet
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenNewTransaction, togglePrivacyMode]);

  const handleOpenCardModal = (card?: CreditCard) => {
    setCardToEdit(card || null);
    setIsCardModalOpen(true);
  };

  const handleOpenPayInvoice = (cardId: string, invoiceMonth: string, amount: number) => {
    const card = cards.find(c => c.id === cardId) || null;
    setPayInvoiceData({
      card,
      invoiceMonth,
      amount,
    });
    setIsPayInvoiceModalOpen(true);
  };

  const handleOpenAccountModal = (account?: Account) => {
    setAccountToEdit(account || null);
    setIsAccountModalOpen(true);
  };

  const handleOpenRecurringModal = (
    recurring?: RecurringTransaction | null,
    defaultType: TransactionType = 'expense'
  ) => {
    setRecurringToEdit(recurring || null);
    setRecurringDefaultType(recurring ? recurring.type : defaultType);
    setIsRecurringModalOpen(true);
  };

  const handleOpenProcessModal = (recurring: RecurringTransaction) => {
    setRecurringToProcess(recurring);
    setIsProcessModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-150">
      {/* Left Sidebar Navigation (Desktop fixed left, Mobile slide-in drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenNewTransaction={() => handleOpenNewTransaction()}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
      />

      {/* Main Content Area (Offset for Desktop Left Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* TopBar for page header, month switcher and quick actions */}
        <TopBar
          activeTab={activeTab}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          onOpenNewTransaction={() => handleOpenNewTransaction()}
          onQuickExportPDF={handleQuickExportPDF}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        />

        {/* Content Views */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              setActiveTab={setActiveTab}
              onOpenNewTransaction={() => handleOpenNewTransaction()}
              onPayCardInvoice={handleOpenPayInvoice}
              onOpenNewAccount={() => handleOpenAccountModal()}
              onOpenNewCard={() => handleOpenCardModal()}
              onOpenRecurringModal={() => handleOpenRecurringModal(null, 'expense')}
              onOpenProcessModal={handleOpenProcessModal}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              onOpenNewTransaction={() => handleOpenNewTransaction()}
            />
          )}

          {activeTab === 'cards' && (
            <CreditCardsView
              onOpenNewPurchase={(cardId) =>
                handleOpenNewTransaction({
                  type: 'expense',
                  paymentMethod: 'credit_card',
                  cardId,
                })
              }
              onOpenCardModal={handleOpenCardModal}
              onPayInvoice={handleOpenPayInvoice}
              onOpenSimulator={handleOpenSimulator}
              onOpenAnticipateModal={handleOpenAnticipateModal}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringView
              onOpenRecurringModal={handleOpenRecurringModal}
              onOpenProcessModal={handleOpenProcessModal}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              onOpenCategoryModal={handleOpenCategoryModal}
              onOpenDeleteModal={handleOpenDeleteCategoryModal}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastView
              onOpenSimulator={() => handleOpenSimulator()}
              onOpenAnticipateModal={handleOpenAnticipateModal}
            />
          )}

          {activeTab === 'reports' && <ReportsView />}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 py-6 text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Money Pro</span>
              <span>·</span>
              <span>Controle Financeiro Pessoal & Gestão de Cartões</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Backup JSON (B)</span>
              </button>
              <span>·</span>
              <button
                onClick={() => setIsShortcutsModalOpen(true)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Atalhos (?)</span>
              </button>
              <span>·</span>
              <button
                onClick={() => {
                  if (confirm('Deseja zerar e limpar todos os seus registros financeiros?')) {
                    resetToDemoData();
                  }
                }}
                className="flex items-center gap-1.5 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar dados</span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        defaultType={transactionModalDefaults.type}
        defaultPaymentMethod={transactionModalDefaults.paymentMethod}
        defaultCardId={transactionModalDefaults.cardId}
        onOpenNewAccount={() => handleOpenAccountModal()}
        onOpenNewCard={() => handleOpenCardModal()}
      />

      <CreditCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cardToEdit={cardToEdit}
      />

      <PayInvoiceModal
        isOpen={isPayInvoiceModalOpen}
        onClose={() => setIsPayInvoiceModalOpen(false)}
        card={payInvoiceData.card}
        invoiceMonth={payInvoiceData.invoiceMonth}
        totalAmount={payInvoiceData.amount}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accountToEdit={accountToEdit}
      />

      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        recurringToEdit={recurringToEdit}
        defaultType={recurringDefaultType}
      />

      <ProcessRecurringModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        recurring={recurringToProcess}
        targetMonth={selectedMonth}
      />

      <PurchaseSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        defaultCardId={simulatorCardId}
        onPurchaseCreated={() => setActiveTab('cards')}
      />

      <AnticipateInstallmentsModal
        isOpen={isAnticipateModalOpen}
        onClose={() => setIsAnticipateModalOpen(false)}
        initialParentTransactionId={anticipateParentTransactionId}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={categoryToEdit}
        defaultType={categoryDefaultType}
      />

      <DeleteCategoryModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => setIsDeleteCategoryModalOpen(false)}
        category={categoryToDelete}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}
