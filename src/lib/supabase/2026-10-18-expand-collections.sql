-- Run in the Supabase SQL Editor for projects that already ran schema.sql.
-- Keeps existing data and permits the new account-scoped draft and Command Center rows.
begin;

alter table public.user_data
  drop constraint if exists user_data_collection_check;

alter table public.user_data
  add constraint user_data_collection_check check (collection in (
    'saved-instructions',
    'command-library',
    'daily-status-log',
    'model-settings',
    'usage-log',
    'chat-history',
    'command-center-history',
    'drafts'
  ));

-- The daily-status log is empty until its first entry, represented by JSON null.
alter table public.user_data
  alter column payload drop not null;

commit;
