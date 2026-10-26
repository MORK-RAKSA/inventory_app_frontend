import { useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { Check, Layers, ShoppingBag, Trash2 } from 'lucide-react-native';
import { Press } from '../../motion';
import { khr, money } from '../../theme';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { RetailCartTable } from './RetailCartTable';
import { WholesaleCartTable } from './WholesaleCartTable';
import { CashTenderModal } from '../../components/CashTenderModal';

export function PosCartColumn({ portal }: { portal: PortalController }) {
  const [showTenderModal, setShowTenderModal] = useState(false);
  const {
    addToCart,
    setRetailQty,
    setWholesaleQty,
    addWholesaleItem,
    cartLines,
    cartTotalKhr,
    cartTotalUsd,
    checkingOut,
    completeCheckout,
    isCompact,
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
  const totalKhr = isWholesale ? wholesaleTotalKhr : cartTotalKhr;
  const totalUsd = isWholesale ? wholesaleTotalUsd : cartTotalUsd;

  return (
    <View
      style={{
        flex: 1.3,
        width: '100%',
        backgroundColor: P.surface,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: P.border,
        ...(Platform.OS === 'web' && !isCompact
          ? {
              position: 'sticky' as any,
              top: 20,
              maxHeight: 'calc(100vh - 40px)' as any,
              display: 'flex' as any,
              flexDirection: 'column',
            }
          : {}),
      }}
    >
      {/* Header Row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
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
                ? tr('Wholesale Checkout', 'វិក្កយបត្រលក់ដុំ (UOM)')
                : tr('Retail Checkout', 'វិក្កយបត្រលក់រាយ')}
            </Text>
            <Text style={{ color: P.muted, fontSize: 12 }}>
              {isWholesale
                ? `${wholesaleCartLines.length} ${tr('line items', 'មុខទំនិញដុំ')}`
                : `${cartLines.length} ${tr('line items', 'មុខទំនិញរាយ')}`}
            </Text>
          </View>
        </View>

        {lineCount > 0 && (
          <Press
            onPress={() => (isWholesale ? setWholesaleCart({}) : setCart({}))}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: '#FFF1F2',
            }}
          >
            <Trash2 size={13} color={P.rose} />
            <Text style={{ color: P.rose, fontSize: 12, fontWeight: '700' }}>
              {tr('Clear All', 'សម្អាត')}
            </Text>
          </Press>
        )}
      </View>

      {/* Cart Items Area */}
      <View
        style={{
          flex: 1,
          minHeight: 160,
          ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : {}),
        }}
      >
        {isWholesale ? (
          <WholesaleCartTable
            lines={wholesaleCartLines}
            rate={rate}
            totalCases={wholesaleTotalCases}
            totalLoose={wholesaleTotalLoose}
            savingsUsd={wholesaleTotalSavingsUsd}
            savingsKhr={wholesaleTotalSavingsKhr}
            onAdd={(product, delta, unitType) => addWholesaleItem(product, delta, unitType)}
            onSetQty={(product, targetQty, unitType) => setWholesaleQty(product, targetQty, unitType)}
            onRemove={removeWholesaleItem}
            tr={tr}
          />
        ) : (
          <RetailCartTable
            lines={cartLines}
            rate={rate}
            onAdd={addToCart}
            onSetQty={(product, targetQty) => setRetailQty(product, targetQty)}
            onRemove={removeRetailItem}
            tr={tr}
          />
        )}
      </View>

      {/* Pinned Fixed Bottom Checkout Card */}
      <View
        style={{
          marginTop: 'auto',
          paddingTop: 12,
          borderTopWidth: 1,
          borderColor: P.border,
          gap: 10,
        }}
      >
        {/* Currency Switcher & Rate Badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: P.surfaceAlt,
            padding: 3,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: P.border,
          }}
        >
          <View style={{ flexDirection: 'row', flex: 1, gap: 4 }}>
            {(['KHR', 'USD'] as const).map((ccy) => {
              const active = paidCurrency === ccy;
              return (
                <Press
                  key={ccy}
                  onPress={() => setPaidCurrency(ccy)}
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: active ? P.primary : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: active ? '#FFFFFF' : P.textSub,
                    }}
                  >
                    {ccy === 'KHR' ? '៛ Pay in KHR' : '$ Pay in USD'}
                  </Text>
                </Press>
              );
            })}
          </View>
          <View style={{ paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: P.muted }}>
              1$ = {khr(rate)}
            </Text>
          </View>
        </View>

        {/* Grand Total Summary Box */}
        <View
          style={{
            backgroundColor: P.deep,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#4B3FA8',
            shadowOpacity: 0.18,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <View>
            <Text
              style={{
                color: '#C9BFF6',
                fontSize: 10.5,
                fontWeight: '800',
                letterSpacing: 0.5,
              }}
            >
              {tr('TOTAL DUE', 'សរុបត្រូវបង់')}
            </Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 26,
                fontWeight: '900',
                letterSpacing: -0.6,
                marginTop: 2,
              }}
            >
              {khr(totalKhr)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#9CE7C4', fontSize: 16, fontWeight: '800' }}>
              {money(totalUsd)} USD
            </Text>
            {isWholesale && wholesaleTotalSavingsUsd > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(156, 231, 196, 0.2)',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  marginTop: 3,
                }}
              >
                <Text style={{ color: '#9CE7C4', fontSize: 10.5, fontWeight: '800' }}>
                  {tr('Save', 'សន្សំ')} {khr(wholesaleTotalSavingsKhr)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Primary Checkout Button */}
        <Press
          disabled={lineCount === 0 || checkingOut}
          onPress={() => setShowTenderModal(true)}
          style={{
            height: 48,
            borderRadius: 12,
            backgroundColor: lineCount > 0 ? P.primary : P.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {checkingOut ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Check size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' }}>
                {isWholesale
                  ? tr('Complete Wholesale Checkout', 'បញ្ចប់ការលក់ដុំ & ចេញវិក្កយបត្រ')
                  : tr('Complete Retail Checkout', 'បញ្ចប់ការលក់រាយ & ចេញវិក្កយបត្រ')}
              </Text>
            </>
          )}
        </Press>
      </View>

      <CashTenderModal
        visible={showTenderModal}
        totalKhr={totalKhr}
        totalUsd={totalUsd}
        rate={rate}
        busy={checkingOut}
        onClose={() => setShowTenderModal(false)}
        onConfirm={(tender) => {
          setShowTenderModal(false);
          void completeCheckout(tender);
        }}
      />
    </View>
  );
}
