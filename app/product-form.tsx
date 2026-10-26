import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  Text,
  View,
  Alert,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Barcode,
  Camera,
  Check,
  ChevronRight,
  DollarSign,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Package,
  Layers,
  ScanLine,
  Sparkles,
  Trash2,
  Warehouse,
  Boxes,
  Calendar,
} from 'lucide-react-native';
import { api, ApiError, Product, Settings, UomConfig } from '../src/api';
import { useLiveData } from '../src/hooks/useLiveData';
import { useLanguage } from '../src/i18n';
import { useToast } from '../src/toast';
import { C, R, shadow } from '../src/theme';
import { Press, Rise } from '../src/motion';
import { Btn, Card, Field, khr, money, roundKhr } from '../src/ui';
import { CategorySelect } from '../src/components/CategorySelect';
import { CameraScanner, ScanResult } from '../src/components/CameraScanner';
import {
  lookupBarcodeOnline,
  buildSmartBarcodeName,
  rememberBarcodeInfo,
} from '../src/barcodeLookup';
import { ProductImage, storeProductImage } from '../src/components/ProductImage';
import { CalendarPickerModal } from '../src/components/CalendarPickerModal';
import { canonicalBarcode, sameBarcode } from '../src/barcode';

export default function ProductFormScreen() {
  const router = useRouter();
  const { tr, t } = useLanguage();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string; barcode?: string }>();
  const isEditing = Boolean(params.id);

  const { products, rate, refresh } = useLiveData('products');

  const [configuredBaseUnits, setConfiguredBaseUnits] = useState<string[]>([]);
  const [configuredCategories, setConfiguredCategories] = useState<string[]>([]);

  useEffect(() => {
    // Load from DB first
    void api<Settings>('/settings')
      .then((cfg) => {
        if (Array.isArray(cfg?.baseUnits)) {
          setConfiguredBaseUnits(cfg.baseUnits);
          void AsyncStorage.setItem('retailflow_configured_base_units', JSON.stringify(cfg.baseUnits));
        }
        if (Array.isArray(cfg?.categories)) {
          setConfiguredCategories(cfg.categories);
          void AsyncStorage.setItem('retailflow_configured_categories', JSON.stringify(cfg.categories));
        }
      })
      .catch(() => {
        // Fallback to offline cache
        Promise.all([
          AsyncStorage.getItem('retailflow_configured_base_units'),
          AsyncStorage.getItem('retailflow_configured_categories'),
        ]).then(([savedUnits, savedCats]) => {
          if (savedUnits) {
            try {
              const parsed = JSON.parse(savedUnits);
              if (Array.isArray(parsed)) setConfiguredBaseUnits(parsed);
            } catch (_) {}
          }
          if (savedCats) {
            try {
              const parsed = JSON.parse(savedCats);
              if (Array.isArray(parsed)) setConfiguredCategories(parsed);
            } catch (_) {}
          }
        });
      });
  }, []);

  const categories = useMemo(() => {
    if (configuredCategories && configuredCategories.length > 0) {
      return configuredCategories;
    }
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [configuredCategories, products]);

  // Form State
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(params.barcode || '');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState<'KHR' | 'USD'>('KHR');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [threshold, setThreshold] = useState('5');
  const [expiry, setExpiry] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  // Wholesale Enterprise State
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [wholesaleCurrency, setWholesaleCurrency] = useState<'KHR' | 'USD'>('KHR');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('1');
  const [baseUnit, setBaseUnit] = useState('');
  const [caseUnitName, setCaseUnitName] = useState('');
  const [caseQty, setCaseQty] = useState('24');
  const [uomTemplates, setUomTemplates] = useState<UomConfig[]>([]);

  const availableBaseUnits = useMemo(() => {
    if (configuredBaseUnits && configuredBaseUnits.length > 0) {
      return configuredBaseUnits;
    }
    const set = new Set<string>();
    uomTemplates.forEach((u) => {
      if (u.baseUnit?.trim()) set.add(u.baseUnit.trim());
    });
    return Array.from(set);
  }, [configuredBaseUnits, uomTemplates]);

  useEffect(() => {
    void api<UomConfig[]>('/uom')
      .then((list) => {
        if (Array.isArray(list)) setUomTemplates(list);
      })
      .catch(() => {});
  }, []);

  const switchRetailCurrency = (target: 'KHR' | 'USD') => {
    if (target === currency) return;
    setCurrency(target);
    const raw = Number(price);
    if (!Number.isFinite(raw) || raw <= 0) return;
    if (target === 'KHR') {
      setPrice(String(roundKhr(raw * rate)));
    } else {
      setPrice(String(Number((raw / rate).toFixed(2))));
    }
  };

  const switchWholesaleCurrency = (target: 'KHR' | 'USD') => {
    if (target === wholesaleCurrency) return;
    setWholesaleCurrency(target);
    const raw = Number(wholesalePrice);
    if (!Number.isFinite(raw) || raw <= 0) return;
    if (target === 'KHR') {
      setWholesalePrice(String(roundKhr(raw * rate)));
    } else {
      setWholesalePrice(String(Number((raw / rate).toFixed(2))));
    }
  };

  // UI state
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const autoFilledNameRef = useRef<string | null>(null);

  // Populate data when editing
  useEffect(() => {
    if (params.id && products.length > 0) {
      const existing = products.find((p) => p.id === params.id);
      if (existing) {
        setName(existing.name);
        setBarcode(existing.barcode || '');
        setCategory(existing.category || 'General');
        setStock(String(existing.stock ?? 0));
        setThreshold(String(existing.lowStockThreshold ?? 5));
        setExpiry(existing.expirationDate || '');
        setPhoto(existing.imageUrl || null);

        const hasWholesale = Boolean(
          existing.wholesalePriceUsd && existing.wholesalePriceUsd > 0
        );
        setWholesaleEnabled(hasWholesale);
        setBaseUnit(existing.baseUnit || 'Piece');
        setCaseUnitName(existing.caseUnitName || 'Case');
        setCaseQty(String(existing.caseQty || 24));
        setWholesaleMinQty(String(existing.wholesaleMinQty || 1));

        if (existing.originalCcy === 'USD') {
          setCurrency('USD');
          setPrice(String(existing.originalPrice ?? existing.priceUsd));
          if (hasWholesale) {
            setWholesaleCurrency('USD');
            setWholesalePrice(String(existing.wholesalePriceUsd));
          }
        } else {
          setCurrency('KHR');
          const khrVal =
            existing.originalCcy === 'KHR' && existing.originalPrice
              ? existing.originalPrice
              : roundKhr(existing.priceUsd * rate);
          setPrice(String(khrVal));
          if (hasWholesale) {
            setWholesaleCurrency('KHR');
            const whKhr = roundKhr((existing.wholesalePriceUsd || 0) * rate);
            setWholesalePrice(String(whKhr));
          }
        }
      }
    }
  }, [params.id, products, rate]);

  // Handle Barcode Scanned
  const handleBarcodeScanned = (code: string): ScanResult => {
    const clean = canonicalBarcode(code);
    setBarcode(clean);
    setCameraActive(false);

    // Check if another product already uses this code
    const dup = products.find(
      (p) => p.id !== params.id && sameBarcode(p.barcode, clean)
    );
    if (dup) {
      toast.show(
        tr(
          `Notice: Barcode already assigned to "${dup.name}"`,
          `សម្គាល់៖ បាកូដនេះមានរួចហើយលើ "${dup.name}"`
        ),
        { tone: 'info', duration: 4000 }
      );
    } else {
      void triggerOnlineLookup(clean);
    }

    return { ok: true, message: `Scanned: ${clean}` };
  };

  // Online Barcode Autofill
  const triggerOnlineLookup = async (code: string) => {
    if (!code || lookingUp) return;
    setLookingUp(true);
    try {
      const info = await lookupBarcodeOnline(code);
      if (info && info.name) {
        setName(info.name);
        autoFilledNameRef.current = info.name;
        if (info.category) setCategory(info.category);
        if (info.imageUrl && !photo) setPhoto(info.imageUrl);
        rememberBarcodeInfo(code, info);
        toast.show(
          tr(`Found product: ${info.name}`, `រកឃើញព័ត៌មានទំនិញ៖ ${info.name}`),
          { tone: 'success', duration: 3500 }
        );
      } else {
        const smart = buildSmartBarcodeName(code);
        if (smart.name && !name) {
          setName(smart.name);
          autoFilledNameRef.current = smart.name;
        }
      }
    } catch {
      // quiet fallback
    } finally {
      setLookingUp(false);
    }
  };

  // Image Selection
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setPhoto(res.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        tr('Permission Required', 'ត្រូវការការអនុញ្ញាត'),
        tr('Camera permission is needed to take a product photo.', 'សូមផ្តល់ការអនុញ្ញាតប្រើកាមេរ៉ា។')
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setPhoto(res.assets[0].uri);
    }
  };

  // Save product
  const handleSave = async () => {
    if (!name.trim()) {
      toast.show(tr('Please enter product name', 'សូមបញ្ចូលឈ្មោះទំនិញ'), {
        tone: 'error',
      });
      return;
    }
    const rawPrice = Number(price);
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
      toast.show(tr('Please enter a valid price', 'សូមបញ្ចូលតម្លៃត្រឹមត្រូវ'), {
        tone: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const priceUsd =
        currency === 'KHR'
          ? Number((roundKhr(rawPrice) / rate).toFixed(4))
          : Number(rawPrice.toFixed(4));

      let wholesaleUsdVal: number | null = null;
      if (wholesaleEnabled && wholesalePrice) {
        const rawWh = Number(wholesalePrice);
        if (rawWh > 0) {
          wholesaleUsdVal =
            wholesaleCurrency === 'KHR'
              ? Number((roundKhr(rawWh) / rate).toFixed(4))
              : Number(rawWh.toFixed(4));
        }
      }

      const caseQuantity = Math.max(1, parseInt(caseQty, 10) || 1);
      const wholesalePricePerCase =
        wholesaleUsdVal !== null ? wholesaleUsdVal * caseQuantity : null;

      const payload = {
        name: name.trim(),
        barcode: barcode.trim() || null,
        category: category.trim() || 'General',
        price: currency === 'KHR' ? roundKhr(rawPrice) : rawPrice,
        currency,
        priceCurrency: currency,
        priceUsd,
        originalCcy: currency,
        originalPrice: currency === 'KHR' ? roundKhr(rawPrice) : rawPrice,
        stock: Math.max(0, parseInt(stock, 10) || 0),
        lowStockThreshold: Math.max(0, parseInt(threshold, 10) || 5),
        expirationDate: expiry || null,
        imageUrl: photo || null,
        wholesalePrice:
          wholesaleUsdVal !== null
            ? (currency === 'KHR'
                ? roundKhr(wholesaleUsdVal * rate)
                : Number(wholesaleUsdVal.toFixed(2)))
            : null,
        wholesalePriceUsd: wholesaleUsdVal,
        wholesaleMinQty: Math.max(1, parseInt(wholesaleMinQty, 10) || 1),
        baseUnit: baseUnit.trim() || 'Piece',
        caseUnitName: caseUnitName.trim() || 'Case',
        caseQty: caseQuantity,
        wholesalePricePerCase:
          wholesalePricePerCase !== null
            ? (currency === 'KHR'
                ? roundKhr(wholesalePricePerCase * rate)
                : Number(wholesalePricePerCase.toFixed(2)))
            : null,
        wholesalePricePerCaseUsd: wholesalePricePerCase,
      };

      let savedProduct: Product;
      if (isEditing && params.id) {
        savedProduct = await api<Product>(`/products/${params.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        savedProduct = await api<Product>('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (photo && savedProduct.id) {
        await storeProductImage(savedProduct.id, photo);
      }

      refresh();
      toast.show(
        isEditing
          ? tr('Product updated successfully', 'បានកែប្រែទំនិញជោគជ័យ')
          : tr('New product created successfully', 'បានបង្កើតទំនិញថ្មីជោគជ័យ'),
        { tone: 'success', duration: 3500 }
      );

      router.back();
    } catch (e: any) {
      toast.show(
        e?.message || tr('Failed to save product', 'មិនអាចរក្សាទុកទំនិញបានទេ'),
        { tone: 'error', duration: 4000 }
      );
    } finally {
      setSaving(false);
    }
  };

  // Computed case price preview
  const casePreview = useMemo(() => {
    const rawWh = Number(wholesalePrice) || 0;
    const cQty = parseInt(caseQty, 10) || 1;
    if (rawWh <= 0) return null;
    const totalCase = rawWh * cQty;
    return wholesaleCurrency === 'KHR'
      ? khr(roundKhr(totalCase))
      : money(totalCase);
  }, [wholesalePrice, caseQty, wholesaleCurrency]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <Press onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={C.text} />
        </Press>
        <Text style={styles.headerTitle}>
          {isEditing ? tr('Edit', 'កែប្រែ') : tr('Create', 'បង្កើត')}
        </Text>
        <Press
          onPress={() => void handleSave()}
          disabled={saving}
          style={styles.headerSaveBtn}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.headerSaveText}>
              {isEditing ? tr('Save', 'រក្សាទុក') : tr('Create', 'បង្កើត')}
            </Text>
          )}
        </Press>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Light Product Image Card with Generous Gap */}
        <Rise index={0}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>
              {tr('Product Photo', 'រូបភាពទំនិញ')}
            </Text>

            <View style={styles.imageRow}>
              {/* Image Preview Box with Tap Preview */}
              <View style={styles.imageBox}>
                {photo ? (
                  <ProductImage
                    id={params.id || 'preview'}
                    name={name || 'Product'}
                    uri={photo}
                    size={96}
                    allowPreview
                  />
                ) : (
                  <View style={styles.noImageBox}>
                    <ImageIcon size={32} color={C.muted} />
                    <Text style={styles.noImageText}>{tr('No image', 'គ្មានរូបភាព')}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons with clean gaps */}
              <View style={styles.imageActions}>
                <Press onPress={pickImage} style={styles.imageActionBtn}>
                  <ImagePlus size={16} color={C.primary} />
                  <Text style={styles.imageActionText}>
                    {photo ? tr('Change Photo', 'ប្តូររូបភាព') : tr('Choose Gallery', 'ជ្រើសពីវិចិត្រសាល')}
                  </Text>
                </Press>

                <Press onPress={takePhoto} style={styles.imageActionBtn}>
                  <Camera size={16} color={C.primary} />
                  <Text style={styles.imageActionText}>
                    {tr('Take Photo', 'ថតរូបថ្មី')}
                  </Text>
                </Press>

                {photo && (
                  <Press
                    onPress={() => setPhoto(null)}
                    style={[styles.imageActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                  >
                    <Trash2 size={15} color="#DC2626" />
                    <Text style={[styles.imageActionText, { color: '#DC2626' }]}>
                      {tr('Remove Photo', 'លុបរូបភាព')}
                    </Text>
                  </Press>
                )}
              </View>
            </View>
          </View>
        </Rise>

        {/* 2. Barcode & Identification Card */}
        <Rise index={1}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>
              {tr('Barcode & Name', 'បាកូដ និងឈ្មោះទំនិញ')}
            </Text>

            {/* Barcode input with Camera Scanner & Lookup button */}
            <View style={{ marginBottom: 12 }}>
              <Field
                label={tr('Barcode / SKU', 'បាកូដទំនិញ')}
                value={barcode}
                onChangeText={(v) => setBarcode(canonicalBarcode(v))}
                placeholder={tr('Scan or enter barcode…', 'ស្កេន ឬបញ្ចូលលេខកូដ…')}
                icon={Barcode}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {barcode ? (
                      <Press
                        onPress={() => void triggerOnlineLookup(barcode)}
                        style={styles.fieldRightBtn}
                        accessibilityLabel="Lookup barcode info online"
                      >
                        {lookingUp ? (
                          <ActivityIndicator size="small" color={C.primary} />
                        ) : (
                          <Sparkles size={16} color={C.primary} />
                        )}
                      </Press>
                    ) : null}
                    <Press
                      onPress={() => setCameraActive(true)}
                      style={[styles.fieldRightBtn, { backgroundColor: C.primary }]}
                      accessibilityLabel="Open Camera Barcode Scanner"
                    >
                      <ScanLine size={16} color="#FFFFFF" />
                    </Press>
                  </View>
                }
              />
            </View>

            {/* Product Name */}
            <View style={{ marginBottom: 12 }}>
              <Field
                label={tr('Product Name *', 'ឈ្មោះទំនិញ *')}
                value={name}
                onChangeText={setName}
                placeholder={tr('e.g. Coca-Cola 330ml', 'ឧ. ទឹកក្រូច កូកា ៣៣០មល')}
              />
            </View>

            {/* Category */}
            <View>
              <Text style={styles.fieldLabel}>
                {tr('Category', 'ប្រភេទមុខទំនិញ')}
              </Text>
              <CategorySelect value={category} categories={categories} onChange={setCategory} />
            </View>
          </View>
        </Rise>

        {/* 3. Pricing & Currency Card */}
        <Rise index={2}>
          <View style={styles.sectionCard}>
            <View style={styles.headingWithToggle}>
              <Text style={styles.sectionHeading}>
                {tr('Retail Price', 'តម្លៃលក់រាយ')}
              </Text>
              {/* Currency Selector */}
              <View style={styles.currencyToggleWrap}>
                <Press
                  onPress={() => switchRetailCurrency('KHR')}
                  style={[
                    styles.currencyPill,
                    currency === 'KHR' && styles.currencyPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyPillText,
                      currency === 'KHR' && styles.currencyPillTextActive,
                    ]}
                  >
                    ៛ KHR
                  </Text>
                </Press>
                <Press
                  onPress={() => switchRetailCurrency('USD')}
                  style={[
                    styles.currencyPill,
                    currency === 'USD' && styles.currencyPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyPillText,
                      currency === 'USD' && styles.currencyPillTextActive,
                    ]}
                  >
                    $ USD
                  </Text>
                </Press>
              </View>
            </View>

            <Field
              label={
                currency === 'KHR'
                  ? tr('Retail Price (៛ Riel)', 'តម្លៃលក់រាយ (រៀល)')
                  : tr('Retail Price ($ USD)', 'តម្លៃលក់រាយ (ដុល្លារ)')
              }
              value={price}
              onChangeText={setPrice}
              placeholder={currency === 'KHR' ? '2500' : '0.75'}
              keyboardType="decimal-pad"
              prefix={currency === 'KHR' ? '៛' : '$'}
            />

            {price && Number(price) > 0 ? (
              <View style={styles.convertedHint}>
                <Info size={14} color="#64748B" />
                <Text style={styles.convertedHintText}>
                  {currency === 'KHR'
                    ? `≈ ${money(roundKhr(Number(price)) / rate)} USD (Rate: 1$ = ${rate}៛)`
                    : `≈ ${khr(roundKhr(Number(price) * rate))} (Rate: 1$ = ${rate}៛)`}
                </Text>
              </View>
            ) : null}
          </View>
        </Rise>

        {/* 4. Wholesale Pricing & Packaging Configuration */}
        <Rise index={3}>
          <View style={styles.sectionCard}>
            <View style={styles.headingWithToggle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Warehouse size={18} color="#0D9488" />
                <Text style={styles.sectionHeading}>
                  {tr('Wholesale', 'លក់ដុំ')}
                </Text>
              </View>
              {/* Wholesale Checkbox */}
              <Press
                onPress={() => setWholesaleEnabled(!wholesaleEnabled)}
                style={styles.checkboxRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: wholesaleEnabled }}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    wholesaleEnabled && styles.checkboxBoxActive,
                  ]}
                >
                  {wholesaleEnabled && (
                    <Check size={13} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
                <Text
                  style={[
                    styles.checkboxLabel,
                    wholesaleEnabled && styles.checkboxLabelActive,
                  ]}
                >
                  {tr('Wholesale', 'លក់ដុំ')}
                </Text>
              </Press>
            </View>

            {wholesaleEnabled ? (
              <View style={{ marginTop: 10 }}>
                {/* Wholesale Unit Price with Switchable Currency */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                    {wholesaleCurrency === 'KHR'
                      ? tr('Wholesale Unit Price (៛ Riel)', 'តម្លៃលក់ដុំក្នុងមួយឯកតា (រៀល)')
                      : tr('Wholesale Unit Price ($ USD)', 'តម្លៃលក់ដុំក្នុងមួយឯកតា (ដុល្លារ)')}
                  </Text>
                  {/* Switchable Wholesale Currency Toggle */}
                  <View style={styles.currencyToggleWrap}>
                    <Press
                      onPress={() => switchWholesaleCurrency('KHR')}
                      style={[
                        styles.currencyPill,
                        wholesaleCurrency === 'KHR' && styles.currencyPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.currencyPillText,
                          wholesaleCurrency === 'KHR' && styles.currencyPillTextActive,
                        ]}
                      >
                        ៛ KHR
                      </Text>
                    </Press>
                    <Press
                      onPress={() => switchWholesaleCurrency('USD')}
                      style={[
                        styles.currencyPill,
                        wholesaleCurrency === 'USD' && styles.currencyPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.currencyPillText,
                          wholesaleCurrency === 'USD' && styles.currencyPillTextActive,
                        ]}
                      >
                        $ USD
                      </Text>
                    </Press>
                  </View>
                </View>

                <Field
                  value={wholesalePrice}
                  onChangeText={setWholesalePrice}
                  placeholder={
                    wholesaleCurrency === 'KHR'
                      ? tr('e.g. 2000', 'ឧ. ២០០០')
                      : tr('e.g. 0.50', 'ឧ. ០.៥០')
                  }
                  keyboardType="decimal-pad"
                  prefix={wholesaleCurrency === 'KHR' ? '៛' : '$'}
                />

                {/* Mobile View: Select Wholesale Packaging UOM Template */}
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  {tr('Packaging UOM Template', 'ជ្រើសរើសទម្រង់ UOM')}
                </Text>
                <View style={styles.packagingPresetsRow}>
                  {uomTemplates.map((p) => {
                    const isSelected =
                      caseUnitName.toLowerCase() === p.caseUnitName.toLowerCase() &&
                      caseQty === String(p.caseQty);
                    return (
                      <Press
                        key={p.id}
                        onPress={() => {
                          setCaseUnitName(p.caseUnitName);
                          setCaseQty(String(p.caseQty));
                          setBaseUnit(p.baseUnit);
                          setWholesaleMinQty('1');
                        }}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </Press>
                    );
                  })}
                </View>

                {/* Base Unit Selector from Portal Config */}
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  {tr('Base Unit (Single Unit - Configured in Portal)', 'ឯកតារាយ (កំណត់ក្នុង Portal)')}
                </Text>
                {Platform.OS === 'web' ? (
                  /* @ts-ignore */
                  <select
                    value={baseUnit}
                    onChange={(e: any) => setBaseUnit(e.target.value)}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      border: `1.5px solid ${C.border}`,
                      backgroundColor: '#FFFFFF',
                      padding: '0 14px',
                      color: C.text,
                      fontSize: 14,
                      fontWeight: '700',
                      outline: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      marginBottom: 10,
                    }}
                  >
                    {availableBaseUnits.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                ) : (
                  <View style={styles.packagingPresetsRow}>
                    {availableBaseUnits.map((b) => {
                      const isSelected = baseUnit.toLowerCase() === b.toLowerCase();
                      return (
                        <Press
                          key={b}
                          onPress={() => setBaseUnit(b)}
                          style={[
                            styles.presetChip,
                            isSelected && styles.presetChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isSelected && styles.presetChipTextActive,
                            ]}
                          >
                            {b}
                          </Text>
                        </Press>
                      );
                    })}
                  </View>
                )}

                {/* Wholesale Case Price Summary Banner */}
                {casePreview ? (
                  <View style={styles.wholesaleSummaryCard}>
                    <Boxes size={18} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wholesaleSummaryTitle}>
                        {tr('Calculated Case Price', 'តម្លៃសរុប ១ កេស')}
                      </Text>
                      <Text style={styles.wholesaleSummaryValue}>
                        1 {caseUnitName} ({caseQty} {baseUnit}s) = {casePreview}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.portalUomNotice}>
                  <Text style={styles.portalUomNoticeText}>
                    {tr(
                      'Tip: To configure custom manual enterprise UOM formulas, use the Web Portal.',
                      'ព័ត៌មាន៖ សម្រាប់កំណត់ឯកតា និងរូបមន្តដុំតាមបំណង សូមចូលទៅកាន់ Web Portal។'
                    )}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.disabledWholesaleHint}>
                {tr(
                  'Enable wholesale to configure flexible unit packaging (e.g. Case of 24, Case of 12, or Box of 1) with wholesale pricing.',
                  'បើកដំណើរការលក់ដុំ ដើម្បីកំណត់កញ្ចប់ទំនិញ (ឧ. កេស ២៤, កេស ១២ ឬ ប្រអប់ ១) ជាមួយតម្លៃលក់ដុំ។'
                )}
              </Text>
            )}
          </View>
        </Rise>

        {/* 5. Inventory Stock & Expiration Date */}
        <Rise index={4}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>
              {tr('Stock & Expiry', 'ស្តុក និងកាលបរិច្ឆេទផុតកំណត់')}
            </Text>

            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                <Field
                  label={tr('Stock Qty', 'ចំនួនក្នុងស្តុក')}
                  value={stock}
                  onChangeText={setStock}
                  placeholder="10"
                  keyboardType="number-pad"
                  icon={Package}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={tr('Low Stock Alert', 'ផ្តល់ដំណឹងពេលសល់')}
                  value={threshold}
                  onChangeText={setThreshold}
                  placeholder="5"
                  keyboardType="number-pad"
                  icon={Layers}
                />
              </View>
            </View>

            {/* Single Component Expiry Calendar Picker Trigger */}
            <View style={{ marginTop: 6 }}>
              <Text style={styles.fieldLabel}>
                {tr('Expiration Date', 'កាលបរិច្ឆេទផុតកំណត់')}
              </Text>
              <Press
                onPress={() => setDatePickerOpen(true)}
                style={styles.calendarTriggerBtn}
              >
                <Calendar size={18} color={expiry ? C.primary : C.muted} />
                <Text
                  style={[
                    styles.calendarTriggerText,
                    expiry ? { color: C.text, fontWeight: '700' } : null,
                  ]}
                >
                  {expiry || tr('Select expiration date…', 'ជ្រើសរើសថ្ងៃផុតកំណត់…')}
                </Text>
                {expiry ? (
                  <Press
                    onPress={() => setExpiry('')}
                    style={styles.clearDateBtn}
                  >
                    <Text style={{ color: C.primary, fontWeight: '800', fontSize: 12 }}>
                      {tr('Clear', 'លុប')}
                    </Text>
                  </Press>
                ) : null}
              </Press>
            </View>
          </View>
        </Rise>

        {/* Bottom Save Action Button */}
        <View style={styles.bottomBar}>
          <Btn
            onPress={() => void handleSave()}
            loading={saving}
            style={styles.mainSaveBtn}
          >
            {saving
              ? (isEditing ? tr('Saving…', 'កំពុងរក្សាទុក…') : tr('Creating…', 'កំពុងបង្កើត…'))
              : isEditing
              ? tr('Save', 'រក្សាទុក')
              : tr('Create', 'បង្កើត')}
          </Btn>
        </View>
      </ScrollView>

      {/* Barcode Camera Scanner Modal */}
      <CameraScanner
        visible={cameraActive}
        mode="add"
        title={tr('Scan Product Barcode', 'ស្កេនបាកូដទំនិញ')}
        onClose={() => setCameraActive(false)}
        onCode={handleBarcodeScanned}
      />

      {/* Single Calendar Picker Modal matching media_1792852280711_587004c7.png */}
      <CalendarPickerModal
        visible={datePickerOpen}
        startDate={expiry}
        allowRange={false}
        title={tr('Select Expiration Date', 'ជ្រើសរើសថ្ងៃផុតកំណត់')}
        onApply={(selected) => {
          setExpiry(selected);
          setDatePickerOpen(false);
        }}
        onClose={() => setDatePickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Simple, clean light background
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSaveBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  headerSaveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Light, simple clean cards (no more dark #1E1B4B!)
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.sm,
  },
  sectionHeading: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  headingWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // Image section with generous gap
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  imageBox: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  noImageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noImageText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  imageActions: {
    flex: 1,
    gap: 8,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  imageActionText: {
    color: C.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Fields and tools
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  fieldRightBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Currency switcher
  currencyToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
  },
  currencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  currencyPillActive: {
    backgroundColor: C.primary,
  },
  currencyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  currencyPillTextActive: {
    color: '#FFFFFF',
  },
  convertedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  convertedHintText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Wholesale styles
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },
  checkboxLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  checkboxLabelActive: {
    color: C.primary,
    fontWeight: '800',
  },
  toggleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  toggleBadgeActive: {
    backgroundColor: C.paleStrong,
  },
  toggleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  toggleBadgeTextActive: {
    color: C.primary,
  },
  disabledWholesaleHint: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  packagingPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  wholesaleSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.pale,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  wholesaleSummaryTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: C.primary,
  },
  wholesaleSummaryValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.primaryDark,
    marginTop: 2,
  },
  portalUomNotice: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  portalUomNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
  },

  // Single Calendar Trigger
  calendarTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },
  calendarTriggerText: {
    flex: 1,
    fontSize: 13.5,
    color: C.muted,
  },
  clearDateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.pale,
    borderRadius: 8,
  },

  // Bottom action
  bottomBar: {
    marginTop: 10,
    marginBottom: 20,
  },
  mainSaveBtn: {
    height: 52,
    borderRadius: 16,
  },
});
