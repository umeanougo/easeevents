create extension if not exists pgcrypto;

do $$ begin
  create type public.client_relationship_status as enum (
    'Active Project',
    'Recent Client',
    'Retention Follow-Up',
    'Rebooking Opportunity',
    'Repeat Client',
    'Referral Partner',
    'Dormant',
    'Do Not Market',
    'Archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rebooking_opportunity_type as enum (
    'Anniversary',
    'Birthday',
    'Wedding-Related Milestone',
    'Corporate Recurring Event',
    'Seasonal Event',
    'Referral Follow-Up',
    'Planner Recommendation',
    'Client-Requested Follow-Up',
    'Repeat Event',
    'Other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rebooking_opportunity_stage as enum (
    'Identified',
    'Review Required',
    'Planned Follow-Up',
    'Ready to Contact',
    'Contacted',
    'Engaged',
    'Consultation Scheduled',
    'Qualified',
    'Converted',
    'Snoozed',
    'Not Interested',
    'Do Not Contact',
    'Closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.client_milestone_type as enum (
    'Event Anniversary',
    'Birthday',
    'Corporate Annual Event',
    'Holiday Event',
    'Launch Anniversary',
    'Graduation Window',
    'Renewal Date',
    'Custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.milestone_sensitivity as enum (
    'Standard',
    'Private',
    'Sensitive'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.referral_status as enum (
    'Submitted',
    'Review Required',
    'Introduction Pending',
    'Contact Permitted',
    'Contacted',
    'Qualified',
    'Converted',
    'Not Interested',
    'Invalid',
    'Duplicate',
    'Closed'
  );
exception when duplicate_object then null;
end $$;

alter type public.email_template_type add value if not exists 'retention_check_in';
alter type public.email_template_type add value if not exists 'anniversary_acknowledgment';
alter type public.email_template_type add value if not exists 'rebooking_follow_up';
alter type public.email_template_type add value if not exists 'referral_thank_you';

alter table public.clients
  add column if not exists relationship_status public.client_relationship_status not null default 'Recent Client',
  add column if not exists relationship_owner_id uuid references public.users(id) on delete set null,
  add column if not exists preferred_contact_channel text,
  add column if not exists future_event_communication_preference text not null default 'Manual Review',
  add column if not exists marketing_unsubscribed_at timestamptz,
  add column if not exists relationship_score integer check (relationship_score between 1 and 5),
  add column if not exists first_inquiry_at timestamptz,
  add column if not exists last_event_at date,
  add column if not exists next_relationship_action text,
  add column if not exists next_relationship_action_at timestamptz,
  add column if not exists relationship_notes text,
  add column if not exists relationship_metadata jsonb not null default '{}'::jsonb;

alter table public.clients
  drop constraint if exists clients_future_event_preference_check,
  add constraint clients_future_event_preference_check
    check (future_event_communication_preference in (
      'Allowed',
      'Personal Only',
      'Manual Review',
      'Do Not Market',
      'Unsubscribed'
    ));

create table if not exists public.organization_retention_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade unique,
  jurisdiction_profile text not null default 'Manual Review',
  promotional_outreach_enabled boolean not null default false,
  express_consent_required boolean not null default true,
  implied_consent_tracking_enabled boolean not null default false,
  consent_review_days integer not null default 365,
  referral_outreach_policy text not null default 'review_required',
  quiet_hours jsonb not null default '{"start":"20:00","end":"08:00"}'::jsonb,
  default_execution_mode text not null default 'draft_only',
  default_retention_days integer not null default 730,
  manual_compliance_review boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_retention_settings_execution_mode_check
    check (default_execution_mode in ('automatic', 'approval_required', 'draft_only')),
  constraint organization_retention_settings_referral_policy_check
    check (referral_outreach_policy in ('disabled', 'review_required', 'client_initiated_only'))
);

create table if not exists public.client_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  source_project_id uuid references public.projects(id) on delete set null,
  milestone_type public.client_milestone_type not null,
  title text not null,
  milestone_date date,
  month integer check (month between 1 and 12),
  day integer check (day between 1 and 31),
  recurrence_rule text,
  reminder_offset_days integer not null default 30,
  next_occurrence_date date,
  sensitivity public.milestone_sensitivity not null default 'Standard',
  source text not null default 'Planner confirmed',
  consent_or_purpose_reference uuid references public.client_consents(id) on delete set null,
  is_active boolean not null default true,
  notes text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_milestones_has_date check (
    milestone_date is not null or (month is not null and day is not null)
  )
);

create unique index if not exists client_milestones_org_key_idx
  on public.client_milestones(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists client_milestones_due_idx
  on public.client_milestones(organization_id, is_active, next_occurrence_date);

create index if not exists client_milestones_client_idx
  on public.client_milestones(organization_id, client_id, milestone_type);

create table if not exists public.rebooking_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  source_project_id uuid references public.projects(id) on delete set null,
  source_event_id uuid references public.events(id) on delete set null,
  source_milestone_id uuid references public.client_milestones(id) on delete set null,
  source_referral_id uuid,
  assigned_to uuid references public.users(id) on delete set null,
  opportunity_type public.rebooking_opportunity_type not null default 'Other',
  title text not null,
  description text,
  stage public.rebooking_opportunity_stage not null default 'Identified',
  estimated_event_date date,
  target_contact_date date,
  estimated_value numeric(12,2),
  estimated_probability numeric(5,2) check (estimated_probability is null or (estimated_probability >= 0 and estimated_probability <= 100)),
  event_type text,
  preferred_contact_channel text,
  consent_status_snapshot text,
  next_action text,
  next_action_at timestamptz,
  contacted_at timestamptz,
  responded_at timestamptz,
  converted_lead_id uuid references public.leads(id) on delete set null,
  converted_project_id uuid references public.projects(id) on delete set null,
  lost_reason text,
  snoozed_until date,
  ai_summary text,
  ai_summary_generated_at timestamptz,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rebooking_opportunities_org_key_idx
  on public.rebooking_opportunities(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists rebooking_opportunities_stage_idx
  on public.rebooking_opportunities(organization_id, stage, next_action_at);

create index if not exists rebooking_opportunities_client_idx
  on public.rebooking_opportunities(organization_id, client_id, created_at desc);

create table if not exists public.client_referral_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  referral_code text not null,
  source_campaign text,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, referral_code)
);

create index if not exists client_referral_links_client_idx
  on public.client_referral_links(organization_id, client_id, is_active);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  referring_client_id uuid references public.clients(id) on delete set null,
  referring_project_id uuid references public.projects(id) on delete set null,
  referral_link_id uuid references public.client_referral_links(id) on delete set null,
  referred_lead_id uuid references public.leads(id) on delete set null,
  referred_client_id uuid references public.clients(id) on delete set null,
  assigned_to uuid references public.users(id) on delete set null,
  referral_code text,
  referral_source text,
  referrer_name_snapshot text,
  referred_name text,
  referred_email text,
  referred_phone text,
  status public.referral_status not null default 'Submitted',
  introduction_method text,
  consent_or_contact_basis text,
  first_contact_at timestamptz,
  converted_at timestamptz,
  converted_project_id uuid references public.projects(id) on delete set null,
  reward_status text not null default 'Not Eligible',
  reward_description text,
  notes text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_reward_status_check
    check (reward_status in ('Not Eligible', 'Pending Review', 'Eligible', 'Approved', 'Fulfilled', 'Declined'))
);

create unique index if not exists referrals_org_key_idx
  on public.referrals(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists referrals_status_idx
  on public.referrals(organization_id, status, created_at desc);

create index if not exists referrals_referrer_idx
  on public.referrals(organization_id, referring_client_id, created_at desc);

create table if not exists public.communication_eligibility_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  opportunity_id uuid references public.rebooking_opportunities(id) on delete set null,
  referral_id uuid references public.referrals(id) on delete set null,
  channel text not null default 'Email',
  communication_category text not null,
  allowed boolean not null default false,
  consent_status text,
  consent_source text,
  consent_record_id uuid references public.client_consents(id) on delete set null,
  expiry_or_review_at timestamptz,
  suppression_reason text,
  unsubscribe_status text,
  jurisdiction_profile text,
  requires_manual_review boolean not null default true,
  explanation text not null,
  checked_by uuid references public.users(id) on delete set null,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists communication_eligibility_logs_org_key_idx
  on public.communication_eligibility_logs(organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists communication_eligibility_logs_client_idx
  on public.communication_eligibility_logs(organization_id, client_id, created_at desc);

create index if not exists clients_relationship_status_idx
  on public.clients(organization_id, relationship_status, next_relationship_action_at);

drop trigger if exists set_organization_retention_settings_updated_at on public.organization_retention_settings;
create trigger set_organization_retention_settings_updated_at before update on public.organization_retention_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_client_milestones_updated_at on public.client_milestones;
create trigger set_client_milestones_updated_at before update on public.client_milestones
  for each row execute function public.set_updated_at();

drop trigger if exists set_rebooking_opportunities_updated_at on public.rebooking_opportunities;
create trigger set_rebooking_opportunities_updated_at before update on public.rebooking_opportunities
  for each row execute function public.set_updated_at();

drop trigger if exists set_client_referral_links_updated_at on public.client_referral_links;
create trigger set_client_referral_links_updated_at before update on public.client_referral_links
  for each row execute function public.set_updated_at();

drop trigger if exists set_referrals_updated_at on public.referrals;
create trigger set_referrals_updated_at before update on public.referrals
  for each row execute function public.set_updated_at();

alter table public.organization_retention_settings enable row level security;
alter table public.client_milestones enable row level security;
alter table public.rebooking_opportunities enable row level security;
alter table public.client_referral_links enable row level security;
alter table public.referrals enable row level security;
alter table public.communication_eligibility_logs enable row level security;

drop policy if exists "staff read retention settings" on public.organization_retention_settings;
create policy "staff read retention settings" on public.organization_retention_settings
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "admins manage retention settings" on public.organization_retention_settings;
create policy "admins manage retention settings" on public.organization_retention_settings
  for all using (organization_id = public.current_organization_id() and public.current_user_role() = 'admin')
  with check (organization_id = public.current_organization_id() and public.current_user_role() = 'admin');

drop policy if exists "staff read client milestones" on public.client_milestones;
create policy "staff read client milestones" on public.client_milestones
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "clients read own milestones" on public.client_milestones;
create policy "clients read own milestones" on public.client_milestones
  for select using (
    organization_id = public.current_organization_id()
    and sensitivity <> 'Sensitive'
    and exists (
      select 1 from public.clients client
      where client.id = client_milestones.client_id
        and client.organization_id = client_milestones.organization_id
        and client.user_id = auth.uid()
    )
  );

drop policy if exists "staff manage client milestones" on public.client_milestones;
create policy "staff manage client milestones" on public.client_milestones
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "clients update own milestones" on public.client_milestones;
create policy "clients update own milestones" on public.client_milestones
  for update using (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.clients client
      where client.id = client_milestones.client_id
        and client.organization_id = client_milestones.organization_id
        and client.user_id = auth.uid()
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and exists (
      select 1 from public.clients client
      where client.id = client_milestones.client_id
        and client.organization_id = client_milestones.organization_id
        and client.user_id = auth.uid()
    )
  );

drop policy if exists "staff read rebooking opportunities" on public.rebooking_opportunities;
create policy "staff read rebooking opportunities" on public.rebooking_opportunities
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage rebooking opportunities" on public.rebooking_opportunities;
create policy "staff manage rebooking opportunities" on public.rebooking_opportunities
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read client referral links" on public.client_referral_links;
create policy "staff read client referral links" on public.client_referral_links
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "clients read own referral links" on public.client_referral_links;
create policy "clients read own referral links" on public.client_referral_links
  for select using (
    organization_id = public.current_organization_id()
    and is_active
    and exists (
      select 1 from public.clients client
      where client.id = client_referral_links.client_id
        and client.organization_id = client_referral_links.organization_id
        and client.user_id = auth.uid()
    )
  );

drop policy if exists "staff manage client referral links" on public.client_referral_links;
create policy "staff manage client referral links" on public.client_referral_links
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read referrals" on public.referrals;
create policy "staff read referrals" on public.referrals
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage referrals" on public.referrals;
create policy "staff manage referrals" on public.referrals
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read communication eligibility logs" on public.communication_eligibility_logs;
create policy "staff read communication eligibility logs" on public.communication_eligibility_logs
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage communication eligibility logs" on public.communication_eligibility_logs;
create policy "staff manage communication eligibility logs" on public.communication_eligibility_logs
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into public.organization_retention_settings (organization_id)
select organization.id
from public.organizations organization
where not exists (
  select 1 from public.organization_retention_settings settings
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
  jsonb_build_object('preset_key', preset.preset_key, 'seeded', true, 'phase', 'phase9')
from public.organizations organization
cross join (
  values
    ('closeout_relationship_review', 'Closeout relationship review', 'Create an internal relationship review when a project closes.', 'project_closed', 'automatic', 120),
    ('milestone_review', 'Milestone review', 'Create review-required opportunities before confirmed client milestones.', 'milestone_due', 'automatic', 130),
    ('corporate_recurrence', 'Corporate recurrence review', 'Prepare a repeat-event opportunity before a previous corporate event anniversary.', 'corporate_recurrence_due', 'automatic', 140),
    ('repeat_client_follow_up', 'Repeat-client follow-up', 'Prepare a controlled draft for clients marked as potential repeats.', 'repeat_client_follow_up_due', 'draft_only', 150),
    ('referral_thank_you', 'Referral thank-you', 'Prepare a thank-you draft when a referral converts.', 'referral_converted', 'draft_only', 160),
    ('dormant_client_review', 'Dormant-client review', 'Create an internal review for inactive high-value clients with no open opportunity.', 'dormant_client_due', 'approval_required', 170)
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
    ('closeout_relationship_review', 'create_reminder', 'Review relationship handoff', '{"title":"Review client relationship handoff","delay_hours":24,"assign_to":"project_owner"}', false, 10),
    ('closeout_relationship_review', 'send_in_app_notification', 'Notify relationship owner', '{"recipient":"project_owner","severity":"Info","title":"Relationship review ready","body":"Review retention handoff, consent, referrals, and future-event opportunities."}', false, 20),
    ('milestone_review', 'create_reminder', 'Review milestone follow-up', '{"title":"Review milestone follow-up","delay_hours":0,"assign_to":"project_owner"}', false, 10),
    ('corporate_recurrence', 'create_reminder', 'Review corporate recurrence', '{"title":"Review recurring corporate event opportunity","delay_hours":0,"assign_to":"project_owner"}', false, 10),
    ('repeat_client_follow_up', 'create_email_draft', 'Draft repeat-client follow-up', '{"subject":"Checking in about your next event","summary":"Relationship follow-up draft; staff review required.","body":"Thank you again for trusting us with your event. When you are ready, we would be happy to discuss future planning needs."}', true, 10),
    ('referral_thank_you', 'create_email_draft', 'Draft referral thank-you', '{"subject":"Thank you for the referral","summary":"Referral thank-you draft; no reward promised.","body":"Thank you for thinking of us and sharing Coco Cabana with someone in your circle."}', true, 10),
    ('dormant_client_review', 'create_reminder', 'Review dormant client', '{"title":"Review dormant client relationship","delay_hours":0,"assign_to":"project_owner"}', true, 10)
) as action(preset_key, action_type, name, config, requires_approval, sort_order)
  on automation.metadata ->> 'preset_key' = action.preset_key
where not exists (
  select 1 from public.workflow_automation_actions existing
  where existing.automation_id = automation.id
    and existing.action_type = action.action_type
    and existing.name = action.name
);
