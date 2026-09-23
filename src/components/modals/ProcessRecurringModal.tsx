import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, Wallet, CreditCard as CardIcon, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { RecurringTransaction } from '../../types/finance';
import { formatCurrency, formatMonthYear, parseCurrencyInput } from '../../utils/formatters';

interface ProcessRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurring: RecurringTransaction | null;
  targetMonth: string;
}

export const ProcessRecurringModal: React.FC<ProcessRecurringModalProps> = ({
  isOpen,
  onClose,
  recurring,
  targetMonth,
}) => {
  const { accounts, cards, processRecurringForMonth } = useFinance();
  const [amountStr, setAmountStr] = useState('');

  useEffect(() => {
    if (recurring) {
      setAmountStr(recurring.amount.toFixed(2).replace('.', ','));
    }
  }, [recurring, isOpen]);

  if (!isOpen || !recurring) return null;

  const targetAccount = accounts.find(a => a.id === recurring.accountId);
  const targetCard = cards.find(c => c.id === recurring.creditCardId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseCurrencyInput(amountStr);

    if (finalAmount <= 0) {
      alert('O valor do lançamento deve ser maior que zero.');
      return;
    }

    processRecurringForMonth(recurring.id, targetMonth, finalAmount);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Confirmar Lançamento no Mês
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                {formatMonthYear(targetMonth)}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Item a ser lançado:</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {recurring.description}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 pt-1">
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Dia {recurring.dayOfMonth}</span>
              </span>
              <span>·</span>
              {recurring.paymentMethod === 'credit_card' ? (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <CardIcon className="w-3.5 h-3.5" />
                  <span>{targetCard?.name || 'Cartão de Crédito'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{targetAccount?.name || 'Conta Bancária'}</span>
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Valor a lançar em {formatMonthYear(targetMonth)} (R$)
            </label>
            <input
              type="text"
              required
              value={amountStr}
              onChange={e => setAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
              placeholder="0,00"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-base font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Valor padrão configurado: {formatCurrency(recurring.amount)}. Você pode ajustar caso a conta tenha oscilado neste mês.
            </p>
          </div>

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
              Confirmar e Lançar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
