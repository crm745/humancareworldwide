import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ShieldCheck, Users } from 'lucide-react';
import type { Patient } from '@/types';
import { SERVICE_TYPES } from '@/data/constants';
import { vendorService } from '@/services/vendorService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, RowAction, type Column } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Avatar, PageHeader } from '@/components/ui/Misc';

export default function PatientsPage() {
  useDocumentTitle('Patients');
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => vendorService.listPatients(), []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [service, setService] = useState('');
  const [country, setCountry] = useState('');

  const countries = useMemo(() => [...new Set((data ?? []).map((p) => p.country).filter((c) => c !== '—'))].sort(), [data]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.caseId.toLowerCase().includes(term)) &&
        (!status || p.status === status) &&
        (!service || p.service === service) &&
        (!country || p.country === country),
    );
  }, [data, q, status, service, country]);

  // List view shows identity and case info only — medical details stay on the profile page.
  const columns: Column<Patient>[] = [
    { key: 'id', header: 'Patient ID', sortable: true, render: (p) => <span className="font-mono text-[13px] text-slate-600">{p.id}</span> },
    {
      key: 'name',
      header: 'Patient Name',
      sortable: true,
      primary: true,
      wrap: true,
      render: (p) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={p.name} size="sm" />
          <span className="font-medium text-slate-900">{p.name}</span>
        </span>
      ),
    },
    { key: 'age', header: 'Age', sortable: true, align: 'right' },
    { key: 'gender', header: 'Gender' },
    { key: 'country', header: 'Country', sortable: true },
    { key: 'service', header: 'Service', sortable: true, hideOnMobile: true, wrap: true },
    { key: 'caseId', header: 'Case ID', render: (p) => <span className="font-mono text-[13px] text-brand-700">{p.caseId}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (p) => <StatusBadge status={p.status} /> },
  ];

  const filtered = !!(q || status || service || country);
  const clear = () => {
    setQ('');
    setStatus('');
    setService('');
    setCountry('');
  };

  return (
    <div>
      <PageHeader
        title="Patients"
        description="Patients linked to your organisation’s service requests."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Medical details are visible only on the patient profile
          </span>
        }
      />
      <Card className="overflow-hidden">
        <FilterBar search={q} onSearch={setQ} placeholder="Search name, patient or case ID…" showClear={filtered} onClear={clear}>
          <Select aria-label="Status" className="sm:w-44" placeholder="All statuses" options={['Submitted', 'Scheduled', 'In Progress', 'Completed', 'Cancelled']} value={status} onChange={(e) => setStatus(e.target.value)} />
          <Select aria-label="Country" className="sm:w-40" placeholder="All countries" options={countries} value={country} onChange={(e) => setCountry(e.target.value)} />
          <Select aria-label="Service" className="col-span-2 sm:w-56" placeholder="All services" options={SERVICE_TYPES} value={service} onChange={(e) => setService(e.target.value)} />
        </FilterBar>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(p) => p.id}
            loading={loading}
            initialSort={{ key: 'id', dir: 'desc' }}
            onRowClick={(p) => navigate(`/patients/${p.id}`)}
            actions={(p) => (
              <RowAction label="View profile" onClick={() => navigate(`/patients/${p.id}`)}>
                <Eye className="h-4 w-4" />
              </RowAction>
            )}
            empty={<EmptyState icon={Users} title={filtered ? 'No patients match your filters' : 'No patients yet'} description={filtered ? 'Try a different search.' : 'Patients appear here once you raise a service request.'} />}
          />
        )}
      </Card>
    </div>
  );
}
