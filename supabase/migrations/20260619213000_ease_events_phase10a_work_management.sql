create extension if not exists pgcrypto;

do $$ begin
  create type public.task_normalized_status as enum (
    'Not Started',
    'Active',
    'Waiting',
    'Blocked',
    'Completed',
    'Cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_visibility as enum (
    'Internal',
    'Client',
    'Vendor'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_participant_role as enum (
    'Assignee',
    'Watcher',
    'Mentioned'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_inbox_status as enum (
    'New',
    'Triaged',
    'Converted',
    'Snoozed',
    'Dismissed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.task_workflow_columns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  normalized_status public.task_normalized_status not null default 'Not Started',
  mapped_task_status public.task_status not null default 'To Do',
  sort_order integer not null default 0,
  wip_limit integer,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_id, name)
);

alter table public.tasks
  add column if not exists work_type text not null default 'project',
  add column if not exists workflow_column_id uuid references public.task_workflow_columns(id) on delete set null,
  add column if not exists normalized_status public.task_normalized_status not null default 'Not Started',
  add column if not exists position numeric(20,6) not null default 1000,
  add column if not exists start_at timestamptz,
  add column if not exists due_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id) on delete set null,
  add column if not exists visibility public.task_visibility not null default 'Internal',
  add column if not exists card_cover_file_id uuid references public.files(id) on delete set null,
  add column if not exists estimated_effort_minutes integer,
  add column if not exists actual_effort_minutes integer,
  add column if not exists source_type text,
  add column if not exists source_record_id uuid,
  add column if not exists source_url text,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists created_by uuid references public.users(id) on delete set null,
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.tasks
  drop constraint if exists tasks_work_type_check,
  add constraint tasks_work_type_check check (work_type in ('project', 'internal', 'inbox'));

alter table public.tasks
  drop constraint if exists tasks_effort_check,
  add constraint tasks_effort_check check (
    (estimated_effort_minutes is null or estimated_effort_minutes >= 0)
    and (actual_effort_minutes is null or actual_effort_minutes >= 0)
  );

alter table public.tasks
  drop constraint if exists tasks_project_context_check,
  add constraint tasks_project_context_check
    check (project_id is not null or event_id is not null or work_type = 'internal');

create unique index if not exists tasks_org_idempotency_idx
  on public.tasks(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists tasks_work_board_idx
  on public.tasks(organization_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), archived_at, workflow_column_id, position);

create index if not exists tasks_owner_due_idx
  on public.tasks(organization_id, owner_id, archived_at, due_date);

create index if not exists tasks_visibility_idx
  on public.tasks(organization_id, visibility, event_id, project_id);

create table if not exists public.task_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.task_label_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.task_labels(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, task_id, label_id)
);

create table if not exists public.task_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  participant_role public.task_participant_role not null,
  added_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, task_id, user_id, participant_role)
);

create table if not exists public.task_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null default 'Checklist',
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_checklist_items
  add column if not exists checklist_id uuid references public.task_checklists(id) on delete cascade,
  add column if not exists assignee_id uuid references public.users(id) on delete set null,
  add column if not exists due_at timestamptz,
  add column if not exists notes text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references public.users(id) on delete set null,
  add column if not exists converted_task_id uuid references public.tasks(id) on delete set null;

insert into public.task_checklists (organization_id, task_id, title, sort_order, metadata)
select task.organization_id, task.id, 'Checklist', 0, jsonb_build_object('backfilled', true)
from public.tasks task
where exists (
  select 1 from public.task_checklist_items item
  where item.task_id = task.id and item.checklist_id is null
)
and not exists (
  select 1 from public.task_checklists checklist
  where checklist.task_id = task.id
);

update public.task_checklist_items item
set checklist_id = checklist.id
from public.task_checklists checklist
where item.checklist_id is null
  and checklist.task_id = item.task_id
  and checklist.organization_id = item.organization_id;

alter table public.comments
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists mentions jsonb not null default '[]'::jsonb,
  add column if not exists edited_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.comments
  drop constraint if exists comments_project_context_check,
  add constraint comments_project_context_check
    check (project_id is not null or event_id is not null or task_id is not null);

create table if not exists public.task_saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  scope text not null default 'private',
  view_type text not null default 'board',
  filters jsonb not null default '{}'::jsonb,
  sort jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_saved_views_scope_check check (scope in ('private', 'team', 'organization'))
);

create table if not exists public.task_inbox_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  source_type text not null,
  source_table text,
  source_record_id uuid,
  source_url text,
  captured_by uuid references public.users(id) on delete set null,
  captured_at timestamptz not null default now(),
  raw_content text,
  summary text,
  suggested_project_id uuid references public.projects(id) on delete set null,
  suggested_title text,
  suggested_owner_id uuid references public.users(id) on delete set null,
  suggested_due_at timestamptz,
  suggested_status public.task_status not null default 'To Do',
  status public.task_inbox_status not null default 'New',
  converted_task_id uuid references public.tasks(id) on delete set null,
  snoozed_until timestamptz,
  dismissed_at timestamptz,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists task_inbox_items_org_key_idx
  on public.task_inbox_items(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists task_labels_org_active_idx on public.task_labels(organization_id, is_active, sort_order);
create index if not exists task_label_assignments_task_idx on public.task_label_assignments(organization_id, task_id);
create index if not exists task_participants_user_idx on public.task_participants(organization_id, user_id, participant_role);
create index if not exists task_checklists_task_idx on public.task_checklists(organization_id, task_id, sort_order);
create index if not exists task_checklist_items_assignee_idx on public.task_checklist_items(organization_id, assignee_id, due_at);
create index if not exists comments_task_idx on public.comments(organization_id, task_id, created_at desc);
create index if not exists task_saved_views_user_idx on public.task_saved_views(organization_id, user_id, scope);
create index if not exists task_inbox_items_status_idx on public.task_inbox_items(organization_id, status, captured_at desc);

drop trigger if exists set_task_workflow_columns_updated_at on public.task_workflow_columns;
create trigger set_task_workflow_columns_updated_at before update on public.task_workflow_columns
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_labels_updated_at on public.task_labels;
create trigger set_task_labels_updated_at before update on public.task_labels
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_checklists_updated_at on public.task_checklists;
create trigger set_task_checklists_updated_at before update on public.task_checklists
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_saved_views_updated_at on public.task_saved_views;
create trigger set_task_saved_views_updated_at before update on public.task_saved_views
  for each row execute function public.set_updated_at();

drop trigger if exists set_task_inbox_items_updated_at on public.task_inbox_items;
create trigger set_task_inbox_items_updated_at before update on public.task_inbox_items
  for each row execute function public.set_updated_at();

alter table public.task_workflow_columns enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_label_assignments enable row level security;
alter table public.task_participants enable row level security;
alter table public.task_checklists enable row level security;
alter table public.task_saved_views enable row level security;
alter table public.task_inbox_items enable row level security;

create or replace function public.can_read_task(task_row public.tasks)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    task_row.organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or (
        task_row.visibility = 'Client'
        and exists (
          select 1
          from public.events event
          left join public.clients client on client.id = event.client_id
          where event.id = task_row.event_id
            and event.organization_id = task_row.organization_id
            and (event.client_user_id = auth.uid() or client.user_id = auth.uid())
        )
      )
      or (
        task_row.visibility = 'Vendor'
        and exists (
          select 1
          from public.event_vendors assignment
          join public.vendors vendor on vendor.id = assignment.vendor_id
          join public.users app_user
            on lower(app_user.email) = lower(vendor.email)
            and app_user.organization_id = vendor.organization_id
          where assignment.event_id = task_row.event_id
            and assignment.organization_id = task_row.organization_id
            and app_user.id = auth.uid()
        )
      )
    );
$$;

drop policy if exists "org members read tasks" on public.tasks;
drop policy if exists "phase10a read tasks" on public.tasks;
create policy "phase10a read tasks" on public.tasks
  for select using (public.can_read_task(tasks));

drop policy if exists "org members read checklist" on public.task_checklist_items;
drop policy if exists "phase10a read checklist" on public.task_checklist_items;
create policy "phase10a read checklist" on public.task_checklist_items
  for select using (
    exists (
      select 1 from public.tasks task
      where task.id = task_checklist_items.task_id
        and public.can_read_task(task)
    )
  );

drop policy if exists "org members read task links" on public.task_links;
drop policy if exists "phase10a read task links" on public.task_links;
create policy "phase10a read task links" on public.task_links
  for select using (
    exists (
      select 1 from public.tasks task
      where task.id = task_links.task_id
        and public.can_read_task(task)
    )
  );

drop policy if exists "org members read task attachments" on public.task_attachments;
drop policy if exists "phase10a read task attachments" on public.task_attachments;
create policy "phase10a read task attachments" on public.task_attachments
  for select using (
    exists (
      select 1 from public.tasks task
      where task.id = task_attachments.task_id
        and public.can_read_task(task)
    )
  );

drop policy if exists "org members read comments" on public.comments;
drop policy if exists "phase10a read comments" on public.comments;
create policy "phase10a read comments" on public.comments
  for select using (
    organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or (
        task_id is not null
        and visibility <> 'Internal'
        and exists (
          select 1 from public.tasks task
          where task.id = comments.task_id
            and public.can_read_task(task)
        )
      )
      or (
        task_id is null
        and visibility <> 'Internal'
      )
    )
  );

drop policy if exists "staff read task workflow columns" on public.task_workflow_columns;
create policy "staff read task workflow columns" on public.task_workflow_columns
  for select using (organization_id = public.current_organization_id() and public.is_staff());
drop policy if exists "staff manage task workflow columns" on public.task_workflow_columns;
create policy "staff manage task workflow columns" on public.task_workflow_columns
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read task labels" on public.task_labels;
create policy "staff read task labels" on public.task_labels
  for select using (organization_id = public.current_organization_id() and public.is_staff());
drop policy if exists "staff manage task labels" on public.task_labels;
create policy "staff manage task labels" on public.task_labels
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read task label assignments" on public.task_label_assignments;
drop policy if exists "read task label assignments through task" on public.task_label_assignments;
create policy "read task label assignments through task" on public.task_label_assignments
  for select using (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.tasks task
      where task.id = task_label_assignments.task_id
        and public.can_read_task(task)
    )
  );
drop policy if exists "staff manage task label assignments" on public.task_label_assignments;
create policy "staff manage task label assignments" on public.task_label_assignments
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read task participants" on public.task_participants;
drop policy if exists "read task participants through task" on public.task_participants;
create policy "read task participants through task" on public.task_participants
  for select using (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.tasks task
      where task.id = task_participants.task_id
        and public.can_read_task(task)
    )
  );
drop policy if exists "staff manage task participants" on public.task_participants;
create policy "staff manage task participants" on public.task_participants
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read task checklists" on public.task_checklists;
drop policy if exists "read task checklists through task" on public.task_checklists;
create policy "read task checklists through task" on public.task_checklists
  for select using (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.tasks task
      where task.id = task_checklists.task_id
        and public.can_read_task(task)
    )
  );
drop policy if exists "staff manage task checklists" on public.task_checklists;
create policy "staff manage task checklists" on public.task_checklists
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read task saved views" on public.task_saved_views;
create policy "staff read task saved views" on public.task_saved_views
  for select using (
    organization_id = public.current_organization_id()
    and public.is_staff()
    and (scope <> 'private' or user_id = auth.uid())
  );
drop policy if exists "staff manage own task saved views" on public.task_saved_views;
create policy "staff manage own task saved views" on public.task_saved_views
  for all using (
    organization_id = public.current_organization_id()
    and public.is_staff()
    and (user_id = auth.uid() or public.current_user_role() = 'admin')
  )
  with check (
    organization_id = public.current_organization_id()
    and public.is_staff()
    and (user_id = auth.uid() or public.current_user_role() = 'admin')
  );

drop policy if exists "staff read task inbox" on public.task_inbox_items;
create policy "staff read task inbox" on public.task_inbox_items
  for select using (organization_id = public.current_organization_id() and public.is_staff());
drop policy if exists "staff manage task inbox" on public.task_inbox_items;
create policy "staff manage task inbox" on public.task_inbox_items
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into public.task_workflow_columns (
  organization_id,
  project_id,
  name,
  normalized_status,
  mapped_task_status,
  sort_order,
  is_default,
  metadata
)
select organization.id, null, preset.name, preset.normalized_status::public.task_normalized_status,
  preset.mapped_status::public.task_status, preset.sort_order, true,
  jsonb_build_object('preset_key', preset.preset_key, 'phase', 'phase10a')
from public.organizations organization
cross join (
  values
    ('backlog', 'Backlog', 'Not Started', 'To Do', 10),
    ('todo', 'To Do', 'Not Started', 'To Do', 20),
    ('in_progress', 'In Progress', 'Active', 'In Progress', 30),
    ('waiting', 'Waiting', 'Waiting', 'In Progress', 40),
    ('blocked', 'Blocked', 'Blocked', 'Blocked', 50),
    ('done', 'Done', 'Completed', 'Done', 60)
) as preset(preset_key, name, normalized_status, mapped_status, sort_order)
where not exists (
  select 1 from public.task_workflow_columns column_record
  where column_record.organization_id = organization.id
    and column_record.project_id is null
    and column_record.name = preset.name
);

insert into public.task_labels (organization_id, name, color, description, sort_order)
select organization.id, preset.name, preset.color, preset.description, preset.sort_order
from public.organizations organization
cross join (
  values
    ('Client', '#0ea5e9', 'Client-visible or client-dependent work.', 10),
    ('Vendor', '#f59e0b', 'Vendor coordination or vendor-dependent work.', 20),
    ('Event Day', '#ef4444', 'Work that affects event-day readiness.', 30),
    ('Finance', '#10b981', 'Invoices, expenses, payments, or reconciliation.', 40),
    ('Design', '#a855f7', 'Design, decor, moodboard, or creative production.', 50)
) as preset(name, color, description, sort_order)
where not exists (
  select 1 from public.task_labels label
  where label.organization_id = organization.id
    and label.name = preset.name
);

update public.tasks task
set normalized_status = case task.status
  when 'To Do' then 'Not Started'::public.task_normalized_status
  when 'In Progress' then 'Active'::public.task_normalized_status
  when 'Blocked' then 'Blocked'::public.task_normalized_status
  when 'Done' then 'Completed'::public.task_normalized_status
  else 'Not Started'::public.task_normalized_status
end
where task.normalized_status = 'Not Started'
  and task.status <> 'To Do';

update public.tasks task
set workflow_column_id = column_record.id
from public.task_workflow_columns column_record
where task.workflow_column_id is null
  and column_record.organization_id = task.organization_id
  and column_record.project_id is null
  and column_record.mapped_task_status = task.status
  and (
    (task.status <> 'In Progress' and column_record.name <> 'Waiting')
    or (task.status = 'In Progress' and column_record.name = 'In Progress')
  );
