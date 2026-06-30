create extension if not exists pgcrypto;

do $$ begin
  create type public.workflow_automation_status as enum (
    'Inactive',
    'Active',
    'Paused',
    'Archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workflow_execution_status as enum (
    'Queued',
    'Awaiting Approval',
    'Running',
    'Completed',
    'Failed',
    'Skipped',
    'Cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workflow_action_run_status as enum (
    'Queued',
    'Awaiting Approval',
    'Running',
    'Completed',
    'Failed',
    'Skipped',
    'Cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workflow_event_status as enum (
    'Pending',
    'Processed',
    'Failed',
    'Ignored'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_status as enum (
    'Unread',
    'Read',
    'Dismissed',
    'Archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_severity as enum (
    'Info',
    'Success',
    'Warning',
    'Critical'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.workflow_automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  status public.workflow_automation_status not null default 'Inactive',
  conditions jsonb not null default '[]'::jsonb,
  approval_policy text not null default 'automatic',
  quiet_hours jsonb not null default '{}'::jsonb,
  cooldown_minutes integer not null default 0,
  priority integer not null default 100,
  last_triggered_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_automations_approval_policy_check
    check (approval_policy in ('automatic', 'approval_required', 'draft_only')),
  constraint workflow_automations_cooldown_check check (cooldown_minutes >= 0)
);

create table if not exists public.workflow_automation_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid not null references public.workflow_automations(id) on delete cascade,
  action_type text not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  source_table text,
  source_record_id uuid,
  event_type text not null,
  status public.workflow_event_status not null default 'Pending',
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid references public.workflow_automations(id) on delete set null,
  workflow_event_id uuid references public.workflow_events(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  status public.workflow_execution_status not null default 'Queued',
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  error_message text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_executions_attempt_count_check check (attempt_count >= 0)
);

create table if not exists public.workflow_action_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_id uuid not null references public.workflow_executions(id) on delete cascade,
  automation_action_id uuid references public.workflow_automation_actions(id) on delete set null,
  action_type text not null,
  status public.workflow_action_run_status not null default 'Queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  output jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  workflow_execution_id uuid references public.workflow_executions(id) on delete set null,
  notification_type text not null,
  severity public.notification_severity not null default 'Info',
  status public.notification_status not null default 'Unread',
  title text not null,
  body text,
  href text,
  channel text not null default 'in_app',
  action_required boolean not null default false,
  due_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  dedupe_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_channel_check check (channel in ('in_app', 'email', 'sms', 'push'))
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  notification_type text not null,
  channel text not null default 'in_app',
  is_enabled boolean not null default true,
  quiet_hours jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_channel_check check (channel in ('in_app', 'email', 'sms', 'push'))
);

create unique index if not exists workflow_automations_org_preset_idx
  on public.workflow_automations(organization_id, ((metadata ->> 'preset_key')))
  where metadata ? 'preset_key';

create index if not exists workflow_automations_org_trigger_idx
  on public.workflow_automations(organization_id, trigger_type, status, priority);

create index if not exists workflow_automation_actions_automation_idx
  on public.workflow_automation_actions(automation_id, is_active, sort_order);

create unique index if not exists workflow_events_org_dedupe_idx
  on public.workflow_events(organization_id, dedupe_key);

create index if not exists workflow_events_org_status_idx
  on public.workflow_events(organization_id, status, occurred_at);

create index if not exists workflow_events_project_idx
  on public.workflow_events(project_id, occurred_at desc);

create unique index if not exists workflow_executions_org_idempotency_idx
  on public.workflow_executions(organization_id, idempotency_key);

create index if not exists workflow_executions_org_status_idx
  on public.workflow_executions(organization_id, status, scheduled_for, next_retry_at);

create index if not exists workflow_executions_project_idx
  on public.workflow_executions(project_id, created_at desc);

create unique index if not exists workflow_action_runs_org_idempotency_idx
  on public.workflow_action_runs(organization_id, idempotency_key);

create index if not exists workflow_action_runs_execution_idx
  on public.workflow_action_runs(execution_id, status);

create unique index if not exists notifications_org_dedupe_idx
  on public.notifications(organization_id, dedupe_key);

create index if not exists notifications_recipient_status_idx
  on public.notifications(recipient_user_id, status, created_at desc);

create index if not exists notifications_project_idx
  on public.notifications(project_id, created_at desc);

create unique index if not exists notification_preferences_user_type_channel_idx
  on public.notification_preferences(organization_id, user_id, notification_type, channel);

drop trigger if exists set_workflow_automations_updated_at on public.workflow_automations;
create trigger set_workflow_automations_updated_at before update on public.workflow_automations
  for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_automation_actions_updated_at on public.workflow_automation_actions;
create trigger set_workflow_automation_actions_updated_at before update on public.workflow_automation_actions
  for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_executions_updated_at on public.workflow_executions;
create trigger set_workflow_executions_updated_at before update on public.workflow_executions
  for each row execute function public.set_updated_at();

drop trigger if exists set_workflow_action_runs_updated_at on public.workflow_action_runs;
create trigger set_workflow_action_runs_updated_at before update on public.workflow_action_runs
  for each row execute function public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.workflow_automations enable row level security;
alter table public.workflow_automation_actions enable row level security;
alter table public.workflow_events enable row level security;
alter table public.workflow_executions enable row level security;
alter table public.workflow_action_runs enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "staff read workflow automations" on public.workflow_automations;
create policy "staff read workflow automations" on public.workflow_automations
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage workflow automations" on public.workflow_automations;
create policy "staff manage workflow automations" on public.workflow_automations
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read workflow automation actions" on public.workflow_automation_actions;
create policy "staff read workflow automation actions" on public.workflow_automation_actions
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage workflow automation actions" on public.workflow_automation_actions;
create policy "staff manage workflow automation actions" on public.workflow_automation_actions
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read workflow events" on public.workflow_events;
create policy "staff read workflow events" on public.workflow_events
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage workflow events" on public.workflow_events;
create policy "staff manage workflow events" on public.workflow_events
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read workflow executions" on public.workflow_executions;
create policy "staff read workflow executions" on public.workflow_executions
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage workflow executions" on public.workflow_executions;
create policy "staff manage workflow executions" on public.workflow_executions
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read workflow action runs" on public.workflow_action_runs;
create policy "staff read workflow action runs" on public.workflow_action_runs
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage workflow action runs" on public.workflow_action_runs;
create policy "staff manage workflow action runs" on public.workflow_action_runs
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read notifications" on public.notifications;
create policy "staff read notifications" on public.notifications
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "recipients read own notifications" on public.notifications;
create policy "recipients read own notifications" on public.notifications
  for select using (
    organization_id = public.current_organization_id()
    and recipient_user_id = auth.uid()
  );

drop policy if exists "staff manage notifications" on public.notifications;
create policy "staff manage notifications" on public.notifications
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "recipients update own notifications" on public.notifications;
create policy "recipients update own notifications" on public.notifications
  for update using (
    organization_id = public.current_organization_id()
    and recipient_user_id = auth.uid()
  )
  with check (
    organization_id = public.current_organization_id()
    and recipient_user_id = auth.uid()
  );

drop policy if exists "staff read notification preferences" on public.notification_preferences;
create policy "staff read notification preferences" on public.notification_preferences
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "users read own notification preferences" on public.notification_preferences;
create policy "users read own notification preferences" on public.notification_preferences
  for select using (
    organization_id = public.current_organization_id()
    and user_id = auth.uid()
  );

drop policy if exists "staff manage notification preferences" on public.notification_preferences;
create policy "staff manage notification preferences" on public.notification_preferences
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "users update own notification preferences" on public.notification_preferences;
create policy "users update own notification preferences" on public.notification_preferences
  for update using (
    organization_id = public.current_organization_id()
    and user_id = auth.uid()
  )
  with check (
    organization_id = public.current_organization_id()
    and user_id = auth.uid()
  );

insert into public.workflow_automations (
  organization_id,
  name,
  description,
  trigger_type,
  status,
  conditions,
  approval_policy,
  priority,
  metadata
)
select
  organization.id,
  preset.name,
  preset.description,
  preset.trigger_type,
  'Inactive'::public.workflow_automation_status,
  preset.conditions::jsonb,
  preset.approval_policy,
  preset.priority,
  jsonb_build_object('preset_key', preset.preset_key, 'seeded', true)
from public.organizations organization
cross join (
  values
    (
      'inquiry_follow_up',
      'Inquiry follow-up reminder',
      'When a new inquiry arrives, notify the project owner and create a follow-up reminder.',
      'inquiry_created',
      '[]',
      'automatic',
      10
    ),
    (
      'consultation_starting_soon',
      'Consultation starting soon',
      'Remind the assigned planner before a consultation starts.',
      'consultation_starting_soon',
      '[]',
      'automatic',
      20
    ),
    (
      'proposal_not_viewed',
      'Proposal not viewed follow-up',
      'Create a follow-up reminder when a sent proposal has not been viewed.',
      'proposal_not_viewed',
      '[]',
      'draft_only',
      30
    ),
    (
      'invoice_overdue',
      'Invoice overdue escalation',
      'Notify owner/planner when a client invoice becomes overdue.',
      'invoice_overdue',
      '[]',
      'automatic',
      40
    ),
    (
      'event_day_readiness',
      'Event-day readiness check',
      'Surface missing timeline, vendor, payment, and issue-readiness actions before event day.',
      'event_day_readiness_due',
      '[]',
      'automatic',
      50
    ),
    (
      'post_event_wrap_up',
      'Post-event wrap-up',
      'Create a wrap-up reminder after event completion for photos, vendor balances, and lessons learned.',
      'event_completed',
      '[]',
      'automatic',
      60
    )
) as preset(preset_key, name, description, trigger_type, conditions, approval_policy, priority)
where not exists (
  select 1
  from public.workflow_automations automation
  where automation.organization_id = organization.id
    and automation.metadata ->> 'preset_key' = preset.preset_key
);

insert into public.workflow_automation_actions (
  organization_id,
  automation_id,
  action_type,
  name,
  config,
  requires_approval,
  sort_order
)
select
  automation.organization_id,
  automation.id,
  action.action_type,
  action.name,
  action.config::jsonb,
  action.requires_approval,
  action.sort_order
from public.workflow_automations automation
join (
  values
    ('inquiry_follow_up', 'send_in_app_notification', 'Notify project owner', '{"recipient":"project_owner","severity":"Warning","title":"New inquiry needs qualification","body":"Review budget, guest count, inspiration, and consultation readiness."}', false, 10),
    ('inquiry_follow_up', 'create_reminder', 'Create inquiry follow-up reminder', '{"title":"Follow up on new inquiry","delay_hours":24,"assign_to":"project_owner"}', false, 20),
    ('consultation_starting_soon', 'send_in_app_notification', 'Consultation reminder', '{"recipient":"project_owner","severity":"Info","title":"Consultation starting soon","body":"Open the project workspace, notes, and meeting link."}', false, 10),
    ('proposal_not_viewed', 'create_reminder', 'Create proposal follow-up draft task', '{"title":"Follow up on proposal if not viewed","delay_hours":48,"assign_to":"project_owner"}', true, 10),
    ('invoice_overdue', 'send_in_app_notification', 'Overdue invoice notification', '{"recipient":"project_owner","severity":"Critical","title":"Invoice overdue","body":"Review payment status and follow up with the client."}', false, 10),
    ('event_day_readiness', 'send_in_app_notification', 'Event-day readiness alert', '{"recipient":"project_owner","severity":"Warning","title":"Event-day readiness check due","body":"Review run-of-show, vendor status, payments, and open issues."}', false, 10),
    ('post_event_wrap_up', 'create_reminder', 'Create post-event wrap-up reminder', '{"title":"Complete post-event wrap-up","delay_hours":24,"assign_to":"project_owner"}', false, 10)
) as action(preset_key, action_type, name, config, requires_approval, sort_order)
  on automation.metadata ->> 'preset_key' = action.preset_key
where not exists (
  select 1
  from public.workflow_automation_actions existing
  where existing.automation_id = automation.id
    and existing.action_type = action.action_type
    and existing.name = action.name
);
