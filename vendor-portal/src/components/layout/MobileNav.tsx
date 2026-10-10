import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MOBILE_NAV } from './navItems';

/** Bottom tab bar on phones; "More" opens the full navigation drawer. */
export function MobileNav({ onMore }: { onMore: () => void }) {
  const item = 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Quick navigation">
      <div className="flex">
        {MOBILE_NAV.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => cn(item, isActive ? 'text-brand-600' : 'text-slate-500')}>
            {({ isActive }) => (
              <>
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-brand-50')}>
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={onMore} className={cn(item, 'text-slate-500')}>
          <span className="flex h-7 w-12 items-center justify-center">
            <MoreHorizontal className="h-5 w-5" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
