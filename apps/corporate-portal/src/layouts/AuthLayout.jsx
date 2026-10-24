import { Globe, Globe2, ShieldCheck, Headset, Users } from 'lucide-react';
import { Logo } from '@/components/ui/Misc';

const HIGHLIGHTS = [
  { icon: Globe, label: 'Worldwide Coverage' },
  { icon: ShieldCheck, label: 'Trusted Partner' },
  { icon: Headset, label: '24/7 Support' },
  { icon: Users, label: 'Global Network' },
];

/** Decorative background behind the branding panel: world-map dot texture inside an
 * orbit ring, outline medical crosses in the corners, and a heart/pulse accent on the
 * bottom curve — same brand navy/blue palette as the rest of the panel, nothing new. */
function PanelArt() {
  const dots = [];
  // Scatter, not a literal map — a few rings of dots inside the circle read as a
  // "globe" texture without claiming to be real geography.
  for (let ring = 0; ring < 6; ring++) {
    const r = 40 + ring * 22;
    const count = 10 + ring * 4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + ring;
      dots.push({ x: 210 + r * Math.cos(angle), y: 210 + r * 0.55 * Math.sin(angle), key: `${ring}-${i}` });
    }
  }
  return (
    <svg viewBox="0 0 420 600" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* corner crosses */}
      <g stroke="#fff" strokeOpacity="0.1" strokeWidth="3" fill="none">
        <path d="M-10 10 h40 M10 -10 v40" transform="translate(10 10)" />
        <path d="M-10 10 h40 M10 -10 v40" transform="translate(10 470) scale(1.4)" />
      </g>
      {/* orbit ring + dot-globe texture */}
      <circle cx="210" cy="210" r="175" fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="210" cy="210" r="175" fill="none" stroke="#5995FA" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="2 6" />
      {dots.map((d) => (
        <circle key={d.key} cx={d.x} cy={d.y} r="1.6" fill="#8EBBFD" fillOpacity="0.35" />
      ))}
      {/* bottom sweeping band */}
      <path d="M-20 560 C 140 460, 300 620, 460 500 L460 650 L-20 650 Z" fill="#5995FA" fillOpacity="0.07" />
      <path d="M-20 560 C 140 460, 300 620, 460 500" fill="none" stroke="#8EBBFD" strokeOpacity="0.3" strokeWidth="2" />
      {/* heart + pulse */}
      <g transform="translate(300 495)">
        <path
          d="M40 14 C40 2 28 -6 16 2 C10 -2 0 -2 -6 6 C-14 16 -10 30 4 42 L16 52 L28 42 C42 30 46 22 40 14 Z"
          fill="none"
          stroke="#8EBBFD"
          strokeOpacity="0.45"
          strokeWidth="2.5"
        />
        <path d="M-6 24 H8 l4 -8 l5 16 l5 -20 l4 12 H34" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function AuthLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="relative hidden w-[34%] max-w-[420px] flex-col justify-between overflow-hidden bg-[#0B1F45] px-8 py-9 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-600/25 blur-3xl" />
        <PanelArt />
        <div className="relative mb-6">
          <div className="inline-flex rounded-2xl bg-white px-4 py-2.5 shadow-lg shadow-black/10">
            <Logo className="h-[60px]" />
          </div>
        </div>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Corporate Portal</p>
          <span className="mt-4 block h-1 w-10 rounded-full bg-brand-400" />
          <h2 className="mt-3 max-w-xs text-[32px] font-bold leading-tight tracking-tight">Global Medical Assistance</h2>
          <div className="mt-7 flex max-w-[280px] justify-between gap-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.label} className="flex w-16 flex-col items-center gap-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-300/50">
                  <h.icon className="h-[18px] w-[18px] text-brand-200" strokeWidth={1.75} />
                </span>
                <span className="text-[11px] leading-tight text-slate-300">{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} HumanCare Worldwide</span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5" /> 24×7 operations
          </span>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 lg:hidden">
              <Logo className="h-[60px]" />
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
