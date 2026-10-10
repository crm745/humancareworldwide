// Realistic sample data for the mock API. Generated deterministically (seeded PRNG) relative to
// today, so date filters on the dashboard always have data. Persisted by services/mockDb.ts.
import type {
  AppNotification, BankDetailsMasked, CaseRecord, CaseStatus, CompanyDetails, Currency, Gender, Invoice,
  Patient, Payment, PaymentMethod, Priority, ServiceType, SupportTicket, VendorDocument, VendorProfile, VendorSettings,
} from '@/types';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400000;
const pad = (n: number, w = 5) => String(n).padStart(w, '0');

export const DEMO_COMPANY: CompanyDetails = {
  companyName: 'MediCorp Global Assistance Pvt. Ltd.',
  registrationNumber: 'U85100MH2014PTC254871',
  companyType: 'Private Limited Company',
  country: 'IN',
  countryOther: '',
  state: 'Maharashtra',
  city: 'Mumbai',
  address: '7th Floor, Supreme Business Park, Hiranandani Gardens, Powai',
  pincode: '400076',
  officialEmail: 'operations@medicorpglobal.com',
  officialPhone: '+91 22 4567 8900',
  website: 'https://www.medicorpglobal.com',
  contactName: 'Ananya Mehta',
  contactDesignation: 'Head – Partner Operations',
  contactEmail: 'ananya.mehta@medicorpglobal.com',
  contactPhone: '+91 98201 45672',
};

export const DEMO_BANK: BankDetailsMasked = {
  bankType: 'Domestic',
  bankName: 'HDFC Bank',
  accountHolder: 'MediCorp Global Assistance Pvt. Ltd.',
  accountLast4: '4582',
  ifsc: 'HDFC0000240',
  branchName: 'Powai, Mumbai',
  branchAddress: 'Hiranandani Gardens, Powai, Mumbai 400076',
  verification: 'Verified',
  updatedAt: new Date(Date.now() - 210 * DAY).toISOString(),
};

const FIRST = ['Rakesh', 'Priya', 'Mohammed', 'Fatima', 'James', 'Sneha', 'Arjun', 'Aisha', 'David', 'Kavita', 'Omar', 'Neha', 'Rahul', 'Sarah', 'Vikram', 'Layla', 'Suresh', 'Meera', 'Hassan', 'Emily', 'Anil', 'Deepa', 'Khalid', 'Pooja', 'Thomas', 'Ritu', 'Imran', 'Sunita', 'George', 'Nadia'];
const LAST = ['Sharma', 'Nair', 'Al Mansoori', 'Khan', 'Whitfield', 'Iyer', 'Kapoor', 'Al Harthy', 'Fernandes', 'Reddy', 'Al Suwaidi', 'Menon', 'Gupta', 'Thompson', 'Rao', 'Haddad', 'Pillai', 'Joshi', 'Al Balushi', 'Carter'];
const PLACES: [string, string][] = [
  ['Kokilaben Dhirubhai Ambani Hospital, Mumbai', 'India'],
  ['AIIMS, New Delhi', 'India'],
  ['Apollo Hospitals, Chennai', 'India'],
  ['Manipal Hospital, Bengaluru', 'India'],
  ['Amrita Hospital, Kochi', 'India'],
  ['Ruby Hall Clinic, Pune', 'India'],
  ['Medanta – The Medicity, Gurugram', 'India'],
  ['Rashid Hospital, Dubai', 'UAE'],
  ['Cleveland Clinic Abu Dhabi', 'UAE'],
  ['Royal Hospital, Muscat', 'Oman'],
  ['King Faisal Specialist Hospital, Riyadh', 'Saudi Arabia'],
  ['Hamad General Hospital, Doha', 'Qatar'],
  ["St Thomas' Hospital, London", 'UK'],
  ['Mount Sinai Hospital, New York', 'USA'],
];
const TEAMS = ['Air Ops – Team Alpha', 'Ground Ops – Team Bravo', 'Critical Care Unit 3', 'Escort Team Delta', 'Rail Medical – Team Echo', 'Care Coordination Desk'];
const SERVICE_TEAM: Record<ServiceType, string> = {
  'Air Ambulance': TEAMS[0],
  'Ground Ambulance': TEAMS[1],
  'Hospital Transfer': TEAMS[2],
  'Medical Escort': TEAMS[3],
  'Train Ambulance': TEAMS[4],
  'Private Medical Assistance': TEAMS[5],
};
const DIAGNOSES = [
  'Post-operative cardiac care (CABG)', 'Ischaemic stroke – haemodynamically stable', 'Polytrauma following road traffic accident',
  'Community-acquired pneumonia on oxygen support', 'Fractured neck of femur – post ORIF', 'Chronic kidney disease – dialysis dependent',
  'Acute myocardial infarction – post PCI', 'Spinal cord injury – C5/C6', 'Premature neonate – incubator transfer', 'Metastatic carcinoma – palliative care',
];
const SERVICE_WEIGHTS: [ServiceType, number][] = [
  ['Air Ambulance', 0.26], ['Ground Ambulance', 0.3], ['Hospital Transfer', 0.16], ['Medical Escort', 0.14], ['Train Ambulance', 0.06], ['Private Medical Assistance', 0.08],
];
const PRICE: Record<ServiceType, [number, number]> = {
  'Air Ambulance': [650000, 2400000],
  'Ground Ambulance': [8000, 45000],
  'Train Ambulance': [95000, 220000],
  'Hospital Transfer': [25000, 90000],
  'Medical Escort': [120000, 380000],
  'Private Medical Assistance': [6000, 30000],
};

export interface SeedData {
  cases: CaseRecord[];
  patients: Patient[];
  invoices: Invoice[];
  payments: Payment[];
  documents: VendorDocument[];
  notifications: AppNotification[];
  tickets: SupportTicket[];
  profile: VendorProfile;
  settings: VendorSettings;
}

export const DEFAULT_SETTINGS: VendorSettings = {
  notifications: {
    cases: { email: true, sms: true, inApp: true },
    invoices: { email: true, sms: false, inApp: true },
    documents: { email: true, sms: false, inApp: true },
    account: { email: true, sms: true, inApp: true },
  },
  language: 'English',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD MMM YYYY',
  twoFactor: false,
};

export function buildSeed(vendorId: string, company: CompanyDetails = DEMO_COMPANY, bank: BankDetailsMasked = DEMO_BANK, memberSince?: string): SeedData {
  const rnd = mulberry32(20261008);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const between = (min: number, max: number) => Math.round(min + rnd() * (max - min));
  const now = Date.now();

  const pickService = (): ServiceType => {
    let r = rnd();
    for (const [s, w] of SERVICE_WEIGHTS) {
      if ((r -= w) <= 0) return s;
    }
    return 'Ground Ambulance';
  };

  // Case ages in days: a few today / this week, then spread back over 12 months.
  const ages = [0, 0, 0.2, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 21, 25, 28];
  while (ages.length < 72) ages.push(between(30, 360));
  ages.sort((a, b) => a - b);

  const cases: CaseRecord[] = [];
  const patients: Patient[] = [];
  let caseSeq = 421;
  ages.forEach((ageDays, i) => {
    const requested = new Date(now - ageDays * DAY - between(0, 6) * 3600000);
    const service = pickService();
    let status: CaseStatus;
    if (ageDays < 1) status = pick<CaseStatus>(['Submitted', 'Submitted', 'Scheduled', 'In Progress']);
    else if (ageDays < 7) status = pick<CaseStatus>(['Submitted', 'Scheduled', 'In Progress', 'In Progress', 'Completed']);
    else if (ageDays < 30) status = pick<CaseStatus>(['Scheduled', 'In Progress', 'Completed', 'Completed', 'Completed', 'Cancelled']);
    else status = rnd() < 0.9 ? 'Completed' : 'Cancelled';
    const priority: Priority =
      service === 'Air Ambulance' ? pick<Priority>(['High', 'Emergency', 'Emergency', 'Medium']) : pick<Priority>(['Low', 'Medium', 'Medium', 'High', 'Emergency']);
    let [pickup, pickupCountry] = pick(PLACES);
    let [dest] = pick(PLACES);
    while (dest === pickup) [dest] = pick(PLACES);
    if (service === 'Train Ambulance' || service === 'Ground Ambulance') {
      // Rail and road transfers stay within the pickup country.
      const sameCountry = PLACES.filter(([p, c]) => c === pickupCountry && p !== pickup);
      if (sameCountry.length) {
        [dest] = pick(sameCountry);
      } else {
        [pickup, pickupCountry] = PLACES[0];
        [dest] = PLACES[1];
      }
    }
    const id = `HCW-CASE-${requested.getFullYear()}-${pad(caseSeq - i)}`;
    const patientId = `HCW-PAT-${pad(1180 - i)}`;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const gender: Gender = rnd() < 0.55 ? 'Male' : 'Female';
    const age = service === 'Hospital Transfer' && rnd() < 0.1 ? 0 : between(18, 86);
    const scheduled = status === 'Submitted' ? null : new Date(requested.getTime() + between(4, 48) * 3600000).toISOString();

    cases.push({
      id,
      patientId,
      patientName: name,
      service,
      pickup,
      destination: dest,
      requestDate: requested.toISOString(),
      scheduledDate: scheduled,
      assignedTeam: status === 'Submitted' ? 'Unassigned' : SERVICE_TEAM[service],
      status,
      priority,
      notes: priority === 'Emergency' ? 'Emergency case — operations desk notified.' : 'Standard coordination.',
    });

    const condition = priority === 'Emergency' ? 'Critical' : priority === 'High' ? 'Serious' : 'Stable';
    patients.push({
      id: patientId,
      name,
      age,
      gender,
      country: pickupCountry,
      nationality: pickupCountry === 'UK' ? 'British' : pickupCountry === 'USA' ? 'American' : pick(['Indian', 'Indian', 'Emirati', 'Omani', 'British']),
      service,
      caseId: id,
      status,
      dateOfBirth: new Date(new Date().getFullYear() - age, between(0, 11), between(1, 28)).toISOString(),
      phone: `+91 9${between(100000000, 999999999)}`,
      email: `${name.split(' ')[0].toLowerCase()}.${between(10, 99)}@example.com`,
      passportLast4: String(between(1000, 9999)),
      emergencyContact: { name: `${pick(FIRST)} ${name.split(' ').slice(-1)[0]}`, relation: pick(['Spouse', 'Son', 'Daughter', 'Brother', 'Parent']), phone: `+91 9${between(100000000, 999999999)}` },
      medical: {
        diagnosis: pick(DIAGNOSES),
        condition,
        bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'O-', 'A-']),
        allergies: pick(['None known', 'Penicillin', 'Latex', 'Sulfa drugs', 'None known']),
        medications: pick([['Aspirin 75 mg', 'Atorvastatin 40 mg'], ['Insulin glargine', 'Metformin 500 mg'], ['Paracetamol 1 g PRN'], ['Enoxaparin 40 mg', 'Pantoprazole 40 mg']]),
        mobility: pick(['Stretcher-bound', 'Wheelchair', 'Ambulatory with assistance', 'Fully ambulatory']),
        oxygenRequired: condition !== 'Stable' || rnd() < 0.2,
        attendingDoctor: `Dr. ${pick(FIRST)} ${pick(LAST)}`,
        notes: 'Fit to travel as per treating physician. Medical summary on file.',
      },
      travel: {
        from: pickup,
        to: dest,
        mode: service,
        travelDate: scheduled,
        escort: service === 'Air Ambulance' ? 'Flight physician + ICU nurse' : service === 'Medical Escort' ? 'Doctor escort' : 'Paramedic',
        equipment: condition === 'Critical' ? ['Ventilator', 'Cardiac monitor', 'Infusion pumps'] : ['Cardiac monitor', 'Oxygen'],
      },
      documents: [
        { id: `${patientId}-D1`, name: 'Medical Summary', type: 'PDF', date: requested.toISOString(), status: 'Verified' },
        { id: `${patientId}-D2`, name: 'Fit-to-Fly Certificate', type: 'PDF', date: requested.toISOString(), status: status === 'Submitted' ? 'Pending' : 'Verified' },
        { id: `${patientId}-D3`, name: 'Passport Copy', type: 'Image', date: requested.toISOString(), status: 'Verified' },
      ],
      communications: [
        { id: `${patientId}-C1`, date: requested.toISOString(), channel: 'Portal Note', by: company.contactName, summary: `Request raised for ${service.toLowerCase()} from ${pickup}.` },
        { id: `${patientId}-C2`, date: new Date(requested.getTime() + 40 * 60000).toISOString(), channel: 'Phone', by: 'HumanCare Operations', summary: 'Called family to confirm patient details and travel documents.' },
        ...(status === 'Completed'
          ? [{ id: `${patientId}-C3`, date: new Date(requested.getTime() + 2 * DAY).toISOString(), channel: 'Email' as const, by: 'HumanCare Operations', summary: 'Mission completed. Handover note and invoice shared.' }]
          : []),
      ],
    });
  });

  // Invoices for completed and in-progress cases, payments for the paid ones.
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let invSeq = 124;
  let paySeq = 3310;
  const currencyFor = (place: string): Currency => (/(Dubai|Abu Dhabi)/.test(place) ? 'AED' : /(London)/.test(place) ? 'GBP' : /(New York|Riyadh|Doha|Muscat)/.test(place) ? 'USD' : 'INR');
  [...cases].reverse().forEach((c) => {
    if (c.status !== 'Completed' && c.status !== 'In Progress') return;
    const date = new Date(new Date(c.requestDate).getTime() + 3 * DAY);
    if (date.getTime() > now) date.setTime(now - 3600000);
    const due = new Date(date.getTime() + 30 * DAY);
    const currency = currencyFor(c.pickup);
    const [min, max] = PRICE[c.service];
    const inr = Math.round(between(min, max) / 500) * 500;
    const amount = currency === 'INR' ? inr : Math.round(inr / { USD: 84, AED: 22.9, GBP: 107 }[currency as 'USD' | 'AED' | 'GBP'] / 10) * 10;
    const age = now - date.getTime();
    let status: Invoice['status'];
    if (age > 50 * DAY) status = rnd() < 0.92 ? 'Paid' : 'Overdue';
    else if (due.getTime() < now) status = rnd() < 0.5 ? 'Paid' : 'Overdue';
    else status = rnd() < 0.3 ? 'Paid' : 'Pending';
    const id = `HCW-INV-${date.getFullYear()}-${pad(invSeq++)}`;
    invoices.push({ id, caseId: c.id, service: c.service, date: date.toISOString(), dueDate: due.toISOString(), amount, currency, status });
    if (status === 'Paid') {
      const method = pick<PaymentMethod>(['Bank Transfer', 'Bank Transfer', 'UPI', 'Card']);
      payments.push({
        id: `HCW-PAY-${pad(paySeq++)}`,
        invoiceId: id,
        date: new Date(Math.min(now - 3600000, date.getTime() + between(5, 28) * DAY)).toISOString(),
        amount,
        currency,
        method,
        reference: method === 'UPI' ? `UPI${between(100000000, 999999999)}` : method === 'Card' ? `CRD-${between(100000, 999999)}` : `UTR${between(1e9, 9e9)}`,
        status: 'Paid',
      });
    }
  });
  invoices.reverse();
  payments.reverse();

  const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();
  const inDays = (d: number) => new Date(now + d * DAY).toISOString();

  const documents: VendorDocument[] = [
    { id: 'DOC-1001', name: 'Certificate of Incorporation', type: 'Company Registration Certificate', fileName: 'certificate_of_incorporation.pdf', size: 482113, uploadedAt: daysAgo(214), expiryDate: null, status: 'Verified' },
    { id: 'DOC-1002', name: 'GST Registration Certificate', type: 'Tax / GST Certificate', fileName: 'gst_certificate.pdf', size: 301442, uploadedAt: daysAgo(214), expiryDate: null, status: 'Verified' },
    { id: 'DOC-1003', name: 'Cancelled Cheque – HDFC Bank', type: 'Bank Proof', fileName: 'cancelled_cheque.jpg', size: 912004, uploadedAt: daysAgo(214), expiryDate: null, status: 'Verified' },
    { id: 'DOC-1004', name: 'Company PAN Card', type: 'Company PAN', fileName: 'company_pan.png', size: 220871, uploadedAt: daysAgo(213), expiryDate: null, status: 'Verified' },
    { id: 'DOC-1005', name: 'Authorized Signatory – Passport', type: 'Authorized Person ID', fileName: 'signatory_passport.pdf', size: 1204883, uploadedAt: daysAgo(213), expiryDate: inDays(1460), status: 'Verified' },
    { id: 'DOC-1006', name: 'Professional Indemnity Insurance', type: 'Insurance Certificate', fileName: 'indemnity_insurance_2026.pdf', size: 655120, uploadedAt: daysAgo(4), expiryDate: inDays(361), status: 'Pending' },
    { id: 'DOC-1007', name: 'Trade Licence 2025', type: 'Trade Licence', fileName: 'trade_licence_2025.pdf', size: 388002, uploadedAt: daysAgo(330), expiryDate: daysAgo(12), status: 'Expired' },
    { id: 'DOC-1008', name: 'NABH Accreditation', type: 'Accreditation Certificate', fileName: 'nabh_accreditation.jpg', size: 1840022, uploadedAt: daysAgo(9), expiryDate: inDays(22), status: 'Rejected', remarks: 'Image is blurred — please upload a clear scan or the original PDF.' },
    { id: 'DOC-1009', name: 'Master Service Agreement', type: 'Service Agreement', fileName: 'msa_humancare_signed.pdf', size: 2204511, uploadedAt: daysAgo(200), expiryDate: inDays(165), status: 'Verified' },
    { id: 'DOC-1010', name: 'Updated GST Amendment', type: 'Tax / GST Certificate', fileName: 'gst_amendment.pdf', size: 190331, uploadedAt: daysAgo(1), expiryDate: null, status: 'Pending' },
  ];

  const firstOverdue = invoices.find((i) => i.status === 'Overdue') ?? invoices[0];
  const notifications: AppNotification[] = [
    { id: 'N-1', title: 'New case assigned', message: `${cases[0].id} (${cases[0].service}) has been assigned to your account.`, date: daysAgo(0.05), read: false, type: 'case', link: `/cases/${cases[0].id}` },
    { id: 'N-2', title: 'Document verification completed', message: 'GST Registration Certificate has been verified by HumanCare compliance.', date: daysAgo(0.4), read: false, type: 'success', link: '/documents' },
    { id: 'N-3', title: 'Invoice due', message: `Invoice ${firstOverdue?.id ?? 'HCW-INV-1024'} is due. Please arrange payment to avoid service holds.`, date: daysAgo(1), read: false, type: 'invoice', link: '/invoices' },
    { id: 'N-4', title: 'Document rejected', message: 'NABH Accreditation was rejected: image is blurred. Please re-upload.', date: daysAgo(2), read: false, type: 'warning', link: '/documents' },
    { id: 'N-5', title: 'Case scheduled', message: `${cases[2].id} is scheduled. Team details have been shared.`, date: daysAgo(3), read: true, type: 'case', link: `/cases/${cases[2].id}` },
    { id: 'N-6', title: 'Bank details require verification', message: 'Please confirm the account holder name on your bank proof matches your registered company name.', date: daysAgo(6), read: true, type: 'warning', link: '/bank-details' },
    { id: 'N-7', title: 'Payment received', message: 'We have received your payment. A receipt is available under Payments.', date: daysAgo(9), read: true, type: 'success', link: '/payments' },
    { id: 'N-8', title: 'Registration verified', message: 'Your vendor registration has been verified. Welcome to HumanCare Worldwide.', date: memberSince ?? daysAgo(212), read: true, type: 'success', link: '/profile' },
  ];

  const tickets: SupportTicket[] = [
    {
      id: 'HCW-TKT-00318', subject: 'Unable to download invoice PDF', category: 'Billing & Payments', priority: 'Medium', status: 'Resolved',
      description: 'The download button for one of last month’s invoices was not responding.', createdAt: daysAgo(18), updatedAt: daysAgo(16),
      messages: [
        { id: 'm1', from: 'vendor', author: company.contactName, date: daysAgo(18), body: 'The download button for one of last month’s invoices was not responding.' },
        { id: 'm2', from: 'support', author: 'HumanCare Support', date: daysAgo(16), body: 'Thanks for reporting — this has been fixed. Please try again and let us know if it persists.' },
      ],
    },
    {
      id: 'HCW-TKT-00342', subject: 'Add two operations users to our account', category: 'Account & Access', priority: 'Low', status: 'In Progress',
      description: 'Please create logins for our night-shift coordinators.', createdAt: daysAgo(3), updatedAt: daysAgo(1),
      messages: [
        { id: 'm1', from: 'vendor', author: company.contactName, date: daysAgo(3), body: 'Please create logins for our night-shift coordinators.' },
        { id: 'm2', from: 'support', author: 'HumanCare Support', date: daysAgo(1), body: 'We are setting these up and will share the credentials with the users directly.' },
      ],
    },
    {
      id: 'HCW-TKT-00351', subject: 'Update ETA for ongoing air ambulance case', category: 'Case Operations', priority: 'High', status: 'Open',
      description: `Family is asking for the revised arrival time for ${cases[3].id}.`, createdAt: daysAgo(0.3), updatedAt: daysAgo(0.3),
      messages: [{ id: 'm1', from: 'vendor', author: company.contactName, date: daysAgo(0.3), body: `Family is asking for the revised arrival time for ${cases[3].id}.` }],
    },
    {
      id: 'HCW-TKT-00290', subject: 'Trade licence renewal upload', category: 'Documents & Verification', priority: 'Low', status: 'Closed',
      description: 'Uploaded the renewed licence, please verify.', createdAt: daysAgo(60), updatedAt: daysAgo(55),
      messages: [
        { id: 'm1', from: 'vendor', author: company.contactName, date: daysAgo(60), body: 'Uploaded the renewed licence, please verify.' },
        { id: 'm2', from: 'support', author: 'HumanCare Support', date: daysAgo(55), body: 'Verified. Closing this ticket.' },
      ],
    },
  ];

  const since = memberSince ?? daysAgo(212);
  const profile: VendorProfile = {
    vendorId,
    company,
    bank,
    verificationStatus: 'Verified',
    memberSince: since,
    verification: [
      { label: 'Registration Submitted', status: 'complete', date: since },
      { label: 'Document Verification', status: 'complete', date: since },
      { label: 'Bank Verification', status: 'complete', date: since },
      { label: 'Vendor ID Generated', status: 'complete', date: since },
      { label: 'Email Verification', status: 'complete', date: since },
      { label: 'Account Activated', status: 'complete', date: since },
    ],
  };

  return { cases, patients, invoices, payments, documents, notifications, tickets, profile, settings: DEFAULT_SETTINGS };
}
