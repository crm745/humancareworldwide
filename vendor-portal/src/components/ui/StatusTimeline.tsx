import { Check, Clock3, Loader2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

export type TimelineStatus = 'complete' | 'current' | 'pending' | 'failed';

export interface TimelineItem {
  title: string;
  description?: string;
  status: TimelineStatus;
  date?: string;
}

const LABEL: Record<TimelineStatus, string> = { complete: 'Completed', current: 'In progress', pending: 'Pending', failed: 'Action needed' };

export function StatusTimeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('relative', className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <li key={item.title} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                className={cn('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', item.status === 'complete' ? 'bg-brand-600' : 'bg-slate-200')}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                item.status === 'complete' && 'bg-brand-600 text-white',
                item.status === 'current' && 'bg-amber-50 text-amber-600 ring-2 ring-amber-400',
                item.status === 'pending' && 'bg-white text-slate-400 ring-1 ring-slate-300',
                item.status === 'failed' && 'bg-red-50 text-red-600 ring-2 ring-red-400',
              )}
            >
              {item.status === 'complete' && <Check className="h-4 w-4" strokeWidth={3} />}
              {item.status === 'current' && <Loader2 className="h-4 w-4 animate-spin [animation-duration:2.4s]" />}
              {item.status === 'pending' && <Clock3 className="h-4 w-4" />}
              {item.status === 'failed' && <X className="h-4 w-4" strokeWidth={3} />}
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={cn('text-sm font-semibold', item.status === 'pending' ? 'text-slate-500' : 'text-slate-900')}>{item.title}</p>
                <span
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wide',
                    item.status === 'complete' && 'text-brand-600',
                    item.status === 'current' && 'text-amber-600',
                    item.status === 'pending' && 'text-slate-400',
                    item.status === 'failed' && 'text-red-600',
                  )}
                >
                  {LABEL[item.status]}
                </span>
              </div>
              {item.description && <p className="mt-0.5 text-[13px] text-slate-500">{item.description}</p>}
              {item.date && <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(item.date)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
