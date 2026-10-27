# Device notifications

Native mobile uses expo-notifications and expo-device. Allow notifications when asked on a physical device. The home bell requests registration; the custom notification history is web-only. After authenticated event polling succeeds, the device registers its Expo push token with POST /api/devices/push. Tokens are stored in the backend database. Committed sale/product events are sent through Expo; the originating client is excluded. Scanner relay events are not pushed. Delivery is best-effort, with invalid device tokens removed when Expo reports DeviceNotRegistered.

Build a new preview APK/iOS build after adding the native notification plugin. Expo Go/simulators do not establish physical-device push coverage. Configure Android FCM v1 and iOS APNs credentials for the EAS project before testing background delivery. These credentials have not been verified in this workspace. Physical notification receipt, scanner sound/flash timing and thermal printer output still require device testing.

The current implementation sends immediately after transaction commit; it has no durable delivery queue or receipt retry worker. Notifications may be lost during a backend/network interruption; sales and inventory remain authoritative in the database.
