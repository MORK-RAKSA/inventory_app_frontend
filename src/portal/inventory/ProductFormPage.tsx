import { AppTextInput as TextInput, AppText as Text } from '../../components/AppText';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import {
  ArrowLeft,
  Barcode,
  Boxes,
  Check,
  DollarSign,
  ImageIcon,
  ImagePlus,
  Package,
  Plus,
  Save,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  Warehouse,
  X,
} from 'lucide-react-native';
import { khr, money, roundKhr } from '../../theme';
import { Press } from '../../motion';
import { P, shadow } from '../theme';
import type { PortalController } from '../usePortalController';

export function ProductFormPage({ portal }: { portal: PortalController }) {
  const {
    availableBaseUnits,
    categories,
    editingProduct,
    formBarcode,
    formBaseUnit,
    formCaseQty,
    formCaseUnitName,
    formCategory,
    formCcy,
    formExpiry,
    formLowThreshold,
    formName,
    formPrice,
    formStock,
    formWholesaleCcy,
    formWholesaleEnabled,
    formWholesaleMinQty,
    formWholesalePrice,
    formImageUrl,
    setFormImageUrl,
    isCompact,
    rate,
    saveProductForm,
    savingProduct,
    selectedUomConfigId,
    setFormBarcode,
    setFormBaseUnit,
    setFormCaseQty,
    setFormCaseUnitName,
    setFormCategory,
    setFormCcy,
    setFormExpiry,
    setFormLowThreshold,
    setFormName,
    setFormPrice,
    setFormStock,
    setFormWholesaleCcy,
    setFormWholesaleEnabled,
    setFormWholesaleMinQty,
    setFormWholesalePrice,
    setSelectedUomConfigId,
    setTab,
    tr,
    uomConfigs,
  } = portal;

  const [newBaseUnitInput, setNewBaseUnitInput] = useState('');
  const [showAddBaseUnit, setShowAddBaseUnit] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const fileInputRef = useRef<any>(null);

  const handleUploadImageWeb = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) setFormImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Computed case price calculation
  const computedWholesaleCasePrice = (() => {
    if (!formWholesaleEnabled || !formWholesalePrice) return null;
    const raw = Number(formWholesalePrice);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    const cQty = Math.max(1, parseInt(formCaseQty, 10) || 24);
    const caseTotal = raw * cQty;
    return formWholesaleCcy === 'KHR'
      ? `${roundKhr(caseTotal).toLocaleString()} ៛`
      : `$${caseTotal.toFixed(2)}`;
  })();

  const handleAddNewBaseUnit = () => {
    const trimmed = newBaseUnitInput.trim();
    if (!trimmed) return;
    setFormBaseUnit(trimmed);
    setNewBaseUnitInput('');
    setShowAddBaseUnit(false);
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    setFormCategory(trimmed);
    setCustomCategoryInput('');
    setShowAddCategory(false);
  };

  const handleSelectUomConfig = (configId: string) => {
    setSelectedUomConfigId(configId);
    const cfg = uomConfigs.find((u) => u.id === configId);
    if (cfg) {
      setFormBaseUnit(cfg.baseUnit);
      setFormCaseUnitName(cfg.caseUnitName);
      setFormCaseQty(String(cfg.caseQty));
    }
  };

  return (
    <View style={{ gap: 20 }}>
      {/* Top Navigation & Action Header */}
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
              <Package size={20} color={P.primary} />
              <Text style={{ color: P.text, fontSize: 18, fontWeight: '800' }}>
                {editingProduct
                  ? tr('Edit Product', 'កែប្រែទំនិញ')
                  : tr('Create New Product', 'បង្កើតទំនិញថ្មី')}
              </Text>
            </View>
            <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>
              {editingProduct
                ? tr(`Editing: ${editingProduct.name}`, `កំពុងកែប្រែ៖ ${editingProduct.name}`)
                : tr('Register item with barcode, pricing, base unit, and wholesale UOM.', 'ចុះឈ្មោះទំនិញជាមួយបាកូដ តម្លៃ ឯកតាមូលដ្ឋាន និងការកំណត់លក់ដុំ។')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Press
            onPress={() => setTab('inventory')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: P.surfaceAlt,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <Text style={{ color: P.textSub, fontSize: 13, fontWeight: '700' }}>
              {tr('Cancel', 'បោះបង់')}
            </Text>
          </Press>

          <Press
            disabled={savingProduct}
            onPress={() => void saveProductForm()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: P.primary,
              ...shadow,
            }}
          >
            {savingProduct ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {editingProduct
                    ? tr('Update Product', 'រក្សាទុកការកែប្រែ')
                    : tr('Save Product', 'រក្សាទុកទំនិញ')}
                </Text>
              </>
            )}
          </Press>
        </View>
      </View>

      {/* Main Two-Column Layout */}
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        {/* Left Column: Basic Details & Pricing */}
        <View style={{ flex: 1, width: '100%', gap: 18 }}>
          {/* Section: Product Image Upload */}
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ImageIcon size={18} color={P.primary} />
              <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
                {tr('Product Image', 'រូបភាពទំនិញ')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 14,
                  backgroundColor: P.surfaceAlt,
                  borderWidth: 1,
                  borderColor: P.borderStrong,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {formImageUrl ? (
                  <Image
                    source={{ uri: formImageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <ImageIcon size={32} color={P.muted} />
                )}
              </View>

              <View style={{ flex: 1, gap: 8 }}>
                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleUploadImageWeb}
                  />
                )}
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Press
                    onPress={() => {
                      if (Platform.OS === 'web' && fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: P.primaryLight,
                      borderWidth: 1,
                      borderColor: P.primary,
                    }}
                  >
                    <ImagePlus size={15} color={P.primary} />
                    <Text style={{ color: P.primary, fontSize: 12, fontWeight: '700' }}>
                      {formImageUrl ? tr('Change Photo', 'ប្តូររូបភាព') : tr('Upload Photo', 'បញ្ចូលរូបភាព')}
                    </Text>
                  </Press>

                  {formImageUrl && (
                    <Press
                      onPress={() => setFormImageUrl(null)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#FEE2E2',
                        borderWidth: 1,
                        borderColor: '#FECACA',
                      }}
                    >
                      <Trash2 size={14} color="#DC2626" />
                      <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
                        {tr('Remove', 'លុបរូប')}
                      </Text>
                    </Press>
                  )}
                </View>

                <TextInput
                  value={formImageUrl || ''}
                  onChangeText={(val) => setFormImageUrl(val.trim() || null)}
                  placeholder={tr('Or paste image URL...', 'ឬបិទភ្ជាប់តំណរូបភាព (URL)...')}
                  placeholderTextColor="#9CA3AF"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    height: 36,
                    fontSize: 12,
                    color: P.text,
                    backgroundColor: P.surfaceAlt,
                  }}
                />
              </View>
            </View>
          </View>

          {/* Section: Basic Information */}
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Tag size={18} color={P.primary} />
              <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
                {tr('Basic Information', 'ព័ត៌មានទូទៅ')}
              </Text>
            </View>

            {/* Product Name */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                {tr('PRODUCT NAME *', 'ឈ្មោះទំនិញ *')}
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder={tr('e.g. Coca Cola Can 330ml', 'ឧ. កូកាកូឡា កំប៉ុង ៣៣០មល')}
                placeholderTextColor="#9CA3AF"
                style={{
                  borderWidth: 1,
                  borderColor: P.borderStrong,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  height: 44,
                  fontSize: 14,
                  color: P.text,
                  backgroundColor: P.surfaceAlt,
                }}
              />
            </View>

            {/* Barcode */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
                  {tr('BARCODE / SKU', 'បាកូដ / លេខកូដទំនិញ')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Barcode size={13} color={P.emerald} />
                  <Text style={{ color: P.emerald, fontSize: 11, fontWeight: '700' }}>
                    {tr('Scanner Gun Ready', 'ម៉ាស៊ីនស្កេនរួចរាល់')}
                  </Text>
                </View>
              </View>
              <TextInput
                value={formBarcode}
                onChangeText={setFormBarcode}
                placeholder={tr('Scan with USB gun or enter barcode...', 'ស្កេនដោយម៉ាស៊ីន ឬវាយបញ្ចូលបាកូដ...')}
                placeholderTextColor="#9CA3AF"
                style={{
                  borderWidth: 1,
                  borderColor: P.borderStrong,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  height: 44,
                  fontSize: 14,
                  fontFamily: 'monospace',
                  color: P.text,
                  backgroundColor: P.surfaceAlt,
                }}
              />
            </View>

            {/* Category Select Dropdown */}
            <View>
              <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                {tr('CATEGORY (SELECT DROPDOWN)', 'ក្រុមទំនិញ (ជ្រើសរើសពីបញ្ជី)')}
              </Text>

              {Platform.OS === 'web' ? (
                <View style={{ marginBottom: 10 }}>
                  {/* @ts-ignore */}
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    style={{
                      height: 44,
                      borderRadius: 10,
                      border: `1px solid ${P.borderStrong}`,
                      backgroundColor: P.surfaceAlt,
                      padding: '0 12px',
                      color: P.text,
                      fontSize: 14,
                      fontWeight: '700',
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
                </View>
              ) : (
                <TextInput
                  value={formCategory}
                  onChangeText={setFormCategory}
                  placeholder={tr('Category', 'ក្រុមទំនិញ')}
                  placeholderTextColor="#9CA3AF"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 42,
                    fontSize: 14,
                    color: P.text,
                    backgroundColor: P.surfaceAlt,
                  }}
                />
              )}
            </View>
          </View>

          {/* Section: Pricing & Stock */}
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <DollarSign size={18} color={P.emerald} />
              <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
                {tr('Retail Price & Inventory', 'តម្លៃលក់រាយ និងស្តុក')}
              </Text>
            </View>

            {/* Retail Unit Price */}
            <View style={{ marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
                  {tr('UNIT PRICE (RETAIL)', 'តម្លៃលក់រាយក្នុងមួយឯកតា')} ({formCcy === 'KHR' ? '៛ KHR' : '$ USD'})
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['KHR', 'USD'] as const).map((c) => (
                    <Press
                      key={c}
                      onPress={() => {
                        if (c === formCcy) return;
                        const num = Number(formPrice) || 0;
                        if (c === 'KHR') {
                          setFormPrice(num > 0 ? String(roundKhr(num * rate)) : '');
                        } else {
                          setFormPrice(num > 0 ? (num / rate).toFixed(2) : '');
                        }
                        setFormCcy(c);
                      }}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: formCcy === c ? P.primary : P.surfaceAlt,
                      }}
                    >
                      <Text
                        style={{
                          color: formCcy === c ? '#FFFFFF' : P.textSub,
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
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
                placeholder="0"
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
                  backgroundColor: P.surfaceAlt,
                }}
              />

              {/* Real-time Rate Conversion Helper */}
              {Number(formPrice) > 0 && (
                <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 4 }}>
                  {formCcy === 'KHR'
                    ? `≈ ${money(roundKhr(Number(formPrice)) / rate)} USD (Rate: 1$ = ${rate}៛)`
                    : `≈ ${khr(roundKhr(Number(formPrice) * rate))} (Rate: 1$ = ${rate}៛)`}
                </Text>
              )}
            </View>

            {/* Stock Quantity & Low Stock Alert */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                  {editingProduct ? tr('CURRENT STOCK', 'ចំនួនស្តុកបច្ចុប្បន្ន') : tr('INITIAL STOCK', 'ចំនួនស្តុកដំបូង')}
                </Text>
                <TextInput
                  value={formStock}
                  onChangeText={setFormStock}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 42,
                    color: P.text,
                    backgroundColor: P.surfaceAlt,
                  }}
                />
                {Boolean(editingProduct) && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {[5, 10, 50, 100].map((delta) => (
                      <Press
                        key={delta}
                        onPress={() => {
                          const current = Number(formStock) || 0;
                          setFormStock(String(Math.max(0, current + delta)));
                        }}
                        style={{
                          backgroundColor: P.primaryLight,
                          borderWidth: 1,
                          borderColor: P.border,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 7,
                        }}
                      >
                        <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>
                          +{delta}
                        </Text>
                      </Press>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                  {tr('LOW STOCK ALERT', 'កម្រិតជូនដំណឹងស្តុកទាប')}
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
                    backgroundColor: P.surfaceAlt,
                  }}
                />
              </View>
            </View>

            {/* Expiration Date */}
            <View>
              <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
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
                  backgroundColor: P.surfaceAlt,
                }}
              />
            </View>
          </View>
        </View>

        {/* Right Column: Base Unit & Wholesale UOM Packaging */}
        <View style={{ flex: 1, width: '100%', gap: 18 }}>
          {/* Section: Base Unit (Dynamic from Portal UOM Config!) */}
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Package size={18} color={P.primary} />
                <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
                  {tr('Base Unit (Single Item)', 'ឯកតាមូលដ្ឋានរាយ')}
                </Text>
              </View>
              <View style={{ backgroundColor: P.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                <Text style={{ color: P.primary, fontSize: 10.5, fontWeight: '800' }}>
                  {tr('From Portal UOM', 'ពីការកំណត់ UOM')}
                </Text>
              </View>
            </View>
            <Text style={{ color: P.muted, fontSize: 12, marginBottom: 12 }}>
              {tr(
                'Choose the single unit measurement configured in portal, or add a custom base unit.',
                'ជ្រើសរើសឯកតារាយដែលបានកំណត់ក្នុងផតថល ឬបន្ថែមឯកតាមូលដ្ឋានផ្ទាល់ខ្លួន។'
              )}
            </Text>

            {/* Base Unit Select Dropdown for Portal Web */}
            {Platform.OS === 'web' ? (
              <View style={{ marginBottom: 4 }}>
                {/* @ts-ignore */}
                <select
                  value={formBaseUnit}
                  onChange={(e: any) => setFormBaseUnit(e.target.value)}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    border: `1px solid ${P.borderStrong}`,
                    backgroundColor: P.surfaceAlt,
                    padding: '0 12px',
                    color: P.text,
                    fontSize: 14,
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
              </View>
            ) : (
              <TextInput
                value={formBaseUnit}
                onChangeText={setFormBaseUnit}
                placeholder="Base Unit"
                placeholderTextColor="#9CA3AF"
                style={{
                  borderWidth: 1,
                  borderColor: P.borderStrong,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  height: 42,
                  fontSize: 14,
                  color: P.text,
                  backgroundColor: P.surfaceAlt,
                }}
              />
            )}
          </View>

          {/* Section: Wholesale & Packaging Enterprise Configuration */}
          <View
            style={{
              backgroundColor: P.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: P.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: formWholesaleEnabled ? 16 : 0,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Boxes size={18} color={P.primary} />
                <View>
                  <Text style={{ color: P.text, fontSize: 15, fontWeight: '800' }}>
                    {tr('Wholesale & Packaging UOM', 'ការកំណត់លក់ដុំ និងឯកតាកញ្ចប់')}
                  </Text>
                  <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 1 }}>
                    {tr('Enable case-level and bulk wholesale pricing', 'បើកដំណើរការតម្លៃលក់ដុំជាកេស និងបរិមាណច្រើន')}
                  </Text>
                </View>
              </View>

              <Press
                onPress={() => setFormWholesaleEnabled(!formWholesaleEnabled)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: formWholesaleEnabled ? P.primary : P.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: formWholesaleEnabled ? P.primary : P.borderStrong,
                }}
              >
                <Text
                  style={{
                    color: formWholesaleEnabled ? '#FFFFFF' : P.textSub,
                    fontSize: 12.5,
                    fontWeight: '800',
                  }}
                >
                  {formWholesaleEnabled ? tr('Enabled', 'បើកដំណើរការ') : tr('Disabled', 'បិទ')}
                </Text>
              </Press>
            </View>

            {formWholesaleEnabled && (
              <View style={{ gap: 14 }}>
                {/* Wholesale Unit Price */}
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
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
                              setFormWholesalePrice(num > 0 ? String(roundKhr(num * rate)) : '');
                            } else {
                              setFormWholesalePrice(num > 0 ? (num / rate).toFixed(2) : '');
                            }
                            setFormWholesaleCcy(c);
                          }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 5,
                            backgroundColor: formWholesaleCcy === c ? P.primary : P.surfaceAlt,
                          }}
                        >
                          <Text
                            style={{
                              color: formWholesaleCcy === c ? '#FFFFFF' : P.textSub,
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            {c}
                          </Text>
                        </Press>
                      ))}
                    </View>
                  </View>
                  <TextInput
                    value={formWholesalePrice}
                    onChangeText={setFormWholesalePrice}
                    placeholder={formWholesaleCcy === 'KHR' ? '0' : '0.00'}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 42,
                      color: P.text,
                      backgroundColor: P.surfaceAlt,
                    }}
                  />
                </View>

                {/* Packaging UOM Template Selection from Portal */}
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
                      {tr('PACKAGING UOM TEMPLATE', 'ទម្រង់កំណត់ឯកតាកញ្ចប់ UOM')}
                    </Text>
                    <Press onPress={() => setTab('uom')}>
                      <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '700' }}>
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
                          onPress={() => handleSelectUomConfig(u.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 10,
                            backgroundColor: isSel ? P.primaryLight : P.surfaceAlt,
                            borderWidth: 1.5,
                            borderColor: isSel ? P.primary : P.border,
                            minWidth: 140,
                          }}
                        >
                          <Text
                            style={{
                              color: isSel ? P.primary : P.text,
                              fontSize: 12.5,
                              fontWeight: isSel ? '800' : '600',
                            }}
                          >
                            {u.name}
                          </Text>
                          <Text
                            style={{
                              color: isSel ? P.primary : P.muted,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            1 {u.caseUnitName} = {u.caseQty} {u.baseUnit}s
                          </Text>
                        </Press>
                      );
                    })}
                  </View>
                </View>

                {/* Minimum Wholesale Quantity */}
                <View>
                  <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                    {tr('MINIMUM WHOLESALE QUANTITY (CASES)', 'បរិមាណលក់ដុំអប្បបរមា (កេស)')}
                  </Text>
                  <TextInput
                    value={formWholesaleMinQty}
                    onChangeText={setFormWholesaleMinQty}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 40,
                      color: P.text,
                      backgroundColor: P.surfaceAlt,
                    }}
                  />
                </View>

                {/* Computed Wholesale Case Price Preview Banner */}
                {computedWholesaleCasePrice && (
                  <View
                    style={{
                      backgroundColor: P.primaryLight,
                      padding: 12,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderWidth: 1,
                      borderColor: P.border,
                    }}
                  >
                    <Boxes size={20} color={P.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>
                        {tr('Calculated Wholesale Case Price', 'តម្លៃលក់ដុំសរុបក្នុង ១ កេស')}
                      </Text>
                      <Text style={{ color: P.primary, fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                        1 {formCaseUnitName || 'Case'} ({formCaseQty || 24} {formBaseUnit || 'pcs'}s) ={' '}
                        {computedWholesaleCasePrice}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Bottom Save Bar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderColor: P.border,
        }}
      >
        <Press
          onPress={() => setTab('inventory')}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 11,
            borderRadius: 10,
            backgroundColor: P.surfaceAlt,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <Text style={{ color: P.textSub, fontSize: 13.5, fontWeight: '700' }}>
            {tr('Cancel', 'បោះបង់')}
          </Text>
        </Press>

        <Press
          disabled={savingProduct}
          onPress={() => void saveProductForm()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: P.primary,
            ...shadow,
          }}
        >
          {savingProduct ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Save size={17} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                {editingProduct
                  ? tr('Update Product', 'រក្សាទុកការកែប្រែ')
                  : tr('Save Product', 'រក្សាទុកទំនិញ')}
              </Text>
            </>
          )}
        </Press>
      </View>
    </View>
  );
}
