# EaseEvents Phase 3: Proposals, Payment Terms, and Booking

## Architecture Decision

Phase 3 extends the existing durable `projects` workspace from Phase 2. It does not introduce a second project, client, communication, invoice, or file model.

Sales pipeline remains on `leads.stage`:

- New Inquiry
- Consultation Scheduled
- Consultation Completed
- Proposal Draft
- Proposal Sent
- Changes Requested
- Accepted
- Booked
- Lost

Event lifecycle remains separate on `events.status`:

- Setup
- Planning
- Finalization
- Event Day
- Post-Event
- Completed
- Cancelled

Booking is requirement-gated through `organization_booking_settings`. A project becomes booked only after configured requirements are satisfied: proposal acceptance, terms acceptance, deposit invoice issuance, deposit payment, and optional planner approval.

## Migration

Applied migration:

```bash
set -a; source .env; set +a; supabase db push
```

Verify migration history:

```bash
set -a; source .env; set +a; supabase migration list
```

The applied migration is:

```text
supabase/migrations/20260619100000_ease_events_phase3_proposals_booking.sql
```

## New Tables

- `organization_booking_settings`
- `proposals`
- `proposal_versions`
- `proposal_line_items`
- `proposal_payment_terms`
- `proposal_responses`
- `proposal_review_tokens`
- `proposal_files`
- `invoice_payments`
- `project_booking_approvals`

Existing `invoices` now support pre-event project/proposal invoices through nullable `event_id` and proposal traceability fields.

## API Routes

- `POST /api/ease-events/proposals/draft`
- `POST /api/ease-events/proposals/send`
- `GET /api/ease-events/proposals/review/:token`
- `POST /api/ease-events/proposals/review/:token`
- `POST /api/ease-events/proposals/payment`
- `POST /api/ease-events/proposals/booking-approval`
- `GET /api/ease-events/proposals/booking-status?projectId=...`

## UI

- Lead workspace includes a Proposal and Booking panel.
- Event workspace includes a Proposal tab.
- Client portal includes proposal summary.
- Public client review route is available at `/ease-events/proposals/:token`.
- Dashboard surfaces draft, sent-not-viewed, expiring, change-requested, accepted-not-booked proposal states.
- Settings shows active booking requirements.

## Safe Email and Payment Rules

Automated tests must not run with live email mode:

```bash
EASE_EVENTS_EMAIL_MODE=disabled
```

The Phase 3 e2e script records offline payment only. It does not create a Stripe charge or send a live customer email.

## Controlled Test

Run:

```bash
npm run build
npm run events:phase3:e2e
```

Cleanup the exact test id printed by the e2e script:

```bash
EASE_EVENTS_PHASE3_TEST_ID=easeevents-phase3-{timestamp} npm run events:phase3:cleanup
```

The cleanup script only deletes records tied to the matching `easeevents-phase3-*` test identifier.
