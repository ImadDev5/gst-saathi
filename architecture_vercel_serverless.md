# GSTSaathi — Vercel Serverless Architecture Addendum

> This document supersedes backend architecture sections in the original plan.
> **Constraints**: Everything deploys on Vercel (serverless). NVIDIA NIM API for all AI (40 RPM limit). Next.js only.

---

## 1. What Changes (Vercel Serverless vs Original Plan)

| Original Plan | Vercel Serverless Replacement | Why |
|--------------|------------------------------|-----|
| FastAPI (Python) on Railway | **Next.js API Routes** (TypeScript) on Vercel | Single deploy; native Vercel support |
| Celery + Redis broker | **Inngest** (serverless async) + **Vercel Cron** | No persistent workers allowed |
| Python parsing (pdfplumber, pandas) | **Supabase Edge Functions** (Deno) for heavy parsing OR client-side CSV parsing + server validation | Vercel functions have 60s timeout (Pro); Python not native |
| Claude API + GPT-4o | **NVIDIA NIM API** (40 RPM rate limit) | Single AI provider; queue-based batch processing for rate limits |
| Redis (Upstash) for rate limiting + cache | **Upstash Redis** (unchanged — works natively with Vercel) | Serverless-compatible |
| Railway hosting (~$20/mo) | **Vercel Pro** ($20/mo) | Same cost; simpler infra |
| Separate BE + FE deploys | **Single Next.js monorepo** | One deploy pipeline |
| WeasyPrint (Python PDF) | **@react-pdf/renderer** or **jsPDF** (server-side in API route) | No Python runtime on Vercel |
| openpyxl (Python Excel) | **ExcelJS** (Node.js) | No Python runtime |
| Tesseract OCR (Python) | **Supabase Edge Function** with Tesseract WASM or **AWS Textract API call** from Vercel function | Heavy compute offloaded |

---

## 2. Updated Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 14** (App Router) | Full-stack on Vercel; API routes = serverless functions |
| Language | **TypeScript** (everywhere) | Unified language; no Python/TS split |
| API Routes | `app/api/v1/*/route.ts` | Vercel serverless functions; auto-scaled |
| Database | **Supabase** (PostgreSQL 15) | Managed Postgres + Storage + Auth (Phase 3) |
| Cache / Rate Limit | **Upstash Redis** | Serverless Redis; `@upstash/ratelimit` SDK |
| Async Jobs | **Inngest** | Serverless event-driven functions; runs on Vercel |
| Cron Jobs | **Vercel Cron** (`vercel.json`) | Deadline reminders, file cleanup, vendor sync |
| File Parsing (CSV) | **Papa Parse** (server-side in API route) | Fast CSV parsing in Node.js |
| File Parsing (PDF) | **pdf-parse** (text PDFs) + **Textract API** (scanned, Phase 2) | Node.js compatible |
| AI Classification | **NVIDIA NIM API** (via `openai` SDK — NIM is OpenAI-compatible) | 40 RPM; queue batches via Inngest to stay within limits |
| PDF Report Gen | **@react-pdf/renderer** (server-side) | React-based PDF generation in Node.js |
| Excel Report Gen | **ExcelJS** | Node.js Excel generation |
| Email | **Resend** (`resend` npm package) | Native Vercel integration |
| Payments | **Razorpay** (`razorpay` npm package) | Node.js SDK available |
| Object Storage | **Supabase Storage** | Native; signed URLs |
| Monitoring | **Sentry** (`@sentry/nextjs`) + **PostHog** | Both have Vercel integrations |
| Frontend State | **Zustand** + **React Query** | Same as original plan |
| Forms | **React Hook Form** + **Zod** | Same as original plan |
| Offline (Module B) | **Dexie.js** (IndexedDB) | Same as original plan |

---

## 3. Monorepo File Structure

```
gstsaathi/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page + contact form
│   ├── itc-check/page.tsx            # Free ITC checker
│   ├── thank-you/page.tsx
│   ├── trial/[token]/page.tsx        # Trial entry point
│   ├── dashboard/
│   │   ├── page.tsx                  # Module A dashboard
│   │   ├── upload/page.tsx           # Statement upload
│   │   ├── transactions/page.tsx     # Transaction list
│   │   └── reports/
│   │       ├── page.tsx              # Report list
│   │       └── [id]/page.tsx         # Report viewer
│   ├── retail/
│   │   ├── page.tsx                  # Module B dashboard
│   │   ├── entry/new/page.tsx        # Add sale/purchase
│   │   ├── ledger/page.tsx           # Ledger view
│   │   ├── products/page.tsx         # Product master
│   │   └── reports/[period]/page.tsx # Month-end report
│   ├── payment/
│   │   ├── [plan]/page.tsx           # Razorpay checkout
│   │   └── success/page.tsx
│   │
│   └── api/v1/                       # ← All serverless API routes
│       ├── contacts/route.ts
│       ├── itc/check/route.ts
│       ├── session/route.ts
│       ├── profile/route.ts
│       ├── statements/
│       │   ├── upload/route.ts       # File upload → Supabase Storage → trigger Inngest
│       │   └── [id]/status/route.ts
│       ├── transactions/
│       │   ├── route.ts              # GET (list) + PATCH (override)
│       │   └── [id]/route.ts
│       ├── entries/
│       │   ├── route.ts              # POST (create) + GET (list)
│       │   ├── [id]/route.ts         # PUT + DELETE
│       │   └── bulk-import/route.ts
│       ├── products/
│       │   ├── route.ts
│       │   ├── search/route.ts
│       │   └── preloaded/route.ts
│       ├── reports/
│       │   ├── itc/route.ts
│       │   ├── export/route.ts       # Triggers Inngest job
│       │   ├── gstr1/route.ts
│       │   ├── gstr3b/route.ts
│       │   ├── gstr4/route.ts
│       │   └── [id]/download/route.ts
│       ├── dashboard/
│       │   ├── summary/route.ts
│       │   └── retail-summary/route.ts
│       ├── periods/
│       │   └── [period]/lock/route.ts
│       ├── payments/
│       │   ├── create-order/route.ts
│       │   └── webhook/route.ts      # Razorpay HMAC verification
│       └── cron/                     # Vercel Cron endpoints
│           ├── cleanup-files/route.ts
│           ├── deadline-reminders/route.ts
│           └── vendor-sync/route.ts
│
├── lib/                              # Shared server-side logic
│   ├── supabase/
│   │   ├── client.ts                 # Server-side Supabase client (service_role)
│   │   └── browser.ts               # Client-side Supabase client (Phase 3)
│   ├── services/
│   │   ├── parsing/
│   │   │   ├── csv-parser.ts         # Papa Parse + bank-specific handlers
│   │   │   ├── pdf-parser.ts         # pdf-parse for text PDFs
│   │   │   └── normalizer.ts         # Date/amount/narration normalization
│   │   ├── classification/
│   │   │   ├── vendor-matcher.ts     # Trie lookup against vendors.keywords
│   │   │   ├── itc-engine.ts         # Section 16/17(5) decision tree
│   │   │   ├── rcm-detector.ts       # RCM flagging logic
│   │   │   └── ai-classifier.ts      # NVIDIA NIM API (OpenAI-compatible SDK)
│   │   ├── gst/
│   │   │   ├── gstr1-mapper.ts
│   │   │   ├── gstr3b-mapper.ts
│   │   │   └── gstr4-mapper.ts
│   │   ├── reports/
│   │   │   ├── pdf-generator.ts      # @react-pdf/renderer
│   │   │   └── excel-generator.ts    # ExcelJS
│   │   ├── payments/
│   │   │   └── razorpay.ts
│   │   └── email/
│   │       └── resend.ts
│   ├── inngest/
│   │   ├── client.ts                 # Inngest client init
│   │   ├── process-statement.ts      # Async statement processing function
│   │   ├── generate-report.ts        # Async report generation function
│   │   └── cleanup-files.ts          # 48h file deletion function
│   ├── middleware/
│   │   ├── auth.ts                   # Trial token + JWT validation
│   │   └── rate-limit.ts             # Upstash rate limiter
│   ├── validators/
│   │   ├── gstin.ts
│   │   ├── contact.ts
│   │   └── entry.ts
│   └── utils/
│       ├── dedup.ts
│       ├── crypto.ts                 # Phase 3 encryption helpers
│       └── response.ts              # Standard API response wrapper
│
├── components/                       # React UI components
├── hooks/                            # Custom React hooks
├── stores/                           # Zustand stores
├── types/                            # Shared TypeScript types
│
├── inngest/
│   └── route.ts                      # Inngest serve endpoint (app/api/inngest/route.ts)
│
├── migrations/                       # SQL migration files
├── seeds/                            # Vendor seed data
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/                          # Playwright
│
├── vercel.json                       # Cron jobs + function config
├── next.config.js
├── package.json
├── tsconfig.json
└── .env.local
```

---

## 4. Serverless Function Configuration

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/v1/cron/cleanup-files",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/v1/cron/deadline-reminders",
      "schedule": "30 3 * * *"
    },
    {
      "path": "/api/v1/cron/vendor-sync",
      "schedule": "0 20 * * 0"
    }
  ],
  "functions": {
    "app/api/v1/statements/upload/route.ts": {
      "maxDuration": 30
    },
    "app/api/v1/reports/export/route.ts": {
      "maxDuration": 60
    },
    "app/api/inngest/route.ts": {
      "maxDuration": 300
    }
  }
}
```

> **Note**: Vercel Pro plan allows 60s max for API routes, 300s for Inngest functions.
> Vercel Hobby is 10s — **must use Pro ($20/mo) for statement processing**.

---

## 5. Async Processing: Inngest (replaces Celery)

### Why Inngest (not Celery)

| Feature | Celery (original) | Inngest (Vercel) |
|---------|-------------------|------------------|
| Runtime | Requires persistent worker process | Serverless — runs as Vercel function |
| Hosting | Needs Railway/separate server | Runs on Vercel (free tier available) |
| Queue | Redis broker required | Built-in event queue |
| Retry | Manual config | Built-in with exponential backoff |
| Monitoring | Flower (separate UI) | Inngest dashboard (built-in) |
| Cold start | None (always running) | ~200ms (acceptable for async jobs) |

### Inngest Function: Process Statement

```typescript
// lib/inngest/process-statement.ts
import { inngest } from "./client";
import { csvParser } from "@/lib/services/parsing/csv-parser";
import { vendorMatcher } from "@/lib/services/classification/vendor-matcher";
import { itcEngine } from "@/lib/services/classification/itc-engine";
import { supabase } from "@/lib/supabase/client";

export const processStatement = inngest.createFunction(
  { id: "process-statement", retries: 3 },
  { event: "statement/uploaded" },
  async ({ event, step }) => {
    const { statementId, storagePath, fileType, bankName } = event.data;

    // Step 1: Download file from Supabase Storage
    const fileBuffer = await step.run("download-file", async () => {
      const { data } = await supabase.storage
        .from("statements")
        .download(storagePath);
      return Buffer.from(await data!.arrayBuffer());
    });

    // Step 2: Parse CSV/PDF
    const rawRows = await step.run("parse-file", async () => {
      if (fileType === "CSV") return csvParser.parse(fileBuffer, bankName);
      // pdf-parse for text PDFs
      return pdfParser.parse(fileBuffer, bankName);
    });

    // Step 3: Classify each row
    const classified = await step.run("classify", async () => {
      return rawRows.map(row => {
        const vendor = vendorMatcher.match(row.narrationClean);
        const itc = itcEngine.classify(row, vendor);
        return { ...row, ...vendor, ...itc };
      });
    });

    // Step 4: AI classify unmatched via NVIDIA NIM (respect 40 RPM)
    const unmatched = classified.filter(r => r.itcStatus === "UNKNOWN");
    if (unmatched.length > 0) {
      await step.run("ai-classify", async () => {
        // Batch NIM API calls — max 40/min, process in chunks of 10 with 15s delay
        // ...
      });
    }

    // Step 5: Bulk insert into transactions
    await step.run("insert-transactions", async () => {
      await supabase.from("transactions").insert(classified);
      await supabase.from("statements")
        .update({ status: "READY", parsed_count: classified.length })
        .eq("id", statementId);
    });

    // Step 6: Send email notification
    await step.run("notify", async () => {
      // Resend email: "Your ITC report is ready"
    });
  }
);
```

### How Upload Triggers Inngest

```typescript
// app/api/v1/statements/upload/route.ts
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  // 1. Validate token, file type, size
  // 2. Upload file to Supabase Storage
  // 3. Insert statement record (status: PARSING)
  // 4. Trigger Inngest event
  await inngest.send({
    name: "statement/uploaded",
    data: { statementId, storagePath, fileType, bankName }
  });
  // 5. Return 202 Accepted
  return NextResponse.json({ statement_id: statementId, status: "PARSING" }, { status: 202 });
}
```

---

## 5.1 NVIDIA NIM AI Classification

### NIM Client Setup (OpenAI-compatible)

```typescript
// lib/services/classification/ai-classifier.ts
import OpenAI from "openai";

const nim = new OpenAI({
  apiKey: process.env.NVIDIA_NIM_API_KEY!,
  baseURL: process.env.NVIDIA_NIM_BASE_URL!, // https://integrate.api.nvidia.com/v1
});

const GST_SYSTEM_PROMPT = `You are a GST classification engine for Indian businesses (FY 2024-25).
For each bank transaction narration, return ONLY valid JSON:
{
  "vendor_name": string, "category": string, "hsn_sac_code": string,
  "gst_rate": 0|5|12|18|28,
  "itc_status": "ELIGIBLE"|"BLOCKED"|"RCM"|"CONDITIONAL"|"UNKNOWN",
  "block_reason": string|null, "rcm_applicable": boolean,
  "is_oidar": boolean, "confidence": 0.0-1.0, "action_required": string
}
Rules:
- Apply Section 17(5) blocked credits strictly
- Flag OIDAR services (Google Ads, Meta Ads, foreign SaaS) as RCM
- If uncertain, set confidence < 0.7 and itc_status = "UNKNOWN"
- Default: 18% for services, 12% for goods if unsure`;

// Single narration (used by /itc/check free endpoint — 1 RPM)
export async function classifySingle(narration: string) {
  const response = await nim.chat.completions.create({
    model: process.env.NVIDIA_NIM_MODEL!,
    messages: [
      { role: "system", content: GST_SYSTEM_PROMPT },
      { role: "user", content: `Transaction: "${narration}"` }
    ],
    temperature: 0.1,
    max_tokens: 500,
  });
  return JSON.parse(response.choices[0].message.content!);
}

// Batch: 10 narrations per API call (saves RPM)
export async function classifyBatch(narrations: string[]) {
  const batchPrompt = narrations.map((n, i) => `${i + 1}. "${n}"`).join("\n");
  const response = await nim.chat.completions.create({
    model: process.env.NVIDIA_NIM_MODEL!,
    messages: [
      { role: "system", content: GST_SYSTEM_PROMPT },
      { role: "user", content: `Classify these ${narrations.length} transactions. Return a JSON array:\n${batchPrompt}` }
    ],
    temperature: 0.1,
    max_tokens: 3000,
  });
  return JSON.parse(response.choices[0].message.content!);
}
```

### 40 RPM Rate Limit Strategy

| CSV Size | Unmatched (30%) | NIM Calls (10/batch) | Within 40 RPM? |
|----------|----------------|---------------------|----------------|
| 200 rows | ~60 | 6 calls | ✅ Yes |
| 500 rows | ~150 | 15 calls | ✅ Yes |
| 1000 rows | ~300 | 30 calls | ✅ Yes |
| 1500+ rows | ~450+ | 45+ calls | ⚠️ Needs throttling |

For 45+ calls: Inngest step processes 4 API calls → sleeps 1.5s → next 4.

```typescript
// In Inngest process-statement step:
const BATCH_SIZE = 10;
const MAX_BURST = 4;
const PAUSE_MS = 1500;

for (let i = 0; i < batches.length; i++) {
  results.push(await classifyBatch(batches[i].map(r => r.narrationClean)));
  if ((i + 1) % MAX_BURST === 0 && i < batches.length - 1) {
    await new Promise(r => setTimeout(r, PAUSE_MS));
  }
}
```

**Cost**: NVIDIA NIM free tier covers MVP volumes. $0 for AI at launch.

---

## 6. Cron Jobs (replaces Celery Beat)

| Job | Cron Schedule | Vercel Route | Timeout |
|-----|--------------|-------------|---------|
| Delete processed statement files (48h) | Every 6h | `/api/v1/cron/cleanup-files` | 30s |
| Filing deadline reminders (9AM IST) | `30 3 * * *` (UTC) | `/api/v1/cron/deadline-reminders` | 30s |
| Vendor rate sync | Sunday 2AM IST | `/api/v1/cron/vendor-sync` | 60s |

Cron routes are authenticated via `CRON_SECRET` env var:
```typescript
// app/api/v1/cron/cleanup-files/route.ts
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Delete files older than 48h from Supabase Storage
  // ...
}
```

---

## 7. Serverless Constraints & Workarounds

| Constraint | Impact | Workaround |
|-----------|--------|-----------|
| **60s function timeout** (Pro) | Large CSV/PDF processing may exceed | Split into Inngest steps; each step has its own 60s budget |
| **No persistent connections** | DB connection pooling | Use Supabase client SDK (handles connection pooling via Supavisor) |
| **No filesystem** (read-only /tmp) | Can't write temp files | Use in-memory buffers; stream to Supabase Storage |
| **250MB function size limit** | Tesseract binary too large | Use AWS Textract API (Phase 2) instead of bundling Tesseract |
| **Cold starts (~200ms)** | First request per function slow | Acceptable for async jobs; use Vercel Edge for latency-critical routes |
| **No Python** | Original plan used Python parsing libs | All parsing rewritten in TypeScript (Papa Parse, pdf-parse) |
| **NVIDIA NIM 40 RPM** | 200-row CSV = 50+ unmatched → exceeds 40 RPM | Inngest step batches: 10 narrations per API call (prompt batching) + 1.5s inter-call delay |
| **No WebSockets** | Can't push real-time processing status | Poll `/statements/:id/status` every 3s from frontend |

---

## 8. Environment Variables (Vercel)

```bash
# Vercel Project Settings → Environment Variables
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NVIDIA_NIM_API_KEY=nvapi-...
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RESEND_API_KEY=re_...
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
CRON_SECRET=...
SENTRY_DSN=https://...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
NEXT_PUBLIC_POSTHOG_KEY=phk_...
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_APP_URL=https://gstsaathi.com
```

---

## 9. Deployment Architecture (Simplified)

```
┌─────────────────────────────────────────┐
│              Vercel (single project)     │
│                                         │
│  Next.js App                            │
│  ├── Pages (SSR/SSG)  → CDN Edge        │
│  ├── API Routes       → Serverless Fn   │
│  ├── Inngest Endpoint  → Async Jobs     │
│  └── Cron Routes       → Scheduled Jobs │
└──────────┬──────────────────────────────┘
           │
    ┌──────┼──────────────┐
    │      │              │
    ▼      ▼              ▼
Supabase  Upstash      Inngest
(Postgres  Redis)      (Event Queue)
+ Storage)
```

**Cost estimate (Vercel Pro):**
- Vercel Pro: $20/mo
- Supabase Pro: $25/mo
- Upstash Redis: $0 (free tier: 10K req/day)
- Inngest: $0 (free tier: 5K events/mo)
- **Total MVP: ~$45/mo** (vs $65+ with Railway)

---

## 10. Updated Phase 0 Tasks (Vercel-Specific)

| # | Task | Change from Original |
|---|------|---------------------|
| 0.6 | Init Next.js 14 project with App Router (single monorepo) | **Replaces** separate FastAPI + Next.js init |
| 0.7 | Set up Inngest: `npm install inngest`, create client, serve endpoint | **New** — replaces Celery setup |
| 0.8 | Configure `vercel.json` with cron schedules and function timeouts | **New** — replaces Railway config |
| 0.11 | Build `POST /api/v1/contacts` as Next.js API route (not FastAPI) | **Changed** — TypeScript, not Python |
| 0.15 | Configure Upstash Redis via Vercel integration marketplace | **Simplified** — one-click install |

### Removed Tasks
- ~~Init FastAPI project~~ → Next.js API routes
- ~~Set up Celery + Redis broker~~ → Inngest
- ~~Dockerfile~~ → Vercel auto-builds
- ~~Railway deployment~~ → Vercel only

---

## 11. Impact on Phase 1 Tasks

| Sub-phase | Key Change |
|-----------|-----------|
| **1A (Module A Backend)** | All parsing services rewritten in TypeScript. `csv-parser.ts` uses Papa Parse. `vendor-matcher.ts` uses trie in JS. ITC engine, RCM detector → TypeScript. |
| **1C (Report Engine)** | PDF: `@react-pdf/renderer`. Excel: `ExcelJS`. Both run in API routes. |
| **1D (Module B Backend)** | No change — CRUD API routes work identically. GST calculation logic → TypeScript. |
| **1F (Payments)** | Razorpay Node.js SDK in API route. Webhook handler as API route. |

### Phase 2 Impact
| Sub-phase | Key Change |
|-----------|-----------|
| **2A (PDF OCR)** | `pdf-parse` for text PDFs (in Vercel function). Scanned PDFs → AWS Textract API call (no local Tesseract). |
| **2B (AI Classification)** | NVIDIA NIM API via OpenAI-compatible SDK. Batch 10 narrations per call. Inngest handles 40 RPM queuing. |
| **2D (React Native)** | No impact — mobile app calls same API routes. |

---

## 12. CI/CD (Simplified)

```yaml
# No separate backend deploy needed. Vercel auto-deploys on push.
# GitHub Actions for tests only:

name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test          # vitest unit tests
      - run: npm run test:e2e      # playwright
```

Vercel handles deployment automatically via GitHub integration. No `railway up` or `vercel --prod` CLI needed.
