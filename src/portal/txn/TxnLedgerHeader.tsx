import { Text, View } from 'react-native';
import { P } from '../theme';
import { TXN_COL } from './columns';

const cell = { color: P.muted, fontSize: 11.5, fontWeight: '800' } as const;

export function TxnLedgerHeader() {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 11,
        paddingHorizontal: 14,
        backgroundColor: P.surfaceAlt,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderColor: P.border,
      }}
    >
      <Text style={{ ...cell, flex: TXN_COL.receipt }}>RECEIPT</Text>
      <Text style={{ ...cell, flex: TXN_COL.timestamp }}>TIMESTAMP</Text>
      <Text style={{ ...cell, flex: TXN_COL.items }}>LINE ITEMS</Text>
      <Text style={{ ...cell, flex: TXN_COL.tender }}>TENDER</Text>
      <Text style={{ ...cell, flex: TXN_COL.total, textAlign: 'right' }}>TOTAL (៛ KHR)</Text>
      <Text style={{ ...cell, flex: TXN_COL.usd, textAlign: 'right' }}>USD ($)</Text>
    </View>
  );
}
