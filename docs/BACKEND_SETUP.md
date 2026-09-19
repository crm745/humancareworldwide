# HumanCare WorldWide — Backend Setup & Reference

Last updated: 2026-09-17
Status: Auth module (patient OTP login + vendor email/password + OTP) built and tested end-to-end against a real local database.

---

## 1. Languages & Tools Used

| Layer | Choice | Notes |
|---|---|---|
| Language | **JavaScript** (Node.js, CommonJS — `require`/`module.exports`) | Originally scaffolded in TypeScript, converted to plain JS per project decision — no build/compile step, simpler for a solo dev. |
| Runtime | **Node.js v24** | Confirmed installed and working. |
| Web framework | **Express 5** | Handles HTTP routing, JSON parsing, middleware. |
| Database | **MySQL** (native Windows install, not Docker) | Local dev database: `humancare_dev`. |
| ORM | **Prisma 6.19.3** (`prisma-client-js` generator) | Defines the data model in `schema.prisma`, generates a JS client, and manages migrations. Pinned to 6.x deliberately — v7/v8 changed their config style in ways not worth the complexity yet. |
| Auth tokens | **JWT** (`jsonwebtoken`) | Access token (15 min) + refresh token (30 days). |
| Password/OTP hashing | **bcryptjs** | Never store raw passwords or OTP codes — only their bcrypt hash. |
| Cross-origin support | **cors** | Allows the future mobile/web frontend to call this API. |
| Env config | **dotenv** | Loads `.env` (database URL, JWT secrets, port) — this file is gitignored and never committed. |
| Dev auto-restart | Node's built-in **`--watch-path`** flag | No extra dependency needed; restarts the server on file changes, scoped to `src/` only (scoping it avoids false restarts from `node_modules` churn). |

**Deliberately not used yet** (planned for later, per `ROADMAP.md`):
- **Redis** — would be used for OTP rate-limiting/caching and a Bitrix24 retry queue. Skipped for now; the OTP resend cooldown was instead implemented with a simple database timestamp check, which works fine at this scale.
- **TypeScript** — dropped in favor of plain JS for simplicity.
- **Docker** — not installed on this machine; MySQL runs natively instead.

---

## 2. Folder Structure (current, actual)

```
humancare-app/
├── ROADMAP.md              # Original full build plan (all phases, all modules)
├── BACKEND_SETUP.md         # This file
├── backend/                 # <-- the Express API (what's built so far)
│   ├── .env                 # Local secrets — DATABASE_URL, JWT secrets, PORT (gitignored)
│   ├── .gitignore
│   ├── package.json         # Scripts + dependencies (see §3)
│   ├── package-lock.json
│   ├── prisma/
│   │   ├── schema.prisma            # Data model — the single source of truth for DB tables
│   │   ├── migrations/
│   │   │   ├── migration_lock.toml
│   │   │   └── 20260916103636_init_auth/
│   │   │       └── migration.sql    # SQL that created the first 5 tables
│   └── src/
│       ├── server.js                # App entry point — starts Express, mounts routes
│       ├── db/
│       │   └── prisma.js            # Shared Prisma client instance (imported everywhere else)
│       ├── modules/
│       │   └── auth/                 # Everything related to logging in
│       │       ├── auth.routes.js    # Defines the URLs (e.g. POST /auth/otp/request)
│       │       ├── auth.controller.js# Handles each request: reads input, calls service, sends response
│       │       └── auth.service.js   # The actual logic: generate/check OTPs, sign tokens
│       └── seed-vendor.js            # One-off script to create a test vendor account
├── interactive-prototype/    # The clickable HTML/CSS/JS app prototype (Artifact)
├── design-canvas/             # Earlier non-interactive design mockups
└── docs/                      # Reference material (proposal PDF, etc.)
```

**Why grouped this way (`modules/auth/`, later `modules/requests/`, `modules/vendors/`, etc.):**
Each feature area gets its own folder with three files that separate concerns:
- **routes** = "which URL triggers this?"
- **controller** = "what does this HTTP request need, and what do we send back?"
- **service** = "what's the actual business logic?" (reusable, doesn't know about HTTP at all)

This keeps things predictable as more features (service requests, vendor case management, notifications, Bitrix24 sync) get added — each becomes its own `modules/<name>/` folder following the same pattern.

---

## 3. `package.json` scripts & dependencies

**Scripts:**
| Command | What it does |
|---|---|
| `npm run dev` | Starts the server and auto-restarts on any change inside `src/` |
| `npm start` | Starts the server once, no auto-restart (for production) |

**Dependencies (all plain `dependencies`, no separate dev-only tooling now):**
- `express` — web server framework
- `@prisma/client` + `prisma` — database ORM
- `bcryptjs` — password/OTP hashing
- `jsonwebtoken` — login tokens
- `cors` — allow frontend apps to call this API
- `dotenv` — load `.env` config

---

## 4. Local environment setup (`.env`)

```
DATABASE_URL="mysql://humancare_app:••••••••@localhost:3306/humancare_dev"
JWT_ACCESS_SECRET="<dev placeholder>"
JWT_REFRESH_SECRET="<dev placeholder>"
PORT=4000
```

- Database: `humancare_dev`, created locally in MySQL.
- Database user: `humancare_app` — a dedicated non-root MySQL account created specifically for this app (never uses the MySQL root login day-to-day). Has full access to `humancare_dev`, plus `CREATE`/`DROP` rights needed by Prisma when it computes schema changes.
- Real secrets differ between local/dev and eventual production — production will need its own strong, unique JWT secrets.

---

## 5. Database tables (current)

Defined in `backend/prisma/schema.prisma`, applied via one migration (`20260916103636_init_auth`):

| Table | Purpose |
|---|---|
| `users` | Patients — created automatically the first time someone verifies their mobile OTP. |
| `otp_codes` | One-time codes for both patient and vendor login, hashed, with expiry and a "used" timestamp. |
| `vendors` | Partner companies (insurance, TPA, government, corporate). |
| `vendor_users` | Individual login accounts belonging to a vendor company (email + password, role). |
| `service_requests` | A patient's request for a service (air ambulance, etc.) — includes a unique reference number and a status/stage. *(table exists in the schema; the API endpoints to create/list these are the next module being built.)* |

---

## 6. What's built and working right now

**Auth module** (`src/modules/auth/`) — fully working, tested against the real database:
- `POST /auth/otp/request` — patient requests a login code by mobile number. Includes a 30-second resend cooldown to prevent spamming/cost abuse.
- `POST /auth/otp/verify` — patient submits the code; creates their account automatically on first successful login; returns access + refresh tokens.
- `POST /auth/vendor/login` — vendor submits email + password; if correct, sends them an OTP (same cooldown protection).
- `POST /auth/vendor/otp/verify` — vendor submits the code; returns access + refresh tokens.

**How vendor accounts get created today:** there's no public vendor sign-up — vendors are B2B partners onboarded by HumanCare's own ops team. Right now that's done by running `src/seed-vendor.js` directly against the database. Later this becomes a proper "Add Vendor" screen inside an internal admin tool (not built yet).

---

## 7. What's next

- **Service request module** (`modules/requests/`) — lets a logged-in patient actually submit a request (matching the "Request a Service" screens in the prototype), save it with a tracking reference number, and view/track it. Bitrix24 CRM sync will initially be stubbed (logged, not actually sent) until Bitrix24 API credentials are available.
- Vendor-facing case list/status-update endpoints.
- Mobile app (Expo/React Native) — not started.

Full original plan and phase sequencing: see `ROADMAP.md` in the project root.
