import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { P } from '../theme';

/**
 * Soft lavender aurora backdrop for the web portal: a base gradient plus a few
 * blurred-looking colour blooms (radial gradients, no extra native dependencies).
 */
export function Aurora() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="portalBase" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={P.auroraE} />
            <Stop offset="0.5" stopColor={P.canvas} />
            <Stop offset="1" stopColor="#E9F1FD" />
          </LinearGradient>

          <RadialGradient id="portalBloomA" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={P.auroraA} stopOpacity="0.95" />
            <Stop offset="1" stopColor={P.auroraA} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="portalBloomB" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={P.auroraB} stopOpacity="0.9" />
            <Stop offset="1" stopColor={P.auroraB} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="portalBloomC" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={P.auroraC} stopOpacity="0.85" />
            <Stop offset="1" stopColor={P.auroraC} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="portalBloomD" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={P.auroraD} stopOpacity="0.9" />
            <Stop offset="1" stopColor={P.auroraD} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width="1000" height="700" fill="url(#portalBase)" />
        <Circle cx="80" cy="40" r="320" fill="url(#portalBloomA)" />
        <Circle cx="900" cy="90" r="260" fill="url(#portalBloomB)" />
        <Circle cx="760" cy="660" r="330" fill="url(#portalBloomD)" />
        <Circle cx="140" cy="640" r="280" fill="url(#portalBloomC)" />
        <Circle cx="500" cy="330" r="300" fill="url(#portalGlow)" />
      </Svg>
    </View>
  );
}
