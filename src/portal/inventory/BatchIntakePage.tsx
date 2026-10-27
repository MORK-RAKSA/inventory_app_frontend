import { AppTextInput as TextInput, AppText as Text } from '../../components/AppText';
import { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import {
  ArrowLeft,
  Barcode,
  Boxes,
  Check,
  Layers,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { lookupBarcodeOnline } from '../../barcodeLookup';
import { khr, roundKhr } from '../../theme';
import { Press } from '../../motion';
import { P, shadow } from '../theme';
import type { PortalController } from '../usePortalController';

export function BatchIntakePage({ portal }: { portal: PortalController }) {
  const {
    availableBaseUnits,
    batchRows,
    categories,
    commitBatchAction,
    committingBatch,
    isCompact,
    openCreateUomModal,
    openUomConfigForRow,
    products,
    rate,
    selectedUomConfigId,
    setBatchRows,
    setTab,
    tr,
    uomConfigs,
  } = portal;

  const [scanInput, setScanInput] = useState('');
  const [searchingOnline, setSearchingOnline] = useState(false);

  // Scan or manually submit barcode
  const handleBarcodeSubmit = async (codeToSubmit?: string) => {
    const raw = (codeToSubmit ?? scanInput).trim();
    if (!raw) return;

    setScanInput('');
    const existing = products.find(
      (p) => String(p.barcode || '').toLowerCase() === raw.toLowerCase()
    );

    // If item already in pending list, just increment quantity!
    const existingInBatchIdx = batchRows.findIndex(
      (r) => r.barcode.trim().toLowerCase() === raw.toLowerCase()
    );

    if (existingInBatchIdx !== -1) {
      setBatchRows((prev) =>
        prev.map((r, i) =>
          i === existingInBatchIdx
            ? { ...r, stock: String((parseInt(r.stock, 10) || 0) + 1) }
            : r
        )
      );
      return;
    }

    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      barcode: raw,
      name: existing?.name || '',
      category: existing?.category || categories.find((c) => c !== 'All') || '',
      ccy: 'KHR' as const,
      price: existing ? String(roundKhr(existing.priceUsd * rate)) : '',
      stock: '1',
      uomConfigId: selectedUomConfigId || (uomConfigs[0]?.id || ''),
      wholesalePrice: existing?.wholesalePriceUsd
        ? String(roundKhr(Number(existing.wholesalePriceUsd) * (existing.caseQty || 1) * rate))
        : '',
    };

    setBatchRows((prev) => [newRow, ...prev]);

    // If new item, attempt auto-resolution
    if (!existing) {
      setSearchingOnline(true);
      void lookupBarcodeOnline(raw, { allowFallback: true })
        .then((info) => {
          if (info?.name) {
            setBatchRows((prev) =>
              prev.map((r) =>
                r.id === newRow.id
                  ? {
                      ...r,
                      name: info.name,
                      category: info.category || r.category,
                    }
                  : r
              )
            );
          }
        })
        .finally(() => setSearchingOnline(false));
    }
  };

  const handleAddManualItem = () => {
    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      barcode: '',
      name: '',
      category: categories.find((c) => c !== 'All') || '',
      ccy: 'KHR' as const,
      price: '',
      stock: '1',
      uomConfigId: selectedUomConfigId || (uomConfigs[0]?.id || ''),
      wholesalePrice: '',
    };
    setBatchRows((prev) => [newRow, ...prev]);
  };

  const updateRow = (id: string, patch: Partial<(typeof batchRows)[number]>) => {
    setBatchRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setBatchRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Metrics
  const filledCount = batchRows.filter((r) => r.name.trim() || r.barcode.trim()).length;
  const totalUnits = batchRows.reduce((sum, r) => sum + (parseInt(r.stock, 10) || 0), 0);
  const restockCount = batchRows.filter((r) =>
    products.some((p) => p.barcode && p.barcode.toLowerCase() === r.barcode.trim().toLowerCase())
  ).length;
  const newProductCount = filledCount - restockCount;

  return (
    <View style={{ gap: 20 }}>
      {/* Top Header */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          backgroundColor: P.surface,
          padding: 18,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: P.border,
          ...shadow,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Press
            onPress={() => setTab('inventory')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: P.surfaceAlt,
              borderWidth: 1,
              borderColor: P.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={18} color={P.text} />
          </Press>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Layers size={20} color={P.primary} />
              <Text style={{ color: P.text, fontSize: 18, fontWeight: '800' }}>
                {tr('Batch Intake & Scan Queue', 'នាំចូល និងស្កេនទំនិញជាបាច់')}
              </Text>
              <View
                style={{
                  backgroundColor: P.emeraldLight,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 99,
                }}
              >
                <Text style={{ color: P.emerald, fontSize: 11, fontWeight: '800' }}>
                  {tr('Scanner Ready', 'ម៉ាស៊ីនស្កេនរួចរាល់')}
                </Text>
              </View>
            </View>
            <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
              {tr(
                'Rapidly scan barcodes. Items queue up in the pending list for bulk review and commit.',
                'ស្កេនបាកូដយ៉ាងលឿនរហ័ស។ ទំនិញនឹងត្រូវតម្រៀបក្នុងបញ្ជីរង់ចាំ ដើម្បីត្រួតពិនិត្យ និងបញ្ចូលទៅក្នុងស្តុក។'
              )}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Press
            onPress={() => openCreateUomModal()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: P.primaryLight,
              borderWidth: 1,
              borderColor: P.primary,
            }}
          >
            <SlidersHorizontal size={14} color={P.primary} />
            <Text style={{ color: P.primary, fontSize: 12.5, fontWeight: '800' }}>
              {tr('+ UOM Template', '+ ទម្រង់ UOM')}
            </Text>
          </Press>

          {batchRows.length > 0 && (
            <Press
              onPress={() => setBatchRows([])}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: P.surfaceAlt,
              }}
            >
              <Trash2 size={14} color={P.rose} />
              <Text style={{ color: P.rose, fontSize: 12.5, fontWeight: '700' }}>
                {tr('Clear List', 'លុបទាំងអស់')}
              </Text>
            </Press>
          )}

          <Press
            disabled={committingBatch || filledCount === 0}
            onPress={() => void commitBatchAction()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 22,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: filledCount > 0 ? P.primary : P.muted,
              opacity: filledCount > 0 ? 1 : 0.6,
              ...shadow,
            }}
          >
            {committingBatch ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Check size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {tr(`Commit Batch (${filledCount})`, `រក្សាទុកជាបាច់ (${filledCount})`)}
                </Text>
              </>
            )}
          </Press>
        </View>
      </View>

      {/* Barcode Scanner Input Bar */}
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: P.border,
          flexDirection: isCompact ? 'column' : 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: P.surfaceAlt,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: P.borderStrong,
            paddingHorizontal: 14,
            height: 48,
            gap: 10,
          }}
        >
          <Barcode size={22} color={P.primary} />
          <TextInput
            value={scanInput}
            onChangeText={setScanInput}
            onSubmitEditing={() => void handleBarcodeSubmit()}
            placeholder={tr(
              'Scan barcode with scanner gun or type code & press Enter...',
              'ស្កេនបាកូដដោយម៉ាស៊ីនស្កេន ឬវាយលេខកូដរួចចុច Enter...'
            )}
            placeholderTextColor="#9CA3AF"
            style={{
              flex: 1,
              color: P.text,
              fontSize: 14,
              fontFamily: 'monospace',
              fontWeight: '600',
              height: '100%',
            }}
          />
          {searchingOnline && <ActivityIndicator size="small" color={P.primary} />}
          <Press
            onPress={() => void handleBarcodeSubmit()}
            style={{
              backgroundColor: P.primary,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
              {tr('Scan / Add', 'ស្កេន / បញ្ចូល')}
            </Text>
          </Press>
        </View>

        <Press
          onPress={handleAddManualItem}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: P.surfaceAlt,
            borderWidth: 1,
            borderColor: P.borderStrong,
            paddingHorizontal: 16,
            height: 48,
            borderRadius: 12,
          }}
        >
          <Plus size={16} color={P.text} />
          <Text style={{ color: P.text, fontSize: 13, fontWeight: '700' }}>
            {tr('+ Manual Item', '+ បញ្ចូលដោយដៃ')}
          </Text>
        </Press>
      </View>

      {/* KPI Stats Bar */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: P.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <Text style={{ color: P.muted, fontSize: 11, fontWeight: '700' }}>
            {tr('QUEUED ITEMS', 'ចំនួនមុខទំនិញ')}
          </Text>
          <Text style={{ color: P.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
            {filledCount}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: P.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <Text style={{ color: P.muted, fontSize: 11, fontWeight: '700' }}>
            {tr('TOTAL QUANTITY (UNITS)', 'បរិមាណសរុប (រាយ)')}
          </Text>
          <Text style={{ color: P.emerald, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
            {totalUnits}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: P.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <Text style={{ color: P.muted, fontSize: 11, fontWeight: '700' }}>
            {tr('RESTOCK ITEMS', 'បន្ថែមស្តុកចាស់')}
          </Text>
          <Text style={{ color: P.primary, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
            {restockCount}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: P.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <Text style={{ color: P.muted, fontSize: 11, fontWeight: '700' }}>
            {tr('NEW PRODUCTS', 'ទំនិញថ្មី')}
          </Text>
          <Text style={{ color: '#D97706', fontSize: 20, fontWeight: '800', marginTop: 4 }}>
            {newProductCount}
          </Text>
        </View>
      </View>

      {/* Scanned Items Pending List (Mobile-Style Cards) */}
      <View style={{ gap: 10 }}>
        <Text style={{ color: P.text, fontSize: 15, fontWeight: '800', paddingHorizontal: 2 }}>
          {tr('Pending Scanned Items List', 'បញ្ជីទំនិញដែលបានស្កេនរង់ចាំបញ្ចូល')} ({batchRows.length})
        </Text>

        {batchRows.length === 0 ? (
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: P.border,
              borderStyle: 'dashed',
              paddingVertical: 50,
              paddingHorizontal: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: P.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <ScanLine size={30} color={P.primary} />
            </View>
            <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
              {tr('Pending Scan List is Empty', 'មិនទាន់មានទំនិញក្នុងបញ្ជីរង់ចាំទេ')}
            </Text>
            <Text
              style={{
                color: P.muted,
                fontSize: 13,
                textAlign: 'center',
                maxWidth: 440,
                marginTop: 6,
                lineHeight: 19,
              }}
            >
              {tr(
                'Scan barcodes sequentially with your scanner gun. Items automatically queue here like the mobile scanner pending list.',
                'ស្កេនបាកូដជាបន្តបន្ទាប់ដោយម៉ាស៊ីនស្កេន។ ទំនិញនឹងត្រូវរៀបចំក្នុងបញ្ជីរង់ចាំដូចក្នុងកម្មវិធីទូរស័ព្ទ។'
              )}
            </Text>
            <Press
              onPress={handleAddManualItem}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: P.primary,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
                marginTop: 18,
                ...shadow,
              }}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                {tr('+ Add First Item', '+ បន្ថែមទំនិញដំបូង')}
              </Text>
            </Press>
          </View>
        ) : (
          batchRows.map((row, idx) => {
            const isRestock = products.some(
              (p) =>
                row.barcode.trim() &&
                p.barcode &&
                p.barcode.toLowerCase() === row.barcode.trim().toLowerCase()
            );
            const currentQty = Math.max(0, parseInt(row.stock, 10) || 0);

            return (
              <View
                key={row.id}
                style={{
                  backgroundColor: P.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: P.border,
                  padding: 14,
                  gap: 10,
                  ...shadow,
                }}
              >
                {/* Card Top Row: Index, Status Pill, Barcode, Delete Button */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: P.muted, fontSize: 12, fontWeight: '800', width: 22 }}>
                      #{idx + 1}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: isRestock ? P.emeraldLight : '#FEF3C7',
                      }}
                    >
                      <Text
                        style={{
                          color: isRestock ? P.emerald : '#B45309',
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        {isRestock ? tr('Restock', 'បន្ថែមស្តុក') : tr('New Product', 'ទំនិញថ្មី')}
                      </Text>
                    </View>

                    {row.barcode.trim() ? (
                      <View
                        style={{
                          backgroundColor: P.surfaceAlt,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: P.textSub,
                            fontSize: 12,
                            fontFamily: 'monospace',
                            fontWeight: '700',
                          }}
                        >
                          {row.barcode}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: P.muted, fontSize: 11.5, fontStyle: 'italic' }}>
                        {tr('No barcode', 'គ្មានបាកូដ')}
                      </Text>
                    )}
                  </View>

                  <Press
                    onPress={() => removeRow(row.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: '#FEE2E2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={15} color={P.rose} />
                  </Press>
                </View>

                {/* Card Middle: Product Name & Category */}
                <View
                  style={{
                    flexDirection: isCompact ? 'column' : 'row',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 2, width: '100%' }}>
                    <TextInput
                      value={row.name}
                      onChangeText={(val) => updateRow(row.id, { name: val })}
                      placeholder={tr('Product name (Required)...', 'ឈ្មោះទំនិញ (តម្រូវឱ្យមាន)...')}
                      placeholderTextColor="#9CA3AF"
                      style={{
                        borderWidth: 1,
                        borderColor: P.borderStrong,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        height: 38,
                        fontSize: 13.5,
                        fontWeight: '700',
                        color: P.text,
                        backgroundColor: P.surfaceAlt,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, width: '100%' }}>
                    {Platform.OS === 'web' ? (
                      /* @ts-ignore */
                      <select
                        value={row.category || 'General'}
                        onChange={(e: any) => updateRow(row.id, { category: e.target.value })}
                        style={{
                          height: 38,
                          borderRadius: 8,
                          border: `1px solid ${P.borderStrong}`,
                          backgroundColor: P.surfaceAlt,
                          padding: '0 10px',
                          color: P.text,
                          fontSize: 13,
                          fontWeight: '600',
                          outline: 'none',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        {categories.filter((c) => c !== 'All').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <TextInput
                        value={row.category}
                        onChangeText={(val) => updateRow(row.id, { category: val })}
                        placeholder="Category"
                        placeholderTextColor="#9CA3AF"
                        style={{
                          borderWidth: 1,
                          borderColor: P.borderStrong,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          height: 38,
                          fontSize: 13,
                          color: P.text,
                          backgroundColor: P.surfaceAlt,
                        }}
                      />
                    )}
                  </View>
                </View>

                {/* Card Bottom: Packaging UOM, Pricing, and Quantity Stepper */}
                <View
                  style={{
                    flexDirection: isCompact ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isCompact ? 'flex-start' : 'center',
                    gap: 12,
                    paddingTop: 4,
                  }}
                >
                  {/* Base Unit & UOM Selectors Filtered by Config */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* 1. Base Unit Select Dropdown */}
                    <View style={{ width: 110 }}>
                      <Text style={{ color: P.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                        {tr('BASE UNIT', 'ឯកតារាយ')}
                      </Text>
                      {Platform.OS === 'web' ? (
                        /* @ts-ignore */
                        <select
                          value={
                            row.baseUnit ||
                            uomConfigs.find((u) => u.id === row.uomConfigId)?.baseUnit ||
                            'Can'
                          }
                          onChange={(e: any) => {
                            const newBase = e.target.value;
                            const matching = uomConfigs.find(
                              (u) => u.baseUnit && u.baseUnit.toLowerCase() === newBase.toLowerCase()
                            );
                            updateRow(row.id, {
                              baseUnit: newBase,
                              uomConfigId: matching ? matching.id : row.uomConfigId,
                            });
                          }}
                          style={{
                            height: 34,
                            borderRadius: 6,
                            border: `1px solid ${P.borderStrong}`,
                            backgroundColor: P.surfaceAlt,
                            padding: '0 8px',
                            color: P.text,
                            fontSize: 12,
                            fontWeight: '700',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%',
                          }}
                        >
                          {availableBaseUnits.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </View>

                    {/* 2. Packaging UOM Select Dropdown (Filtered to only UOMs configured with Base Unit!) */}
                    <View style={{ minWidth: 150 }}>
                      <Text style={{ color: P.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                        {tr('PACKAGING UOM', 'ឯកតាដុំធំ')}
                      </Text>
                      {Platform.OS === 'web' ? (
                        /* @ts-ignore */
                        <select
                          value={row.uomConfigId}
                          onChange={(e: any) => updateRow(row.id, { uomConfigId: e.target.value })}
                          style={{
                            height: 34,
                            borderRadius: 6,
                            border: `1.5px solid ${P.primary}`,
                            backgroundColor: P.primaryLight,
                            padding: '0 8px',
                            color: P.primary,
                            fontSize: 12,
                            fontWeight: '800',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%',
                          }}
                        >
                          <option value="">{tr('Select packaging', 'ជ្រើសឯកតាដុំធំ')}</option>
                          {(() => {
                            const currentBase =
                              row.baseUnit ||
                              uomConfigs.find((u) => u.id === row.uomConfigId)?.baseUnit ||
                              'Can';
                            const filtered = uomConfigs.filter(
                              (u) => !u.baseUnit || u.baseUnit.toLowerCase() === currentBase.toLowerCase()
                            );
                            const list = filtered.length > 0 ? filtered : uomConfigs;
                            return list.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} (1 {u.caseUnitName} = {u.caseQty} {u.baseUnit})
                              </option>
                            ));
                          })()}
                        </select>
                      ) : null}
                      <Press onPress={() => openUomConfigForRow(row.id)} style={{ paddingVertical: 6 }}>
                        <Text style={{ color: P.primary, fontSize: 12 }}>{tr('Add packaging', 'បន្ថែមឯកតាដុំធំ')}</Text>
                      </Press>
                    </View>
                  </View>

                  {/* Pricing Inputs & Stepper */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: isCompact ? 'stretch' : 'auto' }}>
                    <View style={{ width: 100 }}>
                      <Text style={{ color: P.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                        {tr('RETAIL (៛)', 'តម្លៃរាយ')}
                      </Text>
                      <TextInput
                        value={row.price}
                        onChangeText={(val) => updateRow(row.id, { price: val })}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        style={{
                          borderWidth: 1,
                          borderColor: P.borderStrong,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          height: 34,
                          fontSize: 13,
                          fontWeight: '700',
                          color: P.text,
                          backgroundColor: P.surfaceAlt,
                        }}
                      />
                    </View>

                    <View style={{ width: 100 }}>
                      <Text style={{ color: P.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                        {tr('CASE (៛)', 'តម្លៃកេស')}
                      </Text>
                      <TextInput
                        value={row.wholesalePrice}
                        onChangeText={(val) => updateRow(row.id, { wholesalePrice: val })}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        style={{
                          borderWidth: 1,
                          borderColor: P.borderStrong,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          height: 34,
                          fontSize: 13,
                          fontWeight: '700',
                          color: P.text,
                          backgroundColor: P.surfaceAlt,
                        }}
                      />
                    </View>

                    {/* Quantity Stepper (like Mobile App!) */}
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: P.muted, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                        {tr('QTY', 'ចំនួន')}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: P.surfaceAlt,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: P.borderStrong,
                          padding: 2,
                        }}
                      >
                        <Press
                          onPress={() =>
                            updateRow(row.id, { stock: String(Math.max(0, currentQty - 1)) })
                          }
                          style={{
                            width: 30,
                            height: 30,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 6,
                          }}
                        >
                          <Minus size={14} color={P.text} />
                        </Press>

                        <TextInput
                          value={row.stock}
                          onChangeText={(val) => updateRow(row.id, { stock: val })}
                          keyboardType="numeric"
                          style={{
                            minWidth: 36,
                            textAlign: 'center',
                            fontSize: 13,
                            fontWeight: '800',
                            color: P.text,
                            paddingHorizontal: 4,
                          }}
                        />

                        <Press
                          onPress={() => updateRow(row.id, { stock: String(currentQty + 1) })}
                          style={{
                            width: 30,
                            height: 30,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 6,
                          }}
                        >
                          <Plus size={14} color={P.primary} />
                        </Press>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Bottom Save / Commit Bar */}
      {batchRows.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 14,
            borderTopWidth: 1,
            borderColor: P.border,
          }}
        >
          <Press
            onPress={() => setTab('inventory')}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: P.surfaceAlt,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <Text style={{ color: P.textSub, fontSize: 13, fontWeight: '700' }}>
              {tr('Back to Inventory', 'ត្រឡប់ទៅតារាងស្តុក')}
            </Text>
          </Press>

          <Press
            disabled={committingBatch || filledCount === 0}
            onPress={() => void commitBatchAction()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: filledCount > 0 ? P.primary : P.muted,
              opacity: filledCount > 0 ? 1 : 0.6,
              ...shadow,
            }}
          >
            {committingBatch ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  {tr(
                    `Commit Batch to Inventory (${filledCount} Items, ${totalUnits} Units)`,
                    `រក្សាទុកទំនិញក្នុងស្តុក (${filledCount} មុខ, ${totalUnits} រាយ)`
                  )}
                </Text>
              </>
            )}
          </Press>
        </View>
      )}
    </View>
  );
}
