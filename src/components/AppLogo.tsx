import React from 'react';
import { View, ViewStyle } from 'react-native';

interface AppLogoProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * 2×2 Purple rounded squares logo mark matching EasySell branding.
 */
export function AppLogo({ size = 32, style }: AppLogoProps) {
  const gap = Math.max(2, Math.round(size * 0.1));
  const itemSize = Math.max(4, Math.round((size - gap) / 2));
  const radius = Math.max(2, Math.round(itemSize * 0.38));

  // The 4 modern purple-indigo hues
  const colors = [
    ['#6366F1', '#818CF8'],
    ['#8B5CF6', '#A78BFA'],
  ];

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <View style={{ gap }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap }}>
            {[0, 1].map((col) => (
              <View
                key={col}
                style={{
                  width: itemSize,
                  height: itemSize,
                  borderRadius: radius,
                  backgroundColor: colors[row][col],
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
