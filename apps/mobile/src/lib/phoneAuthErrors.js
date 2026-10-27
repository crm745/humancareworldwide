// Turns Firebase phone-auth errors into the same { code, message } shape our own OTP
// errors use, so OtpScreen shows the same inline messages whichever system sent the SMS.
const BY_FIREBASE_CODE = {
  'auth/invalid-verification-code': ['otp_invalid', 'Incorrect code.'],
  'auth/missing-verification-code': ['otp_invalid', 'Enter all 6 digits.'],
  'auth/code-expired': ['otp_expired', 'Code expired.'],
  'auth/session-expired': ['otp_expired', 'Code expired.'],
  'auth/too-many-requests': ['otp_throttled', 'Too many attempts. Please wait a while and try again.'],
  'auth/quota-exceeded': ['otp_throttled', "We can't send more codes right now. Please try again later."],
  'auth/invalid-phone-number': ['invalid_phone', "This mobile number isn't valid."],
  'auth/network-request-failed': ['network', 'No internet connection. Please try again.'],
  // Phone sign-in turned off, or SMS not allowed for this country (Firebase console >
  // Authentication > Settings > SMS region policy).
  'auth/operation-not-allowed': ['sms_not_allowed', "We can't send codes to this country's numbers yet. Please contact support."],
  // The Firebase project is on the free (Spark) plan: only the console's test numbers get
  // codes. Real SMS needs the Blaze plan (Firebase console > Usage and billing).
  'auth/billing-not-enabled': ['sms_not_allowed', "We can't send SMS codes right now. Please try again later or contact support."],
};

export function phoneAuthError(err, fallback = 'Something went wrong with the code. Please try again.') {
  // Unknown Firebase errors still show a friendly message, but the real code goes to the
  // console so a developer can see what Firebase actually said.
  if (err?.code && !BY_FIREBASE_CODE[err.code]) console.warn('Firebase phone auth error:', err.code, err.message);
  return toAppError(err, fallback);
}

function toAppError(err, fallback) {
  const [code, message] = BY_FIREBASE_CODE[err?.code] || ['phone_auth_failed', fallback];
  const out = new Error(message);
  out.code = code;
  out.firebaseCode = err?.code;
  return out;
}
