# EaseOps / EaseEvents

This repository contains the EaseOps marketing site and an MVP product area for **EaseEvents**, a multi-tenant event operations platform for event planning businesses.

The current app is built on the existing TanStack Start/Vite stack in this repo, with TypeScript, Tailwind CSS, shadcn-style UI components, and Supabase-ready auth/database/storage architecture.

## EaseEvents MVP

Open the app at:

```bash
npm run dev
```

Then visit:

```text
http://localhost:5173/ease-events/login
```

Demo accounts all use `demo123`:

```text
Admin:   owner@cococabana.demo
Planner: planner@cococabana.demo
Client:  client@cococabana.demo
Vendor:  vendor@cococabana.demo
```

## Built Modules

- Email/password login architecture with Supabase Auth support and demo fallback
- Role-aware protected routes for `admin`, `planner`, `client`, and `vendor`
- Admin dashboard with active events, upcoming events, unpaid balances, approvals, overdue tasks, and revenue summary
- Lead inquiry form, pipeline, lead detail, and lead-to-event conversion
- Event workspace with overview, client info, timeline, tasks, budget, vendors, files, approvals, comments placeholder, and AI placeholder tab
- Per-event task management with statuses, priorities, and checklist items
- Budget engine with categories, planned/actual cost, paid amounts, balances, client price, estimated profit, and margin
- Vendor database, vendor profiles, and event vendor assignments
- Client portal with event overview, timeline, approvals, Stripe Checkout payment collection, files, and messages placeholder
- Communications workspace for email threads, meeting scheduling, recaps, transcripts, and follow-up action items
- OAuth-backed Google Workspace and Microsoft 365 integrations for mailbox sync, calendar sync, and live meeting-link creation
- Supabase Storage-aware file upload flow for the `event-files` bucket
- Stripe Checkout collection route and OpenAI-ready placeholder architecture
- Supabase migration for organizations, users, leads, events, tasks, checklist items, budget items, vendors, event vendors, approvals, files, and comments
- Coco Cabana demo seed data

## Supabase Setup

1. Copy `.env.example` to `.env`.
2. Fill in Supabase values:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EASE_EVENTS_PUBLIC_ORGANIZATION_ID=
EASE_EVENTS_EMAIL_MODE=disabled
EASE_EVENTS_TEST_EMAIL=
EASE_EVENTS_TEST_EMAIL_PREFIX=[EaseEvents Test]
EASE_EVENTS_PUBLIC_UPLOAD_MAX_FILES=10
EASE_EVENTS_PUBLIC_UPLOAD_MAX_FILE_MB=10
EASE_EVENTS_PUBLIC_UPLOAD_MAX_TOTAL_MB=30
VITE_GOOGLE_WORKSPACE_ENABLED=false
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_REDIRECT_URI=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
VITE_MICROSOFT_365_ENABLED=false
VITE_MICROSOFT_CLIENT_ID=
VITE_MICROSOFT_REDIRECT_URI=
MICROSOFT_TENANT_ID=common
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=
EASE_EVENTS_OAUTH_STATE_SECRET=
EASE_EVENTS_INTEGRATIONS_ENCRYPTION_KEY=
```

3. Apply migrations with your usual Supabase workflow:

```bash
supabase db push
```

4. Seed Coco Cabana demo data:

```bash
npm run events:seed
```

The migration creates a private Supabase Storage bucket named `event-files` and RLS policies for organization-scoped access.

Without the migration, the app stays in demo mode and shows local data. Real mode requires:

- The `20260612120000_ease_events_mvp.sql` migration applied to Supabase.
- The EaseEvents migrations applied in timestamp order, including `20260612130000_ease_events_core_schema_repair.sql`, `20260616123000_ease_events_communications.sql`, and `20260616142000_ease_events_external_integrations.sql`.
- Seeded auth users and organization records via `npm run events:seed`.
- `VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID` set to the seeded Coco Cabana organization id, `00000000-0000-4000-8000-000000000001`, for public inquiry submissions.
- Real users signing in with Supabase Auth instead of the demo role buttons.

### Public Inquiry Uploads And Email Safety

Anonymous inquiry uploads are handled by server routes only. The browser never chooses an organization, project, or storage path; the backend creates the project context and stores files under the project-scoped `event-files` path.

Email delivery is explicit:

- `EASE_EVENTS_EMAIL_MODE=disabled`: record the intended acknowledgment and do not contact an email provider.
- `EASE_EVENTS_EMAIL_MODE=test`: redirect all outbound acknowledgments to `EASE_EVENTS_TEST_EMAIL` and prefix the subject.
- `EASE_EVENTS_EMAIL_MODE=live`: send to the real prospective client.

Local development should use `disabled` or `test`. The app does not silently default to live.

Phase 2 verification:

```bash
npm run events:phase2:e2e
```

The e2e script refuses to run in live email mode, uses a unique `easeevents-e2e-*` identifier, and cleans up only records/storage objects tagged with that identifier. To manually clean a kept run:

```bash
npm run events:phase2:cleanup -- easeevents-e2e-REPLACE_ME
```

Google and Microsoft integrations now require real OAuth app configuration:

- Google: enable Gmail API + Google Calendar API, create a Web application OAuth client, and register the callback URI used in `GOOGLE_REDIRECT_URI`.
- Microsoft: register an app in Microsoft Entra, enable delegated `User.Read`, `Mail.Read`, and `Calendars.ReadWrite`, and register the callback URI used in `MICROSOFT_REDIRECT_URI`.
- Set `EASE_EVENTS_OAUTH_STATE_SECRET` and `EASE_EVENTS_INTEGRATIONS_ENCRYPTION_KEY` so OAuth state and stored provider tokens are protected server-side.

## Project Structure

```text
src/components/ease-events/
  app-shell.tsx              Protected layout, role-aware nav, page header
  budget-summary-grid.tsx    Budget KPI cards
  empty-state.tsx            Empty/loading style utility
  file-upload-panel.tsx      Supabase Storage-ready upload UI
  metric-card.tsx            Dashboard metric cards
  pages.tsx                  MVP route screens
  status-badge.tsx           Status/category badges

src/lib/ease-events/
  ai.ts                      OpenAI-ready placeholder service
  auth.tsx                   Supabase/demo auth provider
  calculations.ts            Budget/dashboard calculations
  config.ts                  Feature/env detection
  demo-data.ts               Local Coco Cabana demo dataset
  files.ts                   Storage upload adapter
  payments.ts                Stripe Checkout client helper
  store.tsx                  Demo datastore and workflow actions
  types.ts                   Domain types

src/routes/ease-events/
  login.tsx
  inquiry.tsx
  index.tsx
  leads/
  events/
  tasks.tsx
  budgets.tsx
  vendors/
  clients.tsx
  client-portal.tsx
  files.tsx
  settings.tsx

supabase/migrations/
  20260612120000_ease_events_mvp.sql
  20260612130000_ease_events_core_schema_repair.sql
  20260612143000_event_team_members.sql
  20260616123000_ease_events_communications.sql
  20260616142000_ease_events_external_integrations.sql
  README.md

scripts/
  seed-ease-events.mjs
```

## Next Phase TODO

- Replace demo local storage reads/writes with Supabase query and mutation hooks.
- Add server-side route guards and invitation onboarding for clients and vendors.
- Add org creation, member invitations, and role management screens.
- Add Stripe webhook reconciliation to mark received payments against event balances automatically.
- Build threaded messages with email notifications and file attachment support.
- Add audit logs for budget edits, approval changes, and vendor payments.
- Replace AI placeholders with reviewed server-side OpenAI calls.
- Add reporting exports for profitability, lead source conversion, vendor performance, and post-event summaries.
- Add automated tests for RLS policies, lead conversion, role access, budget calculations, and client approvals.
