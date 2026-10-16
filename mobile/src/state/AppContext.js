import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import I18N from '../data/i18n.json';

const AppContext = createContext(null);

const INITIAL_PROFILE = { name: 'Rakesh Sharma', cc: '+91', phone: '98765 43210', email: 'rakesh.sharma@example.com' };

// Pre-filled the same way the prototype's request form is, so a demo run-through is quick.
export const INITIAL_DRAFT = {
  service: 'air',
  name: 'Rakesh Sharma',
  age: '45',
  gender: 'Male',
  location: 'Mumbai, India',
  cc: '+91',
  phone: '',
  care: ['care_stable'], // multi-select; only asked for air & ground ambulance (see needsCareLevel)
  desc: '',
  dest: 'Dubai, UAE',
  date: '2026-09-25',
  uploadedFile: null, // { uri, name, mimeType, size } from expo-document-picker, or null
  extra: '',
  special: '',
  source: '',
  sourceOther: '', // free text when source is "Other"
};

// Care Level only matters for patient transport: the air ambulance options and ground ambulance.
const CARE_LEVEL_SERVICES = ['air', 'privatecharter', 'commercialair', 'ground'];
export const needsCareLevel = (serviceKey) => CARE_LEVEL_SERVICES.includes(serviceKey);

export function initialsOf(name) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}

export function AppProvider({ children }) {
  const [lang, setLang] = useState('EN');
  const [session, setSession] = useState('patient'); // 'patient' | 'corporate'
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  const t = useCallback((key) => (I18N[lang] && I18N[lang][key]) ?? I18N.EN[key] ?? key, [lang]);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);

  const updateDraft = useCallback((patch) => setDraft((d) => ({ ...d, ...patch })), []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isRTL: lang === 'AR',
      t,
      session,
      setSession,
      isCorporate: session === 'corporate',
      profile,
      setProfile,
      draft,
      updateDraft,
      resetDraft: (service) => setDraft({ ...INITIAL_DRAFT, service }),
      toast,
      toastMsg,
    }),
    [lang, t, session, profile, draft, updateDraft, toast, toastMsg]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
