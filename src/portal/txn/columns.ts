// Column flex weights shared by the transactions header and rows so they stay aligned.
export const TXN_COL = {
  receipt: 1,
  timestamp: 1.4,
  items: 2.2,
  tender: 0.8,
  total: 1.2,
  usd: 0.9,
};

export type SalesRange = 'today' | '7d' | '30d' | 'all';

export const SALES_RANGES: { id: SalesRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'all', label: 'All Time' },
];
