import React, { useState, useEffect } from 'react';
import { X, Tag, ArrowDownRight, ArrowUpRight, Check, Search, Sparkles } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Category, TransactionType } from '../../types/finance';
import { CATEGORY_ICONS, CATEGORY_COLORS, CategoryIcon } from '../../utils/categoryUtils';
import { formatCurrency } from '../../utils/formatters';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  defaultType?: TransactionType;
  onCategorySaved?: (category: Category) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  defaultType = 'expense',
  onCategorySaved,
}) => {
  const { addCategory, updateCategory } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(defaultType);
  const [iconName, setIconName] = useState('Tag');
  const [color, setColor] = useState('#6366f1');
  const [budgetStr, setBudgetStr] = useState('');
  const [iconSearch, setIconSearch] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setIconName(categoryToEdit.iconName || 'Tag');
      setColor(categoryToEdit.color || '#6366f1');
      setBudgetStr(categoryToEdit.budgetMonthly ? categoryToEdit.budgetMonthly.toString() : '');
    } else {
      setName('');
      setType(defaultType);
      setIconName(defaultType === 'income' ? 'Briefcase' : 'Tag');
      setColor(defaultType === 'income' ? '#10b981' : '#6366f1');
      setBudgetStr('');
    }
    setIconSearch('');
  }, [categoryToEdit, defaultType, isOpen]);

  if (!isOpen) return null;

  const filteredIcons = CATEGORY_ICONS.filter(item =>
    item.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
    item.name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedBudget = budgetStr ? parseFloat(budgetStr.replace(',', '.')) : undefined;
    const validBudget = parsedBudget && !isNaN(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined;

    if (categoryToEdit) {
      updateCategory(categoryToEdit.id, {
        name: name.trim(),
        type,
        iconName,
        color,
        budgetMonthly: type === 'expense' ? validBudget : undefined,
      });

      if (onCategorySaved) {
        onCategorySaved({
          ...categoryToEdit,
          name: name.trim(),
          type,
          iconName,
          color,
          budgetMonthly: type === 'expense' ? validBudget : undefined,
        });
      }
    } else {
      const created = addCategory({
        name: name.trim(),
        type,
        iconName,
        color,
        budgetMonthly: type === 'expense' ? validBudget : undefined,
      });

      if (onCategorySaved) {
        onCategorySaved(created);
      }
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <CategoryIcon name={iconName} className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize o nome, ícone, cor e teto de orçamento
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Live Preview Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pré-visualização:
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: color }}
              >
                <CategoryIcon name={iconName} className="w-3 h-3" />
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {name.trim() || 'Nome da Categoria'}
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  type === 'income'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                }`}
              >
                {type === 'income' ? 'Receita' : 'Despesa'}
              </span>
            </div>
          </div>

          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Categoria
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-rose-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Despesa</span>
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-emerald-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Receita</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome da Categoria *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Assinaturas de Streaming, Cursos Online, Combustível..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Monthly Budget (for expenses only) */}
          {type === 'expense' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Teto de Orçamento Mensal (Opcional)
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Meta máxima de gastos/mês
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">R$</span>
                <input
                  type="text"
                  placeholder="Ex: 800,00"
                  value={budgetStr}
                  onChange={e => setBudgetStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cor de Identificação
            </label>
            <div className="grid grid-cols-8 gap-2">
              {CATEGORY_COLORS.map(c => {
                const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.hex)}
                    className={`w-8 h-8 rounded-lg transition-transform flex items-center justify-center cursor-pointer ${
                      isSelected ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Ícone Representativo
              </label>
              <div className="relative w-36">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar ícone..."
                  value={iconSearch}
                  onChange={e => setIconSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-6 pr-2 py-1 text-[11px] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80">
              {filteredIcons.map(item => {
                const isSelected = iconName === item.name;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.name}
                    type="button"
                    title={item.label}
                    onClick={() => setIconName(item.name)}
                    className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs scale-105'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {categoryToEdit ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
