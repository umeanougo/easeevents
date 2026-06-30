create extension if not exists pgcrypto;

alter table public.communication_messages
  add column if not exists delivery_status text,
  add column if not exists delivery_mode text,
  add column if not exists delivery_error text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.communication_messages
  drop constraint if exists communication_messages_delivery_status_check,
  add constraint communication_messages_delivery_status_check
    check (
      delivery_status is null
      or delivery_status in (
        'Queued',
        'Sent',
        'Test Redirected',
        'Suppressed',
        'Failed',
        'Retry Required'
      )
    );

alter table public.communication_messages
  drop constraint if exists communication_messages_delivery_mode_check,
  add constraint communication_messages_delivery_mode_check
    check (delivery_mode is null or delivery_mode in ('disabled', 'test', 'live'));

create table if not exists public.public_inquiry_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  submission_key text not null,
  upload_token_hash text,
  token_expires_at timestamptz not null default (now() + interval '2 hours'),
  test_identifier text,
  status text not null default 'initialized',
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  thread_id uuid references public.communication_threads(id) on delete set null,
  acknowledgment_message_id uuid references public.communication_messages(id) on delete set null,
  email_mode text not null default 'disabled',
  email_status text not null default 'Suppressed',
  intended_recipient text,
  actual_recipient text,
  email_subject text,
  email_error text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_inquiry_submissions_status_check
    check (status in ('initialized', 'finalized', 'failed', 'abandoned')),
  constraint public_inquiry_submissions_email_mode_check
    check (email_mode in ('disabled', 'test', 'live')),
  constraint public_inquiry_submissions_email_status_check
    check (
      email_status in (
        'Queued',
        'Sent',
        'Test Redirected',
        'Suppressed',
        'Failed',
        'Retry Required'
      )
    )
);

create unique index if not exists public_inquiry_submissions_submission_key_idx
  on public.public_inquiry_submissions(organization_id, submission_key);

create unique index if not exists public_inquiry_submissions_upload_token_hash_idx
  on public.public_inquiry_submissions(upload_token_hash)
  where upload_token_hash is not null;

create index if not exists public_inquiry_submissions_project_idx
  on public.public_inquiry_submissions(project_id, created_at desc);

create index if not exists public_inquiry_submissions_test_identifier_idx
  on public.public_inquiry_submissions(test_identifier)
  where test_identifier is not null;

create table if not exists public.public_inquiry_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  submission_id uuid not null references public.public_inquiry_submissions(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  file_id uuid references public.files(id) on delete set null,
  client_file_id text not null,
  file_digest text,
  original_filename text not null,
  sanitized_filename text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  storage_path text not null,
  status text not null default 'pending',
  error_message text,
  uploaded_at timestamptz,
  finalized_at timestamptz,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_inquiry_uploads_status_check
    check (status in ('pending', 'uploading', 'uploaded', 'finalized', 'failed', 'abandoned')),
  constraint public_inquiry_uploads_size_check check (size_bytes >= 0)
);

create unique index if not exists public_inquiry_uploads_client_file_idx
  on public.public_inquiry_uploads(submission_id, client_file_id);

create unique index if not exists public_inquiry_uploads_digest_filename_idx
  on public.public_inquiry_uploads(submission_id, file_digest, original_filename)
  where file_digest is not null;

create index if not exists public_inquiry_uploads_submission_idx
  on public.public_inquiry_uploads(submission_id, status, created_at desc);

create index if not exists public_inquiry_uploads_project_idx
  on public.public_inquiry_uploads(project_id, created_at desc);

drop trigger if exists set_public_inquiry_submissions_updated_at on public.public_inquiry_submissions;
create trigger set_public_inquiry_submissions_updated_at before update on public.public_inquiry_submissions
  for each row execute function public.set_updated_at();

drop trigger if exists set_public_inquiry_uploads_updated_at on public.public_inquiry_uploads;
create trigger set_public_inquiry_uploads_updated_at before update on public.public_inquiry_uploads
  for each row execute function public.set_updated_at();

alter table public.public_inquiry_submissions enable row level security;
alter table public.public_inquiry_uploads enable row level security;

drop policy if exists "staff read public inquiry submissions" on public.public_inquiry_submissions;
create policy "staff read public inquiry submissions" on public.public_inquiry_submissions
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage public inquiry submissions" on public.public_inquiry_submissions;
create policy "staff manage public inquiry submissions" on public.public_inquiry_submissions
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff read public inquiry uploads" on public.public_inquiry_uploads;
create policy "staff read public inquiry uploads" on public.public_inquiry_uploads
  for select using (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "staff manage public inquiry uploads" on public.public_inquiry_uploads;
create policy "staff manage public inquiry uploads" on public.public_inquiry_uploads
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());
