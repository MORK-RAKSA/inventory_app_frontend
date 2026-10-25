import { Text, View } from 'react-native';
import { Layers, ShoppingBag } from 'lucide-react-native';
import { Press } from '../../motion';
import { P } from '../theme';
import type { PortalController } from '../usePortalController';

export function PosModeSwitcher({
  mode,
  onModeChange,
  retailCount,
  wholesaleCount,
  tr,
}: {
  mode: 'retail' | 'wholesale';
  onModeChange: (mode: 'retail' | 'wholesale') => void;
  retailCount: number;
  wholesaleCount: number;
  tr: PortalController['tr'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: P.surfaceAlt,
        padding: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: P.border,
        gap: 8,
      }}
    >
      <Press
        onPress={() => onModeChange('retail')}
        style={{
          flex: 1,
          paddingVertical: 11,
          paddingHorizontal: 16,
          borderRadius: 10,
          backgroundColor: mode === 'retail' ? P.primary : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <ShoppingBag size={17} color={mode === 'retail' ? '#FFFFFF' : P.textSub} />
        <Text
          style={{
            color: mode === 'retail' ? '#FFFFFF' : P.textSub,
            fontWeight: '800',
            fontSize: 14,
          }}
        >
          {tr('Retail Register (Single Units)', 'គិតលុយលក់រាយ (ឯកតារាយ)')}
        </Text>
        {retailCount > 0 && (
          <View
            style={{
              backgroundColor: mode === 'retail' ? '#FFFFFF' : P.primary,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 99,
            }}
          >
            <Text
              style={{
                color: mode === 'retail' ? P.primary : '#FFFFFF',
                fontSize: 11,
                fontWeight: '800',
              }}
            >
              {retailCount}
            </Text>
          </View>
        )}
      </Press>

      <Press
        onPress={() => onModeChange('wholesale')}
        style={{
          flex: 1,
          paddingVertical: 11,
          paddingHorizontal: 16,
          borderRadius: 10,
          backgroundColor: mode === 'wholesale' ? P.primary : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Layers size={17} color={mode === 'wholesale' ? '#FFFFFF' : P.textSub} />
        <Text
          style={{
            color: mode === 'wholesale' ? '#FFFFFF' : P.textSub,
            fontWeight: '800',
            fontSize: 14,
          }}
        >
          {tr('Wholesale Register (Cases & UOM)', 'គិតលុយលក់ដុំ (កេស & UOM)')}
        </Text>
        {wholesaleCount > 0 && (
          <View
            style={{
              backgroundColor: mode === 'wholesale' ? '#FFFFFF' : P.primary,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 99,
            }}
          >
            <Text
              style={{
                color: mode === 'wholesale' ? P.primary : '#FFFFFF',
                fontSize: 11,
                fontWeight: '800',
              }}
            >
              {wholesaleCount}
            </Text>
          </View>
        )}
      </Press>
    </View>
  );
}
