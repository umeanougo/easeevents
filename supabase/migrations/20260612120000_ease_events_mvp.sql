create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'planner', 'client', 'vendor');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lead_stage as enum ('New Inquiry', 'Consultation Scheduled', 'Proposal Sent', 'Booked', 'Lost');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_status as enum ('Planning', 'Awaiting Client Approval', 'Confirmed', 'In Progress', 'Completed', 'Cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('To Do', 'In Progress', 'Blocked', 'Done');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_priority as enum ('Low', 'Medium', 'High', 'Urgent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.budget_category as enum ('Decor', 'Venue', 'Catering', 'Rentals', 'Florals', 'Photography', 'Entertainment', 'Staffing', 'Miscellaneous');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('Not Paid', 'Deposit Paid', 'Partially Paid', 'Paid', 'Overdue');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.approval_type as enum ('Budget', 'Moodboard', 'Timeline', 'Proposal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.approval_status as enum ('Pending', 'Approved', 'Changes Requested');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.file_category as enum ('Contracts', 'Inspiration Images', 'Receipts', 'Vendor Quotes', 'Event Documents');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.message_visibility as enum ('Internal', 'Client', 'Vendor');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  timezone text not null default 'America/Toronto',
  currency text not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid references public.users(id) on delete set null,
  stage public.lead_stage not null default 'New Inquiry',
  client_name text not null,
  email text not null,
  phone text,
  event_type text not null,
  event_date date,
  estimated_guest_count integer,
  budget_range text,
  notes text,
  source text,
  converted_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  client_user_id uuid references public.users(id) on delete set null,
  planner_id uuid references public.users(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  event_name text not null,
  event_type text not null,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  guest_count integer not null default 0,
  status public.event_status not null default 'Planning',
  client_price numeric(12,2) not null default 0,
  internal_notes text,
  timeline_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads
  drop constraint if exists leads_converted_event_id_fkey,
  add constraint leads_converted_event_id_fkey
    foreign key (converted_event_id) references public.events(id) on delete set null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid references public.users(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  status public.task_status not null default 'To Do',
  priority public.task_priority not null default 'Medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  service_category public.budget_category not null,
  contact_name text,
  email text,
  phone text,
  website text,
  notes text,
  rating integer check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  service_category public.budget_category not null,
  quoted_amount numeric(12,2) not null default 0,
  actual_amount numeric(12,2) not null default 0,
  payment_status public.payment_status not null default 'Not Paid',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, vendor_id, service_category)
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  category public.budget_category not null,
  description text not null,
  planned_amount numeric(12,2) not null default 0,
  actual_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  balance_due numeric(12,2) generated always as (greatest(actual_amount - paid_amount, 0)) stored,
  due_date date,
  margin_estimate numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  type public.approval_type not null,
  title text not null,
  description text,
  status public.approval_status not null default 'Pending',
  requested_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  due_date date,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  uploaded_by uuid references public.users(id) on delete set null,
  category public.file_category not null,
  bucket text not null default 'event-files',
  storage_path text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  visibility public.message_visibility not null default 'Client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  body text not null,
  visibility public.message_visibility not null default 'Internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_organization_id_idx on public.users(organization_id);
create index if not exists leads_organization_stage_idx on public.leads(organization_id, stage);
create index if not exists events_organization_date_idx on public.events(organization_id, event_date);
create index if not exists tasks_organization_status_due_idx on public.tasks(organization_id, status, due_date);
create index if not exists budget_items_event_id_idx on public.budget_items(event_id);
create index if not exists vendors_organization_category_idx on public.vendors(organization_id, service_category);
create index if not exists approvals_event_status_idx on public.approvals(event_id, status);
create index if not exists files_event_id_idx on public.files(event_id);
create index if not exists comments_event_id_idx on public.comments(event_id);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_checklist_items_updated_at on public.task_checklist_items;
create trigger set_task_checklist_items_updated_at before update on public.task_checklist_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_vendors_updated_at on public.vendors;
create trigger set_vendors_updated_at before update on public.vendors
  for each row execute function public.set_updated_at();

drop trigger if exists set_event_vendors_updated_at on public.event_vendors;
create trigger set_event_vendors_updated_at before update on public.event_vendors
  for each row execute function public.set_updated_at();

drop trigger if exists set_budget_items_updated_at on public.budget_items;
create trigger set_budget_items_updated_at before update on public.budget_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_approvals_updated_at on public.approvals;
create trigger set_approvals_updated_at before update on public.approvals
  for each row execute function public.set_updated_at();

drop trigger if exists set_files_updated_at on public.files;
create trigger set_files_updated_at before update on public.files
  for each row execute function public.set_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

create or replace function public.current_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.users where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('admin', 'planner')
$$;

create or replace function public.is_event_client(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.events
    where id = target_event_id
      and client_user_id = auth.uid()
  )
$$;

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.leads enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.vendors enable row level security;
alter table public.event_vendors enable row level security;
alter table public.budget_items enable row level security;
alter table public.approvals enable row level security;
alter table public.files enable row level security;
alter table public.comments enable row level security;

drop policy if exists "read own organization" on public.organizations;
create policy "read own organization" on public.organizations
  for select using (id = public.current_organization_id());

drop policy if exists "org admins update organization" on public.organizations;
create policy "org admins update organization" on public.organizations
  for update using (id = public.current_organization_id() and public.current_user_role() = 'admin')
  with check (id = public.current_organization_id() and public.current_user_role() = 'admin');

drop policy if exists "read organization users" on public.users;
create policy "read organization users" on public.users
  for select using (organization_id = public.current_organization_id() or id = auth.uid());

drop policy if exists "users update own profile" on public.users;
create policy "users update own profile" on public.users
  for update using (id = auth.uid() or public.current_user_role() = 'admin')
  with check (organization_id = public.current_organization_id());

drop policy if exists "admins insert users" on public.users;
create policy "admins insert users" on public.users
  for insert with check (organization_id = public.current_organization_id() and public.current_user_role() = 'admin');

drop policy if exists "staff manage leads" on public.leads;
create policy "staff manage leads" on public.leads
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "public can create lead inquiries" on public.leads;
create policy "public can create lead inquiries" on public.leads
  for insert
  with check (stage = 'New Inquiry' and converted_event_id is null);

drop policy if exists "org members read events" on public.events;
create policy "org members read events" on public.events
  for select using (
    organization_id = public.current_organization_id()
    and (public.is_staff() or client_user_id = auth.uid() or planner_id = auth.uid())
  );

drop policy if exists "staff manage events" on public.events;
create policy "staff manage events" on public.events
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read tasks" on public.tasks;
create policy "org members read tasks" on public.tasks
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage tasks" on public.tasks;
create policy "staff manage tasks" on public.tasks
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read checklist" on public.task_checklist_items;
create policy "org members read checklist" on public.task_checklist_items
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage checklist" on public.task_checklist_items;
create policy "staff manage checklist" on public.task_checklist_items
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read vendors" on public.vendors;
create policy "org members read vendors" on public.vendors
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage vendors" on public.vendors;
create policy "staff manage vendors" on public.vendors
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read event vendors" on public.event_vendors;
create policy "org members read event vendors" on public.event_vendors
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage event vendors" on public.event_vendors;
create policy "staff manage event vendors" on public.event_vendors
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read budget items" on public.budget_items;
create policy "org members read budget items" on public.budget_items
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage budget items" on public.budget_items;
create policy "staff manage budget items" on public.budget_items
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read approvals" on public.approvals;
create policy "org members read approvals" on public.approvals
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage approvals" on public.approvals;
create policy "staff manage approvals" on public.approvals
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "clients respond to own approvals" on public.approvals;
create policy "clients respond to own approvals" on public.approvals
  for update using (
    organization_id = public.current_organization_id()
    and public.is_event_client(event_id)
  )
  with check (
    organization_id = public.current_organization_id()
    and public.is_event_client(event_id)
  );

drop policy if exists "org members read files" on public.files;
create policy "org members read files" on public.files
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage files" on public.files;
create policy "staff manage files" on public.files
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read comments" on public.comments;
create policy "org members read comments" on public.comments
  for select using (organization_id = public.current_organization_id());

drop policy if exists "org members insert comments" on public.comments;
create policy "org members insert comments" on public.comments
  for insert with check (organization_id = public.current_organization_id());

drop policy if exists "staff update comments" on public.comments;
create policy "staff update comments" on public.comments
  for update using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into storage.buckets (id, name, public)
values ('event-files', 'event-files', false)
on conflict (id) do nothing;

drop policy if exists "org members read event storage" on storage.objects;
create policy "org members read event storage" on storage.objects
  for select using (
    bucket_id = 'event-files'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );

drop policy if exists "staff upload event storage" on storage.objects;
create policy "staff upload event storage" on storage.objects
  for insert with check (
    bucket_id = 'event-files'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.is_staff()
  );

drop policy if exists "staff update event storage" on storage.objects;
create policy "staff update event storage" on storage.objects
  for update using (
    bucket_id = 'event-files'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.is_staff()
  );

drop policy if exists "staff delete event storage" on storage.objects;
create policy "staff delete event storage" on storage.objects
  for delete using (
    bucket_id = 'event-files'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.is_staff()
  );
