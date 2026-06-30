do $$ begin
  alter type public.timeline_item_status add value if not exists 'Upcoming';
  alter type public.timeline_item_status add value if not exists 'Delayed';
  alter type public.timeline_item_status add value if not exists 'Skipped';
  alter type public.timeline_item_status add value if not exists 'Cancelled';
  alter type public.timeline_item_status add value if not exists 'Completed';
exception
  when undefined_object then null;
end $$;

do $$ begin
  create type public.event_day_session_status as enum (
    'Preview',
    'Ready',
    'Active',
    'Paused',
    'Completed',
    'Archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_day_vendor_status as enum (
    'Not Confirmed',
    'Confirmed',
    'En Route',
    'Arrived',
    'Setting Up',
    'Ready',
    'Active',
    'Completed',
    'Delayed',
    'Issue'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_day_issue_type as enum (
    'Timing',
    'Vendor',
    'Client Request',
    'Venue',
    'Equipment',
    'Staffing',
    'Guest Experience',
    'Logistics',
    'Other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_day_issue_severity as enum (
    'Informational',
    'Attention Needed',
    'Urgent',
    'Critical'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_day_issue_status as enum (
    'Open',
    'Investigating',
    'Waiting',
    'Resolved',
    'Closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.timeline_version_status as enum (
    'Draft',
    'Finalized',
    'Superseded'
  );
exception when duplicate_object then null;
end $$;

alter table public.event_timeline_items
  add column if not exists planned_start_at timestamptz,
  add column if not exists planned_end_at timestamptz,
  add column if not exists actual_start_at timestamptz,
  add column if not exists actual_end_at timestamptz,
  add column if not exists checked_in_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.users(id) on delete set null,
  add column if not exists criticality text not null default 'Normal',
  add column if not exists delay_minutes integer not null default 0 check (delay_minutes >= 0),
  add column if not exists status_reason text,
  add column if not exists contingency_notes text,
  add column if not exists event_day_notes text,
  add column if not exists vendor_assignment_id uuid references public.event_vendors(id) on delete set null,
  add column if not exists team_assignment_id uuid references public.event_team_members(id) on delete set null,
  add column if not exists version_number integer not null default 1 check (version_number > 0),
  add column if not exists locked_at timestamptz,
  add column if not exists pinned_current_at timestamptz,
  add column if not exists pinned_current_by uuid references public.users(id) on delete set null,
  add column if not exists updated_by uuid references public.users(id) on delete set null;

alter table public.event_team_members
  add column if not exists event_day_role text,
  add column if not exists event_day_status text not null default 'Unconfirmed',
  add column if not exists on_site_at timestamptz,
  add column if not exists unavailable_at timestamptz,
  add column if not exists event_day_notes text;

create table if not exists public.timeline_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status public.timeline_version_status not null default 'Draft',
  finalized_by uuid references public.users(id) on delete set null,
  finalized_at timestamptz,
  change_reason text,
  snapshot jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_id, version_number)
);

create table if not exists public.event_day_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status public.event_day_session_status not null default 'Preview',
  event_day_lead_id uuid references public.users(id) on delete set null,
  active_timeline_version_id uuid references public.timeline_versions(id) on delete set null,
  activated_by uuid references public.users(id) on delete set null,
  activated_at timestamptz,
  paused_at timestamptz,
  completed_by uuid references public.users(id) on delete set null,
  completed_at timestamptz,
  archived_at timestamptz,
  unresolved_warnings jsonb not null default '[]'::jsonb,
  readiness_overrides jsonb not null default '[]'::jsonb,
  offline_manifest jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_id)
);

create table if not exists public.event_day_vendor_statuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  event_vendor_id uuid not null references public.event_vendors(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  status public.event_day_vendor_status not null default 'Not Confirmed',
  arrival_time timestamptz,
  setup_window_start timestamptz,
  setup_window_end timestamptz,
  service_start_at timestamptz,
  breakdown_at timestamptz,
  assigned_location text,
  deliverables text,
  delay_minutes integer not null default 0 check (delay_minutes >= 0),
  issue_summary text,
  checked_in_by uuid references public.users(id) on delete set null,
  checked_in_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_vendor_id)
);

create table if not exists public.event_day_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  timeline_item_id uuid references public.event_timeline_items(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  reported_by uuid references public.users(id) on delete set null,
  assigned_to uuid references public.users(id) on delete set null,
  type public.event_day_issue_type not null default 'Other',
  severity public.event_day_issue_severity not null default 'Attention Needed',
  title text not null,
  description text,
  status public.event_day_issue_status not null default 'Open',
  resolution text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_day_issues_org_idempotency_idx
  on public.event_day_issues (organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists timeline_versions_event_idx on public.timeline_versions (organization_id, event_id, version_number desc);
create index if not exists event_day_sessions_event_idx on public.event_day_sessions (organization_id, event_id, status);
create index if not exists event_day_vendor_statuses_event_idx on public.event_day_vendor_statuses (organization_id, event_id, status);
create index if not exists event_day_issues_event_status_idx on public.event_day_issues (organization_id, event_id, status, opened_at desc);
create index if not exists event_timeline_items_event_day_idx on public.event_timeline_items (organization_id, event_id, status, planned_start_at);
create index if not exists event_team_members_event_day_idx on public.event_team_members (organization_id, event_id, event_day_status);

create or replace function public.validate_timeline_version_organization()
returns trigger
language plpgsql
as $$
declare
  event_org uuid;
  event_project uuid;
begin
  select organization_id, project_id into event_org, event_project
  from public.events
  where id = new.event_id;

  if event_org is null or event_org <> new.organization_id then
    raise exception 'timeline version event organization mismatch';
  end if;

  if new.project_id is null then
    new.project_id := event_project;
  elsif event_project is not null and new.project_id <> event_project then
    raise exception 'timeline version project mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.validate_event_day_session_organization()
returns trigger
language plpgsql
as $$
declare
  event_org uuid;
  event_project uuid;
begin
  select organization_id, project_id into event_org, event_project
  from public.events
  where id = new.event_id;

  if event_org is null or event_org <> new.organization_id then
    raise exception 'event-day session event organization mismatch';
  end if;

  if new.project_id is null then
    new.project_id := event_project;
  elsif event_project is not null and new.project_id <> event_project then
    raise exception 'event-day session project mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.validate_event_day_vendor_status_organization()
returns trigger
language plpgsql
as $$
declare
  assignment_org uuid;
  assignment_event uuid;
  assignment_vendor uuid;
  event_project uuid;
begin
  select organization_id, event_id, vendor_id
    into assignment_org, assignment_event, assignment_vendor
  from public.event_vendors
  where id = new.event_vendor_id;

  if assignment_org is null or assignment_org <> new.organization_id then
    raise exception 'event-day vendor assignment organization mismatch';
  end if;

  if assignment_event <> new.event_id then
    raise exception 'event-day vendor event mismatch';
  end if;

  if assignment_vendor <> new.vendor_id then
    raise exception 'event-day vendor mismatch';
  end if;

  select project_id into event_project from public.events where id = new.event_id;
  if new.project_id is null then
    new.project_id := event_project;
  elsif event_project is not null and new.project_id <> event_project then
    raise exception 'event-day vendor project mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.validate_event_day_issue_organization()
returns trigger
language plpgsql
as $$
declare
  event_org uuid;
  event_project uuid;
  related_org uuid;
begin
  select organization_id, project_id into event_org, event_project
  from public.events
  where id = new.event_id;

  if event_org is null or event_org <> new.organization_id then
    raise exception 'event-day issue event organization mismatch';
  end if;

  if new.project_id is null then
    new.project_id := event_project;
  elsif event_project is not null and new.project_id <> event_project then
    raise exception 'event-day issue project mismatch';
  end if;

  if new.timeline_item_id is not null then
    select organization_id into related_org from public.event_timeline_items where id = new.timeline_item_id;
    if related_org is null or related_org <> new.organization_id then
      raise exception 'event-day issue timeline organization mismatch';
    end if;
  end if;

  if new.vendor_id is not null then
    select organization_id into related_org from public.vendors where id = new.vendor_id;
    if related_org is null or related_org <> new.organization_id then
      raise exception 'event-day issue vendor organization mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_timeline_versions_organization on public.timeline_versions;
create trigger validate_timeline_versions_organization
  before insert or update on public.timeline_versions
  for each row execute function public.validate_timeline_version_organization();

drop trigger if exists validate_event_day_sessions_organization on public.event_day_sessions;
create trigger validate_event_day_sessions_organization
  before insert or update on public.event_day_sessions
  for each row execute function public.validate_event_day_session_organization();

drop trigger if exists validate_event_day_vendor_statuses_organization on public.event_day_vendor_statuses;
create trigger validate_event_day_vendor_statuses_organization
  before insert or update on public.event_day_vendor_statuses
  for each row execute function public.validate_event_day_vendor_status_organization();

drop trigger if exists validate_event_day_issues_organization on public.event_day_issues;
create trigger validate_event_day_issues_organization
  before insert or update on public.event_day_issues
  for each row execute function public.validate_event_day_issue_organization();

drop trigger if exists timeline_versions_set_updated_at on public.timeline_versions;
create trigger timeline_versions_set_updated_at
  before update on public.timeline_versions
  for each row execute function public.set_updated_at();

drop trigger if exists event_day_sessions_set_updated_at on public.event_day_sessions;
create trigger event_day_sessions_set_updated_at
  before update on public.event_day_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists event_day_vendor_statuses_set_updated_at on public.event_day_vendor_statuses;
create trigger event_day_vendor_statuses_set_updated_at
  before update on public.event_day_vendor_statuses
  for each row execute function public.set_updated_at();

drop trigger if exists event_day_issues_set_updated_at on public.event_day_issues;
create trigger event_day_issues_set_updated_at
  before update on public.event_day_issues
  for each row execute function public.set_updated_at();

alter table public.timeline_versions enable row level security;
alter table public.event_day_sessions enable row level security;
alter table public.event_day_vendor_statuses enable row level security;
alter table public.event_day_issues enable row level security;

create policy "staff read timeline versions" on public.timeline_versions
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage timeline versions" on public.timeline_versions
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "staff read event day sessions" on public.event_day_sessions
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage event day sessions" on public.event_day_sessions
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "staff read event day vendor statuses" on public.event_day_vendor_statuses
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage event day vendor statuses" on public.event_day_vendor_statuses
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

create policy "staff read event day issues" on public.event_day_issues
  for select using (organization_id = public.current_organization_id() and public.is_staff());
create policy "staff manage event day issues" on public.event_day_issues
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());
