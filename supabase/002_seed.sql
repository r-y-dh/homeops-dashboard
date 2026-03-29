-- ============================================================
-- Seed Data for Home OPS
-- Run this AFTER 001_schema.sql and AFTER creating your user account
-- Replace YOUR_USER_ID with your actual auth.users id
-- (Find it in Supabase Dashboard → Authentication → Users)
-- ============================================================

-- To use: replace every instance of 'YOUR_USER_ID' with your UUID
-- e.g., 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

-- ─── Electricity Purchases ───────────────────────────────────
insert into electricity_purchases (user_id, date, amount, service_fee, energy_value, units, balance) values
  ('YOUR_USER_ID', '2025-02-02', 3000, 200, 2800, 873.10, null),
  ('YOUR_USER_ID', '2025-03-05', 2500, 200, 2300, 735.00, null),
  ('YOUR_USER_ID', '2025-04-01', 2500, 200, 2300, 735.00, null),
  ('YOUR_USER_ID', '2025-05-03', 2200, 200, 2000, 652.20, null),
  ('YOUR_USER_ID', '2025-05-30', 2200, 0,   2200, 607.50, null),
  ('YOUR_USER_ID', '2025-10-01', 1500, 200, 1300, 406.20, 867.04),
  ('YOUR_USER_ID', '2025-11-02', 2000, 200, 1800, 541.80, null),
  ('YOUR_USER_ID', '2025-12-01', 1500, 200, 1300, 406.20, null),
  ('YOUR_USER_ID', '2026-02-01', 2000, 200, 1800, 541.80, 1233.37),
  ('YOUR_USER_ID', '2026-03-01', 2000, 200, 1800, 541.80, 1215.71);

-- ─── Municipal Entries (2022, extracted from COJ PDFs) ───────
insert into municipal_entries (user_id, month, rates, water, refuse, sewerage, other, total, water_kl, water_daily_avg_kl, reading_days, meter_start, meter_end) values
  ('YOUR_USER_ID', '2022-01', 998.05, 4836.43, 414.00, 0, 0, 6248.48, 86, 2.048, 42, 10376, 10462),
  ('YOUR_USER_ID', '2022-02', 998.05, 1006.85, 414.00, 0, 0, 2418.90, 11, 0.458, 24, 10462, 10473),
  ('YOUR_USER_ID', '2022-03', 998.05, 1248.43, 414.00, 0, 0, 2660.48, 18, 0.720, 25, 10473, 10491),
  ('YOUR_USER_ID', '2022-04', 998.05, 1334.95, 414.00, 0, 0, 2747.00, 21, 0.750, 28, 10491, 10512),
  ('YOUR_USER_ID', '2022-05', 998.05, 1291.26, 414.00, 0, 0, 2703.31, 23, 0.639, 36, 10512, 10535),
  ('YOUR_USER_ID', '2022-06', 998.05, 1198.65, 414.00, 0, 0, 2610.70, 18, 0.643, 28, 10535, 10553),
  ('YOUR_USER_ID', '2022-07', 1046.48, 1486.77, 434.70, 0, 0, 2967.95, 24, 0.750, 32, 10553, 10577),
  ('YOUR_USER_ID', '2022-08', 1046.49, 1915.57, 434.70, 0, 0, 3396.76, 32, 1.032, 31, 10577, 10609),
  ('YOUR_USER_ID', '2022-09', 1046.49, 1787.21, 434.70, 0, 0, 3268.40, 28, 0.933, 30, 10609, 10637),
  ('YOUR_USER_ID', '2022-10', 1046.49, 1735.45, 434.70, 0, 0, 3216.64, 27, 0.900, 30, 10637, 10664),
  ('YOUR_USER_ID', '2022-11', 1046.49, 3261.98, 434.70, 0, 0, 4743.17, 51, 1.700, 30, 10664, 10715),
  ('YOUR_USER_ID', '2022-12', 1046.49, 2069.50, 434.70, 0, 0, 3550.69, 34, 1.063, 32, 10715, 10749);
