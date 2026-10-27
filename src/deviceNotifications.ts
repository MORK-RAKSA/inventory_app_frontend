import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, CLIENT_ID } from './api';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
export async function registerDeviceNotifications() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('store-activity', { name: 'Store activity', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api('/devices/push', { method: 'POST', body: JSON.stringify({ token, clientId: CLIENT_ID }) });
}
