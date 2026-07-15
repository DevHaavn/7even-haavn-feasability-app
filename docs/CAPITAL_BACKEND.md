# Capital Base shared backend — one-time setup

The Capital Base pillars (Budgets, Capital Command, War Room + its Stock,
Tenders, Pipeline and Logistics) now sync through Supabase so the whole team
shares one live dataset instead of each browser holding its own copy.

The app already ships the full sync layer and **degrades gracefully**: until
the table below exists, every cloud call fails silently and the app runs
exactly as before off each browser's local storage. Nothing breaks. Once you
create the table, sync switches on with no further code changes.

## Create the table (2 minutes, Jamie)

1. Open the Supabase dashboard for the **current** project **vgvavmnqrdgcnledztyk**
   (the live redux stack) → SQL Editor → New query.
2. Paste this and Run:

```sql
-- Capital Base key-value store: one JSON blob per module, shared by the team.
create table if not exists public.capital_kv (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Realtime fan-out so every open browser sees edits live.
alter publication supabase_realtime add table public.capital_kv;

-- Row Level Security, matching the existing projects tables: the app's anon
-- key may read/write (the Capital Base is already behind its own password
-- gate). Tighten to per-user auth in a later hardening pass.
alter table public.capital_kv enable row level security;

create policy "capital_kv read"  on public.capital_kv for select using (true);
create policy "capital_kv write" on public.capital_kv for insert with check (true);
create policy "capital_kv update" on public.capital_kv for update using (true) with check (true);
```

3. That's it. Open Capital Base — you'll briefly see "Syncing Capital Base…",
   then the pillars load from the shared backend. Edits made on one machine
   appear on another the next time that pillar/tab is opened.

## What syncs

One row per module, keyed by its blob name:

| Key | Module |
| --- | --- |
| `capital_admin_v2` | Budgets / Administration |
| `capital_deploy_v2` | Capital Command Centre |
| `war_room_v1` | War Room — targets, contacts, signals |
| `war_pipeline_v1` | Division pipelines + workflow jobs |
| `sales_stock_v1` | 7EVEN stock ledger |
| `hm_tenders_v1` | HAAVN Management tenders |
| `haavn_logistics_v1` | HAAVN Homes logistics |
| `capital_admin_v3` | Budgets / Administration (current CFO model) |
| `atrium-accounts-v1` | HAAVN Administration — ATRIUM Accounts & Settlement |

## Migrating existing data

Whatever the team has already typed lives in their browser. On the machine
that holds the good data, just open each pillar once after the table exists —
the first save (any edit) pushes that blob up, and from then on it's the
shared source of truth. If two machines hold different edits, the last save
wins per module, so nominate one machine to seed from.

## Security note

This is **workspace-level** security: the anon key can read/write `capital_kv`,
protected by the Capital Base password gate — the same model the existing
`projects` tables already use. It keeps honest people out and lets the team
share data. The next hardening step (Stage 3b) is real per-user Supabase Auth
with row-level policies tied to logins, which also unlocks client-visible
HAAVN Management dashboards. Flag when you want that built.
