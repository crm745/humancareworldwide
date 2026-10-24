import { INR_RATE, SERVICE_TYPES } from '@/data/constants';
import { randomId } from '@/utils/crypto';
import { rangeStart } from '@/utils/dateRange';
import { ApiError, USE_MOCK_API, mockDelay } from './config';
import { http } from './http';
import { mockDb } from './mockDb';
import { maskBank } from './registrationService';

const DAY = 86400000;
const get = async (url, params) => (await http.get(url, { params })).data;

// The real backend's Case object uses different field names (and a numeric id) than
// this app's "case row" shape — this reshapes one into the other so every page that
// consumes a case (list, detail, create) doesn't need its own mapping logic.
const CASE_STATUS_LABEL = { submitted: 'Submitted', scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

function toPortalCase(c) {
  return {
    id: c.referenceNumber,
    patientId: `HCW-PAT-${String(c.id).padStart(5, '0')}`,
    patientName: c.patientName,
    service: c.serviceType,
    pickup: c.origin,
    destination: c.destination,
    requestDate: c.createdAt,
    assignedTeam: 'Unassigned', // no case-assignment concept exists on the backend yet
    status: CASE_STATUS_LABEL[c.status] || c.status,
    notes: c.notes,
    // Only present when the backend actually included them (GET /corporate/cases/:id
    // does; the list endpoint doesn't) — same shape as toPortalPatientDetail()'s below.
    documents: c.documents?.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type || 'Other',
      fileExt: (d.name?.split('.').pop() || 'file').toUpperCase(),
      date: d.uploadedAt,
    })),
  };
}

// PatientProfilePage also expects demographic/medical/travel detail (nationality,
// passport, emergency contact, blood group, allergies, travel mode...) that nothing
// in the current data model collects — the Medical/Travel tabs that would need that
// data are hidden entirely in PatientProfilePage.jsx, and the Personal Information
// tab only shows the fields actually collected on the request form (age, gender, phone).
function toPortalPatientDetail(p) {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    caseId: p.caseId,
    service: p.service,
    age: p.age ?? null,
    gender: p.gender || '',
    phone: p.contact || '',
    documents: (p.documents || []).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type || 'Other',
      fileExt: (d.name?.split('.').pop() || 'file').toUpperCase(),
      date: d.uploadedAt,
    })),
    communications: p.communications || [],
  };
}

/** Buckets for the Completed vs Pending chart, sized to the selected range. */
function buckets(range) {
  const out = [];
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
  } else {
    // 'year' and 'all' both land here — 'all' shows the current year's monthly
    // breakdown rather than every year since inception.
    const thisYear = new Date().getFullYear();
    for (let m = 0; m <= new Date().getMonth(); m++) {
      const s = new Date(thisYear, m, 1);
      const e = new Date(thisYear, m + 1, 1);
      out.push({ label: s.toLocaleDateString('en-GB', { month: 'short' }), start: s.getTime(), end: e.getTime() });
    }
  }
  return out;
}

const isActive = (s) => s === 'Scheduled' || s === 'In Progress';
const toINR = (i) => i.amount * INR_RATE[i.currency];

export const corporateService = {
  // ---------- dashboard ----------
  async getDashboard(range) {
    if (!USE_MOCK_API) return get('/corporate/dashboard', { range });
    await mockDelay();
    const all = mockDb.get('cases');
    const from = rangeStart(range).getTime();
    const cases = all.filter((c) => new Date(c.requestDate).getTime() >= from);
    const count = (s) => cases.filter((c) => c.status === s).length;

    const months = [];
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
        outstandingAmount: mockDb
          .get('invoices')
          .filter((i) => i.status !== 'Paid')
          .reduce((sum, i) => sum + toINR(i), 0),
      },
      statusBreakdown: ['Submitted', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'].map((status) => ({ status, count: count(status) })),
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

  // ---------- services ----------
  // This hits the real, public /services endpoint directly (not mocked) in both modes —
  // it's the same admin-managed catalog the mobile app reads from, so "Request a Service"
  // always matches what's actually configured instead of a hardcoded, drift-prone list.
  async listServices() {
    const { services } = await get('/services');
    return services;
  },

  // ---------- cases ----------
  async listCases() {
    if (!USE_MOCK_API) {
      const { cases } = await get('/corporate/cases');
      return cases.map(toPortalCase);
    }
    await mockDelay();
    return [...mockDb.get('cases')];
  },

  // `id` here is whatever the list/links use as a case's id — toPortalCase() sets that
  // to referenceNumber, and the backend's getCaseById now accepts that directly (see
  // cases.service.js). invoice/patient are left undefined on the real backend — there's
  // no Invoice model yet, and CaseDetailPage already renders fine without them (both
  // are conditionally rendered, not assumed present).
  async getCase(id) {
    if (!USE_MOCK_API) {
      const { case: c } = await get(`/corporate/cases/${id}`);
      return { case: toPortalCase(c) };
    }
    await mockDelay();
    const c = mockDb.get('cases').find((x) => x.id === id);
    if (!c) throw new ApiError('Case not found.', 404);
    return {
      case: c,
      invoice: mockDb.get('invoices').find((i) => i.caseId === id) ?? null,
      patient: mockDb.get('patients').find((p) => p.id === c.patientId) ?? null,
    };
  },

  // Reshapes the form's field names into what the backend's createCaseByCorporate
  // expects (see backend/src/modules/cases/cases.service.js) — the field set matches
  // the mobile app's own request flow (request/step1.js, step2.js) field-for-field,
  // including the care-level checkboxes and the optional referral source + document.
  async createCase(input) {
    if (!USE_MOCK_API) {
      const payload = {
        patientName: input.patientName.trim(),
        patientAge: Number(input.age),
        patientGender: input.gender,
        patientContact: input.contactPhone?.trim() ? `${input.contactCountryCode} ${input.contactPhone.trim()}` : undefined,
        serviceType: input.service,
        origin: input.pickup.trim(),
        destination: input.destination.trim(),
        careLevel: input.careLevel?.length ? input.careLevel.join(', ') : undefined,
        description: input.description?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
      };
      const { case: c } = (await http.post('/corporate/cases', payload)).data;
      const created = toPortalCase(c);
      if (input.file) {
        const form = new FormData();
        form.append('type', 'Medical Report'); // this is specifically the "Upload Medical Report" field
        form.append('file', input.file);
        try {
          // Case is already saved at this point — a failed attachment shouldn't block the
          // request, same as the mobile app's own upload-after-create behaviour.
          await http.post(`/corporate/cases/${created.id}/documents`, form, { headers: { 'Content-Type': undefined } });
        } catch {
          /* ignore */
        }
      }
      return created;
    }
    await mockDelay(800, 400);
    const cases = mockDb.get('cases');
    const year = new Date().getFullYear();
    const maxSeq = Math.max(...cases.map((c) => Number(c.id.split('-').pop()) || 0), 421);
    const id = `HCW-CASE-${year}-${String(maxSeq + 1).padStart(5, '0')}`;
    const patientId = `HCW-PAT-${String(1181 + cases.length).padStart(5, '0')}`;
    const record = {
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
      notes: input.notes?.trim() || 'Requested via corporate portal.',
    };
    mockDb.set('cases', [record, ...cases]);
    const contact = mockDb.get('profile').company.contactName;
    const contactFull = input.contactPhone?.trim() ? `${input.contactCountryCode} ${input.contactPhone.trim()}` : '';
    const patient = {
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
      phone: contactFull,
      email: '—',
      passportLast4: '',
      emergencyContact: { name: '—', relation: '—', phone: contactFull },
      medical: {
        diagnosis: 'To be confirmed by HumanCare medical team',
        condition: input.careLevel?.includes('care_icu') ? 'Critical' : 'Stable',
        bloodGroup: '—',
        allergies: '—',
        medications: [],
        mobility: '—',
        oxygenRequired: false,
        attendingDoctor: '—',
        notes: input.description,
      },
      travel: {
        from: record.pickup,
        to: record.destination,
        mode: input.service,
        travelDate: input.preferredDate || null,
        escort: 'To be assigned',
        equipment: [],
      },
      documents: [],
      communications: [
        {
          id: randomId('c_'),
          date: record.requestDate,
          channel: 'Portal Note',
          by: contact,
          summary: `Request raised for ${input.service.toLowerCase()} via the corporate portal.`,
        },
      ],
    };
    mockDb.set('patients', [patient, ...mockDb.get('patients')]);
    pushNotification({
      title: 'Request submitted',
      message: `${id} for ${record.patientName} has been submitted. Our operations desk will call you shortly.`,
      type: 'case',
      link: `/cases/${id}`,
    });
    return record;
  },

  // ---------- patients ----------
  async listPatients() {
    if (!USE_MOCK_API) return get('/corporate/patients');
    await mockDelay();
    return [...mockDb.get('patients')];
  },

  async getPatient(id) {
    if (!USE_MOCK_API) return toPortalPatientDetail(await get(`/corporate/patients/${id}`));
    await mockDelay();
    const p = mockDb.get('patients').find((x) => x.id === id);
    if (!p) throw new ApiError('Patient not found.', 404);
    return p;
  },

  async addPatientNote(id, summary, channel) {
    if (!USE_MOCK_API) return (await http.post(`/corporate/patients/${id}/communications`, { summary, channel })).data;
    await mockDelay(400);
    const entry = { id: randomId('c_'), date: new Date().toISOString(), channel, by: mockDb.get('profile').company.contactName, summary };
    mockDb.set(
      'patients',
      mockDb.get('patients').map((p) => (p.id === id ? { ...p, communications: [...p.communications, entry] } : p)),
    );
    return entry;
  },

  // A file uploaded against a case (medical report, etc. — not the separate "compliance
  // documents" feature below). Fetched as a blob through the authenticated axios client
  // because the real /documents/:id/file route requires a Bearer token, which a plain
  // <img>/<iframe> src can't send. The caller owns the returned object URL and must
  // revoke it when done (e.g. on modal close) to avoid leaking memory.
  async getCaseDocumentFile(documentId) {
    if (!USE_MOCK_API) {
      const res = await http.get(`/documents/${documentId}/file`, { responseType: 'blob' });
      return { url: URL.createObjectURL(res.data), type: res.data.type };
    }
    return null;
  },

  // Adds a document to a case that's already been created — the "Upload Medical
  // Report" field on the request form only covers the one file attached at submission
  // time; this is for whatever shows up afterward (passport, insurance, lab report...).
  async addCaseDocument(caseId, { type, file }) {
    if (!USE_MOCK_API) {
      const form = new FormData();
      form.append('type', type);
      form.append('file', file);
      const { document } = (await http.post(`/corporate/cases/${caseId}/documents`, form, { headers: { 'Content-Type': undefined } })).data;
      return { id: document.id, name: document.name, type: document.type, fileExt: (document.name?.split('.').pop() || 'file').toUpperCase(), date: document.uploadedAt };
    }
    await mockDelay(600);
    return { id: randomId('doc_'), name: file.name, type, fileExt: (file.name?.split('.').pop() || 'file').toUpperCase(), date: new Date().toISOString() };
  },

  // ---------- documents ----------
  // Company-level compliance documents (registration cert, GST, etc.) — real now, but
  // deliberately simple: no Verified/Pending/Expired/Rejected status, since there's no
  // review workflow behind it (nobody actually sets that status). Just upload and list.
  async listDocuments() {
    if (!USE_MOCK_API) {
      const docs = await get('/corporate/documents');
      return docs.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        fileName: d.fileUrl.split('/').pop().replace(/^\d+-/, ''),
        size: d.fileSizeBytes,
        uploadedAt: d.uploadedAt,
      }));
    }
    await mockDelay();
    return [...mockDb.get('documents')];
  },

  async uploadDocument({ type, name, file }) {
    if (!USE_MOCK_API) {
      const form = new FormData();
      form.append('type', type);
      if (name) form.append('name', name);
      form.append('file', file);
      const d = (await http.post('/corporate/documents', form, { headers: { 'Content-Type': undefined } })).data;
      return { id: d.id, name: d.name, type: d.type, fileName: file.name, size: d.fileSizeBytes, uploadedAt: d.uploadedAt };
    }
    await mockDelay(600);
    const doc = { id: randomId('DOC-'), type, name, fileName: file.name, size: file.size, uploadedAt: new Date().toISOString() };
    mockDb.set('documents', [doc, ...mockDb.get('documents')]);
    return doc;
  },

  async deleteDocument(id) {
    if (!USE_MOCK_API) {
      await http.delete(`/corporate/documents/${id}`);
      return;
    }
    await mockDelay(400);
    mockDb.set(
      'documents',
      mockDb.get('documents').filter((d) => d.id !== id),
    );
  },

  // Same reasoning as getCaseDocumentFile() above — fetched as a blob through the
  // authenticated axios client since the file route needs a Bearer token. Caller owns
  // the returned object URL and must revoke it when done.
  async getCorporateDocumentFile(documentId) {
    if (!USE_MOCK_API) {
      const res = await http.get(`/corporate/documents/${documentId}/file`, { responseType: 'blob' });
      return { url: URL.createObjectURL(res.data), type: res.data.type };
    }
    return null;
  },

  // ---------- billing ----------
  // Invoices/Payments are deferred along with the payment gateway decision — same
  // empty-fallback reasoning as listDocuments() above.
  async listInvoices() {
    if (!USE_MOCK_API) {
      try {
        return await get('/corporate/invoices');
      } catch {
        return [];
      }
    }
    await mockDelay();
    return [...mockDb.get('invoices')];
  },

  async listPayments() {
    if (!USE_MOCK_API) {
      try {
        return await get('/corporate/payments');
      } catch {
        return [];
      }
    }
    await mockDelay();
    return [...mockDb.get('payments')];
  },

  async payInvoice(invoiceId, method) {
    if (!USE_MOCK_API) return (await http.post(`/corporate/invoices/${invoiceId}/pay`, { method })).data;
    await mockDelay(1400, 500);
    const inv = mockDb.get('invoices').find((i) => i.id === invoiceId);
    if (!inv) throw new ApiError('Invoice not found.', 404);
    if (inv.status === 'Paid') throw new ApiError('This invoice is already paid.', 409);
    const payments = mockDb.get('payments');
    const payment = {
      id: `HCW-PAY-${String(3310 + payments.length + 1).padStart(5, '0')}`,
      invoiceId,
      date: new Date().toISOString(),
      amount: inv.amount,
      currency: inv.currency,
      method,
      reference:
        method === 'UPI'
          ? `UPI${Date.now().toString().slice(-9)}`
          : method === 'Card'
            ? `CRD-${Date.now().toString().slice(-6)}`
            : `UTR${Date.now().toString().slice(-10)}`,
      status: 'Paid',
    };
    mockDb.set('payments', [payment, ...payments]);
    mockDb.set(
      'invoices',
      mockDb.get('invoices').map((i) => (i.id === invoiceId ? { ...i, status: 'Paid' } : i)),
    );
    pushNotification({
      title: 'Payment received',
      message: `Payment for ${invoiceId} was successful. Reference ${payment.reference}.`,
      type: 'success',
      link: '/payments',
    });
    return payment;
  },

  // ---------- notifications ----------
  async listNotifications() {
    if (!USE_MOCK_API) return get('/corporate/notifications');
    await mockDelay(250, 200);
    return [...mockDb.get('notifications')].sort((a, b) => b.date.localeCompare(a.date));
  },

  async setNotificationRead(id, read) {
    if (!USE_MOCK_API) {
      await http.patch(`/corporate/notifications/${id}`, { read });
      return;
    }
    mockDb.set(
      'notifications',
      mockDb.get('notifications').map((n) => (n.id === id ? { ...n, read } : n)),
    );
  },

  async markAllNotificationsRead() {
    if (!USE_MOCK_API) {
      await http.post('/corporate/notifications/read-all');
      return;
    }
    mockDb.set(
      'notifications',
      mockDb.get('notifications').map((n) => ({ ...n, read: true })),
    );
  },

  async deleteNotification(id) {
    if (!USE_MOCK_API) {
      await http.delete(`/corporate/notifications/${id}`);
      return;
    }
    mockDb.set(
      'notifications',
      mockDb.get('notifications').filter((n) => n.id !== id),
    );
  },

  // ---------- support ----------
  async listTickets() {
    if (!USE_MOCK_API) return get('/corporate/tickets');
    await mockDelay();
    return [...mockDb.get('tickets')].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createTicket(input) {
    if (!USE_MOCK_API) return (await http.post('/corporate/tickets', input)).data;
    await mockDelay(800);
    const tickets = mockDb.get('tickets');
    const maxSeq = Math.max(...tickets.map((t) => Number(t.id.split('-').pop()) || 0), 351);
    const now = new Date().toISOString();
    const ticket = {
      id: `HCW-TKT-${String(maxSeq + 1).padStart(5, '0')}`,
      ...input,
      status: 'Open',
      createdAt: now,
      updatedAt: now,
      messages: [{ id: randomId('m_'), from: 'corporate', author: mockDb.get('profile').company.contactName, date: now, body: input.description }],
    };
    mockDb.set('tickets', [ticket, ...tickets]);
    return ticket;
  },

  async replyTicket(id, body) {
    if (!USE_MOCK_API) return (await http.post(`/corporate/tickets/${id}/messages`, { body })).data;
    await mockDelay(500);
    const now = new Date().toISOString();
    let updated;
    mockDb.set(
      'tickets',
      mockDb.get('tickets').map((t) => {
        if (t.id !== id) return t;
        updated = {
          ...t,
          status: t.status === 'Resolved' || t.status === 'Closed' ? 'Open' : t.status,
          updatedAt: now,
          messages: [...t.messages, { id: randomId('m_'), from: 'corporate', author: mockDb.get('profile').company.contactName, date: now, body }],
        };
        return updated;
      }),
    );
    if (!updated) throw new ApiError('Ticket not found.', 404);
    return updated;
  },

  // ---------- profile, bank, settings ----------
  async getProfile() {
    if (!USE_MOCK_API) return get('/corporate/profile');
    await mockDelay();
    return mockDb.get('profile');
  },

  async updateCompany(company) {
    if (!USE_MOCK_API) return (await http.put('/corporate/profile/company', company)).data;
    await mockDelay(800);
    const profile = { ...mockDb.get('profile'), company };
    mockDb.set('profile', profile);
    return profile;
  },

  /** Only the masked form is kept; the change goes back to "Pending Verification". */
  async updateBank(bank) {
    if (!USE_MOCK_API) return (await http.put('/corporate/profile/bank', bank)).data;
    await mockDelay(1000);
    const profile = { ...mockDb.get('profile'), bank: maskBank(bank) };
    mockDb.set('profile', profile);
    pushNotification({
      title: 'Bank details require verification',
      message: 'Your updated bank details will be verified by HumanCare finance before the next payout.',
      type: 'warning',
      link: '/bank-details',
    });
    return profile;
  },

  async getSettings() {
    if (!USE_MOCK_API) return get('/corporate/settings');
    await mockDelay(300);
    return mockDb.get('settings');
  },

  async updateSettings(settings) {
    if (!USE_MOCK_API) return (await http.put('/corporate/settings', settings)).data;
    await mockDelay(600);
    mockDb.set('settings', settings);
    return settings;
  },

  // ---------- search ----------
  async search(query) {
    if (!USE_MOCK_API) return get('/corporate/search', { q: query });
    await mockDelay(150, 150);
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const cases = mockDb
      .get('cases')
      .filter((c) => c.id.toLowerCase().includes(q) || c.patientName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ kind: 'case', id: c.id, title: c.id, subtitle: `${c.patientName} · ${c.service}`, to: `/cases/${c.id}` }));
    const patients = mockDb
      .get('patients')
      .filter((p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({ kind: 'patient', id: p.id, title: p.name, subtitle: `${p.id} · ${p.service}`, to: `/patients/${p.id}` }));
    const invoices = mockDb
      .get('invoices')
      .filter((i) => i.id.toLowerCase().includes(q) || i.caseId.toLowerCase().includes(q))
      .slice(0, 3)
      .map((i) => ({ kind: 'invoice', id: i.id, title: i.id, subtitle: `${i.caseId} · ${i.status}`, to: `/invoices?q=${encodeURIComponent(i.id)}` }));
    return [...cases, ...patients, ...invoices];
  },
};

function pushNotification(n) {
  const item = { ...n, id: randomId('N-'), date: new Date().toISOString(), read: false };
  mockDb.set('notifications', [item, ...mockDb.get('notifications')]);
  window.dispatchEvent(new Event('hcw:notifications'));
}
