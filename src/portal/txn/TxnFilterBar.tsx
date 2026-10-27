import { AppTextInput as TextInput, AppText as Text } from '../../components/AppText';
import { View } from 'react-native';
import { Download, Search } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import { SALES_RANGES, SalesRange } from './columns';

export function TxnFilterBar({
  search,
  onSearchChange,
  range,
  onRangeChange,
  onExport,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  range: SalesRange;
  onRangeChange: (value: SalesRange) => void;
  onExport: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
      }}
    >
      <View
        style={{
          flex: 1,
          minWidth: 240,
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
          placeholder="Search receipt ID or product sold..."
          placeholderTextColor="#9CA3AF"
          style={{ flex: 1, color: P.text, fontSize: 13.5, height: '100%' }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SALES_RANGES.map((r) => (
          <Press
            key={r.id}
            onPress={() => onRangeChange(r.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: range === r.id ? P.primary : P.surfaceAlt,
            }}
          >
            <Text
              style={{
                color: range === r.id ? '#FFFFFF' : P.textSub,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {r.label}
            </Text>
          </Press>
        ))}

        <Press
          onPress={onExport}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: P.emeraldLight,
          }}
        >
          <Download size={14} color={P.emerald} />
          <Text style={{ color: P.emerald, fontSize: 12, fontWeight: '800' }}>Export</Text>
        </Press>
      </View>
    </View>
  );
}
