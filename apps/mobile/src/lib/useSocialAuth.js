import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useGoogleAuth, isGoogleConfigured } from './googleAuth';
import { signInWithApple } from './appleAuth';
import { apiPost } from './api';
import { GoogleMark, AppleMark } from '../components/SocialMarks';

// Shared by login.js and register.js: Google works on both platforms, Apple is
// iOS-only (per App Store rule — see the task doc). `afterSocialLogin` gets the
// backend's { token, refreshToken, user } once either provider succeeds.
export function useSocialAuth({ toast, afterSocialLogin }) {
  const [googleRequest, googleResponse, promptGoogleAsync] = useGoogleAuth();

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token;
      apiPost('/auth/google', { idToken })
        .then(afterSocialLogin)
        .catch((err) => toast(err.message));
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
      toast(err.message || 'Apple sign-in failed');
    }
  };

  return [
    { key: 'google', Mark: GoogleMark, onPress: onGoogle, disabled: !googleRequest },
    ...(Platform.OS === 'ios' ? [{ key: 'apple', Mark: AppleMark, onPress: onApple }] : []),
  ];
}
