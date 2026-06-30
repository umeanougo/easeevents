create extension if not exists pgcrypto;

do $$ begin
  create type public.project_stage as enum (
    'Inquiry',
    'Consultation',
    'Proposal',
    'Booked',
    'Planning',
    'Finalization',
    'Event Day',
    'Post-Event',
    'Completed',
    'Lost'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.email_template_type as enum (
    'inquiry_acknowledgment',
    'consultation_follow_up',
    'proposal_sent',
    'booking_confirmation',
    'payment_reminder',
    'general'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.project_activity_type as enum (
    'system',
    'email',
    'call',
    'note',
    'meeting',
    'file',
    'task',
    'status'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  owner_id uuid references public.users(id) on delete set null,
  name text not null,
  stage public.project_stage not null default 'Inquiry',
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_has_context check (lead_id is not null or event_id is not null)
);

create unique index if not exists projects_lead_id_unique_idx
  on public.projects(lead_id)
  where lead_id is not null;

create unique index if not exists projects_event_id_unique_idx
  on public.projects(event_id)
  where event_id is not null;

create index if not exists projects_organization_stage_idx
  on public.projects(organization_id, stage, last_activity_at desc);

alter table public.leads add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.events add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.communication_threads add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.communication_threads add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.communication_messages add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.communication_messages add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.meetings add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.meetings add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.meeting_notes add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.meeting_notes add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.files add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.files add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.files add column if not exists original_filename text;
alter table public.files add column if not exists caption text;
alter table public.tasks add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.tasks add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.comments add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.comments add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.invoices add column if not exists project_id uuid references public.projects(id) on delete set null;

alter table public.communication_threads alter column event_id drop not null;
alter table public.communication_messages alter column event_id drop not null;
alter table public.meetings alter column event_id drop not null;
alter table public.files alter column event_id drop not null;
alter table public.tasks alter column event_id drop not null;
alter table public.comments alter column event_id drop not null;

create table if not exists public.project_inspiration_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  label text,
  url text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null,
  url text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_id uuid references public.files(id) on delete cascade,
  label text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  template_type public.email_template_type not null default 'general',
  subject text not null,
  body text not null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_templates_default_type_idx
  on public.email_templates(organization_id, template_type)
  where is_default and is_active;

create table if not exists public.project_activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  activity_type public.project_activity_type not null default 'system',
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  assigned_to_id uuid references public.users(id) on delete set null,
  title text not null,
  due_at timestamptz,
  status text not null default 'Open',
  automation_source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_reminders_status_check check (status in ('Open', 'Done', 'Dismissed'))
);

create index if not exists leads_project_id_idx on public.leads(project_id);
create index if not exists events_project_id_idx on public.events(project_id);
create index if not exists communication_threads_project_idx on public.communication_threads(project_id, last_activity_at desc);
create index if not exists communication_messages_project_idx on public.communication_messages(project_id, sent_at desc);
create index if not exists meetings_project_idx on public.meetings(project_id, start_at desc);
create index if not exists meeting_notes_project_idx on public.meeting_notes(project_id, started_at desc);
create index if not exists files_project_idx on public.files(project_id, created_at desc);
create index if not exists tasks_project_idx on public.tasks(project_id, due_date);
create index if not exists project_inspiration_links_project_idx on public.project_inspiration_links(project_id, created_at desc);
create index if not exists task_links_task_idx on public.task_links(task_id, created_at desc);
create index if not exists task_attachments_task_idx on public.task_attachments(task_id, created_at desc);
create index if not exists project_activity_events_project_idx on public.project_activity_events(project_id, created_at desc);
create index if not exists project_reminders_project_idx on public.project_reminders(project_id, status, due_at);

insert into public.projects (
  organization_id,
  lead_id,
  event_id,
  client_id,
  owner_id,
  name,
  stage,
  last_activity_at,
  created_at
)
select
  event.organization_id,
  event.lead_id,
  event.id,
  event.client_id,
  event.planner_id,
  event.event_name,
  case
    when event.status = 'Completed' then 'Completed'::public.project_stage
    when event.status = 'In Progress' then 'Event Day'::public.project_stage
    when event.status = 'Confirmed' then 'Finalization'::public.project_stage
    else 'Planning'::public.project_stage
  end,
  event.updated_at,
  event.created_at
from public.events event
where not exists (
  select 1 from public.projects project where project.event_id = event.id
);

insert into public.projects (
  organization_id,
  lead_id,
  client_id,
  owner_id,
  name,
  stage,
  last_activity_at,
  created_at
)
select
  lead.organization_id,
  lead.id,
  lead.client_id,
  lead.owner_id,
  coalesce(lead.client_name_snapshot, 'Inquiry') || ' ' || lead.event_type,
  case
    when lead.stage = 'Consultation Scheduled' then 'Consultation'::public.project_stage
    when lead.stage = 'Proposal Sent' then 'Proposal'::public.project_stage
    when lead.stage = 'Booked' then 'Booked'::public.project_stage
    when lead.stage = 'Lost' then 'Lost'::public.project_stage
    else 'Inquiry'::public.project_stage
  end,
  lead.updated_at,
  lead.created_at
from public.leads lead
where lead.converted_event_id is null
  and not exists (
    select 1 from public.projects project where project.lead_id = lead.id
  );

update public.leads lead
set project_id = project.id
from public.projects project
where project.lead_id = lead.id
  and lead.project_id is distinct from project.id;

update public.events event
set project_id = project.id
from public.projects project
where project.event_id = event.id
  and event.project_id is distinct from project.id;

update public.projects project
set lead_id = coalesce(project.lead_id, event.lead_id),
    client_id = coalesce(project.client_id, event.client_id),
    owner_id = coalesce(project.owner_id, event.planner_id)
from public.events event
where project.event_id = event.id;

update public.communication_threads thread
set project_id = event.project_id,
    lead_id = event.lead_id
from public.events event
where thread.event_id = event.id
  and thread.project_id is null;

update public.communication_messages message
set project_id = thread.project_id,
    lead_id = thread.lead_id
from public.communication_threads thread
where message.thread_id = thread.id
  and message.project_id is null;

update public.meetings meeting
set project_id = event.project_id,
    lead_id = event.lead_id
from public.events event
where meeting.event_id = event.id
  and meeting.project_id is null;

update public.meeting_notes note
set project_id = event.project_id,
    lead_id = event.lead_id
from public.events event
where note.event_id = event.id
  and note.project_id is null;

update public.files file
set project_id = event.project_id,
    lead_id = event.lead_id,
    original_filename = coalesce(file.original_filename, file.name)
from public.events event
where file.event_id = event.id
  and file.project_id is null;

update public.tasks task
set project_id = event.project_id,
    lead_id = event.lead_id
from public.events event
where task.event_id = event.id
  and task.project_id is null;

update public.comments comment
set project_id = event.project_id,
    lead_id = event.lead_id
from public.events event
where comment.event_id = event.id
  and comment.project_id is null;

update public.invoices invoice
set project_id = event.project_id
from public.events event
where invoice.event_id = event.id
  and invoice.project_id is null;

alter table public.communication_threads
  drop constraint if exists communication_threads_project_context_check,
  add constraint communication_threads_project_context_check
    check (project_id is not null or event_id is not null);

alter table public.communication_messages
  drop constraint if exists communication_messages_project_context_check,
  add constraint communication_messages_project_context_check
    check (project_id is not null or event_id is not null);

alter table public.meetings
  drop constraint if exists meetings_project_context_check,
  add constraint meetings_project_context_check
    check (project_id is not null or event_id is not null);

alter table public.files
  drop constraint if exists files_project_context_check,
  add constraint files_project_context_check
    check (project_id is not null or event_id is not null);

alter table public.tasks
  drop constraint if exists tasks_project_context_check,
  add constraint tasks_project_context_check
    check (project_id is not null or event_id is not null);

alter table public.comments
  drop constraint if exists comments_project_context_check,
  add constraint comments_project_context_check
    check (project_id is not null or event_id is not null);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_project_inspiration_links_updated_at on public.project_inspiration_links;
create trigger set_project_inspiration_links_updated_at before update on public.project_inspiration_links
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_links_updated_at on public.task_links;
create trigger set_task_links_updated_at before update on public.task_links
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_attachments_updated_at on public.task_attachments;
create trigger set_task_attachments_updated_at before update on public.task_attachments
  for each row execute function public.set_updated_at();

drop trigger if exists set_email_templates_updated_at on public.email_templates;
create trigger set_email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_project_reminders_updated_at on public.project_reminders;
create trigger set_project_reminders_updated_at before update on public.project_reminders
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_inspiration_links enable row level security;
alter table public.task_links enable row level security;
alter table public.task_attachments enable row level security;
alter table public.email_templates enable row level security;
alter table public.project_activity_events enable row level security;
alter table public.project_reminders enable row level security;

drop policy if exists "org members read projects" on public.projects;
create policy "org members read projects" on public.projects
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage projects" on public.projects;
create policy "staff manage projects" on public.projects
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read project inspiration" on public.project_inspiration_links;
create policy "org members read project inspiration" on public.project_inspiration_links
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage project inspiration" on public.project_inspiration_links;
create policy "staff manage project inspiration" on public.project_inspiration_links
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read task links" on public.task_links;
create policy "org members read task links" on public.task_links
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage task links" on public.task_links;
create policy "staff manage task links" on public.task_links
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read task attachments" on public.task_attachments;
create policy "org members read task attachments" on public.task_attachments
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage task attachments" on public.task_attachments;
create policy "staff manage task attachments" on public.task_attachments
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read email templates" on public.email_templates;
create policy "org members read email templates" on public.email_templates
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage email templates" on public.email_templates;
create policy "staff manage email templates" on public.email_templates
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read project activity" on public.project_activity_events;
create policy "org members read project activity" on public.project_activity_events
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage project activity" on public.project_activity_events;
create policy "staff manage project activity" on public.project_activity_events
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read project reminders" on public.project_reminders;
create policy "org members read project reminders" on public.project_reminders
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage project reminders" on public.project_reminders;
create policy "staff manage project reminders" on public.project_reminders
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into public.email_templates (
  organization_id,
  name,
  template_type,
  subject,
  body,
  is_active,
  is_default,
  metadata
)
select
  organization.id,
  'Inquiry acknowledgment',
  'inquiry_acknowledgment',
  'We received your {{event_type}} inquiry',
  'Hi {{client_name}},

Thank you for reaching out to {{organization_name}} about your {{event_type}}.

We received your inquiry for {{event_date}} and will review the details shortly. {{consultation_link}}

In the meantime, our team can help with event planning, decor, vendor coordination, budgets, approvals, and day-of execution.

Warmly,
{{organization_name}}',
  true,
  true,
  jsonb_build_object('seeded', true)
from public.organizations organization
where not exists (
  select 1
  from public.email_templates template
  where template.organization_id = organization.id
    and template.template_type = 'inquiry_acknowledgment'
    and template.is_default
);
