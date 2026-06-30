create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  meeting_id uuid references public.meetings(id) on delete set null,
  title text not null,
  provider text not null default 'fathom',
  provider_meeting_id text not null,
  recording_url text,
  transcript_url text,
  transcript_text text,
  fathom_summary text,
  fathom_action_items jsonb not null default '[]'::jsonb,
  participants jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  synced_at timestamptz,
  raw_provider_payload jsonb not null default '{}'::jsonb,
  ai_enrichment jsonb not null default '{}'::jsonb,
  ai_follow_up_draft text,
  ai_enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meeting_notes
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists event_id uuid references public.events(id) on delete set null,
  add column if not exists meeting_id uuid references public.meetings(id) on delete set null,
  add column if not exists title text,
  add column if not exists provider text,
  add column if not exists provider_meeting_id text,
  add column if not exists recording_url text,
  add column if not exists transcript_url text,
  add column if not exists transcript_text text,
  add column if not exists fathom_summary text,
  add column if not exists fathom_action_items jsonb not null default '[]'::jsonb,
  add column if not exists participants jsonb not null default '[]'::jsonb,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists duration_seconds integer,
  add column if not exists synced_at timestamptz,
  add column if not exists raw_provider_payload jsonb not null default '{}'::jsonb,
  add column if not exists ai_enrichment jsonb not null default '{}'::jsonb,
  add column if not exists ai_follow_up_draft text,
  add column if not exists ai_enriched_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.meeting_notes
  alter column provider set default 'fathom',
  alter column fathom_action_items set default '[]'::jsonb,
  alter column participants set default '[]'::jsonb,
  alter column raw_provider_payload set default '{}'::jsonb,
  alter column ai_enrichment set default '{}'::jsonb;

create unique index if not exists meeting_notes_provider_meeting_idx
  on public.meeting_notes(organization_id, provider, provider_meeting_id);

create index if not exists meeting_notes_event_id_idx
  on public.meeting_notes(event_id, started_at desc);

create index if not exists meeting_notes_meeting_id_idx
  on public.meeting_notes(meeting_id, started_at desc);

drop trigger if exists set_meeting_notes_updated_at on public.meeting_notes;
create trigger set_meeting_notes_updated_at before update on public.meeting_notes
  for each row execute function public.set_updated_at();

alter table public.meeting_notes enable row level security;

drop policy if exists "org members read meeting notes" on public.meeting_notes;
create policy "org members read meeting notes" on public.meeting_notes
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage meeting notes" on public.meeting_notes;
create policy "staff manage meeting notes" on public.meeting_notes
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());
