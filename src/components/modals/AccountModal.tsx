import React, { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Account } from '../../types/finance';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
}) => {
  const { addAccount, updateAccount } = useFinance();

  const [name, setName] = useState(accountToEdit?.name || '');
  const [bankName, setBankName] = useState(accountToEdit?.bankName || '');
  const [type, setType] = useState<Account['type']>(accountToEdit?.type || 'checking');
  const [balanceStr, setBalanceStr] = useState(accountToEdit ? String(accountToEdit.balance) : '1000');
  const [color, setColor] = useState(accountToEdit?.color || '#059669');

  React.useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setBankName(accountToEdit.bankName);
      setType(accountToEdit.type);
      setBalanceStr(String(accountToEdit.balance));
      setColor(accountToEdit.color);
    } else {
      setName('');
      setBankName('');
      setType('checking');
      setBalanceStr('1000');
      setColor('#059669');
    }
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(balanceStr.replace(',', '.')) || 0;
    if (!name.trim()) return;

    if (accountToEdit) {
      updateAccount(accountToEdit.id, {
        name: name.trim(),
        bankName: bankName.trim(),
        type,
        balance,
        color,
      });
    } else {
      addAccount({
        name: name.trim(),
        bankName: bankName.trim() || 'Banco',
        type,
        balance,
        color,
      });
    }

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
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{accountToEdit ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome da Conta / Identificação
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank Principal, Itaú Corrente, Reserva de Emergência..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Instituição Financeira
              </label>
              <input
                type="text"
                placeholder="Ex: Nubank, Itaú, XP..."
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Conta
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as Account['type'])}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="checking">Conta Corrente</option>
                <option value="savings">Poupança</option>
                <option value="investment">Investimentos / CDI</option>
                <option value="cash">Dinheiro em Espécie</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Saldo Atual (R$)
            </label>
            <input
              type="text"
              required
              value={balanceStr}
              onChange={e => setBalanceStr(e.target.value.replace(/[^0-9,.-]/g, ''))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
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
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
            >
              Salvar Conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
