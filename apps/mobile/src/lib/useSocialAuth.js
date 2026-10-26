import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useGoogleSignIn, isGoogleConfigured } from './googleAuth';
import { signInWithApple } from './appleAuth';
import { apiPost } from './api';
import { setAuthStep } from './authFlow';
import { GoogleMark, AppleMark } from '../components/SocialMarks';

// Used by login.js: Google works on both platforms, Apple is
// iOS-only (per App Store rule — see the task doc). `afterSocialLogin` gets the
// backend's { token, refreshToken, user } once either provider succeeds.
export function useSocialAuth({ toast, afterSocialLogin }) {
  // An existing account is signed straight in. Someone new gets a sign-up ticket with the
  // name and email the provider vouched for, and finishes on complete-profile.js (mobile
  // + consents). Without a ticket (provider hadn't verified the email) it's the full form.
  const onFailed = (err) => {
    if (err.code === 'no_account' && err.data?.signupTicket) {
      setAuthStep('social-signup', { signupTicket: err.data.signupTicket, ...err.data.profile });
      router.push('/complete-profile');
      return;
    }
    toast(err.message);
    if (err.code === 'no_account') router.push('/register');
  };

  // googleAuth.web.js (popup) on web, googleAuth.native.js (native picker) on phones.
  const google = useGoogleSignIn();

  const onGoogle = async () => {
    if (!isGoogleConfigured) { toast('Google sign-in isn’t set up yet.'); return; }
    try {
      const idToken = await google.signIn();
      if (!idToken) return; // closed the picker
      await afterSocialLogin(await apiPost('/auth/google', { idToken }));
    } catch (err) {
      onFailed(err);
    }
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
    { key: 'google', Mark: GoogleMark, onPress: onGoogle, disabled: !google.ready },
    ...(Platform.OS === 'ios' ? [{ key: 'apple', Mark: AppleMark, onPress: onApple }] : []),
  ];
}
