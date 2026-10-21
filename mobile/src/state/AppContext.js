import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import I18N from '../data/i18n.json';
import { apiGet } from '../lib/api';
import { getAccessToken } from '../lib/session';

const AppContext = createContext(null);

const INITIAL_PROFILE = { name: '', cc: '+91', phone: '', email: '' };

// `/auth/me` returns either `{ user }` (patient) or `{ corporateUser }` (corporate),
// shaped by the role baked into the JWT — same split login.js/corporate-otp.js already
// make when they set the profile right after a fresh login.
function profileFromMe(data) {
  if (data.corporateUser) {
    const c = data.corporateUser;
    return { session: 'corporate', profile: { name: c.corporate?.companyName || c.email, cc: '+91', phone: '', email: c.email } };
  }
  const u = data.user;
  return { session: 'patient', profile: { name: u.name, cc: u.countryCode || '+91', phone: u.mobile || '', email: u.email } };
}

export const INITIAL_DRAFT = {
  service: 'air',
  name: '',
  age: '',
  gender: '',
  location: '',
  country: '',
  cc: '+91',
  phone: '',
  care: '', // single-select; only asked for air & ground ambulance (see needsCareLevel)
  desc: '',
  dest: '',
  date: '',
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

  // Runs on every app/provider mount — not just the splash screen's — so a saved
  // session still gets a real name/email loaded even when the browser is reloaded
  // (or the app re-launched) directly on an already-authenticated screen like Home,
  // not just when the user walks through Splash first.
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const data = await apiGet('/auth/me');
        const restored = profileFromMe(data);
        setProfile(restored.profile);
        setSession(restored.session);
      } catch {
        // Invalid/expired session — apiFetch already clears the tokens and redirects
        // to Welcome on an unrecoverable 401, nothing more to do here.
      }
    })();
  }, []);

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
