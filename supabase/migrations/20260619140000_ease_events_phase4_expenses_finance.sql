do $$ begin
  alter type public.budget_category add value if not exists 'Transportation';
  alter type public.budget_category add value if not exists 'Permits';
  alter type public.budget_category add value if not exists 'Marketing';
  alter type public.budget_category add value if not exists 'Software';
  alter type public.budget_category add value if not exists 'Professional Services';
  alter type public.budget_category add value if not exists 'Reimbursement';
exception
  when undefined_object then null;
end $$;

do $$ begin
  create type public.expense_source as enum (
    'Manual',
    'Vendor Bill',
    'Receipt',
    'Reimbursement',
    'Adjustment',
    'Imported'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.expense_status as enum (
    'Draft',
    'Submitted',
    'Approved',
    'Partially Paid',
    'Paid',
    'Overdue',
    'Voided',
    'Refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.expense_bookkeeping_status as enum (
    'Unreviewed',
    'Reviewed',
    'Exported',
    'Reconciled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.expense_payment_status as enum (
    'Pending',
    'Completed',
    'Failed',
    'Refunded',
    'Voided'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.organization_finance_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  default_currency text not null default 'CAD',
  fiscal_year_start_month integer not null default 1 check (fiscal_year_start_month between 1 and 12),
  require_expense_approval boolean not null default true,
  default_margin_target_percent numeric(6,2) not null default 30,
  receipt_required_threshold numeric(12,2) not null default 250,
  enabled_payment_methods jsonb not null default '["Card","Bank Transfer","ACH","Zelle","Cash","Check","Other"]'::jsonb,
  tax_display_preference text not null default 'Separate',
  client_financial_visibility text not null default 'Invoices Only',
  default_report_date_basis text not null default 'Accrual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  budget_item_id uuid references public.budget_items(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  expense_number text,
  description text not null,
  category public.budget_category not null default 'Miscellaneous',
  source public.expense_source not null default 'Manual',
  status public.expense_status not null default 'Draft',
  currency text not null default 'CAD',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  service_fee_amount numeric(12,2) not null default 0 check (service_fee_amount >= 0),
  tip_amount numeric(12,2) not null default 0 check (tip_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  expense_date date not null default current_date,
  due_date date,
  approved_at timestamptz,
  voided_at timestamptz,
  notes text,
  payment_reference text,
  client_billable boolean not null default false,
  reimbursable boolean not null default false,
  bookkeeping_status public.expense_bookkeeping_status not null default 'Unreviewed',
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, expense_number),
  constraint expenses_total_matches_parts check (
    total_amount = subtotal + tax_amount + service_fee_amount + tip_amount
  )
);

create unique index if not exists expenses_organization_idempotency_key_idx
  on public.expenses (organization_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.expense_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'CAD',
  payment_method text not null default 'Other',
  payment_date date not null default current_date,
  reference text,
  notes text,
  recorded_by uuid references public.users(id) on delete set null,
  status public.expense_payment_status not null default 'Completed',
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists expense_payments_organization_idempotency_key_idx
  on public.expense_payments (organization_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.expense_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete restrict,
  visibility public.message_visibility not null default 'Internal',
  caption text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (expense_id, file_id)
);

create index if not exists expenses_organization_project_idx on public.expenses (organization_id, project_id);
create index if not exists expenses_organization_event_idx on public.expenses (organization_id, event_id);
create index if not exists expenses_organization_vendor_idx on public.expenses (organization_id, vendor_id);
create index if not exists expenses_organization_budget_item_idx on public.expenses (organization_id, budget_item_id);
create index if not exists expenses_status_due_date_idx on public.expenses (organization_id, status, due_date);
create index if not exists expenses_expense_date_idx on public.expenses (organization_id, expense_date);
create index if not exists expense_payments_expense_idx on public.expense_payments (organization_id, expense_id);
create index if not exists expense_payments_payment_date_idx on public.expense_payments (organization_id, payment_date);
create index if not exists expense_files_expense_idx on public.expense_files (organization_id, expense_id);
create index if not exists expense_files_file_idx on public.expense_files (organization_id, file_id);

create or replace function public.validate_expense_organization()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  related_org uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'expense project organization mismatch';
  end if;

  if new.event_id is not null then
    select organization_id into related_org from public.events where id = new.event_id;
    if related_org is null or related_org <> new.organization_id then
      raise exception 'expense event organization mismatch';
    end if;
  end if;

  if new.vendor_id is not null then
    select organization_id into related_org from public.vendors where id = new.vendor_id;
    if related_org is null or related_org <> new.organization_id then
      raise exception 'expense vendor organization mismatch';
    end if;
  end if;

  if new.budget_item_id is not null then
    select organization_id into related_org from public.budget_items where id = new.budget_item_id;
    if related_org is null or related_org <> new.organization_id then
      raise exception 'expense budget item organization mismatch';
    end if;
  end if;

  if new.event_id is null then
    select event_id into new.event_id
    from public.projects
    where id = new.project_id and event_id is not null;
  end if;

  return new;
end;
$$;

create or replace function public.validate_expense_payment_organization()
returns trigger
language plpgsql
as $$
declare
  expense_org uuid;
begin
  select organization_id into expense_org
  from public.expenses
  where id = new.expense_id;

  if expense_org is null or expense_org <> new.organization_id then
    raise exception 'expense payment organization mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.validate_expense_file_organization()
returns trigger
language plpgsql
as $$
declare
  expense_org uuid;
  file_org uuid;
begin
  select organization_id into expense_org from public.expenses where id = new.expense_id;
  select organization_id into file_org from public.files where id = new.file_id;

  if expense_org is null or expense_org <> new.organization_id then
    raise exception 'expense file expense organization mismatch';
  end if;

  if file_org is null or file_org <> new.organization_id then
    raise exception 'expense file storage metadata organization mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_expense_organization on public.expenses;
create trigger validate_expense_organization before insert or update on public.expenses
  for each row execute function public.validate_expense_organization();

drop trigger if exists validate_expense_payment_organization on public.expense_payments;
create trigger validate_expense_payment_organization before insert or update on public.expense_payments
  for each row execute function public.validate_expense_payment_organization();

drop trigger if exists validate_expense_file_organization on public.expense_files;
create trigger validate_expense_file_organization before insert or update on public.expense_files
  for each row execute function public.validate_expense_file_organization();

drop trigger if exists set_organization_finance_settings_updated_at on public.organization_finance_settings;
create trigger set_organization_finance_settings_updated_at before update on public.organization_finance_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

drop trigger if exists set_expense_payments_updated_at on public.expense_payments;
create trigger set_expense_payments_updated_at before update on public.expense_payments
  for each row execute function public.set_updated_at();

alter table public.organization_finance_settings enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_payments enable row level security;
alter table public.expense_files enable row level security;

drop policy if exists "org members read finance settings" on public.organization_finance_settings;
create policy "org members read finance settings" on public.organization_finance_settings
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage finance settings" on public.organization_finance_settings;
create policy "staff manage finance settings" on public.organization_finance_settings
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read expenses" on public.expenses;
create policy "staff read expenses" on public.expenses
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage expenses" on public.expenses;
create policy "staff manage expenses" on public.expenses
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read expense payments" on public.expense_payments;
create policy "staff read expense payments" on public.expense_payments
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage expense payments" on public.expense_payments;
create policy "staff manage expense payments" on public.expense_payments
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read expense files" on public.expense_files;
create policy "staff read expense files" on public.expense_files
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage expense files" on public.expense_files;
create policy "staff manage expense files" on public.expense_files
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into public.organization_finance_settings (organization_id, default_currency)
select org.id, coalesce(org.currency, 'CAD')
from public.organizations org
on conflict (organization_id) do nothing;
