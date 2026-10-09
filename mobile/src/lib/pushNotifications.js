import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { apiPost } from './api';

// Since Expo SDK 53, expo-notifications throws immediately when its module is even
// imported inside Expo Go on Android (remote push there needs a development build
// instead — see https://docs.expo.dev/develop/development-builds/introduction/).
// So the package is only ever imported when we're NOT running inside Expo Go.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Push notifications have no web implementation either, and a denied permission or
// missing projectId should never block the rest of the app, so this is best-effort.
export async function registerForPushNotifications() {
  if (Platform.OS === 'web' || isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.DEFAULT });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiPost('/auth/push-token', { pushToken });
  } catch {
    // Device/simulator without push capability, or user not logged in yet — ignore.
  }
}
