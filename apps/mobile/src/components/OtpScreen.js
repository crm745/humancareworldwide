import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { navReplace } from '../lib/nav';
import { saveTokens } from '../lib/session';
import { BackButton, Body, Screen } from './layout';
import { Button, Input, Heading, Spacer, Text } from './ui';
import { OtpInput, otpComplete } from './widgets';

const RESEND_COOLDOWN_SECONDS = 30; // matches the backend's own cooldown

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Shared by login-otp, register-otp and corporate-otp: 6 digits, then sign in as `session`.
// `onVerify(code, identifier)` / `onResend(identifier)` take the CURRENT identifier (not
// a stale value from the caller's own route params), since it can change right here via
// the edit link. `onChangeIdentifier(newIdentifier)` sends a fresh OTP to that new value
// and, on success, this screen starts treating it as the current one. Any of the three
// can be left out — screens that can't support them (corporate-otp has no password to
// replay) just don't get that affordance.
export function OtpScreen({ titleKey, identifier, session, compact, onVerify, onResend, onChangeIdentifier }) {
  const { t, toast, setSession, setProfile } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [currentId, setCurrentId] = useState(identifier);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(identifier);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const verify = async () => {
    if (!otpComplete(code)) { toast('Enter all 6 digits'); return; }
    if (!onVerify) { setSession(session); navReplace('/home'); return; }

    setBusy(true);
    try {
      const { token, refreshToken, profile } = await onVerify(code, currentId);
      await saveTokens({ token, refreshToken });
      if (profile) setProfile(profile);
      setSession(session);
      navReplace('/home');
    } catch (err) {
      toast(err.message || 'Could not verify code');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (secondsLeft > 0 || !onResend || resending) return;
    setResending(true);
    try {
      await onResend(currentId);
      toast('A new code has been sent.');
      setCode('');
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast(err.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  const startEdit = () => { setEditValue(currentId); setEditing(true); };

  const saveEdit = async () => {
    const next = editValue.trim();
    if (!next || next === currentId) { setEditing(false); return; }
    setSavingEdit(true);
    try {
      await onChangeIdentifier(next);
      setCurrentId(next);
      setCode('');
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setEditing(false);
      toast('Code sent to the new number/email.');
    } catch (err) {
      toast(err.message || 'Could not send a code to that number/email.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Screen bg={compact ? 'bg-canvas' : 'bg-white'}>
      <Body contentClassName="p-[26px]">
        <BackButton className={compact ? 'mb-[22px]' : 'mb-10'} />
        <Heading className={compact ? 'text-[21.5px]' : 'text-center text-[27.5px]'}>{t(titleKey)}</Heading>

        {editing ? (
          <View className={compact ? 'mb-6 mt-1.5' : 'mb-8 mt-3.5'}>
            <Input large value={editValue} onChangeText={setEditValue} autoCapitalize="none" placeholder="Mobile number or email" />
            <View className="mt-2.5 flex-row justify-end gap-4">
              <Text className="font-inter-bold text-[13.5px] text-faint" onPress={() => setEditing(false)}>Cancel</Text>
              <Text className="font-inter-bold text-[13.5px] text-primary" onPress={savingEdit ? undefined : saveEdit}>{savingEdit ? 'Sending…' : 'Save & resend'}</Text>
            </View>
          </View>
        ) : (
          <Text className={`${compact ? 'mb-6 mt-1.5 text-[14px]' : 'mb-8 mt-3.5 text-center text-[15.5px]'} text-muted`}>
            {t('otp_sent_to')} <Text className="font-inter-bold text-navy">{currentId}</Text>
            {onChangeIdentifier ? <Text className="font-inter-bold text-[11px] text-primary" onPress={startEdit}> Edit</Text> : null}
          </Text>
        )}

        <OtpInput value={code} onChange={setCode} large={!compact} />
        <View className={`items-center ${compact ? 'mt-4' : 'mt-5'}`}>
          {secondsLeft > 0 ? (
            <Text className="text-[14.5px] text-faint">Resend code in {formatTime(secondsLeft)}</Text>
          ) : onResend ? (
            <Pressable onPress={resend} disabled={resending}>
              <Text className="font-inter-bold text-[14.5px] text-primary">{resending ? 'Resending…' : 'Resend code'}</Text>
            </Pressable>
          ) : (
            <Text className="text-[14.5px] text-faint">{"Didn't get it? Go back and try again."}</Text>
          )}
        </View>
        <Spacer />
        <Button large={!compact} title={t('otp_verify_btn')} onPress={verify} loading={busy} />
      </Body>
    </Screen>
  );
}
