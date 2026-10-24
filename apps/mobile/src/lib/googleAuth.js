import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

// expo-auth-session throws immediately if the platform's client ID is missing — this
// placeholder just keeps the hook from crashing the screen before real credentials exist.
// isGoogleConfigured is what callers actually check before letting someone tap the button.
const PLACEHOLDER = '000000000000-placeholder.apps.googleusercontent.com';

export const isGoogleConfigured = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB
);

// One client ID per platform, from Google Cloud Console > APIs & Services > Credentials.
// Only the ones actually set get used — see mobile/.env.example.
export function useGoogleAuth() {
  return Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || PLACEHOLDER,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || PLACEHOLDER,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || PLACEHOLDER,
    // Always show Google's account chooser. Otherwise Google silently reuses whichever
    // account the browser/phone is already signed in to, and someone whose HumanCare
    // account uses a different email gets "No account found" with no way to switch.
    selectAccount: true,
  });
}
