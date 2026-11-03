-- HAAVN BLACK sales pipeline: leads, selling companies, their agents, the email inbox and settings.
-- Safe to run twice. Only adds things. The server uses the service key; nobody else can read these tables.
create table if not exists hb_leads (
  id          text primary key,
  owner       text,                         -- a team member id (jb, mf) or an agent id (a_...)
  state       text,                         -- NSW VIC QLD SA WA TAS ACT NT
  stage       int  not null default 0,      -- 0..7, see the stages in the app
  status      text not null default 'open', -- open | lost
  source      text,
  concept     boolean not null default false,
  company_id  text,                         -- the selling company, when an agent owns it
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb   -- name, mobile, email, home, finishes, history, order, everything else
);
create index if not exists hb_leads_owner_idx   on hb_leads (owner);
create index if not exists hb_leads_company_idx on hb_leads (company_id);
create index if not exists hb_leads_updated_idx on hb_leads (updated_at);
create index if not exists hb_leads_created_idx on hb_leads (created_at);

create table if not exists hb_companies (
  id          text primary key,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb   -- ABN or ACN, address, landline, mobile, licence number, states
);

create table if not exists hb_agents (
  id          text primary key,
  company_id  text,
  email       text,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb   -- role, mobile, licence number, states, active
);
create index if not exists hb_agents_company_idx on hb_agents (company_id);
create index if not exists hb_agents_email_idx   on hb_agents (lower(email));

create table if not exists hb_inbox (
  id          text primary key,
  message_id  text unique,                  -- the email's own id, so one email never becomes two leads
  received_at timestamptz not null default now(),
  from_addr   text,
  subject     text,
  body        text,
  status      text not null default 'new',  -- new | lead | review | dismissed
  lead_id     text,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists hb_inbox_received_idx on hb_inbox (received_at);

create table if not exists hb_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table hb_leads     enable row level security;
alter table hb_companies enable row level security;
alter table hb_agents    enable row level security;
alter table hb_inbox     enable row level security;
alter table hb_settings  enable row level security;

notify pgrst, 'reload schema';

select to_regclass('public.hb_leads') as leads, to_regclass('public.hb_companies') as companies, to_regclass('public.hb_agents') as agents, to_regclass('public.hb_inbox') as inbox, to_regclass('public.hb_settings') as settings;
