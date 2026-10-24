import {Platform,ViewStyle} from 'react-native';

/** Design tokens. `green` is kept as an alias of `primary` so older imports keep working. */
export const C = {
  primary: '#6946B8',
  green: '#6946B8',
  primaryDark: '#4B2F94',
  deep: '#2E1D5C',
  text: '#241A3F',
  muted: '#8A7FA0',
  faint: '#9CA3AF',
  placeholder: '#9CA3AF',
  bg: '#F7F5FC',
  surface: '#FFFFFF',
  border: '#ECE7F5',
  pale: '#F1ECFB',
  paleStrong: '#E4DAF7',
  amber: '#D98E12',
  amberPale: '#FFF4DC',
  red: '#C24B4B',
  redPale: '#FCEDED',
  success: '#2E9C6A',
  successPale: '#E5F5EE',
  onPrimaryMuted: '#D9CCF5',
} as const;

export const R = {sm: 10, md: 14, lg: 20, xl: 26, pill: 999} as const;
export const S = {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28} as const;

const shadowBase = {shadowColor: '#3B2A7A'};
export const shadow: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: Platform.select<ViewStyle>({
    ios: {...shadowBase, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: {width: 0, height: 4}},
    default: {elevation: 2},
  })!,
  md: Platform.select<ViewStyle>({
    ios: {...shadowBase, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: {width: 0, height: 10}},
    default: {elevation: 5},
  })!,
  lg: Platform.select<ViewStyle>({
    ios: {...shadowBase, shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: {width: 0, height: 14}},
    default: {elevation: 10},
  })!,
};

/**
 * Rounds Khmer Riel to 100-Riel denominations (e.g. 2100, 4100, 5010100).
 * Any positive non-zero amount is at least 100 ៛.
 */
export const roundKhr = (n: number): number => {
  const val = Number(n) || 0;
  if (val <= 0) return 0;
  return Math.max(100, Math.round(val / 100) * 100);
};

export const money = (n: number) => '$' + (Number(n) || 0).toFixed(2);
export const khr = (n: number) => roundKhr(n).toLocaleString('en-US') + ' ៛';
