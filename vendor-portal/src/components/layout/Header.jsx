import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Building2, ChevronDown, ClipboardList, LifeBuoy, LogOut, Menu, Receipt, Search, Settings, User, X } from 'lucide-react';

import { vendorService } from '@/services/vendorService';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useClickOutside, useDebounce } from '@/hooks/useUtils';
import { Avatar, Dropdown, Logo } from '@/components/ui/Misc';
import { Spinner } from '@/components/ui/Loading';
import { relativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const KIND_ICON = { case: ClipboardList, patient: User, invoice: Receipt };

function GlobalSearch({ autoFocus, onDone }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const debounced = useDebounce(q, 220);
  const ref = useClickOutside(() => setOpen(false));
  const inputRef = useRef(null);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    setLoading(true);
    vendorService.search(debounced).then((r) => {
      if (!live) return;
      setResults(r);
      setActive(0);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [debounced]);

  // "/" focuses search from anywhere (except while typing in a field).
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (to) => {
    setOpen(false);
    setQ('');
    onDone?.();
    navigate(to);
  };

  return (
    <div ref={ref} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            if (results[active]) go(results[active].to);
            else if (q.trim()) go(`/cases?q=${encodeURIComponent(q.trim())}`);
          } else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Search cases, patients, invoices…"
        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        aria-label="Search"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-400 lg:block">
        /
      </kbd>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 animate-scale-in overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-elevated">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <Spinner className="h-4 w-4" /> Searching…
            </div>
          ) : results.length ? (
            results.map((r, i) => {
              const Icon = KIND_ICON[r.kind];
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.to)}
                  className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left', i === active && 'bg-slate-50')}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{r.title}</span>
                    <span className="block truncate text-xs text-slate-500">{r.subtitle}</span>
                  </span>
                  <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-slate-400">{r.kind}</span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500">No results for “{q}”.</p>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, setRead, markAllRead } = useNotifications();
  return (
    <Dropdown
      className="w-[min(380px,calc(100vw-24px))]"
      trigger={() => (
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2.5 pt-1">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.slice(0, 5).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setRead(n.id, true);
                    close();
                    if (n.link) navigate(n.link);
                  }}
                  className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50', !n.read && 'bg-brand-50/40')}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-600')} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-slate-900">{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{relativeTime(n.date)}</span>
                  </span>
                </button>
              </li>
            ))}
            {!items.length && <li className="px-4 py-6 text-center text-sm text-slate-500">You’re all caught up.</li>}
          </ul>
          <Link
            to="/notifications"
            onClick={close}
            className="block border-t border-slate-100 px-4 pt-2.5 text-center text-[13px] font-medium text-brand-600 hover:underline"
          >
            View all notifications
          </Link>
        </div>
      )}
    </Dropdown>
  );
}

export function Header({ onOpenMenu, onLogout }) {
  const { user } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);
  if (!user) return null;
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onOpenMenu} className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/dashboard" className="md:hidden" aria-label="Dashboard">
          <Logo className="h-8" />
        </Link>

        <div className="hidden max-w-md flex-1 sm:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setMobileSearch(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 sm:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
          <NotificationBell />
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          <Dropdown
            className="w-64"
            trigger={(open) => (
              <button type="button" className="flex items-center gap-2.5 rounded-lg p-1 pr-2 hover:bg-slate-100" aria-label="Account menu" aria-expanded={open}>
                <Avatar name={user.companyName || user.username} size="sm" />
                <span className="hidden text-left lg:block">
                  <span className="block max-w-[180px] truncate text-[13px] font-semibold text-slate-900">{user.companyName}</span>
                  <span className="block max-w-[180px] truncate text-[11px] text-slate-500">{user.username}</span>
                </span>
                <ChevronDown className={cn('hidden h-4 w-4 text-slate-400 transition-transform lg:block', open && 'rotate-180')} />
              </button>
            )}
          >
            {(close) => (
              <div>
                <div className="border-b border-slate-100 px-4 pb-3 pt-1.5">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.companyName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{user.vendorId}</p>
                </div>
                {[
                  { to: '/profile', label: 'Company Profile', icon: Building2 },
                  { to: '/settings', label: 'Settings', icon: Settings },
                  { to: '/support', label: 'Help & Support', icon: LifeBuoy },
                ].map((it) => (
                  <Link key={it.to} to={it.to} onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <it.icon className="h-4 w-4 text-slate-400" /> {it.label}
                  </Link>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            )}
          </Dropdown>
        </div>
      </div>

      {mobileSearch && (
        <div className="fixed inset-0 z-[60] bg-white p-3 sm:hidden">
          <div className="flex items-center gap-2">
            <GlobalSearch autoFocus onDone={() => setMobileSearch(false)} />
            <button type="button" onClick={() => setMobileSearch(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close search">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
