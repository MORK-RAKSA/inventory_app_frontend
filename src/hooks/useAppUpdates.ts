import { useEffect } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';

/** Ask before downloading or restarting, so a cashier can finish the current sale. */
export function useAppUpdates() {
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;
    let disposed = false;
    let busy = false;
    let lastCheck = 0;

    const check = async () => {
      if (busy || AppState.currentState !== 'active' || Date.now() - lastCheck < 60 * 60 * 1000) return;
      busy = true;
      lastCheck = Date.now();
      try {
        const update = await Updates.checkForUpdateAsync();
        if (disposed || AppState.currentState !== 'active' || !update.isAvailable) return;
        Alert.alert('Update available', 'A new EasySell update is available. Download it now? You can finish your current sale before restarting.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Download', onPress: () => { void download(); } },
        ]);
      } catch {
        // Offline devices keep working; retry when the app is next active.
      } finally {
        busy = false;
      }
    };
    const download = async () => {
      if (busy || disposed) return;
      busy = true;
      try {
        const result = await Updates.fetchUpdateAsync();
        if (disposed || !result.isNew || AppState.currentState !== 'active') return;
        Alert.alert('Update ready', 'Finish your sale and save your work before restarting. Unsaved work will be lost. Otherwise, the update will apply the next time you fully close and reopen the app.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart now', onPress: () => {
            void Updates.reloadAsync().catch(() => Alert.alert('Restart needed', 'Please close and reopen EasySell to apply the update.'));
          } },
        ]);
      } catch {
        if (!disposed) Alert.alert('Update failed', 'Could not download the update. You can keep using the app and try again later.');
      } finally { busy = false; }
    };
    void check();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    const interval = setInterval(() => { void check(); }, 60 * 60 * 1000);
    return () => { disposed = true; subscription.remove(); clearInterval(interval); };
  }, []);
}
