import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, Product, Sale, Settings } from '../api';
import { subscribeLiveActivity } from '../liveSync';

export function useLiveData(kind: 'products' | 'sales' | 'all' = 'all') {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [rate, setRate] = useState(0);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      // Execute sequentially so Vercel Serverless reuses a single warm container
      // instead of spinning up 3 parallel isolated containers!
      if (kind !== 'sales') {
        const p = await api<Product[]>('/products');
        if (p) setProducts(p);
      }
      if (kind !== 'products') {
        const s = await api<Sale[]>('/sales');
        if (s) setSales(s);
      }
      const r = await api<Settings>('/settings');
      if (r?.usdToKhr) setRate(Number(r.usdToKhr));
      setUpdatedAt(new Date());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function poll() {
        if (active) await refresh();
      }
      void poll();
      const unsub = subscribeLiveActivity(() => {
        void poll();
      });
      const interval = setInterval(() => {
        void poll();
      }, 15000);
      return () => {
        active = false;
        unsub();
        clearInterval(interval);
      };
    }, [refresh])
  );

  return { products, sales, rate, error, updatedAt, loading, refresh };
}
