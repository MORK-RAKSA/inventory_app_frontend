import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AlertTriangle,
  ArrowUpRight,
  Barcode,
  Bell,
  Boxes,
  Check,
  Download,
  Edit3,
  Layers,
  LayoutDashboard,
  LogOut,
  Minus,
  PackagePlus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  Usb,
  X,
} from 'lucide-react-native';
import { api, Product, Sale, Settings } from '../api';
import { getUsername, logout } from '../auth';
import { showSignedOut } from '../authEvents';
import { khr, money, roundKhr } from '../theme';
import { Press } from '../motion';
import { useLanguage } from '../i18n';
import { useToast } from '../toast';
import { useSounds } from '../hooks/useSounds';
import { ReceiptModal } from './ReceiptModal';
import { exportExcel } from '../exportExcel';
import { lookupBarcodeOnline } from '../barcodeLookup';
import { getLiveActivityLog, markEventNotified, subscribeLiveActivity } from '../liveSync';

type PortalTab = 'dashboard' | 'inventory' | 'pos' | 'sales' | 'settings';

const P = {
  sidebarBg: '#0F172A',
  sidebarHover: '#1E293B',
  sidebarActive: '#6D28D9',
  sidebarBorder: '#1E293B',
  sidebarText: '#94A3B8',
  sidebarTextActive: '#FFFFFF',
  canvas: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textSub: '#475569',
  muted: '#64748B',
  primary: '#6D28D9',
  primaryLight: '#EDE9FE',
  emerald: '#059669',
  emeraldLight: '#D1FAE5',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  rose: '#E11D48',
  roseLight: '#FFE4E6',
  teal: '#0D9488',
  tealLight: '#CCFBF1',
};

const DEFAULT_CATEGORIES = ['General', 'Beverages', 'Snacks', 'Dairy', 'Household', 'Personal Care'];

export function WebPortal({ onSwitchToMobile }: { onSwitchToMobile: () => void }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const { language, setLanguage, tr } = useLanguage();
  const toast = useToast();
  const { playScan, playCheckout, playFail } = useSounds();

  const [tab, setTab] = useState<PortalTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [rate, setRate] = useState<number>(4100);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [user, setUser] = useState<string>('Admin');

  // Hardware Scanner Device State (USB / Bluetooth HID Wedge)
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scannerFlash, setScannerFlash] = useState<boolean>(false);
  const scanBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Inventory state
  const [invSearch, setInvSearch] = useState('');
  const [invCat, setInvCat] = useState('All');
  const [invStatusFilter, setInvStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Product Form Modal state
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formCcy, setFormCcy] = useState<'KHR' | 'USD'>('KHR');
  const [formPrice, setFormPrice] = useState('4100');
  const [formStock, setFormStock] = useState('20');
  const [formLowThreshold, setFormLowThreshold] = useState('5');
  const [formExpiry, setFormExpiry] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // POS state
  const [posSearch, setPosSearch] = useState('');
  const [posCat, setPosCat] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paidCurrency, setPaidCurrency] = useState<'KHR' | 'USD'>('KHR');
  const [checkingOut, setCheckingOut] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Sale | null>(null);

  // Sales filter state
  const [salesRange, setSalesRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [salesSearch, setSalesSearch] = useState('');

  // Settings state
  const [rateInput, setRateInput] = useState('4100');
  const [savingRate, setSavingRate] = useState(false);

  // Live Activity Feed state
  const [activityTick, setActivityTick] = useState(0);
  useEffect(() => subscribeLiveActivity(() => setActivityTick((n) => n + 1)), []);
  const liveFeed = useMemo(() => getLiveActivityLog().slice(0, 6), [activityTick, products, sales]);

  const handleExportInventory = useCallback(
    (list: Product[]) => {
      void exportExcel(
        'EasySell-Inventory.xlsx',
        ['Name', 'Barcode', 'Category', 'Price (KHR ៛)', 'Price (USD $)', 'Stock', 'Low Stock Threshold', 'Expiry Date'],
        list.map((p) => [
          p.name,
          p.barcode || '',
          p.category,
          roundKhr(p.priceUsd * rate),
          Number(p.priceUsd.toFixed(2)),
          p.stock,
          p.lowStockThreshold,
          p.expirationDate || '',
        ])
      );
    },
    [rate]
  );

  const handleExportSales = useCallback((list: Sale[]) => {
    void exportExcel(
      'EasySell-Sales.xlsx',
      ['Receipt ID', 'Date', 'Items', 'Tender Currency', 'Total (KHR ៛)', 'Total (USD $)', 'Rate Snapshot'],
      list.map((s) => [
        s.id.slice(0, 8).toUpperCase(),
        new Date(s.createdAt).toLocaleString(),
        s.items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
        s.paidCurrency || 'KHR',
        roundKhr(Number(s.totalKhr || s.totalUsd * s.rateSnapshot)),
        Number(s.totalUsd.toFixed(2)),
        s.rateSnapshot,
      ])
    );
  }, []);

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const [p, s, cfg] = await Promise.all([
          api<Product[]>('/products'),
          api<Sale[]>('/sales'),
          api<Settings>('/settings'),
        ]);
        setProducts(p || []);
        setSales(s || []);
        if (cfg?.usdToKhr) {
          const roundedRate = roundKhr(Number(cfg.usdToKhr));
          setRate(roundedRate);
          setRateInput(String(roundedRate));
        }
      } catch (e: any) {
        if (!silent) toast.show(e?.message || 'Failed to sync portal data', { tone: 'error' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const u = getUsername();
    if (u) setUser(u);
    void loadAll();
    const id = setInterval(() => void loadAll(true), 4000);
    return () => clearInterval(id);
  }, [loadAll]);

  function addToCart(product: Product, delta = 1) {
    if (delta > 0 && product.stock <= 0) {
      playFail();
      toast.show(tr(`${product.name} is out of stock`, `${product.name} អស់ពីស្តុកហើយ`), { tone: 'error' });
      return;
    }
    setCart((prev) => {
      const current = prev[product.id] || 0;
      if (delta > 0 && current >= product.stock) {
        playFail();
        return prev;
      }
      if (delta > 0) playScan();
      const next = Math.max(0, Math.min(product.stock, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return { ...prev, [product.id]: next };
    });
  }

  function openCreateProduct(prefillBarcode = '') {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode(prefillBarcode);
    setFormCategory('General');
    setFormCcy('KHR');
    setFormPrice('4100');
    setFormStock('20');
    setFormLowThreshold('5');
    setFormExpiry('');
    setShowProductModal(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBarcode(p.barcode || '');
    setFormCategory(p.category || 'General');
    setFormCcy('KHR');
    setFormPrice(String(roundKhr(p.priceUsd * rate)));
    setFormStock(String(p.stock));
    setFormLowThreshold(String(p.lowStockThreshold ?? 5));
    setFormExpiry(p.expirationDate || '');
    setShowProductModal(true);
  }

  // Handle Barcode from Connected Hardware USB / Bluetooth Scanner Device
  const handleHardwareBarcodeScan = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      setLastScannedCode(code);
      setScannerFlash(true);
      setTimeout(() => setScannerFlash(false), 1200);

      // 1. If the Create/Edit Product modal is open, fill or increment stock
      if (showProductModal) {
        playScan();
        if (!editingProduct && formBarcode === code) {
          setFormStock((prev) => String((Number(prev) || 0) + 1));
          toast.show(tr(`Scanned ${code}: Stock +1`, `ស្កេន ${code}៖ ស្តុក +1`), { tone: 'success' });
        } else if (!editingProduct) {
          setFormBarcode(code);
          const info = await lookupBarcodeOnline(code);
          if (info?.name) {
            setFormName((prev) => prev.trim() || info.name);
            if (info.category) setFormCategory(info.category);
          }
        }
        return;
      }

      const found = products.find((p) => (p.barcode || '').toLowerCase() === code.toLowerCase());

      // 2. If on Inventory tab, open edit/restock or create new product
      if (tab === 'inventory') {
        if (found) {
          playScan();
          openEditProduct(found);
          toast.show(
            tr(`Scanner found: ${found.name}`, `ម៉ាស៊ីនស្កេនរកឃើញ៖ ${found.name}`),
            { tone: 'success' }
          );
        } else {
          playScan();
          openCreateProduct(code);
          toast.show(
            tr(`New barcode ${code} — enter product details`, `បាកូដថ្មី ${code} — សូមបំពេញព័ត៌មានទំនិញ`),
            { tone: 'info' }
          );
          const info = await lookupBarcodeOnline(code);
          if (info?.name) {
            setFormName(info.name);
            if (info.category) setFormCategory(info.category);
          }
        }
        return;
      }

      // 3. Default (POS Register / Dashboard / Sales): Add to POS Cart and switch to POS tab
      if (found) {
        if (tab !== 'pos') setTab('pos');
        addToCart(found, 1);
        toast.show(
          tr(
            `Scanned: ${found.name} (${khr(found.priceUsd * rate)})`,
            `បានស្កេន៖ ${found.name} (${khr(found.priceUsd * rate)})`
          ),
          { tone: 'success' }
        );
      } else {
        playFail();
        toast.show(
          tr(`Barcode not in stock: ${code}`, `រកមិនឃើញបាកូដ៖ ${code}`),
          {
            tone: 'warning',
            actionLabel: tr('Add Item', 'បន្ថែមទំនិញ'),
            onAction: () => openCreateProduct(code),
          }
        );
      }
    },
    [showProductModal, editingProduct, formBarcode, products, tab, rate, tr, toast, playScan, playFail]
  );

  // Global USB / Bluetooth Hardware Barcode Scanner Listener (HID Keyboard Wedge)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Ignore if typing inside an input (inputs handle Enter via onSubmitEditing)
      if (isInputFocused) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 120) {
        scanBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        const scanned = scanBufferRef.current.trim();
        scanBufferRef.current = '';
        if (scanned.length >= 3) {
          e.preventDefault();
          void handleHardwareBarcodeScan(scanned);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleHardwareBarcodeScan]);

  // Computed metrics
  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const activeSales = useMemo(() => sales.filter((s) => s.status !== 'ARCHIVED'), [sales]);

  const todaySales = useMemo(() => {
    const todayStr = new Date().toDateString();
    return activeSales.filter((s) => new Date(s.createdAt).toDateString() === todayStr);
  }, [activeSales]);

  const todayKhr = useMemo(
    () => todaySales.reduce((acc, s) => acc + roundKhr(Number(s.totalKhr || s.totalUsd * rate)), 0),
    [todaySales, rate]
  );
  const todayUsd = useMemo(
    () => todaySales.reduce((acc, s) => acc + Number(s.totalUsd || 0), 0),
    [todaySales]
  );

  const weekSales = useMemo(() => {
    const cut = Date.now() - 7 * 86400000;
    return activeSales.filter((s) => new Date(s.createdAt).getTime() >= cut);
  }, [activeSales]);

  const weekKhr = useMemo(
    () => weekSales.reduce((acc, s) => acc + roundKhr(Number(s.totalKhr || s.totalUsd * rate)), 0),
    [weekSales, rate]
  );
  const weekUsd = useMemo(
    () => weekSales.reduce((acc, s) => acc + Number(s.totalUsd || 0), 0),
    [weekSales]
  );

  const totalUnits = useMemo(() => products.reduce((acc, p) => acc + p.stock, 0), [products]);
  const inventoryValueKhr = useMemo(
    () => products.reduce((acc, p) => acc + roundKhr(p.priceUsd * rate) * p.stock, 0),
    [products, rate]
  );
  const inventoryValueUsd = useMemo(
    () => products.reduce((acc, p) => acc + p.priceUsd * p.stock, 0),
    [products]
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= p.lowStockThreshold),
    [products]
  );

  const chartDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const key = d.toDateString();
      const daySales = activeSales.filter((s) => new Date(s.createdAt).toDateString() === key);
      const total = daySales.reduce((acc, s) => acc + roundKhr(Number(s.totalKhr || s.totalUsd * rate)), 0);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return {
        label,
        shortLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        total,
        count: daySales.length,
      };
    });
  }, [activeSales, rate]);

  const maxDayKhr = Math.max(...chartDays.map((d) => d.total), 100);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (invCat !== 'All' && p.category !== invCat) return false;
      if (invStatusFilter === 'low' && p.stock > p.lowStockThreshold) return false;
      if (invStatusFilter === 'out' && p.stock > 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, invSearch, invCat, invStatusFilter]);

  // Filtered POS Products
  const filteredPosProducts = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (posCat !== 'All' && p.category !== posCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, posSearch, posCat]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    const now = Date.now();
    const q = salesSearch.trim().toLowerCase();
    return activeSales.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      if (salesRange === 'today' && new Date(s.createdAt).toDateString() !== new Date().toDateString()) {
        return false;
      }
      if (salesRange === '7d' && now - t > 7 * 86400000) return false;
      if (salesRange === '30d' && now - t > 30 * 86400000) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [activeSales, salesRange, salesSearch]);

  // Cart helpers
  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product ? { product, qty } : null;
      })
      .filter((x): x is { product: Product; qty: number } => x !== null);
  }, [cart, products]);

  const cartTotalUsd = useMemo(
    () => cartLines.reduce((acc, l) => acc + l.product.priceUsd * l.qty, 0),
    [cartLines]
  );
  const cartTotalKhr = useMemo(() => roundKhr(cartTotalUsd * rate), [cartTotalUsd, rate]);

  async function completeCheckout() {
    if (!cartLines.length || checkingOut) return;
    setCheckingOut(true);
    try {
      const sale = await api<Sale>('/sales/checkout', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          paidCurrency,
          items: cartLines.map((l) => ({
            productId: l.product.id,
            quantity: l.qty,
          })),
        }),
      });
      markEventNotified(`sale:${sale.id}`);
      playCheckout();
      setCart({});
      setActiveReceipt(sale);
      toast.show(
        tr(
          `Payment complete: ${khr(sale.totalKhr)} (#${sale.id.slice(0, 6).toUpperCase()})`,
          `ទំនិញបានទូទាត់៖ ${khr(sale.totalKhr)} (#${sale.id.slice(0, 6).toUpperCase()})`
        ),
        { tone: 'success', duration: 6000 }
      );
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Checkout failed', { tone: 'error' });
    } finally {
      setCheckingOut(false);
    }
  }

  async function saveProductForm() {
    if (!formName.trim()) {
      playFail();
      toast.show(tr('Product name is required', 'សូមបញ្ចូលឈ្មោះទំនិញ'), { tone: 'error' });
      return;
    }
    const rawNum = Number(formPrice);
    if (!Number.isFinite(rawNum) || rawNum < 0) {
      playFail();
      toast.show(tr('Enter a valid non-negative price', 'សូមបញ្ចូលតម្លៃត្រឹមត្រូវ'), { tone: 'error' });
      return;
    }
    if (formExpiry.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(formExpiry.trim())) {
      playFail();
      toast.show(tr('Expiry date must be YYYY-MM-DD', 'ថ្ងៃផុតកំណត់ត្រូវតែជា YYYY-MM-DD'), { tone: 'error' });
      return;
    }

    const finalPrice = formCcy === 'KHR' ? roundKhr(rawNum) : Number(rawNum.toFixed(2));
    const qty = Math.max(0, Math.round(Number(formStock) || 0));
    const limit = Math.max(0, Math.round(Number(formLowThreshold) || 5));

    setSavingProduct(true);
    try {
      // Exact payload matching Spring Boot ProductInput(name, barcode, category, price, currency, stock, lowStockThreshold, expirationDate)
      const payload = {
        name: formName.trim(),
        ...(editingProduct ? {} : { barcode: formBarcode.trim() || null }),
        category: formCategory.trim() || 'General',
        price: finalPrice,
        currency: formCcy,
        stock: qty,
        lowStockThreshold: limit,
        expirationDate: formExpiry.trim() || null,
      };
      const result = await api<Product>(
        editingProduct ? `/products/${editingProduct.id}` : '/products',
        {
          method: editingProduct ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      if (result?.id) {
        markEventNotified(`add:${result.id}`);
        markEventNotified(
          `upd:${result.id}:${result.stock}:${Number(result.priceUsd).toFixed(4)}:${result.name}`
        );
      }
      playScan();
      toast.show(
        editingProduct
          ? tr(`Updated: ${result.name}`, `បានកែប្រែទំនិញ៖ ${result.name}`)
          : tr(`Added: ${result.name}`, `បានបន្ថែមទំនិញថ្មី៖ ${result.name}`),
        { tone: 'success' }
      );
      setShowProductModal(false);
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Could not save product', { tone: 'error' });
    } finally {
      setSavingProduct(false);
    }
  }

  async function quickRestock(p: Product, delta: number) {
    try {
      // Matches Spring Boot @PostMapping("/{id}/restock") with StockInput(int quantity)
      const updated = await api<Product>(`/products/${p.id}/restock`, {
        method: 'POST',
        body: JSON.stringify({ quantity: delta }),
      });
      if (updated?.id) {
        markEventNotified(
          `upd:${updated.id}:${updated.stock}:${Number(updated.priceUsd).toFixed(4)}:${updated.name}`
        );
      }
      playScan();
      toast.show(
        tr(`${p.name}: +${delta} restocked`, `${p.name}៖ បានបន្ថែមស្តុក +${delta}`),
        { tone: 'success' }
      );
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Restock failed', { tone: 'error' });
    }
  }

  async function archiveProduct(p: Product) {
    try {
      await api(`/products/${p.id}`, { method: 'DELETE' });
      toast.show(tr(`${p.name} archived`, `បានលុបទំនិញ ${p.name}`), { tone: 'info' });
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Archive failed', { tone: 'error' });
    }
  }

  async function saveExchangeRate() {
    const parsed = roundKhr(Number(rateInput) || 4100);
    setSavingRate(true);
    try {
      const res = await api<Settings>('/settings/rate', {
        method: 'PUT',
        body: JSON.stringify({ usdToKhr: parsed }),
      });
      const updated = roundKhr(Number(res?.usdToKhr || parsed));
      setRate(updated);
      setRateInput(String(updated));
      playScan();
      toast.show(tr(`Exchange rate set to ${khr(updated)}`, `បានកំណត់អត្រាប្តូរប្រាក់ ${khr(updated)}`), {
        tone: 'success',
      });
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Failed to update rate', { tone: 'error' });
    } finally {
      setSavingRate(false);
    }
  }

  const navItems: { id: PortalTab; label: string; khLabel: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Executive Overview', khLabel: 'ផ្ទាំងគ្រប់គ្រងរួម', icon: LayoutDashboard },
    { id: 'pos', label: 'POS Register', khLabel: 'ម៉ាស៊ីនគិតលុយ POS', icon: ShoppingCart, badge: cartLines.length || undefined },
    { id: 'inventory', label: 'Inventory Ledger', khLabel: 'បញ្ជីស្តុកទំនិញ', icon: Boxes, badge: lowStockProducts.length || undefined },
    { id: 'sales', label: 'Sales & Receipts', khLabel: 'ប្រវត្តិលក់ & វិក្កយបត្រ', icon: ReceiptText },
    { id: 'settings', label: 'Portal Settings', khLabel: 'ការកំណត់ប្រព័ន្ធ', icon: SlidersHorizontal },
  ];

  return (
    <View style={{ flex: 1, flexDirection: isCompact ? 'column' : 'row', backgroundColor: P.canvas }}>
      {/* LEFT ENTERPRISE SIDEBAR */}
      <View
        style={{
          width: isCompact ? '100%' : 272,
          backgroundColor: P.sidebarBg,
          borderRightWidth: isCompact ? 0 : 1,
          borderBottomWidth: isCompact ? 1 : 0,
          borderColor: P.sidebarBorder,
          paddingVertical: isCompact ? 14 : 24,
          paddingHorizontal: 18,
          justifyContent: 'space-between',
        }}
      >
        <View>
          {/* Brand Logo: គ្រប់ហាង, EasySell */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isCompact ? 12 : 28,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: P.sidebarActive,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={22} color="#FFFFFF" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
                    គ្រប់ហាង · EasySell
                  </Text>
                </View>
                <Text style={{ color: P.sidebarText, fontSize: 11.5, marginTop: 1 }}>
                  {tr('Web POS & Inventory Portal', 'ប្រព័ន្ធគ្រប់គ្រងហាងលើវេបសាយ')}
                </Text>
              </View>
            </View>

            {isCompact && (
              <Press
                onPress={onSwitchToMobile}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: P.sidebarHover,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 8,
                }}
              >
                <Smartphone size={14} color="#C4B5FD" />
                <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>Mobile UI</Text>
              </Press>
            )}
          </View>

          {/* Navigation Menu */}
          <ScrollView
            horizontal={isCompact}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <Press
                  key={item.id}
                  onPress={() => setTab(item.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    borderRadius: 11,
                    backgroundColor: active ? P.sidebarActive : 'transparent',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                    <Icon size={18} color={active ? '#FFFFFF' : P.sidebarText} />
                    <Text
                      style={{
                        color: active ? P.sidebarTextActive : P.sidebarText,
                        fontWeight: active ? '700' : '600',
                        fontSize: 13.5,
                      }}
                    >
                      {tr(item.label, item.khLabel)}
                    </Text>
                  </View>
                  {item.badge ? (
                    <View
                      style={{
                        backgroundColor: active ? '#FFFFFF' : '#334155',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 99,
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? P.sidebarActive : '#E2E8F0',
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  ) : null}
                </Press>
              );
            })}
          </ScrollView>
        </View>

        {/* Bottom Sidebar Exchange Rate + Controls (Desktop) */}
        {!isCompact && (
          <View style={{ gap: 12 }}>
            {/* Hardware Scanner Status Card */}
            <View
              style={{
                backgroundColor: scannerFlash ? '#065F46' : '#1E293B',
                borderRadius: 12,
                padding: 13,
                borderWidth: 1,
                borderColor: scannerFlash ? '#10B981' : '#334155',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Usb size={15} color="#34D399" />
                <Text style={{ color: '#E2E8F0', fontSize: 11.5, fontWeight: '800' }}>
                  {tr('Scanner Device Connected', 'ភ្ជាប់ម៉ាស៊ីនស្កេនបាកូដ')}
                </Text>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                {lastScannedCode
                  ? `${tr('Last scanned:', 'ស្កេនចុងក្រោយ៖')} ${lastScannedCode}`
                  : tr('Plug USB / Bluetooth scanner & scan anytime', 'ប្រើម៉ាស៊ីនស្កេន USB / Bluetooth បានគ្រប់ពេល')}
              </Text>
            </View>

            {/* Live KHR Rate Card */}
            <View
              style={{
                backgroundColor: '#1E293B',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: '#334155',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                  {tr('KHR Priority Rate', 'អត្រាប្រាក់រៀល')}
                </Text>
                <View style={{ backgroundColor: '#065F46', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                  <Text style={{ color: '#6EE7B7', fontSize: 10, fontWeight: '800' }}>100 ៛ STEP</Text>
                </View>
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginTop: 6 }}>
                1 USD = {khr(rate)}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>
                {tr('All Riel prices round to 100 ៛', 'គិតជាមូលដ្ឋាន ១០០ រៀល')}
              </Text>
            </View>

            {/* Language Switcher */}
            <View style={{ flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 10, padding: 3 }}>
              {(['kh', 'en'] as const).map((lang) => (
                <Press
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: language === lang ? P.sidebarActive : 'transparent',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    {lang === 'kh' ? 'ភាសាខ្មែរ' : 'English'}
                  </Text>
                </Press>
              ))}
            </View>

            {/* User & Sign out */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTopWidth: 1,
                borderColor: '#1E293B',
              }}
            >
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{user}</Text>
                <Text style={{ color: '#64748B', fontSize: 11 }}>គ្រប់ហាង · EasySell</Text>
              </View>
              <Press
                onPress={async () => {
                  await logout();
                  showSignedOut();
                }}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#1E293B',
                }}
              >
                <LogOut size={16} color="#F87171" />
              </Press>
            </View>
          </View>
        )}
      </View>

      {/* MAIN WORKSPACE */}
      <View style={{ flex: 1 }}>
        {/* TOP ENTERPRISE HEADER BAR */}
        <View
          style={{
            height: 68,
            backgroundColor: P.surface,
            borderBottomWidth: 1,
            borderColor: P.border,
            paddingHorizontal: 26,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ color: P.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
              {tr(
                navItems.find((n) => n.id === tab)?.label || '',
                navItems.find((n) => n.id === tab)?.khLabel
              )}
            </Text>
            <Text style={{ color: P.muted, fontSize: 12 }}>
              {tr(
                `គ្រប់ហាង · EasySell (${user}) · Live multi-device notifications active`,
                `គ្រប់ហាង · EasySell (${user}) · ប្រព័ន្ធជូនដំណឹងផ្ទាល់គ្រប់ឧបករណ៍`
              )}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Hardware Barcode Scanner Ready Pill */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 9,
                backgroundColor: scannerFlash ? '#065F46' : P.emeraldLight,
              }}
            >
              <Barcode size={15} color={scannerFlash ? '#FFFFFF' : P.emerald} />
              <Text
                style={{
                  color: scannerFlash ? '#FFFFFF' : P.emerald,
                  fontSize: 12,
                  fontWeight: '800',
                }}
              >
                {scannerFlash && lastScannedCode
                  ? `Scanned: ${lastScannedCode}`
                  : tr('USB/BT Scanner Ready', 'ម៉ាស៊ីនស្កេនរួចរាល់')}
              </Text>
            </View>

            <Press
              onPress={() => void loadAll()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: P.surfaceAlt,
                borderWidth: 1,
                borderColor: P.border,
              }}
            >
              <RefreshCw size={14} color={P.textSub} />
              <Text style={{ color: P.textSub, fontSize: 12.5, fontWeight: '700' }}>
                {refreshing ? 'Syncing...' : tr('Sync', 'ធ្វើបច្ចុប្បន្នភាព')}
              </Text>
            </Press>

            <Press
              onPress={() => openCreateProduct()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: P.primaryLight,
              }}
            >
              <Plus size={15} color={P.primary} />
              <Text style={{ color: P.primary, fontSize: 12.5, fontWeight: '800' }}>
                {tr('New Product', 'បន្ថែមទំនិញ')}
              </Text>
            </Press>

            <Press
              onPress={onSwitchToMobile}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: P.sidebarBg,
              }}
            >
              <Smartphone size={14} color="#C4B5FD" />
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                {tr('Mobile View', 'ទម្រង់ទូរស័ព្ទ')}
              </Text>
            </Press>
          </View>
        </View>

        {/* WORKSPACE BODY */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={P.primary} />
            <Text style={{ color: P.muted, marginTop: 12, fontWeight: '600' }}>
              Loading គ្រប់ហាង · EasySell Portal...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 26, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ==================== TAB 1: EXECUTIVE DASHBOARD ==================== */}
            {tab === 'dashboard' && (
              <View style={{ gap: 22 }}>
                {/* 4-Column KPI Row */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  <View
                    style={{
                      flex: 1,
                      minWidth: 220,
                      backgroundColor: P.surface,
                      borderRadius: 16,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: P.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                        {tr("Today's Revenue", 'ចំណូលថ្ងៃនេះ')}
                      </Text>
                      <View style={{ backgroundColor: P.primaryLight, padding: 8, borderRadius: 10 }}>
                        <TrendingUp size={18} color={P.primary} />
                      </View>
                    </View>
                    <Text style={{ color: P.text, fontSize: 28, fontWeight: '800', marginTop: 10, letterSpacing: -0.6 }}>
                      {khr(todayKhr)}
                    </Text>
                    <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 4, fontWeight: '600' }}>
                      {money(todayUsd)} · {todaySales.length} {tr('orders today', 'វិក្កយបត្រថ្ងៃនេះ')}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 220,
                      backgroundColor: P.surface,
                      borderRadius: 16,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: P.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                        {tr('7-Day Revenue', 'ចំណូល ៧ ថ្ងៃ')}
                      </Text>
                      <View style={{ backgroundColor: P.emeraldLight, padding: 8, borderRadius: 10 }}>
                        <ArrowUpRight size={18} color={P.emerald} />
                      </View>
                    </View>
                    <Text style={{ color: P.text, fontSize: 28, fontWeight: '800', marginTop: 10, letterSpacing: -0.6 }}>
                      {khr(weekKhr)}
                    </Text>
                    <Text style={{ color: P.emerald, fontSize: 12.5, marginTop: 4, fontWeight: '700' }}>
                      {money(weekUsd)} · {weekSales.length} {tr('completed sales', 'ការលក់សរុប')}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 220,
                      backgroundColor: P.surface,
                      borderRadius: 16,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: P.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                        {tr('Stock Valuation', 'តម្លៃស្តុកសរុប')}
                      </Text>
                      <View style={{ backgroundColor: P.tealLight, padding: 8, borderRadius: 10 }}>
                        <Layers size={18} color={P.teal} />
                      </View>
                    </View>
                    <Text style={{ color: P.text, fontSize: 28, fontWeight: '800', marginTop: 10, letterSpacing: -0.6 }}>
                      {khr(inventoryValueKhr)}
                    </Text>
                    <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 4, fontWeight: '600' }}>
                      {money(inventoryValueUsd)} · {totalUnits.toLocaleString()} {tr('units', 'ឯកតា')}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 220,
                      backgroundColor: P.surface,
                      borderRadius: 16,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: P.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                        {tr('Low Stock Alerts', 'ទំនិញជិតអស់ស្តុក')}
                      </Text>
                      <View
                        style={{
                          backgroundColor: lowStockProducts.length ? P.amberLight : P.emeraldLight,
                          padding: 8,
                          borderRadius: 10,
                        }}
                      >
                        <AlertTriangle size={18} color={lowStockProducts.length ? P.amber : P.emerald} />
                      </View>
                    </View>
                    <Text
                      style={{
                        color: lowStockProducts.length ? P.amber : P.emerald,
                        fontSize: 28,
                        fontWeight: '800',
                        marginTop: 10,
                        letterSpacing: -0.6,
                      }}
                    >
                      {lowStockProducts.length} SKUs
                    </Text>
                    <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 4, fontWeight: '600' }}>
                      {products.length} {tr('total catalog items', 'មុខទំនិញសរុប')}
                    </Text>
                  </View>
                </View>

                {/* Middle Row: 7-Day Revenue Bar Chart + Live Cross-Device Notification Feed */}
                <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 18 }}>
                  {/* 7-Day Bar Chart */}
                  <View
                    style={{
                      flex: 1.8,
                      backgroundColor: P.surface,
                      borderRadius: 16,
                      padding: 22,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <View>
                        <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
                          {tr('7-Day Revenue Performance (KHR ៛)', 'ចំណូលប្រចាំថ្ងៃរយៈពេល ៧ ថ្ងៃ (៛)')}
                        </Text>
                        <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
                          {tr('Rounded to 100 ៛ Khmer Riel denominations', 'គណនាជាប្រាក់រៀល មូលដ្ឋាន ១០០ ៛')}
                        </Text>
                      </View>
                      <Press
                        onPress={() => setTab('sales')}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: P.surfaceAlt,
                          borderWidth: 1,
                          borderColor: P.border,
                        }}
                      >
                        <Text style={{ color: P.primary, fontSize: 12, fontWeight: '700' }}>
                          {tr('View Full Ledger →', 'មើលបញ្ជីលក់ទាំងអស់ →')}
                        </Text>
                      </Press>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 12, paddingTop: 20 }}>
                      {chartDays.map((d, idx) => {
                        const pct = Math.max(8, Math.round((d.total / maxDayKhr) * 100));
                        const isToday = idx === chartDays.length - 1;
                        return (
                          <View key={d.label} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                            <Text style={{ color: P.textSub, fontSize: 10.5, fontWeight: '700', marginBottom: 6 }} numberOfLines={1}>
                              {d.total > 0 ? khr(d.total) : '0 ៛'}
                            </Text>
                            <View
                              style={{
                                width: '72%',
                                height: `${pct}%`,
                                backgroundColor: isToday ? P.primary : '#C4B5FD',
                                borderRadius: 8,
                                minHeight: 8,
                              }}
                            />
                            <Text
                              style={{
                                color: isToday ? P.primary : P.muted,
                                fontSize: 11.5,
                                fontWeight: isToday ? '800' : '600',
                                marginTop: 8,
                              }}
                            >
                              {d.shortLabel}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Right Panel: Live Notifications & Restock Queue */}
                  <View
                    style={{
                      flex: 1.1,
                      backgroundColor: P.surface,
                      borderRadius: 16,
                      padding: 22,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Bell size={16} color={P.primary} />
                        <Text style={{ color: P.text, fontSize: 15.5, fontWeight: '800' }}>
                          {tr('Live Alerts & Stock Queue', 'ការជូនដំណឹងផ្ទាល់ & ស្តុកជិតអស់')}
                        </Text>
                      </View>
                      <Press onPress={() => setTab('inventory')}>
                        <Text style={{ color: P.primary, fontSize: 12, fontWeight: '700' }}>Manage</Text>
                      </Press>
                    </View>

                    {liveFeed.length > 0 && (
                      <View style={{ gap: 8, marginBottom: 12 }}>
                        {liveFeed.slice(0, 3).map((ev) => (
                          <View
                            key={ev.id}
                            style={{
                              padding: 10,
                              borderRadius: 10,
                              backgroundColor: ev.type === 'CHECKOUT' ? P.emeraldLight : P.primaryLight,
                            }}
                          >
                            <Text
                              style={{
                                color: ev.type === 'CHECKOUT' ? P.emerald : P.primary,
                                fontWeight: '800',
                                fontSize: 12.5,
                              }}
                            >
                              {tr(ev.titleEn, ev.titleKh)}
                            </Text>
                            <Text style={{ color: P.textSub, fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>
                              {ev.detail}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {lowStockProducts.length === 0 ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ color: P.emerald, fontWeight: '800', fontSize: 13.5 }}>
                          {tr('All products well-stocked!', 'ទំនិញទាំងអស់មានស្តុកគ្រប់គ្រាន់!')}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {lowStockProducts.slice(0, 4).map((p) => (
                          <View
                            key={p.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 10,
                              borderRadius: 10,
                              backgroundColor: P.surfaceAlt,
                              borderWidth: 1,
                              borderColor: P.border,
                            }}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ color: P.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={{ color: p.stock === 0 ? P.rose : P.amber, fontSize: 11.5, fontWeight: '700' }}>
                                {p.stock === 0 ? 'OUT OF STOCK' : `${p.stock} left`} · {khr(p.priceUsd * rate)}
                              </Text>
                            </View>
                            <Press
                              onPress={() => void quickRestock(p, 20)}
                              style={{
                                backgroundColor: P.primaryLight,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                              }}
                            >
                              <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>+20</Text>
                            </Press>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Recent Transactions Table Preview */}
                <View
                  style={{
                    backgroundColor: P.surface,
                    borderRadius: 16,
                    padding: 22,
                    borderWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
                      {tr('Latest POS Transactions', 'ប្រតិបត្តិការលក់ចុងក្រោយ')}
                    </Text>
                    <Press
                      onPress={() => handleExportSales(activeSales)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: P.emeraldLight,
                      }}
                    >
                      <Download size={14} color={P.emerald} />
                      <Text style={{ color: P.emerald, fontSize: 12, fontWeight: '800' }}>Export Excel</Text>
                    </Press>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: P.surfaceAlt,
                      borderRadius: 8,
                      borderBottomWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <Text style={{ flex: 1.1, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>RECEIPT ID</Text>
                    <Text style={{ flex: 1.5, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>DATE & TIME</Text>
                    <Text style={{ flex: 2, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>ITEMS</Text>
                    <Text style={{ flex: 1.2, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'right' }}>TOTAL (៛ KHR)</Text>
                    <Text style={{ flex: 1, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'right' }}>USD ($)</Text>
                  </View>

                  {activeSales.slice(0, 6).map((s) => (
                    <Press
                      key={s.id}
                      onPress={() => setActiveReceipt(s)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 13,
                        paddingHorizontal: 12,
                        borderBottomWidth: 1,
                        borderColor: P.border,
                      }}
                    >
                      <Text style={{ flex: 1.1, color: P.primary, fontWeight: '800', fontSize: 13 }}>
                        #{s.id.slice(0, 8).toUpperCase()}
                      </Text>
                      <Text style={{ flex: 1.5, color: P.textSub, fontSize: 12.5 }}>
                        {new Date(s.createdAt).toLocaleString()}
                      </Text>
                      <Text style={{ flex: 2, color: P.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                        {s.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                      </Text>
                      <Text style={{ flex: 1.2, color: P.text, fontWeight: '800', fontSize: 14, textAlign: 'right' }}>
                        {khr(s.totalKhr || s.totalUsd * s.rateSnapshot)}
                      </Text>
                      <Text style={{ flex: 1, color: P.muted, fontWeight: '600', fontSize: 12.5, textAlign: 'right' }}>
                        {money(s.totalUsd)}
                      </Text>
                    </Press>
                  ))}
                </View>
              </View>
            )}

            {/* ==================== TAB 2: SPLIT-SCREEN POS REGISTER ==================== */}
            {tab === 'pos' && (
              <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 22, alignItems: 'flex-start' }}>
                {/* LEFT COLUMN: Product Catalog Grid */}
                <View
                  style={{
                    flex: 1.7,
                    width: '100%',
                    backgroundColor: P.surface,
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  {/* Search / Hardware Barcode Input Bar (No Camera Scan on Web) */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: P.surfaceAlt,
                        borderWidth: 1.5,
                        borderColor: P.borderStrong,
                        borderRadius: 10,
                        paddingHorizontal: 13,
                        height: 46,
                        gap: 8,
                      }}
                    >
                      <Barcode size={18} color={P.primary} />
                      <TextInput
                        value={posSearch}
                        onChangeText={setPosSearch}
                        placeholder={tr(
                          'Scan with USB/Bluetooth barcode scanner or type product name + Enter...',
                          'ស្កេនដោយម៉ាស៊ីនស្កេនបាកូដ ឬវាយឈ្មោះទំនិញ...'
                        )}
                        placeholderTextColor={P.muted}
                        onSubmitEditing={() => {
                          const q = posSearch.trim();
                          if (!q) return;
                          const exact = products.find((p) => (p.barcode || '').toLowerCase() === q.toLowerCase());
                          if (exact) {
                            addToCart(exact, 1);
                            setPosSearch('');
                            toast.show(`Added ${exact.name}`, { tone: 'success' });
                          } else {
                            void handleHardwareBarcodeScan(q);
                            setPosSearch('');
                          }
                        }}
                        style={{ flex: 1, color: P.text, fontSize: 14, height: '100%' }}
                      />
                      {posSearch ? (
                        <Press onPress={() => setPosSearch('')}>
                          <X size={16} color={P.muted} />
                        </Press>
                      ) : null}
                    </View>
                  </View>

                  {/* Category Filter Pills */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
                  >
                    {categories.map((c) => {
                      const active = posCat === c;
                      return (
                        <Press
                          key={c}
                          onPress={() => setPosCat(c)}
                          style={{
                            paddingHorizontal: 13,
                            paddingVertical: 7,
                            borderRadius: 99,
                            backgroundColor: active ? P.primary : P.surfaceAlt,
                            borderWidth: 1,
                            borderColor: active ? P.primary : P.border,
                          }}
                        >
                          <Text
                            style={{
                              color: active ? '#FFFFFF' : P.textSub,
                              fontSize: 12.5,
                              fontWeight: '700',
                            }}
                          >
                            {c}
                          </Text>
                        </Press>
                      );
                    })}
                  </ScrollView>

                  {/* Multi-column Product Tiles */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {filteredPosProducts.map((p) => {
                      const inCart = cart[p.id] || 0;
                      const outOfStock = p.stock <= 0;
                      return (
                        <Press
                          key={p.id}
                          disabled={outOfStock}
                          onPress={() => addToCart(p, 1)}
                          style={{
                            width: isCompact ? '48%' : '31.5%',
                            minWidth: 170,
                            backgroundColor: inCart ? '#F5F3FF' : P.surfaceAlt,
                            borderRadius: 12,
                            padding: 14,
                            borderWidth: 1.5,
                            borderColor: inCart ? P.primary : P.border,
                            opacity: outOfStock ? 0.5 : 1,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={{ color: P.muted, fontSize: 11, fontWeight: '700' }}>
                              {p.category}
                            </Text>
                            {inCart > 0 && (
                              <View
                                style={{
                                  backgroundColor: P.primary,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 99,
                                }}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                                  ×{inCart}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={{ color: P.text, fontWeight: '800', fontSize: 14.5, marginTop: 6 }}
                            numberOfLines={1}
                          >
                            {p.name}
                          </Text>
                          <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 2 }}>
                            {p.barcode || 'No barcode'}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'flex-end',
                              marginTop: 12,
                            }}
                          >
                            <View>
                              <Text style={{ color: P.primary, fontWeight: '800', fontSize: 16 }}>
                                {khr(p.priceUsd * rate)}
                              </Text>
                              <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '600' }}>
                                {money(p.priceUsd)}
                              </Text>
                            </View>
                            <Text
                              style={{
                                color: outOfStock ? P.rose : p.stock <= p.lowStockThreshold ? P.amber : P.emerald,
                                fontSize: 11.5,
                                fontWeight: '700',
                              }}
                            >
                              {outOfStock ? 'Out' : `${p.stock} in stock`}
                            </Text>
                          </View>
                        </Press>
                      );
                    })}
                  </View>
                </View>

                {/* RIGHT COLUMN: Sticky POS Register Ticket */}
                <View
                  style={{
                    flex: 1,
                    width: '100%',
                    backgroundColor: P.surface,
                    borderRadius: 16,
                    padding: 22,
                    borderWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ backgroundColor: P.primaryLight, padding: 9, borderRadius: 10 }}>
                        <ShoppingBag size={18} color={P.primary} />
                      </View>
                      <View>
                        <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
                          {tr('Current Register Ticket', 'វិក្កយបត្រគិតលុយ')}
                        </Text>
                        <Text style={{ color: P.muted, fontSize: 12 }}>
                          {cartLines.length} {tr('line items', 'មុខទំនិញ')}
                        </Text>
                      </View>
                    </View>
                    {cartLines.length > 0 && (
                      <Press onPress={() => setCart({})}>
                        <Text style={{ color: P.rose, fontSize: 12.5, fontWeight: '700' }}>Clear</Text>
                      </Press>
                    )}
                  </View>

                  {cartLines.length === 0 ? (
                    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                      <ShoppingCart size={36} color={P.borderStrong} />
                      <Text style={{ color: P.muted, marginTop: 10, fontWeight: '600', fontSize: 13.5, textAlign: 'center' }}>
                        {tr(
                          'Scan items with your barcode scanner device or click products on the left',
                          'ស្កេនទំនិញដោយម៉ាស៊ីនស្កេនបាកូដ ឬចុចជ្រើសរើសទំនិញនៅខាងឆ្វេង'
                        )}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10, marginBottom: 18 }}>
                      {cartLines.map(({ product, qty }) => (
                        <View
                          key={product.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: P.surfaceAlt,
                            borderWidth: 1,
                            borderColor: P.border,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ color: P.text, fontWeight: '700', fontSize: 13.5 }} numberOfLines={1}>
                              {product.name}
                            </Text>
                            <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
                              {khr(product.priceUsd * rate)} × {qty} ={' '}
                              <Text style={{ color: P.primary, fontWeight: '800' }}>
                                {khr(product.priceUsd * qty * rate)}
                              </Text>
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Press
                              onPress={() => addToCart(product, -1)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                backgroundColor: P.surface,
                                borderWidth: 1,
                                borderColor: P.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Minus size={14} color={P.text} />
                            </Press>
                            <Text style={{ minWidth: 24, textAlign: 'center', fontWeight: '800', color: P.text }}>
                              {qty}
                            </Text>
                            <Press
                              onPress={() => addToCart(product, 1)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                backgroundColor: P.primary,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Plus size={14} color="#FFFFFF" />
                            </Press>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Tender Currency Selector */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {(['KHR', 'USD'] as const).map((ccy) => {
                      const active = paidCurrency === ccy;
                      return (
                        <Press
                          key={ccy}
                          onPress={() => setPaidCurrency(ccy)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            alignItems: 'center',
                            backgroundColor: active ? P.primaryLight : P.surfaceAlt,
                            borderWidth: 1.5,
                            borderColor: active ? P.primary : P.border,
                          }}
                        >
                          <Text style={{ color: active ? P.primary : P.textSub, fontWeight: '800', fontSize: 13 }}>
                            {ccy === 'KHR' ? 'Pay in Riel (៛ KHR)' : 'Pay in Dollar ($ USD)'}
                          </Text>
                        </Press>
                      );
                    })}
                  </View>

                  {/* Totals Summary Box */}
                  <View
                    style={{
                      backgroundColor: '#0F172A',
                      borderRadius: 14,
                      padding: 18,
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 12.5, fontWeight: '700' }}>
                        {tr('GRAND TOTAL (100 ៛ ROUNDED)', 'សរុបត្រូវបង់ (គិតជាប្រាក់រៀល)')}
                      </Text>
                      <Text style={{ color: '#A7F3D0', fontSize: 11.5, fontWeight: '700' }}>
                        1$ = {khr(rate)}
                      </Text>
                    </View>
                    <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 6, letterSpacing: -0.8 }}>
                      {khr(cartTotalKhr)}
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 15, fontWeight: '700', marginTop: 2 }}>
                      {money(cartTotalUsd)} USD
                    </Text>
                  </View>

                  <Press
                    disabled={!cartLines.length || checkingOut}
                    onPress={() => void completeCheckout()}
                    style={{
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: cartLines.length ? P.primary : P.borderStrong,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    {checkingOut ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                          {tr('Complete Checkout & Issue Receipt', 'បញ្ចប់ការលក់ និងបោះពុម្ពវិក្កយបត្រ')}
                        </Text>
                      </>
                    )}
                  </Press>
                </View>
              </View>
            )}

            {/* ==================== TAB 3: INVENTORY DATA TABLE ==================== */}
            {tab === 'inventory' && (
              <View
                style={{
                  backgroundColor: P.surface,
                  borderRadius: 16,
                  padding: 22,
                  borderWidth: 1,
                  borderColor: P.border,
                }}
              >
                {/* Controls Bar */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: P.surfaceAlt,
                        borderWidth: 1,
                        borderColor: P.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        height: 42,
                        gap: 8,
                      }}
                    >
                      <Search size={16} color={P.muted} />
                      <TextInput
                        value={invSearch}
                        onChangeText={setInvSearch}
                        onSubmitEditing={() => {
                          if (invSearch.trim()) {
                            void handleHardwareBarcodeScan(invSearch.trim());
                          }
                        }}
                        placeholder={tr(
                          'Filter or scan with USB/Bluetooth barcode scanner...',
                          'ស្វែងរក ឬស្កេនដោយម៉ាស៊ីនស្កេនបាកូដ...'
                        )}
                        placeholderTextColor={P.muted}
                        style={{ flex: 1, color: P.text, fontSize: 13.5, height: '100%' }}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {(['all', 'low', 'out'] as const).map((st) => (
                      <Press
                        key={st}
                        onPress={() => setInvStatusFilter(st)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: invStatusFilter === st ? P.primaryLight : P.surfaceAlt,
                          borderWidth: 1,
                          borderColor: invStatusFilter === st ? P.primary : P.border,
                        }}
                      >
                        <Text
                          style={{
                            color: invStatusFilter === st ? P.primary : P.textSub,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {st === 'all' ? 'All Stock' : st === 'low' ? 'Low Stock' : 'Out of Stock'}
                        </Text>
                      </Press>
                    ))}

                    <Press
                      onPress={() => handleExportInventory(filteredInventory)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 13,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: P.emeraldLight,
                      }}
                    >
                      <Download size={14} color={P.emerald} />
                      <Text style={{ color: P.emerald, fontSize: 12, fontWeight: '800' }}>Export .XLSX</Text>
                    </Press>

                    <Press
                      onPress={() => openCreateProduct()}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: P.primary,
                      }}
                    >
                      <PackagePlus size={15} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                        {tr('Add Product', 'បន្ថែមទំនិញ')}
                      </Text>
                    </Press>
                  </View>
                </View>

                {/* Category Filter Row */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                >
                  {categories.map((c) => {
                    const active = invCat === c;
                    return (
                      <Press
                        key={c}
                        onPress={() => setInvCat(c)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 99,
                          backgroundColor: active ? P.sidebarBg : P.surfaceAlt,
                        }}
                      >
                        <Text style={{ color: active ? '#FFFFFF' : P.textSub, fontSize: 12, fontWeight: '700' }}>
                          {c}
                        </Text>
                      </Press>
                    );
                  })}
                </ScrollView>

                {/* Tabular Grid Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    backgroundColor: P.surfaceAlt,
                    borderRadius: 8,
                    borderBottomWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  <Text style={{ flex: 2, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>PRODUCT & BARCODE</Text>
                  <Text style={{ flex: 1.1, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>CATEGORY</Text>
                  <Text style={{ flex: 1.2, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'right' }}>PRICE (៛ KHR)</Text>
                  <Text style={{ flex: 0.9, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'right' }}>USD ($)</Text>
                  <Text style={{ flex: 1, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'center' }}>STOCK</Text>
                  <Text style={{ flex: 1.7, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'right' }}>QUICK ACTIONS</Text>
                </View>

                {filteredInventory.map((p) => {
                  const isLow = p.stock <= p.lowStockThreshold;
                  return (
                    <View
                      key={p.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 13,
                        paddingHorizontal: 14,
                        borderBottomWidth: 1,
                        borderColor: P.border,
                      }}
                    >
                      <View style={{ flex: 2 }}>
                        <Text style={{ color: P.text, fontWeight: '700', fontSize: 14 }}>{p.name}</Text>
                        <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 2 }}>
                          {p.barcode ? `SKU: ${p.barcode}` : 'No Barcode'}
                          {p.expirationDate ? ` · Exp: ${p.expirationDate}` : ''}
                        </Text>
                      </View>

                      <View style={{ flex: 1.1 }}>
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            backgroundColor: P.surfaceAlt,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: P.border,
                          }}
                        >
                          <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700' }}>{p.category}</Text>
                        </View>
                      </View>

                      <Text style={{ flex: 1.2, color: P.primary, fontWeight: '800', fontSize: 14.5, textAlign: 'right' }}>
                        {khr(p.priceUsd * rate)}
                      </Text>

                      <Text style={{ flex: 0.9, color: P.muted, fontWeight: '600', fontSize: 12.5, textAlign: 'right' }}>
                        {money(p.priceUsd)}
                      </Text>

                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <View
                          style={{
                            backgroundColor: p.stock === 0 ? P.roseLight : isLow ? P.amberLight : P.emeraldLight,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 99,
                          }}
                        >
                          <Text
                            style={{
                              color: p.stock === 0 ? P.rose : isLow ? P.amber : P.emerald,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            {p.stock} units
                          </Text>
                        </View>
                      </View>

                      <View style={{ flex: 1.7, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                        <Press
                          onPress={() => void quickRestock(p, 10)}
                          style={{
                            backgroundColor: P.surfaceAlt,
                            borderWidth: 1,
                            borderColor: P.border,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 7,
                          }}
                        >
                          <Text style={{ color: P.text, fontSize: 11.5, fontWeight: '800' }}>+10</Text>
                        </Press>
                        <Press
                          onPress={() => void quickRestock(p, 100)}
                          style={{
                            backgroundColor: P.primaryLight,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 7,
                          }}
                        >
                          <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>+100</Text>
                        </Press>
                        <Press
                          onPress={() => openEditProduct(p)}
                          style={{
                            backgroundColor: P.surfaceAlt,
                            borderWidth: 1,
                            borderColor: P.border,
                            padding: 7,
                            borderRadius: 7,
                          }}
                        >
                          <Edit3 size={14} color={P.textSub} />
                        </Press>
                        <Press
                          onPress={() => void archiveProduct(p)}
                          style={{
                            backgroundColor: P.roseLight,
                            padding: 7,
                            borderRadius: 7,
                          }}
                        >
                          <Trash2 size={14} color={P.rose} />
                        </Press>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ==================== TAB 4: SALES LEDGER ==================== */}
            {tab === 'sales' && (
              <View
                style={{
                  backgroundColor: P.surface,
                  borderRadius: 16,
                  padding: 22,
                  borderWidth: 1,
                  borderColor: P.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      minWidth: 240,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: P.surfaceAlt,
                      borderWidth: 1,
                      borderColor: P.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 42,
                      gap: 8,
                    }}
                  >
                    <Search size={16} color={P.muted} />
                    <TextInput
                      value={salesSearch}
                      onChangeText={setSalesSearch}
                      placeholder="Search receipt ID or product sold..."
                      placeholderTextColor={P.muted}
                      style={{ flex: 1, color: P.text, fontSize: 13.5, height: '100%' }}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['today', '7d', '30d', 'all'] as const).map((r) => (
                      <Press
                        key={r}
                        onPress={() => setSalesRange(r)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: salesRange === r ? P.primary : P.surfaceAlt,
                        }}
                      >
                        <Text
                          style={{
                            color: salesRange === r ? '#FFFFFF' : P.textSub,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time'}
                        </Text>
                      </Press>
                    ))}

                    <Press
                      onPress={() => handleExportSales(filteredSales)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: P.emeraldLight,
                      }}
                    >
                      <Download size={14} color={P.emerald} />
                      <Text style={{ color: P.emerald, fontSize: 12, fontWeight: '800' }}>Export Ledger (.XLSX)</Text>
                    </Press>
                  </View>
                </View>

                {/* Ledger Table Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    backgroundColor: P.surfaceAlt,
                    borderRadius: 8,
                    borderBottomWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  <Text style={{ flex: 1, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>RECEIPT</Text>
                  <Text style={{ flex: 1.4, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>TIMESTAMP</Text>
                  <Text style={{ flex: 2.2, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>LINE ITEMS</Text>
                  <Text style={{ flex: 0.8, color: P.muted, fontSize: 11.5, fontWeight: '800' }}>TENDER</Text>
                  <Text style={{ flex: 1.2, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'right' }}>TOTAL (៛ KHR)</Text>
                  <Text style={{ flex: 0.9, color: P.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'right' }}>USD ($)</Text>
                </View>

                {filteredSales.map((s) => (
                  <Press
                    key={s.id}
                    onPress={() => setActiveReceipt(s)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderBottomWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <Text style={{ flex: 1, color: P.primary, fontWeight: '800', fontSize: 13 }}>
                      #{s.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={{ flex: 1.4, color: P.textSub, fontSize: 12.5 }}>
                      {new Date(s.createdAt).toLocaleString()}
                    </Text>
                    <Text style={{ flex: 2.2, color: P.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                      {s.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                    </Text>
                    <View style={{ flex: 0.8 }}>
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: P.primaryLight,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: P.primary, fontSize: 11, fontWeight: '800' }}>
                          {s.paidCurrency || 'KHR'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ flex: 1.2, color: P.text, fontWeight: '800', fontSize: 14.5, textAlign: 'right' }}>
                      {khr(s.totalKhr || s.totalUsd * s.rateSnapshot)}
                    </Text>
                    <Text style={{ flex: 0.9, color: P.muted, fontWeight: '600', fontSize: 12.5, textAlign: 'right' }}>
                      {money(s.totalUsd)}
                    </Text>
                  </Press>
                ))}
              </View>
            )}

            {/* ==================== TAB 5: PORTAL SETTINGS ==================== */}
            {tab === 'settings' && (
              <View style={{ maxWidth: 620, gap: 22 }}>
                {/* Exchange Rate Configuration (100-Riel steps) */}
                <View
                  style={{
                    backgroundColor: P.surface,
                    borderRadius: 16,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
                    {tr('Khmer Riel (KHR ៛) Exchange Rate', 'ការកំណត់អត្រាប្តូរប្រាក់រៀល (៛)')}
                  </Text>
                  <Text style={{ color: P.muted, fontSize: 13, marginTop: 4, marginBottom: 18 }}>
                    {tr(
                      'All Khmer Riel amounts automatically round to multiples of 100 ៛ (e.g., 100 ៛, 2,100 ៛, 5,010,100 ៛).',
                      'គ្រប់ចំនួនទឹកប្រាក់រៀលទាំងអស់ត្រូវបានបង្គត់ទៅមូលដ្ឋាន ១០០ រៀល (ឧ. 100 ៛, 2,100 ៛, 5,010,100 ៛)។'
                    )}
                  </Text>

                  <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
                    1 USD IN KHMER RIEL (៛)
                  </Text>
                  <TextInput
                    value={rateInput}
                    onChangeText={setRateInput}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1.5,
                      borderColor: P.borderStrong,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      height: 48,
                      fontSize: 18,
                      fontWeight: '800',
                      color: P.text,
                      backgroundColor: P.surfaceAlt,
                    }}
                  />

                  {/* Quick 100-Riel Presets */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 18 }}>
                    {[4000, 4100, 4200].map((preset) => (
                      <Press
                        key={preset}
                        onPress={() => setRateInput(String(preset))}
                        style={{
                          flex: 1,
                          paddingVertical: 9,
                          borderRadius: 8,
                          backgroundColor: Number(rateInput) === preset ? P.primaryLight : P.surfaceAlt,
                          borderWidth: 1,
                          borderColor: Number(rateInput) === preset ? P.primary : P.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: P.text, fontWeight: '800', fontSize: 13 }}>
                          {khr(preset)}
                        </Text>
                      </Press>
                    ))}
                  </View>

                  <Press
                    disabled={savingRate}
                    onPress={() => void saveExchangeRate()}
                    style={{
                      height: 46,
                      borderRadius: 10,
                      backgroundColor: P.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                      {savingRate ? 'Saving...' : tr('Save Exchange Rate', 'រក្សាទុកអត្រាប្តូរប្រាក់')}
                    </Text>
                  </Press>
                </View>

                {/* Hardware Scanner Instructions Card */}
                <View
                  style={{
                    backgroundColor: P.surface,
                    borderRadius: 16,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Usb size={20} color={P.emerald} />
                    <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
                      {tr('Hardware Barcode Scanner Device (USB / Bluetooth)', 'ការភ្ជាប់ម៉ាស៊ីនស្កេនបាកូដ (USB / Bluetooth)')}
                    </Text>
                  </View>
                  <Text style={{ color: P.muted, fontSize: 13, lineHeight: 20 }}>
                    {tr(
                      'Plug in any USB or 2.4GHz wireless / Bluetooth barcode scanner gun. The portal automatically listens for barcode scans globally—no camera required on web.',
                      'គ្រាន់តែដោតខ្សែ USB ឬភ្ជាប់ Bluetooth ម៉ាស៊ីនស្កេនបាកូដ នោះវេបសាយនឹងទទួលការស្កេនដោយស្វ័យប្រវត្តិភ្លាមៗ។'
                    )}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ==================== ADD / EDIT PRODUCT MODAL ==================== */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 520,
              backgroundColor: P.surface,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ color: P.text, fontSize: 19, fontWeight: '800' }}>
                {editingProduct
                  ? tr('Edit Product', 'កែប្រែទំនិញ')
                  : tr('Create New Product', 'បន្ថែមទំនិញថ្មី')}
              </Text>
              <Press onPress={() => setShowProductModal(false)}>
                <X size={20} color={P.muted} />
              </Press>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 5 }}>
                  {tr('PRODUCT NAME', 'ឈ្មោះទំនិញ')}
                </Text>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Angkor Puro Water 500ml"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 42,
                    color: P.text,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1.3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
                      {tr('BARCODE / SKU', 'លេខបាកូដ')}
                    </Text>
                    {!editingProduct && (
                      <Press
                        onPress={() =>
                          setFormBarcode(
                            'ES' +
                              Date.now().toString(36).toUpperCase() +
                              Math.random().toString(36).slice(2, 5).toUpperCase()
                          )
                        }
                      >
                        <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>
                          + Generate SKU
                        </Text>
                      </Press>
                    )}
                  </View>
                  <TextInput
                    value={formBarcode}
                    editable={!editingProduct}
                    onChangeText={setFormBarcode}
                    placeholder="Scan with USB scanner or type"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 42,
                      color: editingProduct ? P.muted : P.text,
                      backgroundColor: editingProduct ? P.surfaceAlt : P.surface,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 5 }}>
                    {tr('CATEGORY', 'ប្រភេទទំនិញ')}
                  </Text>
                  <TextInput
                    value={formCategory}
                    onChangeText={setFormCategory}
                    placeholder="General"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 42,
                      color: P.text,
                    }}
                  />
                </View>
              </View>

              {/* Price with 100-Riel Stepper Buttons */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
                    {tr('UNIT PRICE', 'តម្លៃលក់')} ({formCcy === 'KHR' ? '៛ KHR — 100 ៛ multiples' : '$ USD'})
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['KHR', 'USD'] as const).map((c) => (
                      <Press
                        key={c}
                        onPress={() => {
                          if (c === formCcy) return;
                          const num = Number(formPrice) || 0;
                          if (c === 'KHR') {
                            setFormPrice(String(roundKhr(num * rate)));
                          } else {
                            setFormPrice((num / rate).toFixed(2));
                          }
                          setFormCcy(c);
                        }}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: formCcy === c ? P.primary : P.surfaceAlt,
                        }}
                      >
                        <Text style={{ color: formCcy === c ? '#FFFFFF' : P.textSub, fontSize: 11, fontWeight: '800' }}>
                          {c}
                        </Text>
                      </Press>
                    ))}
                  </View>
                </View>
                <TextInput
                  value={formPrice}
                  onChangeText={setFormPrice}
                  keyboardType="numeric"
                  placeholder="2100"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 44,
                    fontSize: 16,
                    fontWeight: '800',
                    color: P.text,
                  }}
                />
                {formCcy === 'KHR' && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    {[100, 500, 1000, 5000].map((step) => (
                      <Press
                        key={step}
                        onPress={() => {
                          const cur = roundKhr(Number(formPrice) || 0);
                          setFormPrice(String(cur + step));
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 7,
                          backgroundColor: P.primaryLight,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>
                          +{step.toLocaleString()} ៛
                        </Text>
                      </Press>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 5 }}>
                    {tr('STOCK QUANTITY', 'ចំនួនស្តុក')}
                  </Text>
                  <TextInput
                    value={formStock}
                    onChangeText={setFormStock}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 42,
                      color: P.text,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 5 }}>
                    {tr('LOW STOCK ALERT', 'កម្រិតជូនដំណឹងស្តុកជិតអស់')}
                  </Text>
                  <TextInput
                    value={formLowThreshold}
                    onChangeText={setFormLowThreshold}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 42,
                      color: P.text,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 5 }}>
                  {tr('EXPIRATION DATE (OPTIONAL YYYY-MM-DD)', 'ថ្ងៃផុតកំណត់ (YYYY-MM-DD)')}
                </Text>
                <TextInput
                  value={formExpiry}
                  onChangeText={setFormExpiry}
                  placeholder="2027-12-31"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 42,
                    color: P.text,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Press
                  onPress={() => setShowProductModal(false)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 10,
                    backgroundColor: P.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: P.textSub, fontWeight: '700' }}>
                    {tr('Cancel', 'បោះបង់')}
                  </Text>
                </Press>
                <Press
                  disabled={savingProduct}
                  onPress={() => void saveProductForm()}
                  style={{
                    flex: 1.5,
                    height: 46,
                    borderRadius: 10,
                    backgroundColor: P.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {savingProduct
                      ? 'Saving...'
                      : editingProduct
                      ? tr('Save Changes', 'រក្សាទុកការកែប្រែ')
                      : tr('Create Product', 'បង្កើតទំនិញថ្មី')}
                  </Text>
                </Press>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* RECEIPT MODAL */}
      <ReceiptModal sale={activeReceipt} onClose={() => setActiveReceipt(null)} />
    </View>
  );
}
