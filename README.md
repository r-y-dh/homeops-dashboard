# Home OPS Dashboard

Personal household cost tracking system. Built for prepaid electricity management, municipal account tracking, and full household financial visibility.

**Stack:** React 18 (Vite) · Supabase (PostgreSQL + Auth + Edge Functions) · Vercel · Anthropic Claude API

**Live:** [homeops-dashboard-v2.vercel.app](https://homeops-dashboard-v2.vercel.app)

---

## Modules

| Module | Status | Notes |
|---|---|---|
| Overview | Live | Summary stats, cost split, buffer gauge |
| Electricity | Live | Prepaid top-up log, rate analysis, winter forecast |
| Municipal | Live | COJ bill tracker with PDF auto-extraction |
| Home Loan | Live | Bond repayment & balance tracking |
| Medical Aid | Live | Premium & plan tracking |
| Insurance | Live | Home, contents & vehicle premiums |
| Solar | Placeholder | Coming soon |

---

## Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Supabase](https://supabase.com) account (free tier)
- [Vercel](https://vercel.com) account (free tier)
- [Anthropic API key](https://console.anthropic.com) (for PDF extraction)

---

### Step 1: Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Choose a name and region, wait ~2 min for provisioning
3. Go to **SQL Editor** → run `supabase/001_schema.sql`
4. Go to **Authentication** → **Users** → **Add User** → create your account
5. Note your **User UID** from the users table
6. In SQL Editor, open `supabase/002_seed.sql`, replace `YOUR_USER_ID` with your UUID, run it
7. Go to **Settings** → **API** and copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key (for bulk import script only — keep secret)

---

### Step 2: Local development

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
# Open http://localhost:5173
```

---

### Step 3: Deploy Edge Function (PDF extraction)

```bash
npm install -g supabase

supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Add the Anthropic key as a secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
supabase functions deploy parse-municipal-pdf --no-verify-jwt
```

---

### Step 4: Deploy to Vercel

```bash
npm install -g vercel
vercel login

vercel                    # creates the project
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod             # production deploy
```

---

### Step 5: Disable email confirmation

In Supabase → **Authentication** → **Providers** → **Email** → toggle off **Confirm email** → Save.

---

## Project Structure

```
homeops-dashboard/
├── src/
│   ├── components/
│   │   ├── UI.jsx           # Stat, FormField, SectionLabel, Empty, Card
│   │   ├── Login.jsx        # Auth screen
│   │   └── BufferGauge.jsx  # Winter readiness gauge
│   ├── lib/
│   │   ├── supabase.js      # Supabase client
│   │   ├── hooks.js         # useAuth, useElectricity, useMunicipal, useHouseholdConfig
│   │   └── constants.js     # Theme tokens, MODULES array, usage targets
│   ├── pages/
│   │   ├── Overview.jsx     # Dashboard summary
│   │   ├── Electricity.jsx  # Prepaid top-up tracker
│   │   ├── Municipal.jsx    # COJ monthly account tracker
│   │   └── ConfigPage.jsx   # Generic config page (bond, medical, insurance)
│   ├── App.jsx              # Top nav, routing, mobile menu
│   └── main.jsx
├── supabase/
│   └── functions/
│       └── parse-municipal-pdf/  # Edge function: PDF → Claude → JSON
├── scripts/
│   └── import-municipal-pdfs.mjs # Bulk historical PDF import (one-off)
├── supabase/
│   ├── 001_schema.sql       # Tables + RLS policies
│   └── 002_seed.sql         # Historical seed data
├── .env.example
├── package.json
└── vite.config.js
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `electricity_purchases` | Prepaid top-up log (amount, fee, kWh, balance) |
| `municipal_entries` | Monthly COJ breakdown (rates, water, refuse, sewerage, property details) |
| `household_config` | Key-value store for bond, medical, insurance |

All tables have Row Level Security — users only see their own data.

---

## PDF Extraction

The Municipal page has a **Upload PDF** button that sends COJ statements to a Supabase Edge Function, which calls the Claude API (`claude-haiku-4-5-20251001`) to extract all billing fields and pre-fills the form.

Fields extracted: month, rates, water, sewerage, refuse, other, total, previous balance, current charges, water kL, daily avg kL, reading days, meter start/end, stand size, portion, valuation, region.

### Bulk import (historical)

```bash
export SUPABASE_SERVICE_ROLE_KEY=...
export ANTHROPIC_API_KEY=...
export HOMEOPS_USER_ID=your-uuid

node scripts/import-municipal-pdfs.mjs
```

PDF files must be named `COJ_*.pdf` in the configured directory. Runs serially with 10s delay to stay within API rate limits.

---

## Ongoing Usage

- **Log electricity top-up:** Electricity → "+ Log Top-up"
- **Add municipal month:** Municipal → upload PDF or "+ Add Month"
- **Update bond/medical/insurance:** Click the module → "Add Data" or "Edit"
- **Missing months banner:** Municipal page shows the past 12 months with gaps — click any chip to pre-fill that month

---

## Future Enhancements

- [ ] Solar planning module (provider comparison, payback modelling)
- [ ] Borehole tracking (water savings, ROI)
- [ ] Monthly email / push digest
- [ ] Year-on-year comparison charts
- [ ] Electricity meter reading log (usage delta tracking)
