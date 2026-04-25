# GSTSaathi — Improved Engineering Plan (Part 1 of 4)
## Sections 1–4: Executive Summary, Gaps, Feature List, Data Model

---

## 1. Executive Summary

GSTSaathi is a contact-based (no user auth required in MVP) GST pre-processing and ITC optimization SaaS targeting 14M+ GST-registered Indian SMBs, freelancers, and retail shop owners. The product comprises two modules: Module A (bank statement ITC pre-processor for freelancers/agencies) and Module B (daily digital ledger + month-end GST report for retail shops). The go-to-market is a contact/sales-led funnel — prospects submit a contact form, receive a demo or trial link, and convert via Razorpay; no self-signup login is required in Phase 1. Supabase is selected as the primary database and will be provisioned from day one with all schemas, Row-Level Security policies, and environment wiring in place — but auth features (Supabase Auth, RLS enforcement) will be toggled on only in the final "Supabase Auth Phase." Every data model field, API endpoint, and storage decision made now is designed to be auth-ready without requiring a schema rewrite. The MVP targets ₹5L MRR within 6 months at sub-0.003% market penetration.

---

## 2. Missing Requirements, Assumptions & Open Questions

### 2.1 Missing Requirements

| # | Area | Gap |
|---|------|-----|
| 1 | Contact flow | No CRM or lead capture form spec — field list, confirmation email content, and handoff to sales pipeline undefined |
| 2 | Trial provisioning | How does a prospect get trial access post-contact? Manual provisioning? Auto-generated token link? |
| 3 | File storage lifecycle | No policy on how long uploaded bank statements are retained post-processing (compliance vs cost) |
| 4 | AI provider fallback | Single-provider AI (Claude/GPT) is a reliability risk; no fallback or retry policy defined |
| 5 | RCM self-pay flow | UI shows RCM liability but no guidance on how/where user pays it outside the app |
| 6 | GSTR-2B API access | Portal API is restricted; plan assumes manual user verification — needs explicit confirmation |
| 7 | Multi-GSTIN | Phase 2 mention only; no schema design for multiple GSTINs per user |
| 8 | CA Partner portal | Listed in monetization but no UX, data isolation, or white-label spec |
| 9 | Mobile offline sync | Conflict resolution strategy is vague ("server-wins") — needs a concrete vector-clock or last-write-wins policy |
| 10 | DPDP Act compliance | Data localization, consent management, and grievance officer requirements not addressed |
| 11 | Payments reconciliation | Razorpay webhook handling and subscription state machine not defined |
| 12 | Email invoice scraper | Gmail OAuth scope and data handling policy for Phase 2 not defined |

### 2.2 Assumptions

- Contact form submissions are the sole lead entry point in MVP; no self-serve signup
- Supabase (PostgreSQL) is the single source of truth; Redis used only for ephemeral caching
- All monetary values stored in INR paise (INTEGER) internally to avoid float rounding
- Bank statement files are deleted from object storage within 48h of successful processing
- AI classification uses Claude API as primary; GPT-4o as hot standby
- All Indian states use intra-state CGST+SGST split; inter-state IGST applied based on user GSTIN state code
- MVP is web-only (React); React Native mobile is Phase 2
- A single Supabase project is used; separate schemas (`public`, `auth`, `audit`) for isolation

### 2.3 Open Questions (must resolve before sprint planning)

1. **Contact → trial flow**: Manual outreach or automated trial token? SLA?
2. **GSTIN lookup**: Use NIC's GST search API or maintain a local vendor GSTIN cache?
3. **PDF OCR provider**: Tesseract (free, slower) vs AWS Textract (paid, accurate) — budget decision needed
4. **Hosting region**: Supabase `ap-south-1` (Mumbai) for data residency compliance?
5. **Composition scheme**: Will the app support Composition dealers from MVP or Phase 2?
6. **CA partner white-label**: Sub-domain per CA or a path-based multi-tenant model?
7. **Audit retention**: 7 years of data in Supabase — archive strategy (cold storage) after year 2?
8. **Barcode scanner**: Web browser BarcodeDetector API or a third-party library?
9. **Voice entry**: Whisper API or Sarvam AI (better for Indian languages)?
10. **Pricing in USD**: SaaS tools like Figma invoice in USD — how is GST rate confirmed without B2B invoice?

---

## 3. Feature List, Milestones & Phasing

### Phase 0 — Foundation (Weeks 1–2, pre-MVP)
- Supabase project setup, schema migrations, RLS scaffolding (disabled), env vars
- Contact form (static HTML or Next.js page) → writes lead to `contacts` table in Supabase
- Razorpay account setup, webhook endpoint scaffold
- CI/CD pipeline (GitHub Actions → Vercel/Railway)
- Logging, error tracking (Sentry)

### Phase 1 — MVP (Weeks 3–10)
**No auth required for these features:**

| Feature | Module | Auth Needed? |
|---------|--------|--------------|
| Contact/lead capture form | CRM | No |
| Single expense ITC checker (5/day by IP) | A | No |
| GST rate lookup by vendor name | A | No |
| Vendor keyword database (300+ rules) | A | No |
| Bank statement CSV upload + parsing | A | Trial token only |
| ITC classification engine (rule-based) | A | Trial token only |
| Section 17(5) blocked credit detection | A | Trial token only |
| RCM detection and calculation | A | Trial token only |
| CA-ready ITC report (PDF + Excel) | A | Trial token only |
| Dashboard summary card | A | Trial token only |
| Daily sale/purchase entry (Module B) | B | Trial token only |
| GST auto-calculation on entry | B | Trial token only |
| Month-end GSTR-1/3B report | B | Trial token only |
| Razorpay payment (one-time + subscription) | Both | No |
| Transactional email (Resend) | Both | No |

**Trial token = UUID in URL params, stored in Supabase `trial_sessions` table, no password**

### Phase 2 — Growth (Weeks 11–20)
| Feature | Auth Needed? |
|---------|--------------|
| PDF bank statement parsing (OCR) | Trial token |
| AI classification (Claude API) | Trial token |
| Gmail invoice scraper | Supabase Auth (OAuth) |
| Vendor follow-up email generation | Trial token |
| GSTR-2B reconciliation alerts | Trial token |
| React Native mobile app | Supabase Auth |
| Barcode scanner for product entry | Trial token |
| CA viewer access (read-only share link) | Share token (no auth) |
| Multi-month ITC comparison | Trial token |

### Phase 3 — Supabase Auth Phase (Weeks 21–28)
**This phase enables full Supabase Auth; all prior features remain functional, auth layer activated:**

| Task | Description |
|------|-------------|
| Enable Supabase Auth | Email OTP + Google OAuth |
| Migrate trial sessions → user accounts | One-click "claim your account" flow |
| Enable RLS policies on all tables | All existing policies go live |
| Encrypt PII fields | GSTIN, PAN, bank narrations at rest |
| CA Partner portal | Multi-client dashboard, white-label reports |
| Multi-GSTIN support | Per-GSTIN ledger isolation |
| GSTR portal API integration (if available) | Direct submission prefill |
| Role-based access (owner/CA/employee) | Supabase RLS roles |

### Phase 4 — Scale (Month 7–12)
- ML vendor detection model (fine-tuned on Indian data)
- Real-time GSTR-2B API (if NIC opens access)
- Voice entry (Sarvam AI / Whisper)
- CA collaboration portal
- Direct GST portal submission
# GSTSaathi — Improved Engineering Plan (Part 2 of 4)
## Section 4: Detailed Data Model for Supabase

---

## 4. Supabase Data Model

### Design Principles
- All monetary values stored as `INTEGER` (paise) — display layer divides by 100
- UUIDs for all PKs (Supabase default `gen_random_uuid()`)
- `deleted_at TIMESTAMPTZ` for soft deletes on all user-generated records
- Fields marked **[ENCRYPT]** must be encrypted at rest with AES-256 when auth is enabled (Phase 3)
- Fields marked **[RLS]** will be gated by Row-Level Security in Phase 3
- `created_at` and `updated_at` auto-managed via triggers

---

### 4.1 `contacts` — Lead Capture (Phase 0, no auth)

```sql
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,                          -- [ENCRYPT] in Phase 3
  phone           TEXT,                                   -- [ENCRYPT] in Phase 3
  business_name   TEXT,
  gstin           VARCHAR(15),                            -- [ENCRYPT] in Phase 3
  city            TEXT,
  business_type   TEXT,  -- FREELANCER | SMB | RETAIL | CA_FIRM
  monthly_spend   INTEGER,  -- estimated monthly B2B spend in paise
  message         TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  status          TEXT DEFAULT 'NEW',  -- NEW | CONTACTED | TRIAL | CONVERTED | LOST
  notes           TEXT,  -- internal sales notes
  trial_session_id UUID REFERENCES trial_sessions(id),
  converted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_email ON contacts(email);
```

---

### 4.2 `trial_sessions` — Passwordless trial access (Phase 1)

```sql
CREATE TABLE trial_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID REFERENCES contacts(id),
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  plan            TEXT DEFAULT 'TRIAL',  -- TRIAL | ONE_TIME | PRO | BUNDLE
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  is_active       BOOLEAN DEFAULT true,
  last_seen_at    TIMESTAMPTZ,
  -- Phase 3: will link to auth.users(id)
  user_id         UUID,  -- NULL until Supabase Auth enabled
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_trial_token ON trial_sessions(token);
CREATE INDEX idx_trial_contact ON trial_sessions(contact_id);
```

---

### 4.3 `business_profiles` — User/shop profile [RLS]

```sql
CREATE TABLE business_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES trial_sessions(id),  -- Phase 1
  user_id         UUID,                                 -- Phase 3: auth.users FK
  business_name   TEXT NOT NULL,
  gstin           VARCHAR(15),                         -- [ENCRYPT]
  pan             VARCHAR(10),                         -- [ENCRYPT]
  state_code      VARCHAR(2) NOT NULL,
  taxpayer_type   TEXT NOT NULL,  -- REGULAR | QRMP | COMPOSITION
  business_type   TEXT NOT NULL,  -- FREELANCER | ECOMMERCE | AGENCY | RETAIL_CLOTH | RETAIL_GROCERY | RETAIL_GARMENTS | WHOLESALE
  filing_frequency TEXT DEFAULT 'MONTHLY',  -- MONTHLY | QUARTERLY
  email           TEXT,                                -- [ENCRYPT]
  phone           TEXT,                                -- [ENCRYPT]
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
-- RLS policy (Phase 3): SELECT WHERE user_id = auth.uid()
CREATE INDEX idx_biz_session ON business_profiles(session_id);
CREATE INDEX idx_biz_user ON business_profiles(user_id);
```

---

### 4.4 `vendors` — Global vendor knowledge base (shared, no RLS)

```sql
CREATE TABLE vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name  TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  category        TEXT NOT NULL,   -- Cloud Infrastructure | Telecom | Food Delivery | etc.
  gstin           VARCHAR(15),
  country         VARCHAR(3) DEFAULT 'IND',
  is_foreign      BOOLEAN DEFAULT false,
  default_gst_rate NUMERIC(4,2) NOT NULL,
  itc_status      TEXT NOT NULL,  -- ELIGIBLE | BLOCKED | RCM | CONDITIONAL
  block_reason    TEXT,           -- Section 17(5) reason if blocked
  rcm_applicable  BOOLEAN DEFAULT false,
  hsn_sac_code    VARCHAR(10),
  keywords        TEXT[],         -- search keywords: ['AWS','AMAZON WEB','AWSIN']
  is_oidar        BOOLEAN DEFAULT false,  -- OIDAR foreign digital services
  confidence      NUMERIC(3,2) DEFAULT 1.0,  -- 0.0–1.0 match confidence
  last_verified_at DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vendor_keywords ON vendors USING GIN(keywords);
CREATE INDEX idx_vendor_category ON vendors(category);
```

---

### 4.5 `statements` — Uploaded bank statements [RLS]

```sql
CREATE TABLE statements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES trial_sessions(id),
  user_id         UUID,                           -- Phase 3
  profile_id      UUID REFERENCES business_profiles(id),
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,  -- CSV | PDF_TEXT | PDF_SCANNED
  bank_name       TEXT,           -- HDFC | ICICI | SBI | KOTAK | AXIS | YES
  period_start    DATE,
  period_end      DATE,
  status          TEXT DEFAULT 'UPLOADED',  -- UPLOADED | PARSING | CLASSIFIED | FAILED | READY
  row_count       INTEGER,
  parsed_count    INTEGER,
  storage_path    TEXT,           -- Supabase Storage path (deleted after 48h)
  storage_deleted_at TIMESTAMPTZ,
  error_message   TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stmt_session ON statements(session_id);
CREATE INDEX idx_stmt_status ON statements(status);
```

---

### 4.6 `transactions` — Module A: classified bank transactions [RLS]

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id    UUID REFERENCES statements(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES trial_sessions(id),
  user_id         UUID,                               -- Phase 3
  txn_date        DATE NOT NULL,
  narration_raw   TEXT NOT NULL,                      -- [ENCRYPT]
  narration_clean TEXT,
  amount_paise    INTEGER NOT NULL,                   -- debit amount in paise
  txn_type        TEXT DEFAULT 'DEBIT',               -- DEBIT | CREDIT
  vendor_id       UUID REFERENCES vendors(id),
  vendor_name_matched TEXT,
  category        TEXT,
  hsn_sac_code    VARCHAR(10),
  gst_rate        NUMERIC(4,2),
  gst_amount_paise INTEGER,
  itc_status      TEXT,  -- ELIGIBLE | BLOCKED | AT_RISK | RCM | NEEDS_INVOICE | TIME_BARRED | PERSONAL | UNKNOWN
  itc_confidence  NUMERIC(3,2),  -- AI confidence score
  block_reason    TEXT,
  invoice_type    TEXT,  -- B2B | B2C | UNKNOWN
  gstr2b_status   TEXT DEFAULT 'UNKNOWN',  -- CONFIRMED | NOT_FOUND | PENDING | UNKNOWN
  rcm_applicable  BOOLEAN DEFAULT false,
  rcm_amount_paise INTEGER,
  is_personal     BOOLEAN DEFAULT false,
  action_required TEXT,
  is_manually_overridden BOOLEAN DEFAULT false,
  override_reason TEXT,
  dedup_hash      TEXT UNIQUE,  -- SHA256(session_id+date+amount+narration_raw)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_txn_session ON transactions(session_id);
CREATE INDEX idx_txn_statement ON transactions(statement_id);
CREATE INDEX idx_txn_date ON transactions(txn_date);
CREATE INDEX idx_txn_itc_status ON transactions(itc_status);
CREATE UNIQUE INDEX idx_txn_dedup ON transactions(dedup_hash);
```

---

### 4.7 `retail_entries` — Module B: daily sales/purchase ledger [RLS]

```sql
CREATE TABLE retail_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES trial_sessions(id),
  user_id         UUID,                             -- Phase 3
  profile_id      UUID REFERENCES business_profiles(id),
  entry_type      TEXT NOT NULL,   -- SALE | PURCHASE | SALE_RETURN | PURCHASE_RETURN
  entry_date      DATE NOT NULL,
  payment_mode    TEXT NOT NULL,   -- CASH | ONLINE | CREDIT
  customer_type   TEXT DEFAULT 'B2C',  -- B2C | B2B
  party_name      TEXT,
  party_gstin     VARCHAR(15),     -- [ENCRYPT] in Phase 3
  invoice_number  TEXT,
  invoice_date    DATE,
  product_id      UUID REFERENCES products(id),
  product_name    TEXT NOT NULL,
  hsn_code        VARCHAR(8),
  quantity        NUMERIC(10,3),
  unit            TEXT,            -- pcs | kg | metre | dozen | box | litre
  rate_paise      INTEGER NOT NULL,        -- per unit excl GST in paise
  taxable_paise   INTEGER NOT NULL,        -- quantity * rate
  gst_rate        NUMERIC(4,2) NOT NULL,
  cgst_paise      INTEGER DEFAULT 0,
  sgst_paise      INTEGER DEFAULT 0,
  igst_paise      INTEGER DEFAULT 0,
  total_paise     INTEGER NOT NULL,
  itc_eligible    BOOLEAN DEFAULT false,   -- purchases only
  period_locked   BOOLEAN DEFAULT false,   -- true after GSTR-3B filed
  remarks         TEXT,
  audit_log       JSONB DEFAULT '[]',      -- [{field, old, new, by, at}]
  deleted_at      TIMESTAMPTZ,             -- soft delete
  synced_at       TIMESTAMPTZ,             -- offline sync timestamp
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_re_session ON retail_entries(session_id);
CREATE INDEX idx_re_date ON retail_entries(entry_date);
CREATE INDEX idx_re_type ON retail_entries(entry_type);
CREATE INDEX idx_re_period_locked ON retail_entries(period_locked);
CREATE INDEX idx_re_deleted ON retail_entries(deleted_at) WHERE deleted_at IS NULL;
```

---

### 4.8 `products` — Module B product master [RLS]

```sql
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID REFERENCES trial_sessions(id),
  user_id           UUID,                          -- Phase 3
  product_name      TEXT NOT NULL,
  hsn_sac_code      VARCHAR(8),
  default_gst_rate  NUMERIC(4,2) NOT NULL,
  unit              TEXT DEFAULT 'pcs',
  default_sale_rate_paise   INTEGER,
  default_purchase_rate_paise INTEGER,
  is_price_sensitive BOOLEAN DEFAULT false,
  threshold_paise   INTEGER,                       -- 100000 (₹1,000) for garments
  category          TEXT,
  is_preloaded      BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_prod_session ON products(session_id);
CREATE INDEX idx_prod_name ON products USING GIN(to_tsvector('english', product_name));
```

---

### 4.9 `reports` — Generated ITC/GST reports [RLS]

```sql
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES trial_sessions(id),
  user_id         UUID,
  profile_id      UUID REFERENCES business_profiles(id),
  report_type     TEXT NOT NULL,  -- ITC_SUMMARY | GSTR1 | GSTR3B | GSTR4 | CA_READY
  module          TEXT NOT NULL,  -- A | B
  period_start    DATE,
  period_end      DATE,
  summary_json    JSONB,          -- pre-computed summary metrics
  storage_path    TEXT,           -- Supabase Storage: PDF/Excel
  generated_at    TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_report_session ON reports(session_id);
CREATE INDEX idx_report_type ON reports(report_type);
```

---

### 4.10 `payments` — Razorpay payment records [RLS]

```sql
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          UUID REFERENCES contacts(id),
  session_id          UUID REFERENCES trial_sessions(id),
  user_id             UUID,
  razorpay_order_id   TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_sub_id     TEXT,
  plan                TEXT NOT NULL,   -- ONE_TIME | PRO_MONTHLY | BUNDLE_ANNUAL | RETAIL_BASIC | RETAIL_PRO
  amount_paise        INTEGER NOT NULL,
  currency            TEXT DEFAULT 'INR',
  status              TEXT DEFAULT 'CREATED',  -- CREATED | PAID | FAILED | REFUNDED
  webhook_payload     JSONB,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pay_session ON payments(session_id);
CREATE INDEX idx_pay_status ON payments(status);
```

---

### 4.11 `audit_logs` — Immutable audit trail (no soft delete)

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID,
  user_id     UUID,
  entity_type TEXT NOT NULL,  -- transaction | retail_entry | report | statement
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,  -- OVERRIDE | DELETE | EXPORT | PERIOD_LOCK | PAYMENT
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_session ON audit_logs(session_id);
```

---

### 4.12 `filing_periods` — GSTR filing period state [RLS]

```sql
CREATE TABLE filing_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES trial_sessions(id),
  user_id         UUID,
  profile_id      UUID REFERENCES business_profiles(id),
  period_month    INTEGER NOT NULL,  -- 1–12
  period_year     INTEGER NOT NULL,
  status          TEXT DEFAULT 'OPEN',  -- OPEN | GENERATED | FILED | AMENDED
  filed_at        TIMESTAMPTZ,
  report_id       UUID REFERENCES reports(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, period_month, period_year)
);
```

---

### 4.13 Key Relationships Diagram

```
contacts
  └── trial_sessions (1:1)
        ├── business_profiles (1:1)
        ├── statements (1:N)
        │     └── transactions (1:N)
        ├── retail_entries (1:N)
        ├── products (1:N)
        ├── reports (1:N)
        ├── payments (1:N)
        └── filing_periods (1:N)

vendors (global, shared, no session FK)
audit_logs (append-only, references any entity)
```

### 4.14 Fields requiring encryption in Phase 3 (Supabase Auth)

| Table | Field | Reason |
|-------|-------|--------|
| contacts | email, phone, gstin | PII + financial identifier |
| business_profiles | gstin, pan, email, phone | Financial PII |
| transactions | narration_raw | Bank-grade confidential data |
| retail_entries | party_gstin | Business PII |
| payments | razorpay_payment_id | Financial record |

Use `pgcrypto` extension: `pgp_sym_encrypt(value, key)` / `pgp_sym_decrypt(value, key)` at application layer before INSERT.
# GSTSaathi — Improved Engineering Plan (Part 3 of 4)
## Sections 5–8: API Design, Backend Architecture, Frontend Plan, Deployment

---

## 5. API Design & Endpoints

### Base URL: `/api/v1`
### Auth Header (Phase 1): `X-Trial-Token: <token>` (UUID, validated against `trial_sessions`)
### Auth Header (Phase 3): `Authorization: Bearer <supabase_jwt>`

All responses follow:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": { "request_id": "uuid", "ts": "ISO8601" }
}
```

Error shape:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "INVALID_GSTIN", "message": "GSTIN format invalid", "field": "gstin" }
}
```

---

### 5.1 Contact & Lead Endpoints (unauthenticated)

#### `POST /api/v1/contacts`
Submit lead capture form. No token required.

**Request:**
```json
{
  "full_name": "Riya Sharma",
  "email": "riya@designhive.in",
  "phone": "9876543210",
  "business_name": "DesignHive Studio",
  "gstin": "29AAXFS1234A1Z5",
  "city": "Bengaluru",
  "business_type": "FREELANCER",
  "monthly_spend": 7000000,
  "message": "Want to try the ITC tracker",
  "utm_source": "linkedin"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": { "contact_id": "uuid", "message": "We'll reach out within 24 hours." }
}
```

**Validation rules:**
- `full_name`: required, 2–100 chars
- `email`: required, valid RFC 5322
- `phone`: optional, Indian mobile regex `^[6-9]\d{9}$`
- `gstin`: optional, regex `^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$`
- Rate limit: 5 submissions per IP per hour

**Error codes:** `VALIDATION_ERROR`, `DUPLICATE_EMAIL`, `RATE_LIMIT_EXCEEDED`

---

#### `POST /api/v1/itc/check` — Single expense check (unauthenticated, rate-limited)
**Request:**
```json
{ "expense_text": "Paid Adobe CC subscription ₹5664", "session_id": null }
```
**Response `200`:**
```json
{
  "data": {
    "vendor": "Adobe India",
    "category": "Creative SaaS",
    "hsn_sac": "998314",
    "gst_rate": 18,
    "gst_amount_paise": 86400,
    "itc_status": "ELIGIBLE",
    "itc_status_label": "Eligible — get a B2B invoice with your GSTIN",
    "block_reason": null,
    "rcm_applicable": false,
    "action": "Request B2B invoice from Adobe with your GSTIN",
    "confidence": 0.97
  }
}
```
Rate limit: 5/day per IP. Token holders get unlimited.

---

### 5.2 Session & Profile Endpoints (trial token required)

#### `GET /api/v1/session` — Validate token, get session info
Headers: `X-Trial-Token: <token>`
**Response `200`:** session details, plan, expiry, profile if exists

#### `POST /api/v1/profile` — Create/update business profile
**Request:** `{ "business_name", "gstin", "state_code", "taxpayer_type", "business_type" }`
**Response `201`:** profile object

---

### 5.3 Module A — Statement & Transaction Endpoints (trial token)

#### `POST /api/v1/statements/upload`
Multipart form: `file` (CSV or PDF), `bank_name`, `period_start`, `period_end`

**Response `202`:**
```json
{ "data": { "statement_id": "uuid", "status": "PARSING", "estimated_seconds": 30 } }
```

**Validation:**
- File size: max 10MB
- Allowed MIME: `text/csv`, `application/pdf`
- `bank_name`: enum `[HDFC, ICICI, SBI, KOTAK, AXIS, YES, OTHER]`

**Error codes:** `FILE_TOO_LARGE`, `UNSUPPORTED_FORMAT`, `QUOTA_EXCEEDED`

#### `GET /api/v1/statements/:id/status`
**Response:** `{ status, parsed_count, classified_count, failed_rows, estimated_seconds_remaining }`

#### `GET /api/v1/transactions`
Query params: `statement_id`, `period` (YYYY-MM), `itc_status`, `page`, `per_page` (max 100)
**Response:** paginated list + summary counts by itc_status

#### `PATCH /api/v1/transactions/:id` — Manual override
**Request:** `{ "itc_status": "BLOCKED", "override_reason": "Personal use" }`
Writes to `audit_logs`.

#### `GET /api/v1/reports/itc`
Query: `period=2024-03`, `statement_id`
**Response:** pre-computed summary JSON (totals by status, RCM breakdown)

#### `POST /api/v1/reports/export`
**Request:** `{ "statement_id", "period", "format": "PDF" | "EXCEL", "report_type": "ITC_SUMMARY" | "CA_READY" }`
**Response `202`:** `{ "report_id", "status": "GENERATING" }`

#### `GET /api/v1/reports/:id/download`
**Response:** signed URL to Supabase Storage (expires 15 min)

#### `GET /api/v1/dashboard/summary`
**Response:** `{ total_eligible_paise, total_blocked_paise, total_at_risk_paise, total_rcm_paise, pending_actions_count, upcoming_deadline }`

---

### 5.4 Module B — Retail Entry Endpoints (trial token)

#### `POST /api/v1/entries`
**Request:**
```json
{
  "entry_type": "SALE",
  "entry_date": "2024-03-15",
  "payment_mode": "CASH",
  "customer_type": "B2C",
  "product_id": "uuid",
  "product_name": "Cotton Kurta White",
  "hsn_code": "6211",
  "quantity": 3,
  "unit": "pcs",
  "rate_paise": 80000,
  "gst_rate": 5
}
```
Server computes: `taxable_paise`, `cgst_paise`, `sgst_paise`, `igst_paise`, `total_paise`

**Validation:**
- `entry_date`: not in a locked period, max 30 days back
- `gst_rate`: enum `[0, 5, 12, 18, 28]`
- `party_gstin`: if provided, validate format
- `period_locked` check: reject if period is locked

**Response `201`:** full entry object with computed GST fields

#### `PUT /api/v1/entries/:id`
Full replacement. Rejected if `period_locked = true`. Writes diff to `audit_log` JSONB.

#### `DELETE /api/v1/entries/:id`
Soft delete (`deleted_at = now()`). Rejected if `period_locked = true`.

#### `GET /api/v1/entries`
Query: `type`, `period`, `payment_mode`, `page`, `per_page`
Excludes soft-deleted records.

#### `GET /api/v1/dashboard/retail-summary`
**Response:** `{ today_sales_paise, today_gst_paise, today_purchases_paise, today_itc_paise, mtd_sales_paise, mtd_itc_paise, mtd_gst_payable_paise, pending_actions, next_deadline }`

#### `GET /api/v1/reports/gstr1?period=2024-03`
**Response:** `{ b2b_supplies: [], b2c_consolidated: {}, hsn_summary: [], amendments: [] }`

#### `GET /api/v1/reports/gstr3b?period=2024-03`
**Response:** `{ "3_1_a": { label, value_paise }, "3_1_c": {...}, "4_a_5": {...}, ... }`

#### `POST /api/v1/periods/:period/lock`
Marks `filing_periods.status = FILED`, sets `period_locked = true` on all entries for that period.

---

### 5.5 Product Master Endpoints (trial token)

#### `GET /api/v1/products/search?q=kurta&limit=10`
Full-text search on `product_name`. Returns matched products with GST rates.

#### `POST /api/v1/products` — Create product
#### `PUT /api/v1/products/:id` — Update product
#### `GET /api/v1/products/preloaded?type=RETAIL_CLOTH` — Fetch starter library

---

### 5.6 Payment Endpoints

#### `POST /api/v1/payments/create-order`
**Request:** `{ "plan": "PRO_MONTHLY", "contact_id" }`
Creates Razorpay order. **Response:** `{ order_id, amount_paise, currency, key_id }`

#### `POST /api/v1/payments/webhook` (Razorpay webhook, HMAC verified)
Validates `razorpay-signature` header. Updates `payments.status`, creates/extends `trial_sessions`.

---

### 5.7 Endpoints by Auth State

| Endpoint | Phase 1 (no auth) | Phase 1 (token) | Phase 3 (Supabase JWT) |
|----------|-------------------|-----------------|------------------------|
| `POST /contacts` | ✅ | ✅ | ✅ |
| `POST /itc/check` | ✅ (5/day) | ✅ unlimited | ✅ |
| `POST /statements/upload` | ❌ | ✅ | ✅ |
| `GET /transactions` | ❌ | ✅ | ✅ |
| `POST /entries` | ❌ | ✅ | ✅ |
| `GET /reports/gstr1` | ❌ | ✅ | ✅ |
| `POST /periods/:period/lock` | ❌ | ✅ | ✅ |
| CA viewer endpoints | ❌ | ✅ (share token) | ✅ (role) |
| Admin/analytics endpoints | ❌ | ❌ | ✅ (admin role) |

---

## 6. Backend Architecture

### 6.1 Recommended Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Framework | **FastAPI** (Python 3.12) | Async, type-safe, auto OpenAPI docs; best fit for Python ML/parsing pipeline |
| Parsing Service | Python: `pdfplumber`, `pandas`, `Tesseract` (Phase 2) | Same runtime as API — no RPC overhead |
| AI Classification | **Claude claude-sonnet-4-5** (primary), **GPT-4o** (fallback) | Structured JSON output, reliable Indian GST knowledge |
| Database | **Supabase** (PostgreSQL 15) | Managed Postgres + Storage + Auth (Phase 3) |
| Cache | **Redis** (Upstash serverless) | Rate limiting, session token cache, vendor lookup cache |
| Object Storage | **Supabase Storage** | Native integration; auto-signed URLs |
| Background Jobs | **Celery** + **Redis** as broker | Async statement processing; report generation |
| Email | **Resend** | Reliable transactional email, Indian deliverability |
| Payments | **Razorpay** | Only viable full-stack Indian payment gateway |
| Monitoring | **Sentry** (errors) + **PostHog** (product analytics) | |
| Hosting | **Railway** (API + Celery worker) | Simple, auto-deploys, supports Python; ~$20/month |
| Frontend Hosting | **Vercel** | Next.js native |

### 6.2 File & Folder Structure

```
gstsaathi-backend/
├── app/
│   ├── main.py                  # FastAPI app init, CORS, middleware
│   ├── config.py                # Pydantic Settings (env vars)
│   ├── database.py              # Supabase client init
│   ├── dependencies.py          # Token validation, session extraction
│   │
│   ├── api/v1/
│   │   ├── contacts.py
│   │   ├── itc_check.py
│   │   ├── statements.py
│   │   ├── transactions.py
│   │   ├── reports.py
│   │   ├── entries.py           # Module B
│   │   ├── products.py
│   │   ├── payments.py
│   │   ├── dashboard.py
│   │   └── periods.py
│   │
│   ├── services/
│   │   ├── parsing/
│   │   │   ├── csv_parser.py    # Bank-specific CSV format handlers
│   │   │   ├── pdf_parser.py    # pdfplumber + Tesseract
│   │   │   └── normalizer.py    # Date/amount/narration normalization
│   │   ├── classification/
│   │   │   ├── vendor_matcher.py  # Keyword trie matching on vendors table
│   │   │   ├── itc_engine.py      # Section 16/17(5) decision tree
│   │   │   ├── rcm_detector.py    # RCM flagging
│   │   │   └── ai_classifier.py   # Claude/GPT-4o fallback
│   │   ├── gst/
│   │   │   ├── gstr1_mapper.py
│   │   │   ├── gstr3b_mapper.py
│   │   │   └── gstr4_mapper.py
│   │   ├── reports/
│   │   │   ├── pdf_generator.py   # WeasyPrint
│   │   │   └── excel_generator.py # openpyxl
│   │   ├── payments/
│   │   │   └── razorpay_service.py
│   │   └── email/
│   │       └── resend_service.py
│   │
│   ├── models/                  # Pydantic request/response models
│   ├── tasks/                   # Celery tasks
│   │   ├── process_statement.py
│   │   └── generate_report.py
│   └── utils/
│       ├── gstin_validator.py
│       ├── dedup.py
│       └── crypto.py            # pgcrypto wrapper (Phase 3)
│
├── migrations/                  # SQL migration files (numbered)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── requirements.txt
└── Dockerfile
```

### 6.3 Classification Pipeline (per statement)

```
Upload → S3/Supabase Storage
  → Celery task: process_statement
    → csv_parser / pdf_parser → raw rows[]
    → normalizer → cleaned rows[]
    → vendor_matcher (trie lookup against vendors.keywords)
      → if matched: apply vendor.itc_status, gst_rate
      → if unmatched: ai_classifier (Claude API) → parse JSON response
    → itc_engine (Section 16 / 17(5) decision tree)
    → rcm_detector
    → dedup_hash check
    → bulk INSERT into transactions
    → update statements.status = READY
    → delete file from Storage (48h policy)
    → send email via Resend: "Your ITC report is ready"
```

### 6.4 AI Classification Prompt (Claude)

```
System: You are a GST classification engine for Indian businesses (FY 2024-25).
Given a bank transaction narration, return ONLY valid JSON:
{
  "vendor_name": string,
  "category": string,
  "hsn_sac_code": string,
  "gst_rate": number (0|5|12|18|28),
  "itc_status": "ELIGIBLE"|"BLOCKED"|"RCM"|"CONDITIONAL"|"UNKNOWN",
  "block_reason": string|null,
  "rcm_applicable": boolean,
  "is_oidar": boolean,
  "confidence": number (0.0-1.0),
  "action_required": string
}
Rules:
- Apply Section 17(5) blocked credits strictly (food, personal vehicles, insurance, beauty)
- Flag OIDAR services (Google Ads, Meta Ads, foreign SaaS) as RCM
- If uncertain, set confidence < 0.7 and itc_status = "UNKNOWN"
- Never hallucinate GST rates — if unsure, return 18 for services, 12 for goods

User: Transaction narration: "UPI/GOOGL/2024031/ADV/GOOGLEADS"
```

### 6.5 Background Jobs

| Job | Trigger | Queue | Timeout | Retry |
|-----|---------|-------|---------|-------|
| `process_statement` | File upload | `statements` | 5 min | 3x with exponential backoff |
| `generate_report` | Report export request | `reports` | 2 min | 2x |
| `delete_statement_file` | 48h after processing | `cleanup` (cron) | 30s | 1x |
| `send_deadline_reminder` | Daily cron 9AM IST | `notifications` | 30s | 2x |
| `sync_vendor_rates` | Weekly Sunday 2AM IST | `maintenance` | 10 min | 1x |

---

## 7. Frontend Integration Plan

### 7.1 Stack

| Technology | Choice |
|-----------|--------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** + **shadcn/ui** |
| State | **Zustand** (global) + **React Query** (server state) |
| Forms | **React Hook Form** + **Zod** |
| Charts | **Recharts** |
| PDF viewer | **react-pdf** |
| Offline (Module B) | **IndexedDB** via **Dexie.js** |
| Token storage | `httpOnly` cookie (set by API, not JS) |

### 7.2 Pages & Screens

| Route | Screen | Auth Required |
|-------|--------|---------------|
| `/` | Landing page + contact form | None |
| `/itc-check` | Single expense ITC checker | None (rate-limited) |
| `/thank-you` | Post-contact confirmation | None |
| `/trial/[token]` | Trial dashboard entry | Token in URL |
| `/dashboard` | Module A dashboard | Token cookie |
| `/dashboard/upload` | Statement upload + status | Token cookie |
| `/dashboard/transactions` | Transaction list + overrides | Token cookie |
| `/dashboard/reports` | Report list + download | Token cookie |
| `/dashboard/reports/[id]` | Report viewer | Token cookie |
| `/retail` | Module B daily dashboard | Token cookie |
| `/retail/entry/new` | Add sale/purchase entry | Token cookie |
| `/retail/ledger` | Full ledger view | Token cookie |
| `/retail/reports/[period]` | Month-end GST report | Token cookie |
| `/retail/products` | Product master management | Token cookie |
| `/payment/[plan]` | Razorpay checkout | None |
| `/payment/success` | Post-payment + trial activation | None |

### 7.3 Contact Form — UX & Validation

**Fields:** Name, Email, Phone, Business Name, GSTIN (optional), City, Business Type (dropdown), Monthly B2B Spend (dropdown ranges), Message

**Client-side validation (Zod):**
```typescript
const contactSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/).optional(),
  business_type: z.enum(['FREELANCER','SMB','RETAIL','CA_FIRM']),
  monthly_spend: z.number().int().positive()
})
```

**UX notes:**
- Show real-time GSTIN format indicator (state name populates from first 2 digits)
- After submit: "Dhanyavaad! We'll WhatsApp you within 24 hours" (Hinglish)
- Store `utm_*` params from URL in hidden fields
- No CAPTCHA in MVP; use server-side rate limiting

### 7.4 Module A — Statement Upload UX

1. Drag-and-drop zone with bank logo detection from filename
2. Progress states: `Uploading → Parsing → Classifying → Ready` with animated progress bar
3. On ready: toast notification + redirect to transactions view
4. Transactions table: color-coded ITC status badges, sortable, filterable
5. Manual override: click any row → side panel → change ITC status → save → audit logged
6. Summary card pinned at top: five metric chips (Eligible | Blocked | At Risk | RCM | Needs Invoice)
7. "Generate CA Report" button → modal to choose PDF/Excel → async → download when ready

### 7.5 Module B — Daily Entry UX (Mobile-First)

1. Fixed FAB (`+`) bottom-right — always visible
2. Entry form: swipe-to-toggle between Sale/Purchase, Cash/Online/Credit, B2C/B2B
3. Product typeahead: debounced search, shows recent 5 items on focus
4. GST auto-calculation shown inline as user types quantity and rate
5. ₹1,000 threshold warning: yellow banner when item value is ₹900–₹1,100
6. Offline mode: if no network, save to IndexedDB → show sync indicator
7. Ledger view: swipe-left on row → Edit | Duplicate | Delete (with confirmation)
8. Month-end report: tabbed view — Summary / GSTR-1 / GSTR-3B / Actions
9. GSTR-3B tab: each row has a `[COPY]` button that copies the value to clipboard

### 7.6 Trial Token Flow

```
Payment success → Razorpay webhook → API creates trial_session
  → API emails: "Your GSTSaathi trial is ready" + link: gstsaathi.com/trial/[token]
  → User clicks link → Next.js middleware validates token via API
  → Sets httpOnly cookie: `gst_session=<token>; Path=/; SameSite=Lax`
  → Redirects to /dashboard or /retail based on business_type in profile
```

### 7.7 API Integration (React Query)

```typescript
// Example: fetch dashboard summary
const { data, isLoading } = useQuery({
  queryKey: ['dashboard-summary'],
  queryFn: () => api.get('/dashboard/summary'),
  staleTime: 60_000,
  retry: 2
})

// Example: upload statement
const mutation = useMutation({
  mutationFn: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/statements/upload', form)
  },
  onSuccess: (data) => {
    pollStatus(data.statement_id) // poll /statements/:id/status every 3s
  }
})
```

---

## 8. Deployment, Hosting & Supabase Setup Checklist

### 8.1 Supabase Project Setup (Phase 0 — do immediately)

- [ ] Create Supabase project in `ap-south-1` (Mumbai) for data residency
- [ ] Enable `pgcrypto` extension: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- [ ] Enable `pg_trgm` for fuzzy text search on vendors
- [ ] Run all migration files in order (001_contacts, 002_trial_sessions, ... 013_audit_logs)
- [ ] Create `storage` buckets: `statements` (private), `reports` (private)
- [ ] Set bucket lifecycle rule: `statements` objects expire after 48h
- [ ] Generate `service_role` key for backend use only (never expose to frontend)
- [ ] Generate `anon` key for Phase 3 frontend Supabase client

### 8.2 RLS Scaffolding (Phase 0 — write policies now, enable in Phase 3)

```sql
-- Write all policies now but leave DISABLED:
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;  -- uncomment in Phase 3
CREATE POLICY "session_owner" ON transactions
  FOR ALL USING (session_id = current_setting('app.current_session')::UUID);
-- Repeat for retail_entries, reports, products, filing_periods
```

### 8.3 Environment Variables

```bash
# Backend (.env)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # Never commit; backend only
DATABASE_URL=postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres
REDIS_URL=redis://...
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                    # GPT-4o fallback
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RESEND_API_KEY=re_...
SENTRY_DSN=https://...
ENCRYPTION_KEY=...                       # 32-byte AES key (Phase 3)
APP_URL=https://gstsaathi.com
ENVIRONMENT=production                   # development | staging | production

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.gstsaathi.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
NEXT_PUBLIC_POSTHOG_KEY=phk_...
NEXT_PUBLIC_SENTRY_DSN=https://...
# No Supabase keys on frontend in Phase 1
# NEXT_PUBLIC_SUPABASE_URL=...           # Uncomment Phase 3
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # Uncomment Phase 3
```

### 8.4 Deployment Architecture

```
Vercel (Next.js frontend)
  └── /api/v1/* → proxied to Railway via NEXT_PUBLIC_API_URL

Railway (FastAPI + Celery)
  ├── web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  └── worker: celery -A app.tasks worker --loglevel=info

Upstash Redis (managed, serverless)
Supabase (managed Postgres + Storage)
```

### 8.5 CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: pytest tests/ --cov=app --cov-report=xml
      - run: npx playwright test
  deploy-backend:
    needs: test
    steps:
      - run: railway up
  deploy-frontend:
    needs: test
    steps:
      - run: vercel --prod
```

### 8.6 Database Migration Strategy

- Use numbered SQL files: `migrations/001_contacts.sql` ... `013_audit_logs.sql`
- Apply via `psql $DATABASE_URL -f migrations/NNN_name.sql` in CI
- Never alter prod schema manually — always via migration file
- Maintain `schema_migrations` table: `(version INT, applied_at TIMESTAMPTZ)`
- Phase 3 migrations: `014_enable_rls.sql`, `015_encryption.sql`, `016_auth_user_links.sql`

### 8.7 Backup Strategy

| Layer | Method | Frequency | Retention |
|-------|--------|-----------|-----------|
| Supabase DB | Supabase auto-backup (Pro plan) | Daily | 30 days |
| Supabase DB | `pg_dump` via cron → Supabase Storage cold bucket | Weekly | 7 years |
| Reports (Storage) | Supabase Storage replication | Continuous | 90 days active, then cold |
| Vendor DB | Git-tracked SQL seed file | On change | Indefinite |

### 8.8 Access Control

| Principal | Access |
|-----------|--------|
| Backend `service_role` | Full DB access; never in client code |
| Frontend (Phase 3) | `anon` key only; RLS restricts to own data |
| Trial tokens | Application-level check in API middleware |
| Admin | Supabase dashboard + separate admin API with IP whitelist |
| Developers | Supabase branch DB for dev; never prod credentials locally |
# GSTSaathi — Improved Engineering Plan (Part 4 of 4)
## Sections 9–12: Testing Strategy, Timeline, Risk Assessment, SQL Schema Example

---

## 9. Testing Strategy

### 9.1 Unit Tests (pytest)

Target: **≥80% coverage on services layer**

| Test File | What to Test |
|-----------|-------------|
| `test_csv_parser.py` | HDFC/ICICI/SBI/Kotak CSV format parsing, date normalization, Dr/Cr detection |
| `test_normalizer.py` | UPI string parsing (`UPI/AWSIN/1234` → `AMAZON WEB SERVICES`), special char removal |
| `test_vendor_matcher.py` | Keyword trie: exact match, partial match, no match, case insensitivity |
| `test_itc_engine.py` | All 7 ITC decision tree branches; Section 17(5) every blocked category |
| `test_rcm_detector.py` | Google Ads flagged as OIDAR RCM; GTA at 5%; domestic advocate at 18% |
| `test_gstr1_mapper.py` | B2B invoice list; B2C consolidated by rate slab; HSN summary aggregation |
| `test_gstr3b_mapper.py` | Section 3.1(a), 3.1(c), 4(A)(5), 4(B)(2), 6.1 computed correctly |
| `test_gstin_validator.py` | Valid GSTIN passes; invalid state code fails; check digit validation |
| `test_dedup.py` | Same narration+date+amount = same hash; different amount = different hash |
| `test_gst_calculations.py` | ₹1,000 threshold for garments; CGST+SGST for intra-state; IGST for inter-state |

**Sample unit test:**
```python
def test_itc_engine_food_delivery_blocked():
    txn = Transaction(
        vendor_id="swiggy",
        category="Food Delivery",
        gst_rate=5,
        invoice_type="B2C",
        is_personal=False
    )
    result = itc_engine.classify(txn)
    assert result.itc_status == "BLOCKED"
    assert "17(5)" in result.block_reason
    assert result.action_required == "Do not claim — Section 17(5) food delivery"

def test_garment_gst_threshold():
    # Below threshold: 5%
    entry = RetailEntry(product_name="Cotton Kurta", rate_paise=99900, quantity=1)
    assert gst_calculator.compute_rate(entry, is_price_sensitive=True, threshold_paise=100000) == 5.0
    # Above threshold: 12%
    entry.rate_paise = 100100
    assert gst_calculator.compute_rate(entry, is_price_sensitive=True, threshold_paise=100000) == 12.0
```

### 9.2 Integration Tests (pytest + testcontainers)

Spin up real Supabase-compatible PostgreSQL (testcontainers-python):

| Test | Flow |
|------|------|
| Contact submission | POST /contacts → verify row in DB → verify no duplicate on same email |
| Trial token validation | Valid token → 200; expired token → 401; tampered token → 401 |
| Statement upload + classification | Upload HDFC CSV fixture → poll status → assert transactions classified |
| Manual override | PATCH /transactions/:id → verify audit_log written → verify itc_status changed |
| Period lock enforcement | POST /periods/2024-03/lock → PUT /entries/:id → assert 409 PERIOD_LOCKED |
| Razorpay webhook | POST /payments/webhook with valid HMAC → assert trial_session extended |
| Report generation | POST /reports/export → poll status → GET download URL → assert 200 |
| Deduplication | Upload same CSV twice → assert transaction count unchanged |

### 9.3 End-to-End Tests (Playwright)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Contact form submission | Fill form, submit → confirm toast, check DB | Lead created, thank-you shown |
| ITC checker (free) | Type "Google Ads ₹45000", submit | Returns RCM status, 18%, action text |
| ITC checker rate limit | 6th submission same IP | 429 error shown in UI |
| Full Module A flow | Login with trial token → upload HDFC CSV → wait for processing → view transactions → download PDF report | Report downloaded, metrics correct |
| Module B: add sale entry | Add cotton kurta sale ₹2,400 at 5% GST | Entry appears in ledger, today's sales card updates |
| Module B: threshold warning | Enter kurta rate ₹1,001 × 1 pcs | Yellow banner "GST changes at ₹1,000" |
| Module B: period lock | Click "Mark as Filed" for March → try edit → | Edit blocked with explanation |
| Module B: generate GSTR-3B | Open March report → GSTR-3B tab → copy value | Correct value copied to clipboard |
| Payment flow | Click upgrade → Razorpay modal → pay → | Trial extended, confirmation email sent |

### 9.4 Critical Flow Test Cases

| Flow | Input | Expected Output | Failure Mode |
|------|-------|-----------------|-------------|
| GSTIN format validation | `29AAXFS1234A1Z5` | Valid, state=Karnataka | Invalid: reject on submit |
| RCM calculation | Google Ads ₹45,000 | RCM = ₹8,100 (18% of 45,000) | Wrong: user underpays tax |
| B2C invoice ITC flag | Swiggy ₹850 | BLOCKED, Section 17(5) | Wrong: user wrongly claims ITC |
| Time-barred ITC | Invoice Nov 2022, filed Mar 2024 | TIME_BARRED | Wrong: user claims stale ITC |
| Composition dealer sale | B2B buyer asks GST invoice | Warning: cannot issue GST invoice | Wrong: compliance violation |
| Dedup on reupload | Same CSV uploaded twice | 0 new transactions | Wrong: double-counted ITC |
| Offline sync conflict | Edit entry offline + server period locked | Server-wins: edit rejected on sync | Wrong: user loses data silently |
| CGST/SGST/IGST split | Intra-state sale ₹10,000 at 18% | CGST=₹900, SGST=₹900, IGST=₹0 | Wrong: GSTR-3B values incorrect |

---

## 10. Timeline & Milestones

### Roles
- **FE**: Frontend Engineer
- **BE**: Backend Engineer  
- **DS**: Data / ML Engineer (part-time from Phase 2)
- **PM**: Product Manager / Founder
- **DevOps**: Can be BE initially

| Milestone | Duration | Tasks | Owner | Estimate |
|-----------|----------|-------|-------|----------|
| **Phase 0: Foundation** | Weeks 1–2 | Supabase setup, schema migrations, CI/CD, env config, landing page + contact form | BE + FE | 2 weeks |
| **Phase 1A: Module A Core** | Weeks 3–6 | CSV parser (5 banks), vendor matcher (300 rules), ITC engine, RCM detector, transactions API, dashboard API | BE | 4 weeks |
| **Phase 1B: Module A Frontend** | Weeks 3–6 | Dashboard, upload flow, transaction table, override UX, summary cards | FE | 4 weeks |
| **Phase 1C: Report Engine** | Weeks 5–7 | PDF + Excel ITC report (CA-ready), report export API, download UX | BE + FE | 3 weeks |
| **Phase 1D: Module B Core** | Weeks 5–9 | Retail entry API, product master, GST auto-calc, GSTR-1/3B/4 mapper, period lock | BE | 5 weeks |
| **Phase 1E: Module B Frontend** | Weeks 6–10 | Daily entry form, ledger view, month-end report tabs, offline IndexedDB | FE | 5 weeks |
| **Phase 1F: Payments** | Weeks 8–9 | Razorpay integration, webhook handler, trial provisioning | BE | 2 weeks |
| **Phase 1G: QA + Launch** | Week 10 | E2E tests, UAT with 5 beta users, bug fixes, launch | PM + BE + FE | 1 week |
| **MVP Launch** | End of Week 10 | — | — | **~10 weeks** |
| **Phase 2A: PDF OCR** | Weeks 11–13 | pdfplumber (text PDF), Tesseract (scanned), bank-specific parser tuning | BE | 3 weeks |
| **Phase 2B: AI Classification** | Weeks 12–14 | Claude API integration, GPT-4o fallback, confidence scoring, low-confidence flag queue | BE + DS | 3 weeks |
| **Phase 2C: Growth Features** | Weeks 14–18 | Vendor follow-up email generator, GSTR-2B reconciliation alerts, multi-month comparison, barcode scanner | BE + FE | 5 weeks |
| **Phase 2D: React Native** | Weeks 15–20 | Mobile app (Module B focus), offline-first SQLite, camera OCR (receipt) | FE | 6 weeks |
| **Phase 3: Supabase Auth** | Weeks 21–26 | Email OTP + Google OAuth, migrate trial sessions → user accounts, enable RLS, encrypt PII fields, CA partner portal, multi-GSTIN | BE + FE | 6 weeks |
| **Phase 4: Scale** | Weeks 27–40 | ML vendor model, GSTR portal integration, voice entry, team accounts, CA collaboration portal | DS + BE + FE | 14 weeks |

**Total to full product: ~40 weeks (10 months)**
**MVP revenue-ready: Week 10**

---

## 11. Risk Assessment & Mitigation

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|-----------|
| 1 | **GST law changes** (GST Council rate revisions) | Medium | High | Decouple rates from code — all rates in `vendors` table; weekly sync job; automated rate-change notification to users |
| 2 | **AI hallucinated GST rates** | Medium | High | Claude prompt with strict rules; confidence threshold (< 0.7 → UNKNOWN flag); never auto-assign rates without confidence ≥ 0.8; human-verified vendor DB as primary |
| 3 | **Bank CSV format changes** (banks update statement format) | High | Medium | Separate parser per bank; integration test with fixture CSVs; monitor parsing failure rate in Sentry; prompt users to report failures |
| 4 | **Supabase outage** | Low | High | Multi-region Supabase Pro; daily `pg_dump` to independent storage; Celery jobs retry with backoff; display maintenance page |
| 5 | **Razorpay payment failure** | Low | Medium | Webhook idempotency (deduplicate by `razorpay_payment_id`); manual trial extension API for support team |
| 6 | **User uploads wrong/personal statement** | High | Medium | Auto-filter: salary credits, ATM, EMI, personal NEFT flagged as personal; user confirmation step before classification |
| 7 | **ITC wrongly classified as eligible** (false positive) | Medium | Very High | Conservative defaults: unknown vendor → UNKNOWN (never ELIGIBLE); CA disclaimer on every report; user must manually confirm before sharing with CA |
| 8 | **Claude API downtime** | Low | Medium | GPT-4o as hot standby; queue-based retry; rule-based classification always runs first (AI only for unmatched vendors) |
| 9 | **DPDP Act 2023 compliance** | High | High | Consent checkbox on contact form; privacy policy with data processor list; data retention policy enforced (48h file deletion, 7yr transaction retention); grievance officer email published |
| 10 | **Bank statement data breach** | Low | Very High | Files deleted 48h post-processing; narrations encrypted at rest (Phase 3); no third-party sharing; penetration test before Phase 3 launch |
| 11 | **Offline-sync data loss (Module B)** | Medium | High | IndexedDB → optimistic UI; on sync, server validates all records; period-locked entries: server-wins; alert user if sync rejected |
| 12 | **CA partner misuse (white-label)** | Low | Medium | CA partner agreement required; report watermarked with GSTSaathi; no raw data export for CA accounts |
| 13 | **Revenue concentration** (single plan dominates) | Medium | Medium | Three distinct plan tiers; one-time cleanup plan for price-sensitive users; CA B2B channel as second revenue stream |
| 14 | **GSTIN verification API unavailability** (NIC APIs) | Medium | Low | Cache verified GSTINs in `vendors.gstin`; format validation always client-side; NIC lookup optional, not blocking |

### 11.1 Privacy & Data Protection (DPDP Act 2023)

- **Data Minimization**: Contact form collects only name, email, phone, GSTIN. Bank narrations are processed but not permanently stored raw.
- **Purpose Limitation**: Transaction data used only for ITC classification; not shared or used for training without explicit consent.
- **Consent**: Explicit consent checkbox on contact form. Separate consent for AI processing of financial data.
- **Right to Erasure**: `DELETE /api/v1/account` → soft-deletes all user data; hard-delete scheduled after 30 days.
- **Data Localization**: Supabase `ap-south-1` (Mumbai); no cross-border transfer of financial data.
- **Grievance Officer**: Designated email (grievance@gstsaathi.com) published in privacy policy.
- **Breach Response**: Sentry alerts for anomalous access patterns; 72-hour breach notification SLA per DPDP rules.

---

## 12. Minimal SQL Schema Example + Sample API Call

### 12.1 Minimal Working Schema (contact → trial → transaction)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Contacts (lead capture)
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  business_type TEXT,
  gstin         TEXT,
  status        TEXT DEFAULT 'NEW',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Trial sessions (passwordless access)
CREATE TABLE trial_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID REFERENCES contacts(id),
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  plan        TEXT DEFAULT 'TRIAL',
  expires_at  TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Transactions (classified bank transactions)
CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID REFERENCES trial_sessions(id),
  txn_date          DATE NOT NULL,
  narration_raw     TEXT NOT NULL,
  narration_clean   TEXT,
  amount_paise      INTEGER NOT NULL,
  vendor_name       TEXT,
  category          TEXT,
  gst_rate          NUMERIC(4,2),
  gst_amount_paise  INTEGER,
  itc_status        TEXT,
  block_reason      TEXT,
  rcm_applicable    BOOLEAN DEFAULT false,
  rcm_amount_paise  INTEGER,
  action_required   TEXT,
  dedup_hash        TEXT UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_txn_session ON transactions(session_id);
CREATE INDEX idx_txn_status ON transactions(itc_status);
```

### 12.2 Sample: Save a Contact Record via API

**Request:**
```http
POST https://api.gstsaathi.com/api/v1/contacts
Content-Type: application/json
X-Request-ID: req_a1b2c3d4

{
  "full_name": "Riya Sharma",
  "email": "riya@designhive.in",
  "phone": "9876543210",
  "business_name": "DesignHive Studio",
  "gstin": "29AAXFS1234A1Z5",
  "city": "Bengaluru",
  "business_type": "FREELANCER",
  "monthly_spend": 7000000,
  "message": "Want to recover ITC on my SaaS subscriptions",
  "utm_source": "linkedin",
  "utm_campaign": "itc-recovery-april"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "contact_id": "c3a1f2b4-8d9e-4f1a-b2c3-d4e5f6a7b8c9",
    "message": "Dhanyavaad Riya! We'll reach out within 24 hours on WhatsApp or email."
  },
  "error": null,
  "meta": {
    "request_id": "req_a1b2c3d4",
    "ts": "2024-03-15T09:00:00.000Z"
  }
}
```

**What happens server-side:**
```python
# contacts.py (FastAPI route)
@router.post("/contacts", status_code=201)
async def create_contact(body: ContactCreate, request: Request, db: SupabaseClient):
    # 1. Rate limit check (5/IP/hour via Redis)
    await rate_limiter.check(request.client.host, limit=5, window=3600)

    # 2. Validate GSTIN format
    if body.gstin:
        gstin_validator.validate(body.gstin)  # raises 422 if invalid

    # 3. Check for duplicate email
    existing = await db.table("contacts").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(409, {"code": "DUPLICATE_EMAIL"})

    # 4. Insert contact
    contact = await db.table("contacts").insert({
        **body.dict(),
        "utm_source": request.query_params.get("utm_source"),
    }).execute()

    # 5. Send internal Slack/email notification to sales team
    await notify_sales_team(contact.data[0])

    # 6. Send confirmation email to prospect
    await resend.send(
        to=body.email,
        subject="GSTSaathi — We received your request!",
        template="contact_confirmation",
        vars={"name": body.full_name}
    )

    return {"contact_id": contact.data[0]["id"], "message": "..."}
```

**Corresponding Supabase INSERT (logged):**
```sql
INSERT INTO contacts (full_name, email, phone, business_name, gstin, city,
                      business_type, monthly_spend, message, utm_source, utm_campaign)
VALUES ('Riya Sharma', 'riya@designhive.in', '9876543210', 'DesignHive Studio',
        '29AAXFS1234A1Z5', 'Bengaluru', 'FREELANCER', 7000000,
        'Want to recover ITC on my SaaS subscriptions', 'linkedin', 'itc-recovery-april')
RETURNING id, created_at;
-- Returns: c3a1f2b4-..., 2024-03-15T09:00:00Z
```

---

## Appendix: Phase 3 Auth Migration Script (reference only)

```sql
-- Phase 3: Link existing trial sessions to Supabase auth users
-- Run after enabling Supabase Auth

ALTER TABLE trial_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE business_profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE retail_entries ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Enable RLS on all user-facing tables
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_periods ENABLE ROW LEVEL SECURITY;

-- Example RLS policy
CREATE POLICY "users_own_transactions"
  ON transactions FOR ALL
  USING (user_id = auth.uid());

-- Encryption: migrate plaintext fields to encrypted
UPDATE contacts
SET email = pgp_sym_encrypt(email, current_setting('app.encryption_key'))
WHERE email NOT LIKE 'BEGIN PGP MESSAGE%';
```

---

*Document version: 1.0 | Prepared for engineering handoff | April 2026*
*Covers: GSTSaathi Module A (ITC Pre-Processor) + Module B (Retail Daily Ledger)*
*Supabase auth: Phase 3 (Weeks 21–26). All schemas auth-ready from Phase 0.*
