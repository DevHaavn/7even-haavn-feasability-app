-- ============================================================================
-- 7EVEN | HAAVN Feasibility Studio — fresh Supabase database setup
-- Paste this whole file into the new Supabase project:  SQL Editor → New query → Run.
-- Creates every table the app uses, opens anon read/write (matches current model —
-- the app gates access with its own password screen), and enables realtime sync.
-- ============================================================================

-- ---- Tables ---------------------------------------------------------------

create table if not exists public.projects (
  id          text primary key,
  name        text,
  type        text,
  status      text default 'active',
  address     text,
  brand       text default '7even',
  lat         double precision,
  lng         double precision,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.project_data (
  project_id     text primary key references public.projects(id) on delete cascade,
  site           jsonb,
  land           jsonb,
  cost_stack     jsonb,
  detailed_costs jsonb,
  finance        jsonb,
  timeline       jsonb,
  cashflow       jsonb,
  updated_at     timestamptz default now()
);

create table if not exists public.mix_scenarios (
  id          text primary key,
  project_id  text references public.projects(id) on delete cascade,
  name        text,
  created_at  timestamptz default now()
);

create table if not exists public.scenario_data (
  scenario_id text primary key references public.mix_scenarios(id) on delete cascade,
  unit_types  jsonb,
  btr         jsonb,
  bts         jsonb,
  hotel       jsonb
);

create table if not exists public.snapshots (
  id          text primary key,
  project_id  text references public.projects(id) on delete cascade,
  label       text,
  data        jsonb,
  created_at  timestamptz default now()
);

create table if not exists public.feasibility_files (
  id                text primary key,
  project_id        text references public.projects(id) on delete cascade,
  file_name         text,
  created_at        timestamptz default now(),
  created_by        text,
  last_autosaved_at timestamptz,
  is_live           boolean default false
);

-- ---- Row Level Security: allow the anon key full access ---------------------
-- (Same trust model as the current database. The app's password screen is the
--  gate. Lock this down later if you move to per-user auth.)

do $$
declare t text;
begin
  foreach t in array array['projects','project_data','mix_scenarios','scenario_data','snapshots','feasibility_files']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists anon_all on public.%I;', t);
    execute format('create policy anon_all on public.%I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ---- Realtime: broadcast changes to all connected browsers ------------------
-- Guarded, because `alter publication ... add table` is NOT idempotent: on a
-- database where these have already been added it raises 42710 ("relation is
-- already member of publication"). The editor runs this file as ONE transaction,
-- so that error rolls back everything after it — which is what silently ate the
-- storage section below on the first re-run. Everything else in this file is
-- re-runnable, so this needs to be too.

do $$
declare t text;
begin
  foreach t in array array['projects','project_data','mix_scenarios','scenario_data','feasibility_files']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ---- Storage: the project-docs bucket (architect PDFs) ----------------------
-- storage.objects has its OWN row level security, entirely separate from the
-- public.* tables above. The anon_all loop does not reach it, so a bucket made
-- in the dashboard starts with no policy and every upload fails with
-- "new row violates row-level security policy" — the bucket looks fine, and
-- writes are refused. This section is why the app can upload at all; creating
-- the bucket without it is a no-op.

-- Bucket. public = true → files are readable at their direct URL with no key,
-- which is what the <a href> on the Site & Design panel opens.
insert into storage.buckets (id, name, public)
values ('project-docs', 'project-docs', true)
on conflict (id) do update set public = excluded.public;

-- Same trust model as the tables: the app's password screen is the gate.
-- Scoped to this one bucket, so a future private bucket is unaffected.
drop policy if exists anon_all_project_docs on storage.objects;
create policy anon_all_project_docs on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'project-docs')
  with check (bucket_id = 'project-docs');

-- Done. The new database is ready for the app.
