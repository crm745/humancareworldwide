import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'humancare_token';
const REFRESH_KEY = 'humancare_refresh_token';

// expo-secure-store is iOS/Android only — it has no web implementation at all.
// The real app only ever ships on phones, but the web preview used for quick
// testing needs a fallback, so we use localStorage there instead.
const isWeb = Platform.OS === 'web';

async function setItem(key, value) {
  if (isWeb) return window.localStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

async function deleteItem(key) {
  if (isWeb) return window.localStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

async function getItem(key) {
  if (isWeb) return window.localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function saveTokens({ token, refreshToken }) {
  await setItem(TOKEN_KEY, token);
  await setItem(REFRESH_KEY, refreshToken);
}

export async function clearTokens() {
  await deleteItem(TOKEN_KEY);
  await deleteItem(REFRESH_KEY);
}

export async function getAccessToken() {
  return getItem(TOKEN_KEY);
}

export async function getRefreshToken() {
  return getItem(REFRESH_KEY);
}
