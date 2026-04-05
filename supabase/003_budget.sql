-- Migration: Add budget tables
-- Run this in Supabase SQL Editor if you set up before the Budget module was added.

-- ─── Budget: Accounts ────────────────────────────────────────
create table if not exists budget_accounts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  type         text not null default 'cheque',
  bank         text default 'Discovery Bank',
  color        text default '#22d3ee',
  is_active    boolean default true,
  sort_order   integer default 0,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table budget_accounts enable row level security;
drop policy if exists "Users can view own budget accounts"   on budget_accounts;
drop policy if exists "Users can insert own budget accounts" on budget_accounts;
drop policy if exists "Users can update own budget accounts" on budget_accounts;
drop policy if exists "Users can delete own budget accounts" on budget_accounts;
create policy "Users can view own budget accounts"   on budget_accounts for select using (auth.uid() = user_id);
create policy "Users can insert own budget accounts" on budget_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own budget accounts" on budget_accounts for update using (auth.uid() = user_id);
create policy "Users can delete own budget accounts" on budget_accounts for delete using (auth.uid() = user_id);
drop trigger if exists budget_accounts_updated_at on budget_accounts;
create trigger budget_accounts_updated_at before update on budget_accounts for each row execute function update_updated_at();

-- ─── Budget: Debit Orders ────────────────────────────────────
create table if not exists debit_orders (
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
drop policy if exists "Users can view own debit orders"   on debit_orders;
drop policy if exists "Users can insert own debit orders" on debit_orders;
drop policy if exists "Users can update own debit orders" on debit_orders;
drop policy if exists "Users can delete own debit orders" on debit_orders;
create policy "Users can view own debit orders"   on debit_orders for select using (auth.uid() = user_id);
create policy "Users can insert own debit orders" on debit_orders for insert with check (auth.uid() = user_id);
create policy "Users can update own debit orders" on debit_orders for update using (auth.uid() = user_id);
create policy "Users can delete own debit orders" on debit_orders for delete using (auth.uid() = user_id);
drop trigger if exists debit_orders_updated_at on debit_orders;
create trigger debit_orders_updated_at before update on debit_orders for each row execute function update_updated_at();

-- ─── Budget: Categories ──────────────────────────────────────
create table if not exists budget_categories (
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
drop policy if exists "Users can view own budget categories"   on budget_categories;
drop policy if exists "Users can insert own budget categories" on budget_categories;
drop policy if exists "Users can update own budget categories" on budget_categories;
drop policy if exists "Users can delete own budget categories" on budget_categories;
create policy "Users can view own budget categories"   on budget_categories for select using (auth.uid() = user_id);
create policy "Users can insert own budget categories" on budget_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own budget categories" on budget_categories for update using (auth.uid() = user_id);
create policy "Users can delete own budget categories" on budget_categories for delete using (auth.uid() = user_id);
drop trigger if exists budget_categories_updated_at on budget_categories;
create trigger budget_categories_updated_at before update on budget_categories for each row execute function update_updated_at();

-- ─── Budget: Month Setups ─────────────────────────────────────
create table if not exists budget_month_setups (
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
drop policy if exists "Users can view own budget month setups"   on budget_month_setups;
drop policy if exists "Users can insert own budget month setups" on budget_month_setups;
drop policy if exists "Users can update own budget month setups" on budget_month_setups;
drop policy if exists "Users can delete own budget month setups" on budget_month_setups;
create policy "Users can view own budget month setups"   on budget_month_setups for select using (auth.uid() = user_id);
create policy "Users can insert own budget month setups" on budget_month_setups for insert with check (auth.uid() = user_id);
create policy "Users can update own budget month setups" on budget_month_setups for update using (auth.uid() = user_id);
create policy "Users can delete own budget month setups" on budget_month_setups for delete using (auth.uid() = user_id);
drop trigger if exists budget_month_setups_updated_at on budget_month_setups;
create trigger budget_month_setups_updated_at before update on budget_month_setups for each row execute function update_updated_at();

-- ─── Budget: Transactions ────────────────────────────────────
create table if not exists budget_transactions (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  account_id      uuid references budget_accounts(id) on delete cascade not null,
  category_id     uuid references budget_categories(id) on delete set null,
  date            date not null,
  amount          numeric(10,2) not null,
  description     text,
  type            text not null default 'debit',
  source          text default 'manual',
  debit_order_id  uuid references debit_orders(id) on delete set null,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table budget_transactions enable row level security;
drop policy if exists "Users can view own budget transactions"   on budget_transactions;
drop policy if exists "Users can insert own budget transactions" on budget_transactions;
drop policy if exists "Users can update own budget transactions" on budget_transactions;
drop policy if exists "Users can delete own budget transactions" on budget_transactions;
create policy "Users can view own budget transactions"   on budget_transactions for select using (auth.uid() = user_id);
create policy "Users can insert own budget transactions" on budget_transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own budget transactions" on budget_transactions for update using (auth.uid() = user_id);
create policy "Users can delete own budget transactions" on budget_transactions for delete using (auth.uid() = user_id);
drop trigger if exists budget_transactions_updated_at on budget_transactions;
create trigger budget_transactions_updated_at before update on budget_transactions for each row execute function update_updated_at();
