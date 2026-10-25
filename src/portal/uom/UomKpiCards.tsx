import { Text, View } from 'react-native';
import { Product } from '../../api';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

const card = {
  flex: 1,
  minWidth: 180,
  backgroundColor: P.surfaceAlt,
  borderRadius: 12,
  padding: 14,
  borderWidth: 1,
  borderColor: P.border,
} as const;

export function UomKpiCards({ products, tr }: { products: Product[]; tr: PortalController['tr'] }) {
  const wholesaleCount = products.filter((p) => Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0))
    .length;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <View style={card}>
        <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
          {tr('Wholesale Configured', 'បានកំណត់លក់ដុំ')}
        </Text>
        <Text style={{ color: P.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
          {wholesaleCount} / {products.length}
        </Text>
        <Text style={{ color: P.emerald, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
          {products.length > 0
            ? `${Math.round((wholesaleCount / products.length) * 100)}% coverage`
            : '0%'}
        </Text>
      </View>

      <View style={card}>
        <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
          {tr('Standard Cases (24x / 12x)', 'កេសស្ដង់ដារ (២៤x / ១២x)')}
        </Text>
        <Text style={{ color: P.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
          {products.filter((p) => (p.caseQty || 24) === 24 || (p.caseQty || 24) === 12).length}
        </Text>
        <Text style={{ color: P.muted, fontSize: 11, marginTop: 2 }}>
          {tr('Standard beverage / grocery cases', 'កេសភេសជ្ជៈ & គ្រឿងទេស')}
        </Text>
      </View>

      <View style={card}>
        <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' }}>
          {tr('Total Stock in Master Cases', 'ស្តុកសរុបគិតជាកេស')}
        </Text>
        <Text style={{ color: P.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
          {products.reduce((acc, p) => acc + Math.floor(p.stock / (p.caseQty || 24)), 0)}{' '}
          {tr('cases', 'កេស')}
        </Text>
        <Text style={{ color: P.textSub, fontSize: 11, marginTop: 2 }}>
          +{products.reduce((acc, p) => acc + (p.stock % (p.caseQty || 24)), 0)}{' '}
          {tr('loose units', 'ឯកតារាយ')}
        </Text>
      </View>
    </View>
  );
}
