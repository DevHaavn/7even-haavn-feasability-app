-- ============================================================================
--  capital_kv  —  shared key/value store (one JSON blob per key)
--  Consumers:
--    key = 'haavn_homes_crm'        → HAAVN CRM 01 · Customer Journey Management
--    key = 'haavn_path_to_market'   → HAAVN CRM 02 · Shareholder Path to Market
--    key = 'haavn_display_shortlist'→ Display Suite shortlist
--    (Capital Base uses its own keys here too)
--
--  Run once in Supabase → SQL Editor → New query → paste → Run.
--  Idempotent: safe to re-run. Access model mirrors the existing app tables
--  (projects, snapshots, …) — the app ships the anon key and RLS is the guard.
-- ============================================================================

create table if not exists public.capital_kv (
  key        text primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- PostgREST reaches the DB as the anon/authenticated role — grant table access.
grant select, insert, update, delete on public.capital_kv to anon, authenticated;

-- Row Level Security on, with permissive policies (same as the other app tables).
alter table public.capital_kv enable row level security;

drop policy if exists "capital_kv read"   on public.capital_kv;
drop policy if exists "capital_kv insert" on public.capital_kv;
drop policy if exists "capital_kv update" on public.capital_kv;
drop policy if exists "capital_kv delete" on public.capital_kv;

create policy "capital_kv read"   on public.capital_kv for select using (true);
create policy "capital_kv insert" on public.capital_kv for insert with check (true);
create policy "capital_kv update" on public.capital_kv for update using (true) with check (true);
create policy "capital_kv delete" on public.capital_kv for delete using (true);

-- Realtime so edits broadcast to other open sessions (idempotent add).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'capital_kv'
  ) then
    alter publication supabase_realtime add table public.capital_kv;
  end if;
end $$;
