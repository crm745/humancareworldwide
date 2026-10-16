// Mock data mirroring interactive-prototype/app.html. Replace with API calls
// (see ROADMAP.md §3) once the mobile app is wired to the backend.

// Home / Select Service grid. `route` is either the air sub-menu or a service key.
export const SERVICE_TILES = [
  { key: 'air', img: 'IMG_AIR', title: 'svc_air', sub: 'svc_air_sub', route: '/air-ambulance-options' },
  { key: 'ground', img: 'IMG_GROUND', title: 'svc_ground', sub: 'svc_ground_sub' },
  { key: 'hospital', img: 'IMG_HOSPITAL', title: 'svc_hospital', sub: 'svc_hospital_sub' },
  { key: 'mortal', img: 'IMG_MORTAL', title: 'svc_mortal', sub: 'svc_mortal_sub' },
  { key: 'homecare', img: 'IMG_HOMECARE', title: 'svc_homecare', sub: 'svc_homecare_sub' },
  { key: 'tele', img: 'IMG_TELE', title: 'svc_tele', sub: 'svc_tele_sub' },
  { key: 'corporate', img: 'IMG_CORPORATE', title: 'svc_corporate', sub: 'svc_corporate_sub' },
];

// Label keys for each service filter value.
export const SERVICE_LABELS = {
  air: 'svc_air',
  ground: 'svc_ground',
  hospital: 'filter_svc_hospital',
  escort: 'filter_svc_escort',
  mortal: 'filter_svc_mortal',
  homecare: 'filter_svc_homecare',
  tele: 'svc_tele',
  corporate: 'filter_svc_corporate',
};

export const MY_REQUESTS = [
  { id: 'REQ-1005', service: 'air', status: 'progress', date: '2024-05-10', display: '10 May 2024' },
  { id: 'REQ-1004', service: 'hospital', status: 'submitted', date: '2024-05-09', display: '09 May 2024' },
  { id: 'REQ-1003', service: 'ground', status: 'completed', date: '2024-05-05', display: '05 May 2024' },
  { id: 'REQ-1002', service: 'escort', status: 'completed', date: '2024-05-01', display: '01 May 2024' },
  { id: 'REQ-1001', service: 'tele', status: 'completed', date: '2024-04-25', display: '25 Apr 2024' },
];
// Mock requests are anchored around 10 May 2024, so that date stands in for
// "today" in the date filters — the real date would empty every filter.
export const REQUESTS_TODAY = '2024-05-10';

export const CORPORATE_CASES = [
  { id: '#HC-2026-107', patient: 'Klaus Weber', route: 'Munich → Berlin', stage: 'submitted', service: 'ground', date: '2026-05-12' },
  { id: '#HC-2026-102', patient: 'Elena Rostova', route: 'Doha → London', stage: 'progress', service: 'air', date: '2026-05-02' },
  { id: '#HC-2026-094', patient: 'Sarah Jenkins', route: 'Dubai → Mumbai', stage: 'scheduled', service: 'hospital', date: '2026-03-15' },
  { id: '#HC-2026-089', patient: 'Robert Evans', route: 'Bangkok → Frankfurt', stage: 'progress', service: 'air', date: '2025-11-20' },
];
export const CASES_TODAY = '2026-05-12';

export const CORPORATE_IDENTITY = { name: 'Bupa Global Assistance', avatar: 'BG', partner: 'Partner #HC-CORP-482' };

export const NOTIFICATIONS = [
  { kind: 'submitted', title: 'notif_request_submitted_title', body: 'notif_request_submitted_body', ago: '2h ago' },
  { kind: 'progress', title: 'notif_request_progress_title', body: 'notif_request_progress_body', ago: '10m ago' },
  { kind: 'completed', title: 'notif_request_completed_title', body: 'notif_request_completed_body', ago: '1d ago' },
  { kind: 'cancelled', title: 'notif_request_cancelled_title', body: 'notif_request_cancelled_body', ago: '3d ago' },
];

export const TRACKING_DOCS = [
  { label: 'doc_medical_report', meta: 'PDF · 320 KB' },
  { label: 'doc_quotation', meta: 'PDF · 180 KB' },
  { label: 'doc_invoice', meta: 'PDF · 210 KB' },
];

export const MY_DOCUMENTS = [
  { section: 'lbl_identity_insurance', docs: [
    { label: 'doc_passport_copy', meta: 'PDF · 1.2 MB', toast: 'Opening Passport…' },
    { label: 'doc_insurance_card', meta: 'PDF · 480 KB', toast: 'Opening Insurance Card…' },
  ] },
  { section: 'lbl_medical_records', docs: [
    { label: 'doc_medical_history_summary', meta: 'PDF · 640 KB', toast: 'Opening Medical History…' },
    { label: 'doc_current_prescription', meta: 'PDF · 210 KB', toast: 'Opening Prescription…' },
  ] },
];

export const REGIONAL_NUMBERS = [
  { label: 'country_india', display: '+91 9699999065', tel: '+919699999065' },
  { label: 'country_uae_global', display: '+971 585787878', tel: '+971585787878' },
  { label: 'country_oman', display: '+968 92402959', tel: '+96892402959' },
  { label: 'country_bangladesh', display: '+880 1314968067', tel: '+8801314968067' },
  { label: 'country_uk', display: '+44 7557070702', tel: '+447557070702' },
];

export const FAQS = [
  { q: 'faq_q1', a: 'For critical cases, our team can have an aircraft airborne within 2–4 hours of confirmed clearance.' },
  { q: 'faq_q2', a: 'We work directly with most major TPAs and insurers on a Guarantee of Payment basis.' },
  { q: 'faq_q3', a: 'Open My Requests, tap a request, then View Live Tracking — no separate app needed.' },
  { q: 'faq_q4', a: 'We have offices across 8 regions — India, UAE, Oman, Turkey, Canada, Kenya, Bangladesh and Singapore — plus a global network of 3,500+ partner hospitals.' },
];

export const LANGUAGES = [
  { code: 'EN', name: 'English', label: 'English (EN)' },
  { code: 'HI', name: 'हिंदी (Hindi)', label: 'हिंदी (HI)' },
  { code: 'MR', name: 'मराठी (Marathi)', label: 'मराठी (MR)' },
  { code: 'GU', name: 'ગુજરાતી (Gujarati)', label: 'ગુજરાતી (GU)' },
  { code: 'TE', name: 'తెలుగు (Telugu)', label: 'తెలుగు (TE)' },
  { code: 'AR', name: 'العربية (Arabic)', label: 'العربية (AR)' },
];

// Full set of ITU-T E.164 international calling codes, so the country selector isn't
// limited to a handful of markets. India/UAE/UK/US lead the list since they're our
// primary markets and the app's defaults; the rest follow in numeric order.
export const COUNTRY_CODES = [
  '+91', '+971', '+44', '+1',
  '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40', '+41', '+43',
  '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+53', '+54', '+55', '+56', '+57', '+58',
  '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+92',
  '+93', '+94', '+95', '+98',
  '+211', '+212', '+213', '+216', '+218', '+220', '+221', '+222', '+223', '+224', '+225',
  '+226', '+227', '+228', '+229', '+230', '+231', '+232', '+233', '+234', '+235', '+236',
  '+237', '+238', '+239', '+240', '+241', '+242', '+243', '+244', '+245', '+246', '+248',
  '+249', '+250', '+251', '+252', '+253', '+254', '+255', '+256', '+257', '+258', '+260',
  '+261', '+262', '+263', '+264', '+265', '+266', '+267', '+268', '+269',
  '+290', '+291', '+297', '+298', '+299',
  '+350', '+351', '+352', '+353', '+354', '+355', '+356', '+357', '+358', '+359',
  '+370', '+371', '+372', '+373', '+374', '+375', '+376', '+377', '+378', '+380', '+381',
  '+382', '+383', '+385', '+386', '+387', '+389',
  '+420', '+421', '+423',
  '+500', '+501', '+502', '+503', '+504', '+505', '+506', '+507', '+508', '+509',
  '+590', '+591', '+592', '+593', '+594', '+595', '+596', '+597', '+598', '+599',
  '+670', '+672', '+673', '+674', '+675', '+676', '+677', '+678', '+679', '+680', '+681',
  '+682', '+683', '+685', '+686', '+687', '+688', '+689', '+690', '+691', '+692',
  '+850', '+852', '+853', '+855', '+856', '+880', '+886',
  '+960', '+961', '+962', '+963', '+964', '+965', '+966', '+967', '+968', '+970', '+972',
  '+973', '+974', '+975', '+976', '+977',
  '+992', '+993', '+994', '+995', '+996', '+998',
];
// 24/7 emergency line used by the Home SOS button and Help & Support "Call Alarm Desk".
export const EMERGENCY_TEL = '+919699999065';
export const EMERGENCY_DISPLAY = '+91 96999 99065';
export const OPS_EMAIL = 'ops@humancareworldwide.com';

// "How did you hear about us?" options. Picking SOURCE_OTHER asks the user to type the answer.
export const SOURCE_OTHER = 'Other';
export const SOURCES = ['Google Search', 'Referral', 'Insurance Provider', 'Social Media', SOURCE_OTHER];
