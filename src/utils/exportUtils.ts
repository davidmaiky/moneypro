import { Transaction, Category, Account, CreditCard } from '../types/finance';
import { formatDate } from './formatters';

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  cards: CreditCard[],
  filename = 'extrato-financeiro.csv'
) {
  if (transactions.length === 0) {
    alert('Nenhum lançamento para exportar.');
    return;
  }

  const headers = [
    'Data',
    'Descrição',
    'Tipo',
    'Categoria',
    'Forma de Pagamento',
    'Origem / Conta / Cartão',
    'Parcela / Fatura',
    'Situação',
    'Valor (R$)',
    'Observações',
  ];

  const escapeCSV = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map(tx => {
    const isIncome = tx.type === 'income';
    const isCard = tx.paymentMethod === 'credit_card';
    const cat = categories.find(c => c.id === tx.categoryId);
    const card = isCard ? cards.find(c => c.id === tx.creditCardId) : null;
    const acc = !isCard ? accounts.find(a => a.id === tx.accountId) : null;

    let installmentStr = 'À vista';
    if (tx.installments) {
      installmentStr = `${tx.installments.current}/${tx.installments.total}x (${tx.invoiceMonth || ''})`;
    } else if (isCard && tx.invoiceMonth) {
      installmentStr = `Fatura ${tx.invoiceMonth}`;
    }

    const sourceName = isCard
      ? card ? `${card.name} (•••• ${card.last4})` : 'Cartão de Crédito'
      : acc ? `${acc.name} (${acc.bankName})` : 'Conta Bancária';

    // Format value with comma for Excel pt-BR
    const formattedAmount = (isIncome ? tx.amount : -tx.amount).toFixed(2).replace('.', ',');

    return [
      escapeCSV(formatDate(tx.date)),
      escapeCSV(tx.description),
      escapeCSV(isIncome ? 'Receita' : 'Despesa'),
      escapeCSV(cat?.name || 'Outros'),
      escapeCSV(isCard ? 'Cartão de Crédito' : 'Conta Bancária'),
      escapeCSV(sourceName),
      escapeCSV(installmentStr),
      escapeCSV(tx.status === 'completed' ? 'Concluído' : 'Pendente'),
      escapeCSV(formattedAmount),
      escapeCSV(tx.notes || ''),
    ].join(';');
  });

  // Include UTF-8 BOM so Excel opens with proper accents
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
