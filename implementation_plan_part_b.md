# GSTSaathi — Consolidated Phase-Wise Implementation Plan (continued)

## 4. PHASE 2 — Growth Features (Weeks 11–20)

**Duration**: 10 weeks
**Objective**: PDF parsing, AI classification, growth features, mobile app
**Gate**: AI classification ≥92% vendor detection; mobile app in TestFlight/Play Console

### Sub-phase Parallelism

```
Wk 11 ────────────────────────────── Wk 20
│                                       │
├─ 2A: PDF OCR (Wk 11–13) ───────────┐ │
├─ 2B: AI Classification (Wk 12–14) ─┘ │ ← parallel, independent services
│         ▼                             │
├─ 2C: Growth Features (Wk 14–18) ─────│ ← sequential: needs AI pipeline
├─ 2D: React Native (Wk 15–20) ────────┘ ← parallel with 2C, reuses APIs
```

---

### 4.1 Phase 2A — PDF Statement Parsing (Weeks 11–13)

**Owner**: BE | **Effort**: 3 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 2A.1 | `pdfplumber` integration for text-based PDF bank statements | 3d | P0 |
| 2A.2 | Bank-specific PDF layout handlers (HDFC, ICICI, SBI column detection) | 4d | P0 |
| 2A.3 | Tesseract OCR pipeline for scanned PDFs (image → text → parse) | 3d | P0 |
| 2A.4 | PDF file type detection (text vs scanned) + auto-routing | 1d | P0 |
| 2A.5 | Update `POST /statements/upload` to accept PDF MIME types | 0.5d | P0 |
| 2A.6 | Integration tests with 10 real-world PDF fixtures | 2d | P0 |

**Acceptance Criteria:**
- [ ] Text PDF: ≥95% row extraction accuracy on 3 supported banks
- [ ] Scanned PDF: ≥85% row extraction accuracy (Tesseract)
- [ ] Auto-detect text vs scanned within 2s of upload
- [ ] Unsupported PDF format → clear error: "This format isn't supported yet"

**External Dependencies:**
- **Decision required**: Tesseract vs AWS Textract — budget impact ($0.0015/page for Textract)
- Tesseract language pack: `eng` + `hin` (Hindi characters in narrations)

---

### 4.2 Phase 2B — AI Classification (Weeks 12–14)

**Owner**: BE + DS | **Effort**: 3 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 2B.1 | Claude API integration with structured JSON output schema | 2d | P0 |
| 2B.2 | GPT-4o fallback with identical prompt and response parsing | 1d | P0 |
| 2B.3 | AI confidence scoring: ≥0.8 auto-accept, 0.5–0.8 flag, <0.5 UNKNOWN | 1d | P0 |
| 2B.4 | Hybrid pipeline: vendor_matcher (trie) first → AI for unmatched only | 2d | P0 |
| 2B.5 | Low-confidence queue (manual review dashboard for PM) | 2d | P1 |
| 2B.6 | Claude prompt engineering + regression test suite (50 narrations) | 3d | P0 |
| 2B.7 | Cost monitoring: track AI API spend per statement processed | 1d | P1 |
| 2B.8 | Rate limit handling + retry with exponential backoff | 1d | P0 |

**Acceptance Criteria:**
- [ ] Vendor detection rate ≥92% on test corpus of 500 Indian bank narrations
- [ ] False positive rate on ITC eligibility <3%
- [ ] Claude downtime → automatic GPT-4o fallback within 1 retry
- [ ] Average AI cost per 200-row statement < ₹5
- [ ] All AI-classified transactions have `itc_confidence` score stored

---

### 4.3 Phase 2C — Growth Features (Weeks 14–18)

**Owner**: BE + FE | **Effort**: 5 weeks

| # | Task | Est. | Owner | Priority |
|---|------|------|-------|----------|
| 2C.1 | Vendor follow-up email generator (pre-filled B2B invoice request template) | 3d | BE + FE | P0 |
| 2C.2 | GSTR-2B reconciliation alerts (manual entry of 2B data → match against transactions) | 4d | BE + FE | P0 |
| 2C.3 | Multi-month ITC comparison charts (Recharts) | 3d | FE | P1 |
| 2C.4 | Barcode scanner for product entry (BarcodeDetector API or QuaggaJS) | 3d | FE | P1 |
| 2C.5 | CA viewer: read-only share link (share_token, no auth, expires 7 days) | 2d | BE + FE | P0 |
| 2C.6 | Calendar/deadline reminder emails (Celery cron: 5 days before GSTR-3B due) | 2d | BE | P0 |
| 2C.7 | ITC recovery progress meter ("You've saved ₹X this quarter") | 1.5d | FE | P1 |
| 2C.8 | Smart nudges engine (3 SaaS vendors without B2B invoices last month) | 2d | BE + FE | P1 |

**Acceptance Criteria:**
- [ ] Email template generates with correct vendor name, GSTIN placeholder, amount
- [ ] GSTR-2B reconciliation flags AT_RISK transactions correctly
- [ ] Share link renders read-only dashboard; no edit capability; expires after 7 days
- [ ] Deadline reminder email sends 5 days before due date with correct month

---

### 4.4 Phase 2D — React Native Mobile App (Weeks 15–20)

**Owner**: FE | **Effort**: 6 weeks

| # | Task | Est. | Priority |
|---|------|------|----------|
| 2D.1 | React Native project setup (Expo, TypeScript) | 2d | P0 |
| 2D.2 | Module B daily entry screens (sale/purchase forms) | 5d | P0 |
| 2D.3 | Product typeahead + barcode scanner (camera) | 3d | P0 |
| 2D.4 | Retail dashboard (today/MTD summary cards) | 3d | P0 |
| 2D.5 | Offline-first with SQLite (WatermelonDB or expo-sqlite) | 5d | P0 |
| 2D.6 | Sync engine: local → server with conflict resolution | 4d | P0 |
| 2D.7 | Push notifications (filing deadline reminders) | 2d | P1 |
| 2D.8 | Receipt photo capture (camera → attach to entry, no OCR yet) | 2d | P1 |
| 2D.9 | TestFlight/Play Console submission | 2d | P0 |

**Acceptance Criteria:**
- [ ] App functions fully offline; entries persist in SQLite
- [ ] On reconnect: all pending entries sync within 30s
- [ ] Conflict: server period-locked entry → user notified, edit rejected
- [ ] App installs on Android 10+ and iOS 15+

### Phase 2 Risk Register

| Risk | L | I | Mitigation | Rollback |
|------|---|---|-----------|----------|
| OCR accuracy too low on scanned PDFs | Medium | High | Offer manual column mapping fallback; restrict to text PDFs in MVP | Disable scanned PDF upload; keep text-only |
| AI API costs exceed budget | Medium | Medium | Vendor matcher handles ≥70% of transactions; AI only for unmatched | Disable AI; use UNKNOWN for unmatched |
| React Native offline sync bugs | High | High | Extensive integration testing; last-write-wins is simpler than vector clocks | Ship web-only; delay mobile |
| Gmail OAuth scope review delays (for future scraper) | Medium | Low | Defer to Phase 3; no gmail features in Phase 2 | No impact on Phase 2 |

### Phase 2 KPIs

| Metric | Target |
|--------|--------|
| Vendor detection rate (AI + rules) | ≥92% |
| ITC false positive rate | <3% |
| PDF parsing success rate | ≥90% |
| Mobile app crash-free rate | ≥99% |
| AI cost per statement | <₹5 |

### Phase 2 → Phase 3 Handoff

1. AI classification pipeline stable with monitoring
2. Mobile app published to TestFlight/Play Console
3. All user data is still session-based (no auth)
4. Share-link CA viewer working
5. Decision log for Phase 3: auth migration plan

---

## 5. PHASE 3 — Supabase Auth + Security (Weeks 21–26)

**Duration**: 6 weeks
**Objective**: Enable Supabase Auth, migrate trial users to accounts, activate RLS, encrypt PII
**Gate**: All RLS policies active; zero data leakage in penetration test; 100% trial→account migration

### 5.1 Tasks

| # | Task | Est. | Owner | Priority |
|---|------|------|-------|----------|
| 3.1 | Enable Supabase Auth (Email OTP + Google OAuth providers) | 1d | BE | P0 |
| 3.2 | Auth middleware: accept both `X-Trial-Token` AND `Authorization: Bearer <jwt>` during transition | 2d | BE | P0 |
| 3.3 | "Claim your account" flow: trial user → enter email → OTP → link session to auth.users | 3d | BE + FE | P0 |
| 3.4 | Migration script: batch-link existing trial_sessions → user accounts | 2d | BE | P0 |
| 3.5 | Run migration `014_enable_rls.sql`: enable RLS on all 8 user-facing tables | 1d | BE | P0 |
| 3.6 | Update all RLS policies from session_id to user_id based | 2d | BE | P0 |
| 3.7 | Run migration `015_encryption.sql`: encrypt PII fields with pgcrypto | 3d | BE | P0 |
| 3.8 | Update application layer: decrypt on read, encrypt on write | 2d | BE | P0 |
| 3.9 | Role-based access: OWNER / CA_VIEWER / EMPLOYEE roles | 3d | BE | P0 |
| 3.10 | CA Partner portal: multi-client dashboard, client invitation flow | 5d | BE + FE | P0 |
| 3.11 | Multi-GSTIN support: per-GSTIN ledger isolation | 3d | BE | P1 |
| 3.12 | DPDP compliance: consent management, right-to-erasure API, privacy policy | 2d | BE + PM | P0 |
| 3.13 | Security audit: penetration test, RLS verification, encrypted field validation | 3d | BE | P0 |
| 3.14 | Frontend auth flow: login/signup page, session management, protected routes | 3d | FE | P0 |

### 5.2 Acceptance Criteria

- [ ] New user signs up via Email OTP → lands on dashboard
- [ ] Existing trial user clicks "Claim Account" → email OTP → same data visible
- [ ] RLS test: User A cannot query User B's transactions via Supabase client
- [ ] Encrypted GSTIN: raw value not visible in Supabase dashboard
- [ ] CA viewer sees client data but cannot edit
- [ ] `DELETE /api/v1/account` → soft-deletes all user data; hard-delete in 30 days
- [ ] Penetration test: no data leakage across user boundaries

### 5.3 Rollback / Contingency

| Scenario | Action |
|----------|--------|
| RLS policy blocks legitimate access | Disable RLS on affected table; investigate; re-enable with fix |
| Encryption breaks existing data reads | Decrypt all data back to plaintext via migration; fix application layer; re-encrypt |
| Auth provider outage (Supabase) | Fall back to trial token auth (keep both paths active for 4 weeks) |
| Migration script corrupts trial→user linkage | Restore from daily Supabase backup; re-run migration with fix |

### Phase 3 Risk Register

| Risk | L | I | Mitigation | Rollback |
|------|---|---|-----------|----------|
| RLS misconfiguration exposes data | Medium | Critical | Pre-deploy: automated RLS test suite; staging verification | Disable RLS; revert to application-layer filtering |
| Encryption key compromise | Low | Critical | Key stored in Railway env var vault; rotate every 90 days; re-encrypt on rotation | Rotate key immediately; re-encrypt all data |
| Trial user doesn't complete migration | High | Medium | Grace period: 30 days with both token + auth; email reminders | Keep token path indefinitely |
| pgcrypto performance on large datasets | Medium | Medium | Encrypt only PII fields (not all columns); index on non-encrypted columns | Defer encryption to Phase 4 |

### Phase 3 Communication

- **Stakeholder briefing**: PM communicates auth changes to existing users 2 weeks before
- **Migration email**: "Claim your GSTSaathi account — your data is safe"
- **CA partner launch**: Dedicated onboarding call for first 5 CA firms

---

## 6. PHASE 4 — Scale (Weeks 27–40)

**Duration**: 14 weeks
**Objective**: ML models, advanced integrations, team features, scale to ₹5L MRR
**Gate**: ML model outperforms rule-based vendor detection; team accounts working

### 6.1 Tasks

| # | Task | Est. | Owner | Priority |
|---|------|------|-------|----------|
| 4.1 | ML vendor detection model (fine-tuned on Indian bank narration corpus) | 6w | DS | P0 |
| 4.2 | Real-time GSTR-2B API integration (if NIC opens access) | 3w | BE | P1 |
| 4.3 | Voice entry (Sarvam AI for Hindi/Hinglish; Whisper for English) | 3w | BE + FE | P2 |
| 4.4 | Gmail invoice scraper (OAuth, OIDAR/SaaS invoice detection) | 4w | BE | P1 |
| 4.5 | Team accounts (invite employees, role-based access) | 2w | BE + FE | P1 |
| 4.6 | CA collaboration portal (comments, approval workflow on reports) | 3w | BE + FE | P1 |
| 4.7 | GSTR-3B prefill export (JSON format compatible with GST portal) | 2w | BE | P1 |
| 4.8 | Bank API auto-fetch (Account Aggregator framework, if available) | 4w | BE | P2 |
| 4.9 | User-contributed vendor DB (crowd-sourced vendor corrections) | 2w | BE + FE | P2 |

### 6.2 Phase 4 KPIs

| Metric | Target |
|--------|--------|
| MRR | ₹5,00,000 |
| MAU | 2,000+ |
| Vendor detection (ML) | ≥96% |
| Reports shared with CA | ≥60% of users |
| Time saved per user | 8 hrs/month |

---

## 7. Full Timeline Summary

| Phase | Weeks | Duration | Key Deliverable | KPI Gate |
|-------|-------|----------|----------------|----------|
| **0: Foundation** | 1–2 | 2 wk | Supabase + CI/CD + landing page | Schema migrated, CI green |
| **1: MVP** | 3–10 | 8 wk | Revenue-ready product (both modules) | 5 beta users, ≥80% test coverage |
| **2: Growth** | 11–20 | 10 wk | PDF OCR, AI, mobile, growth features | ≥92% detection, mobile in store |
| **3: Auth** | 21–26 | 6 wk | Supabase Auth, RLS, encryption, CA portal | Pen test pass, 100% migration |
| **4: Scale** | 27–40 | 14 wk | ML, integrations, team accounts | ₹5L MRR, 2K MAU |
| **Total** | 1–40 | **40 wk** | Full product | — |

---

## 8. Cross-Phase Risk Summary

| # | Risk | Phase | L | I | Mitigation |
|---|------|-------|---|---|-----------|
| 1 | GST law rate changes | All | M | H | Rates in DB, not code; weekly sync job |
| 2 | AI hallucinated ITC status | 2+ | M | VH | Conservative defaults; human-verified vendor DB primary |
| 3 | Bank CSV format changes | 1+ | H | M | Per-bank parser; fixture tests; user-reported failures |
| 4 | Supabase outage | All | L | H | Daily pg_dump; retry logic; maintenance page |
| 5 | DPDP non-compliance | 3+ | H | H | Consent, data localization, 48h file deletion, grievance officer |
| 6 | Data breach (bank statements) | All | L | VH | 48h file deletion; AES-256 encryption (Phase 3); pen test |
| 7 | ITC false positive → user tax liability | 1+ | M | VH | UNKNOWN default; CA disclaimer on every report |
| 8 | Revenue below target | 2+ | M | H | Three pricing tiers; CA B2B channel; content marketing |

---

## 9. Reference: Data Model & API Specifications

The full data model (13 tables with SQL DDL) is in [gstsaathi_engineering_plan_p2.md](file:///C:/Users/suhai/.gemini/antigravity/brain/3f952dc6-ccf3-4a0d-810f-0975d1f4a096/gstsaathi_engineering_plan_p2.md).

The full API endpoint specifications are in [gstsaathi_engineering_plan_p3.md](file:///C:/Users/suhai/.gemini/antigravity/brain/3f952dc6-ccf3-4a0d-810f-0975d1f4a096/gstsaathi_engineering_plan_p3.md).

The testing strategy and sample SQL are in [gstsaathi_engineering_plan_p4.md](file:///C:/Users/suhai/.gemini/antigravity/brain/3f952dc6-ccf3-4a0d-810f-0975d1f4a096/gstsaathi_engineering_plan_p4.md).

---

*Plan version: 2.0 | Consolidated from p1–p4 | April 2026*
*Ready for sprint planning — resolve 5 open decisions before first sprint*
