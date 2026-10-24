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
import { api, DEFAULT_UOM_CONFIGS, Product, Sale, Settings, UomConfig } from '../api';
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
import { getLiveActivityLog, markEventNotified, onRemoteScannerScan, subscribeLiveActivity } from '../liveSync';

type PortalTab = 'dashboard' | 'inventory' | 'pos' | 'uom' | 'sales' | 'settings';

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
  const [formWholesaleEnabled, setFormWholesaleEnabled] = useState(false);
  const [formWholesaleCcy, setFormWholesaleCcy] = useState<'KHR' | 'USD'>('KHR');
  const [formWholesalePrice, setFormWholesalePrice] = useState('');
  const [formBaseUnit, setFormBaseUnit] = useState('Piece');
  const [formCaseUnitName, setFormCaseUnitName] = useState('Case');
  const [formCaseQty, setFormCaseQty] = useState('24');
  const [formWholesaleMinQty, setFormWholesaleMinQty] = useState('1');
  const [savingProduct, setSavingProduct] = useState(false);
  const [selectedUomConfigId, setSelectedUomConfigId] = useState<string>('uom-case-24');

  // UOM Configuration & Management state
  const [uomConfigs, setUomConfigs] = useState<UomConfig[]>(DEFAULT_UOM_CONFIGS);
  const [uomSearch, setUomSearch] = useState('');
  const [showUomModal, setShowUomModal] = useState(false);
  const [editingUomConfig, setEditingUomConfig] = useState<UomConfig | null>(null);
  const [uomFormName, setUomFormName] = useState('Case of 24');
  const [uomFormBaseUnit, setUomFormBaseUnit] = useState('Can');
  const [uomFormCaseUnitName, setUomFormCaseUnitName] = useState('Case');
  const [uomFormCaseQty, setUomFormCaseQty] = useState('24');
  const [uomFormDescription, setUomFormDescription] = useState('');
  const [savingUom, setSavingUom] = useState(false);

  // Batch Intake & Create state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [committingBatch, setCommittingBatch] = useState(false);
  const [batchRows, setBatchRows] = useState<
    Array<{
      id: string;
      barcode: string;
      name: string;
      category: string;
      ccy: 'KHR' | 'USD';
      price: string;
      stock: string;
      uomConfigId: string;
      wholesalePrice: string;
    }>
  >([
    { id: 'row-1', barcode: '', name: '', category: 'General', ccy: 'KHR', price: '4000', stock: '24', uomConfigId: 'uom-case-24', wholesalePrice: '80000' },
    { id: 'row-2', barcode: '', name: '', category: 'General', ccy: 'KHR', price: '4000', stock: '24', uomConfigId: 'uom-case-24', wholesalePrice: '80000' },
    { id: 'row-3', barcode: '', name: '', category: 'General', ccy: 'KHR', price: '4000', stock: '24', uomConfigId: 'uom-case-24', wholesalePrice: '80000' },
  ]);

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

  const loadBusyRef = useRef(false);
  const loadAll = useCallback(
    async (silent = false) => {
      if (loadBusyRef.current) return;
      loadBusyRef.current = true;
      if (!silent) setRefreshing(true);
      try {
        // Fetch sequentially so Vercel Serverless reuses one warm container
        const p = await api<Product[]>('/products');
        const s = await api<Sale[]>('/sales');
        const cfg = await api<Settings>('/settings');
        const uoms = await api<UomConfig[]>('/uom').catch(() => DEFAULT_UOM_CONFIGS);
        setProducts(p || []);
        setSales(s || []);
        if (Array.isArray(uoms) && uoms.length > 0) {
          setUomConfigs(uoms);
        }
        if (cfg?.usdToKhr) {
          const roundedRate = roundKhr(Number(cfg.usdToKhr));
          setRate(roundedRate);
          setRateInput(String(roundedRate));
        }
      } catch (e: any) {
        if (!silent) toast.show(e?.message || 'Failed to sync portal data', { tone: 'error' });
      } finally {
        loadBusyRef.current = false;
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
    const unsub = subscribeLiveActivity(() => {
      void loadAll(true);
    });
    const id = setInterval(() => void loadAll(true), 12000);
    return () => {
      unsub();
      clearInterval(id);
    };
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
    const clean = prefillBarcode.trim();
    setFormName('');
    setFormBarcode(clean);
    setFormCategory('General');
    setFormCcy('KHR');
    setFormPrice('4100');
    setFormStock('20');
    setFormLowThreshold('5');
    setFormExpiry('');
    setFormWholesaleEnabled(false);
    setFormWholesaleCcy('KHR');
    setFormWholesalePrice('');
    const defUom = uomConfigs[0] || DEFAULT_UOM_CONFIGS[0];
    setSelectedUomConfigId(defUom.id);
    setFormBaseUnit(defUom.baseUnit);
    setFormCaseUnitName(defUom.caseUnitName);
    setFormCaseQty(String(defUom.caseQty));
    setFormWholesaleMinQty('1');
    setShowProductModal(true);
    if (clean) {
      void lookupBarcodeOnline(clean, { allowFallback: true }).then((info) => {
        if (info?.name) {
          setFormName((prev) => prev.trim() || info.name);
          if (info.category) setFormCategory(info.category);
        }
      });
    }
  }

  function openCreateUomModal(existing?: UomConfig) {
    if (existing) {
      setEditingUomConfig(existing);
      setUomFormName(existing.name);
      setUomFormBaseUnit(existing.baseUnit);
      setUomFormCaseUnitName(existing.caseUnitName);
      setUomFormCaseQty(String(existing.caseQty));
      setUomFormDescription(existing.description || '');
    } else {
      setEditingUomConfig(null);
      setUomFormName('Case of 24');
      setUomFormBaseUnit('Can');
      setUomFormCaseUnitName('Case');
      setUomFormCaseQty('24');
      setUomFormDescription('');
    }
    setShowUomModal(true);
  }

  async function saveUomConfigAction() {
    const name = uomFormName.trim();
    if (!name) {
      toast.show(tr('UOM Name is required', 'សូមបញ្ចូលឈ្មោះឯកតា UOM'), { tone: 'error' });
      return;
    }
    const qty = Math.max(1, parseInt(uomFormCaseQty, 10) || 1);
    setSavingUom(true);
    try {
      if (editingUomConfig) {
        const updated = await api<UomConfig>(`/uom/${encodeURIComponent(editingUomConfig.id)}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            baseUnit: uomFormBaseUnit.trim() || 'Piece',
            caseUnitName: uomFormCaseUnitName.trim() || 'Case',
            caseQty: qty,
            description: uomFormDescription.trim(),
          }),
        });
        setUomConfigs((prev) => prev.map((u) => (u.id === editingUomConfig.id ? updated : u)));
        toast.show(tr(`Updated UOM: ${name}`, `បានកែសម្រួល UOM៖ ${name}`), { tone: 'success' });
      } else {
        const created = await api<UomConfig>('/uom', {
          method: 'POST',
          body: JSON.stringify({
            name,
            baseUnit: uomFormBaseUnit.trim() || 'Piece',
            caseUnitName: uomFormCaseUnitName.trim() || 'Case',
            caseQty: qty,
            description: uomFormDescription.trim(),
          }),
        });
        setUomConfigs((prev) => [...prev, created]);
        toast.show(tr(`Created UOM: ${name}`, `បានបង្កើត UOM៖ ${name}`), { tone: 'success' });
      }
      setShowUomModal(false);
      playScan();
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Failed to save UOM configuration', { tone: 'error' });
    } finally {
      setSavingUom(false);
    }
  }

  async function deleteUomConfigAction(uom: UomConfig) {
    try {
      await api(`/uom/${encodeURIComponent(uom.id)}`, { method: 'DELETE' });
      setUomConfigs((prev) => prev.filter((u) => u.id !== uom.id));
      toast.show(tr(`Deleted UOM: ${uom.name}`, `បានលុប UOM៖ ${uom.name}`), { tone: 'success' });
    } catch (e: any) {
      toast.show(e?.message || 'Failed to delete UOM config', { tone: 'error' });
    }
  }

  function applyUomConfigToProductForm(uomId: string) {
    setSelectedUomConfigId(uomId);
    const cfg = uomConfigs.find((u) => u.id === uomId);
    if (cfg) {
      setFormBaseUnit(cfg.baseUnit);
      setFormCaseUnitName(cfg.caseUnitName);
      setFormCaseQty(String(cfg.caseQty));
    }
  }

  function openBatchModal() {
    setBatchRows([
      { id: `row-${Date.now()}-1`, barcode: '', name: '', category: 'General', ccy: 'KHR', price: '4000', stock: '24', uomConfigId: 'uom-case-24', wholesalePrice: '80000' },
      { id: `row-${Date.now()}-2`, barcode: '', name: '', category: 'General', ccy: 'KHR', price: '4000', stock: '24', uomConfigId: 'uom-case-24', wholesalePrice: '80000' },
      { id: `row-${Date.now()}-3`, barcode: '', name: '', category: 'General', ccy: 'KHR', price: '4000', stock: '24', uomConfigId: 'uom-case-24', wholesalePrice: '80000' },
    ]);
    setShowBatchModal(true);
  }

  async function commitBatchAction() {
    const validRows = batchRows.filter((r) => r.name.trim() || r.barcode.trim());
    if (validRows.length === 0) {
      toast.show(tr('Enter at least one product with name or barcode', 'សូមបញ្ចូលផលិតផលយ៉ាងហោចមួយដែលមានឈ្មោះ ឬបាកូដ'), { tone: 'warning' });
      return;
    }
    setCommittingBatch(true);
    try {
      const itemsToCommit = validRows.map((r) => {
        const uomCfg = uomConfigs.find((u) => u.id === r.uomConfigId);
        return {
          barcode: r.barcode.trim() || undefined,
          name: r.name.trim() || `Item ${r.barcode.trim()}`,
          category: r.category,
          currency: r.ccy,
          price: Number(r.price) || 4000,
          stock: Math.max(0, parseInt(r.stock, 10) || 0),
          baseUnit: uomCfg?.baseUnit || 'Piece',
          caseUnitName: uomCfg?.caseUnitName || 'Case',
          caseQty: uomCfg?.caseQty || 24,
          wholesalePrice: r.wholesalePrice ? Number(r.wholesalePrice) : undefined,
          wholesalePriceUsd: r.wholesalePrice
            ? r.ccy === 'KHR'
              ? Number((roundKhr(Number(r.wholesalePrice)) / rate).toFixed(4))
              : Number(Number(r.wholesalePrice).toFixed(4))
            : undefined,
        };
      });

      const res = await api<{ created: number; restocked: number }>('/inventory/batches/commit', {
        method: 'POST',
        body: JSON.stringify({ items: itemsToCommit }),
      });

      playScan();
      toast.show(
        tr(
          `Batch committed: ${res?.created ?? itemsToCommit.length} new items, ${res?.restocked ?? 0} restocked`,
          `បានបញ្ចូលជាបាច់៖ ${res?.created ?? itemsToCommit.length} ថ្មី, ${res?.restocked ?? 0} បន្ថែមស្តុក`
        ),
        { tone: 'success' }
      );
      setShowBatchModal(false);
      void loadAll(false);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Failed to commit batch', { tone: 'error' });
    } finally {
      setCommittingBatch(false);
    }
  }

  function openCreateUomProduct(initialBarcode = '') {
    openCreateProduct(initialBarcode);
    setFormWholesaleEnabled(true);
    setFormBaseUnit('Can');
    setFormCaseUnitName('Case');
    setFormCaseQty('24');
    setFormWholesaleMinQty('1');
    setFormWholesaleCcy('KHR');
    setFormWholesalePrice('82000');
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
    const hasWh = Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0);
    setFormWholesaleEnabled(hasWh);
    setFormWholesaleCcy('KHR');
    setFormWholesalePrice(hasWh ? String(roundKhr(Number(p.wholesalePriceUsd) * rate)) : '');
    setFormBaseUnit(p.baseUnit || 'Piece');
    setFormCaseUnitName(p.caseUnitName || 'Case');
    setFormCaseQty(String(p.caseQty || 24));
    setFormWholesaleMinQty(String(p.wholesaleMinQty || 1));
    const matchingUom =
      uomConfigs.find(
        (u) =>
          u.caseQty === (p.caseQty || 24) ||
          (p.caseUnitName && u.caseUnitName.toLowerCase() === p.caseUnitName.toLowerCase())
      ) || uomConfigs[0] || DEFAULT_UOM_CONFIGS[0];
    setSelectedUomConfigId(matchingUom.id);
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

      // 0. If the Batch Intake modal is open, fill into the batch table
      if (showBatchModal) {
        playScan();
        setBatchRows((prev) => {
          const emptyIdx = prev.findIndex((r) => !r.barcode.trim());
          const targetIdx = emptyIdx !== -1 ? emptyIdx : prev.length;
          const updated = [...prev];
          if (emptyIdx === -1) {
            updated.push({
              id: `row-${Date.now()}`,
              barcode: code,
              name: '',
              category: 'General',
              ccy: 'KHR',
              price: '4000',
              stock: '24',
              uomConfigId: selectedUomConfigId || 'uom-case-24',
              wholesalePrice: '80000',
            });
          } else {
            updated[emptyIdx] = { ...updated[emptyIdx], barcode: code };
          }
          void lookupBarcodeOnline(code).then((info) => {
            if (info?.name) {
              setBatchRows((curr) =>
                curr.map((r, i) =>
                  i === targetIdx ? { ...r, name: info.name, category: info.category || r.category } : r
                )
              );
            }
          });
          return updated;
        });
        toast.show(tr(`Barcode ${code} added to batch row`, `បាកូដ ${code} បានបញ្ចូលក្នុងតារាងបាច់`), { tone: 'info' });
        return;
      }

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

  // Wireless Mobile Scanner Gun Listener
  useEffect(() => {
    return onRemoteScannerScan((barcode, scanMode) => {
      setLastScannedCode(barcode);
      setScannerFlash(true);
      setTimeout(() => setScannerFlash(false), 1200);

      if (scanMode === 'batch' || scanMode === 'inventory') {
        const found = products.find((p) => (p.barcode || '').toLowerCase() === barcode.toLowerCase());
        if (found) {
          playScan();
          openEditProduct(found);
          toast.show(
            tr(`Mobile Scanner: found ${found.name}`, `ម៉ាស៊ីនស្កេនទូរស័ព្ទ៖ រកឃើញ ${found.name}`),
            { tone: 'success' }
          );
        } else {
          playScan();
          openCreateProduct(barcode);
          toast.show(
            tr(`Mobile Scanner: new barcode ${barcode}`, `ម៉ាស៊ីនស្កេនទូរស័ព្ទ៖ បាកូដថ្មី ${barcode}`),
            { tone: 'info' }
          );
        }
      } else {
        handleHardwareBarcodeScan(barcode);
      }
    });
  }, [handleHardwareBarcodeScan, products, tr, toast, playScan]);

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

    let wholesaleUsdVal: number | null = null;
    if (formWholesaleEnabled && formWholesalePrice) {
      const rawWh = Number(formWholesalePrice);
      if (rawWh > 0) {
        wholesaleUsdVal =
          formWholesaleCcy === 'KHR'
            ? Number((roundKhr(rawWh) / rate).toFixed(4))
            : Number(rawWh.toFixed(4));
      }
    }
    const caseQuantity = Math.max(1, parseInt(formCaseQty, 10) || 1);
    const wholesalePricePerCase =
      wholesaleUsdVal !== null ? wholesaleUsdVal * caseQuantity : null;

    setSavingProduct(true);
    try {
      const payload = {
        name: formName.trim(),
        ...(editingProduct ? {} : { barcode: formBarcode.trim() || null }),
        category: formCategory.trim() || 'General',
        price: finalPrice,
        currency: formCcy,
        priceUsd:
          formCcy === 'KHR'
            ? Number((roundKhr(rawNum) / rate).toFixed(4))
            : Number(rawNum.toFixed(4)),
        originalCcy: formCcy,
        originalPrice: finalPrice,
        stock: qty,
        lowStockThreshold: limit,
        expirationDate: formExpiry.trim() || null,
        wholesalePriceUsd: wholesaleUsdVal,
        wholesaleMinQty: Math.max(1, parseInt(formWholesaleMinQty, 10) || 1),
        baseUnit: formBaseUnit.trim() || 'Piece',
        caseUnitName: formCaseUnitName.trim() || 'Case',
        caseQty: caseQuantity,
        wholesalePricePerCaseUsd: wholesalePricePerCase,
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
    { id: 'uom', label: 'Packaging UOM', khLabel: 'ឯកតាកញ្ចប់ UOM', icon: Layers },
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
            {/* Hardware & Wireless Mobile Scanner Status Card */}
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
                <Smartphone size={13} color="#60A5FA" />
                <Text style={{ color: '#E2E8F0', fontSize: 11.5, fontWeight: '800' }}>
                  {tr('Scanner Gun Ready', 'ម៉ាស៊ីនស្កេនរួចរាល់')}
                </Text>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                {lastScannedCode
                  ? `${tr('Last scanned:', 'ស្កេនចុងក្រោយ៖')} ${lastScannedCode}`
                  : tr('USB / Bluetooth or Mobile Wireless Gun', 'USB / Bluetooth ឬម៉ាស៊ីនស្កេនទូរស័ព្ទ')}
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
                {/* <View style={{ backgroundColor: '#065F46', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                  <Text style={{ color: '#6EE7B7', fontSize: 10, fontWeight: '800' }}>100 ៛ STEP</Text>
                </View> */}
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
              onPress={() => openBatchModal()}
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
              <Layers size={14} color={P.textSub} />
              <Text style={{ color: P.textSub, fontSize: 12.5, fontWeight: '700' }}>
                {tr('Batch Intake', 'បង្កើតជាបាច់')}
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
                        placeholderTextColor="#9CA3AF"
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
                        placeholderTextColor="#9CA3AF"
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
                      onPress={() => openBatchModal()}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 13,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#EDE9FE',
                        borderWidth: 1,
                        borderColor: '#C4B5FD',
                      }}
                    >
                      <Layers size={14} color={P.primary} />
                      <Text style={{ color: P.primary, fontSize: 12, fontWeight: '800' }}>
                        {tr('Batch Intake & Create', 'នាំចូល & បង្កើតជាបាច់')}
                      </Text>
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

            {/* ==================== TAB: PACKAGING UOM LEDGER ==================== */}
            {tab === 'uom' && (
              <View
                style={{
                  backgroundColor: P.surface,
                  borderRadius: 16,
                  padding: 22,
                  borderWidth: 1,
                  borderColor: P.border,
                }}
              >
                {/* Header with Title and Add Button */}
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
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Layers size={22} color={P.primary} />
                      <Text style={{ color: P.text, fontSize: 18, fontWeight: '800' }}>
                        {tr('Packaging Units & Wholesale UOM', 'ឯកតាកញ្ចប់ទំនិញ & លក់ដុំ UOM')}
                      </Text>
                      <View
                        style={{
                          backgroundColor: P.primaryLight,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ color: P.primary, fontSize: 11, fontWeight: '800' }}>
                          {products.filter((p) => Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0)).length} {tr('Wholesale Active', 'ទំនិញលក់ដុំ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: P.muted, fontSize: 13, marginTop: 4 }}>
                      {tr(
                        'Enterprise multi-level packaging hierarchies: configure base unit vs wholesale master cases (e.g. Case of 24, Pack of 6) and bulk tier discounts.',
                        'គ្រប់គ្រងអនុបាតឯកតាកញ្ចប់លក់ដុំ៖ កំណត់ឯកតាមូលដ្ឋាន និងកេស/កញ្ចប់លក់ដុំ (ឧ. កេស ២៤កំប៉ុង កញ្ចប់ ៦ដប) និងតម្លៃលក់ដុំ'
                      )}
                    </Text>
                  </View>

                  <Press
                    onPress={() => openCreateUomProduct()}
                    style={{
                      backgroundColor: P.primary,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                    }}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      {tr('New UOM Product', 'បង្កើតទំនិញ UOM ថ្មី')}
                    </Text>
                  </Press>
                </View>

                {/* KPI Cards for UOM */}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      minWidth: 180,
                      backgroundColor: P.surfaceAlt,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                      {tr('Wholesale Configured', 'បានកំណត់លក់ដុំ')}
                    </Text>
                    <Text style={{ color: P.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
                      {products.filter((p) => Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0)).length} / {products.length}
                    </Text>
                    <Text style={{ color: P.emerald, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                      {products.length > 0
                        ? `${Math.round((products.filter((p) => Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0)).length / products.length) * 100)}% coverage`
                        : '0%'}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 180,
                      backgroundColor: P.surfaceAlt,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                      {tr('Standard Cases (24x / 12x)', 'កេសស្ដង់ដារ (២៤x / ១២x)')}
                    </Text>
                    <Text style={{ color: P.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
                      {products.filter((p) => (p.caseQty || 24) === 24 || (p.caseQty || 24) === 12).length}
                    </Text>
                    <Text style={{ color: P.muted, fontSize: 11, marginTop: 2 }}>
                      {tr('Standard beverage / grocery cases', 'កេសភេសជ្ជៈ & គ្រឿងទេស')}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 180,
                      backgroundColor: P.surfaceAlt,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
                      {tr('Total Stock in Master Cases', 'ស្តុកសរុបគិតជាកេស')}
                    </Text>
                    <Text style={{ color: P.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
                      {products.reduce((acc, p) => acc + Math.floor(p.stock / (p.caseQty || 24)), 0)} {tr('cases', 'កេស')}
                    </Text>
                    <Text style={{ color: P.textSub, fontSize: 11, marginTop: 2 }}>
                      +{products.reduce((acc, p) => acc + (p.stock % (p.caseQty || 24)), 0)} {tr('loose units', 'ឯកតារាយ')}
                    </Text>
                  </View>
                </View>

                {/* UOM CONFIGURATION TEMPLATES MANAGER */}
                <View
                  style={{
                    backgroundColor: P.surfaceAlt,
                    borderRadius: 14,
                    padding: 18,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: P.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <View>
                      <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
                        {tr('Packaging UOM Configurations', 'ទម្រង់កំណត់ឯកតាកញ្ចប់ UOM')}
                      </Text>
                      <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
                        {tr(
                          'Configure reusable packaging standards. These templates are automatically used in Product creation, Update forms, and Batch intake.',
                          'កំណត់ស្តង់ដារឯកតាកញ្ចប់ដែលអាចប្រើឡើងវិញបាន។ ទម្រង់ទាំងនេះនឹងប្រើប្រាស់ពេលបង្កើតទំនិញ និងនាំចូលស្តុក។'
                        )}
                      </Text>
                    </View>
                    <Press
                      onPress={() => openCreateUomModal()}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: P.primary,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                      }}
                    >
                      <Plus size={14} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        {tr('Add UOM Template', 'បន្ថែមទម្រង់ UOM')}
                      </Text>
                    </Press>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {uomConfigs.map((u) => (
                      <View
                        key={u.id}
                        style={{
                          backgroundColor: P.surface,
                          borderRadius: 10,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: P.border,
                          minWidth: 220,
                          flex: 1,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: P.text, fontSize: 14, fontWeight: '800' }}>{u.name}</Text>
                          <View
                            style={{
                              backgroundColor: P.primaryLight,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: P.primary, fontSize: 11, fontWeight: '800' }}>
                              1 {u.caseUnitName} = {u.caseQty} {u.baseUnit}s
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 6 }}>
                          {u.description || `Standard ${u.caseQty}-${u.baseUnit} ${u.caseUnitName} configuration`}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 8,
                            marginTop: 12,
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderColor: P.border,
                          }}
                        >
                          <Press
                            onPress={() => openCreateUomModal(u)}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: P.surfaceAlt,
                            }}
                          >
                            <Text style={{ color: P.textSub, fontSize: 11, fontWeight: '700' }}>
                              {tr('Edit', 'កែ')}
                            </Text>
                          </Press>
                          {uomConfigs.length > 1 && (
                            <Press
                              onPress={() => void deleteUomConfigAction(u)}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: P.roseLight,
                              }}
                            >
                              <Text style={{ color: P.rose, fontSize: 11, fontWeight: '700' }}>
                                {tr('Delete', 'លុប')}
                              </Text>
                            </Press>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* PRODUCTS LINKED TO UOM SECTION */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
                    {tr('Products Linked to Packaging UOM', 'ទំនិញដែលបានកំណត់ឯកតា UOM')}
                  </Text>
                  <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
                    {tr('View active products, case pricing, and stock converted into packaging units.', 'មើលទំនិញ តម្លៃលក់ដុំ និងចំនួនស្តុកដែលគិតជាកេស។')}
                  </Text>
                </View>

                {/* Search Bar for UOM */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: P.surfaceAlt,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: P.border,
                    paddingHorizontal: 12,
                    marginBottom: 16,
                  }}
                >
                  <Search size={16} color="#9CA3AF" />
                  <TextInput
                    value={uomSearch}
                    onChangeText={setUomSearch}
                    placeholder={tr('Search product name or barcode to configure packaging...', 'ស្វែងរកឈ្មោះទំនិញ ឬបាកូដដើម្បីកំណត់ឯកតាកញ្ចប់...')}
                    placeholderTextColor="#9CA3AF"
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      fontSize: 13,
                      color: P.text,
                    }}
                  />
                  {uomSearch ? (
                    <Press onPress={() => setUomSearch('')}>
                      <X size={15} color={P.muted} />
                    </Press>
                  ) : null}
                </View>

                {/* Table Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: P.surfaceAlt,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ flex: 2.2, color: P.muted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase' }}>
                    {tr('Product / Barcode', 'ទំនិញ / បាកូដ')}
                  </Text>
                  <Text style={{ flex: 1.4, color: P.muted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase' }}>
                    {tr('Base Unit (Retail)', 'ឯកតារាយ (រាយ)')}
                  </Text>
                  <Text style={{ flex: 1.6, color: P.muted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase' }}>
                    {tr('Master Packaging (UOM)', 'ឯកតាកញ្ចប់ធំ (UOM)')}
                  </Text>
                  <Text style={{ flex: 1.5, color: P.muted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase' }}>
                    {tr('Wholesale Case Price', 'ថ្លៃលក់ដុំក្នុងមួយកេស')}
                  </Text>
                  <Text style={{ flex: 1.3, color: P.muted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase' }}>
                    {tr('Unit Savings', 'ចំណេញ / ឯកតា')}
                  </Text>
                  <Text style={{ flex: 1.5, color: P.muted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase' }}>
                    {tr('Current Stock', 'ស្តុកបច្ចុប្បន្ន')}
                  </Text>
                  <Text style={{ flex: 1.2, color: P.muted, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', textAlign: 'right' }}>
                    {tr('Action', 'សកម្មភាព')}
                  </Text>
                </View>

                {/* Table Rows */}
                {products
                  .filter((p) => {
                    if (!uomSearch) return true;
                    const q = uomSearch.toLowerCase();
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.barcode || '').toLowerCase().includes(q) ||
                      (p.category || '').toLowerCase().includes(q) ||
                      (p.baseUnit || '').toLowerCase().includes(q) ||
                      (p.caseUnitName || '').toLowerCase().includes(q)
                    );
                  })
                  .map((p) => {
                    const baseUnit = p.baseUnit || 'Piece';
                    const caseUnit = p.caseUnitName || 'Case';
                    const caseQty = p.caseQty || 24;
                    const retailUnitKhr = roundKhr(p.priceUsd * rate);
                    const retailFullCaseKhr = retailUnitKhr * caseQty;
                    const hasWholesale = Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0);
                    const wholesaleCaseKhr = hasWholesale ? roundKhr(Number(p.wholesalePriceUsd) * rate) : 0;
                    const savingsKhr = hasWholesale ? retailFullCaseKhr - wholesaleCaseKhr : 0;
                    const savingsPct = hasWholesale && retailFullCaseKhr > 0
                      ? Math.round((savingsKhr / retailFullCaseKhr) * 100)
                      : 0;
                    const casesInStock = Math.floor(p.stock / caseQty);
                    const looseInStock = p.stock % caseQty;

                    return (
                      <View
                        key={p.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderBottomWidth: 1,
                          borderColor: P.border,
                        }}
                      >
                        {/* Product Name & Barcode */}
                        <View style={{ flex: 2.2, paddingRight: 8 }}>
                          <Text style={{ color: P.text, fontSize: 13.5, fontWeight: '700' }} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 2 }}>
                            {p.barcode || '—'} · {p.category || 'General'}
                          </Text>
                        </View>

                        {/* Base Unit Retail */}
                        <View style={{ flex: 1.4 }}>
                          <View
                            style={{
                              backgroundColor: P.surfaceAlt,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Text style={{ color: P.text, fontSize: 11.5, fontWeight: '700' }}>
                              1 {baseUnit}
                            </Text>
                          </View>
                          <Text style={{ color: P.textSub, fontSize: 11.5, marginTop: 3 }}>
                            {khr(retailUnitKhr)}
                          </Text>
                        </View>

                        {/* Master Packaging UOM */}
                        <View style={{ flex: 1.6 }}>
                          <View
                            style={{
                              backgroundColor: P.primaryLight,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>
                              {caseUnit} = {caseQty} {baseUnit}s
                            </Text>
                          </View>
                          <Text style={{ color: P.muted, fontSize: 11, marginTop: 3 }}>
                            {tr('Min order:', 'កុម្ម៉ង់ទាបបំផុត៖')} {p.wholesaleMinQty || 1} {caseUnit}
                          </Text>
                        </View>

                        {/* Wholesale Case Price */}
                        <View style={{ flex: 1.5 }}>
                          {hasWholesale ? (
                            <>
                              <Text style={{ color: P.emerald, fontSize: 13, fontWeight: '800' }}>
                                {khr(wholesaleCaseKhr)}
                              </Text>
                              <Text style={{ color: P.muted, fontSize: 11 }}>
                                {money(p.wholesalePriceUsd || 0)} / {caseUnit}
                              </Text>
                            </>
                          ) : (
                            <View
                              style={{
                                backgroundColor: P.surfaceAlt,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 5,
                                alignSelf: 'flex-start',
                              }}
                            >
                              <Text style={{ color: P.muted, fontSize: 11, fontStyle: 'italic' }}>
                                {tr('Not set', 'មិនទាន់កំណត់')}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Unit Savings */}
                        <View style={{ flex: 1.3 }}>
                          {hasWholesale && savingsPct > 0 ? (
                            <View
                              style={{
                                backgroundColor: P.emeraldLight,
                                paddingHorizontal: 7,
                                paddingVertical: 3,
                                borderRadius: 6,
                                alignSelf: 'flex-start',
                              }}
                            >
                              <Text style={{ color: P.emerald, fontSize: 11, fontWeight: '800' }}>
                                save {savingsPct}% ({khr(savingsKhr)})
                              </Text>
                            </View>
                          ) : (
                            <Text style={{ color: P.muted, fontSize: 11 }}>—</Text>
                          )}
                        </View>

                        {/* Stock */}
                        <View style={{ flex: 1.5 }}>
                          <Text style={{ color: P.text, fontSize: 12, fontWeight: '700' }}>
                            {casesInStock} {caseUnit}s + {looseInStock} {baseUnit}s
                          </Text>
                          <Text style={{ color: P.muted, fontSize: 11, marginTop: 1 }}>
                            ({p.stock} total {baseUnit}s)
                          </Text>
                        </View>

                        {/* Action */}
                        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                          <Press
                            onPress={() => openEditProduct(p)}
                            style={{
                              backgroundColor: hasWholesale ? P.surfaceAlt : P.primaryLight,
                              borderWidth: 1,
                              borderColor: hasWholesale ? P.border : P.primary,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 7,
                            }}
                          >
                            <Text
                              style={{
                                color: hasWholesale ? P.text : P.primary,
                                fontSize: 11.5,
                                fontWeight: '800',
                              }}
                            >
                              {hasWholesale ? tr('Edit UOM', 'កែ UOM') : tr('Configure', 'កំណត់')}
                            </Text>
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
                      placeholderTextColor="#9CA3AF"
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
                  placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
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
                  placeholderTextColor="#9CA3AF"
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
                    placeholder="20"
                    placeholderTextColor="#9CA3AF"
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
                    placeholder="5"
                    placeholderTextColor="#9CA3AF"
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
                  placeholderTextColor="#9CA3AF"
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

              {/* Wholesale & Custom Packaging Enterprise Configuration */}
              <View
                style={{
                  backgroundColor: P.surfaceAlt,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: P.borderStrong,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: formWholesaleEnabled ? 10 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Boxes size={16} color={P.primary} />
                    <Text style={{ color: P.text, fontSize: 13, fontWeight: '800' }}>
                      {tr('Wholesale & Packaging UOM', 'លក់ដុំ និងការកំណត់ឯកតាកញ្ចប់')}
                    </Text>
                  </View>
                  <Press
                    onPress={() => setFormWholesaleEnabled(!formWholesaleEnabled)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 7,
                      backgroundColor: formWholesaleEnabled ? P.primary : P.surface,
                      borderWidth: 1,
                      borderColor: formWholesaleEnabled ? P.primary : P.borderStrong,
                    }}
                  >
                    <Text
                      style={{
                        color: formWholesaleEnabled ? '#FFFFFF' : P.textSub,
                        fontSize: 11.5,
                        fontWeight: '800',
                      }}
                    >
                      {formWholesaleEnabled ? tr('Enabled', 'បើកដំណើរការ') : tr('Disabled', 'បិទ')}
                    </Text>
                  </Press>
                </View>

                {formWholesaleEnabled && (
                  <View style={{ gap: 10 }}>
                    {/* Wholesale Unit Price */}
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700' }}>
                          {tr('WHOLESALE UNIT PRICE', 'តម្លៃលក់ដុំក្នុងមួយឯកតា')} ({formWholesaleCcy})
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {(['KHR', 'USD'] as const).map((c) => (
                            <Press
                              key={c}
                              onPress={() => {
                                if (c === formWholesaleCcy) return;
                                const num = Number(formWholesalePrice) || 0;
                                if (c === 'KHR') {
                                  setFormWholesalePrice(String(roundKhr(num * rate)));
                                } else {
                                  setFormWholesalePrice((num / rate).toFixed(2));
                                }
                                setFormWholesaleCcy(c);
                              }}
                              style={{
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 5,
                                backgroundColor: formWholesaleCcy === c ? P.primary : P.surface,
                              }}
                            >
                              <Text style={{ color: formWholesaleCcy === c ? '#FFFFFF' : P.textSub, fontSize: 10.5, fontWeight: '800' }}>
                                {c}
                              </Text>
                            </Press>
                          ))}
                        </View>
                      </View>
                      <TextInput
                        value={formWholesalePrice}
                        onChangeText={setFormWholesalePrice}
                        placeholder={formWholesaleCcy === 'KHR' ? '2000' : '0.50'}
                        placeholderTextColor="#9CA3AF"
                        style={{
                          borderWidth: 1,
                          borderColor: P.borderStrong,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          height: 38,
                          color: P.text,
                          backgroundColor: P.surface,
                        }}
                      />
                    </View>

                    {/* Pre-configured Packaging UOM Template Selection */}
                    <View style={{ marginTop: 6, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: P.textSub, fontSize: 11, fontWeight: '700' }}>
                          {tr('PACKAGING UOM TEMPLATE', 'ទម្រង់កំណត់ឯកតាកញ្ចប់ UOM')}
                        </Text>
                        <Press
                          onPress={() => {
                            setShowProductModal(false);
                            setTab('uom');
                          }}
                        >
                          <Text style={{ color: P.primary, fontSize: 11, fontWeight: '700' }}>
                            {tr('Manage UOM Templates ->', 'គ្រប់គ្រងទម្រង់ UOM ->')}
                          </Text>
                        </Press>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {uomConfigs.map((u) => {
                          const isSel = selectedUomConfigId === u.id;
                          return (
                            <Press
                              key={u.id}
                              onPress={() => applyUomConfigToProductForm(u.id)}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                                borderRadius: 8,
                                backgroundColor: isSel ? P.primaryLight : P.surfaceAlt,
                                borderWidth: 1,
                                borderColor: isSel ? P.primary : P.border,
                              }}
                            >
                              <Text style={{ color: isSel ? P.primary : P.text, fontSize: 12, fontWeight: isSel ? '800' : '600' }}>
                                {u.name}
                              </Text>
                              <Text style={{ color: isSel ? P.primary : P.muted, fontSize: 10.5, marginTop: 1 }}>
                                1 {u.caseUnitName} = {u.caseQty} {u.baseUnit}s
                              </Text>
                            </Press>
                          );
                        })}
                      </View>
                    </View>

                    {/* Calculated Wholesale Case Price Banner */}
                    {Number(formWholesalePrice) > 0 && (
                      <View
                        style={{
                          backgroundColor: '#CCFBF1',
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#99F6E4',
                          marginTop: 4,
                        }}
                      >
                        <Text style={{ color: '#0F766E', fontSize: 12, fontWeight: '800' }}>
                          1 {formCaseUnitName || 'Case'} ({formCaseQty || 24} {formBaseUnit || 'pcs'}s) ={' '}
                          {formWholesaleCcy === 'KHR'
                            ? `${(roundKhr(Number(formWholesalePrice) * (parseInt(formCaseQty, 10) || 24))).toLocaleString()} ៛`
                            : `$${(Number(formWholesalePrice) * (parseInt(formCaseQty, 10) || 24)).toFixed(2)}`}
                        </Text>
                        <Text style={{ color: '#0F766E', fontSize: 11, marginTop: 2 }}>
                          {tr('Based on chosen UOM configuration template', 'កំណត់តាមរយៈទម្រង់ UOM ស្តង់ដារ')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
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

      {/* UOM CONFIGURATION TEMPLATE MODAL */}
      <Modal visible={showUomModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              padding: 22,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
                  {editingUomConfig ? tr('Edit Packaging UOM', 'កែសម្រួលទម្រង់ UOM') : tr('New Packaging UOM Template', 'បង្កើតទម្រង់ UOM ថ្មី')}
                </Text>
                <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
                  {tr('Define reusable base unit vs master case ratio', 'កំណត់អនុបាតឯកតារាយ និងកេសដុំ')}
                </Text>
              </View>
              <Press onPress={() => setShowUomModal(false)}>
                <X size={18} color={P.muted} />
              </Press>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700', marginBottom: 4 }}>
                  {tr('UOM CONFIG NAME', 'ឈ្មោះទម្រង់ UOM')}
                </Text>
                <TextInput
                  value={uomFormName}
                  onChangeText={setUomFormName}
                  placeholder="e.g. Case of 24, Pack of 6, Box of 1"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 40,
                    color: P.text,
                    backgroundColor: P.surfaceAlt,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700', marginBottom: 4 }}>
                    {tr('BASE UNIT (SINGLE)', 'ឯកតារាយ')}
                  </Text>
                  <TextInput
                    value={uomFormBaseUnit}
                    onChangeText={setUomFormBaseUnit}
                    placeholder="Can / Bottle / Piece"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      height: 40,
                      color: P.text,
                      backgroundColor: P.surfaceAlt,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700', marginBottom: 4 }}>
                    {tr('MASTER PACKAGING', 'ឯកតាដុំធំ')}
                  </Text>
                  <TextInput
                    value={uomFormCaseUnitName}
                    onChangeText={setUomFormCaseUnitName}
                    placeholder="Case / Carton / Pack"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      height: 40,
                      color: P.text,
                      backgroundColor: P.surfaceAlt,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700', marginBottom: 4 }}>
                  {tr('UNITS PER MASTER CASE', 'ចំនួនឯកតារាយក្នុងមួយកេស')}
                </Text>
                <TextInput
                  value={uomFormCaseQty}
                  onChangeText={setUomFormCaseQty}
                  placeholder="24"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 40,
                    color: P.text,
                    backgroundColor: P.surfaceAlt,
                  }}
                />
              </View>

              <View>
                <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700', marginBottom: 4 }}>
                  {tr('DESCRIPTION / NOTE', 'ចំណាំ')}
                </Text>
                <TextInput
                  value={uomFormDescription}
                  onChangeText={setUomFormDescription}
                  placeholder="Optional packaging specifications or vendor details"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 40,
                    color: P.text,
                    backgroundColor: P.surfaceAlt,
                  }}
                />
              </View>

              <View
                style={{
                  backgroundColor: '#EDE9FE',
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: P.primary, fontSize: 12, fontWeight: '800' }}>
                  Formula: 1 {uomFormCaseUnitName || 'Case'} = {uomFormCaseQty || '24'} {uomFormBaseUnit || 'Piece'}s
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Press
                  onPress={() => setShowUomModal(false)}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 8,
                    backgroundColor: P.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: P.textSub, fontWeight: '700' }}>{tr('Cancel', 'បោះបង់')}</Text>
                </Press>
                <Press
                  disabled={savingUom}
                  onPress={() => void saveUomConfigAction()}
                  style={{
                    flex: 1.5,
                    height: 42,
                    borderRadius: 8,
                    backgroundColor: P.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {savingUom ? 'Saving...' : tr('Save Template', 'រក្សាទុកទម្រង់')}
                  </Text>
                </Press>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* BATCH INTAKE & CREATE MODAL */}
      <Modal visible={showBatchModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              width: '100%',
              maxWidth: 960,
              maxHeight: '90%',
              padding: 22,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderColor: P.border,
                marginBottom: 14,
              }}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Layers size={20} color={P.primary} />
                  <Text style={{ color: P.text, fontSize: 18, fontWeight: '800' }}>
                    {tr('Batch Intake & Fast Product Creation', 'ការនាំចូល និងបង្កើតទំនិញជាបាច់')}
                  </Text>
                  <View style={{ backgroundColor: P.emeraldLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                    <Text style={{ color: P.emerald, fontSize: 11, fontWeight: '800' }}>
                      {tr('Scanner Gun Ready', 'ម៉ាស៊ីនស្កេនរួចរាល់')}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 3 }}>
                  {tr(
                    'Rapid intake: scan barcodes or enter rows sequentially. Items are created or restocked in bulk.',
                    'បញ្ចូលទំនិញលឿនរហ័ស៖ ស្កេនបាកូដ ឬវាយបញ្ចូលជាបន្តបន្ទាប់។ ទំនិញនឹងត្រូវបង្កើត ឬបន្ថែមស្តុកជាបាច់។'
                  )}
                </Text>
              </View>
              <Press onPress={() => setShowBatchModal(false)}>
                <X size={20} color={P.muted} />
              </Press>
            </View>

            {/* Batch Intake Table Header */}
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 8,
                paddingHorizontal: 8,
                backgroundColor: P.surfaceAlt,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ width: 30, color: P.muted, fontSize: 11, fontWeight: '800' }}>#</Text>
              <Text style={{ flex: 1.8, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('BARCODE', 'បាកូដ')}</Text>
              <Text style={{ flex: 2.2, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('PRODUCT NAME', 'ឈ្មោះទំនិញ')}</Text>
              <Text style={{ flex: 1.4, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('CATEGORY', 'ក្រុម')}</Text>
              <Text style={{ flex: 1.4, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('PRICE (៛ KHR)', 'តម្លៃ')}</Text>
              <Text style={{ flex: 1.1, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('STOCK QTY', 'ចំនួនស្តុក')}</Text>
              <Text style={{ flex: 1.6, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('PACKAGING UOM', 'ឯកតា UOM')}</Text>
              <Text style={{ width: 36, textAlign: 'center', color: P.muted, fontSize: 11, fontWeight: '800' }}>DEL</Text>
            </View>

            {/* Batch Rows */}
            <ScrollView style={{ flex: 1, maxHeight: 400 }}>
              {batchRows.map((row, idx) => (
                <View
                  key={row.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    borderBottomWidth: 1,
                    borderColor: P.border,
                    gap: 6,
                  }}
                >
                  <Text style={{ width: 30, color: P.muted, fontSize: 11, fontWeight: '700' }}>{idx + 1}</Text>

                  {/* Barcode */}
                  <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      value={row.barcode}
                      onChangeText={(val) => {
                        setBatchRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, barcode: val } : r))
                        );
                      }}
                      onBlur={() => {
                        if (row.barcode.trim() && !row.name) {
                          void lookupBarcodeOnline(row.barcode.trim()).then((info) => {
                            if (info?.name) {
                              setBatchRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, name: info.name, category: info.category || r.category }
                                    : r
                                )
                              );
                            }
                          });
                        }
                      }}
                      placeholder="Scan or type..."
                      placeholderTextColor="#9CA3AF"
                      style={{
                        flex: 1,
                        height: 36,
                        borderWidth: 1,
                        borderColor: P.borderStrong,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        fontSize: 12,
                        color: P.text,
                        backgroundColor: P.surface,
                      }}
                    />
                  </View>

                  {/* Product Name */}
                  <View style={{ flex: 2.2 }}>
                    <TextInput
                      value={row.name}
                      onChangeText={(val) => {
                        setBatchRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, name: val } : r))
                        );
                      }}
                      placeholder="Item name..."
                      placeholderTextColor="#9CA3AF"
                      style={{
                        height: 36,
                        borderWidth: 1,
                        borderColor: P.borderStrong,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        fontSize: 12,
                        color: P.text,
                        backgroundColor: P.surface,
                      }}
                    />
                  </View>

                  {/* Category */}
                  <View style={{ flex: 1.4 }}>
                    <TextInput
                      value={row.category}
                      onChangeText={(val) => {
                        setBatchRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, category: val } : r))
                        );
                      }}
                      placeholder="Category"
                      placeholderTextColor="#9CA3AF"
                      style={{
                        height: 36,
                        borderWidth: 1,
                        borderColor: P.borderStrong,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        fontSize: 12,
                        color: P.text,
                        backgroundColor: P.surface,
                      }}
                    />
                  </View>

                  {/* Price (KHR) */}
                  <View style={{ flex: 1.4 }}>
                    <TextInput
                      value={row.price}
                      onChangeText={(val) => {
                        setBatchRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, price: val } : r))
                        );
                      }}
                      placeholder="4000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      style={{
                        height: 36,
                        borderWidth: 1,
                        borderColor: P.borderStrong,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        fontSize: 12,
                        color: P.text,
                        backgroundColor: P.surface,
                      }}
                    />
                  </View>

                  {/* Stock Qty */}
                  <View style={{ flex: 1.1 }}>
                    <TextInput
                      value={row.stock}
                      onChangeText={(val) => {
                        setBatchRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, stock: val } : r))
                        );
                      }}
                      placeholder="24"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      style={{
                        height: 36,
                        borderWidth: 1,
                        borderColor: P.borderStrong,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        fontSize: 12,
                        color: P.text,
                        backgroundColor: P.surface,
                      }}
                    />
                  </View>

                  {/* Packaging UOM Selector */}
                  <View style={{ flex: 1.6 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {uomConfigs.slice(0, 3).map((u) => {
                          const isSel = row.uomConfigId === u.id;
                          return (
                            <Press
                              key={u.id}
                              onPress={() => {
                                setBatchRows((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, uomConfigId: u.id } : r))
                                );
                              }}
                              style={{
                                paddingHorizontal: 7,
                                paddingVertical: 4,
                                borderRadius: 5,
                                backgroundColor: isSel ? P.primaryLight : P.surfaceAlt,
                                borderWidth: 1,
                                borderColor: isSel ? P.primary : P.border,
                              }}
                            >
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: isSel ? P.primary : P.textSub }}>
                                {u.name}
                              </Text>
                            </Press>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Delete row */}
                  <Press
                    onPress={() => {
                      if (batchRows.length > 1) {
                        setBatchRows((prev) => prev.filter((r) => r.id !== row.id));
                      }
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} color={P.rose} />
                  </Press>
                </View>
              ))}
            </ScrollView>

            {/* Bottom Actions */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 14,
                borderTopWidth: 1,
                borderColor: P.border,
                marginTop: 10,
              }}
            >
              <Press
                onPress={() => {
                  setBatchRows((prev) => [
                    ...prev,
                    {
                      id: `row-${Date.now()}-${prev.length + 1}`,
                      barcode: '',
                      name: '',
                      category: 'General',
                      ccy: 'KHR',
                      price: '4000',
                      stock: '24',
                      uomConfigId: selectedUomConfigId || 'uom-case-24',
                      wholesalePrice: '80000',
                    },
                  ]);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 8,
                  backgroundColor: P.surfaceAlt,
                  borderWidth: 1,
                  borderColor: P.border,
                }}
              >
                <Plus size={15} color={P.text} />
                <Text style={{ color: P.text, fontSize: 12.5, fontWeight: '700' }}>
                  {tr('+ Add Another Row', '+ បន្ថែមជួរថ្មី')}
                </Text>
              </Press>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Press
                  onPress={() => setShowBatchModal(false)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                    backgroundColor: P.surfaceAlt,
                  }}
                >
                  <Text style={{ color: P.textSub, fontSize: 13, fontWeight: '700' }}>
                    {tr('Cancel', 'បោះបង់')}
                  </Text>
                </Press>

                <Press
                  disabled={committingBatch}
                  onPress={() => void commitBatchAction()}
                  style={{
                    backgroundColor: P.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 9,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {committingBatch ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        {tr(`Commit Batch (${batchRows.filter((r) => r.name.trim() || r.barcode.trim()).length} Items)`, `រក្សាទុកជាបាច់ (${batchRows.filter((r) => r.name.trim() || r.barcode.trim()).length} មុខ)`)}
                      </Text>
                    </>
                  )}
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
