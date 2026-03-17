export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return `$${Math.round(price).toLocaleString('en-US')}`;
}
