import { CreditCard, Globe2, ShieldCheck, Activity } from 'lucide-react';
import { Logo } from '@/components/ui/Misc';

const FEATURES = [
  { icon: Activity, title: 'Real-time case tracking', text: 'Follow every air, ground and rail transfer from request to handover.' },
  { icon: CreditCard, title: 'Transparent billing', text: 'Invoices, payments and statements in one secure place.' },
  { icon: ShieldCheck, title: 'Verified partner network', text: 'Compliance-checked corporates, encrypted documents and banking data.' },
];

/** Abstract globe + flight path illustration for the branding panel. */
function GlobeIllustration() {
  return (
    <svg viewBox="0 0 420 300" className="h-auto w-full max-w-[300px]" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#3374F5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3374F5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="210" cy="150" r="150" fill="url(#glow)" />
      <g fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="1">
        <circle cx="210" cy="150" r="110" />
        <ellipse cx="210" cy="150" rx="110" ry="40" />
        <ellipse cx="210" cy="150" rx="110" ry="80" />
        <ellipse cx="210" cy="150" rx="40" ry="110" />
        <ellipse cx="210" cy="150" rx="80" ry="110" />
        <line x1="100" y1="150" x2="320" y2="150" />
        <line x1="210" y1="40" x2="210" y2="260" />
      </g>
      <path d="M70 210 C 140 60, 290 50, 360 120" fill="none" stroke="#8EBBFD" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
      <circle cx="70" cy="210" r="6" fill="#fff" />
      <circle cx="70" cy="210" r="12" fill="#fff" fillOpacity="0.15" />
      <circle cx="360" cy="120" r="6" fill="#34D399" />
      <circle cx="360" cy="120" r="13" fill="#34D399" fillOpacity="0.2" />
      {/* plane on the route */}
      <g transform="translate(232 70) rotate(18)">
        <path d="M0 -3 L22 -3 L30 0 L22 3 L0 3 Z" fill="#fff" />
        <path d="M10 -3 L4 -15 L9 -15 L18 -3 Z M10 3 L4 15 L9 15 L18 3 Z" fill="#fff" />
        <path d="M1 -3 L-3 -9 L1 -9 L5 -3 Z M1 3 L-3 9 L1 9 L5 3 Z" fill="#fff" />
      </g>
      {/* medical cross badge */}
      <g transform="translate(300 196)">
        <rect width="64" height="64" rx="16" fill="#fff" />
        <path d="M26 14h12v12h12v12H38v12H26V38H14V26h12z" fill="#1A5BE0" />
      </g>
      {/* ECG line */}
      <path d="M40 260 H120 l10 -18 l12 34 l12 -44 l10 28 H220" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden bg-[#0B1F45] px-12 py-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl" />
        <div className="relative mb-6">
          <div className="inline-flex rounded-2xl bg-white px-5 py-3 shadow-lg shadow-black/10">
            <Logo className="h-[88px]" />
          </div>
        </div>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Corporate &amp; Corporate Portal</p>
          <h2 className="mt-3 max-w-md text-[34px] font-semibold leading-tight tracking-tight">Partner with a global medical assistance network.</h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
            Request services, track patient transfers, manage documents and settle invoices — securely, in one place.
          </p>
          <div className="mt-8">
            <GlobeIllustration />
          </div>
          <ul className="mt-6 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <f.icon className="h-[18px] w-[18px] text-brand-200" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="block text-[13px] text-slate-400">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} HumanCare Worldwide</span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5" /> 24×7 operations
          </span>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 lg:hidden">
              <Logo className="h-[80px]" />
            </div>
            {children}
          </div>
        </div>
        <footer className="px-6 pb-6 text-center text-xs text-slate-400 lg:hidden">
          © {new Date().getFullYear()} HumanCare Worldwide · All rights reserved
        </footer>
      </main>
    </div>
  );
}
