import { ActivityIndicator, Modal, ScrollView, Text, View } from 'react-native';
import { Barcode, Check, Layers, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react-native';
import { lookupBarcodeOnline } from '../../barcodeLookup';
import { Press } from '../../motion';
import { P, shadow } from '../theme';
import type { PortalController } from '../usePortalController';
import { BatchRow } from './BatchRow';

export function BatchModal({ portal }: { portal: PortalController }) {
  const {
    batchRows,
    commitBatchAction,
    committingBatch,
    openCreateUomModal,
    openUomConfigForRow,
    selectedUomConfigId,
    setBatchRows,
    setShowBatchModal,
    showBatchModal,
    tr,
    uomConfigs,
  } = portal;

  const handleAddRow = () => {
    setBatchRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length + 1}`,
        barcode: '',
        name: '',
        category: 'General',
        ccy: 'KHR',
        price: '',
        stock: '',
        uomConfigId: selectedUomConfigId || 'uom-case-24',
        wholesalePrice: '',
      },
    ]);
  };

  const handleAdd5Rows = () => {
    setBatchRows((prev) => {
      const now = Date.now();
      const added = Array.from({ length: 5 }, (_, i) => ({
        id: `row-${now}-${prev.length + i + 1}`,
        barcode: '',
        name: '',
        category: 'General',
        ccy: 'KHR' as const,
        price: '',
        stock: '',
        uomConfigId: selectedUomConfigId || 'uom-case-24',
        wholesalePrice: '',
      }));
      return [...prev, ...added];
    });
  };

  const filledCount = batchRows.filter((r) => r.name.trim() || r.barcode.trim()).length;

  return (
    <Modal visible={showBatchModal} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(47, 38, 87, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 9000,
        }}
      >
        <View
          style={{
            backgroundColor: P.surfaceStrong,
            borderRadius: 22,
            width: '100%',
            maxWidth: 1040,
            maxHeight: '90%',
            padding: 22,
            borderWidth: 1,
            borderColor: P.border,
            ...shadow,
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
                <View
                  style={{
                    backgroundColor: P.emeraldLight,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 99,
                  }}
                >
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Press
                onPress={() => openCreateUomModal()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: P.primaryLight,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: P.primary,
                }}
              >
                <SlidersHorizontal size={14} color={P.primary} />
                <Text style={{ color: P.primary, fontSize: 12, fontWeight: '800' }}>
                  {tr('+ Configure UOM', '+ កំណត់ទម្រង់ UOM')}
                </Text>
              </Press>

              <Press
                onPress={() => setShowBatchModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: P.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={P.muted} />
              </Press>
            </View>
          </View>

          {/* If Empty: Clean Empty State Prompt */}
          {batchRows.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 48,
                paddingHorizontal: 20,
                backgroundColor: P.surfaceAlt,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: P.border,
                borderStyle: 'dashed',
                marginVertical: 12,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: P.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Barcode size={28} color={P.primary} />
              </View>
              <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
                {tr('No items in batch intake', 'មិនទាន់មានទំនិញក្នុងតារាងបាច់នៅឡើយទេ')}
              </Text>
              <Text
                style={{
                  color: P.muted,
                  fontSize: 12.5,
                  textAlign: 'center',
                  maxWidth: 420,
                  marginTop: 6,
                  lineHeight: 18,
                }}
              >
                {tr(
                  'Scan barcodes with your mobile scanner gun or USB barcode reader, or click "+ Add Row" to manually enter products.',
                  'ស្កេនបាកូដដោយម៉ាស៊ីនស្កេនទូរស័ព្ទ ឬម៉ាស៊ីនស្កេន USB ឬចុច "+ បន្ថែមជួរថ្មី" ដើម្បីបញ្ចូលទំនិញដោយដៃ។'
                )}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <Press
                  onPress={handleAddRow}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: P.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 8,
                    ...shadow,
                  }}
                >
                  <Plus size={15} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    {tr('+ Add Row', '+ បន្ថែមជួរថ្មី')}
                  </Text>
                </Press>
                <Press
                  onPress={handleAdd5Rows}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: P.surface,
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Layers size={14} color={P.text} />
                  <Text style={{ color: P.text, fontSize: 13, fontWeight: '700' }}>
                    {tr('+ Add 5 Rows', '+ បន្ថែម ៥ ជួរ')}
                  </Text>
                </Press>
              </View>
            </View>
          ) : (
            <>
              {/* Batch Intake Table Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  backgroundColor: P.surfaceAlt,
                  borderRadius: 8,
                  marginBottom: 8,
                  gap: 6,
                }}
              >
                <Text style={{ width: 26, color: P.muted, fontSize: 11, fontWeight: '800' }}>#</Text>
                <Text style={{ flex: 1.6, color: P.muted, fontSize: 11, fontWeight: '800' }}>
                  {tr('BARCODE', 'បាកូដ')}
                </Text>
                <Text style={{ flex: 2.0, color: P.muted, fontSize: 11, fontWeight: '800' }}>
                  {tr('PRODUCT NAME', 'ឈ្មោះទំនិញ')}
                </Text>
                <Text style={{ flex: 1.1, color: P.muted, fontSize: 11, fontWeight: '800' }}>
                  {tr('CATEGORY', 'ក្រុម')}
                </Text>
                <Text style={{ flex: 1.1, color: P.muted, fontSize: 11, fontWeight: '800' }}>
                  {tr('RETAIL (៛)', 'តម្លៃរាយ')}
                </Text>
                <Text style={{ flex: 0.9, color: P.muted, fontSize: 11, fontWeight: '800' }}>
                  {tr('STOCK', 'ស្តុក')}
                </Text>
                <Text style={{ flex: 2.3, color: P.muted, fontSize: 11, fontWeight: '800' }}>
                  {tr('PACKAGING UOM', 'ឯកតា UOM')}
                </Text>
                <Text style={{ flex: 1.2, color: P.muted, fontSize: 11, fontWeight: '800' }}>
                  {tr('CASE (៛)', 'តម្លៃដុំ/កេស')}
                </Text>
                <Text
                  style={{
                    width: 30,
                    textAlign: 'center',
                    color: P.muted,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  DEL
                </Text>
              </View>

              {/* Batch Rows */}
              <ScrollView style={{ flex: 1, maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {batchRows.map((row, idx) => (
                  <BatchRow
                    key={row.id}
                    row={row}
                    index={idx}
                    canDelete={true}
                    uomConfigs={uomConfigs}
                    onChange={(rowId, patch) =>
                      setBatchRows((prev) =>
                        prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
                      )
                    }
                    onResolveBarcode={(rowId, barcode) => {
                      void lookupBarcodeOnline(barcode).then((info) => {
                        if (info?.name) {
                          setBatchRows((prev) =>
                            prev.map((r) =>
                              r.id === rowId
                                ? { ...r, name: info.name, category: info.category || r.category }
                                : r
                            )
                          );
                        }
                      });
                    }}
                    onOpenUomConfig={openUomConfigForRow}
                    onDelete={(rowId) =>
                      setBatchRows((prev) => prev.filter((r) => r.id !== rowId))
                    }
                  />
                ))}
              </ScrollView>
            </>
          )}

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Press
                onPress={handleAddRow}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: P.surfaceAlt,
                  borderWidth: 1,
                  borderColor: P.border,
                }}
              >
                <Plus size={14} color={P.text} />
                <Text style={{ color: P.text, fontSize: 12, fontWeight: '700' }}>
                  {tr('+ Add Row', '+ បន្ថែមជួរ')}
                </Text>
              </Press>

              <Press
                onPress={handleAdd5Rows}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: P.surfaceAlt,
                  borderWidth: 1,
                  borderColor: P.border,
                }}
              >
                <Layers size={14} color={P.text} />
                <Text style={{ color: P.text, fontSize: 12, fontWeight: '700' }}>
                  {tr('+ 5 Rows', '+ ៥ ជួរ')}
                </Text>
              </Press>

              {batchRows.length > 0 && (
                <Press
                  onPress={() => setBatchRows([])}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  <Trash2 size={13} color={P.rose} />
                  <Text style={{ color: P.rose, fontSize: 12, fontWeight: '700' }}>
                    {tr('Clear All', 'លុបទាំងអស់')}
                  </Text>
                </Press>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
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
                disabled={committingBatch || filledCount === 0}
                onPress={() => void commitBatchAction()}
                style={{
                  backgroundColor: filledCount > 0 ? P.primary : P.muted,
                  paddingHorizontal: 20,
                  paddingVertical: 9,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: filledCount > 0 ? 1 : 0.6,
                }}
              >
                {committingBatch ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      {tr(
                        `Commit Batch (${filledCount} Items)`,
                        `រក្សាទុកជាបាច់ (${filledCount} មុខ)`
                      )}
                    </Text>
                  </>
                )}
              </Press>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
