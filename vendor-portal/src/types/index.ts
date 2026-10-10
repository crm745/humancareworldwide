// Shared domain types. These mirror the JSON the Node.js/Express API will return,
// so swapping the mock services for real endpoints doesn't touch the pages.

export type CountryCode = 'IN' | 'AE' | 'OM' | 'SA' | 'QA' | 'GB' | 'US' | 'OTHER';
export type Currency = 'INR' | 'USD' | 'AED' | 'GBP' | 'EUR' | 'SAR' | 'QAR' | 'OMR';

export type CompanyType =
  | 'Private Limited Company'
  | 'Trust'
  | 'Hindu Undivided Family (HUF)'
  | 'Firm'
  | 'Limited Liability Partnership (LLP)'
  | 'Government Entity';

export interface CompanyDetails {
  companyName: string;
  registrationNumber: string;
  companyType: CompanyType | '';
  country: CountryCode | '';
  countryOther: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  officialEmail: string;
  officialPhone: string;
  website: string;
  contactName: string;
  contactDesignation: string;
  contactEmail: string;
  contactPhone: string;
}

export type BankType = 'Domestic' | 'International';
/** Full bank details as typed in a form. Only ever held in memory and sent to the API. */
export interface BankDetailsInput {
  bankType: BankType;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  branchName: string;
  branchAddress: string;
  swift: string;
  iban: string;
  bankCountry: string;
  bankAddress: string;
  currency: Currency | '';
}

export type VerificationState = 'Verified' | 'Pending Verification' | 'Rejected';

/** What the app stores / displays after saving: account numbers reduced to the last 4 digits. */
export interface BankDetailsMasked {
  bankType: BankType;
  bankName: string;
  accountHolder: string;
  accountLast4: string;
  ifsc?: string;
  branchName?: string;
  branchAddress?: string;
  swift?: string;
  ibanLast4?: string;
  bankCountry?: string;
  bankAddress?: string;
  currency?: Currency | '';
  verification: VerificationState;
  updatedAt: string;
}

export type ServiceType =
  | 'Air Ambulance'
  | 'Ground Ambulance'
  | 'Train Ambulance'
  | 'Hospital Transfer'
  | 'Medical Escort'
  | 'Private Medical Assistance';

export type CaseStatus = 'Submitted' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
export type Priority = 'Low' | 'Medium' | 'High' | 'Emergency';
export type Gender = 'Male' | 'Female' | 'Other';

export interface CaseRecord {
  id: string;
  patientId: string;
  patientName: string;
  service: ServiceType;
  pickup: string;
  destination: string;
  requestDate: string;
  scheduledDate: string | null;
  assignedTeam: string;
  status: CaseStatus;
  priority: Priority;
  notes: string;
}

export interface CommunicationEntry {
  id: string;
  date: string;
  channel: 'Phone' | 'Email' | 'WhatsApp' | 'Portal Note';
  by: string;
  summary: string;
}

export interface PatientDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  status: 'Verified' | 'Pending';
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  country: string;
  nationality: string;
  service: ServiceType;
  caseId: string;
  status: CaseStatus;
  dateOfBirth: string;
  phone: string;
  email: string;
  passportLast4: string;
  emergencyContact: { name: string; relation: string; phone: string };
  medical: {
    diagnosis: string;
    condition: 'Stable' | 'Serious' | 'Critical';
    bloodGroup: string;
    allergies: string;
    medications: string[];
    mobility: string;
    oxygenRequired: boolean;
    attendingDoctor: string;
    notes: string;
  };
  travel: {
    from: string;
    to: string;
    mode: string;
    travelDate: string | null;
    escort: string;
    equipment: string[];
  };
  documents: PatientDocument[];
  communications: CommunicationEntry[];
}

export type DocumentStatus = 'Verified' | 'Pending' | 'Expired' | 'Rejected';

export interface VendorDocument {
  id: string;
  name: string;
  type: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  expiryDate: string | null;
  status: DocumentStatus;
  remarks?: string;
}

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

export interface Invoice {
  id: string;
  caseId: string;
  service: ServiceType;
  date: string;
  dueDate: string;
  amount: number;
  currency: Currency;
  status: InvoiceStatus;
}

export type PaymentMethod = 'Bank Transfer' | 'UPI' | 'Card';

export interface Payment {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  reference: string;
  status: 'Paid' | 'Pending';
}

export type NotificationType = 'success' | 'info' | 'warning' | 'case' | 'invoice';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: NotificationType;
  link?: string;
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TicketMessage {
  id: string;
  from: 'vendor' | 'support';
  author: string;
  date: string;
  body: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  attachmentName?: string;
  messages: TicketMessage[];
}

export interface VendorProfile {
  vendorId: string;
  company: CompanyDetails;
  bank: BankDetailsMasked;
  verificationStatus: VerificationState;
  memberSince: string;
  verification: { label: string; status: 'complete' | 'current' | 'pending' | 'failed'; date?: string }[];
}

export interface VendorSettings {
  notifications: Record<'cases' | 'invoices' | 'documents' | 'account', { email: boolean; sms: boolean; inApp: boolean }>;
  language: string;
  timezone: string;
  dateFormat: string;
  twoFactor: boolean;
}

export interface SessionUser {
  vendorId: string;
  username: string;
  email: string;
  companyName: string;
  contactName: string;
}

export interface Session {
  token: string;
  user: SessionUser;
  expiresAt: number;
}

export type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

export interface DashboardData {
  stats: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    pendingCases: number;
    totalPatients: number;
    pendingDocuments: number;
    outstandingAmount: number;
  };
  statusBreakdown: { status: CaseStatus; count: number }[];
  monthly: { label: string; cases: number }[];
  completedVsPending: { label: string; completed: number; pending: number }[];
  serviceWise: { service: ServiceType; count: number }[];
  recentCases: CaseRecord[];
}

/** Registration documents, keyed by requirement. */
export type RegistrationDocKey = 'registration' | 'tax' | 'bankProof' | 'pan' | 'authorizedId' | 'other';

export interface RegistrationDocumentMeta {
  key: RegistrationDocKey;
  label: string;
  fileName: string;
  size: number;
  status: 'Uploaded' | 'Pending Verification' | 'Verified' | 'Rejected';
}

export type RegistrationStatus = 'Pending Verification' | 'Verified' | 'Active';

export interface RegistrationRecord {
  id: string;
  vendorId: string;
  company: CompanyDetails;
  bank: BankDetailsMasked;
  documents: RegistrationDocumentMeta[];
  submittedAt: string;
  email: string;
  emailVerified: boolean;
  approved: boolean;
  credentialsCreated: boolean;
  username?: string;
  status: RegistrationStatus;
}

export interface SearchResult {
  kind: 'case' | 'patient' | 'invoice';
  id: string;
  title: string;
  subtitle: string;
  to: string;
}
