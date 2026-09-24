import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard as CardIcon,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Tag,
  FileText,
  Plus,
  Edit3,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PaymentMethod, Transaction, TransactionType } from '../../types/finance';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';
import { calculateInvoiceMonth } from '../../utils/creditCardUtils';
import { CategoryModal } from './CategoryModal';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  defaultType?: TransactionType;
  defaultPaymentMethod?: PaymentMethod;
  defaultCardId?: string;
  onOpenNewAccount?: () => void;
  onOpenNewCard?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
  defaultType = 'expense',
  defaultPaymentMethod = 'credit_card',
  defaultCardId,
  onOpenNewAccount,
  onOpenNewCard,
}) => {
  const {
    accounts,
    cards,
    categories,
    addTransaction,
    addCreditCardPurchase,
    updateTransaction,
  } = useFinance();

  const isEditing = Boolean(transactionToEdit);

  const [type, setType] = useState<TransactionType>(defaultType);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => getTodayDateString());
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [cardId, setCardId] = useState(defaultCardId || cards[0]?.id || '');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'completed' | 'pending'>('completed');
  const [updateEntireSeries, setUpdateEntireSeries] = useState(false);
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);

  const prevIsOpenRef = useRef(false);
  const prevEditIdRef = useRef<string | null>(null);

  // Synchronize fields on open or when transactionToEdit changes
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isEditTargetChanged = transactionToEdit?.id !== prevEditIdRef.current;

    if (isOpen && (isOpening || isEditTargetChanged)) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setPaymentMethod(transactionToEdit.paymentMethod);
        setDescription(transactionToEdit.description);
        setAmountStr(String(transactionToEdit.amount).replace('.', ','));
        setDate(transactionToEdit.date);
        setCategoryId(transactionToEdit.categoryId);
        setAccountId(transactionToEdit.accountId || accounts[0]?.id || '');
        setCardId(transactionToEdit.creditCardId || cards[0]?.id || '');
        setNotes(transactionToEdit.notes || '');
        setStatus(transactionToEdit.status || 'completed');
        setInstallmentsCount(transactionToEdit.installments?.total || 1);
        setUpdateEntireSeries(false);
      } else {
        setType(defaultType);
        const effectiveMethod =
          defaultPaymentMethod === 'credit_card' && cards.length === 0 ? 'account' : defaultPaymentMethod;
        setPaymentMethod(effectiveMethod);
        setDescription('');
        setAmountStr('');
        setDate(getTodayDateString());
        setNotes('');
        setStatus('completed');
        setInstallmentsCount(1);
        setUpdateEntireSeries(false);

        if (cards.length > 0 && (!cardId || !cards.some(c => c.id === cardId))) {
          setCardId(defaultCardId || cards[0].id);
        }
        if (accounts.length > 0 && (!accountId || !accounts.some(a => a.id === accountId))) {
          setAccountId(accounts[0].id);
        }
      }
    }
    prevIsOpenRef.current = isOpen;
    prevEditIdRef.current = transactionToEdit?.id ?? null;
  }, [isOpen, transactionToEdit, defaultType, defaultPaymentMethod, defaultCardId, cards, accounts]);

  // Auto-select first matching category if empty
  useEffect(() => {
    if (!categoryId && isOpen) {
      const match = categories.find(c => c.type === type);
      if (match) setCategoryId(match.id);
    }
  }, [type, categories, categoryId, isOpen]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;
  const selectedCard = cards.find(c => c.id === cardId);
  const calculatedInvoiceMonth = selectedCard && date ? calculateInvoiceMonth(date, selectedCard) : null;
  const perInstallmentAmount = installmentsCount > 0 ? numericAmount / installmentsCount : numericAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || numericAmount <= 0) return;

    if (isEditing && transactionToEdit) {
      // Editing existing transaction
      if (type === 'expense' && paymentMethod === 'credit_card') {
        updateTransaction(
          transactionToEdit.id,
          {
            description: description.trim(),
            amount: numericAmount,
            type,
            date,
            categoryId: categoryId || categories.find(c => c.type === 'expense')?.id || 'cat_outros',
            paymentMethod: 'credit_card',
            creditCardId: selectedCard ? selectedCard.id : undefined,
            accountId: undefined,
            status,
            notes: notes.trim() || undefined,
            invoiceMonth: calculatedInvoiceMonth || transactionToEdit.invoiceMonth,
          },
          updateEntireSeries
        );
      } else {
        updateTransaction(
          transactionToEdit.id,
          {
            description: description.trim(),
            amount: numericAmount,
            type,
            date,
            categoryId: categoryId || categories.find(c => c.type === type)?.id || 'cat_outros',
            paymentMethod: 'account',
            accountId: accountId || undefined,
            creditCardId: undefined,
            status,
            notes: notes.trim() || undefined,
          },
          false
        );
      }
    } else {
      // Adding new transaction
      if (type === 'expense' && paymentMethod === 'credit_card') {
        if (!selectedCard) {
          return;
        }
        addCreditCardPurchase({
          description: description.trim(),
          totalAmount: numericAmount,
          installmentsCount: Math.max(1, installmentsCount),
          purchaseDate: date,
          categoryId: categoryId || categories.find(c => c.type === 'expense')?.id || 'cat_outros',
          cardId: selectedCard.id,
          notes: notes.trim() || undefined,
          status,
        });
      } else {
        addTransaction({
          description: description.trim(),
          amount: numericAmount,
          type,
          date,
          categoryId: categoryId || categories.find(c => c.type === type)?.id || 'cat_outros',
          paymentMethod: type === 'income' ? 'account' : paymentMethod,
          accountId: (type === 'income' || paymentMethod === 'account') && accountId ? accountId : undefined,
          creditCardId: undefined,
          status,
          notes: notes.trim() || undefined,
        });
      }
    }

    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === type && c.id !== 'cat_fatura');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isEditing
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isEditing ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isEditing
                  ? 'Modifique os detalhes, categoria, conta ou valor deste lançamento'
                  : 'Cadastre uma receita, despesa em conta ou compra no cartão'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[calc(90vh-4rem)]">
          {/* Transaction Type Segmented Control */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setType('expense');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-white dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-rose-500/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setPaymentMethod('account');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-emerald-500/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Receita</span>
            </button>
          </div>

          {/* Payment Method Switcher (only for expenses) */}
          {type === 'expense' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  paymentMethod === 'credit_card'
                    ? 'border-purple-500/80 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CardIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Cartão de Crédito</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('account')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  paymentMethod === 'account'
                    ? 'border-emerald-500/80 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Conta Corrente / Débito</span>
              </button>
            </div>
          )}

          {/* Value and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEditing && transactionToEdit?.installments
                  ? 'Valor Desta Parcela (R$)'
                  : 'Valor Total (R$)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm font-mono font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data do Lançamento
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Supermercado, Salário, Notebook..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Conditional Target: Card or Bank Account */}
          {type === 'expense' && paymentMethod === 'credit_card' ? (
            <div className="space-y-3 p-3.5 bg-purple-50/50 dark:bg-slate-800/40 rounded-lg border border-purple-200 dark:border-purple-500/20">
              {cards.length === 0 ? (
                <div className="space-y-2 text-xs py-1">
                  <p className="text-slate-600 dark:text-slate-300">Nenhum cartão de crédito cadastrado.</p>
                  {onOpenNewCard && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNewCard();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Cartão Agora</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-purple-800 dark:text-purple-300">
                          Cartão de Crédito
                        </label>
                        {onOpenNewCard && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenNewCard();
                            }}
                            className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Novo Cartão</span>
                          </button>
                        )}
                      </div>
                      <select
                        value={cardId}
                        onChange={e => setCardId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-purple-500"
                      >
                        {cards.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} (•••• {c.last4})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isEditing ? (
                      <div>
                        <label className="block text-xs font-medium text-purple-800 dark:text-purple-300 mb-1">
                          Número de Parcelas
                        </label>
                        <select
                          value={installmentsCount}
                          onChange={e => setInstallmentsCount(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 dark:text-white focus:outline-hidden focus:border-purple-500"
                        >
                          <option value={1}>À vista (1x)</option>
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(n => (
                            <option key={n} value={n}>
                              {n}x de {formatCurrency(numericAmount > 0 ? numericAmount / n : 0)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-purple-800 dark:text-purple-300 mb-1">
                          Fatura Vinculada
                        </label>
                        <div className="w-full bg-white/70 dark:bg-slate-800/70 border border-purple-200 dark:border-purple-800/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-700 dark:text-purple-300">
                          {calculatedInvoiceMonth || transactionToEdit?.invoiceMonth || 'Mês Atual'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Installment series banner when editing */}
                  {isEditing && transactionToEdit?.installments && (
                    <div className="p-3 bg-purple-100/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-purple-900 dark:text-purple-200">
                        <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>
                          Parcela {transactionToEdit.installments.current} de {transactionToEdit.installments.total}
                        </span>
                        <span className="text-[11px] text-purple-600 dark:text-purple-400">
                          (Total da compra: {formatCurrency(transactionToEdit.installments.totalPurchaseAmount)})
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-purple-800 dark:text-purple-300 cursor-pointer pt-1 border-t border-purple-200/60 dark:border-purple-800/40">
                        <input
                          type="checkbox"
                          checked={updateEntireSeries}
                          onChange={e => setUpdateEntireSeries(e.target.checked)}
                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Atualizar descrição, categoria e observações em todas as parcelas</span>
                      </label>
                    </div>
                  )}

                  {/* Installment preview & Invoice cycle info for new purchase */}
                  {!isEditing && selectedCard && (
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-2.5 rounded-md border border-purple-200/80 dark:border-slate-700/60 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Ciclo da fatura:</span>
                        <span>
                          Fecha dia <strong className="text-purple-700 dark:text-purple-300">{selectedCard.closingDay}</strong> · Vence dia <strong className="text-purple-700 dark:text-purple-300">{selectedCard.dueDay}</strong>
                        </span>
                      </div>
                      {calculatedInvoiceMonth && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400">1ª Parcela cai em:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                            Fatura de {calculatedInvoiceMonth}
                          </span>
                        </div>
                      )}
                      {installmentsCount > 1 && numericAmount > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                          <span className="text-slate-500 dark:text-slate-400">Plano de parcelamento:</span>
                          <span className="font-mono text-purple-700 dark:text-purple-300 font-semibold">
                            {installmentsCount} parcelas de {formatCurrency(perInstallmentAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {type === 'income' ? 'Conta de Destino' : 'Conta de Débito'}
                </label>
                {onOpenNewAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNewAccount();
                    }}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Nova Conta</span>
                  </button>
                )}
              </div>
              {accounts.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>Nenhuma conta cadastrada (lançamento sem saldo vinculado).</span>
                  {onOpenNewAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNewAccount();
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 self-start sm:self-auto cursor-pointer"
                    >
                      Cadastrar Conta
                    </button>
                  )}
                </div>
              ) : (
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-emerald-500"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName}) - Saldo: {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Categoria
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickCategoryOpen(true)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Nova</span>
                </button>
              </div>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-emerald-500"
              >
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Situação / Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('completed')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    status === 'completed'
                      ? 'border-emerald-500/80 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Concluído</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    status === 'pending'
                      ? 'border-amber-500/80 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pendente</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Anotações adicionais, tags ou recibo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer active:scale-98 ${
                isEditing
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-900'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-900'
              }`}
            >
              {isEditing ? 'Salvar Alterações' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>

      <CategoryModal
        isOpen={isQuickCategoryOpen}
        onClose={() => setIsQuickCategoryOpen(false)}
        defaultType={type}
        onCategorySaved={savedCat => setCategoryId(savedCat.id)}
      />
    </div>
  );
};
