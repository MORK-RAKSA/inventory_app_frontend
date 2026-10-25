import { Text, View } from 'react-native';
import { Product } from '../../api';
import { khr, money } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';

export function PosWholesaleTile({
  product: p,
  rate,
  cartState,
  isCompact,
  onAdd,
}: {
  product: Product;
  rate: number;
  cartState: { cases: number; loose: number };
  isCompact: boolean;
  onAdd: (product: Product, delta: number, unitType: 'case' | 'loose') => void;
}) {
  const outOfStock = p.stock <= 0;
  const cQty = p.caseQty || 24;
  const caseName = p.caseUnitName || 'Case';
  const baseName = p.baseUnit || 'pcs';
  const unitWholesaleUsd =
    p.wholesalePriceUsd && p.wholesalePriceUsd > 0 ? p.wholesalePriceUsd : p.priceUsd;
  const casePriceUsd =
    p.wholesalePricePerCaseUsd && p.wholesalePricePerCaseUsd > 0
      ? p.wholesalePricePerCaseUsd
      : unitWholesaleUsd * cQty;
  const casesInStock = Math.floor(p.stock / cQty);
  const looseInStock = p.stock % cQty;
  const hasCart = cartState.cases > 0 || cartState.loose > 0;

  return (
    <View
      style={{
        width: isCompact ? '48%' : '31.5%',
        minWidth: 175,
        backgroundColor: hasCart ? P.primaryLight : P.surfaceAlt,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1.5,
        borderColor: hasCart ? P.primary : P.border,
        opacity: outOfStock ? 0.5 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ backgroundColor: P.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: P.primary, fontSize: 10.5, fontWeight: '800' }}>
            1 {caseName} = {cQty} {baseName}
          </Text>
        </View>
        {hasCart && (
          <View
            style={{
              backgroundColor: P.primary,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 99,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
              {cartState.cases}c + {cartState.loose}u
            </Text>
          </View>
        )}
      </View>

      <Text
        style={{ color: P.text, fontWeight: '800', fontSize: 14, marginTop: 6 }}
        numberOfLines={1}
      >
        {p.name}
      </Text>
      <Text style={{ color: P.muted, fontSize: 11, marginTop: 1 }}>{p.barcode || 'No barcode'}</Text>

      <View style={{ marginTop: 8 }}>
        <Text style={{ color: P.primary, fontWeight: '800', fontSize: 15.5 }}>
          {khr(casePriceUsd * rate)}
          <Text style={{ fontSize: 11, fontWeight: '600', color: P.muted }}> / {caseName}</Text>
        </Text>
        <Text style={{ color: P.textSub, fontSize: 11, marginTop: 1 }}>
          {khr(unitWholesaleUsd * rate)} / {baseName} ({money(casePriceUsd)})
        </Text>
      </View>

      <Text
        style={{
          color: outOfStock ? P.rose : casesInStock <= 1 ? P.amber : P.emerald,
          fontSize: 11,
          fontWeight: '700',
          marginTop: 6,
        }}
      >
        {outOfStock ? 'Out of stock' : `${casesInStock} ${caseName}s + ${looseInStock} ${baseName}`}
      </Text>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        <Press
          disabled={outOfStock}
          onPress={() => onAdd(p, 1, 'case')}
          style={{
            flex: 1.2,
            backgroundColor: P.primary,
            borderRadius: 7,
            paddingVertical: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>+ 1 {caseName}</Text>
        </Press>
        <Press
          disabled={outOfStock}
          onPress={() => onAdd(p, 1, 'loose')}
          style={{
            flex: 1,
            backgroundColor: P.surface,
            borderWidth: 1,
            borderColor: P.borderStrong,
            borderRadius: 7,
            paddingVertical: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: P.text, fontSize: 11.5, fontWeight: '700' }}>+ 1 {baseName}</Text>
        </Press>
      </View>
    </View>
  );
}
