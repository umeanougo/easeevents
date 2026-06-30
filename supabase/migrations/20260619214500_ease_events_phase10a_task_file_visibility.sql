create or replace function public.is_event_vendor(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_vendors assignment
    join public.vendors vendor
      on vendor.id = assignment.vendor_id
      and vendor.organization_id = assignment.organization_id
    join public.users app_user
      on app_user.id = auth.uid()
      and app_user.organization_id = assignment.organization_id
      and app_user.role = 'vendor'
      and lower(app_user.email) = lower(vendor.email)
    where assignment.event_id = target_event_id
      and assignment.organization_id = public.current_organization_id()
  );
$$;

create or replace function public.can_read_file(file_row public.files)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    file_row.organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or (
        file_row.visibility = 'Client'
        and (
          (file_row.event_id is not null and public.is_event_client(file_row.event_id))
          or (file_row.project_id is not null and public.is_project_client(file_row.project_id))
        )
      )
      or (
        file_row.visibility = 'Vendor'
        and file_row.event_id is not null
        and public.is_event_vendor(file_row.event_id)
      )
    );
$$;

alter table public.task_links
  add column if not exists visibility public.message_visibility not null default 'Internal';

alter table public.task_attachments
  add column if not exists visibility public.message_visibility not null default 'Internal';

drop policy if exists "org members read files" on public.files;
drop policy if exists "phase10a read files by visibility" on public.files;
create policy "phase10a read files by visibility" on public.files
  for select using (public.can_read_file(files));

drop policy if exists "org members read task links" on public.task_links;
drop policy if exists "phase10a read task links" on public.task_links;
drop policy if exists "phase10a read task links by visibility" on public.task_links;
create policy "phase10a read task links by visibility" on public.task_links
  for select using (
    exists (
      select 1
      from public.tasks task
      where task.id = task_links.task_id
        and public.can_read_task(task)
        and (
          public.is_staff()
          or (task_links.visibility = 'Client' and public.current_user_role() = 'client')
          or (task_links.visibility = 'Vendor' and public.current_user_role() = 'vendor')
        )
    )
  );

drop policy if exists "org members read task attachments" on public.task_attachments;
drop policy if exists "phase10a read task attachments" on public.task_attachments;
drop policy if exists "phase10a read task attachments by visibility" on public.task_attachments;
create policy "phase10a read task attachments by visibility" on public.task_attachments
  for select using (
    exists (
      select 1
      from public.tasks task
      left join public.files file_record on file_record.id = task_attachments.file_id
      where task.id = task_attachments.task_id
        and public.can_read_task(task)
        and (
          public.is_staff()
          or (task_attachments.file_id is not null and file_record.id is not null and public.can_read_file(file_record))
          or (
            task_attachments.file_id is null
            and (
              (task_attachments.visibility = 'Client' and public.current_user_role() = 'client')
              or (task_attachments.visibility = 'Vendor' and public.current_user_role() = 'vendor')
            )
          )
        )
        and (
          task_attachments.file_id is null
          or file_record.id is not null and public.can_read_file(file_record)
        )
    )
  );

drop policy if exists "phase10a read comments" on public.comments;
drop policy if exists "phase10a read comments by visibility" on public.comments;
create policy "phase10a read comments by visibility" on public.comments
  for select using (
    organization_id = public.current_organization_id()
    and (
      public.is_staff()
      or (
        task_id is not null
        and exists (
          select 1 from public.tasks task
          where task.id = comments.task_id
            and public.can_read_task(task)
            and (
              (comments.visibility = 'Client' and public.current_user_role() = 'client')
              or (comments.visibility = 'Vendor' and public.current_user_role() = 'vendor')
            )
        )
      )
      or (
        task_id is null
        and visibility <> 'Internal'
      )
    )
  );
