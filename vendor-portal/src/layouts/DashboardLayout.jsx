import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { NotificationsProvider } from '@/hooks/useNotifications';
import { readJSON, writeJSON } from '@/utils/storage';
import { cn } from '@/utils/cn';

const COLLAPSE_KEY = 'hcw_sidebar_collapsed';

export function DashboardLayout() {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Tablets and laptops start with the icon rail so wide tables fit; the user's own choice is remembered.
  const [collapsed, setCollapsed] = useState(() => readJSON(COLLAPSE_KEY, null) ?? window.innerWidth < 1536);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Block bodies on purpose: Chrome's scrollTo() now returns a Promise, which React would treat as a cleanup.
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const toggle = () =>
    setCollapsed((c) => {
      writeJSON(COLLAPSE_KEY, !c);
      return !c;
    });

  const doLogout = () => {
    setConfirmLogout(false);
    logout();
    toast.info('You have been logged out', 'See you soon.');
    navigate('/login', { replace: true });
  };

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggle}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onLogout={() => setConfirmLogout(true)}
        />
        <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'md:pl-[76px]' : 'md:pl-64')}>
          <Header onOpenMenu={() => setMobileOpen(true)} onLogout={() => setConfirmLogout(true)} />
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <MobileNav onMore={() => setMobileOpen(true)} />
        <ConfirmDialog
          open={confirmLogout}
          onClose={() => setConfirmLogout(false)}
          onConfirm={doLogout}
          title="Log out of the Vendor Portal?"
          message="You will need to sign in again to access cases, invoices and payments."
          confirmLabel="Logout"
        />
      </div>
    </NotificationsProvider>
  );
}
