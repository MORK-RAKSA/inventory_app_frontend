import { AppText as Text } from '../../components/AppText';
import { View } from 'react-native';
import { Product } from '../../api';
import { khr, money, roundKhr } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { UOM_COL } from './columns';

export function UomProductRow({
  product: p,
  rate,
  onEdit,
  tr,
}: {
  product: Product;
  rate: number;
  onEdit: (product: Product) => void;
  tr: PortalController['tr'];
}) {
  const baseUnit = p.baseUnit || 'Piece';
  const caseUnit = p.caseUnitName || 'Case';
  const caseQty = p.caseQty || 1;
  const retailUnitKhr = roundKhr(p.priceUsd * rate);
  const retailFullCaseKhr = retailUnitKhr * caseQty;
  const hasWholesale = Boolean(p.wholesalePriceUsd && p.wholesalePriceUsd > 0);
  const wholesaleCaseKhr = hasWholesale ? roundKhr(Number(p.wholesalePriceUsd) * rate) : 0;
  const savingsKhr = hasWholesale ? retailFullCaseKhr - wholesaleCaseKhr : 0;
  const savingsPct =
    hasWholesale && retailFullCaseKhr > 0 ? Math.round((savingsKhr / retailFullCaseKhr) * 100) : 0;
  const casesInStock = Math.floor(p.stock / caseQty);
  const looseInStock = p.stock % caseQty;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderColor: P.border,
      }}
    >
      <View style={{ flex: UOM_COL.product, paddingRight: 8 }}>
        <Text style={{ color: P.text, fontSize: 13.5, fontWeight: '700' }} numberOfLines={1}>
          {p.name}
        </Text>
        <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 2 }}>
          {p.barcode || '—'} · {p.category || 'General'}
        </Text>
      </View>

      <View style={{ flex: UOM_COL.baseUnit }}>
        <View
          style={{
            backgroundColor: P.surfaceAlt,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ color: P.text, fontSize: 11.5, fontWeight: '700' }}>1 {baseUnit}</Text>
        </View>
        <Text style={{ color: P.textSub, fontSize: 11.5, marginTop: 3 }}>{khr(retailUnitKhr)}</Text>
      </View>

      <View style={{ flex: UOM_COL.master }}>
        <View
          style={{
            backgroundColor: P.primaryLight,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ color: P.primary, fontSize: 11.5, fontWeight: '800' }}>
            {caseUnit} = {caseQty} {baseUnit}s
          </Text>
        </View>
        <Text style={{ color: P.muted, fontSize: 11, marginTop: 3 }}>
          {tr('Min order:', 'កុម្ម៉ង់ទាបបំផុត៖')} {p.wholesaleMinQty || 1} {caseUnit}
        </Text>
      </View>

      <View style={{ flex: UOM_COL.wholesalePrice }}>
        {hasWholesale ? (
          <>
            <Text style={{ color: P.emerald, fontSize: 13, fontWeight: '800' }}>
              {khr(wholesaleCaseKhr)}
            </Text>
            <Text style={{ color: P.muted, fontSize: 11 }}>
              {money(p.wholesalePriceUsd || 0)} / {caseUnit}
            </Text>
          </>
        ) : (
          <View
            style={{
              backgroundColor: P.surfaceAlt,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 5,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: P.muted, fontSize: 11, fontStyle: 'italic' }}>
              {tr('Not set', 'មិនទាន់កំណត់')}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flex: UOM_COL.savings }}>
        {hasWholesale && savingsPct > 0 ? (
          <View
            style={{
              backgroundColor: P.emeraldLight,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 6,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: P.emerald, fontSize: 11, fontWeight: '800' }}>
              save {savingsPct}% ({khr(savingsKhr)})
            </Text>
          </View>
        ) : (
          <Text style={{ color: P.muted, fontSize: 11 }}>—</Text>
        )}
      </View>

      <View style={{ flex: UOM_COL.stock }}>
        <Text style={{ color: P.text, fontSize: 12, fontWeight: '700' }}>
          {casesInStock} {caseUnit}s + {looseInStock} {baseUnit}s
        </Text>
        <Text style={{ color: P.muted, fontSize: 11, marginTop: 1 }}>
          ({p.stock} total {baseUnit}s)
        </Text>
      </View>

      <View style={{ flex: UOM_COL.action, alignItems: 'flex-end' }}>
        <Press
          onPress={() => onEdit(p)}
          style={{
            backgroundColor: hasWholesale ? P.surfaceAlt : P.primaryLight,
            borderWidth: 1,
            borderColor: hasWholesale ? P.border : P.primary,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 7,
          }}
        >
          <Text
            style={{
              color: hasWholesale ? P.text : P.primary,
              fontSize: 11.5,
              fontWeight: '800',
            }}
          >
            {hasWholesale ? tr('Edit UOM', 'កែ UOM') : tr('Configure', 'កំណត់')}
          </Text>
        </Press>
      </View>
    </View>
  );
}
