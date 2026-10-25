import { Text, View } from 'react-native';
import { Layers, ShoppingBag } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { CartTotalsBox } from './CartTotalsBox';
import { CheckoutButton } from './CheckoutButton';
import { RetailCartTable } from './RetailCartTable';
import { TenderSelector } from './TenderSelector';
import { WholesaleCartTable } from './WholesaleCartTable';

export function PosCartColumn({ portal }: { portal: PortalController }) {
  const {
    addToCart,
    addWholesaleItem,
    cartLines,
    cartTotalKhr,
    cartTotalUsd,
    checkingOut,
    completeCheckout,
    paidCurrency,
    posMode,
    rate,
    removeRetailItem,
    removeWholesaleItem,
    setCart,
    setPaidCurrency,
    setWholesaleCart,
    tr,
    wholesaleCartLines,
    wholesaleTotalCases,
    wholesaleTotalKhr,
    wholesaleTotalLoose,
    wholesaleTotalSavingsKhr,
    wholesaleTotalSavingsUsd,
    wholesaleTotalUsd,
  } = portal;

  const isWholesale = posMode === 'wholesale';
  const lineCount = isWholesale ? wholesaleCartLines.length : cartLines.length;

  return (
    <View
      style={{
        flex: 1.3,
        width: '100%',
        backgroundColor: P.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: P.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: P.primaryLight, padding: 8, borderRadius: 10 }}>
            {isWholesale ? (
              <Layers size={18} color={P.primary} />
            ) : (
              <ShoppingBag size={18} color={P.primary} />
            )}
          </View>
          <View>
            <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
              {isWholesale
                ? tr('Wholesale Checkout Table', 'វិក្កយបត្រលក់ដុំ (UOM)')
                : tr('Retail Checkout Table', 'វិក្កយបត្រលក់រាយ')}
            </Text>
            <Text style={{ color: P.muted, fontSize: 12 }}>
              {isWholesale
                ? `${wholesaleCartLines.length} ${tr('wholesale line items', 'មុខទំនិញដុំ')}`
                : `${cartLines.length} ${tr('retail line items', 'មុខទំនិញរាយ')}`}
            </Text>
          </View>
        </View>

        {lineCount > 0 && (
          <Press onPress={() => (isWholesale ? setWholesaleCart({}) : setCart({}))}>
            <Text style={{ color: P.rose, fontSize: 12.5, fontWeight: '700' }}>
              {tr('Clear All', 'សម្អាត')}
            </Text>
          </Press>
        )}
      </View>

      {isWholesale ? (
        <WholesaleCartTable
          lines={wholesaleCartLines}
          rate={rate}
          totalCases={wholesaleTotalCases}
          totalLoose={wholesaleTotalLoose}
          savingsUsd={wholesaleTotalSavingsUsd}
          savingsKhr={wholesaleTotalSavingsKhr}
          onAdd={(product, delta, unitType) => addWholesaleItem(product, delta, unitType)}
          onRemove={removeWholesaleItem}
          tr={tr}
        />
      ) : (
        <RetailCartTable
          lines={cartLines}
          rate={rate}
          onAdd={addToCart}
          onRemove={removeRetailItem}
          tr={tr}
        />
      )}

      <TenderSelector currency={paidCurrency} onChange={setPaidCurrency} />

      <CartTotalsBox
        totalKhr={isWholesale ? wholesaleTotalKhr : cartTotalKhr}
        totalUsd={isWholesale ? wholesaleTotalUsd : cartTotalUsd}
        rate={rate}
        tr={tr}
      />

      <CheckoutButton
        disabled={lineCount === 0 || checkingOut}
        busy={checkingOut}
        active={lineCount > 0}
        label={
          isWholesale
            ? tr(
                'Complete Wholesale Checkout & Issue Receipt',
                'បញ្ចប់ការលក់ដុំ និងចេញវិក្កយបត្រ'
              )
            : tr('Complete Retail Checkout & Issue Receipt', 'បញ្ចប់ការលក់រាយ និងចេញវិក្កយបត្រ')
        }
        onPress={() => void completeCheckout()}
      />
    </View>
  );
}
