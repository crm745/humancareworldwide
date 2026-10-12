import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, CalendarDays, Globe, KeyRound, Landmark, Mail, MapPin, Pencil, Phone, UserRound } from 'lucide-react';
import { countryName } from '@/data/constants';
import { vendorService } from '@/services/vendorService';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useUtils';
import { Card, CardHeader, InfoGrid } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/EmptyState';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { PageHeader, SecureNote } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { CompanyDetailsForm } from '@/components/forms/CompanyDetailsForm';
import { formatDate } from '@/utils/format';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UpdateBankModal, bankInfoItems } from '@/components/forms/BankInfo';

export default function CompanyProfilePage() {
  useDocumentTitle('Company Profile');
  const toast = useToast();
  const { updateUser } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(() => Promise.all([vendorService.getProfile(), vendorService.listDocuments()]), []);
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Card>
        <ErrorState message={error} onRetry={reload} />
      </Card>
    );
  const [profile, docs] = data;
  const c = profile.company;
  const docCount = (s) => docs.filter((d) => d.status === s).length;

  return (
    <div>
      <PageHeader
        title="Company Profile"
        description="Your organisation’s details as registered with HumanCare Worldwide."
        actions={
          <>
            <Button variant="outline" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => setPwOpen(true)}>
              Change Password
            </Button>
            <Button variant="outline" leftIcon={<Landmark className="h-4 w-4" />} onClick={() => setBankOpen(true)}>
              Update Bank Details
            </Button>
            <Button leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              Edit Profile
            </Button>
          </>
        }
      />

      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#0B1F45] to-brand-700" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <span className="-mt-9 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-brand-50 text-brand-600 shadow-sm">
            <Building2 className="h-8 w-8" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-slate-900">{c.companyName}</h2>
              <StatusBadge status={profile.verificationStatus} />
            </div>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
              <span className="font-mono">{profile.vendorId}</span>
              <span>{c.companyType}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Partner since {formatDate(profile.memberSince)}
              </span>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand-600" /> Company Information
                </span>
              }
            />
            <div className="p-5">
              <InfoGrid
                items={[
                  { label: 'Company Name', value: c.companyName },
                  { label: 'Registration Number', value: c.registrationNumber },
                  { label: 'Company Type', value: c.companyType },
                  {
                    label: 'Website',
                    value: c.website ? (
                      <a
                        href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" /> {c.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : null,
                  },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-brand-600" /> Contact Information
                </span>
              }
            />
            <div className="p-5">
              <InfoGrid
                items={[
                  {
                    label: 'Official Email',
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {c.officialEmail}
                      </span>
                    ),
                  },
                  {
                    label: 'Official Phone',
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {c.officialPhone}
                      </span>
                    ),
                  },
                  { label: 'Contact Person', value: `${c.contactName} — ${c.contactDesignation}` },
                  { label: 'Contact Email', value: c.contactEmail },
                  { label: 'Contact Phone', value: c.contactPhone },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-600" /> Address
                </span>
              }
            />
            <div className="p-5">
              <InfoGrid
                items={[
                  { label: 'Office Address', value: c.address },
                  { label: 'City', value: c.city },
                  { label: 'State / Region', value: c.state },
                  { label: 'Country', value: countryName(c.country, c.countryOther) },
                  { label: 'Pincode / Postal Code', value: c.pincode },
                ]}
              />
            </div>
          </Card>

          {profile.bank ? (
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-brand-600" /> Bank Information
                  </span>
                }
                action={<StatusBadge status={profile.bank.verification} />}
              />
              <div className="p-5">
                <InfoGrid items={bankInfoItems(profile.bank).slice(0, 6)} />
                <SecureNote className="mt-5" />
              </div>
            </Card>
          ) : (
            // Bank details are deferred along with the payment gateway decision — the
            // backend doesn't return a `bank` key yet (see getVendorProfile()).
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-brand-600" /> Bank Information
                  </span>
                }
              />
              <div className="p-5 text-sm text-slate-500">Bank details aren't available yet.</div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-brand-600" /> Verification Status
                </span>
              }
            />
            <div className="p-5">
              <StatusTimeline items={profile.verification.map((v) => ({ title: v.label, status: v.status, date: v.date }))} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Documents" />
            <div className="grid grid-cols-2 gap-3 p-5">
              {['Verified', 'Pending', 'Expired', 'Rejected'].map((s) => (
                <div key={s} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xl font-semibold text-slate-900">{docCount(s)}</p>
                  <StatusBadge status={s} className="mt-1" />
                </div>
              ))}
              <Link to="/documents" className={buttonClasses({ variant: 'secondary', fullWidth: true, className: 'col-span-2 mt-1' })}>
                Manage documents <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        size="xl"
        title="Edit company profile"
        description="Changes to legal details may require re-verification."
      >
        <CompanyDetailsForm
          defaultValues={c}
          onSubmit={async (values) => {
            try {
              const updated = await vendorService.updateCompany(values);
              setData((prev) => [updated, prev?.[1] ?? []]);
              updateUser({ companyName: values.companyName, contactName: values.contactName });
              toast.success('Profile updated');
              setEditOpen(false);
            } catch (e) {
              toast.error('Could not update profile', e instanceof Error ? e.message : undefined);
            }
          }}
          footer={({ submitting }) => (
            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save Changes
              </Button>
            </div>
          )}
        />
      </Modal>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <UpdateBankModal
        country={c.country}
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        onSaved={(bank) => setData((prev) => [{ ...(prev?.[0] ?? profile), bank }, prev?.[1] ?? []])}
      />
    </div>
  );
}
