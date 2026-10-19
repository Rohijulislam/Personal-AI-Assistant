-- Bootstrap the legacy table, then run 2026-10-18-normalize-user-data.sql.
-- Existing rows remain a rollback snapshot after the record-level migration.
create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection text not null check (collection in (
    'saved-instructions',
    'command-library',
    'daily-status-log',
    'model-settings',
    'usage-log',
    'chat-history',
    'command-center-history',
    'personal-tasks',
    'drafts'
  )),
  payload jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection)
);

alter table public.user_data enable row level security;

drop policy if exists "Users can read their own app data" on public.user_data;
create policy "Users can read their own app data"
  on public.user_data for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own app data" on public.user_data;
create policy "Users can insert their own app data"
  on public.user_data for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own app data" on public.user_data;
create policy "Users can update their own app data"
  on public.user_data for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_data to authenticated;
