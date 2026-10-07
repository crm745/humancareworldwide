import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAccessToken } from './session';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Downloads an authenticated file (PDF summary, a case document) and hands it to the
// person — a browser download on web, the native share sheet on a phone. Linking.openURL
// can't be used here since it can't attach the Authorization header these routes need.
export async function downloadAndShare(path, filename) {
  const token = await getAccessToken();
  const url = `${API_URL}${path}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  if (Platform.OS === 'web') {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Download failed.');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
    return;
  }

  const { uri, status } = await FileSystem.downloadAsync(url, FileSystem.cacheDirectory + filename, { headers });
  if (status !== 200) throw new Error('Download failed.');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}
