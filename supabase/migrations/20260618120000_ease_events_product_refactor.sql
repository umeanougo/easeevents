create extension if not exists pgcrypto;

do $$ begin
  create type public.client_status as enum ('Prospect', 'Active', 'Past', 'Archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.timeline_item_status as enum ('Planned', 'Ready', 'In Progress', 'Complete', 'Blocked');
exception when duplicate_object then null;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  email text not null,
  phone text,
  company_name text,
  status public.client_status not null default 'Prospect',
  source text,
  notes text,
  lifetime_value numeric(12,2) not null default 0,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clients_organization_email_unique_idx
  on public.clients (organization_id, lower(email))
  where email <> '';

alter table public.leads add column if not exists client_id uuid;
alter table public.events add column if not exists client_id uuid;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_client_id_fkey'
  ) then
    alter table public.leads
      add constraint leads_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_client_id_fkey'
  ) then
    alter table public.events
      add constraint events_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end $$;

create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  event_type text not null,
  description text,
  default_guest_count integer not null default 0,
  default_client_price numeric(12,2) not null default 0,
  timeline_notes text,
  internal_notes text,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_template_id uuid references public.event_templates(id) on delete cascade,
  title text not null,
  description text,
  priority public.task_priority not null default 'Medium',
  due_offset_days integer not null default 0,
  checklist_items jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_template_id uuid references public.event_templates(id) on delete cascade,
  category public.budget_category not null,
  description text not null,
  planned_amount numeric(12,2) not null default 0,
  margin_estimate numeric(12,2) not null default 0,
  due_offset_days integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_template_id uuid references public.event_templates(id) on delete cascade,
  type public.approval_type not null,
  title text not null,
  description text,
  due_offset_days integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_template_id uuid references public.event_templates(id) on delete cascade,
  service_category public.budget_category not null,
  preferred_vendor_id uuid references public.vendors(id) on delete set null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_timeline_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  start_time time not null,
  end_time time,
  owner_id uuid references public.users(id) on delete set null,
  depends_on_item_id uuid references public.event_timeline_items(id) on delete set null,
  status public.timeline_item_status not null default 'Planned',
  location text,
  visibility public.message_visibility not null default 'Internal',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_organization_status_idx on public.clients(organization_id, status);
create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists leads_client_id_idx on public.leads(client_id);
create index if not exists events_client_id_idx on public.events(client_id);
create index if not exists event_templates_organization_active_idx on public.event_templates(organization_id, is_active);
create index if not exists task_templates_event_template_id_idx on public.task_templates(event_template_id);
create index if not exists budget_templates_event_template_id_idx on public.budget_templates(event_template_id);
create index if not exists approval_templates_event_template_id_idx on public.approval_templates(event_template_id);
create index if not exists vendor_templates_event_template_id_idx on public.vendor_templates(event_template_id);
create index if not exists event_timeline_items_event_time_idx on public.event_timeline_items(event_id, start_time, sort_order);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists set_event_templates_updated_at on public.event_templates;
create trigger set_event_templates_updated_at before update on public.event_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_templates_updated_at on public.task_templates;
create trigger set_task_templates_updated_at before update on public.task_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_budget_templates_updated_at on public.budget_templates;
create trigger set_budget_templates_updated_at before update on public.budget_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_approval_templates_updated_at on public.approval_templates;
create trigger set_approval_templates_updated_at before update on public.approval_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_vendor_templates_updated_at on public.vendor_templates;
create trigger set_vendor_templates_updated_at before update on public.vendor_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_event_timeline_items_updated_at on public.event_timeline_items;
create trigger set_event_timeline_items_updated_at before update on public.event_timeline_items
  for each row execute function public.set_updated_at();

with candidates as (
  select
    organization_id,
    client_name as display_name,
    client_email as email,
    client_phone as phone,
    'Active'::public.client_status as status,
    'Existing event'::text as source,
    min(created_at) as created_at,
    1 as priority
  from public.events
  where client_email is not null and client_email <> ''
  group by organization_id, client_name, client_email, client_phone
  union all
  select
    organization_id,
    client_name as display_name,
    email,
    phone,
    case when stage = 'Lost' then 'Archived'::public.client_status else 'Prospect'::public.client_status end as status,
    source,
    min(created_at) as created_at,
    2 as priority
  from public.leads
  where email is not null and email <> ''
  group by organization_id, client_name, email, phone, stage, source
),
deduped as (
  select distinct on (organization_id, lower(email))
    organization_id,
    display_name,
    email,
    phone,
    status,
    source,
    created_at
  from candidates
  order by organization_id, lower(email), priority, created_at
)
insert into public.clients (
  organization_id,
  display_name,
  email,
  phone,
  status,
  source,
  created_at,
  updated_at
)
select
  organization_id,
  display_name,
  email,
  phone,
  status,
  source,
  created_at,
  now()
from deduped
on conflict do nothing;

update public.clients client
set user_id = users.id
from public.users users
where client.user_id is null
  and users.organization_id = client.organization_id
  and lower(users.email) = lower(client.email);

update public.events event
set client_id = client.id
from public.clients client
where event.client_id is null
  and client.organization_id = event.organization_id
  and lower(client.email) = lower(event.client_email);

update public.leads lead
set client_id = client.id
from public.clients client
where lead.client_id is null
  and client.organization_id = lead.organization_id
  and lower(client.email) = lower(lead.email);

alter table public.clients enable row level security;
alter table public.event_templates enable row level security;
alter table public.task_templates enable row level security;
alter table public.budget_templates enable row level security;
alter table public.approval_templates enable row level security;
alter table public.vendor_templates enable row level security;
alter table public.event_timeline_items enable row level security;

drop policy if exists "org members read clients" on public.clients;
create policy "org members read clients" on public.clients
  for select using (
    organization_id = public.current_organization_id()
    and (public.is_staff() or user_id = auth.uid())
  );

drop policy if exists "staff manage clients" on public.clients;
create policy "staff manage clients" on public.clients
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read event templates" on public.event_templates;
create policy "org members read event templates" on public.event_templates
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage event templates" on public.event_templates;
create policy "staff manage event templates" on public.event_templates
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read task templates" on public.task_templates;
create policy "org members read task templates" on public.task_templates
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage task templates" on public.task_templates;
create policy "staff manage task templates" on public.task_templates
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read budget templates" on public.budget_templates;
create policy "org members read budget templates" on public.budget_templates
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage budget templates" on public.budget_templates;
create policy "staff manage budget templates" on public.budget_templates
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read approval templates" on public.approval_templates;
create policy "org members read approval templates" on public.approval_templates
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage approval templates" on public.approval_templates;
create policy "staff manage approval templates" on public.approval_templates
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read vendor templates" on public.vendor_templates;
create policy "org members read vendor templates" on public.vendor_templates
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage vendor templates" on public.vendor_templates;
create policy "staff manage vendor templates" on public.vendor_templates
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read event timeline items" on public.event_timeline_items;
create policy "org members read event timeline items" on public.event_timeline_items
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage event timeline items" on public.event_timeline_items;
create policy "staff manage event timeline items" on public.event_timeline_items
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());
