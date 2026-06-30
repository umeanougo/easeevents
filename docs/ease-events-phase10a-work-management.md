# EaseEvents Phase 10A.1 Work Management

## Architecture Decision

Phase 10A.1 keeps `public.tasks` as the canonical work record. Board cards, table rows, My Work, archived work, project task tabs, calendar projections, and event-day references all point at the same task row.

No separate card table, mirrored task copy, or project-specific task system was introduced.

## Daily Trello Replacement Scope

Implemented in Increment 10A.1:

- Top-level Work hub at `/ease-events/work`
- Legacy `/ease-events/tasks` mapped to the same Work hub
- Project task workspace reused inside event task tabs
- My Work, Inbox, All Tasks, Templates, and Archived sections
- Board and Table views over canonical tasks
- Configurable workflow columns with normalized statuses
- Drag between columns plus accessible left/right/up/down controls
- Quick add, quick owner, due date, priority, and workflow stage
- Rich task drawer with description, links, files, comments, labels, visibility, owner, assignees, watchers, dates, and multiple checklists
- Checklist item assignee and due date
- Inbox conversion to task
- Archive and restore
- Project-file reuse for task attachments and card covers
- Basic saved filters and operational filters
- Staff-safe RLS plus explicit client/vendor read path through `public.can_read_task()`

Deferred to Increment 10A.2:

- First-class task dependencies
- Custom task fields
- Advanced bulk-edit table behavior
- Timeline and Workload views
- Template task sets
- Recurring tasks
- Expanded automation trigger/action catalog
- Concurrency conflict UI
- Performance benchmarking at full target scale
- Trello import and email-to-Inbox forwarding

## Schema Additions

Migration:

`supabase/migrations/20260619213000_ease_events_phase10a_work_management.sql`

Adds:

- `task_normalized_status`
- `task_visibility`
- `task_participant_role`
- `task_inbox_status`
- `task_workflow_columns`
- `task_labels`
- `task_label_assignments`
- `task_participants`
- `task_checklists`
- `task_saved_views`
- `task_inbox_items`

Extends:

- `tasks` with workflow, position, archive, visibility, source, effort, card-cover, and internal-work fields
- `task_checklist_items` with checklist grouping, assignee, due date, notes, completion audit, and converted-task reference
- `comments` with `task_id`, parent comment, mentions, edit/delete state, and metadata

## RLS Model

Staff can manage tasks and related work records within their organization.

Clients can read only tasks that:

- belong to their event/project context
- are explicitly `Client` visible

Vendors can read only tasks that:

- belong to their event/vendor context
- are explicitly `Vendor` visible

Task child records such as checklist items, links, attachments, participants, and comments resolve access through `public.can_read_task(task_row)`.

## UI Integration

Primary files:

- `src/components/ease-events/work-management.tsx`
- `src/routes/ease-events/work.tsx`
- `src/routes/ease-events/tasks.tsx`
- `src/components/ease-events/app-shell.tsx`
- `src/components/ease-events/pages.tsx`

Store/repository files:

- `src/lib/ease-events/types.ts`
- `src/lib/ease-events/store.tsx`
- `src/lib/ease-events/supabase-repository.ts`
- `src/lib/ease-events/demo-data.ts`

## Verification Commands

Apply the migration:

```bash
supabase db push
```

Run the build:

```bash
npm run build
```

Run controlled database E2E:

```bash
EASE_EVENTS_PHASE10A_TEST_ID=easeevents-phase10a-work-$(date +%s) npm run events:phase10a:e2e
```

Clean only generated test records:

```bash
EASE_EVENTS_PHASE10A_TEST_ID=<the-exact-test-id> npm run events:phase10a:cleanup
```

The Phase 10A.1 E2E refuses to run with `EASE_EVENTS_EMAIL_MODE=live` and does not send email, charge payment methods, create invitations, or call external providers.
