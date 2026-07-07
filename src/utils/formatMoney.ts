export function formatMoney(value: number | string): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `${safeAmount.toFixed(2)} AZN`;
}
