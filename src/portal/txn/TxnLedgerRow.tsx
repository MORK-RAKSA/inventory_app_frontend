import { AppText as Text } from '../../components/AppText';
import { View } from 'react-native';
import { Sale } from '../../api';
import { khr, money } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';
import { TXN_COL } from './columns';

export function TxnLedgerRow({ sale, onPress }: { sale: Sale; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderColor: P.border,
      }}
    >
      <Text style={{ flex: TXN_COL.receipt, color: P.primary, fontWeight: '800', fontSize: 13 }}>
        #{sale.id.slice(0, 8).toUpperCase()}
      </Text>
      <Text style={{ flex: TXN_COL.timestamp, color: P.textSub, fontSize: 12.5 }}>
        {new Date(sale.createdAt).toLocaleString()}
      </Text>
      <Text
        style={{ flex: TXN_COL.items, color: P.text, fontSize: 13, fontWeight: '600' }}
        numberOfLines={1}
      >
        {sale.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
      </Text>
      <View style={{ flex: TXN_COL.tender }}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: P.primaryLight,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: P.primary, fontSize: 11, fontWeight: '800' }}>
            {sale.paidCurrency || 'KHR'}
          </Text>
        </View>
      </View>
      <Text
        style={{
          flex: TXN_COL.total,
          color: P.text,
          fontWeight: '800',
          fontSize: 14.5,
          textAlign: 'right',
        }}
      >
        {khr(sale.totalKhr || sale.totalUsd * sale.rateSnapshot)}
      </Text>
      <Text
        style={{
          flex: TXN_COL.usd,
          color: P.muted,
          fontWeight: '600',
          fontSize: 12.5,
          textAlign: 'right',
        }}
      >
        {money(sale.totalUsd)}
      </Text>
    </Press>
  );
}
