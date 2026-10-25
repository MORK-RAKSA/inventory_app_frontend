import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import {
  Boxes,
  Layers,
  LayoutDashboard,
  ReceiptText,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react-native';
import { api, DEFAULT_UOM_CONFIGS, Product, Sale, Settings, UomConfig } from '../api';
import { getUsername } from '../auth';
import { khr, roundKhr } from '../theme';
import { useLanguage } from '../i18n';
import { useToast } from '../toast';
import { useSounds } from '../hooks/useSounds';
import { exportExcel } from '../exportExcel';
import { lookupBarcodeOnline } from '../barcodeLookup';
import {
  getLiveActivityLog,
  markEventNotified,
  onRemoteScannerScan,
  subscribeLiveActivity,
} from '../liveSync';
import { DEFAULT_CATEGORIES } from './theme';
import type { PortalTab } from './types';

/**
 * All portal state, API calls, derived selectors and event wiring live here so the
 * screens stay presentational. This is the original WebPortal body, moved verbatim.
 */
export function usePortalController() {
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
  const [batchRowUomTargetId, setBatchRowUomTargetId] = useState<string | null>(null);

  // POS state
  const [posSearch, setPosSearch] = useState('');
  const [posCat, setPosCat] = useState('All');
  const [posMode, setPosMode] = useState<'retail' | 'wholesale'>('retail');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wholesaleCart, setWholesaleCart] = useState<Record<string, { cases: number; loose: number }>>({});
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
        if (!silent)
          toast.show(e?.message || 'Failed to sync portal data', {
            title: tr('Sync failed', 'សមកាលកម្មបរាជ័យ'),
            tone: 'error',
          });
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
    if (posMode === 'wholesale') {
      addWholesaleItem(product, delta, 'case');
    } else {
      addRetailItem(product, delta);
    }
  }

  function addRetailItem(product: Product, delta = 1) {
    if (delta > 0 && product.stock <= 0) {
      playFail();
      toast.show(tr(`${product.name} is out of stock`, `${product.name} អស់ពីស្តុកហើយ`), {
        title: tr('Out of stock', 'អស់ស្តុក'),
        tone: 'error',
      });
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

  function addWholesaleItem(product: Product, delta = 1, unitType: 'case' | 'loose' = 'case') {
    const cQty = product.caseQty || 24;
    setWholesaleCart((prev) => {
      const current = prev[product.id] || { cases: 0, loose: 0 };
      const currentTotalUnits = current.cases * cQty + current.loose;
      const unitDelta = unitType === 'case' ? delta * cQty : delta;
      const nextTotalUnits = currentTotalUnits + unitDelta;

      if (delta > 0 && product.stock <= 0) {
        playFail();
        toast.show(tr(`${product.name} is out of stock`, `${product.name} អស់ពីស្តុកហើយ`), {
        title: tr('Out of stock', 'អស់ស្តុក'),
        tone: 'error',
      });
        return prev;
      }

      if (delta > 0 && nextTotalUnits > product.stock) {
        playFail();
        toast.show(
          tr(
            `Cannot add: only ${product.stock} units (${Math.floor(product.stock / cQty)} cases) in stock`,
            `មិនអាចបន្ថែម៖ សល់តែ ${product.stock} ឯកតា (${Math.floor(product.stock / cQty)} កេស) ក្នុងស្តុក`
          ),
          { title: tr('Not enough stock', 'ស្តុកមិនគ្រប់'), tone: 'warning' }
        );
        return prev;
      }

      if (delta > 0) playScan();

      let nextCases = current.cases;
      let nextLoose = current.loose;
      if (unitType === 'case') {
        nextCases = Math.max(0, current.cases + delta);
      } else {
        nextLoose = Math.max(0, current.loose + delta);
      }

      if (nextCases === 0 && nextLoose === 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }

      return {
        ...prev,
        [product.id]: { cases: nextCases, loose: nextLoose },
      };
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
      toast.show(tr('UOM Name is required', 'សូមបញ្ចូលឈ្មោះឯកតា UOM'), {
        title: tr('UOM name missing', 'ខ្វះឈ្មោះ UOM'),
        tone: 'error',
      });
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
        toast.show(tr(`Updated UOM: ${name}`, `បានកែសម្រួល UOM៖ ${name}`), {
          title: tr('Packaging UOM updated', 'បានកែ UOM'),
          tone: 'success',
        });
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
        if (batchRowUomTargetId) {
          setBatchRows((prev) =>
            prev.map((r) => (r.id === batchRowUomTargetId ? { ...r, uomConfigId: created.id } : r))
          );
          setBatchRowUomTargetId(null);
        }
        toast.show(tr(`Created UOM: ${name}`, `បានបង្កើត UOM៖ ${name}`), {
          title: tr('Packaging UOM created', 'បានបង្កើត UOM'),
          tone: 'success',
        });
      }
      setShowUomModal(false);
      playScan();
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Failed to save UOM configuration', {
        title: tr('UOM save failed', 'រក្សាទុក UOM បរាជ័យ'),
        tone: 'error',
      });
    } finally {
      setSavingUom(false);
    }
  }

  function openUomConfigForRow(rowId: string) {
    setBatchRowUomTargetId(rowId);
    openCreateUomModal();
  }

  async function deleteUomConfigAction(uom: UomConfig) {
    try {
      await api(`/uom/${encodeURIComponent(uom.id)}`, { method: 'DELETE' });
      setUomConfigs((prev) => prev.filter((u) => u.id !== uom.id));
      toast.show(tr(`Deleted UOM: ${uom.name}`, `បានលុប UOM៖ ${uom.name}`), {
        title: tr('Packaging UOM deleted', 'បានលុប UOM'),
        tone: 'success',
      });
    } catch (e: any) {
      toast.show(e?.message || 'Failed to delete UOM config', {
        title: tr('UOM delete failed', 'លុប UOM បរាជ័យ'),
        tone: 'error',
      });
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
      toast.show(
        tr(
          'Enter at least one product with name or barcode',
          'សូមបញ្ចូលផលិតផលយ៉ាងហោចមួយដែលមានឈ្មោះ ឬបាកូដ'
        ),
        { title: tr('Batch is empty', 'បាច់ទទេ'), tone: 'warning' }
      );
      return;
    }
    setCommittingBatch(true);
    try {
      const itemsToCommit = validRows.map((r) => {
        const uomCfg = uomConfigs.find((u) => u.id === r.uomConfigId);
        const cQty = uomCfg?.caseQty || 24;
        const casePriceRaw = r.wholesalePrice ? Number(r.wholesalePrice) : undefined;
        const casePriceUsd = casePriceRaw
          ? r.ccy === 'KHR'
            ? Number((roundKhr(casePriceRaw) / rate).toFixed(4))
            : Number(casePriceRaw.toFixed(4))
          : undefined;
        const unitWholesaleUsd = casePriceUsd
          ? Number((casePriceUsd / cQty).toFixed(4))
          : undefined;

        return {
          barcode: r.barcode.trim() || undefined,
          name: r.name.trim() || `Item ${r.barcode.trim()}`,
          category: r.category,
          currency: r.ccy,
          price: Number(r.price) || 4000,
          stock: Math.max(0, parseInt(r.stock, 10) || 0),
          baseUnit: uomCfg?.baseUnit || 'Piece',
          caseUnitName: uomCfg?.caseUnitName || 'Case',
          caseQty: cQty,
          wholesalePrice: casePriceRaw,
          wholesalePricePerCaseUsd: casePriceUsd,
          wholesalePriceUsd: unitWholesaleUsd,
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
        { title: tr('Batch committed', 'បានបញ្ចូលបាច់'), tone: 'success' }
      );
      setShowBatchModal(false);
      void loadAll(false);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Failed to commit batch', {
        title: tr('Batch intake failed', 'បញ្ចូលបាច់បរាជ័យ'),
        tone: 'error',
      });
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
        toast.show(tr(`Barcode ${code} added to batch row`, `បាកូដ ${code} បានបញ្ចូលក្នុងតារាងបាច់`), {
          title: tr('Barcode scanned', 'បានស្កេនបាកូដ'),
          tone: 'info',
        });
        return;
      }

      // 1. If the Create/Edit Product modal is open, fill or increment stock
      if (showProductModal) {
        playScan();
        if (!editingProduct && formBarcode === code) {
          setFormStock((prev) => String((Number(prev) || 0) + 1));
          toast.show(tr(`Scanned ${code}: Stock +1`, `ស្កេន ${code}៖ ស្តុក +1`), {
            title: tr('Stock incremented', 'បានបន្ថែមស្តុក'),
            tone: 'success',
          });
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
            { title: tr('Product found', 'រកឃើញទំនិញ'), tone: 'success' }
          );
        } else {
          playScan();
          openCreateProduct(code);
          toast.show(
            tr(`New barcode ${code} — enter product details`, `បាកូដថ្មី ${code} — សូមបំពេញព័ត៌មានទំនិញ`),
            { title: tr('New barcode', 'បាកូដថ្មី'), tone: 'info' }
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
          { title: tr('Added to cart', 'បានដាក់ក្នុងកន្ត្រក'), tone: 'success' }
        );
      } else {
        playFail();
        toast.show(
          tr(`Barcode not in stock: ${code}`, `រកមិនឃើញបាកូដ៖ ${code}`),
          {
            title: tr('Unknown barcode', 'មិនស្គាល់បាកូដ'),
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
            { title: tr('Scanner gun connected', 'ម៉ាស៊ីនស្កេន'), tone: 'success' }
          );
        } else {
          playScan();
          openCreateProduct(barcode);
          toast.show(
            tr(`Mobile Scanner: new barcode ${barcode}`, `ម៉ាស៊ីនស្កេនទូរស័ព្ទ៖ បាកូដថ្មី ${barcode}`),
            { title: tr('New barcode scanned', 'បានស្កេនបាកូដថ្មី'), tone: 'info' }
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

  // Retail Cart helpers
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

  // Wholesale Cart helpers
  const wholesaleCartLines = useMemo(() => {
    return Object.entries(wholesaleCart)
      .filter(([, c]) => c.cases > 0 || c.loose > 0)
      .map(([id, c]) => {
        const product = products.find((p) => p.id === id);
        if (!product) return null;
        const cQty = product.caseQty || 24;
        const caseName = product.caseUnitName || 'Case';
        const baseName = product.baseUnit || 'pcs';
        const unitWholesaleUsd =
          product.wholesalePriceUsd && product.wholesalePriceUsd > 0
            ? product.wholesalePriceUsd
            : product.priceUsd;
        const casePriceUsd =
          product.wholesalePricePerCaseUsd && product.wholesalePricePerCaseUsd > 0
            ? product.wholesalePricePerCaseUsd
            : unitWholesaleUsd * cQty;
        const lineTotalUsd = Number((c.cases * casePriceUsd + c.loose * unitWholesaleUsd).toFixed(2));
        const totalUnits = c.cases * cQty + c.loose;
        const retailEquivalentUsd = totalUnits * product.priceUsd;
        const savingsUsd = Math.max(0, retailEquivalentUsd - lineTotalUsd);
        const savingsPct =
          retailEquivalentUsd > 0 ? Math.round((savingsUsd / retailEquivalentUsd) * 100) : 0;
        return {
          product,
          cases: c.cases,
          loose: c.loose,
          caseQty: cQty,
          caseName,
          baseName,
          unitWholesaleUsd,
          casePriceUsd,
          lineTotalUsd,
          totalUnits,
          savingsUsd,
          savingsPct,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [wholesaleCart, products]);

  const wholesaleTotalUsd = useMemo(
    () => wholesaleCartLines.reduce((acc, l) => acc + l.lineTotalUsd, 0),
    [wholesaleCartLines]
  );
  const wholesaleTotalKhr = useMemo(
    () => roundKhr(wholesaleTotalUsd * rate),
    [wholesaleTotalUsd, rate]
  );

  const wholesaleTotalSavingsUsd = useMemo(
    () => wholesaleCartLines.reduce((acc, l) => acc + l.savingsUsd, 0),
    [wholesaleCartLines]
  );
  const wholesaleTotalSavingsKhr = useMemo(
    () => roundKhr(wholesaleTotalSavingsUsd * rate),
    [wholesaleTotalSavingsUsd, rate]
  );

  const wholesaleTotalCases = useMemo(
    () => wholesaleCartLines.reduce((acc, l) => acc + l.cases, 0),
    [wholesaleCartLines]
  );
  const wholesaleTotalLoose = useMemo(
    () => wholesaleCartLines.reduce((acc, l) => acc + l.loose, 0),
    [wholesaleCartLines]
  );

  function removeRetailItem(productId: string) {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  }

  function removeWholesaleItem(productId: string) {
    setWholesaleCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  }

  async function completeCheckout() {
    const isWholesale = posMode === 'wholesale';
    const lines = isWholesale ? wholesaleCartLines : cartLines;
    if (!lines.length || checkingOut) return;
    setCheckingOut(true);
    try {
      const itemsPayload = isWholesale
        ? wholesaleCartLines.map((l) => ({
            productId: l.product.id,
            quantity: l.totalUnits,
            cases: l.cases,
            loose: l.loose,
            caseUnitName: l.caseName,
            baseUnit: l.baseName,
            uom:
              l.loose > 0
                ? `${l.cases} ${l.caseName} + ${l.loose} ${l.baseName}`
                : `${l.cases} ${l.caseName}`,
            isWholesale: true,
          }))
        : cartLines.map((l) => ({
            productId: l.product.id,
            quantity: l.qty,
            isWholesale: false,
          }));

      const sale = await api<Sale>('/sales/checkout', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          paidCurrency,
          priceTier: isWholesale ? 'WHOLESALE' : 'RETAIL',
          items: itemsPayload,
        }),
      });
      markEventNotified(`sale:${sale.id}`);
      playCheckout();
      if (isWholesale) {
        setWholesaleCart({});
      } else {
        setCart({});
      }
      setActiveReceipt(sale);
      toast.show(
        tr(
          `Payment complete: ${khr(sale.totalKhr)} (#${sale.id.slice(0, 6).toUpperCase()})`,
          `ទំនិញបានទូទាត់៖ ${khr(sale.totalKhr)} (#${sale.id.slice(0, 6).toUpperCase()})`
        ),
        { title: tr('Payment received', 'បានទទួលប្រាក់'), tone: 'success', duration: 6000 }
      );
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Checkout failed', {
        title: tr('Checkout failed', 'ទូទាត់បរាជ័យ'),
        tone: 'error',
      });
    } finally {
      setCheckingOut(false);
    }
  }

  async function saveProductForm() {
    if (!formName.trim()) {
      playFail();
      toast.show(tr('Product name is required', 'សូមបញ្ចូលឈ្មោះទំនិញ'), {
        title: tr('Product name missing', 'ខ្វះឈ្មោះទំនិញ'),
        tone: 'error',
      });
      return;
    }
    const rawNum = Number(formPrice);
    if (!Number.isFinite(rawNum) || rawNum < 0) {
      playFail();
      toast.show(tr('Enter a valid non-negative price', 'សូមបញ្ចូលតម្លៃត្រឹមត្រូវ'), {
        title: tr('Invalid price', 'តម្លៃមិនត្រឹមត្រូវ'),
        tone: 'error',
      });
      return;
    }
    if (formExpiry.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(formExpiry.trim())) {
      playFail();
      toast.show(tr('Expiry date must be YYYY-MM-DD', 'ថ្ងៃផុតកំណត់ត្រូវតែជា YYYY-MM-DD'), {
        title: tr('Invalid expiry date', 'ថ្ងៃផុតកំណត់មិនត្រឹមត្រូវ'),
        tone: 'error',
      });
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
        {
          title: editingProduct
            ? tr('Product updated', 'បានកែទំនិញ')
            : tr('Product added', 'បានបន្ថែមទំនិញ'),
          tone: 'success',
        }
      );
      setShowProductModal(false);
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Could not save product', {
        title: tr('Product save failed', 'រក្សាទុកទំនិញបរាជ័យ'),
        tone: 'error',
      });
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
        { title: tr('Stock updated', 'បានកែស្តុក'), tone: 'success' }
      );
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Restock failed', {
        title: tr('Restock failed', 'បន្ថែមស្តុកបរាជ័យ'),
        tone: 'error',
      });
    }
  }

  async function archiveProduct(p: Product) {
    try {
      await api(`/products/${p.id}`, { method: 'DELETE' });
      toast.show(tr(`${p.name} archived`, `បានលុបទំនិញ ${p.name}`), {
        title: tr('Product archived', 'បានលុបទំនិញ'),
        tone: 'info',
      });
      await loadAll(true);
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Archive failed', {
        title: tr('Archive failed', 'លុបទំនិញបរាជ័យ'),
        tone: 'error',
      });
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
        title: tr('Exchange rate updated', 'បានកែអត្រាប្តូរប្រាក់'),
        tone: 'success',
      });
    } catch (e: any) {
      playFail();
      toast.show(e?.message || 'Failed to update rate', {
        title: tr('Rate update failed', 'កែអត្រាបរាជ័យ'),
        tone: 'error',
      });
    } finally {
      setSavingRate(false);
    }
  }

  const navItems: { id: PortalTab; label: string; khLabel: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Overview', khLabel: 'ផ្ទាំងគ្រប់គ្រងរួម', icon: LayoutDashboard },
    { id: 'pos', label: 'Checkout', khLabel: 'ម៉ាស៊ីនគិតលុយ', icon: ShoppingCart, badge: (posMode === 'wholesale' ? wholesaleCartLines.length : cartLines.length) || undefined },
    { id: 'inventory', label: 'Inventory', khLabel: 'បញ្ជីស្តុកទំនិញ', icon: Boxes, badge: lowStockProducts.length || undefined },
    { id: 'uom', label: 'Packaging UOM', khLabel: 'ឯកតាកញ្ចប់ UOM', icon: Layers },
    { id: 'sales', label: 'Sales & Receipts', khLabel: 'ប្រវត្តិលក់ & វិក្កយបត្រ', icon: ReceiptText },
    { id: 'settings', label: 'Portal Settings', khLabel: 'ការកំណត់ប្រព័ន្ធ', icon: SlidersHorizontal },
  ];

  return {
    navItems,
    width,
    isCompact,
    language,
    setLanguage,
    tr,
    toast,
    playScan,
    playCheckout,
    playFail,
    tab,
    setTab,
    products,
    setProducts,
    sales,
    setSales,
    rate,
    setRate,
    loading,
    setLoading,
    refreshing,
    setRefreshing,
    user,
    setUser,
    lastScannedCode,
    setLastScannedCode,
    scannerFlash,
    setScannerFlash,
    scanBufferRef,
    lastKeyTimeRef,
    invSearch,
    setInvSearch,
    invCat,
    setInvCat,
    invStatusFilter,
    setInvStatusFilter,
    editingProduct,
    setEditingProduct,
    showProductModal,
    setShowProductModal,
    formName,
    setFormName,
    formBarcode,
    setFormBarcode,
    formCategory,
    setFormCategory,
    formCcy,
    setFormCcy,
    formPrice,
    setFormPrice,
    formStock,
    setFormStock,
    formLowThreshold,
    setFormLowThreshold,
    formExpiry,
    setFormExpiry,
    formWholesaleEnabled,
    setFormWholesaleEnabled,
    formWholesaleCcy,
    setFormWholesaleCcy,
    formWholesalePrice,
    setFormWholesalePrice,
    formBaseUnit,
    setFormBaseUnit,
    formCaseUnitName,
    setFormCaseUnitName,
    formCaseQty,
    setFormCaseQty,
    formWholesaleMinQty,
    setFormWholesaleMinQty,
    savingProduct,
    setSavingProduct,
    selectedUomConfigId,
    setSelectedUomConfigId,
    uomConfigs,
    setUomConfigs,
    uomSearch,
    setUomSearch,
    showUomModal,
    setShowUomModal,
    editingUomConfig,
    setEditingUomConfig,
    uomFormName,
    setUomFormName,
    uomFormBaseUnit,
    setUomFormBaseUnit,
    uomFormCaseUnitName,
    setUomFormCaseUnitName,
    uomFormCaseQty,
    setUomFormCaseQty,
    uomFormDescription,
    setUomFormDescription,
    savingUom,
    setSavingUom,
    showBatchModal,
    setShowBatchModal,
    committingBatch,
    setCommittingBatch,
    batchRows,
    setBatchRows,
    batchRowUomTargetId,
    setBatchRowUomTargetId,
    posSearch,
    setPosSearch,
    posCat,
    setPosCat,
    posMode,
    setPosMode,
    cart,
    setCart,
    wholesaleCart,
    setWholesaleCart,
    paidCurrency,
    setPaidCurrency,
    checkingOut,
    setCheckingOut,
    activeReceipt,
    setActiveReceipt,
    salesRange,
    setSalesRange,
    salesSearch,
    setSalesSearch,
    rateInput,
    setRateInput,
    savingRate,
    setSavingRate,
    activityTick,
    setActivityTick,
    liveFeed,
    handleExportInventory,
    handleExportSales,
    loadBusyRef,
    loadAll,
    addToCart,
    addRetailItem,
    addWholesaleItem,
    openCreateProduct,
    openCreateUomModal,
    saveUomConfigAction,
    openUomConfigForRow,
    deleteUomConfigAction,
    applyUomConfigToProductForm,
    openBatchModal,
    commitBatchAction,
    openCreateUomProduct,
    openEditProduct,
    handleHardwareBarcodeScan,
    categories,
    activeSales,
    todaySales,
    todayKhr,
    todayUsd,
    weekSales,
    weekKhr,
    weekUsd,
    totalUnits,
    inventoryValueKhr,
    inventoryValueUsd,
    lowStockProducts,
    chartDays,
    maxDayKhr,
    filteredInventory,
    filteredPosProducts,
    filteredSales,
    cartLines,
    cartTotalUsd,
    cartTotalKhr,
    wholesaleCartLines,
    wholesaleTotalUsd,
    wholesaleTotalKhr,
    wholesaleTotalSavingsUsd,
    wholesaleTotalSavingsKhr,
    wholesaleTotalCases,
    wholesaleTotalLoose,
    removeRetailItem,
    removeWholesaleItem,
    completeCheckout,
    saveProductForm,
    quickRestock,
    archiveProduct,
    saveExchangeRate,
  };
}

export type PortalController = ReturnType<typeof usePortalController>;
