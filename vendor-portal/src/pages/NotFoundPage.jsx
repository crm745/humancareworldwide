import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Misc';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useUtils';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <Logo className="mb-10 h-10" />
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Compass className="h-7 w-7" />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-brand-600">Error 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">We couldn’t find that page</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">The link may be broken or the page may have moved.</p>
      <Link to={isAuthenticated ? '/dashboard' : '/login'} className={buttonClasses({ size: 'lg', className: 'mt-8' })}>
        {isAuthenticated ? 'Back to Dashboard' : 'Go to Vendor Login'}
      </Link>
    </div>
  );
}
