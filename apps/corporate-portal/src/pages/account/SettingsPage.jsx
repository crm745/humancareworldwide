import { useEffect, useState } from 'react';
import { KeyRound, Laptop, LogOut, Smartphone } from 'lucide-react';

import { corporateService } from '@/services/corporateService';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Checkbox';
import { PageLoader } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { ChangePasswordModal } from './ChangePasswordModal';

const NOTIFICATION_ROWS = [
  { key: 'cases', label: 'Case updates', sub: 'New assignments, scheduling and completion' },
  { key: 'invoices', label: 'Invoices & payments', sub: 'New invoices, due reminders and receipts' },
  { key: 'documents', label: 'Documents', sub: 'Verification results and expiry reminders' },
  { key: 'account', label: 'Account & security', sub: 'Sign-ins, password and bank changes' },
];

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => corporateService.getSettings(), []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    if (data) setForm(structuredClone(data));
  }, [data]);

  if (loading || (!form && !error)) return <PageLoader />;
  if (error || !form)
    return (
      <Card>
        <ErrorState message={error} onRetry={reload} />
      </Card>
    );

  const dirty = JSON.stringify(form) !== JSON.stringify(data);
  const setChannel = (key, ch, v) => setForm((f) => (f ? { ...f, notifications: { ...f.notifications, [key]: { ...f.notifications[key], [ch]: v } } } : f));

  const save = async () => {
    setSaving(true);
    try {
      await corporateService.updateSettings(form);
      toast.success('Settings saved');
      reload();
    } catch (e) {
      toast.error('Could not save settings', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Notification preferences, regional settings and security."
        actions={
          <>
            <Button variant="outline" onClick={() => data && setForm(structuredClone(data))} disabled={!dirty || saving}>
              Discard
            </Button>
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Save Changes
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Notification Preferences" description="Choose how you hear about each type of update." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">SMS</th>
                  <th className="px-3 py-3 pr-5">In-app</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {NOTIFICATION_ROWS.map((r) => (
                  <tr key={r.key}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{r.label}</p>
                      <p className="text-xs text-slate-500">{r.sub}</p>
                    </td>
                    {['email', 'sms', 'inApp'].map((ch) => (
                      <td key={ch} className="px-3 py-4 text-center last:pr-5">
                        <div className="inline-flex">
                          <Switch checked={form.notifications[r.key][ch]} onChange={(v) => setChannel(r.key, ch, v)} label={`${r.label} via ${ch}`} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Regional Preferences" />
          <div className="space-y-4 p-5">
            <Field label="Language" htmlFor="st-lang">
              <Select
                id="st-lang"
                options={['English', 'Hindi', 'Arabic']}
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
            </Field>
            <Field label="Time zone" htmlFor="st-tz">
              <Select
                id="st-tz"
                options={[
                  { value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
                  { value: 'Asia/Dubai', label: 'UAE / Oman (GST, UTC+4)' },
                  { value: 'Asia/Riyadh', label: 'Saudi Arabia / Qatar (UTC+3)' },
                  { value: 'Europe/London', label: 'United Kingdom (GMT/BST)' },
                  { value: 'America/New_York', label: 'US Eastern (ET)' },
                ]}
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </Field>
            <Field label="Date format" htmlFor="st-date">
              <Select
                id="st-date"
                options={['DD MMM YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']}
                value={form.dateFormat}
                onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Security" />
          <div className="divide-y divide-slate-100">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Password</p>
                <p className="text-xs text-slate-500">Use a strong password you don’t use anywhere else.</p>
              </div>
              <Button variant="outline" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => setPwOpen(true)}>
                Change Password
              </Button>
            </div>
            <div className="p-5">
              <Switch
                checked={form.twoFactor}
                onChange={(v) => setForm({ ...form, twoFactor: v })}
                label="Two-factor authentication"
                description="Ask for a one-time code sent to your registered mobile at every sign-in."
              />
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-slate-900">Active sessions</p>
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <Laptop className="h-5 w-5 text-slate-400" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-slate-800">This browser</p>
                    <p className="text-xs text-slate-500">Signed in now</p>
                  </div>
                  <Badge tone="green" dot>
                    Current
                  </Badge>
                </li>
                <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <Smartphone className="h-5 w-5 text-slate-400" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-slate-800">Mobile · Mumbai, IN</p>
                    <p className="text-xs text-slate-500">Last active 2 days ago</p>
                  </div>
                </li>
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={() => toast.success('Other sessions signed out', 'Only this browser remains signed in.')}
              >
                Sign out of all other sessions
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
