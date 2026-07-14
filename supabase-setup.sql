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

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_data;
alter publication supabase_realtime add table public.mix_scenarios;
alter publication supabase_realtime add table public.scenario_data;
alter publication supabase_realtime add table public.feasibility_files;

-- Done. The new database is ready for the app.
