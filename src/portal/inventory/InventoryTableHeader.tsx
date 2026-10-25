import { Text, View } from 'react-native';
import { P } from '../theme';
import { INV_COL } from './columns';

const cell = { color: P.muted, fontSize: 11.5, fontWeight: '800' } as const;

export function InventoryTableHeader() {
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
      <Text style={{ ...cell, flex: INV_COL.product }}>PRODUCT & BARCODE</Text>
      <Text style={{ ...cell, flex: INV_COL.category }}>CATEGORY</Text>
      <Text style={{ ...cell, flex: INV_COL.price, textAlign: 'right' }}>PRICE (៛ KHR)</Text>
      <Text style={{ ...cell, flex: INV_COL.usd, textAlign: 'right' }}>USD ($)</Text>
      <Text style={{ ...cell, flex: INV_COL.stock, textAlign: 'center' }}>STOCK</Text>
      <Text style={{ ...cell, flex: INV_COL.actions, textAlign: 'right' }}>QUICK ACTIONS</Text>
    </View>
  );
}
