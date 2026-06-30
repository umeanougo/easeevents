# EaseEvents Phase 8: Post-Event Closeout

## Findings To Code Map

- Existing event-day records already preserve execution evidence: `event_day_sessions`, `event_timeline_items.actual_*`, `event_day_issues`, and `event_day_vendor_statuses`.
- Existing finance source of truth remains Phase 4: invoices, invoice payments, expenses, expense payments, budgets, and `getProjectFinanceSummary()`.
- Existing project/file/task/client/vendor architecture stays intact. Phase 8 adds closeout-specific records only where the prior model had no durable representation.
- Event completion and project closure are separate. Completing Event-Day Mode now idempotently creates closeout and moves the event into a post-event workflow; closing requires explicit closeout action.
- Client-facing post-event data is limited to final deliverables, invoice/payment visibility, feedback submission, and consent preferences. Internal retrospectives, vendor reviews, issue logs, receipts, and profitability stay staff-only.
- Public review, testimonial, media, and marketing consent are separate records. Feedback never becomes public automatically.

## Architecture Decision

Phase 8 introduces `post_event_closeouts` as the durable closeout parent because existing projects and events do not carry enough auditable closeout state. It does not create a new project model.

Closeout remains linked to:

- `organization_id`
- `project_id`
- `event_id`

Supporting tables are purpose-specific:

- `post_event_closeout_items`: template-style closeout checklist items with requirement level and override support.
- `final_deliverables`: client-visible final files or links, optionally tied to existing project files.
- `client_feedback_responses`: private client feedback and service-recovery state.
- `client_consents`: distinct testimonial, photo/video, public-review, and marketing consent.
- `vendor_performance_reviews`: internal event-specific vendor evaluation.
- `internal_retrospectives`: structured planner/team lessons learned plus AI-generated draft summary text.
- `closeout_financial_snapshots`: immutable financial state at closure time.
- `organization_closeout_settings`: configurable closeout defaults and review-request posture.

## Workflow

1. Planner completes Event-Day Mode.
2. The app creates one closeout record and one checklist set.
3. Closeout readiness surfaces blockers and warnings:
   - Event-Day Mode not completed
   - unresolved critical event-day issues
   - open client balance
   - open vendor/expense balance
   - missing final client-facing deliverables
   - missing feedback, vendor reviews, or retrospective
4. Planner resolves issues, reconciles finances, uploads or links deliverables, requests/captures feedback, records vendor reviews, and completes retrospective.
5. Planner snapshots finances and closes the project.
6. Closed projects leave active operational views but remain searchable in project/client history.
7. A closed project can be reopened with reason, actor, and timestamp. Reclosing creates a new snapshot version.

## Client Portal

The client portal now shows:

- final deliverables
- outstanding payment/invoice visibility
- private feedback form
- separate consent preferences

The client portal does not show:

- internal profitability
- event-day issue logs
- vendor performance reviews
- internal retrospectives
- internal receipts or staff notes

## Automation Presets

The migration seeds inactive Phase 8 presets:

- `post_event_closeout`
- `client_feedback_request`
- `final_deliverable_due`
- `vendor_review_due`
- `financial_closeout_due`

They are inactive by default. Customer-facing actions must still respect `EASE_EVENTS_EMAIL_MODE=disabled|test|live`.

## Manual Walkthrough

Planner:

1. Open an event.
2. Open **Event Day** and click **Complete Event-Day Mode**.
3. Return to the event workspace and open **Closeout**.
4. Review closeout blockers.
5. Complete or override checklist items with notes.
6. Add a final deliverable link.
7. Request testimonial/media/marketing consent separately.
8. Record vendor reviews.
9. Complete the internal retrospective.
10. Snapshot finances.
11. Close the project.
12. Reopen with a reason if new post-event work appears.

Client:

1. Open the client portal.
2. Review final deliverables.
3. Review invoice/payment state.
4. Submit private feedback.
5. Grant or decline separate consent preferences.

## Verification Commands

Apply migrations:

```bash
supabase db push
```

Build:

```bash
npm run build
```

Run controlled Phase 8 verification:

```bash
EASE_EVENTS_PHASE8_TEST_ID=easeevents-phase8-$(date +%s) npm run events:phase8:e2e
```

Cleanup:

```bash
EASE_EVENTS_PHASE8_TEST_ID=<the-exact-test-id> npm run events:phase8:cleanup
```

The Phase 8 e2e refuses to run in live email mode and does not send real email, post public reviews, charge payment methods, or call external providers.
