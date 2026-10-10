import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TableSkeleton } from './Loading';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  /** Value used for sorting; defaults to row[key]. */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  className?: string;
  align?: 'left' | 'right';
  /** On phones, this column becomes the card title. */
  primary?: boolean;
  hideOnMobile?: boolean;
  /** Let long text wrap so the table fits instead of scrolling sideways. */
  wrap?: boolean;
}

export type SortState = { key: string; dir: 'asc' | 'desc' };

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  pageSize?: number;
  initialSort?: SortState;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  empty?: ReactNode;
}

const valueOf = <T,>(row: T, col: Column<T>): string | number => {
  if (col.sortValue) return col.sortValue(row);
  const v = (row as unknown as Record<string, unknown>)[col.key];
  return typeof v === 'number' ? v : String(v ?? '');
};

/**
 * Sortable, paginated table. Below the xl breakpoint (1280px) each row renders as a card
 * (primary column as the title, the rest as label/value pairs).
 */
export function DataTable<T>({ data, columns, rowKey, loading, pageSize = 10, initialSort, onRowClick, actions, empty }: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [data, sort]);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = valueOf(a, col);
      const vb = valueOf(b, col);
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true })) * factor;
    });
  }, [data, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : undefined) : { key, dir: 'asc' }));

  if (loading) return <TableSkeleton cols={Math.min(columns.length, 6)} />;
  if (!data.length) return <>{empty ?? <EmptyState title="Nothing to show" description="No records match the current filters." />}</>;

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const cell = (row: T, col: Column<T>) => (col.render ? col.render(row) : String((row as unknown as Record<string, unknown>)[col.key] ?? '—'));

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {columns.map((col) => (
                <th key={col.key} scope="col" className={cn('whitespace-nowrap px-2.5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-5', col.align === 'right' && 'text-right', col.className)}>
                  {col.sortable ? (
                    <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 uppercase hover:text-slate-800">
                      {col.header}
                      {sort?.key === col.key ? (sort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {actions && <th className="px-4 py-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors hover:bg-slate-50/80', onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-2.5 py-3.5 text-slate-700 first:pl-5', col.wrap ? 'min-w-[96px] leading-snug' : 'whitespace-nowrap', col.align === 'right' && 'text-right', col.className)}>
                    {cell(row, col)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-2 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone / tablet cards (two columns on tablets) */}
      <ul className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-px md:divide-y-0 md:bg-slate-100 xl:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className={cn('bg-white px-4 py-4', onRowClick && 'cursor-pointer active:bg-slate-50')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            <div className="font-semibold text-slate-900">{cell(row, primary)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {columns
                .filter((c) => c !== primary && !c.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{col.header}</dt>
                    <dd className="mt-0.5 truncate text-[13px] text-slate-700">{cell(row, col)}</dd>
                  </div>
                ))}
            </dl>
            {actions && (
              <div className="mt-3 flex flex-wrap justify-end gap-1 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Pagination page={current} pages={pages} total={sorted.length} pageSize={pageSize} onChange={setPage} />
    </div>
  );
}

export function Pagination({ page, pages, total, pageSize, onChange }: { page: number; pages: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const btn = 'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-[13px] font-medium transition-colors disabled:opacity-40';
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:px-5">
      <p className="text-[13px] text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button type="button" className={cn(btn, 'text-slate-600 hover:bg-slate-100')} onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {nums.map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === page ? 'page' : undefined}
                className={cn(btn, n === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" className={cn(btn, 'text-slate-600 hover:bg-slate-100')} onClick={() => onChange(page + 1)} disabled={page === pages} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

/** Small square icon button for table row actions. */
export function RowAction({ label, onClick, children, tone = 'default' }: { label: string; onClick: () => void; children: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors',
        tone === 'danger' ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-brand-50 hover:text-brand-600',
      )}
    >
      {children}
    </button>
  );
}
