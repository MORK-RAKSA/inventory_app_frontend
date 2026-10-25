// Column flex weights shared by the inventory header and rows so they stay aligned.
export const INV_COL = {
  product: 2,
  category: 1.1,
  price: 1.2,
  usd: 0.9,
  stock: 1,
  actions: 1.7,
};

export type StockFilter = 'all' | 'low' | 'out';

export const STOCK_FILTERS: { id: StockFilter; label: string }[] = [
  { id: 'all', label: 'All Stock' },
  { id: 'low', label: 'Low Stock' },
  { id: 'out', label: 'Out of Stock' },
];
