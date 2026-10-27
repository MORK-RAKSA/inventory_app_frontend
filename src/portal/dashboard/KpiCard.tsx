import { AppText as Text } from '../../components/AppText';
import { ReactNode } from 'react';
import { View } from 'react-native';
import { glass, P } from '../theme';

export function KpiCard({
  label,
  value,
  detail,
  icon,
  iconBg,
  valueColor = P.text,
  detailColor = P.muted,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  iconBg: string;
  valueColor?: string;
  detailColor?: string;
}) {
  return (
    <View
      style={{
        ...glass,
        flex: 1,
        minWidth: 210,
        padding: 18,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            color: P.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.7,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
      </View>
      <Text
        style={{
          color: valueColor,
          fontSize: 24,
          fontWeight: '800',
          marginTop: 12,
          letterSpacing: -0.8,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={{ color: detailColor, fontSize: 11.5, marginTop: 5, fontWeight: '600' }}>
        {detail}
      </Text>
    </View>
  );
}
