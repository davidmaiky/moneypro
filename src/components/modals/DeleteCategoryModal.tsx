import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Category } from '../../types/finance';
import { CategoryIcon } from '../../utils/categoryUtils';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
}) => {
  const { categories, transactions, recurringTransactions, deleteCategory } = useFinance();

  // Find other categories of the same type for migration fallback
  const alternativeCategories = React.useMemo(() => {
    if (!category) return [];
    return categories.filter(c => c.id !== category.id && c.type === category.type);
  }, [categories, category]);

  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  React.useEffect(() => {
    if (alternativeCategories.length > 0) {
      setTargetCategoryId(alternativeCategories[0].id);
    }
  }, [alternativeCategories]);

  if (!isOpen || !category) return null;

  // Count usages
  const transactionsCount = transactions.filter(t => t.categoryId === category.id).length;
  const recurringCount = recurringTransactions.filter(r => r.categoryId === category.id).length;
  const totalUsages = transactionsCount + recurringCount;

  const handleConfirm = () => {
    deleteCategory(category.id, targetCategoryId || undefined);
    onClose();
  };

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
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Excluir Categoria
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirmação de remoção e migração de registros
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

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: category.color }}
            >
              <CategoryIcon name={category.iconName} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {category.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {category.type === 'income' ? 'Categoria de Receita' : 'Categoria de Despesa'}
              </div>
            </div>
          </div>

          {totalUsages > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Esta categoria possui{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {transactionsCount} lançamento(s)
                </strong>{' '}
                {recurringCount > 0 && (
                  <>
                    e{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {recurringCount} regra(s) recorrente(s)
                    </strong>{' '}
                  </>
                )}
                vinculado(s). Para não perder o histórico, escolha para onde transferi-los:
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reatribuir registros para:
                </label>
                <select
                  value={targetCategoryId}
                  onChange={e => setTargetCategoryId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {alternativeCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Nenhum lançamento está vinculado a esta categoria. Ela será removida com segurança.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirmar Exclusão</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
