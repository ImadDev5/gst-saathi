# GSTSaathi

AI-powered ITC optimization and retail ledger for Indian SMBs.

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Database**: Supabase (PostgreSQL 15)
- **Async Jobs**: Inngest (serverless event-driven)
- **AI**: NVIDIA NIM API (40 RPM, OpenAI-compatible)
- **Hosting**: Vercel (serverless)
- **Cache**: Upstash Redis

## Modules

| Module | Description |
|--------|-------------|
| **Module A** | Bank statement ITC pre-processor — upload CSV, auto-classify, generate CA-ready reports |
| **Module B** | Daily digital retail ledger — sale/purchase entry, GST auto-calc, GSTR-1/3B generation |

## Getting Started

```bash
cd apex-agisolutions
npm install
npm run dev
```

## Project Structure

```
apex-agisolutions/
├── app/                  # Next.js App Router pages + API routes
│   ├── api/v1/           # Serverless API endpoints
│   ├── dashboard/        # Module A dashboard
│   ├── retail/           # Module B retail ledger
│   └── itc-check/        # Free public ITC checker
├── lib/engine/           # GST classification engines
├── inngest/              # Async job handlers
├── components/           # React UI components
└── migrations/           # SQL schema files
```

## Environment Variables

See `architecture_vercel_serverless.md` for the full list.