// Design tokens shared by every web portal screen.
//
// Palette: soft lavender "aurora" canvas with frosted white cards, indigo accents and
// pastel ink. Every surface is translucent so the aurora background glows through.
import type { ViewStyle } from 'react-native';

export const P = {
  // ── Aurora canvas ────────────────────────────────────────────────
  canvas: '#EDE8FB',
  auroraA: '#D8E2FB',
  auroraB: '#F2E2FA',
  auroraC: '#DCF1F0',
  auroraD: '#FBE6EF',
  auroraE: '#E7E3FD',

  // ── Glass surfaces ───────────────────────────────────────────────
  surface: 'rgba(255, 255, 255, 0.78)',
  surfaceStrong: 'rgba(255, 255, 255, 0.95)',
  surfaceAlt: 'rgba(255, 255, 255, 0.45)',
  glassBorder: 'rgba(255, 255, 255, 0.9)',
  border: '#E3DCF4',
  borderStrong: '#C9BFE4',

  // ── Sidebar shell ────────────────────────────────────────────────
  sidebarBg: 'rgba(255, 255, 255, 0.6)',
  sidebarHover: 'rgba(255, 255, 255, 0.55)',
  sidebarActive: 'rgba(255, 255, 255, 0.92)',
  sidebarBorder: 'rgba(255, 255, 255, 0.7)',
  sidebarText: '#6F6790',
  sidebarTextActive: '#4B3FA8',

  // ── Ink ──────────────────────────────────────────────────────────
  text: '#2F2657',
  textSub: '#574F79',
  muted: '#6E678C',

  // ── Accents ──────────────────────────────────────────────────────
  primary: '#6553D6',
  primaryDark: '#4B3FA8',
  primaryLight: 'rgba(101, 83, 214, 0.12)',
  primarySoft: '#C9BFF6',
  deep: '#2F2657',

  emerald: '#2E9C6A',
  emeraldLight: 'rgba(46, 156, 106, 0.13)',
  amber: '#C08114',
  amberLight: 'rgba(201, 138, 22, 0.15)',
  rose: '#C75471',
  roseLight: 'rgba(199, 84, 113, 0.13)',
  teal: '#2C8CA6',
  tealLight: 'rgba(44, 140, 166, 0.13)',
};

/** Soft purple drop shadow used by the floating glass panels. */
export const shadow: ViewStyle = {
  shadowColor: '#4B3FA8',
  shadowOpacity: 0.1,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
};

/** Frosted card: translucent white, hairline light edge, soft purple shadow. */
export const glass: ViewStyle = {
  backgroundColor: P.surface,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: P.glassBorder,
  ...shadow,
};

/** Compact inner surface for rows, chips and inset fields. */
export const glassInset: ViewStyle = {
  backgroundColor: P.surfaceAlt,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.7)',
};

export const DEFAULT_CATEGORIES: string[] = [];
