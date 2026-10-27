import { AppTextInput as TextInput, AppText as Text } from '../../components/AppText';
import { Platform, ScrollView, View } from 'react-native';
import { Layers, Minus, Plus, Trash2 } from 'lucide-react-native';
import { Product } from '../../api';
import { khr, money } from '../../theme';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function WholesaleCartTable({
  lines,
  rate,
  totalCases,
  totalLoose,
  savingsUsd,
  savingsKhr,
  onAdd,
  onSetQty,
  onRemove,
  tr,
}: {
  lines: PortalController['wholesaleCartLines'];
  rate: number;
  totalCases: number;
  totalLoose: number;
  savingsUsd: number;
  savingsKhr: number;
  onAdd: (product: Product, delta: number, unitType: 'case' | 'loose') => void;
  onSetQty?: (product: Product, targetQty: number, unitType: 'case' | 'loose') => void;
  onRemove: (productId: string) => void;
  tr: PortalController['tr'];
}) {
  if (lines.length === 0) {
    return (
      <View style={{ paddingVertical: 48, alignItems: 'center' }}>
        <Layers size={36} color={P.borderStrong} />
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
            'Tap "+ 1 Case" or "+ 1 Unit" on items at left to ring up Wholesale orders',
            'ចុច "+ 1 កេស" ឬ "+ 1 ឯកតា" លើទំនិញខាងឆ្វេងដើម្បីគិតលុយលក់ដុំ'
          )}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 6 }}>
      {/* Table Header */}
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
        <Text style={{ width: 22, color: P.muted, fontSize: 11, fontWeight: '800' }}>#</Text>
        <Text style={{ flex: 2, color: P.muted, fontSize: 11, fontWeight: '800' }}>
          {tr('ITEM & STOCK', 'ទំនិញ & ស្តុក')}
        </Text>
        <Text
          style={{
            width: 76,
            textAlign: 'center',
            color: '#4F46E5',
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {tr('CASES', 'កេស')}
        </Text>
        <Text
          style={{
            width: 76,
            textAlign: 'center',
            color: '#0D9488',
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {tr('LOOSE', 'រាយ')}
        </Text>
        <Text
          style={{
            width: 78,
            textAlign: 'right',
            color: P.muted,
            fontSize: 11,
            fontWeight: '800',
            paddingRight: 4,
          }}
        >
          {tr('PRICE/CS', 'តម្លៃ/កេស')}
        </Text>
        <Text
          style={{
            width: 82,
            textAlign: 'right',
            color: P.muted,
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {tr('TOTAL (៛)', 'សរុប')}
        </Text>
        <Text style={{ width: 26, textAlign: 'center' }}> </Text>
      </View>

      <ScrollView style={{ maxHeight: 340 }}>
        {lines.map((line, idx) => {
          const availStock = line.product.stock ?? 0;
          const exceedsStock = line.totalUnits > availStock;
          const stockCases = Math.floor(availStock / line.caseQty);
          const stockLoose = availStock % line.caseQty;

          return (
            <View
              key={line.product.id}
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
              <Text style={{ width: 22, color: P.muted, fontSize: 11, fontWeight: '700' }}>
                {idx + 1}
              </Text>

              {/* Item Info + Stock */}
              <View style={{ flex: 2, paddingRight: 6 }}>
                <Text style={{ color: P.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                  {line.product.name}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <View
                    style={{
                      backgroundColor: P.primaryLight,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: P.primary, fontSize: 10, fontWeight: '800' }}>
                      1 {line.caseName} = {line.caseQty} {line.baseName}
                    </Text>
                  </View>

                  {/* Stock Display Badge */}
                  <View
                    style={{
                      backgroundColor: exceedsStock ? '#FEE2E2' : '#F1F5F9',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: exceedsStock ? '#DC2626' : P.textSub,
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                    >
                      {exceedsStock
                        ? `⚠️ ${tr('Stock', 'ស្តុក')}: ${availStock} (${tr('Over by', 'លើស')} ${line.totalUnits - availStock})`
                        : `${tr('Stock', 'ស្តុក')}: ${availStock} (${stockCases}${line.caseName} + ${stockLoose}${line.baseName})`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Cases Stepper */}
              <View style={{ width: 76, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#C7D2FE',
                    padding: 1,
                  }}
                >
                  <Press
                    onPress={() => onAdd(line.product, -1, 'case')}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={10} color="#4338CA" />
                  </Press>
                  <TextInput
                    value={String(line.cases)}
                    onChangeText={(txt) => {
                      const cleaned = txt.replace(/\D/g, '');
                      if (!cleaned) return;
                      const val = parseInt(cleaned, 10);
                      if (onSetQty) onSetQty(line.product, val, 'case');
                      else onAdd(line.product, val - line.cases, 'case');
                    }}
                    keyboardType="number-pad"
                    style={[
                      {
                        width: 26,
                        height: 20,
                        textAlign: 'center',
                        fontWeight: '800',
                        color: '#4338CA',
                        fontSize: 11.5,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 0,
                        paddingHorizontal: 0,
                        paddingVertical: 0,
                      },
                      Platform.OS === 'web' ? ({ outline: 'none' } as any) : null,
                    ]}
                  />
                  <Press
                    onPress={() => onAdd(line.product, 1, 'case')}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: '#4F46E5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={10} color="#FFFFFF" />
                  </Press>
                </View>
              </View>

              {/* Loose Stepper */}
              <View style={{ width: 76, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F0FDFA',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#99F6E4',
                    padding: 1,
                  }}
                >
                  <Press
                    onPress={() => onAdd(line.product, -1, 'loose')}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={10} color="#0F766E" />
                  </Press>
                  <TextInput
                    value={String(line.loose)}
                    onChangeText={(txt) => {
                      const cleaned = txt.replace(/\D/g, '');
                      if (!cleaned) return;
                      const val = parseInt(cleaned, 10);
                      if (onSetQty) onSetQty(line.product, val, 'loose');
                      else onAdd(line.product, val - line.loose, 'loose');
                    }}
                    keyboardType="number-pad"
                    style={[
                      {
                        width: 26,
                        height: 20,
                        textAlign: 'center',
                        fontWeight: '800',
                        color: '#0F766E',
                        fontSize: 11.5,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 0,
                        paddingHorizontal: 0,
                        paddingVertical: 0,
                      },
                      Platform.OS === 'web' ? ({ outline: 'none' } as any) : null,
                    ]}
                  />
                  <Press
                    onPress={() => onAdd(line.product, 1, 'loose')}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: '#0D9488',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={10} color="#FFFFFF" />
                  </Press>
                </View>
              </View>

              {/* Price / Case */}
              <View style={{ width: 78, alignItems: 'flex-end', paddingRight: 4 }}>
                <Text style={{ color: P.text, fontWeight: '700', fontSize: 11.5 }}>
                  {khr(line.casePriceUsd * rate)}
                </Text>
                {line.savingsPct > 0 ? (
                  <Text style={{ color: P.emerald, fontSize: 10, fontWeight: '700' }}>
                    -{line.savingsPct}%
                  </Text>
                ) : (
                  <Text style={{ color: P.muted, fontSize: 10 }}>{money(line.casePriceUsd)}</Text>
                )}
              </View>

              {/* Line Total */}
              <View style={{ width: 82, alignItems: 'flex-end' }}>
                <Text style={{ color: P.primary, fontWeight: '800', fontSize: 13 }}>
                  {khr(line.lineTotalUsd * rate)}
                </Text>
                <Text style={{ color: P.muted, fontSize: 10 }}>{money(line.lineTotalUsd)}</Text>
              </View>

              {/* Remove Action */}
              <Press
                onPress={() => onRemove(line.product.id)}
                style={{
                  width: 26,
                  height: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                }}
              >
                <Trash2 size={13} color={P.rose} />
              </Press>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
