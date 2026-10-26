// Firebase phone sign-in on iOS/Android (@react-native-firebase). Firebase sends the SMS
// and checks the code; we only keep the ID token it returns, which the backend verifies.
// Firebase's own sign-in session is dropped straight away — the app uses our session.
//
// The native module is required lazily: Expo Go doesn't include it, and this way the
// app still runs there as long as the backend isn't in Firebase mode.
import { phoneAuthError } from './phoneAuthErrors';

function firebaseAuth() {
  return require('@react-native-firebase/auth');
}

// Returns a handle to pass to confirmPhoneCode.
export async function sendPhoneCode(phoneNumber) {
  const { getAuth, signInWithPhoneNumber } = firebaseAuth();
  try {
    return await signInWithPhoneNumber(getAuth(), phoneNumber);
  } catch (err) {
    throw phoneAuthError(err, "We couldn't send the code. Please try again.");
  }
}

// Returns Firebase's ID token (the proof our backend checks).
export async function confirmPhoneCode(confirmation, code) {
  const { getAuth, getIdToken, signOut } = firebaseAuth();
  try {
    const credential = await confirmation.confirm(code);
    // Android can verify the SMS by itself and sign in before the code is typed; then
    // confirm() has nothing left to return and the signed-in user is the one we want.
    const user = credential?.user || getAuth().currentUser;
    if (!user) throw Object.assign(new Error('No user after confirm'), { code: 'auth/invalid-verification-code' });
    const token = await getIdToken(user);
    await signOut(getAuth());
    return token;
  } catch (err) {
    throw phoneAuthError(err);
  }
}
