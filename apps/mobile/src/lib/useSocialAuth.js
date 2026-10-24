import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useGoogleAuth, isGoogleConfigured } from './googleAuth';
import { signInWithApple } from './appleAuth';
import { apiPost } from './api';
import { GoogleMark, AppleMark } from '../components/SocialMarks';

// Used by login.js (sign-up is form-only): Google works on both platforms, Apple is
// iOS-only (per App Store rule — see the task doc). `afterSocialLogin` gets the
// backend's { token, refreshToken, user } once either provider succeeds.
export function useSocialAuth({ toast, afterSocialLogin }) {
  // Google/Apple only sign in existing accounts; someone new is sent to the sign-up form
  // (consents, mobile and password are collected there).
  const onFailed = (err) => {
    toast(err.message);
    if (err.code === 'no_account') router.push('/register');
  };

  const [googleRequest, googleResponse, promptGoogleAsync] = useGoogleAuth();

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token;
      apiPost('/auth/google', { idToken })
        .then(afterSocialLogin)
        .catch(onFailed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the Google response itself changes
  }, [googleResponse]);

  const onGoogle = () => {
    if (!isGoogleConfigured) { toast('Google sign-in isn’t set up yet.'); return; }
    promptGoogleAsync();
  };

  const onApple = async () => {
    try {
      const { idToken, name } = await signInWithApple();
      const data = await apiPost('/auth/apple', { idToken, name });
      await afterSocialLogin(data);
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') return;
      if (err.code === 'no_account') onFailed(err);
      else toast(err.message || 'Apple sign-in failed');
    }
  };

  return [
    { key: 'google', Mark: GoogleMark, onPress: onGoogle, disabled: !googleRequest },
    ...(Platform.OS === 'ios' ? [{ key: 'apple', Mark: AppleMark, onPress: onApple }] : []),
  ];
}
