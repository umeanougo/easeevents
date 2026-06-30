# EaseEvents Phase 9: Retention, Milestones, Referrals, and Rebooking

Phase 9 turns post-event closeout into a durable relationship workflow. It does not create another client, project, communication, or workflow architecture. It uses canonical `clients`, durable `projects`, existing communication threads/messages, client consent records, and inactive workflow presets.

## Architecture Decision

Retention is modeled as an additive layer around canonical clients:

- `clients` stores the current relationship status, owner, future-event communication preference, and next relationship action.
- `client_milestones` stores anniversary, birthday, recurring event, and custom date reminders.
- `rebooking_opportunities` stores potential repeat-event opportunities and can convert into a normal `lead` plus `project`.
- `client_referral_links` and `referrals` model referral source tracking without promising automatic rewards.
- `communication_eligibility_logs` records why outreach was allowed, blocked, or kept as a draft.
- Existing `client_consents` remains the source of truth for marketing, testimonial, and media permissions.

Old projects remain closed historical records. A repeat opportunity creates a new inquiry/project linked to the same client.

## Outreach Safety

Retention outreach is not automatically sent. The app evaluates:

- Marketing consent status
- Client future-event preference
- Do-not-market or unsubscribe state
- Organization retention settings
- Manual compliance review requirements

If outreach is not clearly allowed, EaseEvents records an internal draft/review item only.

## UI Surfaces

- `Contacts -> Retention` is the staff relationship workspace.
- Client detail pages now show rebooking opportunities, milestones, referral links, eligibility, and relationship value.
- Client portal consent preferences reuse the existing consent model and allow grant/revoke actions.
- Dashboard action queue surfaces rebooking opportunities and referral reviews.
- Settings automation labels include Phase 9 triggers; seeded automations remain inactive by default.

## Verification

Apply migrations in timestamp order, then run:

```bash
supabase db push
npm run build
EASE_EVENTS_PHASE9_TEST_ID=easeevents-phase9-$(date +%s) npm run events:phase9:e2e
EASE_EVENTS_PHASE9_TEST_ID=<the-exact-test-id> npm run events:phase9:cleanup
```

The controlled test refuses to run with `EASE_EVENTS_EMAIL_MODE=live`. It does not send email, call external providers, or charge payments.
