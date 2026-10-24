import { useEffect, useRef } from 'react';
import { api, Product, Sale, Settings } from './api';
import { useLanguage } from './i18n';
import { khr, roundKhr } from './theme';
import { useToast } from './toast';
import { useSounds } from './hooks/useSounds';

export type LiveActivityEvent = {
  id: string;
  type: 'PRODUCT_ADDED' | 'PRODUCT_UPDATED' | 'CHECKOUT';
  titleEn: string;
  titleKh: string;
  detail: string;
  createdAt: string;
  sale?: Sale;
};

const recentActivityLog: LiveActivityEvent[] = [];
const notifiedEventKeys = new Set<string>();
const listeners = new Set<() => void>();

export function getLiveActivityLog(): LiveActivityEvent[] {
  return recentActivityLog;
}

export function subscribeLiveActivity(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function pushActivity(ev: LiveActivityEvent) {
  if (recentActivityLog.some((x) => x.id === ev.id)) return;
  recentActivityLog.unshift(ev);
  if (recentActivityLog.length > 50) recentActivityLog.pop();
  listeners.forEach((cb) => cb());
}

/**
 * Marks an event key as already notified on this client so the background poller
 * will not show a duplicate toast 2 seconds later.
 */
export function markEventNotified(key: string) {
  notifiedEventKeys.add(key);
}

/**
 * Global real-time watcher mounted in Root (_layout.tsx) so BOTH the Web Portal
 * and Mobile App receive simultaneous notifications when products are added,
 * updated/restocked, or checked out across any connected device.
 */
export function LiveAlertWatcher() {
  const toast = useToast();
  const { tr } = useLanguage();
  const { playCheckout, playScan } = useSounds();

  const initialized = useRef(false);
  const productMap = useRef<Map<string, { name: string; stock: number; priceUsd: number; category: string }>>(
    new Map()
  );
  const saleIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    async function checkUpdates() {
      try {
        const [products, sales, settings] = await Promise.all([
          api<Product[]>('/products'),
          api<Sale[]>('/sales'),
          api<Settings>('/settings'),
        ]);
        if (!active || !products || !sales) return;
        const rate = roundKhr(Number(settings?.usdToKhr || 4100));

        if (!initialized.current) {
          products.forEach((p) => {
            productMap.current.set(p.id, {
              name: p.name,
              stock: p.stock,
              priceUsd: Number(p.priceUsd),
              category: p.category,
            });
          });
          sales.forEach((s) => saleIds.current.add(s.id));
          initialized.current = true;
          return;
        }

        // 1. Check for new Sales (Checkout completed on any device)
        for (const s of sales) {
          if (!saleIds.current.has(s.id)) {
            saleIds.current.add(s.id);
            const eventKey = `sale:${s.id}`;
            const totalRiel = khr(s.totalKhr || Number(s.totalUsd) * (s.rateSnapshot || rate));
            pushActivity({
              id: eventKey,
              type: 'CHECKOUT',
              titleEn: `Checkout #${s.id.slice(0, 8).toUpperCase()}`,
              titleKh: `ទំនិញបានទូទាត់ #${s.id.slice(0, 8).toUpperCase()}`,
              detail: `${totalRiel} · ${s.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}`,
              createdAt: s.createdAt || new Date().toISOString(),
              sale: s,
            });

            if (!notifiedEventKeys.has(eventKey)) {
              notifiedEventKeys.add(eventKey);
              playCheckout();
              toast.show(
                tr(
                  `Checkout complete: ${totalRiel} (#${s.id.slice(0, 6).toUpperCase()})`,
                  `ទំនិញបានទូទាត់៖ ${totalRiel} (#${s.id.slice(0, 6).toUpperCase()})`
                ),
                { tone: 'success', duration: 6000 }
              );
            }
          }
        }

        // 2. Check for Product Added or Updated on any device
        for (const p of products) {
          const prev = productMap.current.get(p.id);
          if (!prev) {
            productMap.current.set(p.id, {
              name: p.name,
              stock: p.stock,
              priceUsd: Number(p.priceUsd),
              category: p.category,
            });
            const eventKey = `add:${p.id}`;
            pushActivity({
              id: eventKey,
              type: 'PRODUCT_ADDED',
              titleEn: `New Product Added: ${p.name}`,
              titleKh: `បានបន្ថែមទំនិញថ្មី៖ ${p.name}`,
              detail: `${khr(Number(p.priceUsd) * rate)} · Stock: ${p.stock}`,
              createdAt: new Date().toISOString(),
            });

            if (!notifiedEventKeys.has(eventKey)) {
              notifiedEventKeys.add(eventKey);
              playScan();
              toast.show(
                tr(
                  `New product added: ${p.name} (${khr(Number(p.priceUsd) * rate)})`,
                  `បានបន្ថែមទំនិញថ្មី៖ ${p.name} (${khr(Number(p.priceUsd) * rate)})`
                ),
                { tone: 'success', duration: 5000 }
              );
            }
          } else if (
            prev.stock !== p.stock ||
            Math.abs(prev.priceUsd - Number(p.priceUsd)) > 0.0001 ||
            prev.name !== p.name ||
            prev.category !== p.category
          ) {
            const oldStock = prev.stock;
            productMap.current.set(p.id, {
              name: p.name,
              stock: p.stock,
              priceUsd: Number(p.priceUsd),
              category: p.category,
            });
            const eventKey = `upd:${p.id}:${p.stock}:${Number(p.priceUsd).toFixed(4)}:${p.name}`;
            // Avoid firing a redundant "product updated" toast if stock decreased solely due to a checkout just notified
            const stockDecreasedFromSale = p.stock < oldStock;
            pushActivity({
              id: eventKey,
              type: 'PRODUCT_UPDATED',
              titleEn: `Product Updated: ${p.name}`,
              titleKh: `បានកែប្រែទំនិញ៖ ${p.name}`,
              detail: `${khr(Number(p.priceUsd) * rate)} · Stock: ${oldStock} → ${p.stock}`,
              createdAt: new Date().toISOString(),
            });

            if (!notifiedEventKeys.has(eventKey) && !stockDecreasedFromSale) {
              notifiedEventKeys.add(eventKey);
              toast.show(
                tr(
                  `Product updated: ${p.name} (Stock: ${p.stock})`,
                  `បានកែប្រែទំនិញ៖ ${p.name} (ស្តុក៖ ${p.stock})`
                ),
                { tone: 'info', duration: 4500 }
              );
            }
          }
        }
      } catch {
        // Ignore transient poll errors
      }
    }

    void checkUpdates();
    const timer = setInterval(() => {
      void checkUpdates();
    }, 2500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [toast, tr, playCheckout, playScan]);

  return null;
}
