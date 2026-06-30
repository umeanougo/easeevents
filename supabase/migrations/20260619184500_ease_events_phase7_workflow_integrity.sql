create unique index if not exists workflow_automations_id_org_idx
  on public.workflow_automations(id, organization_id);

create unique index if not exists workflow_automation_actions_id_org_idx
  on public.workflow_automation_actions(id, organization_id);

create unique index if not exists workflow_events_id_org_idx
  on public.workflow_events(id, organization_id);

create unique index if not exists workflow_executions_id_org_idx
  on public.workflow_executions(id, organization_id);

do $$ begin
  alter table public.workflow_automation_actions
    add constraint workflow_automation_actions_automation_org_fk
    foreign key (automation_id, organization_id)
    references public.workflow_automations(id, organization_id)
    on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.workflow_executions
    add constraint workflow_executions_automation_org_fk
    foreign key (automation_id, organization_id)
    references public.workflow_automations(id, organization_id)
    on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.workflow_executions
    add constraint workflow_executions_event_org_fk
    foreign key (workflow_event_id, organization_id)
    references public.workflow_events(id, organization_id)
    on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.workflow_action_runs
    add constraint workflow_action_runs_execution_org_fk
    foreign key (execution_id, organization_id)
    references public.workflow_executions(id, organization_id)
    on delete cascade;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.workflow_action_runs
    add constraint workflow_action_runs_action_org_fk
    foreign key (automation_action_id, organization_id)
    references public.workflow_automation_actions(id, organization_id)
    on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.notifications
    add constraint notifications_workflow_execution_org_fk
    foreign key (workflow_execution_id, organization_id)
    references public.workflow_executions(id, organization_id)
    on delete set null;
exception when duplicate_object then null;
end $$;
