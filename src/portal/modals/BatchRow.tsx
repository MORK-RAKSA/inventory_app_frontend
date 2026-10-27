import { AppTextInput as TextInput, AppText as Text } from '../../components/AppText';
import { Platform, View } from 'react-native';
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
  categories = [],
  availableBaseUnits = [],
  onChange,
  onResolveBarcode,
  onOpenUomConfig,
  onDelete,
}: {
  row: BatchRowState;
  index: number;
  canDelete: boolean;
  uomConfigs: UomConfig[];
  categories?: string[];
  availableBaseUnits?: string[];
  onChange: (rowId: string, patch: Partial<BatchRowState>) => void;
  onResolveBarcode: (rowId: string, barcode: string) => void;
  onOpenUomConfig: (rowId: string) => void;
  onDelete: (rowId: string) => void;
}) {
  const currentBase =
    row.baseUnit ||
    uomConfigs.find((u) => u.id === row.uomConfigId)?.baseUnit ||
    'Can';

  // UOMs filtered to only those matching this row's Base Unit
  const filteredUoms = uomConfigs.filter(
    (u) => !u.baseUnit || u.baseUnit.toLowerCase() === currentBase.toLowerCase()
  );
  const displayUoms = filteredUoms.length > 0 ? filteredUoms : uomConfigs;

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

      {/* Category Dropdown from Config */}
      <View style={{ flex: 1.2 }}>
        {Platform.OS === 'web' ? (
          /* @ts-ignore */
          <select
            value={row.category || 'General'}
            onChange={(e: any) => onChange(row.id, { category: e.target.value })}
            style={{
              ...fieldStyle,
              width: '100%',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            {Array.from(new Set(['General', ...categories.filter((c) => c !== 'All'), row.category].filter(Boolean))).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        ) : (
          <TextInput
            value={row.category}
            onChangeText={(val) => onChange(row.id, { category: val })}
            placeholder="Category"
            placeholderTextColor="#9CA3AF"
            style={fieldStyle}
          />
        )}
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

      {/* Packaging UOM Dropdown Filtered by Base Unit */}
      <View style={{ flex: 2.3 }}>
        {Platform.OS === 'web' ? (
          /* @ts-ignore */
          <select
            value={row.uomConfigId}
            onChange={(e: any) => onChange(row.id, { uomConfigId: e.target.value })}
            style={{
              ...fieldStyle,
              width: '100%',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              color: P.primary,
              backgroundColor: P.primaryLight,
              borderColor: P.primary,
            }}
          >
            {displayUoms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.caseQty} {u.baseUnit})
              </option>
            ))}
          </select>
        ) : (
          <TextInput
            value={uomConfigs.find((u) => u.id === row.uomConfigId)?.name || 'UOM'}
            editable={false}
            style={fieldStyle}
          />
        )}
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
