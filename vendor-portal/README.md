# HumanCare Worldwide – Vendor / Corporate Portal

Frontend for HumanCare's vendor and corporate partners: registration and KYC, case requests, patients,
documents, invoices, payments, notifications and support.

React 18 · TypeScript · Vite · Tailwind CSS · React Router · React Hook Form + Zod · Recharts · Axios · Lucide icons.

## Run it

Requires Node.js 18 or newer.

```bash
cd vendor-portal
npm install
npm run dev
```

The app opens at **http://localhost:5173**. No backend, API key or paid service is needed: it runs on a
built-in mock API that stores data in the browser's `localStorage`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check (`tsc`) and production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript check only |

## Trying it out

- **Demo account (mock mode only):** on the login page click **Use demo account**, then **Login**.
  It signs in as *MediCorp Global Assistance Pvt. Ltd.* with a year of sample cases, invoices and documents.
- **Full new-vendor workflow:** click **Register Now** on the login page.
- **Reset the mock data:** clear the site's storage in the browser (DevTools → Application → Clear storage).

### Registration workflow

```
Register → Company Details → Bank Details → Document Upload → Submit
→ Vendor ID generated (HCW-VND-2026-00126…) → Email Verification
→ Verification (within 48 hours) → Username + Password → Account Activated → Login → Dashboard
```

Mock mode has no real email. The Email Verification page shows a **Demo mode → Open link** button, which
stands in for clicking the emailed link. It also stands in for HumanCare's 48-hour document and bank
approval.

Drafts (**Save Draft**) keep company details and non-sensitive bank fields. Account numbers, IBAN and
uploaded files are deliberately never saved in a draft.

## Project structure

```
src/
├── App.tsx                 providers + router
├── routes/                 route table (lazy-loaded pages) and auth guards
├── layouts/                AuthLayout (split login), DashboardLayout (sidebar/header/bottom nav), RegistrationLayout (stepper)
├── pages/
│   ├── auth/               Login, Forgot Password, Reset Password
│   ├── register/           Company → Bank → Documents → Submitted → Verify Email → Credentials → Account Created
│   ├── dashboard/          stat cards + Recharts charts with date filter
│   ├── cases/ patients/ services/ documents/ billing/ account/
├── components/
│   ├── ui/                 Button, Input, Select, Checkbox/Switch, Modal, Table, Badge, Card, FileUpload, Stepper,
│   │                       StatusTimeline, PasswordStrength, Loading, Toast, EmptyState, FilterBar, Misc (Tabs, Dropdown…)
│   ├── layout/             Sidebar, Header (search, notifications, profile menu), MobileNav
│   ├── forms/              CompanyDetailsForm, BankDetailsForm, BankInfo (shared by registration and profile)
│   └── dashboard/          chart components
├── services/               API layer — every page talks only to these
├── hooks/                  useAuth, useAsync, useNotifications, utilities
├── types/                  shared domain types (mirror the API JSON)
├── utils/                  Zod schemas, validators, masking, formatting, CSV/HTML downloads
├── data/                   constants and seeded mock data
└── assets/                 logo
```

## Connecting the Node.js / Express backend

1. Copy `.env.example` to `.env` and set:
   ```
   VITE_USE_MOCK_API=false
   VITE_API_BASE_URL=https://your-api.example.com/api
   ```
2. Every method in `src/services/*Service.ts` already has the matching REST call next to its mock
   implementation (for example `POST /auth/vendor/login`, `GET /vendor/cases`, `POST /vendors/register`).
   Implement those endpoints on the Express server.
3. `src/services/http.ts` is the Axios client. It sends `Authorization: Bearer <JWT>` on every request and
   signs the user out on a `401`.
4. Login expects `{ token, user, expiresIn }`. The session is kept in `localStorage` when **Remember me**
   is ticked (30 days), otherwise in `sessionStorage` (8 hours).

## Security notes

- Bank account numbers and IBANs are shown only as `XXXX XXXX 4582` after saving. The mock store keeps
  only the last four digits. The confirm-account field blocks paste.
- Passwords are never displayed or logged. The mock API stores only SHA-256 hashes; the real backend should
  hash with bcrypt.
- Medical details are kept off list pages, and on the patient profile they stay blurred until the user
  explicitly reveals them.
- No credentials are hard-coded for real use. The demo account exists only while `VITE_USE_MOCK_API` is
  not `false`.
- Login is throttled after 5 failed attempts in mock mode; the real API should rate-limit on the server.
