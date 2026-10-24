# Revision 3 — calmer motion, backend integration

- **No bounce:** every spring was replaced with short eased timing (no overshoot). Press feedback is a subtle 3 % squeeze. Swipe rows no longer overshoot.
- **Counting numbers only on the Overview hero card** (Today's sales). All other numbers are plain text.
- **Headers:** the RetailFlow logo row was removed; screen titles (Inventory, Sales, ...) are now primary purple.
- API client: reads body as text, so empty/204 responses (DELETE) no longer throw `JsonParseError`; server `{error}` messages are shown.
- Product edit now actually saves stock (see backend). Photos upload to the server (Cloudflare R2) when configured, otherwise stay on the device.
- Batch save shows "N new · M restocked".

---

# Motion + clean-up revision

## Fixes
- **Bundling error** `Unable to resolve "expo/internal/bundle-origin" from expo-asset`: `expo-audio` pulled in a newer
  `expo-asset` (SDK 55) than Expo 54 provides. `expo-asset`, `expo-constants`, `expo-linking` and `react-native-worklets`
  are now declared at their SDK 54 versions in `package.json`. Run `npx expo install --fix` once to let Expo confirm them.
- Sales: Export button called an undefined `setError` (crash) — now shows a notice.
- Removed the deprecated RN `SafeAreaView` (use `react-native-safe-area-context`).
- Settings: removed the duplicated "Language" card; success message now auto-dismisses.
- Batch: decimals can be typed in price fields (they were swallowed by `Number()` on every keystroke).
- Leftover green tints from the old theme replaced by purple tokens.

## UI
- `src/theme.ts` design tokens (colours, radius, shadows). `src/ui.tsx` rewritten: gradient hero cards, icon badges,
  animated inputs, buttons with icon/loading, no more glyph characters in the header.
- Mixed Khmer·English headings are now language-aware via `tr(en, kh)` from `useLanguage()`.
- Checkout: inline quantity steppers, one cart/summary card, sliding USD/KHR control, scan button inside the search field.

## Motion (react-native-reanimated — Framer Motion is web-only)
- `src/motion.tsx`: `Rise` (staggered entrance), `Press` (whileTap spring), `Chip` (colour cross-fade),
  `Segmented` (sliding thumb), shared list `layout`/`entering`/`exiting` presets.
- **New tab bar** (`src/components/AnimatedTabBar.tsx`): floating bar, spring-sliding pill behind the active tab,
  icon/label cross-fade, raised centre Checkout button, hides while the keyboard is open. Screens switch with the
  `shift` animation.
- Camera scanner: animated scan line and a pulse on each successful read. Swipe actions scale/slide in.

## Not verified
Written without an Expo toolchain available — please run on a device/simulator and report anything off.

---

# Mobile UI revision — purple edition

- Purple design tokens shared across screens, navigation, icons and cards.
- Swipe-to-reveal edit/archive icon actions with animated position and fade.
- Product edit form renders immutable barcode in a non-editable view.
- Camera modal now provides 1×/2× zoom toggle (2× is a normalized camera zoom approximation), torch, continuous scanning and live pending-count badge.
- Unknown scanned barcodes are kept in the pending inventory list until their product details are filled; each can be edited before the batch commit.
- Receipt modal uses a premium clean layout and icon-driven print/share actions with stored sale amounts.
- English and Khmer headings depend on the language setting, avoiding selected mixed-language headings.
- Checkout add buttons are visually disabled when stock/cart limit reached.

## Integration limits
- Batch commit remains blocked until backend implements POST /api/inventory/batches/commit with transactional semantics.
- Camera zoom prop is normalized 0–1. Device optical 2× is not guaranteed by the SDK.
- Other screen text still has some hard-coded labels and needs an i18n completeness pass.
- Device compilation and visual regression tests have not been run here.
