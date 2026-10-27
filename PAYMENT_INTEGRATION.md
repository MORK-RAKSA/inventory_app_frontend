# ABA PayWay sandbox testing

The portal checkout offers Pay cash and Scan QR · Sandbox. Cash uses a single inline currency/amount input. The QR panel is administrator-only. It generates a USD 0.01 test QR, polls the backend every five seconds while open and pending, and displays ABA-verified status. Closing the panel stops polling. A test never creates a sale or deducts inventory; ordinary checkout remains cash checkout.

Backend endpoints (authenticated administrators only):
- GET `/api/payments/sandbox/config`
- POST `/api/payments/sandbox` with a UUID `requestId` and USD `amount` (0.01–10.00)
- POST `/api/payments/sandbox/{id}/check`

Requests use HMAC-SHA512 on the backend. The API host is fixed to ABA sandbox. Credentials stay outside the database/client bundles; test references, QR images and statuses persist in the database. The RSA private key is not used. Approval requires matching transaction reference, USD currency, original amount and payment amount from ABA's server response. Repeated creation requests reuse the same record. An ambiguous creation failure must be checked before starting a different test.

## Local setup

The supplied sandbox signing credentials are saved locally in `backend/.env.sandbox.properties` (permissions 600, ignored by Git and Docker). The backend automatically imports this optional local file when started from the backend or project directory. Restart IntelliJ’s backend run/debug session after updating. Alternatively, start from the backend directory:

```sh
SPRING_CONFIG_ADDITIONAL_LOCATION=file:./.env.sandbox.properties ./gradlew bootRun
```

For other environments set `PAYWAY_SANDBOX_ENABLED=true`, `PAYWAY_MERCHANT_ID` and `PAYWAY_API_KEY` as backend environment variables. Never use EXPO_PUBLIC variables for these. Restart the backend after changing configuration. The supplied key expires on 27 November 2026; replace it before expiry. Request replacement of the private key shared in chat.

## Verification and remaining access requirement

On 28 October 2026 a signed USD 0.01 request from this development environment received HTTP 403 with no usable QR response. Merchant access and payment success are **not verified**. Confirm QR API access and the required IP/domain whitelist with ABA support. Do not assume a regular Wing banking app can pay sandbox QR codes: follow ABA's sandbox payer instructions.

Official docs:
- https://developer.payway.com.kh/qr-api-14530840e0
- https://developer.payway.com.kh/check-transaction-14530826e0

Before enabling real checkout payments, implement pending orders with database-calculated totals, stock reservation policy, verified callbacks/status reconciliation and atomic, idempotent sale finalization. Test success, expiry, duplicate notifications, interrupted requests and stock conflicts. This diagnostic panel does not implement that production flow.

## Receipt printing

Use the system print dialog, 58 mm or 80 mm paper, scale 100%, and no browser headers/footers. Direct USB/Bluetooth ESC/POS support needs the printer model, operating system and connection details. No physical printer has been tested.
