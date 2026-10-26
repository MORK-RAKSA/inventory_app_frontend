import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Plus,
  X,
  ArrowLeftRight,
  ImagePlus,
  Pencil,
  Search,
  ScanLine,
  Package,
  AlertTriangle,
  Lock,
  Download,
  Sparkles,
  Warehouse,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, ApiError, Product } from '../../src/api';
import { useLiveData } from '../../src/hooks/useLiveData';
import { useSounds } from '../../src/hooks/useSounds';
import { useLanguage } from '../../src/i18n';
import { useToast } from '../../src/toast';
import { markEventNotified } from '../../src/liveSync';
import { Press, Chip, Rise, rise } from '../../src/motion';
import {
  Screen,
  Card,
  Btn,
  Field,
  IconBadge,
  C,
  money,
  khr,
  roundKhr,
  Pill,
  ErrorLine,
  Empty,
  Heading,
} from '../../src/ui';
import { ProductImage, storeProductImage } from '../../src/components/ProductImage';
import { exportExcel } from '../../src/exportExcel';
import { DateRangeFilterButton } from '../../src/components/CalendarPickerModal';
import { CameraScanner, ScanResult } from '../../src/components/CameraScanner';
import {
  lookupBarcodeOnline,
  rememberBarcodeInfo,
  buildSmartBarcodeName,
} from '../../src/barcodeLookup';
import { SwipeActions } from '../../src/components/SwipeActions';
import { sameBarcode, canonicalBarcode } from '../../src/barcode';
import { CategorySelect } from '../../src/components/CategorySelect';
import { BarcodeCard } from '../../src/components/BarcodeCard';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function Inventory() {
  const router = useRouter();
  const { products, rate, error: fetchError, refresh } = useLiveData('products');
  const params = useLocalSearchParams<{ low?: string; category?: string; expiry?: string; add?: string }>();
  const { t, tr } = useLanguage();
  const toast = useToast();
  const { playScan, playFail } = useSounds();

  const [search, setSearch] = useState('');
  const [scanTarget, setScanTarget] = useState<'search' | 'barcode' | null>(null);
  const reopenModalAfterScan = useRef(false);
  const autoFilledNameRef = useRef('');
  const lastInventoryScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const [expiry, setExpiry] = useState('');
  const [filter, setFilter] = useState('All');
  const [onlyLow, setOnlyLow] = useState(false);
  const [onlyExpiry, setOnlyExpiry] = useState(false);
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('General');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('KHR');
  const [stock, setStock] = useState('0');
  const [threshold, setThreshold] = useState('5');
  // Wholesale price list: same currency as the retail price field, optional.
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('1');
  const [photo, setPhoto] = useState<string | undefined>();
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function resolveBarcodeName(code: string) {
    const clean = code.trim();
    if (!clean) return null;
    setLookingUp(true);
    try {
      const info = await lookupBarcodeOnline(clean, { allowFallback: true });
      if (info && info.name) {
        setName((prev) => {
          const trimmed = prev.trim();
          if (!trimmed || trimmed === autoFilledNameRef.current || trimmed.startsWith('Product #') || trimmed.includes('Product #')) {
            autoFilledNameRef.current = info.name;
            return info.name;
          }
          return prev;
        });
        if (info.category && info.category !== 'General') {
          setCategory(info.category);
        }
        if (info.imageUrl) {
          setPhoto((prev) => prev || info.imageUrl);
        }
        toast.show(
          info.isFallback
            ? tr(`Scanned barcode: ${info.name}`, `បានស្កេនបាកូដ៖ ${info.name}`)
            : tr(`Auto-filled: ${info.name}`, `បានរកឃើញឈ្មោះទំនិញ៖ ${info.name}`),
          { tone: 'success' }
        );
        return info;
      }
    } finally {
      setLookingUp(false);
    }
    return null;
  }

  async function handleBarcodeScan(code: string, qty = 1): Promise<ScanResult> {
    const clean = code.trim();
    if (!clean) return false;

    const now = Date.now();
    // Prevent accidental runaway duplicate scanning of the same item increasing stock multiple times
    if (
      scanTarget === 'barcode' &&
      lastInventoryScanRef.current.code === clean &&
      now - lastInventoryScanRef.current.at < 1500
    ) {
      return {
        ok: true,
        label: tr('Scan cooldown active', 'កំពុងពន្យារពេលស្កេនដដែល'),
      };
    }
    lastInventoryScanRef.current = { code: clean, at: now };

    if (scanTarget === 'search') {
      const found = products.find(
        (p) => sameBarcode(p.barcode, clean)
      );
      if (!found) {
        playFail();
        return {
          ok: false,
          message: tr(
            `Product not found in inventory (${clean})`,
            `រកមិនឃើញទំនិញក្នុងស្តុកទេ (${clean})`
          ),
        };
      }
      playScan();
      setSearch(clean);
      setFilter('All');
      setOnlyLow(false);
      return {
        ok: true,
        label: `${found.name} (${found.stock} ${tr('in stock', 'ក្នុងស្តុក')})`,
        closeScanner: true,
      };
    }

    // Scanning to Add / Restock
    const existing = products.find(
      (p) => sameBarcode(p.barcode, clean)
    );
    if (existing) {
      playScan();
      const baseStock =
        editing?.id === existing.id ? Number(stock) || existing.stock : existing.stock;
      const nextStock = baseStock + qty;
      setEditing(existing);
      setName(existing.name);
      setBarcode(existing.barcode || clean);
      setCategory(existing.category || 'General');
      setPrice(String(roundKhr(existing.priceUsd * rate)));
      setWholesalePrice(existing.wholesalePriceUsd ? String(roundKhr(existing.wholesalePriceUsd * rate)) : '');
      setWholesaleMinQty(String(existing.wholesaleMinQty ?? 1));
      setCurrency('KHR');
      setStock(String(nextStock));
      setThreshold(String(existing.lowStockThreshold ?? 5));
      setExpiry(existing.expirationDate || '');
      toast.show(
        tr(
          `${existing.name}: +${qty} added (Stock → ${nextStock})`,
          `${existing.name}: បានបូក +${qty} (ស្តុក → ${nextStock})`
        ),
        { tone: 'success' }
      );
      return {
        ok: true,
        label: `${existing.name} (+${qty} → ${nextStock})`,
      };
    }

    // New barcode scanned: accumulate quantity if scanned multiple times
    playScan();
    const isDifferentBarcode = barcode.trim() !== clean;
    setStock((prev) => {
      const currentQty = !isDifferentBarcode ? Number(prev) || 0 : 0;
      return String(currentQty + qty);
    });
    setBarcode(clean);

    // Immediately set a smart barcode name so the name field is never empty,
    // then upgrade it with the online product catalog lookup!
    const fallback = buildSmartBarcodeName(clean);
    if (!name.trim() || isDifferentBarcode || name.trim() === autoFilledNameRef.current) {
      autoFilledNameRef.current = fallback.name;
      setName(fallback.name);
    }

    // Do NOT await the online catalog lookup: it is a network round-trip and made the scanner feel
    // slow on every unknown barcode. The success feedback is instant, and the name field upgrades
    // itself as soon as the lookup resolves.
    void resolveBarcodeName(clean);
    return {
      ok: true,
      label: `${fallback.name} (+${qty})`,
    };
  }

  function startBarcodeScanFromForm() {
    reopenModalAfterScan.current = true;
    setModal(false);
    setTimeout(() => {
      setScanTarget('barcode');
    }, 120);
  }

  function closeScanner() {
    setScanTarget(null);
    if (reopenModalAfterScan.current) {
      reopenModalAfterScan.current = false;
      setTimeout(() => {
        setModal(true);
      }, 120);
    }
  }

  useEffect(() => {
    setOnlyLow(params.low === '1');
    setOnlyExpiry(params.expiry === '1');
    if (typeof params.category === 'string') setFilter(params.category);
  }, [params.low, params.category, params.expiry]);

  // Home "Add item" quick action opens the add-product form straight away.
  useEffect(() => {
    if (params.add === '1') open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.add]);

  const cats = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );
  const low = products.filter((p) => p.stock <= p.lowStockThreshold);
  const visible = products.filter(
    (p) =>
      (filter === 'All' || p.category === filter) &&
      (!onlyLow || p.stock <= p.lowStockThreshold) &&
      (!onlyExpiry ||
        Boolean(
          p.expirationDate &&
            new Date(p.expirationDate + 'T23:59:59').getTime() <=
              Date.now() + 7 * 86400000
        )) &&
      (!expiryFrom || Boolean(p.expirationDate && p.expirationDate >= expiryFrom)) &&
      (!expiryTo || Boolean(p.expirationDate && p.expirationDate <= expiryTo)) &&
      (p.name + ' ' + (p.barcode || '') + ' ' + p.category)
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  function open(p?: Product, scanImmediately = false) {
    setDetail(null);
    if (p) {
      router.push({ pathname: '/product-form', params: { id: p.id } });
    } else {
      router.push({ pathname: '/product-form', params: scanImmediately ? { barcode: '' } : {} });
    }
  }

  function switchCurrency() {
    const convert = (v: string) =>
      currency === 'USD'
        ? String(roundKhr(Number(v) * rate))
        : String(Number((Number(v) / rate).toFixed(2)));
    if (price && Number.isFinite(Number(price))) setPrice(convert(price));
    if (wholesalePrice && Number.isFinite(Number(wholesalePrice)))
      setWholesalePrice(convert(wholesalePrice));
    setCurrency(currency === 'USD' ? 'KHR' : 'USD');
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission required',
        'Allow photo library access to select a product image.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.75,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  function genCode() {
    const generated =
      'RF' +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).slice(2, 7).toUpperCase();
    setBarcode(generated);
    if (!name.trim()) {
      const smart = buildSmartBarcodeName(generated);
      autoFilledNameRef.current = smart.name;
      setName(smart.name);
    }
  }

  /** Upload to the server (Cloudflare R2) when it is configured; otherwise keep the photo on this device. */
  async function attachPhoto(id: string, uri: string) {
    try {
      const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
      const type =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const form = new FormData();
      form.append('file', { uri, name: `product.${ext}`, type } as any);
      await api<Product>(`/products/${id}/image`, { method: 'POST', body: form });
    } catch (e) {
      await storeProductImage(id, uri); // always keep a local copy so the photo is never lost
      if (!(e instanceof ApiError && e.status === 501))
        Alert.alert(
          tr('Photo saved on this device only', 'រូបភាពរក្សាទុកក្នុងឧបករណ៍នេះប៉ុណ្ណោះ'),
          String(e instanceof Error ? e.message : e)
        );
    }
  }

  async function save() {
    const qty = Number(stock),
      amount = Number(price),
      limit = Number(threshold);
    if (
      !name.trim() ||
      !category.trim() ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      !Number.isInteger(qty) ||
      qty < 0 ||
      !Number.isInteger(limit) ||
      limit < 0
    ) {
      setError('Enter a valid name, category, non-negative price, stock and threshold');
      return;
    }
    if (
      expiry &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(new Date(expiry).getTime()))
    ) {
      setError('Expiry date must be YYYY-MM-DD');
      return;
    }
    const wholesaleAmount = wholesalePrice.trim() === '' ? null : Number(wholesalePrice);
    const wholesaleQty = Math.max(1, Math.round(Number(wholesaleMinQty) || 1));
    if (wholesaleAmount !== null && (!Number.isFinite(wholesaleAmount) || wholesaleAmount < 0)) {
      setError('Wholesale price must be a non-negative number (or leave it empty)');
      return;
    }
    // Same product scanned as UPC-A / EAN-13 / GTIN-14 must never become a second product.
    const code = canonicalBarcode(barcode);
    if (!editing && code) {
      const dup = products.find((p) => sameBarcode(p.barcode, code));
      if (dup) {
        const m = tr(
          `This barcode already belongs to "${dup.name}". Scan it again to add stock.`,
          `បាកូដនេះជារបស់ "${dup.name}" រួចហើយ។ ស្កេនម្តងទៀតដើម្បីបូកស្តុក។`
        );
        setError(m);
        toast.show(m, { tone: 'error' });
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: name.trim(),
        ...(editing ? {} : { barcode: code || null }),
        category: category.trim(),
        price: amount,
        currency,
        stock: qty,
        lowStockThreshold: limit,
        expirationDate: expiry || null,
        wholesalePrice: wholesaleAmount && wholesaleAmount > 0 ? wholesaleAmount : null,
        wholesaleMinQty: wholesaleQty,
      };
      const result = await api<Product>(
        editing ? `/products/${editing.id}` : '/products',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify(body),
        }
      );
      if (result?.id) {
        markEventNotified(`add:${result.id}`);
        markEventNotified(
          `upd:${result.id}:${result.stock}:${Number(result.priceUsd).toFixed(4)}:${result.name}`
        );
      }
      await rememberBarcodeInfo(barcode.trim() || result?.barcode, {
        name: name.trim(),
        category: category.trim(),
        imageUrl: photo || result?.imageUrl,
      });
      if (photo) await attachPhoto(result.id || editing!.id, photo);
      setModal(false);
      toast.show(
        editing
          ? tr('Product updated', 'បានកែប្រែទំនិញ')
          : tr('Product added', 'បានបន្ថែមទំនិញ'),
        { tone: 'success' }
      );
      await refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m);
      toast.show(m, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function remove(p: Product) {
    const doArchive = async () => {
      try {
        await api(`/products/${p.id}`, { method: 'DELETE' });
        toast.show(tr('Product archived', 'បានលុបទំនិញ'), { tone: 'success' });
        void refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        toast.show(msg, { tone: 'error' });
      }
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Archive ${p.name}?`))
        void doArchive();
      return;
    }
    Alert.alert('Archive product?', `Archive ${p.name}?`, [
      { text: 'Cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => void doArchive() },
    ]);
  }

  return (
    <Screen
      onRefresh={refresh}
      title={t('inventory')}
      subtitle={`${products.length} ${tr('products', 'ទំនិញ')} · ${products.reduce((n, p) => n + p.stock, 0)} ${tr('units', 'ឯកតា')}`}
    >
      <Rise index={2} style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <IconBadge icon={Package} size={36} />
          <Text style={{ color: C.muted, marginTop: 12, fontSize: 12.5 }}>
            {t('products')}
          </Text>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: '800' }}>
            {products.length}
          </Text>
        </Card>
        <Press scale={0.97} onPress={() => setOnlyLow(!onlyLow)} style={{ flex: 1 }}>
          <Card style={onlyLow ? { borderWidth: 1.5, borderColor: C.amber } : undefined}>
            <IconBadge icon={AlertTriangle} size={36} tone="amber" />
            <Text style={{ color: C.muted, marginTop: 12, fontSize: 12.5 }}>
              {t('lowStock')}
            </Text>
            <Text style={{ color: C.amber, fontSize: 26, fontWeight: '800' }}>
              {low.length}
            </Text>
          </Card>
        </Press>
      </Rise>

      <Rise index={3}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Btn icon={ScanLine} onPress={() => open(undefined, true)}>
              {tr('Scan Add New', 'ស្កេនបន្ថែមថ្មី')}
            </Btn>
          </View>
          <View style={{ flex: 1 }}>
            <Btn soft icon={ScanLine} onPress={() => router.push('/batch')}>
              {tr('Batch add', 'បន្ថែមច្រើន')}
            </Btn>
          </View>
          <Press
            accessibilityLabel="Export all inventory to Excel"
            onPress={() =>
              void exportExcel(
                'all-items.xlsx',
                [
                  'ID',
                  'Name',
                  'Barcode',
                  'Category',
                  'USD Price',
                  'Stock',
                  'Threshold',
                  'Expiration Date',
                ],
                products.map((p) => [
                  p.id,
                  p.name,
                  p.barcode,
                  p.category,
                  p.priceUsd,
                  p.stock,
                  p.lowStockThreshold,
                  p.expirationDate,
                ])
              )
            }
            style={{
              height: 48,
              width: 48,
              borderRadius: 13,
              backgroundColor: C.pale,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Download size={20} color={C.primary} />
          </Press>
        </View>
        <View style={{ height: 14 }} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {/* Integrated Search Box with Search Icon and embedded Scan Barcode Icon */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: C.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 50,
              gap: 8,
            }}
          >
            <Search size={18} color="#9CA3AF" />
            <TextInput
              placeholder={t('search')}
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, color: C.text, fontSize: 14, height: '100%' }}
            />
            {search ? (
              <Press
                onPress={() => setSearch('')}
                accessibilityLabel="Clear search"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: C.pale,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={13} color={C.muted} />
              </Press>
            ) : null}
            <Press
              accessibilityLabel="Scan barcode to search"
              onPress={() => {
                reopenModalAfterScan.current = false;
                setScanTarget('search');
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: '#F0FDFA',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#CCFBF1',
              }}
            >
              <ScanLine color="#0D9488" size={18} strokeWidth={2.2} />
            </Press>
          </View>

          {/* Add Product Button */}
          <Press
            accessibilityLabel="Add product"
            onPress={() => open()}
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              backgroundColor: C.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus color="white" size={22} />
          </Press>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 6 }}
        >
          {['All', ...cats].map((c) => (
            <Chip
              key={c}
              active={filter === c}
              label={c === 'All' ? t('all') : c}
              onPress={() => setFilter(c)}
            />
          ))}
        </ScrollView>
      </Rise>

      <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <DateRangeFilterButton
          label={tr('Filter by Expiry', 'ចម្រាញ់តាមថ្ងៃផុតកំណត់')}
          startDate={expiryFrom}
          endDate={expiryTo}
          onApply={(start, end) => {
            setExpiryFrom(start);
            setExpiryTo(end);
          }}
          onClear={() => {
            setExpiryFrom('');
            setExpiryTo('');
          }}
        />
        {(expiryFrom || expiryTo) && (
          <Press
            onPress={() => {
              setExpiryFrom('');
              setExpiryTo('');
            }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.pale, borderRadius: 10 }}
          >
            <Text style={{ color: C.primary, fontSize: 11.5, fontWeight: '700' }}>
              {tr('Reset Expiry', 'សម្អាត')}
            </Text>
          </Press>
        )}
      </View>
      {onlyExpiry && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Press
            onPress={() => setOnlyExpiry(false)}
            style={{
              padding: 14,
              backgroundColor: C.amberPale,
              borderRadius: 14,
              marginVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: '#E8D9A8',
            }}
          >
            <AlertTriangle size={18} color={C.amber} />
            <Text style={{ color: C.amber, fontWeight: '800', flex: 1, fontSize: 13.5 }}>
              Expired / expiring within 7 days ({visible.length})
            </Text>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: 'rgba(217,142,18,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X color={C.amber} size={15} />
            </View>
          </Press>
        </Animated.View>
      )}
      {onlyLow && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ marginTop: 8 }}
        >
          <Btn outline small onPress={() => setOnlyLow(false)}>
            {tr(
              'Showing low stock · Clear filter',
              'កំពុងបង្ហាញស្តុកជិតអស់ · សម្អាតតម្រង'
            )}
          </Btn>
        </Animated.View>
      )}
      <Heading>
        {onlyExpiry
          ? tr('Expired / expiring products', 'ទំនិញផុតកំណត់ / ជិតផុតកំណត់')
          : onlyLow
            ? t('lowStock')
            : t('products')}
      </Heading>

      {visible.length === 0 ? (
        <Empty message={t('empty')} />
      ) : (
        visible.map((p, i) => (
          <Animated.View key={p.id} entering={rise(i)}>
            <SwipeActions
              onEdit={() => open(p)}
              onDelete={() => remove(p)}
              editLabel={tr('Edit', 'កែប្រែ')}
              deleteLabel={tr('Archive', 'លុប')}
            >
              <Press scale={0.985} onPress={() => setDetail(p)}>
                <Card style={{ paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ProductImage
                      id={p.id}
                      name={p.name}
                      uri={p.imageUrl ?? undefined}
                      barcode={p.barcode}
                      allowPreview={true}
                    />
                    <View style={{ flex: 1 }}>
                      {/* Product Name on top, full width */}
                      <Text
                        numberOfLines={1}
                        style={{ fontWeight: '700', color: C.text, fontSize: 15 }}
                      >
                        {p.name}
                      </Text>

                      {/* Stock count moved directly UNDER title to make full space for item name */}
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
                        <Text
                          numberOfLines={1}
                          style={{ color: C.muted, fontSize: 11 }}
                        >
                          {p.category} {p.barcode ? `· ${p.barcode}` : ''}
                        </Text>
                      </View>

                      {/* Pricing row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={{ color: C.primary, fontWeight: '800', fontSize: 13.5 }}>
                          {khr(p.priceUsd * rate)}{' '}
                          <Text style={{ color: C.muted, fontWeight: '500', fontSize: 11 }}>
                            {money(p.priceUsd)}
                          </Text>
                        </Text>
                        {p.wholesalePriceUsd ? (
                          <Text style={{ color: '#0F766E', fontSize: 11, fontWeight: '700' }}>
                            {tr('Wholesale', 'ដុំ')}: {khr(p.wholesalePriceUsd * rate)}
                          </Text>
                        ) : null}
                        {p.expirationDate ? (
                          <Text
                            style={{
                              fontSize: 10,
                              color:
                                new Date(p.expirationDate + 'T23:59:59').getTime() <=
                                Date.now() + 7 * 86400000
                                  ? C.red
                                  : C.muted,
                            }}
                          >
                            {'EXP ' + p.expirationDate}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Card>
              </Press>
            </SwipeActions>
          </Animated.View>
        ))
      )}
      <ErrorLine message={fetchError || error} />

      {/* Product details */}
      <Modal
        visible={!!detail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetail(null)}
      >
        <ScrollView
          style={{ backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 22, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <Text
              style={{
                fontWeight: '800',
                color: C.text,
                fontSize: 24,
                letterSpacing: -0.4,
              }}
            >
              {tr('Product details', 'ព័ត៌មានទំនិញ')}
            </Text>
            {detail && (
              <Press
                accessibilityLabel="Edit product"
                onPress={() => open(detail)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: C.pale,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Pencil size={19} color={C.primary} />
              </Press>
            )}
          </View>
          {detail && (
            <>
              <Rise>
                <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
                  <ProductImage
                    id={detail.id}
                    name={detail.name}
                    size={150}
                    uri={detail.imageUrl ?? undefined}
                    barcode={detail.barcode}
                    allowPreview={true}
                  />
                  <Text
                    style={{
                      fontWeight: '800',
                      color: C.text,
                      fontSize: 21,
                      marginTop: 16,
                      textAlign: 'center',
                    }}
                  >
                    {detail.name}
                  </Text>
                  <Text style={{ color: C.muted, marginVertical: 8 }}>
                    {detail.category} · {detail.stock} {tr('in stock', 'ក្នុងស្តុក')}
                  </Text>
                  <Text
                    style={{ color: C.primary, fontWeight: '800', fontSize: 24 }}
                  >
                    {khr(detail.priceUsd * rate)}
                  </Text>
                  <Text
                    style={{
                      color: C.muted,
                      fontWeight: '600',
                      fontSize: 14,
                      marginTop: 3,
                    }}
                  >
                    {money(detail.priceUsd)}
                  </Text>
                  {detail.wholesalePriceUsd ? (
                    <View
                      style={{
                        marginTop: 12,
                        backgroundColor: C.pale,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '700' }}>
                        {tr('Wholesale', 'លក់ដុំ')} · {tr('min', 'អប្បបរមា')} {detail.wholesaleMinQty ?? 1}
                      </Text>
                      <Text style={{ color: C.primary, fontWeight: '800', fontSize: 17 }}>
                        {khr(detail.wholesalePriceUsd * rate)}{' '}
                        <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12 }}>
                          {money(detail.wholesalePriceUsd)}
                        </Text>
                      </Text>
                    </View>
                  ) : null}
                </Card>
              </Rise>
              <Rise index={1}>
                <BarcodeCard
                  value={
                    detail.barcode ||
                    'RF' + detail.id.replace(/-/g, '').slice(0, 15).toUpperCase()
                  }
                  onGenerate={() =>
                    Alert.alert(
                      'Existing barcode protected',
                      'An existing product barcode cannot be replaced. Create a new product for a new barcode.'
                    )
                  }
                />
              </Rise>
            </>
          )}
          <Btn outline onPress={() => setDetail(null)}>
            {tr('Close', 'បិទ')}
          </Btn>
        </ScrollView>
      </Modal>
      <CameraScanner
        visible={!!scanTarget}
        mode={scanTarget === 'search' ? 'search' : 'add'}
        title={
          scanTarget === 'search'
            ? tr('Scan to find product', 'ស្កេនដើម្បីស្វែងរកទំនិញ')
            : tr('Scan item / bulk restock', 'ស្កេនទំនិញ ឬបូកស្តុកច្រើន')
        }
        count={scanTarget === 'barcode' ? Number(stock) || 0 : 0}
        onClose={closeScanner}
        onCode={(code, qty = 1) => handleBarcodeScan(code, qty)}
      />
    </Screen>
  );
}
