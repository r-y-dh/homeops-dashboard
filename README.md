# Home OPS Dashboard

Personal household cost tracking system. Built for prepaid electricity management, municipal account tracking, and full household financial visibility.

**Stack:** React (Vite) · Supabase (PostgreSQL + Auth) · Vercel

---

## Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ installed
- A [GitHub](https://github.com) account
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)

---

### Step 1: Create the GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `homeops-dashboard`
3. Set to **Private**
4. Don't initialise with README (we already have one)
5. Click **Create repository**
6. Follow the instructions to push this code:

```bash
cd homeops-dashboard
git init
git add .
git commit -m "Initial scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/homeops-dashboard.git
git push -u origin main
```

---

### Step 2: Set up Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose a name (e.g. `homeops`) and set a **database password** (save this somewhere)
4. Select region closest to you (pick any EU/Africa region)
5. Wait for the project to finish provisioning (~2 min)

#### Create the database tables

6. Go to **SQL Editor** in the left sidebar
7. Click **New Query**
8. Open `supabase/001_schema.sql` from this repo, copy the entire contents, paste into the editor
9. Click **Run** — you should see "Success. No rows returned"

#### Create your user account

10. Go to **Authentication** → **Users** in the left sidebar
11. Click **Add User** → **Create New User**
12. Enter your email and a password
13. Click **Create User**
14. Note the **User UID** shown in the users table (you'll need it for seed data)

#### Seed your data

15. Go back to **SQL Editor** → **New Query**
16. Open `supabase/002_seed.sql` from this repo
17. **Find and replace** every `YOUR_USER_ID` with the UUID from step 14
18. Click **Run**

#### Get your API credentials

19. Go to **Settings** → **API** in the left sidebar
20. Copy the **Project URL** (looks like `https://abc123.supabase.co`)
21. Copy the **anon public** key (the long string under "Project API keys")

---

### Step 3: Configure environment variables

1. Copy the example env file:
```bash
cp .env.example .env
```

2. Fill in your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Test locally:
```bash
npm install
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) and sign in with the email/password you created in Supabase

---

### Step 4: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your `homeops-dashboard` repo
4. Vercel will detect it's a Vite project automatically
5. Before clicking **Deploy**, expand **Environment Variables**
6. Add both variables:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
7. Click **Deploy**
8. Wait ~60 seconds — your app will be live at `https://homeops-dashboard.vercel.app` (or similar)

---

### Step 5: Disable email confirmation (recommended for personal use)

By default Supabase requires email confirmation. Since this is just for you:

1. In Supabase, go to **Authentication** → **Providers**
2. Under **Email**, toggle off **Confirm email**
3. Click **Save**

---

## Project Structure

```
homeops-dashboard/
├── src/
│   ├── components/      # Shared UI components
│   │   ├── UI.jsx       # Stat cards, forms, empty states
│   │   ├── Login.jsx    # Auth screen
│   │   └── BufferGauge.jsx  # Winter readiness gauge
│   ├── lib/
│   │   ├── supabase.js  # Supabase client init
│   │   ├── hooks.js     # Data hooks (useElectricity, useMunicipal, etc.)
│   │   └── constants.js # Theme, module config, targets
│   ├── pages/
│   │   ├── Overview.jsx     # Dashboard summary
│   │   ├── Electricity.jsx  # Prepaid top-up tracker
│   │   ├── Municipal.jsx    # COJ account tracker
│   │   └── ConfigPage.jsx   # Generic config (bond, medical, insurance)
│   ├── App.jsx          # Main app with sidebar + routing
│   └── main.jsx         # Entry point
├── supabase/
│   ├── 001_schema.sql   # Database tables + RLS policies
│   └── 002_seed.sql     # Your historical data
├── .env.example
├── package.json
└── vite.config.js
```

## Database Tables

| Table | Purpose |
|---|---|
| `electricity_purchases` | Prepaid top-up log (amount, fee, kWh, balance) |
| `meter_readings` | Manual meter readings for usage deltas |
| `municipal_entries` | Monthly COJ breakdown (rates, water, refuse) |
| `household_config` | Key-value store for bond, medical, insurance |

All tables have Row Level Security (RLS) — users can only see their own data.

---

## Ongoing Usage

- **Log a top-up:** Electricity tab → "+ Log Top-up"
- **Add municipal data:** Upload COJ PDFs to Claude → paste extracted data, or add manually
- **Update bond/medical/insurance:** Click the module → "Add Data" or "Edit"
- **Add more historical data:** Use the SQL editor in Supabase to bulk-insert

---

## Future Enhancements

- [ ] Solar planning module (provider comparison, payback modelling)
- [ ] Borehole tracking (water savings, ROI)
- [ ] PDF upload + auto-extraction (OCR pipeline)
- [ ] Monthly email digest
- [ ] Year-on-year comparison charts
- [ ] Mobile-optimised layout
