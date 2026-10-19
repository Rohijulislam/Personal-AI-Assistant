-- Apply before deploying the personal task client.
begin;

create table if not exists public.personal_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  description text not null default '',
  priority text not null check (priority in ('high', 'medium', 'low')),
  due_date date,
  due_time time,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  primary key (user_id, id),
  check (due_date is not null or due_time is null)
);
create index if not exists personal_tasks_user_due_idx on public.personal_tasks (user_id, due_date, due_time)
  where completed_at is null;

alter table public.personal_tasks enable row level security;
revoke all on public.personal_tasks from anon;
grant select, insert, update, delete on public.personal_tasks to authenticated;
drop policy if exists "Own rows" on public.personal_tasks;
create policy "Own rows" on public.personal_tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.user_data drop constraint if exists user_data_collection_check;
alter table public.user_data add constraint user_data_collection_check check (collection in (
  'saved-instructions', 'command-library', 'daily-status-log', 'model-settings',
  'usage-log', 'chat-history', 'command-center-history', 'personal-tasks', 'drafts'
));

alter table public.collection_migrations drop constraint if exists collection_migrations_collection_check;
alter table public.collection_migrations add constraint collection_migrations_collection_check check (collection in (
  'saved-instructions', 'command-library', 'daily-status-log', 'model-settings',
  'usage-log', 'chat-history', 'command-center-history', 'personal-tasks', 'drafts'
));

commit;
