import { Text, View } from 'react-native';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { UOM_COL } from './columns';

export function UomTableHeader({ tr }: { tr: PortalController['tr'] }) {
  const cell = {
    color: P.muted,
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  } as const;

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: P.surfaceAlt,
        borderRadius: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ ...cell, flex: UOM_COL.product }}>{tr('Product / Barcode', 'ទំនិញ / បាកូដ')}</Text>
      <Text style={{ ...cell, flex: UOM_COL.baseUnit }}>
        {tr('Base Unit (Retail)', 'ឯកតារាយ (រាយ)')}
      </Text>
      <Text style={{ ...cell, flex: UOM_COL.master }}>
        {tr('Master Packaging (UOM)', 'ឯកតាកញ្ចប់ធំ (UOM)')}
      </Text>
      <Text style={{ ...cell, flex: UOM_COL.wholesalePrice }}>
        {tr('Wholesale Case Price', 'ថ្លៃលក់ដុំក្នុងមួយកេស')}
      </Text>
      <Text style={{ ...cell, flex: UOM_COL.savings }}>{tr('Unit Savings', 'ចំណេញ / ឯកតា')}</Text>
      <Text style={{ ...cell, flex: UOM_COL.stock }}>{tr('Current Stock', 'ស្តុកបច្ចុប្បន្ន')}</Text>
      <Text style={{ ...cell, flex: UOM_COL.action, textAlign: 'right' }}>
        {tr('Action', 'សកម្មភាព')}
      </Text>
    </View>
  );
}
