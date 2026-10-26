import { useCallback } from 'react';

// Google sign-in on iOS/Android with the native account picker
// (@react-native-google-signin, the free "original" API). The browser-redirect method
// the web build uses is blocked by Google for Android OAuth clients ("Custom URI scheme
// is not enabled for your Android client").
//
// `webClientId` must be the WEB client ID from the same Google Cloud project as the
// Android OAuth client (package com.humancareworldwide.app + the build's SHA-1): it is
// the audience of the ID token our backend verifies.
//
// The native module is required lazily so Expo Go (which doesn't include it) can still
// open the app; the Google button just won't work there.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

export const isGoogleConfigured = Boolean(WEB_CLIENT_ID);

let configured = false;
function googleSignin() {
  const lib = require('@react-native-google-signin/google-signin');
  if (!configured) {
    lib.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
  return lib;
}

// Same shape as googleAuth.web.js: `signIn()` resolves to Google's ID token, or null if
// the person backed out of the picker.
export function useGoogleSignIn() {
  const signIn = useCallback(async () => {
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = googleSignin();
    try {
      await GoogleSignin.hasPlayServices();
      // Forget the last Google account so the picker always shows: someone whose
      // HumanCare account uses a different email must be able to choose it.
      await GoogleSignin.signOut().catch(() => {});
      const response = await GoogleSignin.signIn();
      return isSuccessResponse(response) ? response.data.idToken : null;
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return null;
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google sign-in needs Google Play services on this phone.');
        }
      }
      console.warn('Google sign-in error:', err?.code, err?.message);
      throw new Error('Google sign-in failed. Please try again.');
    }
  }, []);

  return { ready: true, signIn };
}
