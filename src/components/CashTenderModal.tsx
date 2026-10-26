import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Banknote,
  CheckCircle2,
  DollarSign,
  Coins,
  ArrowRight,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { Btn, C, khr, money, shadow } from '../ui';
import { Press, Rise } from '../motion';
import { useLanguage } from '../i18n';
import {
  computeCambodiaCashExchange,
  CambodiaCashExchange,
} from '../exchangeRate';

interface CashTenderModalProps {
  visible: boolean;
  totalUsd: number;
  totalKhr: number;
  rate: number;
  onClose: () => void;
  onConfirm: (tender: {
    tenderAmount: number;
    tenderCurrency: 'USD' | 'KHR';
    exchange: CambodiaCashExchange;
  }) => void;
  busy?: boolean;
}

export function CashTenderModal({
  visible,
  totalUsd,
  totalKhr,
  rate,
  onClose,
  onConfirm,
  busy = false,
}: CashTenderModalProps) {
  const { tr } = useLanguage();
  const [tenderCurrency, setTenderCurrency] = useState<'USD' | 'KHR'>('KHR');
  const [amountStr, setAmountStr] = useState('');

  // Default suggestions based on currency and total
  const quickChips = useMemo(() => {
    if (tenderCurrency === 'KHR') {
      const roundedDue = Math.ceil(totalKhr / 100) * 100;
      const candidates = [
        roundedDue,
        roundedDue <= 10000 ? 10000 : null,
        roundedDue <= 20000 ? 20000 : null,
        roundedDue <= 50000 ? 50000 : null,
        roundedDue <= 100000 ? 100000 : null,
      ].filter((x): x is number => x !== null);
      return Array.from(new Set(candidates));
    } else {
      const roundedDue = Math.ceil(totalUsd);
      const candidates = [
        parseFloat(totalUsd.toFixed(2)),
        roundedDue,
        roundedDue <= 5 ? 5 : null,
        roundedDue <= 10 ? 10 : null,
        roundedDue <= 20 ? 20 : null,
        roundedDue <= 50 ? 50 : null,
        roundedDue <= 100 ? 100 : null,
      ].filter((x): x is number => x !== null);
      return Array.from(new Set(candidates));
    }
  }, [tenderCurrency, totalKhr, totalUsd]);

  const parsedAmount = parseFloat(amountStr) || 0;

  const exchange = useMemo(() => {
    return computeCambodiaCashExchange(
      parsedAmount,
      tenderCurrency,
      totalUsd,
      totalKhr,
      rate
    );
  }, [parsedAmount, tenderCurrency, totalUsd, totalKhr, rate]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerIcon}>
                <Banknote size={20} color={C.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {tr('Cash & Change Calculator', 'គណនាប្រាក់ទទួល និងប្រាក់អាប់')}
                </Text>
                <Text style={styles.headerSubtitle}>
                  1$ = {khr(rate)} · {tr('Cambodia Dual-Currency POS', 'ទូទាត់ប្រាក់រៀល & ដុល្លារ')}
                </Text>
              </View>
            </View>

            <Press onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={C.muted} />
            </Press>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Grand Total Hero Box */}
            <View style={styles.totalHeroBox}>
              <Text style={styles.totalHeroLabel}>
                {tr('TOTAL DUE TO COLLECT', 'ចំនួនទឹកប្រាក់សរុបត្រូវទូទាត់')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <Text style={styles.totalHeroKhr}>{khr(totalKhr)}</Text>
                <Text style={styles.totalHeroUsd}>({money(totalUsd)})</Text>
              </View>
            </View>

            {/* Currency Selector Pills */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionLabel}>
                {tr('Customer Paid In', 'អតិថិជនបង់ជា')}
              </Text>
              <View style={styles.currencyToggleRow}>
                <Press
                  onPress={() => {
                    setTenderCurrency('KHR');
                    setAmountStr('');
                  }}
                  style={[
                    styles.currencyToggleBtn,
                    tenderCurrency === 'KHR' && styles.currencyToggleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyToggleText,
                      tenderCurrency === 'KHR' && styles.currencyToggleTextActive,
                    ]}
                  >
                    ៛ KHR (Khmer Riel)
                  </Text>
                </Press>

                <Press
                  onPress={() => {
                    setTenderCurrency('USD');
                    setAmountStr('');
                  }}
                  style={[
                    styles.currencyToggleBtn,
                    tenderCurrency === 'USD' && styles.currencyToggleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyToggleText,
                      tenderCurrency === 'USD' && styles.currencyToggleTextActive,
                    ]}
                  >
                    $ USD (US Dollar)
                  </Text>
                </Press>
              </View>
            </View>

            {/* Quick Cash Chips */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionLabel}>
                {tr('Quick Money Given', 'ជម្រើសលុយរហ័ស')}
              </Text>
              <View style={styles.chipRow}>
                {quickChips.map((chipVal) => {
                  const label =
                    tenderCurrency === 'KHR'
                      ? khr(chipVal)
                      : `$${chipVal.toFixed(2).replace(/\.00$/, '')}`;
                  const isExact =
                    tenderCurrency === 'KHR'
                      ? Math.abs(chipVal - totalKhr) < 50
                      : Math.abs(chipVal - totalUsd) < 0.01;

                  return (
                    <Press
                      key={chipVal}
                      onPress={() => setAmountStr(String(chipVal))}
                      style={[
                        styles.chipBtn,
                        parsedAmount === chipVal && styles.chipBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
                          parsedAmount === chipVal && styles.chipBtnTextActive,
                        ]}
                      >
                        {label} {isExact ? `(${tr('Exact', 'គត់')})` : ''}
                      </Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            {/* Manual Cash Input Box */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionLabel}>
                {tr('Or Enter Exact Cash Received', 'ឬបញ្ចូលចំនួនប្រាក់ជាក់ស្តែង')}
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>
                  {tenderCurrency === 'KHR' ? '៛' : '$'}
                </Text>
                <TextInput
                  value={amountStr}
                  onChangeText={setAmountStr}
                  placeholder={
                    tenderCurrency === 'KHR'
                      ? `${Math.round(totalKhr)}`
                      : totalUsd.toFixed(2)
                  }
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  style={styles.textInput}
                />
                {amountStr.length > 0 && (
                  <Press onPress={() => setAmountStr('')} style={{ padding: 6 }}>
                    <X size={16} color="#94A3B8" />
                  </Press>
                )}
              </View>
            </View>

            {/* Change Result Breakdown Cards */}
            {parsedAmount > 0 && (
              <View style={{ marginTop: 16 }}>
                {exchange.isShort ? (
                  <View style={styles.shortfallCard}>
                    <AlertCircle size={20} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shortfallTitle}>
                        {tr('Underpaid Amount', 'នៅខ្វះប្រាក់')}
                      </Text>
                      <Text style={styles.shortfallDetail}>
                        {tr('Still needs', 'នៅខ្វះចំនួន')}: {khr(exchange.shortfallKhr)} ({money(exchange.shortfallUsd)})
                      </Text>
                    </View>
                  </View>
                ) : exchange.isExact ? (
                  <View style={styles.exactCard}>
                    <CheckCircle2 size={20} color="#16A34A" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exactTitle}>
                        {tr('Exact Amount Paid', 'បានបង់គ្រប់ចំនួនគត់')}
                      </Text>
                      <Text style={styles.exactDetail}>
                        {tr('No change needed to return', 'មិនចាំបាច់អាប់ប្រាក់ទេ')}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.exchangeBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={styles.exchangeBoxHeader}>
                        {tr('CHANGE TO RETURN TO CUSTOMER', 'ប្រាក់អាប់ត្រូវជូនអតិថិជន')}
                      </Text>
                      <View style={styles.cambodiaBadge}>
                        <Sparkles size={11} color="#0F766E" />
                        <Text style={styles.cambodiaBadgeText}>
                          {tr('Cambodia Cash Rules', 'ក្បួនអាប់លុយនៅខ្មែរ')}
                        </Text>
                      </View>
                    </View>

                    {/* Option 1: Split USD + KHR (Standard in Cambodia, avoids non-existent cents) */}
                    <View style={styles.optionCardPrimary}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.optionCardTag}>
                          {tr('OPTION 1: SPLIT (RECOMMENDED)', 'ជម្រើសទី ១៖ អាប់ដុល្លារ + ប្រាក់រៀល (ណែនាំ)')}
                        </Text>
                        <Text style={styles.noCentNotice}>
                          {tr('No USD cent coins', 'គ្មានកាក់សេន')}
                        </Text>
                      </View>
                      <Text style={styles.optionValuePrimary}>
                        {exchange.formattedSplit}
                      </Text>
                      <Text style={styles.optionExplanation}>
                        {exchange.splitUsd > 0 && exchange.splitKhr > 0
                          ? tr(
                              `Give $${exchange.splitUsd} dollar bill(s) + ${khr(exchange.splitKhr)} in riel notes`,
                              `ជូនក្រដាស $${exchange.splitUsd} + ក្រដាសប្រាក់ ${khr(exchange.splitKhr)}`
                            )
                          : exchange.splitUsd > 0
                          ? tr(`Give $${exchange.splitUsd} dollar bill(s)`, `ជូនក្រដាសប្រាក់ $${exchange.splitUsd}`)
                          : tr(`Give ${khr(exchange.splitKhr)} in riel notes`, `ជូនក្រដាសប្រាក់ ${khr(exchange.splitKhr)}`)}
                      </Text>
                    </View>

                    {/* Option 2: 100% Khmer Riel */}
                    <View style={styles.optionCardSecondary}>
                      <Text style={styles.optionCardTagSecondary}>
                        {tr('OPTION 2: ALL KHR', 'ជម្រើសទី ២៖ អាប់ជាប្រាក់រៀលសុទ្ធ')}
                      </Text>
                      <Text style={styles.optionValueSecondary}>
                        {exchange.formattedAllKhr}
                      </Text>
                      <Text style={styles.optionExplanationSecondary}>
                        {tr('Give all change in 100% Khmer Riel notes', 'ជូនប្រាក់អាប់ទាំងអស់ជាក្រដាសប្រាក់រៀលសុទ្ធ')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <Press onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{tr('Cancel', 'បោះបង់')}</Text>
            </Press>

            <Btn
              icon={CheckCircle2}
              loading={busy}
              disabled={exchange.isShort && parsedAmount > 0}
              onPress={() => {
                onConfirm({
                  tenderAmount: parsedAmount > 0 ? parsedAmount : (tenderCurrency === 'KHR' ? totalKhr : totalUsd),
                  tenderCurrency,
                  exchange,
                });
              }}
              style={{ flex: 2, height: 50, borderRadius: 14 }}
            >
              {tr('Confirm & Complete Sale', 'យល់ព្រម & បញ្ចប់ការលក់')}
            </Btn>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    ...shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalHeroBox: {
    backgroundColor: '#1E1B4B',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  totalHeroLabel: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  totalHeroKhr: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  totalHeroUsd: {
    color: '#C7D2FE',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  currencyToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  currencyToggleBtnActive: {
    backgroundColor: C.pale,
    borderColor: C.primary,
  },
  currencyToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  currencyToggleTextActive: {
    color: C.primary,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  chipBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  chipBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    height: 48,
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: C.primary,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
    ...(Platform.OS === 'web' ? { outline: 'none' as any } : {}),
  },
  shortfallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
  },
  shortfallTitle: {
    color: '#991B1B',
    fontWeight: '800',
    fontSize: 13.5,
  },
  shortfallDetail: {
    color: '#DC2626',
    fontSize: 12.5,
    marginTop: 2,
  },
  exactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
  },
  exactTitle: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 13.5,
  },
  exactDetail: {
    color: '#15803D',
    fontSize: 12.5,
    marginTop: 2,
  },
  exchangeBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  exchangeBoxHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  cambodiaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cambodiaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
  },
  optionCardPrimary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 14,
    padding: 14,
    ...shadow.sm,
  },
  optionCardTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  noCentNotice: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
  optionValuePrimary: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  optionExplanation: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 2,
  },
  optionCardSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
  },
  optionCardTagSecondary: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  optionValueSecondary: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 3,
  },
  optionExplanationSecondary: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
});
