import type { CompanyType, CountryCode, Currency, RegistrationDocKey, ServiceType } from '@/types';

export const APP_NAME = 'HumanCare Worldwide';

// Support contacts shown on the Support page. The phone is HumanCare's 24x7 line used in the mobile app;
// confirm the vendor-support mailbox before going live.
export const SUPPORT_PHONE = '+91 96999 99065';
export const SUPPORT_TEL = '+919699999065';
export const SUPPORT_EMAIL = 'vendorsupport@humancareworldwide.com';

export const COUNTRIES: { code: CountryCode; name: string; dial: string }[] = [
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'AE', name: 'UAE', dial: '+971' },
  { code: 'OM', name: 'Oman', dial: '+968' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'QA', name: 'Qatar', dial: '+974' },
  { code: 'GB', name: 'UK', dial: '+44' },
  { code: 'US', name: 'USA', dial: '+1' },
  { code: 'OTHER', name: 'Other', dial: '' },
];

export const countryName = (code: string, other = ''): string =>
  code === 'OTHER' ? other || 'Other' : COUNTRIES.find((c) => c.code === code)?.name ?? code;

export const STATES: Partial<Record<CountryCode, string[]>> = {
  IN: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  ],
  AE: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'],
  OM: ['Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah', 'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah North', 'Ash Sharqiyah South', 'Adh Dhahirah', 'Al Wusta'],
  QA: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Umm Salal', 'Al Daayen', 'Al Shamal', 'Al Shahaniya'],
};

export const COMPANY_TYPES = [
  'Private Limited Company',
  'Trust',
  'Hindu Undivided Family (HUF)',
  'Firm',
  'Limited Liability Partnership (LLP)',
  'Government Entity',
] as const satisfies readonly CompanyType[];

export const CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR', 'SAR', 'QAR', 'OMR'] as const satisfies readonly Currency[];

/** Indicative rates used only to total mixed-currency invoices on summary cards. */
export const INR_RATE: Record<Currency, number> = {
  INR: 1, USD: 84, AED: 22.9, GBP: 107, EUR: 91, SAR: 22.4, QAR: 23.1, OMR: 218,
};

export const MAX_UPLOAD_MB = 5;
export const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

export const REGISTRATION_DOCUMENTS: { key: RegistrationDocKey; label: string; description: string; required: boolean }[] = [
  { key: 'registration', label: 'Company Registration Certificate', description: 'Certificate of incorporation / trade licence', required: true },
  { key: 'tax', label: 'Tax / GST Certificate', description: 'GST, VAT or tax registration certificate', required: true },
  { key: 'bankProof', label: 'Bank Proof', description: 'Cancelled cheque or bank letter for the account above', required: true },
  { key: 'pan', label: 'Company PAN', description: 'Permanent Account Number card (India) or equivalent tax ID', required: true },
  { key: 'authorizedId', label: 'Authorized Person ID', description: 'Passport, Aadhaar or Emirates ID of the signatory', required: true },
  { key: 'other', label: 'Other Supporting Document', description: 'Accreditation, licence or any other document (optional)', required: false },
];

export const DOCUMENT_TYPES = [
  'Company Registration Certificate',
  'Tax / GST Certificate',
  'Bank Proof',
  'Company PAN',
  'Authorized Person ID',
  'Trade Licence',
  'Insurance Certificate',
  'Accreditation Certificate',
  'Service Agreement',
  'Other Supporting Document',
];

export interface ServiceInfo {
  type: ServiceType;
  description: string;
  status: 'Available' | 'On Request' | 'Limited Availability';
  responseTime: string;
  coverage: string;
}

export const SERVICES: ServiceInfo[] = [
  { type: 'Air Ambulance', description: 'ICU-equipped private jets with a flight physician and critical-care nurse, bed-to-bed.', status: 'Available', responseTime: 'Airborne < 4 hrs', coverage: 'Worldwide' },
  { type: 'Ground Ambulance', description: 'BLS and ALS ambulances with certified paramedics for local and inter-city transfers.', status: 'Available', responseTime: 'Avg. 45 min', coverage: '75+ countries' },
  { type: 'Train Ambulance', description: 'Dedicated railway coach set up as a mobile ICU for long-distance, cost-effective transfers.', status: 'On Request', responseTime: '24–48 hrs notice', coverage: 'India' },
  { type: 'Hospital Transfer', description: 'Hospital-to-hospital transfers with admission coordination at the receiving facility.', status: 'Available', responseTime: 'Same day', coverage: 'India & GCC' },
  { type: 'Medical Escort', description: 'Doctor or nurse escort on commercial flights, including stretcher and wheelchair cases.', status: 'Available', responseTime: '12–24 hrs', coverage: 'Worldwide' },
  { type: 'Private Medical Assistance', description: 'Tele-consultation, second opinions, case management and home-care coordination.', status: 'Limited Availability', responseTime: 'Within 2 hrs', coverage: 'India, UAE, UK' },
];

export const SERVICE_TYPES: ServiceType[] = SERVICES.map((s) => s.type);

export const TICKET_CATEGORIES = [
  'Case Operations',
  'Billing & Payments',
  'Documents & Verification',
  'Account & Access',
  'Technical Issue',
  'Other',
];

export const FAQS: { q: string; a: string }[] = [
  { q: 'How long does vendor verification take?', a: 'Our compliance team reviews documents and bank details within 48 hours of submission. You will get an email as soon as your account is verified.' },
  { q: 'How do I request a service for a patient?', a: 'Open Services, choose the service and click “Request Service”. The request appears under Cases / Requests with the reference number, and our operations desk calls you to confirm.' },
  { q: 'Why is my bank account number masked?', a: 'For security, full account numbers are never shown after saving. Only the last four digits are displayed. To change the account, use “Update Bank Details” — changes are re-verified before the next payout.' },
  { q: 'When are invoices due?', a: 'Invoices are payable within 30 days of the invoice date unless your service agreement says otherwise. Overdue invoices are highlighted in red.' },
  { q: 'A document shows “Expired” — what should I do?', a: 'Upload a renewed copy from Documents using “Replace”. The new file goes to Pending until our team verifies it.' },
  { q: 'Can multiple people from my company use the portal?', a: 'Yes. Raise a ticket under “Account & Access” with the names and emails of the users to add, and we will create logins for them.' },
];
