do $$ begin
  create type public.integration_provider as enum ('google', 'microsoft');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.connected_account_status as enum ('Connected', 'Expired', 'Action Required', 'Error');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.meeting_type as enum ('Google Meet', 'Phone', 'In Person');
exception when duplicate_object then null;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'meeting_type'
      and e.enumlabel = 'Microsoft Teams'
  ) then
    alter type public.meeting_type add value 'Microsoft Teams';
  end if;
end $$;

do $$ begin
  if to_regclass('public.communication_threads') is null
    or to_regclass('public.communication_messages') is null
    or to_regclass('public.meetings') is null then
    raise exception 'EaseEvents core communication tables are missing. Apply 20260612130000_ease_events_core_schema_repair.sql and 20260616123000_ease_events_communications.sql before this migration.';
  end if;
end $$;

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.integration_provider not null,
  status public.connected_account_status not null default 'Connected',
  provider_account_id text not null,
  provider_account_email text not null,
  provider_account_name text,
  scopes text[] not null default '{}',
  calendar_id text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_mail_synced_at timestamptz,
  last_calendar_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, provider)
);

alter table public.communication_threads
  add column if not exists external_provider public.integration_provider,
  add column if not exists external_thread_id text,
  add column if not exists synced_at timestamptz;

alter table public.communication_messages
  add column if not exists external_provider public.integration_provider,
  add column if not exists external_message_id text,
  add column if not exists synced_at timestamptz;

alter table public.meetings
  add column if not exists connected_account_id uuid references public.connected_accounts(id) on delete set null,
  add column if not exists external_provider public.integration_provider,
  add column if not exists external_calendar_id text,
  add column if not exists external_event_id text,
  add column if not exists external_conference_url text,
  add column if not exists synced_at timestamptz;

create unique index if not exists connected_accounts_provider_account_idx
  on public.connected_accounts(organization_id, provider, provider_account_id);

create index if not exists connected_accounts_user_provider_idx
  on public.connected_accounts(user_id, provider);

create unique index if not exists communication_threads_external_idx
  on public.communication_threads(organization_id, external_provider, external_thread_id);

create unique index if not exists communication_messages_external_idx
  on public.communication_messages(organization_id, external_provider, external_message_id);

create unique index if not exists meetings_external_idx
  on public.meetings(organization_id, external_provider, external_event_id);

drop trigger if exists set_connected_accounts_updated_at on public.connected_accounts;
create trigger set_connected_accounts_updated_at before update on public.connected_accounts
  for each row execute function public.set_updated_at();

alter table public.connected_accounts enable row level security;

drop policy if exists "staff read connected accounts" on public.connected_accounts;
create policy "staff read connected accounts" on public.connected_accounts
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage connected accounts" on public.connected_accounts;
create policy "staff manage connected accounts" on public.connected_accounts
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());
