# ComplianceAI 🏢⚖️

> AI-powered business license compliance management for Indian SMBs.  
> Never lose your business to an expired license.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DIGVIJAYGOWDA/compilance_ai)

---

## What It Does

ComplianceAI tracks all government licenses for Indian small businesses (restaurants, shops, clinics, etc.), sends smart email reminders before expiry, calculates exact penalty exposure under Karnataka law, and pre-fills renewal forms using Google Gemini AI.

**Demo:** [complianceai.vercel.app](https://complianceai.vercel.app) — click **"Try Demo"** on the landing page, no sign-up needed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Animations | Framer Motion |
| Charts | Recharts |
| Auth + DB | Supabase (Email OTP + PostgreSQL) |
| AI | Google Gemini 1.5 Flash |
| OCR | Tesseract.js (in-browser) |
| Email | Resend.com |
| PDF | jsPDF |
| Maps | Leaflet + OpenStreetMap |
| Hosting | Vercel (free tier) |
| Translations | i18next (English + Kannada) |

---

## Project Structure

```
compliance-ai/
├── api/                    ← Vercel Serverless Functions
│   ├── ai/
│   │   ├── extract.js      ← OCR text → license JSON (Gemini)
│   │   ├── prefill.js      ← Renewal form pre-fill (Gemini)
│   │   └── chat.js         ← Streaming chatbot (Gemini SSE)
│   ├── send-reminder.js    ← Email via Resend
│   └── cron-check.js       ← Daily reminder cron (Vercel Cron)
├── src/
│   ├── services/
│   │   ├── supabase.js     ← DB + Auth helpers
│   │   ├── geminiService.js← Client wrappers → /api routes
│   │   ├── ocrService.js   ← Tesseract.js OCR
│   │   ├── emailService.js ← Email trigger + reminder logic
│   │   └── pdfService.js   ← jsPDF renewal form generator
│   ├── utils/
│   │   ├── licenseTypes.js ← 8 license types, documents, portals
│   │   ├── penaltyRules.js ← Fine slabs + calculator
│   │   ├── complianceScore.js ← 0-100 score algorithm
│   │   ├── demoData.js     ← Demo business + 6 licenses
│   │   └── formatters.js   ← Currency, dates, status helpers
│   ├── i18n/               ← English + Kannada translations
│   ├── components/         ← (frontend team builds here)
│   └── pages/              ← (frontend team builds here)
├── supabase/
│   ├── schema.sql          ← Run this first in Supabase SQL editor
│   └── seed.sql            ← Demo data seed
├── .env.local              ← Your API keys (never commit)
├── vercel.json             ← Cron schedule + function timeouts
├── vite.config.js
└── tailwind.config.js
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/DIGVIJAYGOWDA/compilance_ai.git
cd compilance_ai
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Go to **Storage** → create bucket named `license-documents` (private)
4. Go to **Authentication** → Providers → enable **Email OTP**

### 3. Fill in Environment Variables

Copy `.env.local` and fill in your keys:

```env
# Supabase (from Settings → API)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Gemini (from aistudio.google.com/app/apikey)
GEMINI_API_KEY=AIzaSy...

# Resend (from resend.com → API Keys)
RESEND_API_KEY=re_...

# Cron protection (any random string)
CRON_SECRET=your-random-secret-here
```

> ⚠️ **Important:** `GEMINI_API_KEY` and `RESEND_API_KEY` have **no `VITE_` prefix** — they are server-side only, used exclusively in `/api/*` routes. Never put them in VITE_ variables.

### 4. Run Locally

```bash
npm run dev
# → http://localhost:3000
```

To test API routes locally, install Vercel CLI:
```bash
npm install -g vercel
vercel dev
# → http://localhost:3000 (with /api/* routes working)
```

### 5. Deploy to Vercel

```bash
vercel --prod
```

Then go to **Vercel Dashboard → Settings → Environment Variables** and add all 5 keys from `.env.local`.

Add one more for cron (service role key for DB access):
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  ← from Supabase Settings → API
```

---

## API Routes Reference

See `API_CONTRACT.md` for full request/response documentation.

| Method | Route | Description |
|---|---|---|
| POST | `/api/ai/extract` | OCR text → structured license JSON |
| POST | `/api/ai/prefill` | Generate pre-filled renewal form |
| POST | `/api/ai/chat` | Streaming chatbot (SSE) |
| POST | `/api/send-reminder` | Send branded reminder email |
| GET | `/api/cron-check` | Daily cron — check + send reminders |

---

## Database Schema

```
businesses    → one per user (linked to auth.users)
licenses      → many per business (expiry tracking)
reminders     → log of emails sent per license stage
renewals      → pre-filled form data per renewal attempt
```

All tables have Row Level Security — users only see their own data.

---

## Supported License Types

| ID | License | Authority |
|---|---|---|
| FSSAI | FSSAI Food License | FSSAI India |
| FIRE_NOC | Fire NOC | Karnataka KSFE |
| TRADE_LICENSE | Trade License | BBMP |
| SHOP_ESTABLISHMENT | Shop & Establishment | Karnataka Labour Dept |
| EATING_HOUSE | Eating House License | Bengaluru City Police |
| GST | GST Registration | GST Council |
| SIGNAGE | Signage / Hoarding | BBMP Advertisement |
| DRUG_LICENSE | Drug License | Karnataka Drugs Control |

---

## Penalty Calculator

Penalty data is based on actual Karnataka/India government regulations:

- **FSSAI:** ₹5,000 → ₹5,00,000 (FSS Act 2006, Section 63)
- **Fire NOC:** ₹2,000 → ₹1,00,000 (KFF Act 1964)
- **Trade License:** ₹1,000 → ₹30,000 (BBMP Act 1976)
- **Eating House:** ₹2,000 → ₹50,000 (Karnataka Police Act 1963)

---

## Demo Mode

Click **"Try Demo"** on the landing page. Loads `Spice Garden Restaurant` with 6 licenses (1 expired, 3 expiring, 2 active). All features work — no login required. No Supabase writes in demo mode.

---

## License

MIT — built for hackathon demonstration.

---

*Made for Indian Businesses — ComplianceAI 2025*
