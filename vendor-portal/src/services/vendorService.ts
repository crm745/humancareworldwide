// Everything a signed-in vendor reads or changes. Each method has a mock implementation and the
// matching REST call for the Express backend; pages only ever talk to this module.
import type {
  AppNotification, BankDetailsInput, CaseRecord, CaseStatus, CommunicationEntry, CompanyDetails, DashboardData,
  DateRange, Invoice, Patient, Payment, PaymentMethod, Priority, SearchResult, ServiceType, SupportTicket,
  TicketPriority, VendorDocument, VendorProfile, VendorSettings,
} from '@/types';
import { INR_RATE, SERVICE_TYPES } from '@/data/constants';
import { randomId } from '@/utils/crypto';
import { ApiError, USE_MOCK_API, mockDelay } from './config';
import { http } from './http';
import { mockDb } from './mockDb';
import { maskBank } from './registrationService';

const DAY = 86400000;
const get = async <T,>(url: string, params?: object) => (await http.get<T>(url, { params })).data;

function rangeStart(range: DateRange): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (range) {
    case 'today':
      return d;
    case 'week': {
      const day = (d.getDay() + 6) % 7; // Monday-based week
      d.setDate(d.getDate() - day);
      return d;
    }
    case 'month':
      d.setDate(1);
      return d;
    case 'quarter':
      return new Date(Date.now() - 90 * DAY);
    case 'year':
      return new Date(d.getFullYear(), 0, 1);
  }
}

/** Buckets for the Completed vs Pending chart, sized to the selected range. */
function buckets(range: DateRange): { label: string; start: number; end: number }[] {
  const out: { label: string; start: number; end: number }[] = [];
  const start = rangeStart(range);
  const now = Date.now();
  if (range === 'today') {
    for (let h = 0; h < 24; h += 4) {
      const s = new Date(start);
      s.setHours(h);
      out.push({ label: `${String(h).padStart(2, '0')}:00`, start: s.getTime(), end: s.getTime() + 4 * 3600000 });
    }
  } else if (range === 'week' || range === 'month') {
    for (let t = start.getTime(); t <= now; t += DAY) {
      const d = new Date(t);
      out.push({ label: range === 'week' ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : String(d.getDate()), start: t, end: t + DAY });
    }
  } else if (range === 'quarter') {
    for (let t = start.getTime(); t <= now; t += 7 * DAY) {
      const d = new Date(t);
      out.push({ label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), start: t, end: t + 7 * DAY });
    }
  } else {
    for (let m = 0; m <= new Date().getMonth(); m++) {
      const s = new Date(start.getFullYear(), m, 1);
      const e = new Date(start.getFullYear(), m + 1, 1);
      out.push({ label: s.toLocaleDateString('en-GB', { month: 'short' }), start: s.getTime(), end: e.getTime() });
    }
  }
  return out;
}

const isActive = (s: CaseStatus) => s === 'Scheduled' || s === 'In Progress';
const toINR = (i: Invoice) => i.amount * INR_RATE[i.currency];

export interface NewCaseInput {
  service: ServiceType;
  patientName: string;
  age: number;
  gender: Patient['gender'];
  pickup: string;
  destination: string;
  preferredDate: string;
  priority: Priority;
  contactPhone: string;
  notes: string;
}

export interface NewTicketInput {
  subject: string;
  category: string;
  priority: TicketPriority;
  description: string;
  attachmentName?: string;
}

export interface NewDocumentInput {
  name: string;
  type: string;
  fileName: string;
  size: number;
  expiryDate: string | null;
}

export const vendorService = {
  // ---------- dashboard ----------
  async getDashboard(range: DateRange): Promise<DashboardData> {
    if (!USE_MOCK_API) return get<DashboardData>('/vendor/dashboard', { range });
    await mockDelay();
    const all = mockDb.get('cases');
    const from = rangeStart(range).getTime();
    const cases = all.filter((c) => new Date(c.requestDate).getTime() >= from);
    const count = (s: CaseStatus) => cases.filter((c) => c.status === s).length;

    const months: { label: string; cases: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        label: s.toLocaleDateString('en-GB', { month: 'short' }),
        cases: all.filter((c) => {
          const t = new Date(c.requestDate).getTime();
          return t >= s.getTime() && t < e.getTime();
        }).length,
      });
    }

    return {
      stats: {
        totalCases: cases.length,
        activeCases: cases.filter((c) => isActive(c.status)).length,
        completedCases: count('Completed'),
        pendingCases: count('Submitted'),
        totalPatients: new Set(cases.map((c) => c.patientId)).size,
        pendingDocuments: mockDb.get('documents').filter((d) => d.status === 'Pending').length,
        outstandingAmount: mockDb.get('invoices').filter((i) => i.status !== 'Paid').reduce((sum, i) => sum + toINR(i), 0),
      },
      statusBreakdown: (['Submitted', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'] as CaseStatus[]).map((status) => ({ status, count: count(status) })),
      monthly: months,
      completedVsPending: buckets(range).map((b) => {
        const inB = cases.filter((c) => {
          const t = new Date(c.requestDate).getTime();
          return t >= b.start && t < b.end;
        });
        return {
          label: b.label,
          completed: inB.filter((c) => c.status === 'Completed').length,
          pending: inB.filter((c) => c.status === 'Submitted' || isActive(c.status)).length,
        };
      }),
      serviceWise: SERVICE_TYPES.map((service) => ({ service, count: cases.filter((c) => c.service === service).length })),
      recentCases: [...all].sort((a, b) => b.requestDate.localeCompare(a.requestDate)).slice(0, 6),
    };
  },

  // ---------- cases ----------
  async listCases(): Promise<CaseRecord[]> {
    if (!USE_MOCK_API) return get<CaseRecord[]>('/vendor/cases');
    await mockDelay();
    return [...mockDb.get('cases')];
  },

  async getCase(id: string): Promise<{ case: CaseRecord; invoice: Invoice | null; patient: Patient | null }> {
    if (!USE_MOCK_API) return get(`/vendor/cases/${id}`);
    await mockDelay();
    const c = mockDb.get('cases').find((x) => x.id === id);
    if (!c) throw new ApiError('Case not found.', 404);
    return {
      case: c,
      invoice: mockDb.get('invoices').find((i) => i.caseId === id) ?? null,
      patient: mockDb.get('patients').find((p) => p.id === c.patientId) ?? null,
    };
  },

  async createCase(input: NewCaseInput): Promise<CaseRecord> {
    if (!USE_MOCK_API) return (await http.post<CaseRecord>('/vendor/cases', input)).data;
    await mockDelay(800, 400);
    const cases = mockDb.get('cases');
    const year = new Date().getFullYear();
    const maxSeq = Math.max(...cases.map((c) => Number(c.id.split('-').pop()) || 0), 421);
    const id = `HCW-CASE-${year}-${String(maxSeq + 1).padStart(5, '0')}`;
    const patientId = `HCW-PAT-${String(1181 + cases.length).padStart(5, '0')}`;
    const record: CaseRecord = {
      id,
      patientId,
      patientName: input.patientName.trim(),
      service: input.service,
      pickup: input.pickup.trim(),
      destination: input.destination.trim(),
      requestDate: new Date().toISOString(),
      scheduledDate: null,
      assignedTeam: 'Unassigned',
      status: 'Submitted',
      priority: input.priority,
      notes: input.notes.trim() || 'Requested via vendor portal.',
    };
    mockDb.set('cases', [record, ...cases]);
    const contact = mockDb.get('profile').company.contactName;
    const patient: Patient = {
      id: patientId,
      name: record.patientName,
      age: input.age,
      gender: input.gender,
      country: '—',
      nationality: '—',
      service: input.service,
      caseId: id,
      status: 'Submitted',
      dateOfBirth: new Date(new Date().getFullYear() - input.age, 0, 1).toISOString(),
      phone: input.contactPhone,
      email: '—',
      passportLast4: '',
      emergencyContact: { name: '—', relation: '—', phone: input.contactPhone },
      medical: {
        diagnosis: 'To be confirmed by HumanCare medical team',
        condition: input.priority === 'Emergency' ? 'Critical' : 'Stable',
        bloodGroup: '—',
        allergies: '—',
        medications: [],
        mobility: '—',
        oxygenRequired: false,
        attendingDoctor: '—',
        notes: input.notes,
      },
      travel: { from: record.pickup, to: record.destination, mode: input.service, travelDate: input.preferredDate || null, escort: 'To be assigned', equipment: [] },
      documents: [],
      communications: [{ id: randomId('c_'), date: record.requestDate, channel: 'Portal Note', by: contact, summary: `Request raised for ${input.service.toLowerCase()} via the vendor portal.` }],
    };
    mockDb.set('patients', [patient, ...mockDb.get('patients')]);
    pushNotification({ title: 'Request submitted', message: `${id} for ${record.patientName} has been submitted. Our operations desk will call you shortly.`, type: 'case', link: `/cases/${id}` });
    return record;
  },

  // ---------- patients ----------
  async listPatients(): Promise<Patient[]> {
    if (!USE_MOCK_API) return get<Patient[]>('/vendor/patients');
    await mockDelay();
    return [...mockDb.get('patients')];
  },

  async getPatient(id: string): Promise<Patient> {
    if (!USE_MOCK_API) return get<Patient>(`/vendor/patients/${id}`);
    await mockDelay();
    const p = mockDb.get('patients').find((x) => x.id === id);
    if (!p) throw new ApiError('Patient not found.', 404);
    return p;
  },

  async addPatientNote(id: string, summary: string, channel: CommunicationEntry['channel']): Promise<CommunicationEntry> {
    if (!USE_MOCK_API) return (await http.post<CommunicationEntry>(`/vendor/patients/${id}/communications`, { summary, channel })).data;
    await mockDelay(400);
    const entry: CommunicationEntry = { id: randomId('c_'), date: new Date().toISOString(), channel, by: mockDb.get('profile').company.contactName, summary };
    mockDb.set('patients', mockDb.get('patients').map((p) => (p.id === id ? { ...p, communications: [...p.communications, entry] } : p)));
    return entry;
  },

  // ---------- documents ----------
  async listDocuments(): Promise<VendorDocument[]> {
    if (!USE_MOCK_API) return get<VendorDocument[]>('/vendor/documents');
    await mockDelay();
    return [...mockDb.get('documents')];
  },

  async uploadDocument(input: NewDocumentInput, replaceId?: string): Promise<VendorDocument> {
    if (!USE_MOCK_API) return (await http.post<VendorDocument>('/vendor/documents', { ...input, replaceId })).data;
    await mockDelay(600);
    const doc: VendorDocument = { id: randomId('DOC-'), ...input, uploadedAt: new Date().toISOString(), status: 'Pending' };
    const rest = mockDb.get('documents').filter((d) => d.id !== replaceId);
    mockDb.set('documents', [doc, ...rest]);
    return doc;
  },

  async deleteDocument(id: string): Promise<void> {
    if (!USE_MOCK_API) {
      await http.delete(`/vendor/documents/${id}`);
      return;
    }
    await mockDelay(400);
    mockDb.set('documents', mockDb.get('documents').filter((d) => d.id !== id));
  },

  // ---------- billing ----------
  async listInvoices(): Promise<Invoice[]> {
    if (!USE_MOCK_API) return get<Invoice[]>('/vendor/invoices');
    await mockDelay();
    return [...mockDb.get('invoices')];
  },

  async listPayments(): Promise<Payment[]> {
    if (!USE_MOCK_API) return get<Payment[]>('/vendor/payments');
    await mockDelay();
    return [...mockDb.get('payments')];
  },

  async payInvoice(invoiceId: string, method: PaymentMethod): Promise<Payment> {
    if (!USE_MOCK_API) return (await http.post<Payment>(`/vendor/invoices/${invoiceId}/pay`, { method })).data;
    await mockDelay(1400, 500);
    const inv = mockDb.get('invoices').find((i) => i.id === invoiceId);
    if (!inv) throw new ApiError('Invoice not found.', 404);
    if (inv.status === 'Paid') throw new ApiError('This invoice is already paid.', 409);
    const payments = mockDb.get('payments');
    const payment: Payment = {
      id: `HCW-PAY-${String(3310 + payments.length + 1).padStart(5, '0')}`,
      invoiceId,
      date: new Date().toISOString(),
      amount: inv.amount,
      currency: inv.currency,
      method,
      reference: method === 'UPI' ? `UPI${Date.now().toString().slice(-9)}` : method === 'Card' ? `CRD-${Date.now().toString().slice(-6)}` : `UTR${Date.now().toString().slice(-10)}`,
      status: 'Paid',
    };
    mockDb.set('payments', [payment, ...payments]);
    mockDb.set('invoices', mockDb.get('invoices').map((i) => (i.id === invoiceId ? { ...i, status: 'Paid' } : i)));
    pushNotification({ title: 'Payment received', message: `Payment for ${invoiceId} was successful. Reference ${payment.reference}.`, type: 'success', link: '/payments' });
    return payment;
  },

  // ---------- notifications ----------
  async listNotifications(): Promise<AppNotification[]> {
    if (!USE_MOCK_API) return get<AppNotification[]>('/vendor/notifications');
    await mockDelay(250, 200);
    return [...mockDb.get('notifications')].sort((a, b) => b.date.localeCompare(a.date));
  },

  async setNotificationRead(id: string, read: boolean): Promise<void> {
    if (!USE_MOCK_API) {
      await http.patch(`/vendor/notifications/${id}`, { read });
      return;
    }
    mockDb.set('notifications', mockDb.get('notifications').map((n) => (n.id === id ? { ...n, read } : n)));
  },

  async markAllNotificationsRead(): Promise<void> {
    if (!USE_MOCK_API) {
      await http.post('/vendor/notifications/read-all');
      return;
    }
    mockDb.set('notifications', mockDb.get('notifications').map((n) => ({ ...n, read: true })));
  },

  async deleteNotification(id: string): Promise<void> {
    if (!USE_MOCK_API) {
      await http.delete(`/vendor/notifications/${id}`);
      return;
    }
    mockDb.set('notifications', mockDb.get('notifications').filter((n) => n.id !== id));
  },

  // ---------- support ----------
  async listTickets(): Promise<SupportTicket[]> {
    if (!USE_MOCK_API) return get<SupportTicket[]>('/vendor/tickets');
    await mockDelay();
    return [...mockDb.get('tickets')].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createTicket(input: NewTicketInput): Promise<SupportTicket> {
    if (!USE_MOCK_API) return (await http.post<SupportTicket>('/vendor/tickets', input)).data;
    await mockDelay(800);
    const tickets = mockDb.get('tickets');
    const maxSeq = Math.max(...tickets.map((t) => Number(t.id.split('-').pop()) || 0), 351);
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: `HCW-TKT-${String(maxSeq + 1).padStart(5, '0')}`,
      ...input,
      status: 'Open',
      createdAt: now,
      updatedAt: now,
      messages: [{ id: randomId('m_'), from: 'vendor', author: mockDb.get('profile').company.contactName, date: now, body: input.description }],
    };
    mockDb.set('tickets', [ticket, ...tickets]);
    return ticket;
  },

  async replyTicket(id: string, body: string): Promise<SupportTicket> {
    if (!USE_MOCK_API) return (await http.post<SupportTicket>(`/vendor/tickets/${id}/messages`, { body })).data;
    await mockDelay(500);
    const now = new Date().toISOString();
    let updated: SupportTicket | undefined;
    mockDb.set(
      'tickets',
      mockDb.get('tickets').map((t) => {
        if (t.id !== id) return t;
        updated = {
          ...t,
          status: t.status === 'Resolved' || t.status === 'Closed' ? 'Open' : t.status,
          updatedAt: now,
          messages: [...t.messages, { id: randomId('m_'), from: 'vendor', author: mockDb.get('profile').company.contactName, date: now, body }],
        };
        return updated;
      }),
    );
    if (!updated) throw new ApiError('Ticket not found.', 404);
    return updated;
  },

  // ---------- profile, bank, settings ----------
  async getProfile(): Promise<VendorProfile> {
    if (!USE_MOCK_API) return get<VendorProfile>('/vendor/profile');
    await mockDelay();
    return mockDb.get('profile');
  },

  async updateCompany(company: CompanyDetails): Promise<VendorProfile> {
    if (!USE_MOCK_API) return (await http.put<VendorProfile>('/vendor/profile/company', company)).data;
    await mockDelay(800);
    const profile = { ...mockDb.get('profile'), company };
    mockDb.set('profile', profile);
    return profile;
  },

  /** Only the masked form is kept; the change goes back to "Pending Verification". */
  async updateBank(bank: BankDetailsInput): Promise<VendorProfile> {
    if (!USE_MOCK_API) return (await http.put<VendorProfile>('/vendor/profile/bank', bank)).data;
    await mockDelay(1000);
    const profile = { ...mockDb.get('profile'), bank: maskBank(bank) };
    mockDb.set('profile', profile);
    pushNotification({ title: 'Bank details require verification', message: 'Your updated bank details will be verified by HumanCare finance before the next payout.', type: 'warning', link: '/bank-details' });
    return profile;
  },

  async getSettings(): Promise<VendorSettings> {
    if (!USE_MOCK_API) return get<VendorSettings>('/vendor/settings');
    await mockDelay(300);
    return mockDb.get('settings');
  },

  async updateSettings(settings: VendorSettings): Promise<VendorSettings> {
    if (!USE_MOCK_API) return (await http.put<VendorSettings>('/vendor/settings', settings)).data;
    await mockDelay(600);
    mockDb.set('settings', settings);
    return settings;
  },

  // ---------- search ----------
  async search(query: string): Promise<SearchResult[]> {
    if (!USE_MOCK_API) return get<SearchResult[]>('/vendor/search', { q: query });
    await mockDelay(150, 150);
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const cases: SearchResult[] = mockDb
      .get('cases')
      .filter((c) => c.id.toLowerCase().includes(q) || c.patientName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ kind: 'case', id: c.id, title: c.id, subtitle: `${c.patientName} · ${c.service}`, to: `/cases/${c.id}` }));
    const patients: SearchResult[] = mockDb
      .get('patients')
      .filter((p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({ kind: 'patient', id: p.id, title: p.name, subtitle: `${p.id} · ${p.service}`, to: `/patients/${p.id}` }));
    const invoices: SearchResult[] = mockDb
      .get('invoices')
      .filter((i) => i.id.toLowerCase().includes(q) || i.caseId.toLowerCase().includes(q))
      .slice(0, 3)
      .map((i) => ({ kind: 'invoice', id: i.id, title: i.id, subtitle: `${i.caseId} · ${i.status}`, to: `/invoices?q=${encodeURIComponent(i.id)}` }));
    return [...cases, ...patients, ...invoices];
  },
};

function pushNotification(n: Omit<AppNotification, 'id' | 'date' | 'read'>): void {
  const item: AppNotification = { ...n, id: randomId('N-'), date: new Date().toISOString(), read: false };
  mockDb.set('notifications', [item, ...mockDb.get('notifications')]);
  window.dispatchEvent(new Event('hcw:notifications'));
}
