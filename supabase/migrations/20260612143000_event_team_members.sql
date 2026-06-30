create table if not exists public.event_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_label text not null default 'Planner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

drop trigger if exists set_event_team_members_updated_at on public.event_team_members;
create trigger set_event_team_members_updated_at before update on public.event_team_members
  for each row execute function public.set_updated_at();

alter table public.event_team_members enable row level security;

drop policy if exists "org members read event team members" on public.event_team_members;
create policy "org members read event team members" on public.event_team_members
  for select using (organization_id = public.current_organization_id());

drop policy if exists "staff manage event team members" on public.event_team_members;
create policy "staff manage event team members" on public.event_team_members
  for all using (organization_id = public.current_organization_id() and public.is_staff())
  with check (organization_id = public.current_organization_id() and public.is_staff());
