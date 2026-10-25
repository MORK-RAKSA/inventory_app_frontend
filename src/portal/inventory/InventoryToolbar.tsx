import { Text, TextInput, View } from 'react-native';
import { Download, Layers, PackagePlus, Search } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { STOCK_FILTERS, StockFilter } from './columns';

export function InventoryToolbar({
  search,
  onSearchChange,
  onScanSubmit,
  statusFilter,
  onStatusFilterChange,
  onExport,
  onOpenBatch,
  onCreateProduct,
  tr,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onScanSubmit: (code: string) => void;
  statusFilter: StockFilter;
  onStatusFilterChange: (value: StockFilter) => void;
  onExport: () => void;
  onOpenBatch: () => void;
  onCreateProduct: () => void;
  tr: PortalController['tr'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: P.surfaceAlt,
            borderWidth: 1,
            borderColor: P.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 42,
            gap: 8,
          }}
        >
          <Search size={16} color={P.muted} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            onSubmitEditing={() => {
              if (search.trim()) {
                onScanSubmit(search.trim());
              }
            }}
            placeholder={tr(
              'Filter or scan with USB/Bluetooth barcode scanner...',
              'ស្វែងរក ឬស្កេនដោយម៉ាស៊ីនស្កេនបាកូដ...'
            )}
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, color: P.text, fontSize: 13.5, height: '100%' }}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {STOCK_FILTERS.map((st) => (
          <Press
            key={st.id}
            onPress={() => onStatusFilterChange(st.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: statusFilter === st.id ? P.primaryLight : P.surfaceAlt,
              borderWidth: 1,
              borderColor: statusFilter === st.id ? P.primary : P.border,
            }}
          >
            <Text
              style={{
                color: statusFilter === st.id ? P.primary : P.textSub,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {st.label}
            </Text>
          </Press>
        ))}

        <Press
          onPress={onExport}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 13,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: P.emeraldLight,
          }}
        >
          <Download size={14} color={P.emerald} />
          <Text style={{ color: P.emerald, fontSize: 12, fontWeight: '800' }}>Export .XLSX</Text>
        </Press>

        <Press
          onPress={onOpenBatch}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 13,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: P.primaryLight,
            borderWidth: 1,
            borderColor: 'rgba(101, 83, 214, 0.25)',
          }}
        >
          <Layers size={14} color={P.primary} />
          <Text style={{ color: P.primary, fontSize: 12, fontWeight: '800' }}>
            {tr('Batch Intake & Create', 'នាំចូល & បង្កើតជាបាច់')}
          </Text>
        </Press>

        <Press
          onPress={onCreateProduct}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: P.primary,
          }}
        >
          <PackagePlus size={15} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
            {tr('Add Product', 'បន្ថែមទំនិញ')}
          </Text>
        </Press>
      </View>
    </View>
  );
}
