import { isProductExpired } from '../../productExpiry';
import { AppText as Text } from '../../components/AppText';
import { View } from 'react-native';
import { Product } from '../../api';
import { khr, money } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';

export function PosProductTile({
  product: p,
  rate,
  quantityInCart,
  isCompact,
  onAdd,
}: {
  product: Product;
  rate: number;
  quantityInCart: number;
  isCompact: boolean;
  onAdd: (product: Product, delta: number) => void;
}) {
  const expired = isProductExpired(p);
  const outOfStock = p.stock <= 0 || expired;

  return (
    <Press
      disabled={outOfStock}
      onPress={() => onAdd(p, 1)}
      style={{
        width: isCompact ? '48%' : '31.5%',
        minWidth: 170,
        backgroundColor: quantityInCart ? P.primaryLight : P.surfaceAlt,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1.5,
        borderColor: quantityInCart ? P.primary : P.border,
        opacity: outOfStock ? 0.5 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ color: P.muted, fontSize: 11, fontWeight: '700' }}>{expired ? 'ផុតកំណត់ · Expired' : p.category}</Text>
        {quantityInCart > 0 && (
          <View
            style={{
              backgroundColor: P.primary,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 99,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
              ×{quantityInCart}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={{ color: P.text, fontWeight: '800', fontSize: 14.5, marginTop: 6 }}
        numberOfLines={1}
      >
        {p.name}
      </Text>
      <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 2 }}>{p.barcode || 'No barcode'}</Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 12,
        }}
      >
        <View>
          <Text style={{ color: P.primary, fontWeight: '800', fontSize: 16 }}>
            {khr(p.priceUsd * rate)}
          </Text>
          <Text style={{ color: P.muted, fontSize: 11.5, fontWeight: '600' }}>
            {money(p.priceUsd)}
          </Text>
        </View>
        <Text
          style={{
            color: outOfStock ? P.rose : p.stock <= p.lowStockThreshold ? P.amber : P.emerald,
            fontSize: 11.5,
            fontWeight: '700',
          }}
        >
          {outOfStock ? 'Out' : `${p.stock} in stock`}
        </Text>
      </View>
    </Press>
  );
}
