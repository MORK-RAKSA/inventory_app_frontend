import { AppTextInput as TextInput, AppText as Text } from '../../components/AppText';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
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
import { PayWaySandbox } from './PayWaySandbox';
import { calculateCambodiaCashExchange, CambodiaCashExchange } from '../../exchangeRate';

export function PosCartColumn({ portal }: { portal: PortalController }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
  const [tenderInput, setTenderInput] = useState('');
  const [tenderCurrency, setTenderCurrency] = useState<'KHR' | 'USD'>('KHR');

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

  const handleExecuteCheckout = async () => {
    if (lineCount === 0 || checkingOut) return;
    if (paymentMethod !== 'cash' || !hasTender) return;
    if (!exchange || !isPaidEnough) return;
    const completed = await completeCheckout({ tenderAmount: numericTender, tenderCurrency, exchange });
    if (completed) setTenderInput('');
  };

  return (
    <View
      style={{
        flexGrow: 1,
        width: '100%',
        backgroundColor: P.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: P.border,
        ...(Platform.OS === 'web'
          ? {
              position: 'sticky' as any,
              top: 20,

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

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['cash', 'qr'] as const).map(method => <Press key={method}
            onPress={() => { setPaymentMethod(method); if (method === 'qr' && lineCount > 0) setQrOpen(true); }}
            style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1,
              borderColor: paymentMethod === method ? '#47645A' : P.border,
              backgroundColor: paymentMethod === method ? '#E6EEEA' : P.surface }}>
            <Text style={{ color: '#355547', fontWeight: '700', textAlign: 'center' }}>
              {method === 'cash' ? tr('Pay cash', 'បង់សាច់ប្រាក់') : tr('Scan QR · Sandbox', 'ស្កេន QR · សាកល្បង')}
            </Text>
          </Press>)}
        </View>

        {/* Grand Total Due Card (Fixed at Top) */}
        <View
          style={{
            backgroundColor: '#F1F5F4',
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
                color: P.muted,
                fontSize: 10.5,
                fontWeight: '800',
                letterSpacing: 0.5,
              }}
            >
              {tr('TOTAL DUE', 'សរុបត្រូវបង់')}
            </Text>
            <Text
              style={{
                color: P.text,
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
            <Text style={{ color: '#31594B', fontSize: 16, fontWeight: '800' }}>
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
                <Text style={{ color: '#31594B', fontSize: 10.5, fontWeight: '800' }}>
                  {tr('Save', 'សន្សំ')} {khr(wholesaleTotalSavingsKhr)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* One cash currency selector and tender entry. */}
        {paymentMethod === 'cash' ? <View
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
                {tr('Cash received', 'ប្រាក់អតិថិជនឲ្យ (គិតលុយអាប់)')}
              </Text>
            </View>

            {/* Currency toggle for payment */}
            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 6, padding: 1.5 }}>
              <Press
                onPress={() => { setTenderCurrency('KHR'); setTenderInput(''); }}
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
                onPress={() => { setTenderCurrency('USD'); setTenderInput(''); }}
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


                </>
              ) : (
                <Text style={{ color: '#E11D48', fontSize: 11.5, fontWeight: '800' }}>
                  {tr('Shortfall:', 'នៅខ្វះ:')} {khr(exchange.shortfallKhr)} ({money(exchange.shortfallUsd)} USD)
                </Text>
              )}
            </View>
          )}
        </View> : portal.userRole === 'ADMIN' ? <PayWaySandbox key={totalUsd.toFixed(2)} amount={totalUsd} visible={qrOpen} onClose={() => setQrOpen(false)} /> :
          <Text style={{ color: P.muted }}>{tr('QR sandbox testing requires an administrator.', 'ការសាកល្បង QR ត្រូវការអ្នកគ្រប់គ្រង។')}</Text>}
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

        {/* Checkout action after cart */}
        {paymentMethod === 'cash' && <Press
          disabled={lineCount === 0 || checkingOut || !hasTender || !isPaidEnough}
          onPress={() => void handleExecuteCheckout()}
          style={{
            height: 48,
            borderRadius: 12,
            backgroundColor:
              lineCount > 0 && hasTender && isPaidEnough ? '#47645A' : P.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            shadowColor: P.primary,
            shadowOpacity: 0,
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
                    ? `${tr('Pay & Change', 'ទូទាត់លក់ដុំ & អាប់')} ${exchange.formattedAllKhr}`
                    : `${tr('Pay & Change', 'ទូទាត់ & អាប់')} ${exchange.formattedAllKhr}`
                  : isWholesale
                  ? tr('Complete Wholesale Checkout', 'បញ្ចប់ការលក់ដុំ & ចេញវិក្កយបត្រ')
                  : tr('Complete Retail Checkout', 'បញ្ចប់ការលក់រាយ & ចេញវិក្កយបត្រ')}
              </Text>
            </>
          )}
        </Press>}
    </View>
  );
}
