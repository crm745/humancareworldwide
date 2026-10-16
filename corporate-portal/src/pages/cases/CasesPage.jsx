import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Download, Eye, FileDown, Plus } from 'lucide-react';

import { SERVICE_TYPES } from '@/data/constants';
import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, RowAction } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { downloadCSV } from '@/utils/download';
import { downloadCaseSummary } from '@/utils/exports';
import { formatDate } from '@/utils/format';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active (Scheduled + In Progress)' },
  ...['Submitted', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'].map((s) => ({ value: s, label: s })),
];
const PRIORITY_RANK = { Low: 0, Medium: 1, High: 2, Emergency: 3 };

/** "Rashid Hospital, Dubai" → city on top, facility below (truncated, full text on hover). */
function Place({ value }) {
  const i = value.lastIndexOf(',');
  const facility = i > 0 ? value.slice(0, i) : value;
  const city = i > 0 ? value.slice(i + 1).trim() : '';
  return (
    <span className="block max-w-[120px] 2xl:max-w-[150px]" title={value}>
      <span className="block truncate font-medium text-slate-800">{city || facility}</span>
      {city && <span className="block truncate text-xs text-slate-500">{facility}</span>}
    </span>
  );
}

export default function CasesPage() {
  useDocumentTitle('Cases / Requests');
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useAsync(() => corporateService.listCases(), []);

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const priority = params.get('priority') ?? '';
  const service = params.get('service') ?? '';

  // Filters live in the URL so dashboard tiles can deep-link and the back button restores them.
  const setParam = (key, value) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (c) =>
        (!term || [c.id, c.patientName, c.pickup, c.destination, c.assignedTeam].some((v) => v.toLowerCase().includes(term))) &&
        (!status || (status === 'active' ? c.status === 'Scheduled' || c.status === 'In Progress' : c.status === status)) &&
        (!priority || c.priority === priority) &&
        (!service || c.service === service),
    );
  }, [data, q, status, priority, service]);

  const columns = [
    {
      key: 'id',
      header: 'Case ID',
      sortable: true,
      primary: true,
      render: (c) => <span className="font-mono text-xs font-semibold text-brand-700">{c.id}</span>,
    },
    {
      key: 'patientName',
      header: 'Patient Name',
      sortable: true,
      wrap: true,
      render: (c) => <span className="font-medium text-slate-900">{c.patientName}</span>,
    },
    { key: 'service', header: 'Service', sortable: true, wrap: true },
    { key: 'pickup', header: 'Pickup Location', hideOnMobile: true, render: (c) => <Place value={c.pickup} /> },
    { key: 'destination', header: 'Destination', hideOnMobile: true, render: (c) => <Place value={c.destination} /> },
    { key: 'requestDate', header: 'Request Date', sortable: true, render: (c) => formatDate(c.requestDate) },
    {
      key: 'assignedTeam',
      header: 'Assigned Team',
      hideOnMobile: true,
      wrap: true,
      className: 'hidden 2xl:table-cell',
      render: (c) => <span className={c.assignedTeam === 'Unassigned' ? 'text-slate-400' : ''}>{c.assignedTeam}</span>,
    },
    { key: 'status', header: 'Status', sortable: true, render: (c) => <StatusBadge status={c.status} /> },
    { key: 'priority', header: 'Priority', sortable: true, sortValue: (c) => PRIORITY_RANK[c.priority], render: (c) => <StatusBadge status={c.priority} /> },
  ];

  const exportCsv = () => {
    downloadCSV(
      `hcw-cases-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Case ID', 'Patient Name', 'Service', 'Pickup Location', 'Destination', 'Request Date', 'Assigned Team', 'Status', 'Priority'],
      rows.map((c) => [c.id, c.patientName, c.service, c.pickup, c.destination, formatDate(c.requestDate), c.assignedTeam, c.status, c.priority]),
    );
    toast.success('Export ready', `${rows.length} case${rows.length === 1 ? '' : 's'} exported to CSV.`);
  };

  const filtered = !!(q || status || priority || service);

  return (
    <div>
      <PageHeader
        title="Cases / Requests"
        description="Track every service request raised by your organisation."
        actions={
          <>
            <Button variant="outline" leftIcon={<FileDown className="h-4 w-4" />} onClick={exportCsv} disabled={!rows.length}>
              Export
            </Button>
            <Link to="/services" className={buttonClasses()}>
              <Plus className="h-4 w-4" /> New Request
            </Link>
          </>
        }
      />
      <Card className="overflow-hidden">
        <FilterBar
          search={q}
          onSearch={(v) => setParam('q', v)}
          placeholder="Search case ID, patient, location…"
          showClear={filtered}
          onClear={() => setParams({}, { replace: true })}
        >
          <Select
            aria-label="Status"
            className="sm:w-56"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
          />
          <Select
            aria-label="Priority"
            className="sm:w-40"
            placeholder="All priorities"
            options={['Low', 'Medium', 'High', 'Emergency']}
            value={priority}
            onChange={(e) => setParam('priority', e.target.value)}
          />
          <Select
            aria-label="Service"
            className="col-span-2 sm:w-56"
            placeholder="All services"
            options={SERVICE_TYPES}
            value={service}
            onChange={(e) => setParam('service', e.target.value)}
          />
        </FilterBar>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(c) => c.id}
            loading={loading}
            initialSort={{ key: 'requestDate', dir: 'desc' }}
            onRowClick={(c) => navigate(`/cases/${c.id}`)}
            actions={(c) => (
              <>
                <RowAction label="View case" onClick={() => navigate(`/cases/${c.id}`)}>
                  <Eye className="h-4 w-4" />
                </RowAction>
                <RowAction
                  label="Download summary"
                  onClick={() => {
                    downloadCaseSummary(c);
                    toast.success('Download started', `${c.id} summary`);
                  }}
                >
                  <Download className="h-4 w-4" />
                </RowAction>
              </>
            )}
            empty={
              <EmptyState
                icon={ClipboardList}
                title={filtered ? 'No cases match your filters' : 'No cases yet'}
                description={filtered ? 'Try a different search or clear the filters.' : 'Request a service to create your first case.'}
                action={
                  filtered ? (
                    <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                      Clear filters
                    </Button>
                  ) : (
                    <Link to="/services" className={buttonClasses()}>
                      Request a service
                    </Link>
                  )
                }
              />
            }
          />
        )}
      </Card>
    </div>
  );
}
