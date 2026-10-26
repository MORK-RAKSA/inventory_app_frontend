import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
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
        <Text style={{ flex: 1.7, color: P.muted, fontSize: 11, fontWeight: '800' }}>
          {tr('ITEM & UOM', 'ទំនិញ & UOM')}
        </Text>
        <Text
          style={{
            width: 88,
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
            width: 82,
            textAlign: 'center',
            color: '#0D9488',
            fontSize: 11,
            fontWeight: '800',
          }}
        >
          {tr('LOOSE', 'រាយ')}
        </Text>
        <Text style={{ flex: 1.1, color: P.muted, fontSize: 11, fontWeight: '800' }}>
          {tr('CASE (៛)', 'តម្លៃ/កេស')}
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
            width: 26,
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
        {lines.map((line, idx) => (
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
            <View style={{ flex: 1.7, paddingRight: 6 }}>
              <Text style={{ color: P.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                {line.product.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
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
              </View>
            </View>

            {/* Cases Stepper */}
            <View style={{ width: 88, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#EEF2FF',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#C7D2FE',
                  padding: 2,
                }}
              >
                <Press
                  onPress={() => onAdd(line.product, -1, 'case')}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={11} color="#4338CA" />
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
                  style={{
                    minWidth: 26,
                    height: 22,
                    textAlign: 'center',
                    fontWeight: '800',
                    color: '#4338CA',
                    fontSize: 12,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#C7D2FE',
                    borderRadius: 4,
                    paddingHorizontal: 2,
                    paddingVertical: 0,
                    ...(Platform.OS === 'web' ? { outline: 'none' as any } : {}),
                  }}
                />
                <Press
                  onPress={() => onAdd(line.product, 1, 'case')}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: '#4F46E5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={11} color="#FFFFFF" />
                </Press>
              </View>
            </View>

            {/* Loose Stepper */}
            <View style={{ width: 82, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F0FDFA',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#99F6E4',
                  padding: 2,
                }}
              >
                <Press
                  onPress={() => onAdd(line.product, -1, 'loose')}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={11} color="#0F766E" />
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
                  style={{
                    minWidth: 26,
                    height: 22,
                    textAlign: 'center',
                    fontWeight: '800',
                    color: '#0F766E',
                    fontSize: 12,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#99F6E4',
                    borderRadius: 4,
                    paddingHorizontal: 2,
                    paddingVertical: 0,
                    ...(Platform.OS === 'web' ? { outline: 'none' as any } : {}),
                  }}
                />
                <Press
                  onPress={() => onAdd(line.product, 1, 'loose')}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: '#0D9488',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={11} color="#FFFFFF" />
                </Press>
              </View>
            </View>

            <View style={{ flex: 1.1 }}>
              <Text style={{ color: P.text, fontWeight: '700', fontSize: 12 }}>
                {khr(line.casePriceUsd * rate)}
              </Text>
              {line.savingsPct > 0 ? (
                <Text style={{ color: P.emerald, fontSize: 10.5, fontWeight: '700' }}>
                  Save {line.savingsPct}%
                </Text>
              ) : (
                <Text style={{ color: P.muted, fontSize: 10.5 }}>{money(line.casePriceUsd)}</Text>
              )}
            </View>

            <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
              <Text style={{ color: P.primary, fontWeight: '800', fontSize: 13.5 }}>
                {khr(line.lineTotalUsd * rate)}
              </Text>
              <Text style={{ color: P.muted, fontSize: 10.5 }}>{money(line.lineTotalUsd)}</Text>
            </View>

            <Press
              onPress={() => onRemove(line.product.id)}
              style={{ width: 26, alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={13} color={P.rose} />
            </Press>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 10,
          borderRadius: 10,
          backgroundColor: P.emeraldLight,
          borderWidth: 1,
          borderColor: '#A7F3D0',
          marginTop: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Layers size={14} color={P.emerald} />
          <Text style={{ color: P.emerald, fontSize: 12, fontWeight: '800' }}>
            {totalCases} {tr('Cases', 'កេស')} + {totalLoose} {tr('Loose', 'រាយ')}
          </Text>
        </View>
        {savingsUsd > 0 && (
          <Text style={{ color: P.emerald, fontSize: 12, fontWeight: '800' }}>
            {tr('Wholesale Savings:', 'សន្សំបាន៖')} {khr(savingsKhr)} ({money(savingsUsd)})
          </Text>
        )}
      </View>
    </View>
  );
}
