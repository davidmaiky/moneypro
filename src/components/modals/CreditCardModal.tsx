import React, { useState } from 'react';
import { X, CreditCard as CardIcon } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CardBrand, CreditCard } from '../../types/finance';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: CreditCard | null;
}

const CARD_THEMES = [
  { name: 'Roxo Ultravioleta', color: '#7000af', gradient: 'from-[#5e0094] to-[#8f19e0]' },
  { name: 'Black Minimalista', color: '#1e293b', gradient: 'from-[#0f172a] via-[#1e293b] to-[#334155]' },
  { name: 'Laranja Vibrante', color: '#ea580c', gradient: 'from-[#c2410c] to-[#f97316]' },
  { name: 'Azul Infinite', color: '#1d4ed8', gradient: 'from-[#1e3a8a] to-[#2563eb]' },
  { name: 'Dourado Gold', color: '#d97706', gradient: 'from-[#78350f] via-[#b45309] to-[#f59e0b]' },
  { name: 'Verde Platinum', color: '#047857', gradient: 'from-[#064e3b] to-[#059669]' },
];

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
}) => {
  const { addCreditCard, updateCreditCard } = useFinance();

  const [name, setName] = useState(cardToEdit?.name || '');
  const [bank, setBank] = useState(cardToEdit?.bank || '');
  const [last4, setLast4] = useState(cardToEdit?.last4 || '1234');
  const [brand, setBrand] = useState<CardBrand>(cardToEdit?.brand || 'mastercard');
  const [limitStr, setLimitStr] = useState(cardToEdit ? String(cardToEdit.limitTotal) : '10000');
  const [closingDay, setClosingDay] = useState(cardToEdit?.closingDay || 15);
  const [dueDay, setDueDay] = useState(cardToEdit?.dueDay || 22);
  const [themeIdx, setThemeIdx] = useState(0);

  React.useEffect(() => {
    if (cardToEdit) {
      setName(cardToEdit.name);
      setBank(cardToEdit.bank);
      setLast4(cardToEdit.last4);
      setBrand(cardToEdit.brand);
      setLimitStr(String(cardToEdit.limitTotal));
      setClosingDay(cardToEdit.closingDay);
      setDueDay(cardToEdit.dueDay);
    } else {
      setName('');
      setBank('');
      setLast4('4321');
      setLimitStr('10000');
      setClosingDay(15);
      setDueDay(22);
    }
  }, [cardToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitTotal = parseFloat(limitStr.replace(',', '.')) || 0;
    if (!name.trim() || limitTotal <= 0) return;

    const selectedTheme = CARD_THEMES[themeIdx] || CARD_THEMES[0];

    if (cardToEdit) {
      updateCreditCard(cardToEdit.id, {
        name: name.trim(),
        bank: bank.trim(),
        last4: last4.slice(-4),
        brand,
        limitTotal,
        closingDay,
        dueDay,
        color: selectedTheme.color,
        gradient: selectedTheme.gradient,
      });
    } else {
      addCreditCard({
        name: name.trim(),
        bank: bank.trim(),
        last4: last4.slice(-4),
        brand,
        limitTotal,
        closingDay,
        dueDay,
        color: selectedTheme.color,
        gradient: selectedTheme.gradient,
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
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>{cardToEdit ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[calc(90vh-4rem)]">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome do Cartão
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank Ultravioleta, Itaú Black..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Instituição / Banco
              </label>
              <input
                type="text"
                placeholder="Ex: Nubank, Itaú, Inter..."
                value={bank}
                onChange={e => setBank(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Últimos 4 Dígitos
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="Ex: 8821"
                value={last4}
                onChange={e => setLast4(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Limite Total (R$)
              </label>
              <input
                type="text"
                required
                value={limitStr}
                onChange={e => setLimitStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bandeira
              </label>
              <select
                value={brand}
                onChange={e => setBrand(e.target.value as CardBrand)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
              >
                <option value="mastercard">Mastercard</option>
                <option value="visa">Visa</option>
                <option value="elo">Elo</option>
                <option value="amex">American Express</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dia de Fechamento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={closingDay}
                onChange={e => setClosingDay(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Melhor dia = Fechamento</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dia de Vencimento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dueDay}
                onChange={e => setDueDay(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Data final de pagamento</span>
            </div>
          </div>

          {/* Theme Palette */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tema Visual do Cartão
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CARD_THEMES.map((thm, idx) => (
                <button
                  key={thm.name}
                  type="button"
                  onClick={() => setThemeIdx(idx)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                    themeIdx === idx
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-900 dark:text-white shadow-xs font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: thm.color }}
                  />
                  <span className="truncate">{thm.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
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
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-purple-400 hover:bg-purple-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
            >
              {cardToEdit ? 'Atualizar Cartão' : 'Cadastrar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
