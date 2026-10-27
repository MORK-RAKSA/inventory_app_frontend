import type { Product } from './api';
/** Date-only expiry remains valid through that day in the store's Cambodia timezone. */
export function isProductExpired(product: Pick<Product, 'expirationDate'>, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => today.find(p => p.type === type)?.value;
  return !!product.expirationDate && product.expirationDate.slice(0, 10) < `${part('year')}-${part('month')}-${part('day')}`;
}
