import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import { Product } from '../../api';
import { khr, money } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function RetailCartTable({
  lines,
  rate,
  onAdd,
  onSetQty,
  onRemove,
  tr,
}: {
  lines: PortalController['cartLines'];
  rate: number;
  onAdd: (product: Product, delta: number) => void;
  onSetQty?: (product: Product, targetQty: number) => void;
  onRemove: (productId: string) => void;
  tr: PortalController['tr'];
}) {
  if (lines.length === 0) {
    return (
      <View style={{ paddingVertical: 48, alignItems: 'center' }}>
        <ShoppingCart size={36} color={P.borderStrong} />
        <Text
          style={{
            color: P.muted,
            marginTop: 10,
            fontWeight: '600',
            fontSize: 13.5,
            textAlign: 'center',
          }}
        >
          {tr(
            'Scan items with your barcode scanner or click products on the left',
            'ស្កេនទំនិញដោយម៉ាស៊ីនស្កេនបាកូដ ឬចុចជ្រើសរើសទំនិញនៅខាងឆ្វេង'
          )}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 8,
          backgroundColor: P.surfaceAlt,
          borderRadius: 8,
          marginBottom: 6,
        }}
      >
        <Text style={{ width: 24, color: P.muted, fontSize: 11, fontWeight: '800' }}>#</Text>
        <Text style={{ flex: 1.8, color: P.muted, fontSize: 11, fontWeight: '800' }}>
          {tr('ITEM', 'ទំនិញ')}
        </Text>
        <Text style={{ flex: 1.1, color: P.muted, fontSize: 11, fontWeight: '800' }}>
          {tr('UNIT (៛)', 'តម្លៃរាយ')}
        </Text>
        <Text
          style={{
            width: 88,
            textAlign: 'center',
            color: P.muted,
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {tr('QTY', 'ចំនួន')}
        </Text>
        <Text
          style={{
            flex: 1.2,
            textAlign: 'right',
            color: P.muted,
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {tr('TOTAL (៛)', 'សរុប')}
        </Text>
        <Text
          style={{
            width: 28,
            textAlign: 'center',
            color: P.muted,
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {' '}
        </Text>
      </View>

      <ScrollView style={{ maxHeight: 320 }}>
        {lines.map(({ product, qty }, idx) => (
          <View
            key={product.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 9,
              paddingHorizontal: 8,
              borderBottomWidth: 1,
              borderColor: P.border,
              backgroundColor: idx % 2 === 0 ? P.surface : P.surfaceAlt,
            }}
          >
            <Text style={{ width: 24, color: P.muted, fontSize: 11, fontWeight: '700' }}>
              {idx + 1}
            </Text>
            <View style={{ flex: 1.8, paddingRight: 6 }}>
              <Text style={{ color: P.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                {product.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text
                  style={{
                    color: product.stock <= 5 ? P.rose : P.muted,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {tr('Stock', 'ស្តុក')}: {product.stock} {product.baseUnit || ''}
                </Text>
                {qty > product.stock && (
                  <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>
                      {tr('Over by', 'លើស')} {qty - product.stock}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ flex: 1.1 }}>
              <Text style={{ color: P.text, fontWeight: '700', fontSize: 12.5 }}>
                {khr(product.priceUsd * rate)}
              </Text>
              <Text style={{ color: P.muted, fontSize: 10.5 }}>{money(product.priceUsd)}</Text>
            </View>
            <View
              style={{
                width: 88,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Press
                onPress={() => onAdd(product, -1)}
                style={{
                  width: 25,
                  height: 25,
                  borderRadius: 6,
                  backgroundColor: P.surface,
                  borderWidth: 1,
                  borderColor: P.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={13} color={P.text} />
              </Press>
              <TextInput
                value={String(qty)}
                onChangeText={(txt) => {
                  const cleaned = txt.replace(/\D/g, '');
                  if (!cleaned) return;
                  const val = parseInt(cleaned, 10);
                  if (onSetQty) onSetQty(product, val);
                  else onAdd(product, val - qty);
                }}
                keyboardType="number-pad"
                style={{
                  minWidth: 32,
                  height: 25,
                  textAlign: 'center',
                  fontWeight: '800',
                  color: P.text,
                  fontSize: 12.5,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: P.border,
                  borderRadius: 6,
                  paddingHorizontal: 2,
                  paddingVertical: 0,
                  ...(Platform.OS === 'web' ? { outline: 'none' as any } : {}),
                }}
              />
              <Press
                onPress={() => onAdd(product, 1)}
                style={{
                  width: 25,
                  height: 25,
                  borderRadius: 6,
                  backgroundColor: P.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={13} color="#FFFFFF" />
              </Press>
            </View>
            <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
              <Text style={{ color: P.primary, fontWeight: '800', fontSize: 13.5 }}>
                {khr(product.priceUsd * qty * rate)}
              </Text>
              <Text style={{ color: P.muted, fontSize: 10.5 }}>
                {money(product.priceUsd * qty)}
              </Text>
            </View>
            <Press
              onPress={() => onRemove(product.id)}
              style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={13} color={P.rose} />
            </Press>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
