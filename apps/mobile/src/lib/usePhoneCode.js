import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../state/AppContext';
import { apiPost } from './api';
import { confirmPhoneCode, sendPhoneCode } from './phoneAuth';

// For every code screen. `step` is what the previous screen stored via authFlow.
//
// When the backend says phoneVerification === "firebase", the app sends the SMS itself
// through Firebase as soon as the screen opens, and `proof(code)` turns the typed code
// into Firebase's ID token. Otherwise the backend has already sent the code and the
// typed code is the proof. Either way the screen just does:
//   apiPost(url, { ticket, ...(await proof(code)) })
export function usePhoneCode(step) {
  const { toast } = useApp();
  const isFirebase = step?.phoneVerification === 'firebase';
  const phoneNumber = step?.phoneNumber;
  const ticket = step?.ticket;
  const pending = useRef(null); // the send in progress (a promise of Firebase's confirmation handle)
  const started = useRef(false);

  const send = useCallback(() => {
    pending.current = sendPhoneCode(phoneNumber);
    return pending.current;
  }, [phoneNumber]);

  // Send once when the screen opens. The ref keeps React's development double-run of
  // effects from sending two SMS.
  useEffect(() => {
    if (!isFirebase || started.current) return;
    started.current = true;
    send().catch((err) => toast(err.message));
  }, [isFirebase, send, toast]);

  const proof = useCallback(async (code) => {
    if (!isFirebase) return { code };
    let confirmation;
    try {
      confirmation = await pending.current;
    } catch {
      confirmation = null;
    }
    if (!confirmation) {
      throw Object.assign(new Error('The code could not be sent. Tap "Resend OTP" to try again.'), { code: 'otp_missing' });
    }
    return { firebaseIdToken: await confirmPhoneCode(confirmation, code) };
  }, [isFirebase]);

  const resend = useCallback(
    () => (isFirebase ? send() : apiPost('/auth/otp/resend', { ticket })),
    [isFirebase, send, ticket],
  );

  return { proof, resend };
}
