-- ATRIUM Chat wave two: the live meeting room.
-- Decisions, actions, questions and notes typed into a meeting while it runs. "End meeting" files them: actions become real tasks,
-- decisions go to the meeting's decisions log, and the minutes are posted to the meeting chat.
-- Safe to run twice. Task status, checklists and task reminders need no SQL (they live on the task itself and reuse chat_reminders).
create table if not exists chat_meeting_items (
  id bigserial primary key,
  meeting_id text not null,
  kind text not null check (kind in ('decision', 'action', 'question', 'note')),
  body text not null,
  owner text,
  due text,
  author text not null,
  created_at timestamptz not null default now(),
  filed_at timestamptz,
  task_mid bigint
);
create index if not exists chat_meeting_items_meeting_idx on chat_meeting_items (meeting_id, id);
-- the server uses the service key; nobody else gets in
alter table chat_meeting_items enable row level security;
