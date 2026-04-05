-- Migration: Add fuel_purchases table
-- Run this in Supabase SQL Editor if you set up before the Fuel module was added.

create table if not exists fuel_purchases (
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

drop policy if exists "Users can view own fuel purchases"   on fuel_purchases;
drop policy if exists "Users can insert own fuel purchases" on fuel_purchases;
drop policy if exists "Users can update own fuel purchases" on fuel_purchases;
drop policy if exists "Users can delete own fuel purchases" on fuel_purchases;

create policy "Users can view own fuel purchases"   on fuel_purchases for select using (auth.uid() = user_id);
create policy "Users can insert own fuel purchases" on fuel_purchases for insert with check (auth.uid() = user_id);
create policy "Users can update own fuel purchases" on fuel_purchases for update using (auth.uid() = user_id);
create policy "Users can delete own fuel purchases" on fuel_purchases for delete using (auth.uid() = user_id);

create trigger if not exists fuel_purchases_updated_at
  before update on fuel_purchases
  for each row execute function update_updated_at();
