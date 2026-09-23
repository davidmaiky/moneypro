import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CreditCard } from '../../types/finance';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard | null;
  invoiceMonth: string;
  totalAmount: number;
}

export const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({
  isOpen,
  onClose,
  card,
  invoiceMonth,
  totalAmount,
}) => {
  const { accounts, payInvoice } = useFinance();
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [isSuccess, setIsSuccess] = useState(false);

  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  if (!isOpen || !card) return null;

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const hasSufficientBalance = selectedAccount ? selectedAccount.balance >= totalAmount : false;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || totalAmount <= 0) return;

    payInvoice(card.id, invoiceMonth, selectedAccountId);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Pagar Fatura de Cartão</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Fatura Paga com Sucesso!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O valor de {formatCurrency(totalAmount)} foi liquidado e seu limite disponível foi liberado.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[calc(90vh-4rem)]">
            {/* Invoice summary box */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span>Cartão:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {card.name} (•••• {card.last4})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span>Mês de Referência:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400 capitalize">
                  {formatMonthYear(invoiceMonth)}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Valor da Fatura:</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Select account to debit */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Debitar da Conta Bancária</span>
              </label>
              <div className="space-y-2">
                {accounts.map(acc => {
                  const isSelected = selectedAccountId === acc.id;
                  const isLow = acc.balance < totalAmount;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{acc.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{acc.bankName}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-mono font-semibold ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {formatCurrency(acc.balance)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-400">Saldo disponível</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!hasSufficientBalance && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Atenção: O saldo da conta selecionada é menor que o valor da fatura.</span>
              </div>
            )}

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
                disabled={totalAmount <= 0}
                className="px-5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
              >
                Confirmar Pagamento
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
