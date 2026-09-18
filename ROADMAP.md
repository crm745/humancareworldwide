# HumanCare WorldWide App — Build Roadmap

Stack: **React Native (Expo)** (mobile) + **Node.js/Express** (API) + **MySQL** (database), integrating with **Bitrix24 CRM**. Hosting: **Hostinger**, deployed after local development is solid. Team: **solo developer** — this plan is sequenced for one person, not the original proposal's 7–8 person team.

This adapts the original proposal's 7-phase plan to this stack. Source of truth for feature scope: `Humancare-app-proposal.pdf` (Ch.3–5) and the design canvas (15 screens, published as an Artifact).

---

## 0. Stack decisions to lock in before coding

| Concern | Recommendation | Why |
|---|---|---|
| Backend framework | Express + TypeScript | Type safety matters once Bitrix24 payloads, webhooks, and role-based access start crossing modules. Plain JS works too if you'd rather skip the build step. |
| ORM | Prisma | Best MySQL migration/typing story right now; Sequelize/TypeORM are fine alternatives if the team already knows them. |
| Auth | JWT (access + refresh) + OTP for both enquirer and vendor login | Matches proposal Ch.3.4 ("JWT sessions, role-based access"). |
| Cache / queue | Redis | OTP codes, rate limiting, and a retry queue for Bitrix24 webhook calls (proposal Ch.3.3 "Resilience: outbound queue with retry & backoff"). |
| File storage | S3-compatible bucket (AWS S3, Cloudflare R2, or Backblaze B2) | Never store attachments as MySQL blobs — proposal Ch.7 specifies signed-URL private buckets. |
| Push notifications | Firebase Cloud Messaging (Android + iOS via APNs bridge) | Matches proposal Ch.3.4 and Ch.6. |
| Realtime (stage updates) | Socket.IO on top of Express, or polling if you want to defer realtime to v1.1 | Proposal calls for "lightweight WebSocket layer" but this can be deferred without blocking MVP. |
| Hosting | Hostinger **VPS/Cloud plan** (not shared hosting) | You need a persistent Node process, Redis, and PM2/Nginx — shared hosting can't run those. VPS gives root access via hPanel. Build and test everything locally first (see §4a below); deploy once a vertical slice works end-to-end. |

---

## 1. Repo structure

```
humancare-app/
├── mobile/              # React Native app (Expo)
├── backend/             # Express + TypeScript API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # OTP issuance/verification, JWT
│   │   │   ├── requests/     # enquirer service requests -> Bitrix24 leads
│   │   │   ├── vendors/      # vendor accounts, roles, company users
│   │   │   ├── cases/        # case list, stage timeline, documents
│   │   │   ├── notifications/
│   │   │   └── bitrix24/     # REST client, webhook receiver, retry queue
│   │   ├── db/                # Prisma schema + migrations
│   │   └── server.ts
│   └── package.json
├── ROADMAP.md
└── README.md
```

Using **Expo** (managed workflow) — fastest path for a solo dev: OTA updates, camera/push/file-upload modules work out of the box, and Expo's dev client handles the rare native module you'll need. You can eject to bare RN later if something truly requires it, but you likely won't need to for this app.

---

## 2. Data model (MySQL, via Prisma)

Core tables, derived directly from proposal Ch.3.3 and the design canvas:

- **users** — enquirers/patients: id, name, email, mobile, country_code, created_at
- **otp_codes** — phone/email, code_hash, purpose (login/reset), expires_at, consumed_at
- **service_requests** — the "lead": id, user_id, service_type, origin, destination, preferred_date, care_level, medical_summary, report_file_id (nullable), reference_number, bitrix24_lead_id, status, created_at
- **vendors** — company accounts: id, company_name, type (insurance/government/tpa/corporate), created_at
- **vendor_users** — id, vendor_id, email, password_hash, role (admin/viewer), created_at
- **cases** — id, service_request_id, vendor_id (nullable — only set once ops links a request to a vendor/policy), coordinator_name, current_stage (enum 0–7: Received…Closed), policy_reference, created_at
- **case_stage_events** — id, case_id, stage, note, occurred_at — append-only log driving the timeline UI
- **documents** — id, case_id, kind (quote/invoice/medical/consent), file_url, uploaded_at
- **notifications** — id, recipient_type (user/vendor_user), recipient_id, kind (stage/doc/complete/system), title, read_at, created_at

This maps 1:1 onto every screen already built in the design canvas (service form → `service_requests`, case detail → `cases` + `case_stage_events` + `documents`, notifications screen → `notifications`).

---

## 3. API contract (v1, REST)

```
POST   /auth/otp/request          { mobile, purpose }
POST   /auth/otp/verify           { mobile, code }              -> { token, user }
POST   /auth/vendor/login         { email, password }           -> triggers OTP
POST   /auth/vendor/otp/verify    { email, code }                -> { token, vendorUser }

POST   /requests                  { serviceType, origin, destination, ... } -> creates lead in Bitrix24, returns { referenceNumber }
GET    /requests/:ref             (guest tracking, phone OTP gated)
GET    /users/me/requests         (authed enquirer's own history — Profile screen)

GET    /vendor/cases              ?stage=&search=
GET    /vendor/cases/:id
GET    /vendor/cases/:id/documents
GET    /vendor/company/users      (admin only)
POST   /vendor/company/users      (admin only, invite)

GET    /notifications             ?recipientType=&unreadOnly=
POST   /notifications/:id/read
POST   /notifications/read-all

POST   /webhooks/bitrix24         (stage-change events -> updates case_stage_events, fans out notifications)
```

---

## 4. Bitrix24 integration approach

1. Get a Bitrix24 **inbound webhook URL** (or full OAuth app if you need broader scopes) with `crm.lead.*` and `crm.deal.*` access — do this in a **test portal** first, never against production data during dev.
2. On `POST /requests`: dedupe by phone/email (`crm.duplicate.findbycomm`), then `crm.lead.add` with custom fields mapped for service type, route, care level.
3. Register a Bitrix24 **outbound webhook** (or automation rule) that fires on lead/deal stage changes, hitting `POST /webhooks/bitrix24` on your backend.
4. Webhook handler writes a `case_stage_events` row, updates `cases.current_stage`, and inserts `notifications` rows for the relevant vendor_users — this is what lights up the Notifications screen and dashboard badge in the design.
5. Wrap all outbound Bitrix24 calls in a retry queue (Redis + a simple job runner, or BullMQ) — Bitrix24 rate-limits aggressively.

---

## 4a. Local-first, then Hostinger — how that actually works

Building locally first is the right call — it's faster to iterate and you're not paying for a VPS while you're still shaping the schema. Here's the practical shape of it:

**Local environment:**
- Node.js LTS + MySQL locally — easiest via **Docker Compose** (one `docker-compose.yml` with `mysql` + `redis` services) so your local setup matches production exactly and you're not hand-installing MySQL/Redis on Windows. If you'd rather not use Docker, MySQL has a native Windows installer, but Redis does not — you'd need WSL2 for Redis specifically.
- Expo Go app on your phone (or an emulator) connects to your local backend via your machine's LAN IP — no tunneling needed for normal API testing.

**The one thing local dev can't do: Bitrix24 webhooks.** Bitrix24's servers need a **public URL** to call your `/webhooks/bitrix24` endpoint — `localhost` isn't reachable from the internet. Two options:
1. Use a tunnel tool (**ngrok**, Cloudflare Tunnel, or `localtunnel`) to expose your local backend temporarily while testing the stage-webhook flow specifically.
2. Or defer webhook testing until your first Hostinger deploy, and build/test everything else (auth, lead creation, UI) fully locally first. This is probably the more efficient path solo — don't block on webhook testing until the rest of the vertical slice works.

**Moving to Hostinger, when you're ready:**
1. Get a **Hostinger VPS or Cloud plan** (not shared hosting — you need root/SSH access and a persistent process).
2. In hPanel: set up **Node.js via their Node.js App Manager** (it runs your app under PM2 for you), or do it manually — SSH in, install Node, clone your repo, `pm2 start`, and put **Nginx** in front as a reverse proxy with a free Let's Encrypt SSL cert (hPanel has a one-click SSL option).
3. Create a **MySQL database** through hPanel — runs on the same VPS, so `DATABASE_URL` just points to `localhost` from the app's perspective.
4. Install **Redis** yourself via SSH (`apt install redis-server`) — shared hosting couldn't do this, VPS can.
5. Point a subdomain (e.g. `api.humancareworldwide.com`) at the VPS, update DNS in hPanel.
6. Deploy flow: push to GitHub → `git pull` on the VPS → `pm2 restart` (or wire up Hostinger's Git auto-deploy if your plan supports it).
7. **Now** register the real Bitrix24 outbound webhook against this public URL and test the full loop.

**Mobile app release:** Expo builds (`eas build`) don't depend on where your backend lives — you just point the app's API base URL at your Hostinger domain once it's live, same as you'd point it at localhost during dev (via an `.env`/`app.config.ts` value you swap per environment).

---

## 5. Phase plan (adapted from proposal Ch.10, resequenced for one person)

The proposal's 16–18 week estimate assumed a 7–8 person team working in parallel. Solo, the same *scope* takes meaningfully longer — but you also skip a lot of coordination overhead. Rough sequencing (not hard deadlines):

| Step | What | Maps to design canvas |
|---|---|---|
| 1. Local setup | Docker Compose (MySQL+Redis), Prisma schema + migrations, Expo app init, Bitrix24 test portal | — |
| 2. Auth (local) | OTP request/verify (enquirer), vendor email+password+OTP, JWT issuing | Splash, Welcome, Onboarding, Choose Login, Patient Sign In, Patient OTP, Vendor Sign In, Vendor OTP |
| 3. Enquirer flow (local) | Service selection, 3-step request form, `crm.lead.add` integration | Home, Service Request Form, Submission Success |
| 4. First Hostinger deploy | Get auth + enquirer flow live on a real public URL; register the real Bitrix24 webhook | — |
| 5. Vendor flow | Case list + stage filters, case detail + timeline + documents, webhook-driven stage sync (now testable for real) | Vendor Dashboard, Case Stage Timeline |
| 6. Cross-cutting | Notifications (webhook-driven), Profile/account management | Notifications, Patient Profile |
| 7. Hardening | Retry/backoff queue, rate limiting, basic tests on the auth + lead-creation paths | — |
| 8. Store prep | App icons, privacy policy, Play/App Store listings, EAS build + submit | — |

The key idea for solo work: **step 4 (first deploy) happens early, right after the first real feature**, not at the end. That way you're never debugging "does this even work on Hostinger" and "does the CRM webhook fire" at the same time as everything else — you find hosting problems while the app is still small.

## 6. Immediate next steps

1. I scaffold `backend/` (Express + TypeScript + Prisma + the schema above) and `mobile/` (Expo app shell with navigation matching the 15 screens).
2. Set up `docker-compose.yml` for local MySQL + Redis so the environment is reproducible.
3. Wire up **Auth** end-to-end first (OTP flow) since every other module depends on it.
4. Then **Enquirer flow** (the money path: lead → Bitrix24) — deploy this much to Hostinger before building the vendor side, so the CRM webhook loop gets tested for real early.
5. Then **Vendor flow**, **Notifications**, **Profile**.

---

*This roadmap is a living document — update it as decisions change.*
