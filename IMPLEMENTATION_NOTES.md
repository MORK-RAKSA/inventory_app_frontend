# RetailFlow Mobile update

## Screens matched to attached V4 reference
The home, batch and settings screens retain the light neutral/emerald theme, typography hierarchy and rounded component language. They are an implementation approximation, not a verified pixel-exact reproduction; no device screenshot regression test has been run.

## New camera flows
- `expo-camera` uses EAN, UPC, Code 128, QR and ITF recognition.
- Checkout scanner stays open after a scan and adds the matched product to the cart. A duplicate code increments quantity with a short debounce.
- Inventory > Scan / add multiple products opens `/batch`; known codes stage quantity increments, unknown codes pause scanning and open creation. Resume scanning after staging.
- Swipe inventory cards left for icon-only edit and archive actions.
- Product edit keeps existing barcode unchanged; product creation can generate an internal barcode value.

## Important backend contract
`POST /api/inventory/batches/commit` is required for ATOMIC multi-item inventory save. The previous Spring Boot backend DOES NOT implement it. This mobile UI intentionally reports an error rather than silently performing unsafe partial writes. Suggested request body:
`{"items":[{"productId":"uuid","quantityAdded":3},{"name":"Tea","barcode":"123","category":"Drinks","stock":4,"price":1.5,"currency":"USD","lowStockThreshold":2}]}`
The backend must validate duplicates, lock stock rows, insert new products and movement records and commit/rollback all in one transaction, returning results and a batch reference. Add an idempotency key in a subsequent production pass.

## Compatibility
Run `npx expo install --fix` to align native dependencies with the installed Expo SDK. Use a development build for physical camera testing. No `ios/`, `Pods/`, or prebuilt native files are included; regenerate them with Expo when needed.

## Remaining limitations
- Other screen text still has English-only strings; complete i18n coverage is not yet achieved.
- Category creation is a free-text product category until a backend category CRUD endpoint exists.
- Backend product image storage, full barcode image regeneration/printing, and receipt printer hardware integrations still require further implementation.
- No runtime build or iOS-device scan tests have been executed in this environment.
