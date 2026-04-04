-- ============================================================
-- Home OPS Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
-- ============================================================

-- ─── Electricity Purchases ───────────────────────────────────
create table electricity_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  amount numeric(10,2) not null,          -- Total Rands paid
  service_fee numeric(10,2) default 200,  -- R200 City Power fee
  energy_value numeric(10,2),             -- amount - service_fee
  units numeric(10,2),                    -- kWh received
  balance numeric(10,2),                  -- Meter balance after top-up (nullable)
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Meter Readings ──────────────────────────────────────────
create table meter_readings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  reading numeric(12,2) not null,         -- kWh on meter
  source text default 'manual',           -- manual, photo, auto
  notes text,
  created_at timestamptz default now()
);

-- ─── Municipal Entries ───────────────────────────────────────
create table municipal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null,                    -- YYYY-MM format
  rates numeric(10,2) default 0,          -- Property rates (incl rebate)
  water numeric(10,2) default 0,          -- Water & sanitation (incl sewer, levy, VAT)
  refuse numeric(10,2) default 0,         -- Pikitup refuse (incl VAT)
  sewerage numeric(10,2) default 0,       -- Separate sewer if broken out
  other numeric(10,2) default 0,
  total numeric(10,2),                    -- Sum of above
  water_kl numeric(8,2),                  -- Kilolitres consumed
  water_daily_avg_kl numeric(6,3),        -- Daily average KL
  reading_days integer,                   -- Days in reading period
  meter_start numeric(12,3),              -- Water meter start reading
  meter_end numeric(12,3),                -- Water meter end reading
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, month)                  -- One entry per month per user
);

-- ─── Household Config (Bond, Medical, Insurance) ─────────────
create table household_config (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,                 -- 'bond', 'medical', 'insurance'
  data jsonb not null default '{}',       -- Flexible key-value store
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category)
);

-- ─── Row Level Security ──────────────────────────────────────
-- Enable RLS on all tables
alter table electricity_purchases enable row level security;
alter table meter_readings enable row level security;
alter table municipal_entries enable row level security;
alter table household_config enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own electricity purchases"
  on electricity_purchases for select using (auth.uid() = user_id);
create policy "Users can insert own electricity purchases"
  on electricity_purchases for insert with check (auth.uid() = user_id);
create policy "Users can update own electricity purchases"
  on electricity_purchases for update using (auth.uid() = user_id);
create policy "Users can delete own electricity purchases"
  on electricity_purchases for delete using (auth.uid() = user_id);

create policy "Users can view own meter readings"
  on meter_readings for select using (auth.uid() = user_id);
create policy "Users can insert own meter readings"
  on meter_readings for insert with check (auth.uid() = user_id);
create policy "Users can update own meter readings"
  on meter_readings for update using (auth.uid() = user_id);
create policy "Users can delete own meter readings"
  on meter_readings for delete using (auth.uid() = user_id);

create policy "Users can view own municipal entries"
  on municipal_entries for select using (auth.uid() = user_id);
create policy "Users can insert own municipal entries"
  on municipal_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own municipal entries"
  on municipal_entries for update using (auth.uid() = user_id);
create policy "Users can delete own municipal entries"
  on municipal_entries for delete using (auth.uid() = user_id);

create policy "Users can view own household config"
  on household_config for select using (auth.uid() = user_id);
create policy "Users can insert own household config"
  on household_config for insert with check (auth.uid() = user_id);
create policy "Users can update own household config"
  on household_config for update using (auth.uid() = user_id);
create policy "Users can delete own household config"
  on household_config for delete using (auth.uid() = user_id);

-- ─── Updated_at trigger ──────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger electricity_purchases_updated_at
  before update on electricity_purchases
  for each row execute function update_updated_at();

create trigger municipal_entries_updated_at
  before update on municipal_entries
  for each row execute function update_updated_at();

create trigger household_config_updated_at
  before update on household_config
  for each row execute function update_updated_at();

-- ─── Fuel Purchases ──────────────────────────────────────────
create table fuel_purchases (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  date            date not null,
  litres          numeric(10,3) not null,
  cost            numeric(10,2) not null,
  price_per_litre numeric(10,4),
  odometer        numeric(10,1),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table fuel_purchases enable row level security;

create policy "Users can view own fuel purchases"
  on fuel_purchases for select using (auth.uid() = user_id);
create policy "Users can insert own fuel purchases"
  on fuel_purchases for insert with check (auth.uid() = user_id);
create policy "Users can update own fuel purchases"
  on fuel_purchases for update using (auth.uid() = user_id);
create policy "Users can delete own fuel purchases"
  on fuel_purchases for delete using (auth.uid() = user_id);

create trigger fuel_purchases_updated_at
  before update on fuel_purchases
  for each row execute function update_updated_at();

-- ─── Budget: Accounts ────────────────────────────────────────
create table budget_accounts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  type         text not null default 'cheque',  -- cheque | savings | credit | loan | investment
  bank         text default 'Discovery Bank',
  color        text default '#22d3ee',
  is_active    boolean default true,
  sort_order   integer default 0,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table budget_accounts enable row level security;
create policy "Users can view own budget accounts"   on budget_accounts for select using (auth.uid() = user_id);
create policy "Users can insert own budget accounts" on budget_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own budget accounts" on budget_accounts for update using (auth.uid() = user_id);
create policy "Users can delete own budget accounts" on budget_accounts for delete using (auth.uid() = user_id);
create trigger budget_accounts_updated_at before update on budget_accounts for each row execute function update_updated_at();

-- ─── Budget: Debit Orders ────────────────────────────────────
create table debit_orders (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  account_id     uuid references budget_accounts(id) on delete cascade not null,
  name           text not null,
  amount         numeric(10,2) not null,
  category       text,
  day_of_month   integer,
  is_active      boolean default true,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table debit_orders enable row level security;
create policy "Users can view own debit orders"   on debit_orders for select using (auth.uid() = user_id);
create policy "Users can insert own debit orders" on debit_orders for insert with check (auth.uid() = user_id);
create policy "Users can update own debit orders" on debit_orders for update using (auth.uid() = user_id);
create policy "Users can delete own debit orders" on debit_orders for delete using (auth.uid() = user_id);
create trigger debit_orders_updated_at before update on debit_orders for each row execute function update_updated_at();

-- ─── Budget: Categories ──────────────────────────────────────
create table budget_categories (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  color           text default '#22d3ee',
  monthly_budget  numeric(10,2),
  sort_order      integer default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, name)
);

alter table budget_categories enable row level security;
create policy "Users can view own budget categories"   on budget_categories for select using (auth.uid() = user_id);
create policy "Users can insert own budget categories" on budget_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own budget categories" on budget_categories for update using (auth.uid() = user_id);
create policy "Users can delete own budget categories" on budget_categories for delete using (auth.uid() = user_id);
create trigger budget_categories_updated_at before update on budget_categories for each row execute function update_updated_at();

-- ─── Budget: Month Setups (opening balances) ─────────────────
create table budget_month_setups (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  account_id      uuid references budget_accounts(id) on delete cascade not null,
  month           text not null,
  opening_balance numeric(12,2) not null,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, account_id, month)
);

alter table budget_month_setups enable row level security;
create policy "Users can view own budget month setups"   on budget_month_setups for select using (auth.uid() = user_id);
create policy "Users can insert own budget month setups" on budget_month_setups for insert with check (auth.uid() = user_id);
create policy "Users can update own budget month setups" on budget_month_setups for update using (auth.uid() = user_id);
create policy "Users can delete own budget month setups" on budget_month_setups for delete using (auth.uid() = user_id);
create trigger budget_month_setups_updated_at before update on budget_month_setups for each row execute function update_updated_at();

-- ─── Budget: Transactions ────────────────────────────────────
create table budget_transactions (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  account_id      uuid references budget_accounts(id) on delete cascade not null,
  category_id     uuid references budget_categories(id) on delete set null,
  date            date not null,
  amount          numeric(10,2) not null,
  description     text,
  type            text not null default 'debit',  -- debit | credit
  source          text default 'manual',           -- manual | import | debit_order
  debit_order_id  uuid references debit_orders(id) on delete set null,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table budget_transactions enable row level security;
create policy "Users can view own budget transactions"   on budget_transactions for select using (auth.uid() = user_id);
create policy "Users can insert own budget transactions" on budget_transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own budget transactions" on budget_transactions for update using (auth.uid() = user_id);
create policy "Users can delete own budget transactions" on budget_transactions for delete using (auth.uid() = user_id);
create trigger budget_transactions_updated_at before update on budget_transactions for each row execute function update_updated_at();
