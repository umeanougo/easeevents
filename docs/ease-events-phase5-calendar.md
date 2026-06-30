# EaseEvents Phase 5: Unified Calendar

## Architecture Decision

Phase 5 keeps operational domain records as the source of truth and builds a unified calendar projection in `src/lib/ease-events/calendar.ts`.

The calendar does not create a second editable scheduling model. It projects:

- `events`
- `meetings`
- `event_timeline_items`
- `tasks`
- `approvals`
- `proposals`
- `invoices`
- `expenses`
- `project_reminders`
- `external_calendar_events`

into a normalized `CalendarEntry` shape for UI filtering, conflict detection, and details.

## Additive Data Model

Migration:

`supabase/migrations/20260619153000_ease_events_phase5_calendar.sql`

Adds:

- `calendar_sync_states`
- `external_calendar_events`
- `scheduling_preferences`
- `availability_blocks`
- `calendar_conflicts`
- `calendar_sync_runs`

Adds meeting metadata:

- `timezone`
- `sync_status`
- `sync_error`
- `provider_updated_at`
- `fathom_expected`
- `idempotency_key`

All new tables are organization-scoped, RLS-enabled, and use `public.set_updated_at()` where records are mutable.

## Calendar Projection Rules

- Event dates come from `events.event_date`, `start_time`, and `end_time`.
- Meetings come from `meetings.start_at` and `end_at`, with effective status calculated from the end time.
- Run-of-show items use the related event date plus `event_timeline_items.start_time`.
- Task, approval, proposal, invoice, expense, and reminder deadlines remain owned by their domain tables.
- External-only Google/Microsoft records live in `external_calendar_events`.
- Provider-matched calendar items can still become `meetings`.

## Sync Rules

Existing Google/Microsoft sync still runs through:

- `src/lib/ease-events/integrations.server.ts`
- `src/routes/api/ease-events/integrations/calendar/sync.ts`

Phase 5 adds:

- sync run audit rows in `calendar_sync_runs`
- current sync state in `calendar_sync_states`
- external-only event cache rows in `external_calendar_events`

The Phase 5 e2e does not call Google or Microsoft APIs. It simulates provider cache records only.

## UI

The new calendar UI is implemented in:

`src/components/ease-events/calendar-workspace.tsx`

Route:

`/ease-events/calendar`

Views:

- Month
- Week
- Day
- Agenda

Controls:

- Previous / Next / Today
- Date picker
- View switcher
- Search
- Filter panel
- Refresh sync
- Create

Create supports:

- Consultation
- Client meeting
- Internal meeting
- Reminder
- Task
- Run-of-show item

Editable source records can be rescheduled through forms. Drag/drop is intentionally deferred in favor of accessible, source-aware editing.

## Conflict Detection

The projection layer calculates:

- same-planner overlapping timed entries
- client-facing meetings without join links
- entries outside configured working hours
- entries overlapping availability blocks

Dashboard action queue now surfaces calendar conflicts and sync attention items.

## Commands

Apply migration:

```bash
supabase db push
```

Build:

```bash
npm run build
```

Run Phase 5 e2e:

```bash
EASE_EVENTS_PHASE5_TEST_ID=easeevents-phase5-$(date +%s) npm run events:phase5:e2e
```

Cleanup Phase 5 e2e records:

```bash
EASE_EVENTS_PHASE5_TEST_ID=<the-test-id> npm run events:phase5:cleanup
```

## Safety

- No real external calendar events are created by the Phase 5 test.
- No invite emails are sent by the Phase 5 test.
- Cleanup deletes only records tied to the exact `easeevents-phase5-*` identifier.
