import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Logo } from '@/components/ui/Misc';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { NAV_SECTIONS } from './navItems';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

function NavContent({ collapsed, onNavigate, onLogout }: { collapsed: boolean; onNavigate?: () => void; onLogout: () => void }) {
  const { unreadCount } = useNotifications();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]" aria-label="Main navigation">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{section.title}</p>}
          <ul className="space-y-0.5">
            {section.items.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute -left-3 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r-full bg-brand-600" />}
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />
                      {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      {path === '/notifications' && unreadCount > 0 && (
                        <span className={cn('rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white', collapsed && 'absolute right-1.5 top-1')}>{unreadCount}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? 'Logout' : undefined}
        className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600', collapsed && 'justify-center px-0')}
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && 'Logout'}
      </button>
    </nav>
  );
}

function VendorChip({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  if (collapsed || !user) return null;
  return (
    <div className="m-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="h-4 w-4" /> Verified Vendor
      </div>
      <p className="mt-1.5 truncate text-[13px] font-medium text-slate-800">{user.companyName}</p>
      <p className="font-mono text-[11px] text-slate-500">{user.vendorId}</p>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onLogout }: SidebarProps) {
  return (
    <>
      {/* Tablet / desktop: fixed rail, collapsible to icons */}
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex', collapsed ? 'w-[76px]' : 'w-64')}>
        <div className={cn('flex h-16 items-center border-b border-slate-100', collapsed ? 'justify-center px-2' : 'px-5')}>
          {collapsed ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">HC</span>
          ) : (
            <Logo className="h-10" />
          )}
        </div>
        <NavContent collapsed={collapsed} onLogout={onLogout} />
        <VendorChip collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-11 items-center justify-center gap-2 border-t border-slate-100 text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : (
            <>
              <ChevronsLeft className="h-4 w-4" /> Collapse
            </>
          )}
        </button>
      </aside>

      {/* Phone: slide-in drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[55] md:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/45" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in-left flex-col bg-white shadow-elevated">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <Logo className="h-9" />
              <button type="button" onClick={onCloseMobile} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent collapsed={false} onNavigate={onCloseMobile} onLogout={onLogout} />
            <VendorChip collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}
