# EaseEvents Phase 6: Event-Day Command Mode

## Architecture Decision

Event-Day Command Mode uses the existing event workspace as the source of truth. It does not introduce a parallel event, task, vendor, file, or timeline model.

- Run of show: `event_timeline_items`
- Activation and lifecycle: `event_day_sessions`
- Vendor arrival state: `event_day_vendor_statuses`
- Issue and decision log: `event_day_issues`
- Finalized run-of-show snapshots: `timeline_versions`
- Quick internal notes: existing `communication_threads` and `communication_messages`
- Event files: existing `files` records scoped by `organization_id`, `project_id`, and `event_id`

The dedicated planner route is:

```txt
/ease-events/events/:eventId/event-day
```

## Data Model

Additive migration:

```txt
supabase/migrations/20260619170000_ease_events_phase6_event_day.sql
```

The migration:

- Adds event-day timeline fields such as planned/actual timestamps, criticality, delay reason, contingency notes, vendor assignment, team assignment, version number, and current-item pinning.
- Adds event-day team fields to `event_team_members`.
- Creates `timeline_versions`, `event_day_sessions`, `event_day_vendor_statuses`, and `event_day_issues`.
- Adds organization consistency triggers for new records.
- Enables RLS and staff-scoped policies for the new command-mode tables.
- Uses `public.set_updated_at()` triggers for updateable tables.

## Command Center UX

The command route is mobile-first and prioritizes:

1. Current item
2. Next item
3. Late, delayed, and blocked items
4. Vendor arrivals
5. Team responsibilities
6. Issue log
7. Quick internal notes
8. Offline/sync state
9. Printable run sheet

Staff can:

- Preview, mark ready, activate, pause, and complete Event-Day Mode.
- Finalize a run-of-show snapshot on activation.
- Start, complete, delay, block, skip, and pin timeline items.
- Check in vendors and mark arrival/setup/delay states.
- Create and resolve event-day issues.
- Save internal notes into project communications.
- Prepare selected event data for offline use.
- Print a run sheet with timeline, team contacts, and vendor arrival status.

## Current / Next Logic

`src/lib/ease-events/event-day.ts` calculates command state deterministically.

Priority order:

1. Manually pinned current item.
2. Active `In Progress` item.
3. Ready item whose dependency is complete.
4. The item whose planned window contains the current time.
5. First non-terminal, dependency-ready item by planned start.

Terminal statuses are:

```txt
Complete, Completed, Skipped, Cancelled
```

The service also returns delayed, blocked, late, recently completed, and readiness-check collections for the UI.

## Live Updates

Phase 6 uses bounded revalidation instead of Supabase Realtime.

Decision rationale:

- The current app architecture has no existing Realtime subscription layer.
- The command screen already loads the organization-scoped store and can safely revalidate.
- Polling every 30 seconds keeps the event-day view fresh without introducing a broad realtime state model.
- RLS and repository writes remain the authority for every mutation.

Future upgrade path:

- Add an event-scoped Realtime subscription for `event_timeline_items`, `event_day_sessions`, `event_day_vendor_statuses`, `event_day_issues`, and internal notes.
- Keep optimistic writes routed through the same store actions.
- Use `updated_at` and `version_number` for conflict handling.

## Offline-Resilient Mode

Phase 6 implements bounded selected-event offline support using browser localStorage.

Stored locally:

- Event identity
- Run of show
- Team members
- Vendor assignments and statuses
- Event-day issues
- Selected file metadata only
- Queued mutations for the selected event

Never stored locally:

- Service-role keys
- Provider access tokens
- Stripe secrets
- Full organization data
- Unrelated client, finance, or vendor records

Offline-supported queued mutations:

- Timeline status changes
- Current-item pinning
- Vendor status updates
- Issue creation/resolution
- Event-day session status changes

The UI labels local-only changes as:

```txt
Saved on this device / Waiting to sync / Sync failed / Fully synchronized
```

This phase does not install a service worker or IndexedDB cache. That is intentionally deferred until the product has a broader PWA/offline policy.

## Dashboard and Calendar Integration

Dashboard action queue now surfaces:

- Active Event-Day Mode sessions
- Events today
- Active event-day issues
- Delayed or blocked critical run-of-show items
- Vendor arrivals needing check-in

Calendar detail panels now show `Open Event Day` whenever the selected entry is tied to an event.

Event workspaces show an `Open Event Day` button in the page header.

## Security

New tables require `organization_id` and enforce organization consistency against the linked event/project/vendor/timeline records.

RLS policies are staff-scoped for Phase 6:

- Admin/planner staff can read/manage command-mode records in their organization.
- Anonymous users cannot read event-day records.
- Clients and vendors do not receive the internal command center in this phase.

Future vendor/client access should add explicit scoped policies rather than relying on hidden UI.

## Manual Device Test Checklist

Test these paths before a real event:

- iPhone-sized viewport: command header, sticky current/next cards, vendor actions, issue form.
- Android-sized viewport: touch targets, wrapping text, status badges, bottom actions.
- Tablet: two-column command layout and sticky panel.
- Desktop: printable run sheet and calendar/event-workspace entry points.
- Slow network: activation, status changes, vendor check-in, and refresh state.
- Fully offline: prepare offline package, change timeline status, create issue, check in vendor, confirm queued state says saved on this device.
- Back online: retry queued changes and confirm exactly-once sync.
- Browser refresh while offline: cached event payload remains readable.
- Logout/shared device: remove local event data before handing the device to someone else.
- Second staff member: update a timeline item and confirm the first screen refreshes within the bounded polling window.

## Verification Commands

Apply migration:

```bash
supabase db push
```

Run build:

```bash
npm run build
```

Run controlled e2e:

```bash
EASE_EVENTS_PHASE6_TEST_ID=easeevents-phase6-$(date +%s) npm run events:phase6:e2e
```

Cleanup controlled e2e data:

```bash
EASE_EVENTS_PHASE6_TEST_ID=<exact-test-id> npm run events:phase6:cleanup
```

The Phase 6 e2e does not send real email, create calendar invitations, or charge a payment method.
