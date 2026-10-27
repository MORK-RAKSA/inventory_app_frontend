import { AppTextInput as TextInput } from '../../components/AppText';
import { View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function UomSearchBar({
  search,
  onSearchChange,
  tr,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  tr: PortalController['tr'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: P.surfaceAlt,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: P.border,
        paddingHorizontal: 12,
        marginBottom: 16,
      }}
    >
      <Search size={16} color="#9CA3AF" />
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder={tr(
          'Search product name or barcode to configure packaging...',
          'ស្វែងរកឈ្មោះទំនិញ ឬបាកូដដើម្បីកំណត់ឯកតាកញ្ចប់...'
        )}
        placeholderTextColor="#9CA3AF"
        style={{
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 10,
          fontSize: 13,
          color: P.text,
        }}
      />
      {search ? (
        <Press onPress={() => onSearchChange('')}>
          <X size={15} color={P.muted} />
        </Press>
      ) : null}
    </View>
  );
}
