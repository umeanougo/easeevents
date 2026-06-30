# EaseEvents Migration Order

Apply migrations in filename timestamp order. The EaseEvents app schema depends on this sequence:

1. `20260612120000_ease_events_mvp.sql`
2. `20260612130000_ease_events_core_schema_repair.sql`
3. `20260612143000_event_team_members.sql`
4. `20260616123000_ease_events_communications.sql`
5. `20260616142000_ease_events_external_integrations.sql`
6. `20260617110000_ease_events_fathom_meeting_notes.sql`
7. `20260617133000_ease_events_fathom_provider.sql`
8. `20260618120000_ease_events_product_refactor.sql`
9. `20260618133000_canonical_client_snapshots.sql`
10. `20260618143000_ease_events_invoices.sql`
11. `20260618193000_ease_events_project_workspace.sql`
12. `20260618203000_ease_events_public_inquiry_uploads.sql`
13. `20260619100000_ease_events_phase3_proposals_booking.sql`
14. `20260619140000_ease_events_phase4_expenses_finance.sql`
15. `20260619153000_ease_events_phase5_calendar.sql`
16. `20260619170000_ease_events_phase6_event_day.sql`
17. `20260619183000_ease_events_phase7_workflow_automations.sql`
18. `20260619184500_ease_events_phase7_workflow_integrity.sql`
19. `20260619193000_ease_events_phase8_post_event_closeout.sql`
20. `20260619203000_ease_events_phase9_retention_relationships.sql`

The repair migration is intentionally idempotent. It preserves existing `organizations` and `users` data, creates any missing core app enums/tables, reattaches `updated_at` triggers, and reapplies the same organization-scoped RLS model expected by the app.

If a remote database only has `public.organizations` and `public.users`, run the repair migration before the communications and external integrations migrations. Do not run the external integrations migration directly against a database missing `public.meetings`, `public.communication_threads`, or `public.communication_messages`.

## Phase 2 Project Workspace Migration

`20260618193000_ease_events_project_workspace.sql` is additive. It introduces `public.projects` as the durable workspace context that can start from an inquiry and later attach to a booked event.

It also:

- Adds `project_id` and nullable `lead_id` support to communication threads/messages, meetings, meeting notes, files, tasks, comments, and invoices.
- Drops the old event-only `not null` requirement for project-scoped operational tables where needed.
- Adds structured inquiry inspiration links, task links, task attachments, email templates, project activity events, and project reminders.
- Backfills one project per existing event and one project per unconverted lead.
- Updates existing event-scoped communications, meetings, files, tasks, comments, and invoices with their project IDs.
- Uses organization-scoped RLS policies following `current_organization_id()` and `is_staff()`.
- Adds `public.set_updated_at()` triggers for mutable project tables.

Apply with:

```bash
supabase db push --linked --include-all --yes
supabase migration list --linked
```

Do not reset the remote database. The migration preserves existing `organizations`, `users`, leads, events, communications, files, and financial records.

## Phase 2 Public Inquiry Uploads

`20260618203000_ease_events_public_inquiry_uploads.sql` closes the anonymous public inquiry upload gap without opening public Supabase Storage access.

It adds:

- `public.public_inquiry_submissions` for submission idempotency, opaque upload-token hashes, email mode/status, and safe retry state.
- `public.public_inquiry_uploads` for per-file upload slots, storage paths, status, and error recording.
- Delivery status/mode/error/metadata fields on `public.communication_messages`.
- RLS policies that allow staff to inspect/manage records through the existing organization model while anonymous users continue to use server-controlled API routes only.
- `public.set_updated_at()` triggers for the new mutable tables.

Email delivery must be configured explicitly with `EASE_EVENTS_EMAIL_MODE=disabled|test|live`. Local development should use `disabled` or `test`; never run verification in `live`.

Verification:

```bash
npm run build
npm run events:phase2:e2e
```

Cleanup for retained runs:

```bash
npm run events:phase2:cleanup -- easeevents-e2e-REPLACE_ME
```

## Phase 7 Workflow Automations

`20260619183000_ease_events_phase7_workflow_automations.sql` adds the durable automation and notification layer, and `20260619184500_ease_events_phase7_workflow_integrity.sql` adds composite organization integrity checks:

- `workflow_automations`
- `workflow_automation_actions`
- `workflow_events`
- `workflow_executions`
- `workflow_action_runs`
- `notifications`
- `notification_preferences`

Seeded lifecycle automation presets are inactive by default. The worker command is:

```bash
npm run events:workflows:process
```

Controlled verification:

```bash
EASE_EVENTS_PHASE7_TEST_ID=easeevents-phase7-$(date +%s) npm run events:phase7:e2e
EASE_EVENTS_PHASE7_TEST_ID=<the-exact-test-id> npm run events:phase7:cleanup
```

## Phase 8 Post-Event Closeout

`20260619193000_ease_events_phase8_post_event_closeout.sql` adds the post-event closure layer without replacing projects, event-day records, files, finances, vendors, tasks, or workflow automations.

It adds:

- `organization_closeout_settings`
- `post_event_closeouts`
- `post_event_closeout_items`
- `final_deliverables`
- `client_feedback_responses`
- `client_consents`
- `vendor_performance_reviews`
- `internal_retrospectives`
- `closeout_financial_snapshots`

The migration also extends event/email enums, applies `public.set_updated_at()` triggers, creates organization-scoped RLS policies, seeds default organization closeout settings, and inserts inactive Phase 8 automation presets for closeout handoff, feedback requests, deliverable reminders, vendor review reminders, and financial closeout alerts.

Controlled verification:

```bash
EASE_EVENTS_PHASE8_TEST_ID=easeevents-phase8-$(date +%s) npm run events:phase8:e2e
EASE_EVENTS_PHASE8_TEST_ID=<the-exact-test-id> npm run events:phase8:cleanup
```

The Phase 8 test refuses to run with `EASE_EVENTS_EMAIL_MODE=live`, creates only records tagged with the generated `easeevents-phase8-*` identifier, and does not send email, post public reviews, charge payments, or call external providers.

## Phase 9 Retention and Relationships

`20260619203000_ease_events_phase9_retention_relationships.sql` adds the relationship layer after closeout without reopening old projects or creating a second client model.

It adds:

- Relationship fields on canonical `clients`
- `organization_retention_settings`
- `client_milestones`
- `rebooking_opportunities`
- `client_referral_links`
- `referrals`
- `communication_eligibility_logs`

The migration also extends email-template enum values for retention messaging, applies `public.set_updated_at()` triggers, creates organization-scoped RLS policies, seeds conservative retention settings, and inserts inactive workflow presets for relationship review, milestone review, repeat-client follow-up, referral thank-you, and dormant-client review.

Controlled verification:

```bash
EASE_EVENTS_PHASE9_TEST_ID=easeevents-phase9-$(date +%s) npm run events:phase9:e2e
EASE_EVENTS_PHASE9_TEST_ID=<the-exact-test-id> npm run events:phase9:cleanup
```

The Phase 9 test refuses to run with `EASE_EVENTS_EMAIL_MODE=live`, creates only records tagged with the generated `easeevents-phase9-*` identifier, and does not send email, charge payments, or call external providers.

## Phase 10A.1 Work Management

`20260619213000_ease_events_phase10a_work_management.sql` adds the first daily-use Trello replacement layer while keeping `public.tasks` as the canonical work record.

It adds:

- `task_workflow_columns`
- `task_labels`
- `task_label_assignments`
- `task_participants`
- `task_checklists`
- `task_saved_views`
- `task_inbox_items`

It extends:

- `tasks` with workflow column, normalized status, stable board position, archive state, visibility, card cover, effort fields, source fields, and internal-work support
- `task_checklist_items` with checklist grouping, assignee, due date, notes, completion audit, and converted-task references
- `comments` with task linkage, mentions, parent comments, edit/delete state, and metadata

The migration seeds default organization workflow columns and task labels, adds updated-at triggers, indexes common board/table queries, and routes child-record RLS through `public.can_read_task()`.

Controlled verification:

```bash
EASE_EVENTS_PHASE10A_TEST_ID=easeevents-phase10a-work-$(date +%s) npm run events:phase10a:e2e
EASE_EVENTS_PHASE10A_TEST_ID=<the-exact-test-id> npm run events:phase10a:cleanup
```

The Phase 10A.1 test refuses to run with `EASE_EVENTS_EMAIL_MODE=live`, creates only records tagged with the generated `easeevents-phase10a-work-*` identifier, and does not send email, charge payments, invite external users, or call external providers.

`20260619214500_ease_events_phase10a_task_file_visibility.sql` hardens task collaboration visibility:

- `public.is_event_vendor(event_id)`
- `public.can_read_file(files)`
- role-specific task comment reads
- role-specific task link reads
- task attachment reads that respect project-file visibility

Run the focused quality gate:

```bash
EASE_EVENTS_PHASE10A_GATE_ID=easeevents-phase10a-gate-$(date +%s) npm run events:phase10a:quality
```

The quality gate creates a temporary event task, adds a Pinterest link and inspiration images, assigns owner/collaborator/checklist ownership, verifies board/My Work/Table/Calendar projections, checks vendor/client RLS visibility, completes/archives/restores the task, and deletes its generated records and storage objects.
