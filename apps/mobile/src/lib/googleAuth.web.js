import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Google sign-in for the WEB build: Google's popup via expo-auth-session. The phone
// apps use googleAuth.native.js (Android's/iOS's own account picker) instead, because
// Google blocks this browser-redirect method for Android OAuth clients.
WebBrowser.maybeCompleteAuthSession();

// expo-auth-session throws immediately if the platform's client ID is missing — this
// placeholder just keeps the hook from crashing the screen before real credentials exist.
// isGoogleConfigured is what callers actually check before letting someone tap the button.
const PLACEHOLDER = '000000000000-placeholder.apps.googleusercontent.com';

export const isGoogleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB);

// Same shape as googleAuth.native.js: `signIn()` resolves to Google's ID token, or null
// if the person closed the popup.
export function useGoogleSignIn() {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || PLACEHOLDER,
    // Always show Google's account chooser. Otherwise Google silently reuses whichever
    // account the browser is already signed in to, and someone whose HumanCare account
    // uses a different email gets "No account found" with no way to switch.
    selectAccount: true,
  });

  const signIn = useCallback(async () => {
    const result = await promptAsync();
    return result?.type === 'success' ? result.params?.id_token || null : null;
  }, [promptAsync]);

  return { ready: !!request, signIn };
}
