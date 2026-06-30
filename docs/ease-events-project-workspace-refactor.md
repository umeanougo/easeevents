# EaseEvents Project Workspace Refactor

Date: 2026-06-18

This document maps the think-aloud findings to the current codebase and defines the refactor path from module-centric navigation to a persistent project workspace.

## Findings-To-Code Mapping

- Project workspace continuity: `src/components/ease-events/pages.tsx`
  - `LeadDetailPage` is the inquiry-stage project workspace.
  - `EventDetailPage` is the booked-event workspace.
  - `EventCommunicationsPanel`, task board/table, invoices, budget, files, approvals, team, run-of-show, and AI cards are already reusable inside the event workspace.
- Communications and meetings: `src/components/ease-events/communications-page.tsx`, `src/lib/ease-events/integrations.server.ts`, `src/services/integrations/fathom.ts`
  - Existing event-scoped threads support Email, Meeting, Phone.
  - Current schema does not support lead-scoped communication threads yet.
- Inquiry form: `src/components/ease-events/pages.tsx` `InquiryPage`
  - Lead intake exists, but lead-scoped uploads require schema/storage work.
- Booking conversion: `src/lib/ease-events/store.tsx`, `src/lib/ease-events/supabase-repository.ts`
  - Lead conversion creates/links client, event, kickoff task, proposal approval, and lead-owner team assignment.
  - Phase 2 preserves the project ID through conversion and creates a payment-terms setup task instead of guessing a deposit invoice.
- Navigation: `src/components/ease-events/app-shell.tsx`
  - Vendors are now visible as a top-level staff nav item.
- Payments: `src/routes/api/ease-events/checkout.ts`
  - This pass restricts Stripe Checkout to card payment methods for the MVP.
- Schema and migrations: `supabase/migrations/`
  - Existing tenancy and RLS are organization-based.
  - Communication, invoices, clients, templates, timeline items, and meeting notes exist.
  - Phase 2 adds project-level uploads, inspiration links, activity history, reminders, email templates, and task links.
  - Remaining gaps include expenses, payment-method configuration, proposal documents, and richer task activity.

## Prioritized Backlog

### Critical

1. Project abstraction
   - Add a durable `projects` or project reference layer that can represent either a lead-stage inquiry or a booked event.
   - Link communications, files, tasks, notes, reminders, and activity to a project before conversion.
2. Lead-scoped communication timeline
   - Allow inquiry acknowledgment email, replies, call notes, consultation scheduling, and Fathom summaries before an event exists.
3. Proposal-to-booking flow
   - Add proposal packages/templates, payment schedule, client approval, deposit invoice, and guided event setup preview.
4. Event-day command mode
   - Mobile-first run-of-show, vendor contacts, issue log, live checklist, and quick update flow.
5. Expenses and profitability
   - Separate client revenue from operational costs and calculate actual profit from invoices/payments/expenses.

### High Leverage

1. Inquiry uploads
   - Public inspiration uploads with Supabase Storage, progress/error states, file limits, and RLS.
2. Notification/reminder engine
   - Follow-up reminders for unanswered inquiries, approvals, invoices, meetings, and finalization blockers.
3. Calendar upgrade
   - Month/week/day/agenda views with events, meetings, deadlines, tasks, payments, approvals, vendors, and run-of-show items.
4. Task attachments and activity
   - Multiple files, image previews, links, comments, dependencies, and task activity.
5. Reporting filters
   - Date ranges, planner, vendor, event type, lead source, booked/collected/open/overdue revenue, expenses, and profit.

### Later

1. Configurable processing-fee model with audit history.
2. Retention campaigns, anniversary reminders, and rebooking automations.
3. Vendor portal enhancements for confirmations, docs, invoices, and task completion.
4. Email template designer and quick-reply library.

## Database And Migration Plan

1. Add project continuity tables.
   - `projects`: `organization_id`, `lead_id`, `event_id`, `client_id`, `project_stage`, `last_activity_at`, `created_at`, `updated_at`.
   - Backfill one project per lead/event.
   - RLS: org staff can manage; clients/vendors can read only assigned project slices.
2. Extend project-scoped records.
   - Add nullable `project_id` to `communication_threads`, `communication_messages`, `files`, `tasks`, `meetings`, `comments`, and future reminders.
   - Preserve `event_id` for booked-event compatibility.
3. Public inquiry uploads.
   - Add `lead_files` or project-scoped `files` support with `lead_id/project_id`.
   - Storage bucket path: `{organization_id}/projects/{project_id}/inquiry/...`.
   - Public upload endpoint must validate size/type and never expose service keys.
4. Expenses.
   - Add `expenses` with `organization_id`, `event_id`, `vendor_id`, category, description, amount, tax, transaction date, payment method, receipt file, notes, bookkeeping status, created_by, timestamps.
   - RLS: staff manage, vendor/client visibility only when explicitly exposed.
5. Payment configuration.
   - Add `payment_settings` and `payment_fee_audit_events`.
   - Never apply fees to ineligible methods.
6. Activity and reminders.
   - Add `activity_events` and `reminders` with project ownership, actor, due date, status, and automation source.

No reset or destructive migration should be used. All migrations must be additive/backfilled and keep `organization_id` tenancy.

## Route And Component Plan

- Keep global pages for cross-project work:
  - Dashboard, Pipeline, Events, Calendar, Finances, Contacts, Vendors, Reports, Settings.
- Project workspaces:
  - Lead project: `/ease-events/leads/:leadId`
  - Event project: `/ease-events/events/:eventId`
- Add reusable project components:
  - `ProjectCommunicationSnapshot`
  - `LifecycleProgressStrip`
  - future `ProjectActivityTimeline`
  - future `ProjectSetupChecklist`
  - future `ProjectFilesPanel` supporting lead/event/project files.
- Move project-specific work into project tabs while retaining global list views.

## Implemented In The First UI Pass

- Added top-level Vendors navigation.
- Renamed lifecycle phase label from “Discovery / Consultation” to “Consultation”.
- Added compact lifecycle progress strip.
- Added project communication snapshot for lead and event workspaces.
- Moved event command center into the event Overview tab so tabs remain near the top.
- Reordered Dashboard so Planner Focus is first and Lifecycle Audit Summary is lower.
- Added upcoming meetings to dashboard metrics.
- Added inquiry Notes helper text and inspiration URL capture.
- Added honest interim inquiry file-intake note pending lead/project upload migration.
- Clarified booking setup preview and removed vendor auto-add ambiguity.
- Added starter deposit invoice creation during lead-to-event conversion. This was later replaced in Phase 2 with an explicit payment-terms setup task.
- Restricted Stripe Checkout to card payment methods for this MVP.
- Renamed “Log email or call” panel to “Add communication”.

## Implemented In Phase 2

- Added `projects` as the durable project workspace identity from inquiry through booked event.
- Added project IDs to leads/events and project-scoped operational records.
- Made communications, messages, meetings, files, tasks, comments, meeting notes, and invoices project-aware while preserving event compatibility.
- Added `project_inspiration_links`, `task_links`, `task_attachments`, `email_templates`, `project_activity_events`, and `project_reminders`.
- Backfilled existing event and lead records into projects without dropping data.
- Added RLS policies for new tables using the existing organization/staff model.
- Added the public inquiry API route that creates client, lead, project, inspiration links, acknowledgment communication, activity, and reminder via the service role.
- Added Settings visibility for email templates and supported merge variables.
- Replaced generic communication creation with distinct Compose email, Log call, Add internal note, and Schedule meeting actions.
- Updated file upload paths to `organization/projects/project_id/...` with validation, visibility, captions, and duplicate-name protection.
- Added project-aware file/inspiration/activity panels to lead workspaces.
- Updated lead-to-event conversion so history, tasks, files, notes, meetings, and communication stay on the same project.
- Removed arbitrary deposit invoice creation during conversion; a planner action is created until payment terms are confirmed.
- Added task links to create/edit flows and Supabase persistence.
- Added anonymous public inquiry image/document uploads through a server-controlled upload session.
- Added explicit `disabled`, `test`, and `live` email-delivery modes for inquiry acknowledgments.
- Added disposable Phase 2 e2e verification and cleanup scripts using `easeevents-e2e-*` identifiers.

## Tests For Critical Workflows

Manual smoke tests:

```bash
npm run build
curl -I http://127.0.0.1:8083/ease-events
curl -I http://127.0.0.1:8083/ease-events/leads
curl -I http://127.0.0.1:8083/ease-events/events/20000000-0000-4000-8000-000000000001
curl -I http://127.0.0.1:8083/ease-events/inquiry
```

Remote schema check:

```bash
supabase migration list --linked
```

## Before And After UX Summary

Before:

- Planner saw strong modules, but had to navigate globally for project-specific communication context.
- Lifecycle diagram consumed too much space and competed with current action.
- Dashboard led with general metrics instead of urgency.
- Vendor directory was hidden behind Contacts.
- Inquiry form did not prompt for inspiration context.
- Booking action did not clearly explain generated outputs.

After:

- Lead and event workspaces start with communication context and compact project stage.
- Event workspace tabs sit higher and action detail is in Overview.
- Dashboard starts with Planner Focus, then urgency metrics.
- Vendors are visible in staff navigation.
- Inquiry form collects inspiration links and better notes.
- Booking preview explains client/event/task/approval/invoice/team consequences.

## Remaining Product Debt

- Proposal builder and contract/signature flow are still missing.
- Email send/reply still needs provider-backed outbound send and delivery webhook reconciliation; inquiry acknowledgment is queued through the transactional email queue where available and safely recorded on failure.
- Expenses and actual profitability need a first-class schema.
- Calendar needs true month/week/day/agenda UI.
- Task attachments/comments/dependencies need schema and UI.
- Processing-fee configuration and offline payment records need organization settings.
- Event-day mode and post-event closeout are not yet operationally complete.

## Commands To Apply And Test

To test locally:

```bash
npm run build
npm run dev -- --host 127.0.0.1 --port 8083
```

To apply Phase 2:

```bash
supabase db push --linked --include-all --yes
supabase migration list --linked
npm run build
npm run events:phase2:e2e
```
