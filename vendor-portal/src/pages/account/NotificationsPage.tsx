import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BellOff, CheckCheck, CheckCircle2, ClipboardList, Info, MailOpen, Mail, Receipt, Trash2 } from 'lucide-react';
import type { NotificationType } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader, Tabs } from '@/components/ui/Misc';
import { relativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const TYPE_STYLE: Record<NotificationType, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  info: { icon: Info, cls: 'bg-brand-50 text-brand-600' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50 text-amber-600' },
  case: { icon: ClipboardList, cls: 'bg-violet-50 text-violet-600' },
  invoice: { icon: Receipt, cls: 'bg-red-50 text-red-600' },
};

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const navigate = useNavigate();
  const { items, loading, unreadCount, setRead, markAllRead, remove } = useNotifications();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const list = tab === 'unread' ? items.filter((n) => !n.read) : items;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your cases, documents, invoices and account."
        actions={
          <Button variant="outline" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={markAllRead} disabled={!unreadCount}>
            Mark all as read
          </Button>
        }
      />
      <Card>
        <div className="px-5 pt-2">
          <Tabs
            tabs={[
              { key: 'all', label: 'All', count: items.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {loading ? (
          <div className="space-y-4 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : list.length ? (
          <ul className="divide-y divide-slate-100">
            {list.map((n) => {
              const { icon: Icon, cls } = TYPE_STYLE[n.type];
              return (
                <li key={n.id} className={cn('group flex gap-4 px-5 py-4 transition-colors', !n.read && 'bg-brand-50/35')}>
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cls)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setRead(n.id, true);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {n.title}
                      {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-600">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{relativeTime(n.date)}</p>
                  </button>
                  <div className="flex shrink-0 items-start gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => setRead(n.id, !n.read)}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title={n.read ? 'Mark as unread' : 'Mark as read'}
                      aria-label={n.read ? 'Mark as unread' : 'Mark as read'}
                    >
                      {n.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => remove(n.id)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete" aria-label="Delete notification">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={BellOff} title={tab === 'unread' ? 'No unread notifications' : 'No notifications'} description="You’re all caught up." />
        )}
      </Card>
    </div>
  );
}
