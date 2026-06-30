create extension if not exists pgcrypto;

alter type public.lead_stage add value if not exists 'Consultation Completed' after 'Consultation Scheduled';
alter type public.lead_stage add value if not exists 'Proposal Draft' after 'Consultation Completed';
alter type public.lead_stage add value if not exists 'Changes Requested' after 'Proposal Sent';
alter type public.lead_stage add value if not exists 'Accepted' after 'Changes Requested';

alter type public.event_status add value if not exists 'Setup' before 'Planning';
alter type public.event_status add value if not exists 'Finalization' after 'Planning';
alter type public.event_status add value if not exists 'Event Day' after 'Finalization';
alter type public.event_status add value if not exists 'Post-Event' after 'Event Day';

do $$ begin
  create type public.proposal_status as enum (
    'Draft',
    'Sent',
    'Viewed',
    'Changes Requested',
    'Accepted',
    'Declined',
    'Expired',
    'Superseded',
    'Cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.proposal_response_type as enum (
    'Viewed',
    'Accepted',
    'Changes Requested',
    'Declined'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.proposal_payment_type as enum (
    'Deposit',
    'Installment',
    'Final',
    'Custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.proposal_amount_type as enum (
    'Fixed',
    'Percent'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.proposal_due_rule as enum (
    'On Acceptance',
    'Fixed Date',
    'Before Event',
    'After Acceptance'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.organization_booking_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  require_proposal_acceptance boolean not null default true,
  require_terms_acceptance boolean not null default true,
  require_deposit_invoice_issued boolean not null default true,
  require_deposit_paid boolean not null default true,
  require_manual_planner_approval boolean not null default false,
  proposal_expiration_days integer not null default 14,
  acceptance_statement text not null default 'I accept this proposal, the selected options, payment schedule, and terms for this project.',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  proposal_number text not null,
  title text not null,
  status public.proposal_status not null default 'Draft',
  currency text not null default 'CAD',
  current_version_number integer not null default 1,
  current_version_id uuid,
  valid_until date,
  accepted_at timestamptz,
  declined_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, proposal_number)
);

create table if not exists public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  version_number integer not null,
  introduction text,
  scope text,
  terms text,
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  document_hash text,
  immutable_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (proposal_id, version_number),
  constraint proposal_versions_amounts_check check (
    subtotal >= 0 and discount_amount >= 0 and tax_amount >= 0 and total_amount >= 0
  )
);

alter table public.proposals
  drop constraint if exists proposals_current_version_id_fkey,
  add constraint proposals_current_version_id_fkey
    foreign key (current_version_id) references public.proposal_versions(id) on delete set null;

create table if not exists public.proposal_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id) on delete cascade,
  category public.budget_category,
  name text not null,
  description text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_rate numeric(7,4),
  total_amount numeric(12,2) not null default 0,
  is_optional boolean not null default false,
  is_selected boolean not null default true,
  client_visible boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposal_line_items_amounts_check check (
    quantity >= 0 and unit_price >= 0 and discount_amount >= 0 and total_amount >= 0
  )
);

create table if not exists public.proposal_payment_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id) on delete cascade,
  label text not null,
  payment_type public.proposal_payment_type not null default 'Deposit',
  amount_type public.proposal_amount_type not null default 'Fixed',
  amount_value numeric(12,2) not null default 0,
  calculated_amount numeric(12,2) not null default 0,
  due_rule public.proposal_due_rule not null default 'On Acceptance',
  due_date date,
  due_offset_days integer,
  required_for_booking boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposal_payment_terms_amounts_check check (
    amount_value >= 0 and calculated_amount >= 0
  )
);

create table if not exists public.proposal_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  response_type public.proposal_response_type not null,
  comment text,
  responder_name text,
  responder_email text,
  responded_at timestamptz not null default now(),
  ip_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists proposal_responses_one_acceptance_idx
  on public.proposal_responses(proposal_id)
  where response_type = 'Accepted';

create table if not exists public.proposal_review_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  proposal_version_id uuid not null references public.proposal_versions(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null default 'proposal_review',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint proposal_review_tokens_purpose_check check (purpose in ('proposal_review'))
);

create table if not exists public.proposal_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  proposal_version_id uuid references public.proposal_versions(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  visibility public.message_visibility not null default 'Client',
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (proposal_id, file_id)
);

alter table public.invoices alter column event_id drop not null;
alter table public.invoices add column if not exists proposal_id uuid references public.proposals(id) on delete set null;
alter table public.invoices add column if not exists proposal_version_id uuid references public.proposal_versions(id) on delete set null;
alter table public.invoices add column if not exists proposal_payment_term_id uuid references public.proposal_payment_terms(id) on delete set null;

alter table public.invoices
  drop constraint if exists invoices_context_check,
  add constraint invoices_context_check check (event_id is not null or project_id is not null);

create unique index if not exists invoices_proposal_payment_term_idx
  on public.invoices(organization_id, proposal_payment_term_id)
  where proposal_payment_term_id is not null;

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  amount numeric(12,2) not null,
  payment_method text not null,
  paid_at timestamptz not null default now(),
  reference text,
  note text,
  recorded_by uuid references public.users(id) on delete set null,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint invoice_payments_amount_check check (amount > 0),
  unique (organization_id, idempotency_key)
);

create table if not exists public.project_booking_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists proposals_project_idx on public.proposals(project_id, status, updated_at desc);
create index if not exists proposals_lead_idx on public.proposals(lead_id, updated_at desc);
create index if not exists proposal_versions_proposal_idx on public.proposal_versions(proposal_id, version_number desc);
create index if not exists proposal_line_items_version_idx on public.proposal_line_items(proposal_version_id, sort_order);
create index if not exists proposal_payment_terms_version_idx on public.proposal_payment_terms(proposal_version_id, sort_order);
create index if not exists proposal_responses_project_idx on public.proposal_responses(project_id, responded_at desc);
create index if not exists proposal_review_tokens_proposal_idx on public.proposal_review_tokens(proposal_id, expires_at desc);
create index if not exists proposal_files_proposal_idx on public.proposal_files(proposal_id, sort_order);
create index if not exists invoices_proposal_idx on public.invoices(proposal_id, proposal_version_id);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments(invoice_id, paid_at desc);
create index if not exists project_booking_approvals_project_idx on public.project_booking_approvals(project_id);

drop trigger if exists set_organization_booking_settings_updated_at on public.organization_booking_settings;
create trigger set_organization_booking_settings_updated_at before update on public.organization_booking_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_proposals_updated_at on public.proposals;
create trigger set_proposals_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();

drop trigger if exists set_proposal_line_items_updated_at on public.proposal_line_items;
create trigger set_proposal_line_items_updated_at before update on public.proposal_line_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_proposal_payment_terms_updated_at on public.proposal_payment_terms;
create trigger set_proposal_payment_terms_updated_at before update on public.proposal_payment_terms
  for each row execute function public.set_updated_at();

create or replace function public.is_project_client(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects project
    left join public.events event on event.id = project.event_id
    left join public.clients client on client.id = project.client_id
    where project.id = target_project_id
      and project.organization_id = public.current_organization_id()
      and (
        event.client_user_id = auth.uid()
        or client.user_id = auth.uid()
        or exists (
          select 1
          from public.users app_user
          where app_user.id = auth.uid()
            and app_user.role = 'client'
            and (
              lower(app_user.email) = lower(event.client_email)
              or lower(app_user.email) = lower(client.email)
            )
        )
      )
  );
$$;

alter table public.organization_booking_settings enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.proposal_line_items enable row level security;
alter table public.proposal_payment_terms enable row level security;
alter table public.proposal_responses enable row level security;
alter table public.proposal_review_tokens enable row level security;
alter table public.proposal_files enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.project_booking_approvals enable row level security;

drop policy if exists "org members read booking settings" on public.organization_booking_settings;
create policy "org members read booking settings" on public.organization_booking_settings
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage booking settings" on public.organization_booking_settings;
create policy "staff manage booking settings" on public.organization_booking_settings
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read proposals" on public.proposals;
create policy "org members read proposals" on public.proposals
  for select using (
    organization_id = public.current_organization_id()
    and (public.is_staff() or public.is_project_client(project_id))
  );

drop policy if exists "staff manage proposals" on public.proposals;
create policy "staff manage proposals" on public.proposals
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read proposal versions" on public.proposal_versions;
create policy "org members read proposal versions" on public.proposal_versions
  for select using (
    organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or exists (
        select 1 from public.proposals proposal
        where proposal.id = proposal_id
          and public.is_project_client(proposal.project_id)
      )
    )
  );

drop policy if exists "staff manage proposal versions" on public.proposal_versions;
create policy "staff manage proposal versions" on public.proposal_versions
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read proposal line items" on public.proposal_line_items;
create policy "org members read proposal line items" on public.proposal_line_items
  for select using (
    organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or (
        client_visible
        and exists (
          select 1
          from public.proposal_versions version
          join public.proposals proposal on proposal.id = version.proposal_id
          where version.id = proposal_version_id
            and public.is_project_client(proposal.project_id)
        )
      )
    )
  );

drop policy if exists "staff manage proposal line items" on public.proposal_line_items;
create policy "staff manage proposal line items" on public.proposal_line_items
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read proposal payment terms" on public.proposal_payment_terms;
create policy "org members read proposal payment terms" on public.proposal_payment_terms
  for select using (
    organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or exists (
        select 1
        from public.proposal_versions version
        join public.proposals proposal on proposal.id = version.proposal_id
        where version.id = proposal_version_id
          and public.is_project_client(proposal.project_id)
      )
    )
  );

drop policy if exists "staff manage proposal payment terms" on public.proposal_payment_terms;
create policy "staff manage proposal payment terms" on public.proposal_payment_terms
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read proposal responses" on public.proposal_responses;
create policy "org members read proposal responses" on public.proposal_responses
  for select using (
    organization_id = public.current_organization_id()
    and (public.is_staff() or public.is_project_client(project_id))
  );

drop policy if exists "staff manage proposal responses" on public.proposal_responses;
create policy "staff manage proposal responses" on public.proposal_responses
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read proposal review tokens" on public.proposal_review_tokens;
create policy "staff read proposal review tokens" on public.proposal_review_tokens
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage proposal review tokens" on public.proposal_review_tokens;
create policy "staff manage proposal review tokens" on public.proposal_review_tokens
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read proposal files" on public.proposal_files;
create policy "org members read proposal files" on public.proposal_files
  for select using (
    organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or exists (
        select 1
        from public.proposals proposal
        where proposal.id = proposal_id
          and public.is_project_client(proposal.project_id)
      )
    )
  );

drop policy if exists "staff manage proposal files" on public.proposal_files;
create policy "staff manage proposal files" on public.proposal_files
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read invoice payments" on public.invoice_payments;
create policy "org members read invoice payments" on public.invoice_payments
  for select using (
    organization_id = public.current_organization_id()
    and (public.is_staff() or (project_id is not null and public.is_project_client(project_id)))
  );

drop policy if exists "staff manage invoice payments" on public.invoice_payments;
create policy "staff manage invoice payments" on public.invoice_payments
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read project booking approvals" on public.project_booking_approvals;
create policy "org members read project booking approvals" on public.project_booking_approvals
  for select using (
    organization_id = public.current_organization_id()
    and (public.is_staff() or public.is_project_client(project_id))
  );

drop policy if exists "staff manage project booking approvals" on public.project_booking_approvals;
create policy "staff manage project booking approvals" on public.project_booking_approvals
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read invoices" on public.invoices;
create policy "org members read invoices" on public.invoices
  for select using (
    organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or (event_id is not null and public.is_event_client(event_id))
      or (project_id is not null and public.is_project_client(project_id))
    )
  );

insert into public.organization_booking_settings (organization_id)
select organization.id
from public.organizations organization
where not exists (
  select 1
  from public.organization_booking_settings settings
  where settings.organization_id = organization.id
);

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
  'Proposal sent',
  'proposal_sent',
  'Your {{event_type}} proposal is ready',
  'Hi {{client_name}},

Your {{organization_name}} proposal is ready for review.

Review it here: {{proposal_link}}

This proposal is valid until {{valid_until}}. Please accept it, request changes, or reply with any questions.

Warmly,
{{planner_name}}',
  true,
  true,
  jsonb_build_object('seeded', true, 'phase', 'phase3')
from public.organizations organization
where not exists (
  select 1
  from public.email_templates template
  where template.organization_id = organization.id
    and template.template_type = 'proposal_sent'
    and template.is_default
);

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
  'Booking confirmation',
  'booking_confirmation',
  'Your {{event_type}} is booked',
  'Hi {{client_name}},

Thank you. Your proposal and booking requirements are complete, and your event is now booked.

We have opened your planning workspace and will follow up with the next steps.

Warmly,
{{organization_name}}',
  true,
  true,
  jsonb_build_object('seeded', true, 'phase', 'phase3')
from public.organizations organization
where not exists (
  select 1
  from public.email_templates template
  where template.organization_id = organization.id
    and template.template_type = 'booking_confirmation'
    and template.is_default
);
