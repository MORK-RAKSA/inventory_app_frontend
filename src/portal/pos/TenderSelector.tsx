import { Text, View } from 'react-native';
import { Press } from '../../motion';
import { P } from '../theme';

export function TenderSelector({
  currency,
  onChange,
}: {
  currency: 'KHR' | 'USD';
  onChange: (currency: 'KHR' | 'USD') => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
      {(['KHR', 'USD'] as const).map((ccy) => {
        const active = currency === ccy;
        return (
          <Press
            key={ccy}
            onPress={() => onChange(ccy)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: active ? P.primaryLight : P.surfaceAlt,
              borderWidth: 1.5,
              borderColor: active ? P.primary : P.border,
            }}
          >
            <Text style={{ color: active ? P.primary : P.textSub, fontWeight: '800', fontSize: 13 }}>
              {ccy === 'KHR' ? 'Pay in Riel (៛ KHR)' : 'Pay in Dollar ($ USD)'}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}
