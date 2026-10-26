import { Text, View } from 'react-native';
import { Edit3, Trash2 } from 'lucide-react-native';
import { Product } from '../../api';
import { khr, money } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';
import { INV_COL } from './columns';

export function InventoryRow({
  product,
  rate,
  onRestock,
  onEdit,
  onArchive,
}: {
  product: Product;
  rate: number;
  onRestock?: (product: Product, delta: number) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
}) {
  const isLow = product.stock <= product.lowStockThreshold;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderColor: P.border,
      }}
    >
      <View style={{ flex: INV_COL.product }}>
        <Text style={{ color: P.text, fontWeight: '700', fontSize: 14 }}>{product.name}</Text>
        <Text style={{ color: P.muted, fontSize: 11.5, marginTop: 2 }}>
          {product.barcode ? `SKU: ${product.barcode}` : 'No Barcode'}
          {product.expirationDate ? ` · Exp: ${product.expirationDate}` : ''}
        </Text>
      </View>

      <View style={{ flex: INV_COL.category }}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: P.surfaceAlt,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700' }}>
            {product.category}
          </Text>
        </View>
      </View>

      <Text
        style={{
          flex: INV_COL.price,
          color: P.primary,
          fontWeight: '800',
          fontSize: 14.5,
          textAlign: 'right',
        }}
      >
        {khr(product.priceUsd * rate)}
      </Text>

      <Text
        style={{
          flex: INV_COL.usd,
          color: P.muted,
          fontWeight: '600',
          fontSize: 12.5,
          textAlign: 'right',
        }}
      >
        {money(product.priceUsd)}
      </Text>

      <View style={{ flex: INV_COL.stock, alignItems: 'center' }}>
        <View
          style={{
            backgroundColor:
              product.stock === 0 ? P.roseLight : isLow ? P.amberLight : P.emeraldLight,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 99,
          }}
        >
          <Text
            style={{
              color: product.stock === 0 ? P.rose : isLow ? P.amber : P.emerald,
              fontWeight: '800',
              fontSize: 12,
            }}
          >
            {product.stock} units
          </Text>
        </View>
      </View>

      <View
        style={{
          flex: INV_COL.actions,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Press
          onPress={() => onEdit(product)}
          style={{
            backgroundColor: P.surfaceAlt,
            borderWidth: 1,
            borderColor: P.border,
            padding: 7,
            borderRadius: 7,
          }}
        >
          <Edit3 size={14} color={P.textSub} />
        </Press>
        <Press
          onPress={() => onArchive(product)}
          style={{
            backgroundColor: P.roseLight,
            padding: 7,
            borderRadius: 7,
          }}
        >
          <Trash2 size={14} color={P.rose} />
        </Press>
      </View>
    </View>
  );
}
