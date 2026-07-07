export function normalizePlate(value: string): string {
  return value.trim().replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
}
