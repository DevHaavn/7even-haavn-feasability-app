-- ATRIUM Chat alerts. Run once in the Supabase SQL editor, after the first chat file. Adds one table and one column; changes nothing that exists.
-- A device that has turned alerts on (a phone, a computer). The server reads it with the service key only.
create table if not exists chat_push (
  endpoint    text primary key,                -- the browser's push address for that device
  person_id   text not null,
  p256dh      text not null,
  auth        text not null,
  ua          text,
  created_at  timestamptz not null default now()
);
create index if not exists chat_push_person_idx on chat_push (person_id);
alter table chat_push enable row level security;

-- The email nudge: the highest message id already emailed about, so nobody is emailed twice for the same message.
alter table chat_members add column if not exists last_emailed bigint not null default 0;
