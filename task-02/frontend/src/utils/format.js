export function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

export function formatMoney(value) {
  return formatCurrency(value);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
