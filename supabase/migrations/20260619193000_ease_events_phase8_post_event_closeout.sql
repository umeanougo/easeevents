create extension if not exists pgcrypto;

alter type public.event_status add value if not exists 'Event Day Completed' after 'Event Day';
alter type public.event_status add value if not exists 'Closeout In Progress' after 'Event Day Completed';
alter type public.event_status add value if not exists 'Awaiting Client Deliverables' after 'Closeout In Progress';
alter type public.event_status add value if not exists 'Financial Reconciliation' after 'Awaiting Client Deliverables';
alter type public.event_status add value if not exists 'Ready to Close' after 'Financial Reconciliation';
alter type public.event_status add value if not exists 'Closed' after 'Ready to Close';
alter type public.event_status add value if not exists 'Reopened' after 'Closed';

alter type public.email_template_type add value if not exists 'feedback_request';
alter type public.email_template_type add value if not exists 'review_request';
alter type public.email_template_type add value if not exists 'deliverable_notification';

do $$ begin
  create type public.post_event_closeout_status as enum (
    'Event Day Completed',
    'Closeout In Progress',
    'Awaiting Client Deliverables',
    'Financial Reconciliation',
    'Ready to Close',
    'Closed',
    'Reopened',
    'Cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.closeout_readiness_status as enum (
    'Not Started',
    'In Progress',
    'Blocked',
    'Ready',
    'Complete',
    'Deferred',
    'Overridden'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.closeout_requirement_level as enum (
    'Required',
    'Recommended',
    'Informational'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.closeout_deliverable_status as enum (
    'Draft',
    'Awaiting Upload',
    'Ready',
    'Delivered',
    'Viewed',
    'Acknowledged',
    'Replaced',
    'Expired'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.client_consent_type as enum (
    'Service Feedback',
    'Public Review',
    'Testimonial',
    'Photo/Video Portfolio',
    'Marketing Communication'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.client_consent_status as enum (
    'Not Requested',
    'Requested',
    'Granted',
    'Declined',
    'Revoked',
    'Expired'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.organization_closeout_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  closeout_due_days integer not null default 7,
  require_vendor_reviews boolean not null default true,
  require_internal_retrospective boolean not null default true,
  require_feedback_request boolean not null default false,
  require_financial_review boolean not null default true,
  public_review_link text,
  public_review_requests_enabled boolean not null default false,
  default_retention_policy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_closeout_settings_due_check check (closeout_due_days >= 0)
);

create table if not exists public.post_event_closeouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status public.post_event_closeout_status not null default 'Closeout In Progress',
  owner_id uuid references public.users(id) on delete set null,
  event_completed_at timestamptz,
  closeout_started_at timestamptz,
  ready_to_close_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references public.users(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references public.users(id) on delete set null,
  reopen_reason text,
  completion_percentage numeric(5,2) not null default 0,
  unresolved_issue_count integer not null default 0,
  financial_status public.closeout_readiness_status not null default 'Not Started',
  deliverable_status public.closeout_readiness_status not null default 'Not Started',
  feedback_status public.closeout_readiness_status not null default 'Not Started',
  vendor_review_status public.closeout_readiness_status not null default 'Not Started',
  internal_review_status public.closeout_readiness_status not null default 'Not Started',
  retention_status public.closeout_readiness_status not null default 'Not Started',
  final_notes text,
  retention_handoff jsonb not null default '{}'::jsonb,
  readiness_overrides jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_event_closeouts_completion_check
    check (completion_percentage >= 0 and completion_percentage <= 100),
  constraint post_event_closeouts_unresolved_check check (unresolved_issue_count >= 0)
);

create unique index if not exists post_event_closeouts_org_event_unique_idx
  on public.post_event_closeouts(organization_id, event_id);

create index if not exists post_event_closeouts_org_status_idx
  on public.post_event_closeouts(organization_id, status, updated_at desc);

create table if not exists public.post_event_closeout_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  closeout_id uuid not null references public.post_event_closeouts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  group_name text not null,
  title text not null,
  requirement_level public.closeout_requirement_level not null default 'Recommended',
  status public.closeout_readiness_status not null default 'Not Started',
  owner_id uuid references public.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.users(id) on delete set null,
  notes text,
  linked_task_id uuid references public.tasks(id) on delete set null,
  linked_file_id uuid references public.files(id) on delete set null,
  linked_invoice_id uuid references public.invoices(id) on delete set null,
  linked_expense_id uuid references public.expenses(id) on delete set null,
  override_reason text,
  sort_order integer not null default 0,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists post_event_closeout_items_org_key_idx
  on public.post_event_closeout_items(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists post_event_closeout_items_closeout_idx
  on public.post_event_closeout_items(closeout_id, group_name, status, sort_order);

create table if not exists public.final_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  closeout_id uuid references public.post_event_closeouts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  file_id uuid references public.files(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'Other',
  external_url text,
  client_visible boolean not null default false,
  status public.closeout_deliverable_status not null default 'Draft',
  due_date date,
  delivered_at timestamptz,
  delivered_by uuid references public.users(id) on delete set null,
  viewed_at timestamptz,
  acknowledged_at timestamptz,
  expires_at timestamptz,
  access_state text not null default 'Available',
  sort_order integer not null default 0,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint final_deliverables_link_check check (file_id is not null or external_url is not null)
);

create unique index if not exists final_deliverables_org_key_idx
  on public.final_deliverables(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists final_deliverables_project_idx
  on public.final_deliverables(project_id, client_visible, status, due_date);

create table if not exists public.client_feedback_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  closeout_id uuid references public.post_event_closeouts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  submitted_by uuid references public.users(id) on delete set null,
  responder_name text,
  responder_email text,
  overall_satisfaction integer check (overall_satisfaction between 1 and 5),
  communication_rating integer check (communication_rating between 1 and 5),
  planning_process_rating integer check (planning_process_rating between 1 and 5),
  execution_rating integer check (execution_rating between 1 and 5),
  value_rating integer check (value_rating between 1 and 5),
  likelihood_to_recommend integer check (likelihood_to_recommend between 1 and 5),
  what_went_well text,
  what_could_improve text,
  additional_comments text,
  permission_to_contact boolean not null default false,
  concern_level text not null default 'None',
  service_recovery_status text not null default 'Not Required',
  submitted_at timestamptz not null default now(),
  response_token_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_feedback_concern_level_check
    check (concern_level in ('None', 'Low', 'Medium', 'High')),
  constraint client_feedback_recovery_status_check
    check (service_recovery_status in ('Not Required', 'Open', 'In Review', 'Resolved'))
);

create unique index if not exists client_feedback_one_active_project_idx
  on public.client_feedback_responses(organization_id, project_id, client_id)
  where client_id is not null;

create index if not exists client_feedback_project_idx
  on public.client_feedback_responses(project_id, submitted_at desc);

create table if not exists public.client_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  consent_type public.client_consent_type not null,
  status public.client_consent_status not null default 'Not Requested',
  consent_wording_version text not null default 'v1',
  requested_at timestamptz,
  granted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  source text,
  captured_by uuid references public.users(id) on delete set null,
  evidence_file_id uuid references public.files(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_consents_project_type_idx
  on public.client_consents(organization_id, project_id, client_id, consent_type);

create table if not exists public.vendor_performance_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  event_vendor_id uuid references public.event_vendors(id) on delete set null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  reviewer_id uuid references public.users(id) on delete set null,
  overall_rating integer check (overall_rating between 1 and 5),
  communication_rating integer check (communication_rating between 1 and 5),
  punctuality_rating integer check (punctuality_rating between 1 and 5),
  quality_rating integer check (quality_rating between 1 and 5),
  budget_accuracy_rating integer check (budget_accuracy_rating between 1 and 5),
  professionalism_rating integer check (professionalism_rating between 1 and 5),
  issue_count integer not null default 0 check (issue_count >= 0),
  would_use_again boolean,
  preferred_vendor_recommendation text,
  operational_context jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vendor_performance_reviews_assignment_idx
  on public.vendor_performance_reviews(organization_id, event_vendor_id)
  where event_vendor_id is not null;

create index if not exists vendor_performance_reviews_vendor_idx
  on public.vendor_performance_reviews(organization_id, vendor_id, created_at desc);

create table if not exists public.internal_retrospectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  closeout_id uuid references public.post_event_closeouts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status public.closeout_readiness_status not null default 'Not Started',
  facilitator_id uuid references public.users(id) on delete set null,
  contributors jsonb not null default '[]'::jsonb,
  what_went_well text,
  what_did_not_go_well text,
  major_delays text,
  client_request_changes text,
  vendor_issues text,
  team_issues text,
  budget_lessons text,
  scheduling_lessons text,
  venue_lessons text,
  process_improvements text,
  template_changes_recommended text,
  reusable_ideas text,
  risks_to_avoid text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  ai_summary text,
  ai_summary_generated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists internal_retrospectives_project_idx
  on public.internal_retrospectives(organization_id, project_id);

create table if not exists public.closeout_financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  closeout_id uuid not null references public.post_event_closeouts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  version_number integer not null default 1,
  contracted_revenue numeric(12,2) not null default 0,
  invoiced_revenue numeric(12,2) not null default 0,
  collected_revenue numeric(12,2) not null default 0,
  outstanding_client_balance numeric(12,2) not null default 0,
  planned_cost numeric(12,2) not null default 0,
  incurred_cost numeric(12,2) not null default 0,
  paid_cost numeric(12,2) not null default 0,
  outstanding_vendor_balance numeric(12,2) not null default 0,
  forecast_profit numeric(12,2) not null default 0,
  final_operating_margin numeric(8,2) not null default 0,
  cash_position numeric(12,2) not null default 0,
  calculation_version text not null default 'phase4-v1',
  generated_by uuid references public.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, closeout_id, version_number)
);

create index if not exists closeout_financial_snapshots_project_idx
  on public.closeout_financial_snapshots(project_id, version_number desc);

drop trigger if exists set_organization_closeout_settings_updated_at on public.organization_closeout_settings;
create trigger set_organization_closeout_settings_updated_at before update on public.organization_closeout_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_post_event_closeouts_updated_at on public.post_event_closeouts;
create trigger set_post_event_closeouts_updated_at before update on public.post_event_closeouts
  for each row execute function public.set_updated_at();

drop trigger if exists set_post_event_closeout_items_updated_at on public.post_event_closeout_items;
create trigger set_post_event_closeout_items_updated_at before update on public.post_event_closeout_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_final_deliverables_updated_at on public.final_deliverables;
create trigger set_final_deliverables_updated_at before update on public.final_deliverables
  for each row execute function public.set_updated_at();

drop trigger if exists set_client_feedback_responses_updated_at on public.client_feedback_responses;
create trigger set_client_feedback_responses_updated_at before update on public.client_feedback_responses
  for each row execute function public.set_updated_at();

drop trigger if exists set_client_consents_updated_at on public.client_consents;
create trigger set_client_consents_updated_at before update on public.client_consents
  for each row execute function public.set_updated_at();

drop trigger if exists set_vendor_performance_reviews_updated_at on public.vendor_performance_reviews;
create trigger set_vendor_performance_reviews_updated_at before update on public.vendor_performance_reviews
  for each row execute function public.set_updated_at();

drop trigger if exists set_internal_retrospectives_updated_at on public.internal_retrospectives;
create trigger set_internal_retrospectives_updated_at before update on public.internal_retrospectives
  for each row execute function public.set_updated_at();

alter table public.organization_closeout_settings enable row level security;
alter table public.post_event_closeouts enable row level security;
alter table public.post_event_closeout_items enable row level security;
alter table public.final_deliverables enable row level security;
alter table public.client_feedback_responses enable row level security;
alter table public.client_consents enable row level security;
alter table public.vendor_performance_reviews enable row level security;
alter table public.internal_retrospectives enable row level security;
alter table public.closeout_financial_snapshots enable row level security;

drop policy if exists "staff read closeout settings" on public.organization_closeout_settings;
create policy "staff read closeout settings" on public.organization_closeout_settings
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage closeout settings" on public.organization_closeout_settings;
create policy "staff manage closeout settings" on public.organization_closeout_settings
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read post event closeouts" on public.post_event_closeouts;
create policy "staff read post event closeouts" on public.post_event_closeouts
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage post event closeouts" on public.post_event_closeouts;
create policy "staff manage post event closeouts" on public.post_event_closeouts
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read closeout items" on public.post_event_closeout_items;
create policy "staff read closeout items" on public.post_event_closeout_items
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage closeout items" on public.post_event_closeout_items;
create policy "staff manage closeout items" on public.post_event_closeout_items
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read final deliverables" on public.final_deliverables;
create policy "staff read final deliverables" on public.final_deliverables
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "clients read visible final deliverables" on public.final_deliverables;
create policy "clients read visible final deliverables" on public.final_deliverables
  for select using (
    organization_id = public.current_organization_id()
    and client_visible
    and exists (
      select 1 from public.events event
      where event.id = final_deliverables.event_id
        and event.organization_id = final_deliverables.organization_id
        and event.client_user_id = auth.uid()
    )
  );

drop policy if exists "staff manage final deliverables" on public.final_deliverables;
create policy "staff manage final deliverables" on public.final_deliverables
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read client feedback" on public.client_feedback_responses;
create policy "staff read client feedback" on public.client_feedback_responses
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "clients read own feedback" on public.client_feedback_responses;
create policy "clients read own feedback" on public.client_feedback_responses
  for select using (
    organization_id = public.current_organization_id()
    and submitted_by = auth.uid()
  );

drop policy if exists "clients submit own feedback" on public.client_feedback_responses;
create policy "clients submit own feedback" on public.client_feedback_responses
  for insert with check (
    organization_id = public.current_organization_id()
    and submitted_by = auth.uid()
    and exists (
      select 1 from public.events event
      where event.id = client_feedback_responses.event_id
        and event.organization_id = client_feedback_responses.organization_id
        and event.client_user_id = auth.uid()
    )
  );

drop policy if exists "clients update own feedback" on public.client_feedback_responses;
create policy "clients update own feedback" on public.client_feedback_responses
  for update using (
    organization_id = public.current_organization_id()
    and (
      submitted_by = auth.uid()
      or exists (
        select 1 from public.events event
        where event.id = client_feedback_responses.event_id
          and event.organization_id = client_feedback_responses.organization_id
          and event.client_user_id = auth.uid()
      )
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and (
      submitted_by = auth.uid()
      or exists (
        select 1 from public.events event
        where event.id = client_feedback_responses.event_id
          and event.organization_id = client_feedback_responses.organization_id
          and event.client_user_id = auth.uid()
      )
    )
  );

drop policy if exists "staff manage client feedback" on public.client_feedback_responses;
create policy "staff manage client feedback" on public.client_feedback_responses
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read client consents" on public.client_consents;
create policy "staff read client consents" on public.client_consents
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "clients read own consents" on public.client_consents;
create policy "clients read own consents" on public.client_consents
  for select using (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.clients client
      where client.id = client_consents.client_id
        and client.organization_id = client_consents.organization_id
        and client.user_id = auth.uid()
    )
  );

drop policy if exists "clients manage own consents" on public.client_consents;
create policy "clients manage own consents" on public.client_consents
  for all using (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.clients client
      where client.id = client_consents.client_id
        and client.organization_id = client_consents.organization_id
        and client.user_id = auth.uid()
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.clients client
      where client.id = client_consents.client_id
        and client.organization_id = client_consents.organization_id
        and client.user_id = auth.uid()
    )
  );

drop policy if exists "staff manage client consents" on public.client_consents;
create policy "staff manage client consents" on public.client_consents
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read vendor performance reviews" on public.vendor_performance_reviews;
create policy "staff read vendor performance reviews" on public.vendor_performance_reviews
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage vendor performance reviews" on public.vendor_performance_reviews;
create policy "staff manage vendor performance reviews" on public.vendor_performance_reviews
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read internal retrospectives" on public.internal_retrospectives;
create policy "staff read internal retrospectives" on public.internal_retrospectives
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage internal retrospectives" on public.internal_retrospectives;
create policy "staff manage internal retrospectives" on public.internal_retrospectives
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read closeout financial snapshots" on public.closeout_financial_snapshots;
create policy "staff read closeout financial snapshots" on public.closeout_financial_snapshots
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage closeout financial snapshots" on public.closeout_financial_snapshots;
create policy "staff manage closeout financial snapshots" on public.closeout_financial_snapshots
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into public.organization_closeout_settings (organization_id)
select organization.id
from public.organizations organization
where not exists (
  select 1 from public.organization_closeout_settings settings
  where settings.organization_id = organization.id
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
  '[]'::jsonb,
  preset.approval_policy,
  preset.priority,
  jsonb_build_object('preset_key', preset.preset_key, 'seeded', true, 'phase', 'phase8')
from public.organizations organization
cross join (
  values
    ('post_event_closeout', 'Post-event closeout handoff', 'Create the post-event closeout action queue after Event-Day Mode completes.', 'event_day_completed', 'automatic', 70),
    ('client_feedback_request', 'Client feedback request', 'Prepare a neutral feedback request after closeout begins.', 'closeout_feedback_due', 'draft_only', 80),
    ('final_deliverable_due', 'Final deliverable due soon', 'Notify the owner when final deliverables are due or overdue.', 'final_deliverable_due', 'automatic', 90),
    ('vendor_review_due', 'Vendor review due', 'Create owner reminders to review assigned vendors after the event.', 'vendor_review_due', 'automatic', 100),
    ('financial_closeout_due', 'Financial closeout due', 'Surface outstanding client/vendor balances and missing receipts during closeout.', 'financial_closeout_due', 'automatic', 110)
) as preset(preset_key, name, description, trigger_type, approval_policy, priority)
where not exists (
  select 1 from public.workflow_automations automation
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
    ('post_event_closeout', 'send_in_app_notification', 'Notify closeout owner', '{"recipient":"project_owner","severity":"Warning","title":"Post-event closeout is ready","body":"Review blockers, deliverables, financial reconciliation, feedback, and vendor reviews."}', false, 10),
    ('post_event_closeout', 'create_reminder', 'Create closeout reminder', '{"title":"Complete post-event closeout","delay_hours":24,"assign_to":"project_owner"}', false, 20),
    ('client_feedback_request', 'create_email_draft', 'Create feedback request draft', '{"subject":"We would value your feedback","summary":"Neutral post-event feedback request draft","body":"Thank you for trusting us with your event. When convenient, please share feedback about your experience."}', true, 10),
    ('final_deliverable_due', 'send_in_app_notification', 'Final deliverable alert', '{"recipient":"project_owner","severity":"Warning","title":"Final deliverable needs attention","body":"A client-facing final deliverable is due or overdue."}', false, 10),
    ('vendor_review_due', 'create_reminder', 'Review assigned vendors', '{"title":"Complete vendor performance reviews","delay_hours":24,"assign_to":"project_owner"}', false, 10),
    ('financial_closeout_due', 'send_in_app_notification', 'Financial closeout alert', '{"recipient":"project_owner","severity":"Critical","title":"Financial closeout needs review","body":"Review outstanding client balances, vendor balances, receipts, and final profitability."}', false, 10)
) as action(preset_key, action_type, name, config, requires_approval, sort_order)
  on automation.metadata ->> 'preset_key' = action.preset_key
where not exists (
  select 1 from public.workflow_automation_actions existing
  where existing.automation_id = automation.id
    and existing.action_type = action.action_type
    and existing.name = action.name
);
