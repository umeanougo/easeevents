-- Phase 1: canonical clients.
-- Clients are now the source of truth for identity. Lead/event/thread names are snapshots only.

do $$
begin
  if to_regclass('public.leads') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'leads' and column_name = 'client_name'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'leads' and column_name = 'client_name_snapshot'
    ) then
      alter table public.leads rename column client_name to client_name_snapshot;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'leads' and column_name = 'client_name'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'leads' and column_name = 'client_name_snapshot'
    ) then
      update public.leads
      set client_name_snapshot = coalesce(client_name_snapshot, client_name)
      where client_name_snapshot is null and client_name is not null;
    end if;
  end if;

  if to_regclass('public.events') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'events' and column_name = 'client_name'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'events' and column_name = 'client_name_snapshot'
    ) then
      alter table public.events rename column client_name to client_name_snapshot;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'events' and column_name = 'client_name'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'events' and column_name = 'client_name_snapshot'
    ) then
      update public.events
      set client_name_snapshot = coalesce(client_name_snapshot, client_name)
      where client_name_snapshot is null and client_name is not null;
    end if;
  end if;

  if to_regclass('public.communication_threads') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'communication_threads' and column_name = 'client_name'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'communication_threads' and column_name = 'client_name_snapshot'
    ) then
      alter table public.communication_threads rename column client_name to client_name_snapshot;
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'communication_threads' and column_name = 'client_name'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'communication_threads' and column_name = 'client_name_snapshot'
    ) then
      update public.communication_threads
      set client_name_snapshot = coalesce(client_name_snapshot, client_name)
      where client_name_snapshot is null and client_name is not null;
    end if;
  end if;
end $$;

comment on column public.leads.client_name_snapshot is
  'Historical lead-time client name snapshot. Canonical identity lives in public.clients.display_name.';

comment on column public.events.client_name_snapshot is
  'Historical event-time client name snapshot. Canonical identity lives in public.clients.display_name.';

comment on column public.communication_threads.client_name_snapshot is
  'Historical communication-time client name snapshot. Canonical identity lives in public.clients.display_name.';
