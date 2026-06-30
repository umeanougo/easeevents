do $$ begin
  create type public.communication_channel as enum ('Email', 'Meeting', 'Phone');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.communication_thread_status as enum ('Needs Reply', 'Scheduled', 'Waiting on Client', 'Closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.communication_direction as enum ('Inbound', 'Outbound', 'Internal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.meeting_type as enum ('Google Meet', 'Phone', 'In Person');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.meeting_status as enum ('Scheduled', 'Completed', 'Cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.communication_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  assigned_to_id uuid references public.users(id) on delete set null,
  subject text not null,
  client_name text not null,
  participants text[] not null default '{}',
  channel public.communication_channel not null default 'Email',
  status public.communication_thread_status not null default 'Needs Reply',
  integration_source text,
  preview text,
  unread_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid not null references public.communication_threads(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  direction public.communication_direction not null default 'Outbound',
  body text not null,
  summary text,
  visibility public.message_visibility not null default 'Client',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  organizer_id uuid references public.users(id) on delete set null,
  title text not null,
  meeting_type public.meeting_type not null default 'Google Meet',
  status public.meeting_status not null default 'Scheduled',
  start_at timestamptz not null,
  end_at timestamptz not null,
  attendees text[] not null default '{}',
  agenda text,
  link text,
  transcript text,
  internal_summary text,
  client_summary text,
  notes text,
  action_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_threads_event_id_idx
  on public.communication_threads(event_id, last_activity_at desc);

create index if not exists communication_messages_thread_id_idx
  on public.communication_messages(thread_id, sent_at desc);

create index if not exists meetings_event_id_idx
  on public.meetings(event_id, start_at desc);

drop trigger if exists set_communication_threads_updated_at on public.communication_threads;
create trigger set_communication_threads_updated_at before update on public.communication_threads
  for each row execute function public.set_updated_at();

drop trigger if exists set_communication_messages_updated_at on public.communication_messages;
create trigger set_communication_messages_updated_at before update on public.communication_messages
  for each row execute function public.set_updated_at();

drop trigger if exists set_meetings_updated_at on public.meetings;
create trigger set_meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

alter table public.communication_threads enable row level security;
alter table public.communication_messages enable row level security;
alter table public.meetings enable row level security;

drop policy if exists "org members read communication threads" on public.communication_threads;
create policy "org members read communication threads" on public.communication_threads
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage communication threads" on public.communication_threads;
create policy "staff manage communication threads" on public.communication_threads
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read communication messages" on public.communication_messages;
create policy "org members read communication messages" on public.communication_messages
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage communication messages" on public.communication_messages;
create policy "staff manage communication messages" on public.communication_messages
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());

drop policy if exists "org members read meetings" on public.meetings;
create policy "org members read meetings" on public.meetings
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage meetings" on public.meetings;
create policy "staff manage meetings" on public.meetings
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());
