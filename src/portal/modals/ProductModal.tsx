import { Modal, Text, TextInput, View } from 'react-native';
import { Boxes, X } from 'lucide-react-native';
import { roundKhr } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function ProductModal({ portal }: { portal: PortalController }) {
  const {
    applyUomConfigToProductForm,
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
    formWholesalePrice,
    rate,
    saveProductForm,
    savingProduct,
    selectedUomConfigId,
    setFormBarcode,
    setFormCategory,
    setFormCcy,
    setFormExpiry,
    setFormLowThreshold,
    setFormName,
    setFormPrice,
    setFormStock,
    setFormWholesaleCcy,
    setFormWholesaleEnabled,
    setFormWholesalePrice,
    setShowProductModal,
    setTab,
    showProductModal,
    tr,
    uomConfigs,
  } = portal;

  return (
    <Modal
      visible={showProductModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowProductModal(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(47, 38, 87, 0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            backgroundColor: P.surfaceStrong,
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ color: P.text, fontSize: 19, fontWeight: '800' }}>
              {editingProduct
                ? tr('Edit Product', 'កែប្រែទំនិញ')
                : tr('Create Product', 'បង្កើតទំនិញ')}
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
                    ? tr('Save', 'រក្សាទុក')
                    : tr('Create', 'បង្កើត')}
                </Text>
              </Press>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
