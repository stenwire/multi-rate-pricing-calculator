export function formatMoney(amount: number): string {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface DiscountRule {
  type: 'percent' | 'fixed';
  value: number;
}

// How a line's discount rule reads in a table cell: a rate, an amount, or nothing at all.
export function formatDiscount(discount: DiscountRule | null): string {
  if (!discount) {
    return '—';
  }

  return discount.type === 'percent'
    ? `${discount.value}%`
    : formatMoney(discount.value);
}
