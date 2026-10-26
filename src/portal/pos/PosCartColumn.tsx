import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, TextInput, View } from 'react-native';
import {
  Banknote,
  Check,
  Coins,
  DollarSign,
  Layers,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import { Press } from '../../motion';
import { khr, money } from '../../theme';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';
import { RetailCartTable } from './RetailCartTable';
import { WholesaleCartTable } from './WholesaleCartTable';
import { CashTenderModal } from '../../components/CashTenderModal';
import { calculateCambodiaCashExchange, CambodiaCashExchange } from '../../exchangeRate';

export function PosCartColumn({ portal }: { portal: PortalController }) {
  const [showTenderModal, setShowTenderModal] = useState(false);
  const [tenderInput, setTenderInput] = useState('');
  const [tenderCurrency, setTenderCurrency] = useState<'KHR' | 'USD'>('KHR');
  const [selectedChangeMode, setSelectedChangeMode] = useState<'split' | 'allKhr'>('split');

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

  // Real-time Cambodian cash exchange calculation
  const numericTender = useMemo(() => {
    const raw = Number(tenderInput.replace(/,/g, '').trim());
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }, [tenderInput]);

  const exchange: CambodiaCashExchange | null = useMemo(() => {
    if (!numericTender || !totalKhr) return null;
    return calculateCambodiaCashExchange(numericTender, totalKhr, rate, tenderCurrency);
  }, [numericTender, totalKhr, rate, tenderCurrency]);

  const hasTender = numericTender > 0;
  const isPaidEnough = exchange ? exchange.isEnough : false;
  const formattedTender = hasTender
    ? tenderCurrency === 'KHR'
      ? `${khr(numericTender)}`
      : `$${numericTender.toFixed(2)}`
    : '';

  const quickKhrPresets = useMemo(() => {
    const list = [10000, 20000, 50000, 100000];
    if (totalKhr > 0 && !list.includes(totalKhr)) {
      return [totalKhr, ...list];
    }
    return list;
  }, [totalKhr]);

  const quickUsdPresets = useMemo(() => {
    const list = [5, 10, 20, 50, 100];
    const roundedUsd = Math.ceil(totalUsd);
    if (roundedUsd > 0 && !list.includes(roundedUsd)) {
      return [roundedUsd, ...list];
    }
    return list;
  }, [totalUsd]);

  const handleExecuteCheckout = () => {
    if (lineCount === 0 || checkingOut) return;

    if (hasTender && exchange && isPaidEnough) {
      void completeCheckout({
        tenderAmount: numericTender,
        tenderCurrency,
        exchange,
      });
      setTenderInput('');
    } else {
      void completeCheckout();
      setTenderInput('');
    }
  };

  return (
    <View
      style={{
        flex: 1.35,
        width: '100%',
        backgroundColor: P.surface,
        borderRadius: 16,
        padding: 16,
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
      {/* ────────────────── FIXED TOP SECTION ────────────────── */}
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: P.border,
          paddingBottom: 14,
          marginBottom: 12,
          gap: 10,
        }}
      >
        {/* Header Row: Title & Clear Cart */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
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
              onPress={() => {
                if (isWholesale) setWholesaleCart({});
                else setCart({});
                setTenderInput('');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: '#FFF1F2',
              }}
            >
              <Trash2 size={13} color={P.rose} />
              <Text style={{ color: P.rose, fontSize: 12, fontWeight: '700' }}>
                {tr('Clear', 'សម្អាត')}
              </Text>
            </Press>
          )}
        </View>

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
                  onPress={() => {
                    setPaidCurrency(ccy);
                    setTenderCurrency(ccy);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 6,
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

        {/* Grand Total Due Card (Fixed at Top) */}
        <View
          style={{
            backgroundColor: P.deep,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
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

        {/* Customer Paid Input & Real-Time Exchange Calculator */}
        <View
          style={{
            backgroundColor: P.surfaceAlt,
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: P.border,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Banknote size={15} color={P.primary} />
              <Text style={{ color: P.text, fontSize: 12, fontWeight: '800' }}>
                {tr('Customer Paid (Optional)', 'ប្រាក់អតិថិជនឲ្យ (គិតលុយអាប់)')}
              </Text>
            </View>

            {/* Currency toggle for payment */}
            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 6, padding: 1.5 }}>
              <Press
                onPress={() => setTenderCurrency('KHR')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 5,
                  backgroundColor: tenderCurrency === 'KHR' ? P.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: tenderCurrency === 'KHR' ? '#FFFFFF' : P.textSub,
                  }}
                >
                  ៛ KHR
                </Text>
              </Press>
              <Press
                onPress={() => setTenderCurrency('USD')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 5,
                  backgroundColor: tenderCurrency === 'USD' ? P.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: tenderCurrency === 'USD' ? '#FFFFFF' : P.textSub,
                  }}
                >
                  $ USD
                </Text>
              </Press>
            </View>
          </View>

          {/* Tender Input Box */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: P.border,
              paddingHorizontal: 10,
              height: 40,
            }}
          >
            <Text style={{ color: P.muted, fontWeight: '800', fontSize: 14, marginRight: 6 }}>
              {tenderCurrency === 'KHR' ? '៛' : '$'}
            </Text>
            <TextInput
              value={tenderInput}
              onChangeText={setTenderInput}
              placeholder={
                tenderCurrency === 'KHR'
                  ? tr('e.g. 50,000 Riel…', 'ឧ. ៥០,០០០ រៀល…')
                  : tr('e.g. 10.00 USD…', 'ឧ. ១០.០០ ដុល្លារ…')
              }
              placeholderTextColor={P.muted}
              keyboardType="numeric"
              style={[
                {
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '700',
                  color: P.text,
                  height: '100%',
                },
                Platform.OS === 'web' ? ({ outline: 'none' } as any) : null,
              ]}
            />
            {hasTender && (
              <Press onPress={() => setTenderInput('')} style={{ padding: 4 }}>
                <Text style={{ color: P.muted, fontSize: 12, fontWeight: '800' }}>✕</Text>
              </Press>
            )}
          </View>

          {/* Quick preset amount pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(tenderCurrency === 'KHR' ? quickKhrPresets : quickUsdPresets).map((val) => (
              <Press
                key={val}
                onPress={() => setTenderInput(String(val))}
                style={{
                  backgroundColor: numericTender === val ? P.primaryLight : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: numericTender === val ? P.primary : P.border,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: numericTender === val ? P.primary : P.textSub,
                  }}
                >
                  {tenderCurrency === 'KHR' ? khr(val) : `$${val}`}
                </Text>
              </Press>
            ))}
          </View>

          {/* Real-time Change / Shortfall Feedback */}
          {hasTender && exchange && (
            <View
              style={{
                backgroundColor: isPaidEnough ? '#ECFDF5' : '#FFF1F2',
                borderRadius: 8,
                padding: 8,
                borderWidth: 1,
                borderColor: isPaidEnough ? '#A7F3D0' : '#FECDD3',
                gap: 4,
              }}
            >
              {isPaidEnough ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#065F46', fontSize: 11, fontWeight: '800' }}>
                      {tr('CHANGE DUE (អាប់ជូន)', 'ប្រាក់អាប់ជូន')}
                    </Text>
                    <Text style={{ color: '#047857', fontSize: 14, fontWeight: '900' }}>
                      {khr(exchange.changeKhr)}
                    </Text>
                  </View>

                  {/* Cambodia Exchange Breakdown Options */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    <Press
                      onPress={() => setSelectedChangeMode('split')}
                      style={{
                        flex: 1,
                        backgroundColor: selectedChangeMode === 'split' ? '#047857' : '#FFFFFF',
                        paddingVertical: 4,
                        paddingHorizontal: 6,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: selectedChangeMode === 'split' ? '#047857' : '#A7F3D0',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '800',
                          color: selectedChangeMode === 'split' ? '#FFFFFF' : '#065F46',
                        }}
                      >
                        Option 1: {exchange.formattedSplit}
                      </Text>
                    </Press>

                    <Press
                      onPress={() => setSelectedChangeMode('allKhr')}
                      style={{
                        flex: 1,
                        backgroundColor: selectedChangeMode === 'allKhr' ? '#047857' : '#FFFFFF',
                        paddingVertical: 4,
                        paddingHorizontal: 6,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: selectedChangeMode === 'allKhr' ? '#047857' : '#A7F3D0',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '800',
                          color: selectedChangeMode === 'allKhr' ? '#FFFFFF' : '#065F46',
                        }}
                      >
                        Option 2: {exchange.formattedAllKhr}
                      </Text>
                    </Press>
                  </View>
                </>
              ) : (
                <Text style={{ color: '#E11D48', fontSize: 11.5, fontWeight: '800' }}>
                  {tr('Shortfall:', 'នៅខ្វះ:')} {khr(exchange.shortfallKhr)} ({money(exchange.shortfallUsd)} USD)
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Primary Checkout Button (Fixed at Top) */}
        <Press
          disabled={lineCount === 0 || checkingOut || (hasTender && !isPaidEnough)}
          onPress={handleExecuteCheckout}
          style={{
            height: 48,
            borderRadius: 12,
            backgroundColor:
              lineCount > 0 && (!hasTender || isPaidEnough) ? P.primary : P.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            shadowColor: P.primary,
            shadowOpacity: lineCount > 0 ? 0.25 : 0,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          {checkingOut ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Check size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' }}>
                {hasTender && exchange && isPaidEnough
                  ? isWholesale
                    ? `${tr('Pay & Change', 'ទូទាត់លក់ដុំ & អាប់')} ${selectedChangeMode === 'split' ? exchange.formattedSplit : exchange.formattedAllKhr}`
                    : `${tr('Pay & Change', 'ទូទាត់ & អាប់')} ${selectedChangeMode === 'split' ? exchange.formattedSplit : exchange.formattedAllKhr}`
                  : isWholesale
                  ? tr('Complete Wholesale Checkout', 'បញ្ចប់ការលក់ដុំ & ចេញវិក្កយបត្រ')
                  : tr('Complete Retail Checkout', 'បញ្ចប់ការលក់រាយ & ចេញវិក្កយបត្រ')}
              </Text>
            </>
          )}
        </Press>
      </View>

      {/* ────────────────── SCROLLABLE CART ITEMS AREA ────────────────── */}
      <View
        style={{
          flex: 1,
          minHeight: 180,
          ...(Platform.OS === 'web' ? ({ overflowY: 'auto' } as any) : {}),
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
