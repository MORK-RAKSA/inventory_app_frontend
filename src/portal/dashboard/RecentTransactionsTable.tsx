import { AppText as Text } from '../../components/AppText';
import { View } from 'react-native';
import { Download } from 'lucide-react-native';
import { Sale } from '../../api';
import { khr, money } from '../../theme';
import { Press } from '../../motion';
import { glass, P } from '../theme';
import type { PortalController } from '../usePortalController';

export function RecentTransactionsTable({
  sales,
  onOpen,
  onExport,
  tr,
}: {
  sales: Sale[];
  onOpen: (sale: Sale) => void;
  onExport: () => void;
  tr: PortalController['tr'];
}) {
  return (
    <View style={{ ...glass, padding: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 10,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: P.text, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3 }}>
            {tr('Latest POS Transactions', 'ប្រតិបត្តិការលក់ចុងក្រោយ')}
          </Text>
          <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 3 }}>
            {tr('Tap a row to open the receipt', 'ចុចលើជួរដើម្បីមើលវិក្កយបត្រ')}
          </Text>
        </View>
        <Press
          onPress={onExport}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 13,
            paddingVertical: 8,
            borderRadius: 11,
            backgroundColor: P.emeraldLight,
            borderWidth: 1,
            borderColor: 'rgba(46, 156, 106, 0.2)',
          }}
        >
          <Download size={13} color={P.emerald} />
          <Text style={{ color: P.emerald, fontSize: 11.5, fontWeight: '800' }}>
            {tr('Export Excel', 'ទាញយក Excel')}
          </Text>
        </Press>
      </View>

      <View
        style={{
          flexDirection: 'row',
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: P.surfaceAlt,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.7)',
        }}
      >
        <Text style={{ flex: 1.1, color: P.muted, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 }}>
          {tr('RECEIPT ID', 'លេខវិក្កយបត្រ')}
        </Text>
        <Text style={{ flex: 1.5, color: P.muted, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 }}>
          {tr('DATE & TIME', 'ថ្ងៃ & ម៉ោង')}
        </Text>
        <Text style={{ flex: 2, color: P.muted, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 }}>
          {tr('ITEMS', 'ទំនិញ')}
        </Text>
        <Text
          style={{
            flex: 1.2,
            color: P.muted,
            fontSize: 9.5,
            fontWeight: '800',
            letterSpacing: 0.6,
            textAlign: 'right',
          }}
        >
          {tr('TOTAL (៛)', 'សរុប (៛)')}
        </Text>
        <Text
          style={{
            flex: 1,
            color: P.muted,
            fontSize: 9.5,
            fontWeight: '800',
            letterSpacing: 0.6,
            textAlign: 'right',
          }}
        >
          USD ($)
        </Text>
      </View>

      {sales.slice(0, 6).map((s) => (
        <Press
          key={s.id}
          onPress={() => onOpen(s)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderColor: 'rgba(101, 83, 214, 0.09)',
          }}
        >
          <Text style={{ flex: 1.1, color: P.primary, fontWeight: '800', fontSize: 12 }}>
            #{s.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={{ flex: 1.5, color: P.textSub, fontSize: 11.5 }}>
            {new Date(s.createdAt).toLocaleString()}
          </Text>
          <Text style={{ flex: 2, color: P.text, fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>
            {s.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
          </Text>
          <Text
            style={{
              flex: 1.2,
              color: P.text,
              fontWeight: '800',
              fontSize: 13,
              textAlign: 'right',
            }}
          >
            {khr(s.totalKhr || s.totalUsd * s.rateSnapshot)}
          </Text>
          <Text
            style={{
              flex: 1,
              color: P.muted,
              fontWeight: '600',
              fontSize: 12,
              textAlign: 'right',
            }}
          >
            {money(s.totalUsd)}
          </Text>
        </Press>
      ))}
    </View>
  );
}
