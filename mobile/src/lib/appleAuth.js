import * as AppleAuthentication from 'expo-apple-authentication';

// Apple only ever sends the person's name on their very first authorization,
// in this SDK response — not inside the identity token, and never again after that.
export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const name = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
    : undefined;
  return { idToken: credential.identityToken, name };
}
