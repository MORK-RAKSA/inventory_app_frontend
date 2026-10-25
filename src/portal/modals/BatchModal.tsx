import { ActivityIndicator, Modal, ScrollView, Text, View } from 'react-native';
import { Check, Layers, Plus, SlidersHorizontal, X } from 'lucide-react-native';
import { lookupBarcodeOnline } from '../../barcodeLookup';
import { Press } from '../../motion';
import { P } from '../theme';
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

  return (
    <Modal visible={showBatchModal} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(47, 38, 87, 0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: P.surfaceStrong,
            borderRadius: 22,
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
              <Press onPress={() => setShowBatchModal(false)}>
                <X size={20} color={P.muted} />
              </Press>
            </View>
          </View>

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
            <Text style={{ flex: 1.6, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('BARCODE', 'បាកូដ')}</Text>
            <Text style={{ flex: 2.0, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('PRODUCT NAME', 'ឈ្មោះទំនិញ')}</Text>
            <Text style={{ flex: 1.1, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('CATEGORY', 'ក្រុម')}</Text>
            <Text style={{ flex: 1.1, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('RETAIL (៛)', 'តម្លៃរាយ')}</Text>
            <Text style={{ flex: 0.9, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('STOCK', 'ស្តុក')}</Text>
            <Text style={{ flex: 2.3, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('PACKAGING UOM', 'ឯកតា UOM')}</Text>
            <Text style={{ flex: 1.2, color: P.muted, fontSize: 11, fontWeight: '800' }}>{tr('CASE (៛)', 'តម្លៃដុំ/កេស')}</Text>
            <Text style={{ width: 30, textAlign: 'center', color: P.muted, fontSize: 11, fontWeight: '800' }}>DEL</Text>
          </View>

          {/* Batch Rows */}
          <ScrollView style={{ flex: 1, maxHeight: 400 }}>
            {batchRows.map((row, idx) => (
              <BatchRow
                key={row.id}
                row={row}
                index={idx}
                canDelete={batchRows.length > 1}
                uomConfigs={uomConfigs}
                onChange={(rowId, patch) =>
                  setBatchRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)))
                }
                onResolveBarcode={(rowId, barcode) => {
                  void lookupBarcodeOnline(barcode).then((info) => {
                    if (info?.name) {
                      setBatchRows((prev) =>
                        prev.map((r) =>
                          r.id === rowId ? { ...r, name: info.name, category: info.category || r.category } : r
                        )
                      );
                    }
                  });
                }}
                onOpenUomConfig={openUomConfigForRow}
                onDelete={(rowId) => setBatchRows((prev) => prev.filter((r) => r.id !== rowId))}
              />
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
  );
}
