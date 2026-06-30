create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  invoice_number text not null,
  invoice_type text not null default 'Deposit',
  amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  balance_due numeric(12,2) generated always as (greatest(amount - paid_amount, 0)) stored,
  due_date date,
  status text not null default 'Draft',
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_invoice_type_check check (
    invoice_type in ('Deposit', 'Interim', 'Final', 'Custom')
  ),
  constraint invoices_status_check check (
    status in ('Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Void')
  ),
  constraint invoices_amount_check check (amount >= 0),
  constraint invoices_paid_amount_check check (paid_amount >= 0),
  unique (organization_id, invoice_number)
);

create index if not exists invoices_organization_id_idx on public.invoices(organization_id);
create index if not exists invoices_event_id_idx on public.invoices(event_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_due_date_idx on public.invoices(due_date);

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

drop policy if exists "org members read invoices" on public.invoices;
create policy "org members read invoices" on public.invoices
  for select using (
    organization_id = public.current_organization_id()
    and (public.is_staff() or public.is_event_client(event_id))
  );

drop policy if exists "staff manage invoices" on public.invoices;
create policy "staff manage invoices" on public.invoices
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

insert into public.invoices (
  organization_id,
  event_id,
  client_id,
  invoice_number,
  invoice_type,
  amount,
  paid_amount,
  due_date,
  status,
  notes,
  metadata
)
select
  event.organization_id,
  event.id,
  event.client_id,
  'INV-' || to_char(event.created_at, 'YYYYMMDD') || '-' ||
    lpad(row_number() over (
      partition by event.organization_id
      order by event.created_at, event.id
    )::text, 4, '0'),
  'Deposit',
  round((coalesce(event.client_price, 0) * 0.5)::numeric, 2),
  0,
  event.event_date,
  'Draft',
  'Seeded deposit invoice for existing event.',
  jsonb_build_object('seeded_from', 'event_client_price', 'phase', 'invoices')
from public.events event
where coalesce(event.client_price, 0) > 0
  and not exists (
    select 1
    from public.invoices invoice
    where invoice.event_id = event.id
  );
