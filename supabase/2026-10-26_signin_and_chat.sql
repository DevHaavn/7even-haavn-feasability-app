-- ATRIUM sign-in and chat tables. Run once in the Supabase SQL editor (project vgvavmnqrdgcnledztyk).
-- Every table has row level security ON and NO policies for anon or authenticated: the public key can read and write nothing here.
-- Only the server functions (service role) touch these. Nothing existing is changed, capital_kv is not touched.

create table if not exists atrium_identities (
  email      text primary key,                 -- lower case
  person_id  text not null,                    -- matches the roster id in api/_utils/atriumAuth.js
  added_by   text,
  added_at   timestamptz not null default now()
);

create table if not exists chat_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_dm       boolean not null default false,
  is_private  boolean not null default true,
  owner       text not null,                   -- person id
  project     text,                            -- CRM project name
  dm_key      text unique,                     -- for a direct message: the two person ids, sorted, so there is only ever one
  created_at  timestamptz not null default now()
);

create table if not exists chat_members (
  group_id    uuid not null references chat_groups(id) on delete cascade,
  member      text not null,                   -- person id, or the email of an outside guest
  is_outside  boolean not null default false,
  muted       boolean not null default false,
  archived    boolean not null default false,
  hidden      boolean not null default false,  -- "remove from my list"
  last_read   bigint not null default 0,       -- id of the last message seen
  added_by    text,
  added_at    timestamptz not null default now(),
  primary key (group_id, member)
);

create table if not exists chat_messages (
  id          bigint generated always as identity primary key,
  group_id    uuid not null references chat_groups(id) on delete cascade,
  sender      text not null,
  body        text not null default '',
  kind        text not null default 'text',    -- text | system | task
  task        jsonb,                           -- { title, owner, due, priority, project, workflow, agenda, done, workflow_id }
  files       jsonb not null default '[]',     -- [{ name, type, size, path }]  (path in the private storage bucket)
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_group_idx on chat_messages (group_id, id);

alter table atrium_identities enable row level security;
alter table chat_groups       enable row level security;
alter table chat_members      enable row level security;
alter table chat_messages     enable row level security;

-- Files shared in chat go in a PRIVATE storage bucket and are served by short-lived signed links, never public URLs:
--   insert into storage.buckets (id, name, public) values ('chat-files', 'chat-files', false) on conflict do nothing;
