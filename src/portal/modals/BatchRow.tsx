import { ScrollView, Text, TextInput, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { UomConfig } from '../../api';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

type BatchRowState = PortalController['batchRows'][number];

const fieldStyle = {
  height: 36,
  borderWidth: 1,
  borderColor: P.borderStrong,
  borderRadius: 6,
  paddingHorizontal: 8,
  fontSize: 12,
  color: P.text,
  backgroundColor: P.surface,
} as const;

export function BatchRow({
  row,
  index,
  canDelete,
  uomConfigs,
  onChange,
  onResolveBarcode,
  onOpenUomConfig,
  onDelete,
}: {
  row: BatchRowState;
  index: number;
  canDelete: boolean;
  uomConfigs: UomConfig[];
  onChange: (rowId: string, patch: Partial<BatchRowState>) => void;
  onResolveBarcode: (rowId: string, barcode: string) => void;
  onOpenUomConfig: (rowId: string) => void;
  onDelete: (rowId: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderColor: P.border,
        gap: 6,
      }}
    >
      <Text style={{ width: 26, color: P.muted, fontSize: 11, fontWeight: '700' }}>{index + 1}</Text>

      {/* Barcode */}
      <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          value={row.barcode}
          onChangeText={(val) => onChange(row.id, { barcode: val })}
          onBlur={() => {
            if (row.barcode.trim() && !row.name) {
              onResolveBarcode(row.id, row.barcode.trim());
            }
          }}
          placeholder="Scan or type..."
          placeholderTextColor="#9CA3AF"
          style={{ ...fieldStyle, flex: 1 }}
        />
      </View>

      {/* Product Name */}
      <View style={{ flex: 2.0 }}>
        <TextInput
          value={row.name}
          onChangeText={(val) => onChange(row.id, { name: val })}
          placeholder="Item name..."
          placeholderTextColor="#9CA3AF"
          style={fieldStyle}
        />
      </View>

      {/* Category */}
      <View style={{ flex: 1.1 }}>
        <TextInput
          value={row.category}
          onChangeText={(val) => onChange(row.id, { category: val })}
          placeholder="Category"
          placeholderTextColor="#9CA3AF"
          style={fieldStyle}
        />
      </View>

      {/* Price (KHR) */}
      <View style={{ flex: 1.1 }}>
        <TextInput
          value={row.price}
          onChangeText={(val) => onChange(row.id, { price: val })}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          style={fieldStyle}
        />
      </View>

      {/* Stock Qty */}
      <View style={{ flex: 0.9 }}>
        <TextInput
          value={row.stock}
          onChangeText={(val) => onChange(row.id, { stock: val })}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          style={fieldStyle}
        />
      </View>

      {/* Packaging UOM Selector & Shortcut */}
      <View style={{ flex: 2.3 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: 4 }}
        >
          {uomConfigs.map((u) => {
            const isSel = row.uomConfigId === u.id;
            return (
              <Press
                key={u.id}
                onPress={() => onChange(row.id, { uomConfigId: u.id })}
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 5,
                  borderRadius: 6,
                  backgroundColor: isSel ? P.primaryLight : P.surfaceAlt,
                  borderWidth: 1,
                  borderColor: isSel ? P.primary : P.border,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: isSel ? P.primary : P.textSub }}>
                  {u.name}
                </Text>
              </Press>
            );
          })}
          <Press
            onPress={() => onOpenUomConfig(row.id)}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: P.surface,
              borderWidth: 1,
              borderColor: P.primary,
              borderStyle: 'dashed',
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: P.primary }}>+ UOM</Text>
          </Press>
        </ScrollView>
      </View>

      {/* Wholesale Case Price (KHR) */}
      <View style={{ flex: 1.2 }}>
        <TextInput
          value={row.wholesalePrice}
          onChangeText={(val) => onChange(row.id, { wholesalePrice: val })}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          style={fieldStyle}
        />
      </View>

      {/* Delete row */}
      <Press
        onPress={() => {
          if (canDelete) onDelete(row.id);
        }}
        style={{
          width: 30,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Trash2 size={14} color={P.rose} />
      </Press>
    </View>
  );
}
