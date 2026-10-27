import { AppTextInput as TextInput, AppText as Text } from '../../components/AppText';
import { DropdownPicker } from '../../components/DropdownPicker';
import { Modal, Platform, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function UomModal({ portal }: { portal: PortalController }) {
  const {
    availableBaseUnits,
    closeUomModal,
    editingUomConfig,
    saveUomConfigAction,
    savingUom,
    setShowUomModal,
    setUomFormBaseUnit,
    setUomFormCaseQty,
    setUomFormCaseUnitName,
    setUomFormDescription,
    setUomFormName,
    showUomModal,
    tr,
    uomConfigs,
    uomFormBaseUnit,
    uomFormCaseQty,
    uomFormCaseUnitName,
    uomFormDescription,
    uomFormName,
  } = portal;

  const baseUnitOptions = Array.from(
    new Set([
      ...(availableBaseUnits || []),
      editingUomConfig?.baseUnit,
      uomFormBaseUnit,
    ].filter(Boolean))
  );

  const packagingOptions = Array.from(
    new Set([
      ...(uomConfigs || []).map((u) => u.caseUnitName?.trim()).filter(Boolean),
      uomFormCaseUnitName,
    ].filter(Boolean))
  );

  return (
    <Modal visible={showUomModal} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(47, 38, 87, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 10000,
        }}
      >
        <View
          style={{
            backgroundColor: P.surfaceStrong,
            borderRadius: 22,
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
            <Press onPress={() => closeUomModal()}>
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
                {Platform.OS === 'web' ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: P.borderStrong,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: P.surfaceAlt,
                      height: 40,
                      justifyContent: 'center',
                    }}
                  >
                    <select
                      value={uomFormBaseUnit || 'Piece'}
                      onChange={(e: any) => setUomFormBaseUnit(e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: P.text,
                        padding: '0 10px',
                        fontSize: 13,
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {baseUnitOptions.map((u) => (
                        <option key={u} value={u} style={{ background: P.surface, color: P.text }}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </View>
                ) : (
                  <TextInput
                    value={uomFormBaseUnit}
                    onChangeText={setUomFormBaseUnit}
                    placeholder="Can / Bottle / Piece / Box / Pack"
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
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700', marginBottom: 4 }}>
                  {tr('MASTER PACKAGING', 'ឯកតាដុំធំ')}
                </Text>
                <DropdownPicker value={uomFormCaseUnitName} options={packagingOptions as string[]}
                  onChange={setUomFormCaseUnitName} allowCustom
                  placeholder={tr('Select or add packaging', 'ជ្រើសរើស ឬបន្ថែមឯកតាដុំធំ')} />
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
                backgroundColor: P.primaryLight,
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
                onPress={() => closeUomModal()}
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
  );
}
