# Mobile scanner sleep fix notes

- `expo-keep-awake` was added to `package.json` and installed into `node_modules`.
- The mobile scanner gun modal (`MobileScannerGunModal`) and the camera-based product scanners (`CameraScanner`) now keep the device awake while the camera is active, so the phone no longer sleeps in the middle of a scan session.
- Both camera modals also detect a dead/live camera feed more explicitly now, so a paused or disconnected camera is surfaced to the user instead of silently stopping barcode detection.
