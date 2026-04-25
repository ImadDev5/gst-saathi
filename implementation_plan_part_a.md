# GSTSaathi — Consolidated Phase-Wise Implementation Plan

> **Version**: 2.0 | **Date**: April 2026 | **Status**: Ready for Sprint Planning
> **Audience**: Engineering Lead / Project Manager

---

## 1. Plan Overview

GSTSaathi is a two-module GST SaaS: **Module A** (bank-statement ITC pre-processor for freelancers/agencies) and **Module B** (daily retail ledger for cloth/grocery/garment shops). The go-to-market is contact-based sales — no user authentication in MVP. Supabase (PostgreSQL) is the database from day one; auth features activate in a later phase. The plan spans **5 phases over 40 weeks**, with MVP revenue at Week 10.

### Critical Path (Sequential Gate Dependencies)

```
Phase 0 (Wk 1-2) ──► Phase 1 (Wk 3-10) ──► Phase 2 (Wk 11-20) ──► Phase 3 (Wk 21-26) ──► Phase 4 (Wk 27-40)
   │                      │
   │ DB schemas            │ 1A (BE) and 1B (FE) run in PARALLEL
   │ CI/CD                 │ 1D (BE) and 1E (FE) run in PARALLEL
   │ Landing page          │ 1C starts after 1A partial complete (Wk 5)
   └── must complete       │ 1F starts after 1C (Wk 8)
       before Phase 1      └── 1G (QA) is sequential gate to MVP launch
```

### Parallel vs Sequential Activities

| Activities | Relationship |
|-----------|-------------|
| Phase 1A (Backend Module A) ↔ Phase 1B (Frontend Module A) | **Parallel** — share API contract |
| Phase 1D (Backend Module B) ↔ Phase 1E (Frontend Module B) | **Parallel** — share API contract |
| Phase 1C (Report Engine) → Phase 1F (Payments) | **Sequential** — reports needed before paid tier |
| Phase 2A (PDF OCR) ↔ Phase 2B (AI Classification) | **Parallel** — independent services |
| Phase 2C (Growth Features) → Phase 2D (React Native) | **Partially parallel** — mobile reuses APIs from 2C |
| Phase 3 (Supabase Auth) | **Sequential** — requires all Phase 1/2 APIs stable |

### Assumptions

1. Team: 1 BE, 1 FE, 1 PM/founder; DS joins part-time in Phase 2
2. Contact-based sales — no self-serve signup in Phases 0–2
3. Supabase `ap-south-1` (Mumbai) for data residency compliance
4. All monetary values: INTEGER (paise) — display divides by 100
5. Bank statement files deleted from storage 48h post-processing
6. Claude API primary AI; GPT-4o hot standby
7. MVP is web-only; React Native is Phase 2
8. Trial access via UUID token in URL (no password)

### Constraints

1. Zero infrastructure budget in Phase 0 (Supabase free tier, Vercel hobby)
2. DPDP Act 2023 compliance required before storing PII at scale
3. No direct GSTR-2B API access (NIC restricted) — manual user verification
4. Razorpay onboarding requires GST registration + bank account verification (~5 days)
5. Claude API rate limits: 50 RPM on Tier 1 (sufficient for MVP)

### Unresolved Decisions (Block Sprint Planning)

| # | Decision | Owner | Deadline | Impact If Delayed |
|---|----------|-------|----------|------------------|
| 1 | Contact→trial flow: automated token on payment or manual outreach? | PM | Before Phase 0 start | Blocks 1F payments flow |
| 2 | PDF OCR: Tesseract (free) vs AWS Textract (paid, accurate)? | PM + BE | Before Phase 2A | Blocks OCR accuracy targets |
| 3 | Composition scheme support in MVP or Phase 2? | PM | Before Phase 1D | Adds 1 week to 1D if included |
| 4 | CA partner model: subdomain vs path-based multi-tenant? | PM + BE | Before Phase 3 | Blocks CA portal architecture |
| 5 | Barcode scanner: BarcodeDetector API vs third-party lib? | FE | Before Phase 2C | Low impact |

---

## 2. PHASE 0 — Foundation

**Duration**: Weeks 1–2 (10 business days)
**Objective**: Infrastructure, database, CI/CD, and landing page operational
**Gate**: All schemas migrated; CI/CD deploying to staging; landing page live

### 2.1 Tasks (Priority Order)

| # | Task | Owner | Effort | Duration | Dependencies |
|---|------|-------|--------|----------|-------------|
| 0.1 | Create Supabase project (ap-south-1), enable `pgcrypto` + `pg_trgm` extensions | BE | 2h | Day 1 | Supabase account |
| 0.2 | Write & run 13 numbered SQL migrations (contacts → audit_logs) | BE | 8h | Day 1–2 | 0.1 |
| 0.3 | Write RLS policies (DISABLED) on all user-facing tables | BE | 4h | Day 2 | 0.2 |
| 0.4 | Create Supabase Storage buckets (`statements`, `reports`) with 48h lifecycle | BE | 1h | Day 2 | 0.1 |
| 0.5 | Seed `vendors` table with 300+ keyword rules | BE | 6h | Day 2–3 | 0.2 |
| 0.6 | Init FastAPI project, config, Supabase client, health endpoint | BE | 4h | Day 3 | 0.1 |
| 0.7 | Init Next.js 14 project (App Router, TypeScript, Tailwind, shadcn/ui) | FE | 4h | Day 1 | None |
| 0.8 | Set up GitHub Actions CI/CD: pytest + Playwright → Railway (BE) + Vercel (FE) | BE | 6h | Day 3–4 | 0.6, 0.7 |
| 0.9 | Configure env vars (staging + prod) per p3 §8.3 spec | BE | 2h | Day 4 | 0.8 |
| 0.10 | Build landing page + contact form (Next.js) | FE | 12h | Day 2–5 | 0.7 |
| 0.11 | Build `POST /api/v1/contacts` endpoint with validation + rate limiting | BE | 4h | Day 4 | 0.6 |
| 0.12 | Set up Razorpay account (business verification) | PM | — | Day 1 (5-day SLA) | GST registration |
| 0.13 | Set up Sentry (error tracking) + PostHog (analytics) | BE | 2h | Day 5 | 0.8 |
| 0.14 | Set up Resend account + contact confirmation email template | BE | 2h | Day 5 | 0.11 |
| 0.15 | Configure Upstash Redis (rate limiting, session cache) | BE | 2h | Day 4 | None |

### 2.2 Resources & Skills Required

- BE: Python 3.12, FastAPI, PostgreSQL, Supabase client SDK, SQL
- FE: Next.js 14, TypeScript, Tailwind, React Hook Form, Zod
- PM: Razorpay business onboarding, domain registration

### 2.3 External Dependencies

| Dependency | Lead Time | Mitigation |
|-----------|-----------|-----------|
| Supabase project provisioning | ~5 min | None needed |
| Razorpay onboarding | 3–5 business days | Start on Day 1; use test mode until approved |
| Domain DNS propagation | 24–48h | Use Vercel preview URLs until DNS resolves |
| Resend domain verification | 24h | Use sandbox mode initially |

### 2.4 Acceptance Criteria

- [ ] All 13 tables created in Supabase with correct indexes
- [ ] `POST /contacts` returns 201 and row visible in Supabase dashboard
- [ ] Landing page renders on Vercel preview URL
- [ ] Contact form validates GSTIN format, email, phone client-side
- [ ] CI pipeline runs pytest and deploys on push to `main`
- [ ] Rate limiter blocks 6th contact submission from same IP within 1 hour

### 2.5 KPIs & Success Metrics

| Metric | Target |
|--------|--------|
| Schema migration success | 13/13 tables created |
| CI/CD pipeline green | First deploy to staging |
| Landing page Lighthouse score | ≥90 performance |
| Contact form submission (test) | End-to-end in <2s |

### 2.6 Testing & QA

- Run all migrations on fresh Supabase project — verify idempotency
- Unit test: GSTIN validator with 10 valid + 10 invalid inputs
- Integration test: `POST /contacts` → verify row in DB → verify duplicate rejection
- Manual: submit contact form on mobile viewport — verify responsive layout

### 2.7 Risk Register

| Risk | Likelihood | Impact | Mitigation | Rollback |
|------|-----------|--------|-----------|----------|
| Supabase ap-south-1 not available | Low | High | Fall back to us-east-1; migrate later | Recreate project |
| Razorpay onboarding delayed | Medium | Medium | Use test mode; block payment features until approved | Defer 0.12 to Phase 1F |
| Schema design error discovered later | Medium | High | All migrations are numbered + idempotent; add new migration file | Reverse migration SQL |

### 2.8 Communication & Stakeholders

- **Daily standup**: 15 min async (Slack thread)
- **Phase 0 kickoff**: PM briefs team on contact flow decision
- **Phase 0 exit review**: PM verifies landing page copy + form fields before go-live

### 2.9 Handoff to Phase 1

Deliverables handed off:
1. Supabase project URL + service_role key (in vault)
2. Deployed FastAPI with `/contacts` endpoint
3. Live landing page with functional contact form
4. CI/CD pipeline green on `main`
5. Vendor seed data in DB (300+ rows)

---

## 3. PHASE 1 — MVP (Module A + Module B + Payments)

**Duration**: Weeks 3–10 (8 weeks)
**Objective**: Revenue-ready product with both modules, trial token access, Razorpay payments
**Gate**: 5 beta users complete full flow; ≥80% test coverage on services layer

### Sub-phases run in PARALLEL where possible:

```
Wk 3 ──────────────────────────────── Wk 10
│                                        │
├─ 1A: Module A Backend (Wk 3–6) ─────┐ │
├─ 1B: Module A Frontend (Wk 3–6) ────┘ │
│         ▼ (API contract shared)        │
├─ 1C: Report Engine (Wk 5–7) ────────┐ │
├─ 1D: Module B Backend (Wk 5–9) ─────┤ │
├─ 1E: Module B Frontend (Wk 6–10) ───┘ │
├─ 1F: Payments (Wk 8–9) ────────────── │
└─ 1G: QA + Launch (Wk 10) ─────────────┘
```

---

### 3.1 Phase 1A — Module A Backend (Weeks 3–6)

**Owner**: BE | **Effort**: 4 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1A.1 | CSV parsers for HDFC, ICICI, SBI, Kotak, Axis (bank-specific column mapping) | 5d | P0 |
| 1A.2 | Narration normalizer (UPI/NEFT string extraction, uppercase, special char removal) | 2d | P0 |
| 1A.3 | Date normalizer (DD-MM-YYYY, DD/MM/YYYY, YYYYMMDD → DATE) | 1d | P0 |
| 1A.4 | Amount normalizer (strip commas/symbols, convert to paise INTEGER) | 0.5d | P0 |
| 1A.5 | Vendor matcher (trie lookup against `vendors.keywords[]`) | 3d | P0 |
| 1A.6 | ITC eligibility engine (Section 16 decision tree, 7 branches) | 3d | P0 |
| 1A.7 | Section 17(5) blocked credit rules (9 categories) | 2d | P0 |
| 1A.8 | RCM detector (OIDAR, GTA, legal, sponsorship, unregistered landlord) | 2d | P0 |
| 1A.9 | Deduplication (SHA256 hash on session_id + date + amount + narration) | 0.5d | P0 |
| 1A.10 | Celery task: `process_statement` (orchestrates parsing → classification → INSERT) | 2d | P0 |
| 1A.11 | API endpoints: `POST /statements/upload`, `GET /statements/:id/status`, `GET /transactions`, `PATCH /transactions/:id`, `GET /dashboard/summary` | 3d | P0 |
| 1A.12 | Trial token middleware (`X-Trial-Token` validation, session extraction) | 1d | P0 |
| 1A.13 | `POST /api/v1/itc/check` — free tier single expense checker | 1d | P1 |

**Acceptance Criteria:**
- [ ] Upload HDFC CSV fixture → 100% of rows parsed → ≥90% vendor detection rate
- [ ] Swiggy transaction → BLOCKED (Section 17(5))
- [ ] Google Ads transaction → RCM flagged, ₹amount calculated correctly
- [ ] Duplicate CSV upload → 0 new transactions
- [ ] Expired trial token → 401 response

---

### 3.2 Phase 1B — Module A Frontend (Weeks 3–6)

**Owner**: FE | **Effort**: 4 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1B.1 | Trial token flow: `/trial/[token]` → cookie → redirect to dashboard | 1d | P0 |
| 1B.2 | Module A dashboard layout (summary cards, action feed, deadline countdown) | 3d | P0 |
| 1B.3 | Statement upload page (drag-drop, bank selector, progress states) | 3d | P0 |
| 1B.4 | Transactions table (color-coded ITC badges, sort, filter, pagination) | 4d | P0 |
| 1B.5 | Manual override side panel (change ITC status, add reason) | 2d | P0 |
| 1B.6 | ITC checker page (`/itc-check`) — free public tool | 2d | P1 |
| 1B.7 | Responsive design pass (mobile viewports) | 2d | P1 |
| 1B.8 | PostHog event tracking integration (all events from p1 §17) | 1d | P2 |

**Acceptance Criteria:**
- [ ] Dashboard renders summary cards with correct paise → ₹ conversion
- [ ] Upload flow shows all 4 progress states with animated transitions
- [ ] Transaction table loads 100 rows with <500ms render time
- [ ] Override writes audit log visible in Supabase
- [ ] Mobile: all screens usable at 375px width

---

### 3.3 Phase 1C — Report Engine (Weeks 5–7)

**Owner**: BE + FE | **Effort**: 3 weeks

| # | Task | Est. | Owner |
|---|------|------|-------|
| 1C.1 | ITC summary report data aggregation (totals by status, RCM breakdown) | 2d | BE |
| 1C.2 | PDF report generator (WeasyPrint, 8-section CA-ready format) | 3d | BE |
| 1C.3 | Excel report generator (openpyxl, transaction detail + summary sheets) | 2d | BE |
| 1C.4 | `POST /reports/export` + Celery task `generate_report` | 1d | BE |
| 1C.5 | `GET /reports/:id/download` — Supabase Storage signed URL | 0.5d | BE |
| 1C.6 | Report list page + download UX (async generation → poll → download) | 2d | FE |
| 1C.7 | Report viewer page (embedded PDF preview) | 1.5d | FE |
| 1C.8 | Disclaimer footer on all reports | 0.5d | BE |

**Acceptance Criteria:**
- [ ] PDF report matches 8-section CA-ready structure from PRD §6F
- [ ] Excel has separate sheets for eligible, blocked, RCM transactions
- [ ] Signed download URL expires after 15 minutes
- [ ] Report generation completes within 30s for 500 transactions

---

### 3.4 Phase 1D — Module B Backend (Weeks 5–9)

**Owner**: BE | **Effort**: 5 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1D.1 | Retail entry CRUD API (`POST/PUT/DELETE /entries`) | 3d | P0 |
| 1D.2 | GST auto-calculation service (CGST/SGST/IGST split based on state_code) | 2d | P0 |
| 1D.3 | ₹1,000 threshold detection for price-sensitive products (garments) | 1d | P0 |
| 1D.4 | Product master CRUD + full-text search + preloaded libraries (3 types) | 3d | P0 |
| 1D.5 | Period lock API (`POST /periods/:period/lock`) + enforcement on entry edits | 2d | P0 |
| 1D.6 | GSTR-1 mapper (B2B table, B2C consolidated, HSN summary) | 3d | P0 |
| 1D.7 | GSTR-3B mapper (sections 3.1a–6.1 computed from entries) | 3d | P0 |
| 1D.8 | GSTR-4/CMP-08 mapper (Composition scheme) | 2d | P1 |
| 1D.9 | Audit log JSONB on retail_entries (field-level diff tracking) | 1d | P0 |
| 1D.10 | `GET /dashboard/retail-summary` (today + MTD aggregations) | 1d | P0 |
| 1D.11 | Bulk CSV import for opening stock (`POST /entries/bulk-import`) | 2d | P2 |

**Acceptance Criteria:**
- [ ] Intra-state sale ₹10,000 at 18% → CGST=₹900, SGST=₹900, IGST=₹0
- [ ] Kurta at ₹999 → 5% GST; same at ₹1,001 → 12% GST with warning flag
- [ ] Period lock blocks PUT/DELETE on locked-period entries (409 response)
- [ ] GSTR-3B section 3.1(a) = sum of all taxable sales values
- [ ] Product search returns results within 200ms for 1,000 products

---

### 3.5 Phase 1E — Module B Frontend (Weeks 6–10)

**Owner**: FE | **Effort**: 5 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1E.1 | Retail dashboard (today's sales/purchases/GST cards, FAB button) | 3d | P0 |
| 1E.2 | Sale entry form (product typeahead, GST auto-calc, threshold warning) | 4d | P0 |
| 1E.3 | Purchase entry form (vendor master, ITC eligibility auto-flag) | 3d | P0 |
| 1E.4 | Ledger view (tabs, filters, color-coded, swipe-to-edit/delete) | 4d | P0 |
| 1E.5 | Product master management page | 2d | P0 |
| 1E.6 | Month-end report tabs (Summary / GSTR-1 / GSTR-3B / Actions) | 4d | P0 |
| 1E.7 | Copy-to-clipboard buttons on GSTR-3B values | 1d | P0 |
| 1E.8 | Offline-first with Dexie.js (IndexedDB) + sync indicator | 3d | P1 |
| 1E.9 | Mobile-first responsive pass | 2d | P1 |

**Acceptance Criteria:**
- [ ] Entry form saves in <500ms; dashboard card updates immediately
- [ ] Threshold warning shown for ₹900–₹1,100 range on price-sensitive products
- [ ] Offline: entry saves to IndexedDB; syncs on reconnect; sync status visible
- [ ] Month-end report GSTR-3B tab: all values match backend computation
- [ ] Copy button copies correct paise→₹ formatted value to clipboard

---

### 3.6 Phase 1F — Payments (Weeks 8–9)

**Owner**: BE | **Effort**: 2 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1F.1 | Razorpay order creation API (`POST /payments/create-order`) | 1d | P0 |
| 1F.2 | Razorpay webhook handler (HMAC verification, idempotent processing) | 2d | P0 |
| 1F.3 | Payment → trial session creation/extension logic | 1d | P0 |
| 1F.4 | Subscription state machine (CREATED → PAID → ACTIVE → EXPIRED → RENEWED) | 2d | P0 |
| 1F.5 | Payment success page + trial activation email (Resend) | 1d | FE |
| 1F.6 | Pricing page with plan comparison (Module A + Module B tiers) | 1.5d | FE |

**Acceptance Criteria:**
- [ ] Razorpay test payment → webhook fires → trial_session created → token email sent
- [ ] Duplicate webhook (same payment_id) → no double processing
- [ ] Expired trial token → user sees "trial expired" with upgrade CTA

---

### 3.7 Phase 1G — QA + Launch (Week 10)

**Owner**: PM + BE + FE | **Effort**: 1 week

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1G.1 | Write + run Playwright E2E tests (9 critical flows from p4 §9.3) | 3d | P0 |
| 1G.2 | Recruit 5 beta users from personal network | PM | P0 |
| 1G.3 | Beta user UAT — each completes full Module A or B flow | 2d | P0 |
| 1G.4 | Bug fixes from UAT feedback | 2d | P0 |
| 1G.5 | DNS cutover to production domain | 0.5d | P0 |
| 1G.6 | Production environment smoke test | 0.5d | P0 |

**Acceptance Criteria:**
- [ ] All 9 E2E tests pass on staging
- [ ] ≥4 of 5 beta users complete the flow without support
- [ ] No P0 bugs open
- [ ] Production domain resolves and contact form works

### Phase 1 Risk Register

| Risk | Likelihood | Impact | Mitigation | Rollback |
|------|-----------|--------|-----------|----------|
| CSV parser fails on unknown bank format | High | Medium | Accept only 5 supported banks; show "Other" with manual column mapping | Reject unsupported CSVs with clear error |
| Vendor matcher accuracy <90% | Medium | High | Flag all unmatched as UNKNOWN; never auto-ELIGIBLE | Manual override + AI classification in Phase 2 |
| Razorpay webhook delivery unreliable | Low | High | Retry logic + manual trial extension admin endpoint | PM manually extends trials |
| Celery worker crashes mid-processing | Medium | Medium | Statement status stays PARSING; user retries; Celery auto-restart | Requeue failed tasks on worker restart |
| Offline sync conflicts (Module B) | Medium | High | Last-write-wins for current period; server-wins for locked periods; user notified | User re-enters rejected entries |

### Phase 1 Communication

- **Weekly demo**: Friday — PM reviews working features
- **Beta user channel**: WhatsApp group for quick feedback
- **Launch announcement**: LinkedIn post + email to all contacts in DB

### Phase 1 → Phase 2 Handoff

1. Production-deployed MVP with both modules
2. 5+ beta users onboarded
3. Razorpay live payments working
4. Test coverage report ≥80%
5. Known issues log for Phase 2 prioritization
