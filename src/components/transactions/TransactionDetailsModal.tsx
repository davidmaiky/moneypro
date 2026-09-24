import React from 'react';
import {
  X,
  CreditCard as CardIcon,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Tag,
  FileText,
  Edit3,
  Trash2,
  Copy,
  Repeat,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Transaction, Category, Account, CreditCard } from '../../types/finance';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  onEdit: (transaction: Transaction) => void;
  onDuplicate: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onToggleStatus: (transaction: Transaction) => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories,
  accounts,
  cards,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
}) => {
  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const isCard = transaction.paymentMethod === 'credit_card';
  const category = categories.find(c => c.id === transaction.categoryId);
  const card = isCard ? cards.find(c => c.id === transaction.creditCardId) : null;
  const account = !isCard ? accounts.find(a => a.id === transaction.accountId) : null;
  const isCompleted = transaction.status === 'completed';

  const installmentPercent = transaction.installments
    ? Math.round((transaction.installments.current / transaction.installments.total) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isIncome
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
              }`}
            >
              {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{isIncome ? 'Receita' : 'Despesa'}</span>
            </span>

            <button
              onClick={() => onToggleStatus(transaction)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/30 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/30 hover:bg-amber-100'
              }`}
              title="Clique para alternar situação (Concluído/Pendente)"
            >
              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
              <span>{isCompleted ? 'Concluído' : 'Pendente'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Description Hero */}
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Valor do Lançamento
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {isIncome ? '+ ' : '- '}
            {formatCurrency(transaction.amount)}
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-2 break-words">
            {transaction.description}
          </h3>
          {transaction.notes && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              "{transaction.notes}"
            </p>
          )}
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Date */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Data
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {formatDate(transaction.date)}
              </span>
            </div>

            {/* Category */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Categoria
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: category?.color || '#6366f1' }}
                />
                <span>{category?.name || 'Outros'}</span>
              </div>
            </div>

            {/* Origin / Account / Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                {isCard ? <CardIcon className="w-3 h-3 text-purple-500" /> : <Wallet className="w-3 h-3 text-emerald-500" />}
                Forma / Origem
              </span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {isCard ? (
                  <span className="text-purple-700 dark:text-purple-300">
                    {card ? `${card.name} (•••• ${card.last4})` : 'Cartão de Crédito'}
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {account ? `${account.name} - ${account.bankName}` : 'Conta Corrente'}
                  </span>
                )}
              </div>
            </div>

            {/* Invoice Month or Account status */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-medium uppercase tracking-wider mb-1">
                {isCard ? 'Fatura Vinculada' : 'Saldo da Conta'}
              </span>
              <div className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                {isCard ? (
                  transaction.invoiceMonth ? `Fatura ${transaction.invoiceMonth}` : 'Fatura Atual'
                ) : (
                  account ? formatCurrency(account.balance) : 'Sem vínculo direto'
                )}
              </div>
            </div>
          </div>

          {/* Installment details if applicable */}
          {transaction.installments && (
            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Parcela {transaction.installments.current} de {transaction.installments.total}</span>
                </span>
                <span className="font-mono font-bold text-purple-800 dark:text-purple-300">
                  Total: {formatCurrency(transaction.installments.totalPurchaseAmount)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-purple-200/70 dark:bg-purple-900/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 dark:bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${installmentPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300">
                <span>{installmentPercent}% do parcelamento pago</span>
                <span>Fatura {transaction.invoiceMonth || '-'}</span>
              </div>
            </div>
          )}

          {/* Recurring badge if applicable */}
          {transaction.recurringId && (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/40 flex items-center gap-2.5 text-xs text-indigo-800 dark:text-indigo-300">
              <Repeat className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                Lançamento automático originado de uma <strong>Despesa Fixa / Recorrente</strong> cadastrada.
              </span>
            </div>
          )}

          {/* System metadata */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between font-mono">
            <span>ID: {transaction.id}</span>
            <span>Registrado em: {new Date(transaction.createdAt).toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(transaction);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDuplicate(transaction);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Criar novo lançamento baseado neste"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Duplicar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(transaction);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
