-- ATRIUM Chat: edit, delete, pin, forward, quoted reply and "remind me" on messages.
-- Run once in the Supabase SQL editor (project vgvavmnqrdgcnledztyk). Safe to run twice. Nothing existing is changed or removed.
-- Run this BEFORE the Chat update that uses it goes live.

alter table chat_messages add column if not exists edited_at  timestamptz;          -- set when the sender edits the words
alter table chat_messages add column if not exists deleted_at timestamptz;          -- set when the sender deletes it for everyone (the words and files are cleared)
alter table chat_messages add column if not exists reply_to   bigint;               -- id of the message this one answers
alter table chat_messages add column if not exists pinned_at  timestamptz;          -- set while pinned to the top of its chat
alter table chat_messages add column if not exists pinned_by  text;                 -- person id of who pinned it
alter table chat_messages add column if not exists fwd_from   jsonb;                -- { g, gn, u, mid } when this message was forwarded from another chat

create index if not exists chat_messages_pinned_idx on chat_messages (group_id) where pinned_at is not null;

create table if not exists chat_reminders (
  id          bigint generated always as identity primary key,
  person_id   text not null,                                   -- who asked to be reminded
  message_id  bigint not null,
  group_id    uuid not null references chat_groups(id) on delete cascade,
  remind_at   timestamptz not null,
  sent_at     timestamptz,                                     -- set once the alert has gone out
  created_at  timestamptz not null default now()
);
create index if not exists chat_reminders_due_idx on chat_reminders (remind_at) where sent_at is null;
create index if not exists chat_reminders_person_idx on chat_reminders (person_id, message_id);
alter table chat_reminders enable row level security;        -- no policies: only the server (service role) can touch it
