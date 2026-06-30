do $$ begin
  create type public.calendar_sync_run_status as enum (
    'Started',
    'Completed',
    'Failed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.calendar_conflict_severity as enum (
    'Hard Conflict',
    'Warning',
    'Info'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.meetings add column if not exists timezone text not null default 'America/Toronto';
  alter table public.meetings add column if not exists sync_status text not null default 'Not Synced';
  alter table public.meetings add column if not exists sync_error text;
  alter table public.meetings add column if not exists provider_updated_at timestamptz;
  alter table public.meetings add column if not exists fathom_expected boolean not null default false;
  alter table public.meetings add column if not exists idempotency_key text;
exception
  when undefined_table then null;
end $$;

create unique index if not exists meetings_organization_idempotency_key_idx
  on public.meetings (organization_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.calendar_sync_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete cascade,
  provider public.integration_provider not null,
  calendar_id text not null default 'primary',
  sync_token text,
  delta_link text,
  sync_window_start timestamptz,
  sync_window_end timestamptz,
  last_successful_sync_at timestamptz,
  last_attempted_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, calendar_id, connected_account_id)
);

create table if not exists public.external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  provider public.integration_provider not null,
  calendar_id text not null default 'primary',
  external_event_id text not null,
  i_cal_uid text,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'America/Toronto',
  status text not null default 'Confirmed',
  location text,
  meeting_url text,
  attendees jsonb not null default '[]'::jsonb,
  recurrence jsonb not null default '{}'::jsonb,
  provider_updated_at timestamptz,
  deleted_at timestamptz,
  raw_provider_payload jsonb not null default '{}'::jsonb,
  sync_status text not null default 'Synced',
  conflict_status text not null default 'Unchecked',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, calendar_id, external_event_id)
);

create table if not exists public.scheduling_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  timezone text not null default 'America/Toronto',
  working_days integer[] not null default array[1,2,3,4,5],
  workday_start time not null default time '09:00',
  workday_end time not null default time '17:00',
  default_meeting_duration_minutes integer not null default 30 check (default_meeting_duration_minutes > 0),
  minimum_notice_minutes integer not null default 120 check (minimum_notice_minutes >= 0),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  preferred_meeting_provider public.integration_provider,
  default_connected_account_id uuid references public.connected_accounts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'America/Toronto',
  reason text,
  source text not null default 'Manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_blocks_valid_range check (end_at > start_at)
);

create table if not exists public.calendar_conflicts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  owner_id uuid references public.users(id) on delete set null,
  entry_a_source_type text not null,
  entry_a_source_id text not null,
  entry_b_source_type text not null,
  entry_b_source_id text not null,
  severity public.calendar_conflict_severity not null default 'Warning',
  status text not null default 'Open',
  override_reason text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  provider public.integration_provider not null,
  status public.calendar_sync_run_status not null default 'Started',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  deleted_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_sync_states_org_idx
  on public.calendar_sync_states (organization_id, provider, last_attempted_sync_at desc);
create index if not exists external_calendar_events_org_range_idx
  on public.external_calendar_events (organization_id, start_at, end_at);
create index if not exists external_calendar_events_account_idx
  on public.external_calendar_events (organization_id, connected_account_id);
create index if not exists scheduling_preferences_org_user_idx
  on public.scheduling_preferences (organization_id, user_id);
create index if not exists availability_blocks_org_user_range_idx
  on public.availability_blocks (organization_id, user_id, start_at, end_at);
create index if not exists calendar_conflicts_org_status_idx
  on public.calendar_conflicts (organization_id, status, detected_at desc);
create index if not exists calendar_sync_runs_org_started_idx
  on public.calendar_sync_runs (organization_id, started_at desc);

drop trigger if exists calendar_sync_states_set_updated_at on public.calendar_sync_states;
create trigger calendar_sync_states_set_updated_at
  before update on public.calendar_sync_states
  for each row execute function public.set_updated_at();

drop trigger if exists external_calendar_events_set_updated_at on public.external_calendar_events;
create trigger external_calendar_events_set_updated_at
  before update on public.external_calendar_events
  for each row execute function public.set_updated_at();

drop trigger if exists scheduling_preferences_set_updated_at on public.scheduling_preferences;
create trigger scheduling_preferences_set_updated_at
  before update on public.scheduling_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists availability_blocks_set_updated_at on public.availability_blocks;
create trigger availability_blocks_set_updated_at
  before update on public.availability_blocks
  for each row execute function public.set_updated_at();

drop trigger if exists calendar_conflicts_set_updated_at on public.calendar_conflicts;
create trigger calendar_conflicts_set_updated_at
  before update on public.calendar_conflicts
  for each row execute function public.set_updated_at();

drop trigger if exists calendar_sync_runs_set_updated_at on public.calendar_sync_runs;
create trigger calendar_sync_runs_set_updated_at
  before update on public.calendar_sync_runs
  for each row execute function public.set_updated_at();

alter table public.calendar_sync_states enable row level security;
alter table public.external_calendar_events enable row level security;
alter table public.scheduling_preferences enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.calendar_conflicts enable row level security;
alter table public.calendar_sync_runs enable row level security;

create policy "staff read calendar sync states" on public.calendar_sync_states
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage calendar sync states" on public.calendar_sync_states
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "staff read external calendar events" on public.external_calendar_events
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage external calendar events" on public.external_calendar_events
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "org members read scheduling preferences" on public.scheduling_preferences
  for select using (organization_id = public.current_organization_id());
create policy "staff manage scheduling preferences" on public.scheduling_preferences
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "staff read availability blocks" on public.availability_blocks
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage availability blocks" on public.availability_blocks
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "staff read calendar conflicts" on public.calendar_conflicts
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage calendar conflicts" on public.calendar_conflicts
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "staff read calendar sync runs" on public.calendar_sync_runs
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage calendar sync runs" on public.calendar_sync_runs
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into public.scheduling_preferences (organization_id, user_id, timezone)
select id, null, coalesce(timezone, 'America/Toronto')
from public.organizations
on conflict (organization_id, user_id) do nothing;
