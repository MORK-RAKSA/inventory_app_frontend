import { Text, View } from 'react-native';
import { Layers, Plus } from 'lucide-react-native';
import { Product } from '../../api';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function UomHeader({
  products,
  onCreateUomProduct,
  tr,
}: {
  products: Product[];
  onCreateUomProduct: () => void;
  tr: PortalController['tr'];
}) {
  const wholesaleCount = products.filter((p) => Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0))
    .length;

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
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Layers size={22} color={P.primary} />
          <Text style={{ color: P.text, fontSize: 18, fontWeight: '800' }}>
            {tr('Packaging Units & Wholesale UOM', 'ឯកតាកញ្ចប់ទំនិញ & លក់ដុំ UOM')}
          </Text>
          <View
            style={{
              backgroundColor: P.primaryLight,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 99,
            }}
          >
            <Text style={{ color: P.primary, fontSize: 11, fontWeight: '800' }}>
              {wholesaleCount} {tr('Wholesale Active', 'ទំនិញលក់ដុំ')}
            </Text>
          </View>
        </View>
        <Text style={{ color: P.muted, fontSize: 13, marginTop: 4 }}>
          {tr(
            'Enterprise multi-level packaging hierarchies: configure base unit vs wholesale master cases (e.g. Case of 24, Pack of 6) and bulk tier discounts.',
            'គ្រប់គ្រងអនុបាតឯកតាកញ្ចប់លក់ដុំ៖ កំណត់ឯកតាមូលដ្ឋាន និងកេស/កញ្ចប់លក់ដុំ (ឧ. កេស ២៤កំប៉ុង កញ្ចប់ ៦ដប) និងតម្លៃលក់ដុំ'
          )}
        </Text>
      </View>

      <Press
        onPress={onCreateUomProduct}
        style={{
          backgroundColor: P.primary,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
        }}
      >
        <Plus size={16} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
          {tr('New UOM Product', 'បង្កើតទំនិញ UOM ថ្មី')}
        </Text>
      </Press>
    </View>
  );
}
