# Android OTA updates

Install one new APK containing expo-updates first (`npm run build:apk`, preview channel). Existing APKs cannot receive this capability remotely. For production, use `npx eas-cli build --platform android --profile production`.

Configure EXPO_PUBLIC_API_URL in both EAS preview and production environments to https://inventory-app-backend-5iet.onrender.com/api before building/publishing. Build-profile env values do not configure the EAS Update environment.

After testing JavaScript/UI changes, publish from this directory:

```sh
npm run update:preview -- --message "Describe changes"
# Verify on the preview APK before releasing to production:
npm run update:production -- --message "Describe changes"
```

Publishing requires Expo account/project access. Building an APK does not publish an update. No update has been published by this setup.

The app checks on launch, foreground, and hourly while active, throttled to once per hour. It asks before downloading and restarting. Finish your sale first: unsaved carts are lost on restart. Choosing Later after downloading applies the update on the next full launch.

Fingerprint runtime compatibility prevents incompatible updates being offered. Native dependencies, permissions, SDK or other fingerprint changes require a new APK. Test the flow on a release APK, not Expo Go: verify download, both Later options, restart, full relaunch, and offline use.
