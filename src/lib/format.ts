export function formatCurrency(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatOdometer(value: number | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('pt-BR').format(value)} km`;
}

export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}
