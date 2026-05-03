export type StockStatus = 'normal' | 'warning' | 'critical' | 'empty';

export function getStockStatus(currentQty: number, stdQty: number): StockStatus {
  if (currentQty === 0) return 'empty';
  if (stdQty === 0) return 'normal';
  const ratio = currentQty / stdQty;
  if (ratio < 0.5) return 'critical';
  if (ratio < 0.8) return 'warning';
  return 'normal';
}
