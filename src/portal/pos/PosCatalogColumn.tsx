import { ScrollView, Text, TextInput, View } from 'react-native';
import { Barcode, X } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { PosProductTile } from './PosProductTile';
import { PosWholesaleTile } from './PosWholesaleTile';

export function PosCatalogColumn({ portal }: { portal: PortalController }) {
  const {
    addToCart,
    addWholesaleItem,
    cart,
    categories,
    filteredPosProducts,
    handleHardwareBarcodeScan,
    isCompact,
    posCat,
    posMode,
    posSearch,
    products,
    rate,
    setPosCat,
    setPosSearch,
    toast,
    tr,
    wholesaleCart,
  } = portal;

  return (
    <View
      style={{
        flex: 1.5,
        width: '100%',
        backgroundColor: P.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: P.border,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: P.surfaceAlt,
            borderWidth: 1.5,
            borderColor: P.borderStrong,
            borderRadius: 10,
            paddingHorizontal: 13,
            height: 46,
            gap: 8,
          }}
        >
          <Barcode size={18} color={P.primary} />
          <TextInput
            value={posSearch}
            onChangeText={setPosSearch}
            placeholder={
              posMode === 'wholesale'
                ? tr(
                    'Scan barcode or search to ring up Wholesale Cases + Units...',
                    'ស្កេនបាកូដ ឬស្វែងរកដើម្បីលក់ដុំជាកេស & ឯកតារាយ...'
                  )
                : tr(
                    'Scan with barcode scanner or type product name + Enter...',
                    'ស្កេនដោយម៉ាស៊ីនស្កេនបាកូដ ឬវាយឈ្មោះទំនិញ...'
                  )
            }
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={() => {
              const q = posSearch.trim();
              if (!q) return;
              const exact = products.find((p) => (p.barcode || '').toLowerCase() === q.toLowerCase());
              if (exact) {
                addToCart(exact, 1);
                setPosSearch('');
                toast.show(`Added ${exact.name}`, {
                  title: tr('Added to cart', 'បានដាក់ក្នុងកន្ត្រក'),
                  tone: 'success',
                });
              } else {
                void handleHardwareBarcodeScan(q);
                setPosSearch('');
              }
            }}
            style={{ flex: 1, color: P.text, fontSize: 14, height: '100%' }}
          />
          {posSearch ? (
            <Press onPress={() => setPosSearch('')}>
              <X size={16} color={P.muted} />
            </Press>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
      >
        {categories.map((c) => {
          const active = posCat === c;
          return (
            <Press
              key={c}
              onPress={() => setPosCat(c)}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 7,
                borderRadius: 99,
                backgroundColor: active ? P.primary : P.surfaceAlt,
                borderWidth: 1,
                borderColor: active ? P.primary : P.border,
              }}
            >
              <Text
                style={{
                  color: active ? '#FFFFFF' : P.textSub,
                  fontSize: 12.5,
                  fontWeight: '700',
                }}
              >
                {c}
              </Text>
            </Press>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {filteredPosProducts.map((p) =>
          posMode === 'wholesale' ? (
            <PosWholesaleTile
              key={p.id}
              product={p}
              rate={rate}
              cartState={wholesaleCart[p.id] || { cases: 0, loose: 0 }}
              isCompact={isCompact}
              onAdd={(product, delta, unitType) => addWholesaleItem(product, delta, unitType)}
            />
          ) : (
            <PosProductTile
              key={p.id}
              product={p}
              rate={rate}
              quantityInCart={cart[p.id] || 0}
              isCompact={isCompact}
              onAdd={addToCart}
            />
          )
        )}
      </View>
    </View>
  );
}
