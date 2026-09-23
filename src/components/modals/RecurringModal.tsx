import React, { useState, useEffect } from 'react';
import { X, Repeat, ArrowUpRight, ArrowDownRight, Wallet, CreditCard as CardIcon, Sparkles, Plus } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { PaymentMethod, RecurringTransaction, TransactionType } from '../../types/finance';
import { parseCurrencyInput } from '../../utils/formatters';
import { CategoryModal } from './CategoryModal';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringToEdit?: RecurringTransaction | null;
  defaultType?: TransactionType;
}

const PRESETS = [
  { label: 'Salário', type: 'income' as TransactionType, icon: '💼', catId: 'cat_salario', amount: '' },
  { label: 'Aluguel', type: 'expense' as TransactionType, icon: '🏠', catId: 'cat_moradia', amount: '' },
  { label: 'Condomínio', type: 'expense' as TransactionType, icon: '🏢', catId: 'cat_moradia', amount: '' },
  { label: 'Energia Elétrica', type: 'expense' as TransactionType, icon: '⚡', catId: 'cat_moradia', amount: '' },
  { label: 'Internet / Wi-Fi', type: 'expense' as TransactionType, icon: '🌐', catId: 'cat_servicos', amount: '120,00' },
  { label: 'Netflix', type: 'expense' as TransactionType, icon: '🎬', catId: 'cat_lazer', amount: '59,90' },
  { label: 'Spotify', type: 'expense' as TransactionType, icon: '🎵', catId: 'cat_lazer', amount: '21,90' },
  { label: 'Academia', type: 'expense' as TransactionType, icon: '🏋️', catId: 'cat_saude', amount: '129,90' },
  { label: 'Plano de Saúde', type: 'expense' as TransactionType, icon: '🩺', catId: 'cat_saude', amount: '' },
  { label: 'Faculdade / Escola', type: 'expense' as TransactionType, icon: '📚', catId: 'cat_educacao', amount: '' },
];

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  recurringToEdit,
  defaultType = 'expense',
}) => {
  const { categories, accounts, cards, addRecurringTransaction, updateRecurringTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(10);
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('account');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [autoProcess, setAutoProcess] = useState(true);
  const [notes, setNotes] = useState('');
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);

  useEffect(() => {
    if (recurringToEdit) {
      setType(recurringToEdit.type);
      setDescription(recurringToEdit.description);
      setAmountStr(recurringToEdit.amount ? recurringToEdit.amount.toFixed(2).replace('.', ',') : '');
      setDayOfMonth(recurringToEdit.dayOfMonth || 10);
      setCategoryId(recurringToEdit.categoryId);
      setPaymentMethod(recurringToEdit.paymentMethod);
      setAccountId(recurringToEdit.accountId || (accounts[0]?.id || ''));
      setCreditCardId(recurringToEdit.creditCardId || (cards[0]?.id || ''));
      setAutoProcess(recurringToEdit.autoProcess);
      setNotes(recurringToEdit.notes || '');
    } else {
      setType(defaultType);
      setDescription('');
      setAmountStr('');
      setDayOfMonth(10);
      setPaymentMethod(defaultType === 'income' ? 'account' : 'account');
      setAccountId(accounts[0]?.id || '');
      setCreditCardId(cards[0]?.id || '');
      setAutoProcess(true);
      setNotes('');

      const filtered = categories.filter(c => c.type === defaultType && c.id !== 'cat_fatura');
      if (filtered.length > 0) {
        setCategoryId(filtered[0].id);
      }
    }
  }, [recurringToEdit, isOpen, defaultType, accounts, cards, categories]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type && c.id !== 'cat_fatura');

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setType(preset.type);
    setDescription(preset.label);
    if (preset.amount) {
      setAmountStr(preset.amount);
    }
    const matchingCat = categories.find(c => c.id === preset.catId);
    if (matchingCat) {
      setCategoryId(matchingCat.id);
    }
    if (preset.type === 'income') {
      setPaymentMethod('account');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseCurrencyInput(amountStr);

    if (numericAmount <= 0) {
      alert('Por favor, informe um valor maior que zero.');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, informe a descrição do lançamento recorrente.');
      return;
    }

    const payload = {
      description: description.trim(),
      amount: numericAmount,
      type,
      categoryId: categoryId || (filteredCategories[0]?.id || 'cat_outros_desp'),
      paymentMethod,
      accountId: paymentMethod === 'account' ? (accountId || undefined) : undefined,
      creditCardId: paymentMethod === 'credit_card' ? (creditCardId || undefined) : undefined,
      dayOfMonth: Number(dayOfMonth) || 1,
      autoProcess,
      active: true,
      notes: notes.trim() || undefined,
    };

    if (recurringToEdit) {
      updateRecurringTransaction(recurringToEdit.id, payload);
    } else {
      addRecurringTransaction(payload);
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{recurringToEdit ? 'Editar Recorrência / Despesa Fixa' : 'Nova Recorrência / Despesa Fixa'}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Quick Presets Carousel (if new) */}
          {!recurringToEdit && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sugestões Rápidas de Contas Fixas:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pb-1">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type Segmented Control */}
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
              <span>Despesa Fixa</span>
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
              <span>Receita Fixa</span>
            </button>
          </div>

          {/* Description & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrição da Conta ou Receita
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Aluguel do Apartamento, Salário, Internet..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor Previsto (R$)
              </label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Day of Month & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dia de Vencimento / Recebimento no Mês
              </label>
              <select
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    Todo dia {day} do mês
                  </option>
                ))}
              </select>
            </div>

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
                  <span>Nova Categoria</span>
                </button>
              </div>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method (for expenses) */}
          {type === 'expense' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
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
                  <span>Débito / Conta</span>
                </button>
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
              </div>
            </div>
          )}

          {/* Account or Card selector */}
          {paymentMethod === 'account' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {type === 'income' ? 'Conta Bancária de Depósito' : 'Conta Bancária de Débito'}
              </label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                {accounts.length === 0 ? (
                  <option value="">Nenhuma conta cadastrada</option>
                ) : (
                  accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName})
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cartão de Crédito
              </label>
              <select
                value={creditCardId}
                onChange={e => setCreditCardId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                {cards.length === 0 ? (
                  <option value="">Nenhum cartão cadastrado</option>
                ) : (
                  cards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (•••• {c.last4})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Auto Process Mode Toggle Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Lançamento Automático
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {autoProcess
                    ? 'O FinanFlow lança e atualiza o saldo/fatura automaticamente quando a data de vencimento chega.'
                    : 'Apenas projeta e solicita sua confirmação em 1 clique (ideal para valores que variam, como luz e água).'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={e => setAutoProcess(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Código do cliente, débito automático contratado no banco..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
            >
              {recurringToEdit ? 'Atualizar Recorrência' : 'Salvar Recorrência'}
            </button>
          </div>
        </form>
      </div>

      <CategoryModal
        isOpen={isQuickCategoryOpen}
        onClose={() => setIsQuickCategoryOpen(false)}
        defaultType={type}
        onCategorySaved={(savedCat) => setCategoryId(savedCat.id)}
      />
    </div>
  );
};
