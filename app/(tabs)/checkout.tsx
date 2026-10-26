import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  Plus,
  Minus,
  ScanLine,
  Search,
  CheckCircle2,
  ShoppingBag,
  Trash2,
  Receipt,
  Warehouse,
  Boxes,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { api, Sale, Product } from '../../src/api';
import { useLiveData } from '../../src/hooks/useLiveData';
import { useSounds } from '../../src/hooks/useSounds';
import { useLanguage } from '../../src/i18n';
import { useToast } from '../../src/toast';
import { markEventNotified } from '../../src/liveSync';
import { CashTenderModal } from '../../src/components/CashTenderModal';
import { CambodiaCashExchange } from '../../src/exchangeRate';
import { sameBarcode } from '../../src/barcode';
import { CameraScanner, ScanResult } from '../../src/components/CameraScanner';
import { ReceiptModal } from '../../src/components/ReceiptModal';
import { ProductImage } from '../../src/components/ProductImage';
import {
  Press,
  Segmented,
  Rise,
  rise,
  listLayout,
  popIn,
  fade,
  slideOut,
  Chip,
} from '../../src/motion';
import {
  Card,
  Btn,
  C,
  Field,
  IconBadge,
  money,
  khr,
  ErrorLine,
  Empty,
  shadow,
} from '../../src/ui';

export interface CartItemQty {
  cases: number;
  loose: number;
}

export default function Checkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tr } = useLanguage();
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const { products, rate, refresh } = useLiveData('products');
  const { playScan, playCheckout, playFail } = useSounds();
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [lastReceipt, setLastReceipt] = useState<Sale | null>(null);
  const [cart, setCart] = useState<Record<string, CartItemQty>>({});
  const [cartExpanded, setCartExpanded] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paidCurrency, setPaidCurrency] = useState<'USD' | 'KHR'>('KHR');
  const [showTenderModal, setShowTenderModal] = useState(false);
  const params = useLocalSearchParams<{ tier?: string }>();
  const [tier, setTier] = useState<'RETAIL' | 'WHOLESALE'>(
    params.tier === 'wholesale' ? 'WHOLESALE' : 'RETAIL'
  );

  useEffect(() => {
    if (params.tier === 'wholesale') setTier('WHOLESALE');
    else if (params.tier === 'retail') setTier('RETAIL');
  }, [params.tier]);

  const isWholesale = tier === 'WHOLESALE';

  const unitUsd = (p: Product) =>
    isWholesale && p.wholesalePriceUsd && p.wholesalePriceUsd > 0
      ? Number(p.wholesalePriceUsd)
      : Number(p.priceUsd);

  const hasWholesale = (p: Product) =>
    Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0);

  const getItemQty = (p: Product): CartItemQty =>
    cart[p.id] || { cases: 0, loose: 0 };

  const getTotalUnits = (p: Product, itemQty?: CartItemQty): number => {
    const it = itemQty || cart[p.id];
    if (!it) return 0;
    const cQty = p.caseQty || 24;
    return Math.max(0, (it.cases || 0) * cQty + (it.loose || 0));
  };

  const getCasePriceUsd = (p: Product): number => {
    const cQty = p.caseQty || 24;
    const uPrice =
      isWholesale && p.wholesalePriceUsd && p.wholesalePriceUsd > 0
        ? Number(p.wholesalePriceUsd)
        : Number(p.priceUsd);
    return p.wholesalePricePerCaseUsd && p.wholesalePricePerCaseUsd > 0
      ? Number(p.wholesalePricePerCaseUsd)
      : uPrice * cQty;
  };

  const getItemPriceUsd = (p: Product, itemQty?: CartItemQty): number => {
    const it = itemQty || cart[p.id];
    if (!it) return 0;
    const cQty = p.caseQty || 24;
    const uPrice =
      isWholesale && p.wholesalePriceUsd && p.wholesalePriceUsd > 0
        ? Number(p.wholesalePriceUsd)
        : Number(p.priceUsd);

    if (isWholesale) {
      const casePrice = getCasePriceUsd(p);
      return (it.cases || 0) * casePrice + (it.loose || 0) * uPrice;
    }
    return getTotalUnits(p, it) * Number(p.priceUsd);
  };

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category?.trim()).filter(Boolean))),
    [products]
  );

  const selected = useMemo(
    () => products.filter((p) => getTotalUnits(p) > 0),
    [products, cart]
  );

  const total = useMemo(
    () => selected.reduce((n, p) => n + getItemPriceUsd(p), 0),
    [selected, cart, tier, isWholesale]
  );

  const units = useMemo(
    () => selected.reduce((n, p) => n + getTotalUnits(p), 0),
    [selected, cart]
  );

  // Auto-collapse cart drawer when cart becomes empty
  useEffect(() => {
    if (units === 0 && cartExpanded) {
      setCartExpanded(false);
    }
  }, [units, cartExpanded]);

  const canAddUnits = (p: Product, unitsToAdd = 1) =>
    p.stock > 0 && getTotalUnits(p) + unitsToAdd <= p.stock;

  function addCase(p: Product, count = 1) {
    const cQty = p.caseQty || 24;
    if (!canAddUnits(p, count * cQty)) {
      playFail();
      toast.show(
        tr(
          `Not enough stock for ${count} ${p.caseUnitName || 'Case'}`,
          `មិនមានស្តុកគ្រប់គ្រាន់សម្រាប់ ${count} ${p.caseUnitName || 'កេស'}`
        ),
        { tone: 'error' }
      );
      return;
    }
    playScan();
    setError('');
    setCart((prev) => {
      const cur = prev[p.id] || { cases: 0, loose: 0 };
      return {
        ...prev,
        [p.id]: {
          ...cur,
          cases: Math.max(0, cur.cases + count),
        },
      };
    });
  }

  function subCase(p: Product, count = 1) {
    setCart((prev) => {
      const cur = prev[p.id];
      if (!cur) return prev;
      const nextCases = Math.max(0, cur.cases - count);
      if (nextCases === 0 && cur.loose === 0) {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      }
      return {
        ...prev,
        [p.id]: { ...cur, cases: nextCases },
      };
    });
  }

  function addLoose(p: Product, count = 1) {
    if (!canAddUnits(p, count)) {
      playFail();
      toast.show(
        tr(`${p.name} is out of stock`, `${p.name} អស់ពីស្តុកហើយ`),
        { tone: 'error' }
      );
      return;
    }
    playScan();
    setError('');
    setCart((prev) => {
      const cur = prev[p.id] || { cases: 0, loose: 0 };
      return {
        ...prev,
        [p.id]: {
          ...cur,
          loose: Math.max(0, cur.loose + count),
        },
      };
    });
  }

  function subLoose(p: Product, count = 1) {
    setCart((prev) => {
      const cur = prev[p.id];
      if (!cur) return prev;
      const nextLoose = Math.max(0, cur.loose - count);
      if (cur.cases === 0 && nextLoose === 0) {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      }
      return {
        ...prev,
        [p.id]: { ...cur, loose: nextLoose },
      };
    });
  }

  function add(p: Product, count = 1) {
    if (isWholesale) {
      if ((p.caseQty || 24) > 1 && (cart[p.id]?.cases || 0) === 0 && (cart[p.id]?.loose || 0) === 0) {
        addCase(p, 1);
      } else {
        addLoose(p, count);
      }
    } else {
      addLoose(p, count);
    }
  }

  function sub(p: Product, count = 1) {
    if (isWholesale) {
      const cur = cart[p.id];
      if (cur && cur.loose >= count) {
        subLoose(p, count);
      } else if (cur && cur.cases > 0) {
        subCase(p, 1);
      } else {
        subLoose(p, count);
      }
    } else {
      subLoose(p, count);
    }
  }

  function setDirectUnits(p: Product, targetQty: number) {
    const val = Math.max(0, targetQty);
    if (val > p.stock) {
      toast.show(tr(`Cannot exceed stock of ${p.stock}`, `មិនអាចលើសស្តុក ${p.stock} ទេ`), { tone: 'warning' });
      return;
    }
    setCart((prev) => {
      if (val === 0) {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      }
      return { ...prev, [p.id]: { cases: 0, loose: val } };
    });
  }

  function setDirectCases(p: Product, targetCases: number) {
    const cQty = p.caseQty || 24;
    const cur = cart[p.id] || { cases: 0, loose: 0 };
    const safeCases = Math.max(0, targetCases);
    const totalUnits = safeCases * cQty + cur.loose;
    if (totalUnits > p.stock) {
      toast.show(tr(`Cannot exceed stock of ${p.stock}`, `មិនអាចលើសស្តុក ${p.stock} ទេ`), { tone: 'warning' });
      return;
    }
    setCart((prev) => {
      if (safeCases === 0 && cur.loose === 0) {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      }
      return { ...prev, [p.id]: { cases: safeCases, loose: cur.loose } };
    });
  }

  function setDirectLoose(p: Product, targetLoose: number) {
    const cQty = p.caseQty || 24;
    const cur = cart[p.id] || { cases: 0, loose: 0 };
    const safeLoose = Math.max(0, targetLoose);
    const totalUnits = cur.cases * cQty + safeLoose;
    if (totalUnits > p.stock) {
      toast.show(tr(`Cannot exceed stock of ${p.stock}`, `មិនអាចលើសស្តុក ${p.stock} ទេ`), { tone: 'warning' });
      return;
    }
    setCart((prev) => {
      if (cur.cases === 0 && safeLoose === 0) {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      }
      return { ...prev, [p.id]: { cases: cur.cases, loose: safeLoose } };
    });
  }

  function scanProduct(code: string, qty = 1): ScanResult {
    const clean = code.trim();
    const p = products.find((x) => sameBarcode(x.barcode, clean));
    if (!p) {
      playFail();
      const msg = tr(
        `Product not found (${clean})`,
        `រកមិនឃើញទំនិញ (${clean})`
      );
      setError(msg);
      return { ok: false, message: msg };
    }
    const unitsNeeded = isWholesale ? (p.caseQty || 24) * qty : qty;
    if (!canAddUnits(p, unitsNeeded)) {
      playFail();
      const left = p.stock - getTotalUnits(p);
      const msg = tr(
        `Out of stock: ${p.name} (${Math.max(0, left)} left)`,
        `អស់ពីស្តុក៖ ${p.name} (សល់ ${Math.max(0, left)})`
      );
      setError(msg);
      return { ok: false, message: msg };
    }

    playScan();
    setError('');
    if (isWholesale) {
      addCase(p, qty);
    } else {
      addLoose(p, qty);
    }
    const currentPrice = getItemPriceUsd(p);
    return {
      ok: true,
      label: `${p.name} (+${isWholesale ? `${qty} ${p.caseUnitName || 'Case'}` : qty}) · ${khr(currentPrice * rate)}`,
    };
  }

  async function checkout(fromScanner = false, tenderInfo?: {
    tenderAmount: number;
    tenderCurrency: 'USD' | 'KHR';
    exchange: CambodiaCashExchange;
  }) {
    if (!units || busy) return;
    setBusy(true);
    setError('');
    try {
      const sale = await api<Sale>('/sales/checkout', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          paidCurrency: tenderInfo?.tenderCurrency || paidCurrency,
          priceTier: tier,
          items: selected.map((p) => {
            const item = getItemQty(p);
            const totalQty = getTotalUnits(p, item);
            const cName = p.caseUnitName || 'Case';
            const bName = p.baseUnit || 'pcs';
            let uom = `${totalQty} ${bName}`;
            if (isWholesale && item.cases > 0) {
              uom =
                item.loose > 0
                  ? `${item.cases} ${cName} + ${item.loose} ${bName}`
                  : `${item.cases} ${cName}`;
            }
            return {
              productId: p.id,
              quantity: totalQty,
              cases: item.cases,
              loose: item.loose,
              uom,
              caseUnitName: cName,
              baseUnit: bName,
            };
          }),
        }),
      });

      const enhancedSale: Sale = {
        ...sale,
        paidCurrency: tenderInfo?.tenderCurrency || paidCurrency,
        tenderAmount: tenderInfo?.tenderAmount,
        tenderCurrency: tenderInfo?.tenderCurrency || paidCurrency,
        changeText: tenderInfo?.exchange.formattedSplit,
        changeSplit: tenderInfo?.exchange.formattedSplit,
        changeAllKhr: tenderInfo?.exchange.formattedAllKhr,
      };

      markEventNotified(`sale:${sale.id}`);
      if (fromScanner) setScanning(false);
      setCartExpanded(false);
      setLastReceipt(enhancedSale);
      setReceipt(enhancedSale);
      playCheckout();
      setCart({});
      toast.show(
        `${tr('Payment complete', 'ទំនិញបានទូទាត់')} · ${khr(sale.totalKhr || sale.totalUsd * rate)}`,
        {
          tone: 'success',
          actionLabel: tr('View receipt', 'មើលបង្កាន់ដៃ'),
          onAction: () => setReceipt(enhancedSale),
          duration: 7500,
        }
      );
      await refresh();
    } catch (e) {
      playFail();
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.show(msg, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (isWholesale && !hasWholesale(p)) return false;
        if (catFilter !== 'All' && p.category !== catFilter) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Put items currently in cart or in-stock first for faster finding
        const aInCart = getTotalUnits(a) > 0 ? 1 : 0;
        const bInCart = getTotalUnits(b) > 0 ? 1 : 0;
        if (aInCart !== bInCart) return bInCart - aInCart;
        const aInStock = a.stock > 0 ? 1 : 0;
        const bInStock = b.stock > 0 ? 1 : 0;
        if (aInStock !== bInStock) return bInStock - aInStock;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 60);
  }, [products, catFilter, search, cart]);

  const scannerCartItems = useMemo(
    () =>
      selected.map((p) => {
        const item = getItemQty(p);
        const totalU = getTotalUnits(p, item);
        const priceUsd = getItemPriceUsd(p, item);
        return {
          id: p.id,
          name: p.name,
          quantity: totalU,
          stock: p.stock,
          unitPriceKhr: khr(unitUsd(p) * rate),
          lineTotalKhr: khr(priceUsd * rate),
          cases: item.cases,
          loose: item.loose,
          uom:
            isWholesale && item.cases > 0
              ? `${item.cases} ${p.caseUnitName || 'Case'}${item.loose > 0 ? ` + ${item.loose} ${p.baseUnit || 'pcs'}` : ''}`
              : `${totalU} ${p.baseUnit || 'pcs'}`,
        };
      }),
    [selected, cart, rate, tier, isWholesale]
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Sticky Top Header & Search Bar for Effortless Item Finding */}
      <View style={styles.topStickyContainer}>
        {/* Row 1: Back, Title, Mode Pill, Camera Scan, Receipt */}
        <View style={styles.topBarRow}>
          <Press
            onPress={() => router.navigate('/(tabs)')}
            accessibilityLabel="Go back"
            style={styles.backBtn}
          >
            <ArrowLeft size={19} color={C.primary} />
          </Press>

          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.screenTitle}>
              {t('checkout')}
            </Text>
          </View>

          {lastReceipt && (
            <Press
              onPress={() => setReceipt(lastReceipt)}
              style={styles.receiptQuickBtn}
            >
              <Receipt size={15} color={C.primary} />
              <Text style={{ color: C.primary, fontWeight: '800', fontSize: 11.5 }}>
                {tr('Receipt', 'បង្កាន់ដៃ')}
              </Text>
            </Press>
          )}

          <Press
            onPress={() => setHeaderCollapsed((v) => !v)}
            accessibilityLabel="Toggle filter header"
            style={styles.collapseHeaderBtn}
          >
            {headerCollapsed ? (
              <ChevronDown size={18} color={C.primary} />
            ) : (
              <ChevronUp size={18} color={C.primary} />
            )}
          </Press>
        </View>

        {/* Row 2: Search Box with Search Icon on Left and Scan Icon Button on Right */}
        <View style={styles.unifiedSearchBox}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            placeholder={tr('Find item by name, barcode…', 'ស្វែងរកឈ្មោះ បាកូដ…')}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            style={styles.unifiedSearchInput}
          />
          {search ? (
            <Press
              onPress={() => setSearch('')}
              accessibilityLabel="Clear search"
              style={styles.searchClearBtn}
            >
              <X size={13} color={C.muted} />
            </Press>
          ) : null}
          <Press
            accessibilityLabel="Scan barcode"
            onPress={() => setScanning(true)}
            style={styles.searchScanBtn}
          >
            <ScanLine size={18} color={C.primary} strokeWidth={2.2} />
          </Press>
        </View>

        {/* Collapsible Retail/Wholesale Toggle & Category Filter Bar */}
        {!headerCollapsed && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <Segmented
                value={tier}
                onChange={(v) => setTier(v as 'RETAIL' | 'WHOLESALE')}
                options={[
                  {
                    value: 'RETAIL',
                    label: tr('Retail', 'លក់រាយ'),
                  },
                  {
                    value: 'WHOLESALE',
                    label: tr('Wholesale', 'លក់ដុំ'),
                  },
                ]}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 2 }}
            >
              {['All', ...categories].map((c, idx) => (
                <Chip
                  key={`${c}-${idx}`}
                  active={catFilter === c}
                  label={c === 'All' ? `${t('all')} (${products.length})` : c}
                  onPress={() => setCatFilter(c)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </View>

      {/* Product List */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + (cartExpanded ? 390 : 165),
        }}
      >
        <ErrorLine message={error} />

        <View style={styles.catalogHeaderRow}>
          <Text style={styles.catalogCountText}>
            {tr('Products', 'មុខទំនិញ')} ({list.length})
          </Text>
          {(search || catFilter !== 'All') && (
            <Press
              onPress={() => {
                setSearch('');
                setCatFilter('All');
              }}
              style={styles.resetSearchBtn}
            >
              <Text style={{ color: C.primary, fontSize: 11.5, fontWeight: '700' }}>
                {tr('Show All', 'បង្ហាញទាំងអស់')}
              </Text>
            </Press>
          )}
        </View>

        {list.length === 0 ? (
          <Empty message={t('empty')} />
        ) : (
          list.map((p, i) => {
            const itemQty = getItemQty(p);
            const totalU = getTotalUnits(p, itemQty);
            const cQty = p.caseQty || 24;
            const caseName = p.caseUnitName || 'Case';
            const baseName = p.baseUnit || 'pcs';
            const casePriceUsd = getCasePriceUsd(p);
            const itemPriceUsd = getItemPriceUsd(p, itemQty);
            const hasCase = isWholesale && cQty > 1;

            return (
              <Animated.View key={p.id} entering={rise(Math.min(i, 8))}>
                <Card
                  style={[
                    styles.productCard,
                    totalU > 0 && styles.productCardSelected,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ProductImage
                      id={p.id}
                      name={p.name}
                      uri={p.imageUrl ?? undefined}
                      barcode={p.barcode}
                      allowPreview={true}
                    />

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          numberOfLines={1}
                          style={{ fontWeight: '700', color: C.text, fontSize: 15, flex: 1 }}
                        >
                          {p.name}
                        </Text>
                      </View>
                      {/* Total items left directly under item title to maximize space for item name */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2, flexWrap: 'wrap' }}>
                        <View
                          style={{
                            backgroundColor:
                              p.stock === 0
                                ? C.redPale
                                : p.stock <= p.lowStockThreshold
                                ? C.amberPale
                                : C.pale,
                            paddingHorizontal: 6,
                            paddingVertical: 1.5,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                p.stock === 0
                                  ? C.red
                                  : p.stock <= p.lowStockThreshold
                                  ? C.amber
                                  : C.primary,
                              fontWeight: '800',
                              fontSize: 10.5,
                            }}
                          >
                            {p.stock === 0
                              ? tr('Out of stock', 'អស់ស្តុក')
                              : `${p.stock} ${tr('left', 'នៅសល់')}`}
                          </Text>
                        </View>
                        <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11 }}>
                          {p.category} {p.barcode ? `· ${p.barcode}` : ''}
                        </Text>
                      </View>

                      {isWholesale ? (
                        <View style={{ marginTop: 2 }}>
                          {hasCase ? (
                            <Text style={{ color: '#0F766E', fontWeight: '800', fontSize: 13 }}>
                              {khr(casePriceUsd * rate)}{' '}
                              <Text style={{ color: C.muted, fontWeight: '500', fontSize: 11 }}>
                                ({money(casePriceUsd)}) / {caseName} ({cQty} {baseName})
                              </Text>
                            </Text>
                          ) : null}
                          <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12 }}>
                            {khr(unitUsd(p) * rate)}{' '}
                            <Text style={{ color: C.muted, fontWeight: '500', fontSize: 10.5 }}>
                              ({money(unitUsd(p))}) / {baseName}
                            </Text>
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: C.primary, fontWeight: '800', fontSize: 14 }}>
                          {khr(unitUsd(p) * rate)}{' '}
                          <Text style={{ color: C.muted, fontWeight: '500', fontSize: 11.5 }}>
                            {money(unitUsd(p))}
                          </Text>
                        </Text>
                      )}
                    </View>

                    {/* Standard Retail Stepper (when in Retail Mode) */}
                    {!isWholesale && (
                      totalU === 0 ? (
                        <Animated.View key="add" entering={popIn}>
                          <Press
                            accessibilityLabel={`Add ${p.name}`}
                            disabled={!canAddUnits(p, 1)}
                            onPress={() => addLoose(p, 1)}
                            scale={0.88}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: canAddUnits(p, 1) ? C.primary : C.border,
                            }}
                          >
                            <Plus size={20} color={canAddUnits(p, 1) ? '#fff' : C.faint} />
                          </Press>
                        </Animated.View>
                      ) : (
                        <Animated.View key="step" entering={popIn} style={styles.stepperWrap}>
                          <Press
                            accessibilityLabel={`Remove one ${p.name}`}
                            onPress={() => subLoose(p, 1)}
                            scale={0.85}
                            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={15} color={C.primary} />
                          </Press>
                          <Text style={styles.stepperQtyText}>{totalU}</Text>
                          <Press
                            accessibilityLabel={`Add one ${p.name}`}
                            disabled={!canAddUnits(p, 1)}
                            onPress={() => addLoose(p, 1)}
                            scale={0.85}
                            style={{
                              width: 32,
                              height: 32,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: canAddUnits(p, 1) ? 1 : 0.35,
                            }}
                          >
                            <Plus size={15} color={C.primary} />
                          </Press>
                        </Animated.View>
                      )
                    )}
                  </View>

                  {/* Wholesale Dual-UOM Stepper & Quick Action Row (when in Wholesale Mode) */}
                  {isWholesale && (
                    <View style={styles.wholesaleActionContainer}>
                      {/* Dual Stepper Control Row */}
                      <View style={styles.wholesaleSteppersRow}>
                        {/* 1. Wholesale UOM Stepper (Case / Box) */}
                        <View style={styles.wholesaleUomBox}>
                          <Text style={styles.uomSectionLabel}>
                            {caseName} ({cQty} {baseName})
                          </Text>
                          <View style={styles.uomStepperInner}>
                            <Press
                              disabled={itemQty.cases === 0}
                              onPress={() => subCase(p, 1)}
                              scale={0.85}
                              style={[
                                styles.uomBtnSmall,
                                itemQty.cases === 0 && { opacity: 0.3 },
                              ]}
                            >
                              <Minus size={13} color="#0D9488" />
                            </Press>
                            <TextInput
                              value={String(itemQty.cases)}
                              onChangeText={(txt) => {
                                const val = parseInt(txt.replace(/\D/g, ''), 10);
                                setDirectCases(p, isNaN(val) ? 0 : val);
                              }}
                              keyboardType="number-pad"
                              style={[styles.uomQtyValue, { minWidth: 28, paddingVertical: 0, textAlign: 'center' }]}
                            />
                            <Press
                              disabled={!canAddUnits(p, cQty)}
                              onPress={() => addCase(p, 1)}
                              scale={0.85}
                              style={[
                                styles.uomBtnSmall,
                                !canAddUnits(p, cQty) && { opacity: 0.3 },
                              ]}
                            >
                              <Plus size={13} color="#0D9488" />
                            </Press>
                          </View>
                        </View>

                        {/* 2. Loose Unit Stepper (+Can / +Piece) */}
                        <View style={styles.wholesaleLooseBox}>
                          <Text style={styles.uomSectionLabel}>
                            +{baseName} ({tr('Loose', 'រាយ')})
                          </Text>
                          <View style={styles.uomStepperInner}>
                            <Press
                              disabled={itemQty.loose === 0}
                              onPress={() => subLoose(p, 1)}
                              scale={0.85}
                              style={[
                                styles.uomBtnSmall,
                                itemQty.loose === 0 && { opacity: 0.3 },
                              ]}
                            >
                              <Minus size={13} color={C.primary} />
                            </Press>
                            <TextInput
                              value={String(itemQty.loose)}
                              onChangeText={(txt) => {
                                const val = parseInt(txt.replace(/\D/g, ''), 10);
                                setDirectLoose(p, isNaN(val) ? 0 : val);
                              }}
                              keyboardType="number-pad"
                              style={[styles.uomQtyValue, { minWidth: 28, paddingVertical: 0, textAlign: 'center' }]}
                            />
                            <Press
                              disabled={!canAddUnits(p, 1)}
                              onPress={() => addLoose(p, 1)}
                              scale={0.85}
                              style={[
                                styles.uomBtnSmall,
                                !canAddUnits(p, 1) && { opacity: 0.3 },
                              ]}
                            >
                              <Plus size={13} color={C.primary} />
                            </Press>
                          </View>
                        </View>
                      </View>

                      {/* Fast Quick-Add Pills Row: e.g. +1 Case, +15 Cans, +5 Cans, +1 Can */}
                      <View style={styles.quickAddPillsRow}>
                        <Press
                          onPress={() => addCase(p, 1)}
                          disabled={!canAddUnits(p, cQty)}
                          style={[
                            styles.quickCasePill,
                            !canAddUnits(p, cQty) && { opacity: 0.4 },
                          ]}
                        >
                          <Boxes size={12} color="#0F766E" />
                          <Text style={styles.quickCasePillText}>+1 {caseName}</Text>
                        </Press>

                        <Press
                          onPress={() => addLoose(p, 15)}
                          disabled={!canAddUnits(p, 15)}
                          style={[
                            styles.quickLoosePill,
                            !canAddUnits(p, 15) && { opacity: 0.4 },
                          ]}
                        >
                          <Text style={styles.quickLoosePillText}>+15 {baseName}</Text>
                        </Press>

                        <Press
                          onPress={() => addLoose(p, 5)}
                          disabled={!canAddUnits(p, 5)}
                          style={[
                            styles.quickLoosePill,
                            !canAddUnits(p, 5) && { opacity: 0.4 },
                          ]}
                        >
                          <Text style={styles.quickLoosePillText}>+5 {baseName}</Text>
                        </Press>

                        <Press
                          onPress={() => addLoose(p, 1)}
                          disabled={!canAddUnits(p, 1)}
                          style={[
                            styles.quickLoosePill,
                            !canAddUnits(p, 1) && { opacity: 0.4 },
                          ]}
                        >
                          <Text style={styles.quickLoosePillText}>+1 {baseName}</Text>
                        </Press>
                      </View>

                      {/* Active Breakdown Badge when in cart */}
                      {totalU > 0 && (
                        <View style={styles.activeBreakdownBadge}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.activeBreakdownText}>
                              {itemQty.cases > 0 ? `${itemQty.cases} ${caseName}` : ''}
                              {itemQty.cases > 0 && itemQty.loose > 0 ? ' + ' : ''}
                              {itemQty.loose > 0 ? `${itemQty.loose} ${baseName}` : ''}
                              {itemQty.cases === 0 && itemQty.loose === 0 ? `0 ${baseName}` : ''}{' '}
                              <Text style={{ fontWeight: '600', color: C.muted }}>
                                ({tr('Total', 'សរុប')}: {totalU} {baseName})
                              </Text>
                            </Text>
                          </View>
                          <Text style={styles.activeBreakdownPrice}>
                            {khr(itemPriceUsd * rate)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Pinned Fixed Bottom Footer with Collapsible Checkout Cart */}
      <View
        style={[
          styles.fixedFooter,
          {
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Collapsible Cart Header Bar (Tap to Expand / Collapse Cart) */}
        {units > 0 && (
          <View style={styles.cartDrawerHeader}>
            <Press
              onPress={() => setCartExpanded((v) => !v)}
              style={styles.cartDrawerToggleBtn}
            >
              <View style={styles.cartBadge}>
                <ShoppingBag size={13} color="#FFFFFF" />
                <Text style={styles.cartBadgeText}>{units}</Text>
              </View>
              <Text style={styles.cartDrawerTitle}>
                {tr('Checkout Cart', 'កន្ត្រកទំនិញ')} ({selected.length}{' '}
                {tr('products', 'មុខ')})
              </Text>
              <View style={styles.expandPill}>
                <Text style={styles.expandPillText}>
                  {cartExpanded
                    ? tr('Hide', 'បង្រួម')
                    : tr('View items', 'មើលទំនិញ')}
                </Text>
                {cartExpanded ? (
                  <ChevronDown size={15} color={C.primary} />
                ) : (
                  <ChevronUp size={15} color={C.primary} />
                )}
              </View>
            </Press>

            <Press
              onPress={() => {
                setCart({});
                setCartExpanded(false);
              }}
              style={styles.clearCartBtn}
            >
              <Trash2 size={13} color={C.red} />
              <Text style={{ color: C.red, fontWeight: '700', fontSize: 11.5 }}>
                {tr('Clear', 'សម្អាត')}
              </Text>
            </Press>
          </View>
        )}

        {/* Expandable Cart Items List */}
        {cartExpanded && units > 0 && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(140)}
            style={styles.cartDrawerListWrap}
          >
            <ScrollView
              style={{ maxHeight: 210 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              {selected.map((p) => {
                const itemQty = getItemQty(p);
                const totalU = getTotalUnits(p, itemQty);
                const cQty = p.caseQty || 24;
                const caseName = p.caseUnitName || 'Case';
                const baseName = p.baseUnit || 'pcs';
                const itemPriceUsd = getItemPriceUsd(p, itemQty);
                return (
                  <View key={p.id} style={styles.cartDrawerItem}>
                    <View style={styles.cartDrawerItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={{ color: C.text, fontWeight: '700', fontSize: 13.5 }}
                        >
                          {p.name}
                        </Text>
                        {isWholesale && itemQty.cases > 0 ? (
                          <Text style={{ color: '#0F766E', fontSize: 11.5, fontWeight: '700', marginTop: 1 }}>
                            {itemQty.cases} {caseName}
                            {itemQty.loose > 0 ? ` + ${itemQty.loose} ${baseName}` : ''}{' '}
                            <Text style={{ color: C.muted, fontWeight: '500' }}>
                              ({totalU} {baseName})
                            </Text>
                          </Text>
                        ) : null}
                        <Text style={{ color: C.muted, fontSize: 11.5, marginTop: 1 }}>
                          <Text style={{ color: C.primary, fontWeight: '800' }}>
                            {khr(itemPriceUsd * rate)}
                          </Text>{' '}
                          ({money(itemPriceUsd)})
                        </Text>
                      </View>

                      {/* Steppers in Cart Drawer */}
                      {isWholesale ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* Case Stepper */}
                          <View style={styles.drawerUomStepper}>
                            <Press
                              onPress={() => subCase(p, 1)}
                              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Minus size={11} color="#0D9488" />
                            </Press>
                            <TextInput
                              value={String(itemQty.cases)}
                              onChangeText={(txt) => {
                                const val = parseInt(txt.replace(/\D/g, ''), 10);
                                setDirectCases(p, isNaN(val) ? 0 : val);
                              }}
                              keyboardType="number-pad"
                              style={{ fontSize: 11, fontWeight: '800', color: '#0F766E', minWidth: 20, textAlign: 'center', padding: 0 }}
                            />
                            <Press
                              disabled={!canAddUnits(p, cQty)}
                              onPress={() => addCase(p, 1)}
                              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', opacity: canAddUnits(p, cQty) ? 1 : 0.35 }}
                            >
                              <Plus size={11} color="#0D9488" />
                            </Press>
                          </View>

                          {/* Loose Stepper */}
                          <View style={styles.drawerUomStepper}>
                            <Press
                              onPress={() => subLoose(p, 1)}
                              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Minus size={11} color={C.primary} />
                            </Press>
                            <TextInput
                              value={String(itemQty.loose)}
                              onChangeText={(txt) => {
                                const val = parseInt(txt.replace(/\D/g, ''), 10);
                                setDirectLoose(p, isNaN(val) ? 0 : val);
                              }}
                              keyboardType="number-pad"
                              style={{ fontSize: 11, fontWeight: '800', color: C.primary, minWidth: 20, textAlign: 'center', padding: 0 }}
                            />
                            <Press
                              disabled={!canAddUnits(p, 1)}
                              onPress={() => addLoose(p, 1)}
                              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', opacity: canAddUnits(p, 1) ? 1 : 0.35 }}
                            >
                              <Plus size={11} color={C.primary} />
                            </Press>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.stepperSmallWrap}>
                          <Press
                            onPress={() => subLoose(p, 1)}
                            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={13} color={C.primary} />
                          </Press>
                          <TextInput
                            value={String(totalU)}
                            onChangeText={(txt) => {
                              const val = parseInt(txt.replace(/\D/g, ''), 10);
                              setDirectUnits(p, isNaN(val) ? 0 : val);
                            }}
                            keyboardType="number-pad"
                            style={[styles.stepperSmallQty, { minWidth: 28, padding: 0 }]}
                          />
                          <Press
                            disabled={!canAddUnits(p, 1)}
                            onPress={() => addLoose(p, 1)}
                            style={{
                              width: 28,
                              height: 28,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: canAddUnits(p, 1) ? 1 : 0.35,
                            }}
                          >
                            <Plus size={13} color={C.primary} />
                          </Press>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Summary & Payment Row */}
        <View style={styles.footerTopRow}>
          {/* Currency Toggle */}
          <View style={styles.footerCurrencyToggle}>
            <Press
              onPress={() => setPaidCurrency('KHR')}
              style={[
                styles.footerCurrencyBtn,
                paidCurrency === 'KHR' && styles.footerCurrencyBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.footerCurrencyBtnText,
                  paidCurrency === 'KHR' && styles.footerCurrencyBtnTextActive,
                ]}
              >
                ៛ KHR
              </Text>
            </Press>
            <Press
              onPress={() => setPaidCurrency('USD')}
              style={[
                styles.footerCurrencyBtn,
                paidCurrency === 'USD' && styles.footerCurrencyBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.footerCurrencyBtnText,
                  paidCurrency === 'USD' && styles.footerCurrencyBtnTextActive,
                ]}
              >
                $ USD
              </Text>
            </Press>
          </View>

          {/* Total Display */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerTotalKhr}>{khr(total * rate)}</Text>
            <Text style={styles.footerTotalUsd}>
              {money(total)} · {isWholesale ? tr('Wholesale', 'លក់ដុំ') : tr('Retail', 'លក់រាយ')}
            </Text>
          </View>
        </View>

        {/* Primary Checkout Action Button */}
        <Btn
          icon={CheckCircle2}
          loading={busy}
          disabled={!units}
          onPress={() => setShowTenderModal(true)}
          style={{ height: 50, borderRadius: 16 }}
        >
          {busy
            ? tr('Processing Checkout…', 'កំពុងទូទាត់…')
            : units > 0
            ? `${isWholesale ? tr('Wholesale Pay', 'ទូទាត់លក់ដុំ') : tr('Pay Now', 'ទូទាត់ប្រាក់')} · ${khr(total * rate)}`
            : tr('Tap items or Scan to Checkout', 'ជ្រើសទំនិញ ឬស្កេនដើម្បីទូទាត់')}
        </Btn>
      </View>

      <CashTenderModal
        visible={showTenderModal}
        totalKhr={total * rate}
        totalUsd={total}
        rate={rate}
        busy={busy}
        onClose={() => setShowTenderModal(false)}
        onConfirm={(tender) => {
          setShowTenderModal(false);
          void checkout(false, tender);
        }}
      />

      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
      <CameraScanner
        visible={scanning}
        mode="checkout"
        count={units}
        checkoutItems={scannerCartItems}
        checkoutTotalKhr={khr(total * rate)}
        checkoutTotalUsd={money(total)}
        onIncrementItem={(id) => {
          const prod = products.find((x) => x.id === id);
          if (prod) add(prod, 1);
        }}
        onDecrementItem={(id) => {
          const prod = products.find((x) => x.id === id);
          if (prod) sub(prod);
        }}
        onCompleteCheckout={() => void checkout(true)}
        checkoutBusy={busy}
        onClose={() => setScanning(false)}
        onCode={scanProduct}
        title={tr('Scan products to cart', 'ស្កេនទំនិញចូលកន្ត្រក')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topStickyContainer: {
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...shadow.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    color: C.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  receiptQuickBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: C.pale,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  collapseHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  unifiedSearchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    height: '100%',
  },
  searchClearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchScanBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catalogCountText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
  },
  resetSearchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: C.pale,
  },
  productCard: {
    marginBottom: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  productCardSelected: {
    borderColor: C.primary,
    backgroundColor: '#FAF8FF',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.pale,
    borderRadius: 14,
    padding: 3,
  },
  stepperQtyText: {
    minWidth: 24,
    textAlign: 'center',
    color: C.text,
    fontWeight: '800',
  },
  caseActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  caseQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  caseRemoveBtn: {
    backgroundColor: C.redPale,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  // Wholesale Dual UOM & Loose Steppers
  wholesaleActionContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  wholesaleSteppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wholesaleUomBox: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 6,
  },
  wholesaleLooseBox: {
    flex: 1,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    borderRadius: 12,
    padding: 6,
  },
  uomSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: C.muted,
    marginBottom: 4,
  },
  uomStepperInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 3,
  },
  uomBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uomQtyValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.text,
  },
  quickAddPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickCasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickCasePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  quickLoosePill: {
    backgroundColor: C.pale,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickLoosePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
  },
  activeBreakdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  activeBreakdownText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  activeBreakdownPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: C.primary,
  },
  drawerUomStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 2,
    gap: 2,
  },

  // Fixed Bottom Footer & Collapsible Cart
  fixedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#241A3F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  cartDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  cartDrawerToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  cartDrawerTitle: {
    flex: 1,
    color: C.text,
    fontWeight: '800',
    fontSize: 13.5,
  },
  expandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.pale,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  expandPillText: {
    color: C.primary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.redPale,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  cartDrawerListWrap: {
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cartDrawerItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cartDrawerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepperSmallWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 2,
  },
  stepperSmallQty: {
    minWidth: 22,
    textAlign: 'center',
    color: C.text,
    fontWeight: '800',
    fontSize: 12.5,
  },
  cartDrawerCaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  drawerCaseChip: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  drawerCaseRemoveChip: {
    backgroundColor: C.redPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  footerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerCurrencyToggle: {
    flexDirection: 'row',
    backgroundColor: C.pale,
    borderRadius: 10,
    padding: 2,
  },
  footerCurrencyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  footerCurrencyBtnActive: {
    backgroundColor: C.primary,
  },
  footerCurrencyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
  },
  footerCurrencyBtnTextActive: {
    color: '#FFFFFF',
  },
  footerTotalKhr: {
    color: C.primary,
    fontWeight: '900',
    fontSize: 21,
    letterSpacing: -0.4,
  },
  footerTotalUsd: {
    color: C.muted,
    fontWeight: '600',
    fontSize: 11.5,
  },
});
