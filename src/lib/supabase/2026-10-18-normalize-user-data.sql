-- Additive, repeatable migration. Keep public.user_data as a rollback snapshot.
-- Apply before deploying the record-level client.
begin;

create table if not exists public.saved_commands (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  command text not null,
  description text not null default '',
  category text not null default 'other',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists saved_commands_user_updated_idx on public.saved_commands (user_id, updated_at desc);

create table if not exists public.saved_instructions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  content text not null,
  category text not null default 'other',
  tags text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists saved_instructions_user_updated_idx on public.saved_instructions (user_id, updated_at desc);

create table if not exists public.generation_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  tool_id text not null,
  provider text not null,
  model text not null,
  prompt text not null,
  output text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists generation_history_user_created_idx on public.generation_history (user_id, created_at desc);

create table if not exists public.conversation_messages (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation text not null check (conversation in ('chat-history', 'command-center-history')),
  id text not null,
  position integer not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation, id)
);
create index if not exists conversation_messages_user_order_idx on public.conversation_messages (user_id, conversation, position);

create table if not exists public.app_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('model-settings', 'daily-status-log')),
  payload jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.tool_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, tool)
);

create table if not exists public.collection_migrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection text not null check (collection in (
    'saved-instructions', 'command-library', 'daily-status-log', 'model-settings',
    'usage-log', 'chat-history', 'command-center-history', 'drafts'
  )),
  migrated_at timestamptz not null default now(),
  primary key (user_id, collection)
);

-- Every exposed table has the same user boundary. The composite primary keys
-- already index user_id as the leading column for these policies.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'saved_commands', 'saved_instructions', 'generation_history',
    'conversation_messages', 'app_settings', 'tool_drafts', 'collection_migrations'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists "Own rows" on public.%I', table_name);
    execute format('create policy "Own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end $$;

insert into public.saved_commands (user_id, id, title, command, description, category, tags, favorite, created_at, updated_at)
select d.user_id, item->>'id', coalesce(item->>'title',''), coalesce(item->>'command',''),
  coalesce(item->>'description',''), coalesce(item->>'category','other'),
  array(select jsonb_array_elements_text(case when jsonb_typeof(item->'tags') = 'array' then item->'tags' else '[]'::jsonb end)),
  coalesce((item->>'favorite')::boolean, false),
  coalesce(nullif(item->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(item->>'updatedAt','')::timestamptz, now())
from public.user_data d
cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload) = 'array' then d.payload else '[]'::jsonb end) as elements(item)
where d.collection = 'command-library' and nullif(item->>'id','') is not null
on conflict (user_id, id) do nothing;

insert into public.saved_instructions (user_id, id, title, content, category, tags, pinned, created_at, updated_at)
select d.user_id, item->>'id', coalesce(item->>'title',''), coalesce(item->>'content',''),
  coalesce(item->>'category','other'),
  array(select jsonb_array_elements_text(case when jsonb_typeof(item->'tags') = 'array' then item->'tags' else '[]'::jsonb end)),
  coalesce((item->>'pinned')::boolean, false),
  coalesce(nullif(item->>'createdAt','')::timestamptz, now()),
  coalesce(nullif(item->>'updatedAt','')::timestamptz, now())
from public.user_data d
cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload) = 'array' then d.payload else '[]'::jsonb end) as elements(item)
where d.collection = 'saved-instructions' and nullif(item->>'id','') is not null
on conflict (user_id, id) do nothing;

insert into public.generation_history (user_id, id, tool_id, provider, model, prompt, output, created_at)
select d.user_id, item->>'id', coalesce(item->>'toolId',''), coalesce(item->>'provider',''),
  coalesce(item->>'model',''), coalesce(item->>'prompt',''), coalesce(item->>'text',''),
  coalesce(nullif(item->>'createdAt','')::timestamptz, now())
from public.user_data d
cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload) = 'array' then d.payload else '[]'::jsonb end) as elements(item)
where d.collection = 'usage-log' and nullif(item->>'id','') is not null
on conflict (user_id, id) do nothing;

insert into public.conversation_messages (user_id, conversation, id, position, payload)
select d.user_id, d.collection, item->>'id', (ordinality - 1)::integer, item
from public.user_data d
cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload) = 'array' then d.payload else '[]'::jsonb end) with ordinality as messages(item, ordinality)
where d.collection in ('chat-history', 'command-center-history') and nullif(item->>'id','') is not null
on conflict (user_id, conversation, id) do nothing;

insert into public.app_settings (user_id, key, payload, updated_at)
select user_id, collection, payload, updated_at from public.user_data
where collection in ('model-settings', 'daily-status-log')
on conflict (user_id, key) do nothing;

insert into public.tool_drafts (user_id, tool, payload, updated_at)
select d.user_id, draft.key, draft.value, d.updated_at
from public.user_data d
cross join lateral jsonb_each(case when jsonb_typeof(d.payload) = 'object' then d.payload else '{}'::jsonb end) draft
where d.collection = 'drafts'
on conflict (user_id, tool) do nothing;

-- Mark even empty legacy collections so a later login cannot restore deleted
-- records from an old localStorage value.
insert into public.collection_migrations (user_id, collection)
select user_id, collection from public.user_data
on conflict (user_id, collection) do nothing;

commit;
