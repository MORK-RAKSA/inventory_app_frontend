# RetailFlow mobile — componentized update

Only the Expo mobile application is included. Backend and web apps are not included.

## Local setup

1. Install Node.js, then run `npm install` from the `mobile` directory.
2. Set `EXPO_PUBLIC_API_URL` in `.env` to your computer's LAN IP: `http://192.168.x.x:8080/api` for a physical phone. `localhost` on a phone points to the phone, not your Spring Boot server.
3. Run `npx expo start` and open the app using Expo Go or a compatible development build.
4. Start the separate Spring Boot backend and ensure the phone and backend can reach each other. Do not use plain HTTP outside a trusted development network.

## Changes

- Separated shared UI: `src/components/` (AnimatedNumber, BarcodeCard, CategorySelect, ProductImage, ReceiptModal, SwipeActions).
- Inventory edit form controls stock; no `+1 restock` button. Swipe inventory cards left for edit/archive.
- Tap a product row for details and a Code 128 barcode; generate a different internal barcode using the edit flow, then save.
- Filter low stock by tapping the amber Low stock counter on Inventory, or Overview > Low stock > View all. Low stock means `stock <= lowStockThreshold`. Overview categories link to category-filtered inventory.
- Search product categories in the product form; if not found, create a category string on the product. Standalone category backend CRUD is not provided.
- Tap a product photo to preview full-screen. Choosing new photos saves local URI references in device AsyncStorage, **not on the server**; photos will not sync across devices and can disappear if the OS removes the underlying selected file. Production needs backend image upload/storage.
- Sales transaction tap opens receipt detail. Print through the OS print service, or generate/share a PDF via Expo Print/Sharing.
- Expo Audio synthesized sound assets for adding items (scan feedback), successful checkout, and failed checkout.
- Khmer and English resources separated in `src/i18n/`; language toggle in Settings. Older hardcoded strings on legacy screens still need full translation.
- Spring-bounce navbar icons and count-up animations for overview stats.
- Product/sales/settings read from actual `/api` responses and refresh every 5 seconds while focused. **This is polling, not server-push realtime.** No mock numbers are invented for API failures.

## Dependencies and limits

The project adds expo-audio, expo-print, expo-sharing, expo-image-picker, expo-image, AsyncStorage, gesture-handler, reanimated, svg and barcode rendering. Native compatibility must be tested on iOS and Android.

Barcode rendering requires `@aramir/react-native-barcode` and `react-native-svg`. A generated barcode value is saved only after the product edit form is submitted. No camera scanning interface is included in this update; scanning hardware integration remains work to do.

The backend must support existing `/products`, `/products/{id}`, `/sales`, `/sales/checkout` and `/settings` endpoints. Automatic updates may lag by up to 5 seconds. Changing product stock from the edit form uses the existing PUT endpoint; stock adjustments must be guarded and audited server-side. Printing requires a configured compatible printer and may differ by device.

## Verification

TS/TSX syntax transpilation checked. `npm install` was attempted but did not finish in the available environment; therefore **dependency type checking, Expo build, and real-device tests have not passed/been completed**. Ensure versions match your installed Expo SDK with `npx expo install --fix` before building.
