# GSTSaathi

A Next.js-based GST ITC (Input Tax Credit) reconciliation and pre-processing platform.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Cookie-based sessions with Supabase-backed role-based access control
- **Database:** Supabase (PostgreSQL)
- **Background Jobs:** Inngest
- **AI Classification:** NVIDIA NIM / OpenAI
- **Reports:** PDF (@react-pdf/renderer) & Excel (exceljs)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin
ADMIN_PASSWORD=your-admin-password

# AI / NVIDIA NIM (optional — disables AI classification if not set)
NVIDIA_NIM_API_KEY=your-nvidia-nim-api-key
NVIDIA_NIM_BATCH_SIZE=20
NVIDIA_NIM_MAX_AI_TOTAL=1000
NVIDIA_NIM_RATE_LIMIT_DELAY_MS=2500

# Email (optional — disables reminders if not set)
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=reminders@yourdomain.com
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Background Jobs (Inngest)

GSTSaathi uses **Inngest** to process bank statements asynchronously (CSV parsing, vendor matching, AI classification, transaction insertion).

### Terminal 1 — Start Next.js Dev Server

```bash
npm run dev
```

### Terminal 2 — Start Inngest Dev Server

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

> **Note:** If your Next.js dev server runs on a different port (e.g., `3001`), update the URL accordingly:
> ```bash
> npx inngest-cli@latest dev -u http://localhost:3001/api/inngest
> ```

### Testing Statement Processing Locally

1. Sign in as a user with a valid trial token
2. Upload a CSV bank statement via the dashboard
3. The upload API sends an Inngest event (`statements/uploaded`)
4. Inngest CLI picks up the event and runs `processStatement` function
5. Watch the Inngest dev UI for progress (opens at `http://127.0.0.1:8288` by default)

### One-liner (if Next.js is already running on port 3001)

```bash
npx inngest-cli@latest dev -u http://localhost:3001/api/inngest
```

---

## Running Tests

### Playwright E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/role-based-access.spec.ts

# Run with UI mode for debugging
npx playwright test --ui
```

### Build & Start Production Server

```bash
npm run build
PORT=3001 npm run start
```

---

## Key Features

| Feature | Route |
|---------|-------|
| User Dashboard | `/dashboard` |
| Retail Ledger | `/retail` |
| ITC Checker (public) | `/itc-check` |
| Admin Panel | `/admin` |
| Sign In | `/signin` |
| Admin Sign In | `/admin/signin` |

### Role-Based Access Control

| Role | Can Access |
|------|-----------|
| `USER` | `/dashboard`, `/retail`, `/itc-check` |
| `EMPLOYEE` | `/dashboard`, `/retail`, `/itc-check` |
| `OWNER` | `/dashboard`, `/retail`, `/itc-check` |
| `CA_VIEWER` | `/dashboard` (read-only) |
| `ADMIN` | `/admin/*` |
| `SUPER_ADMIN` | `/admin/*` |

---

## Project Structure

```
apex-agisolutions/
├── app/                        # Next.js App Router
│   ├── api/v1/                 # API Routes
│   ├── dashboard/              # User dashboard
│   ├── retail/                 # Retail ledger
│   ├── admin/                  # Admin panel
│   └── ...
├── components/                 # React components
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── SignInModal.tsx         # Sign-in modal
│   ├── LogoutButton.tsx        # Logout button
│   └── ...
├── lib/                        # Utilities
│   ├── auth.ts                 # Shared auth helpers
│   ├── supabase/client.ts      # Supabase server client
│   └── engine/                 # GST/ITC classification logic
├── inngest/                    # Background jobs
│   ├── client.ts               # Inngest client setup
│   └── functions.ts            # Statement processing pipeline
├── e2e/                        # Playwright tests
└── migrations/                 # SQL schema migrations
```

---

## Deployment

The easiest way to deploy is on **Vercel**:

1. Push your code to GitHub
2. Import the repository on [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy

For Inngest in production, use [Inngest Cloud](https://www.inngest.com/):

```bash
npx inngest-cli@latest deploy --prod
```

---

## License

MIT
