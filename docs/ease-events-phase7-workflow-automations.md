# EaseEvents Phase 7: Lifecycle Automations, Reminders, and Notifications

## Architecture Decision

Phase 7 extends the existing durable project architecture. It does not create a second project, reminder, communication, email, or notification model.

The automation flow is:

1. A domain event is recorded in `workflow_events`.
2. Active `workflow_automations` with the matching `trigger_type` are queued as `workflow_executions`.
3. Each configured `workflow_automation_actions` row becomes a `workflow_action_runs` audit record.
4. Safe actions create existing operational records:
   - `notifications`
   - `project_reminders`
   - `project_activity_events`
   - suppressed/test communication drafts in `communication_messages`
5. Every side effect uses an idempotency key.
6. The worker records completion, failure, or approval-required states.

This uses a database-backed queue for the MVP. It can later be moved to Supabase Cron/Queues without changing the product-facing data model.

## New Tables

- `workflow_automations`
- `workflow_automation_actions`
- `workflow_events`
- `workflow_executions`
- `workflow_action_runs`
- `notifications`
- `notification_preferences`

All tables include `organization_id`, RLS, indexes, and updated-at triggers where records are mutable.

## Safe Automation Boundaries

Automations can:

- create in-app staff notifications
- create project reminders
- create internal project activity
- create suppressed/test email drafts

Automations cannot:

- accept proposals
- approve client work
- record payments
- change booking state
- create or cancel external calendar events
- send live customer email during tests

Presets are seeded as `Inactive`.

## Worker Command

```bash
npm run events:workflows:process
```

Recommended cron shape:

```bash
EASE_EVENTS_WORKFLOW_LIMIT=50 npm run events:workflows:process
```

## Verification

The controlled E2E test creates only records marked with a unique `easeevents-phase7-*` identifier.

```bash
EASE_EVENTS_PHASE7_TEST_ID=easeevents-phase7-$(date +%s) npm run events:phase7:e2e
```

Cleanup:

```bash
EASE_EVENTS_PHASE7_TEST_ID=<the-exact-test-id> npm run events:phase7:cleanup
```

The E2E test refuses to run when `EASE_EVENTS_EMAIL_MODE=live`.

## Migration Command

```bash
supabase db push
```

The migration is additive and should run after Phase 6:

`supabase/migrations/20260619183000_ease_events_phase7_workflow_automations.sql`

## UI Changes

- The top bar now includes an in-app notification center.
- Settings includes a Lifecycle Automations panel with:
  - active rule count
  - approval queue count
  - failed run count
  - unread notification count
  - seeded presets
  - actions per automation
  - recent executions
  - enable/pause/disable controls
- Dashboard action queue now surfaces:
  - approval-required automations
  - failed automation runs
  - unread action notifications

## Operational Notes

- Use `disabled` or `test` email mode for local and verification runs.
- Do not enable presets in production until the team has reviewed trigger timing and owner assignment.
- Use execution and action-run records to investigate failed automations before retrying.
