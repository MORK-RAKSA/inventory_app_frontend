import { Text, View } from 'react-native';
import { khr, money } from '../../theme';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function CartTotalsBox({
  totalKhr,
  totalUsd,
  rate,
  tr,
}: {
  totalKhr: number;
  totalUsd: number;
  rate: number;
  tr: PortalController['tr'];
}) {
  return (
    <View
      style={{
        backgroundColor: P.deep,
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#4B3FA8',
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#C9BFF6', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
          {tr('GRAND TOTAL (100 ៛ ROUNDED)', 'សរុបត្រូវបង់ (គិតជាប្រាក់រៀល)')}
        </Text>
        <Text style={{ color: '#9CE7C4', fontSize: 11.5, fontWeight: '700' }}>1$ = {khr(rate)}</Text>
      </View>
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 32,
          fontWeight: '800',
          marginTop: 6,
          letterSpacing: -0.8,
        }}
      >
        {khr(totalKhr)}
      </Text>
      <Text style={{ color: '#DCD5F5', fontSize: 15, fontWeight: '700', marginTop: 2 }}>
        {money(totalUsd)} USD
      </Text>
    </View>
  );
}
