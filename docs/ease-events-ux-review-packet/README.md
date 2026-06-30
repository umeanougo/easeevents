# EaseEvents UX Review Packet

Date: 2026-06-30

## Product Context

EaseEvents is a multi-tenant event operations platform for replacing HoneyBook, Trello, and spreadsheet-based operational tracking. The current sprint is a UX refinement pass focused on confidence, consistency, form exits, save feedback, communications overflow, task label visibility, and Work Hub polish.

This packet is intended for ChatGPT or another reviewer to assess the current user experience from screenshots plus workflow context.

## Review Goals

Ask the reviewer to assess:

- Whether the app feels clear enough for a planner/admin to operate daily.
- Whether the visual hierarchy supports repeated operational work instead of feeling like a landing page.
- Whether save, cancel, close, and error states are obvious.
- Whether the lead-to-proposal-to-booking workflow feels complete and trustworthy.
- Whether Work Hub is Trello-grade enough for project task management.
- Whether Communications, Calendar, and Finances feel consistent with the rest of the product.
- Which issues should be Critical, High, Medium, or Low.
- A findings-to-code map where possible.

## Screenshots

1. Dashboard command center  
   `01-dashboard.png`

2. Lead pipeline  
   `02-lead-pipeline.png`

3. Lead detail and proposal entry point  
   `03-proposal-booking-panel.png`

4. Proposal draft form fields, line items, payment terms, and save area  
   `04-proposal-draft-fields.png`

5. Work Hub  
   `05-work-hub.png`

6. Communications  
   `06-communications.png`

7. Calendar  
   `07-calendar.png`

8. Reports / finances  
   `08-finances.png`

## Workflow 1: Lead Pipeline To Proposal Draft

User type: Planner/admin

Goal: Move an inquiry toward booking by reviewing booking requirements, drafting a proposal, and preparing payment terms.

Steps:

1. Start at `/ease-events/leads`.
2. Review columns for New Inquiry, Consultation Scheduled, Consultation Completed, Proposal Draft, Proposal Sent, Changes Requested, Accepted, Booked, and Lost.
3. Click `Review booking requirements` on a lead, for example Grace Wilson.
4. Confirm the lead detail page provides enough project communication context.
5. Review the `Proposal and booking` panel.
6. Edit proposal title, introduction, scope, terms, line items, discount, tax, and payment schedule.
7. Click `Save draft`.
8. Confirm success feedback is visible and not ambiguous.
9. Confirm the user has an obvious next step: send proposal, keep editing, or return to the pipeline.

Expected result:

- The planner understands why the proposal is needed before booking.
- The save action provides a clear confirmation.
- The proposal stays tied to the same lead/project.
- No backend-like error should be exposed to the user.

Assessment questions:

- Is the path from lead card to proposal builder obvious?
- Does the lead detail page bury the proposal work too far down?
- Are line item and payment-term controls readable and efficient?
- Is the `Save draft` action easy to find after editing?
- Are required booking checks clear enough to drive next actions?

## Workflow 2: Work Hub / Trello-Grade Task Management

User type: Planner/admin

Goal: Manage all project and personal work without leaving EaseEvents.

Steps:

1. Start at `/ease-events/work`.
2. Review Work Hub / My Work / Inbox / All Tasks / Archived entry points.
3. Scan cards for project context, labels, status, assignees, due dates, checklist progress, and attachments.
4. Open a task drawer or card detail.
5. Edit task fields, labels, checklist items, links, attachments, watchers, and visibility.
6. Save or cancel changes.
7. Confirm drawer close behavior and save confirmation.

Expected result:

- Labels are visually recognizable on cards.
- Project context is visible without overwhelming the card.
- Save/cancel/close paths are obvious.
- Mobile density remains usable.

Assessment questions:

- Does Work Hub feel like a credible Trello replacement?
- Are labels and status visually strong enough?
- Is there too much visual clutter?
- Are project-specific tasks easy to distinguish from internal work?
- Is the drawer interaction consistent with other forms?

## Workflow 3: Communications

User type: Planner/admin

Goal: Triage client communication, meetings, transcripts, recaps, and follow-up actions.

Steps:

1. Start at `/ease-events/communications`.
2. Review communication metrics: needs reply, upcoming meetings, recaps due, action items.
3. Review Google Workspace and Microsoft 365 integration cards.
4. Open or compose communication.
5. Confirm right-side panels remain accessible at desktop and smaller widths.
6. Confirm meeting scheduling and message composing have clear cancel/close/reset paths.

Expected result:

- The page supports repeated triage without overflow.
- Integration state is clear.
- The user can exit compose/details panels confidently.

Assessment questions:

- Is the page hierarchy too heavy or just right?
- Are the integration cards competing with operational communication work?
- Are compose/details panels reachable and easy to dismiss?
- Does the page feel consistent with Dashboard, Work, and Calendar?

## Workflow 4: Calendar / Scheduling

User type: Planner/admin

Goal: See scheduling commitments, synced provider state, conflicts, reminders, and event-related dates.

Steps:

1. Start at `/ease-events/calendar`.
2. Review the unified calendar view and sync health.
3. Inspect filters for project, event, provider, and calendar item types.
4. Create or review a meeting/reminder.
5. Confirm Google/Microsoft sync status and errors are understandable.

Expected result:

- Calendar work feels operational, not decorative.
- Conflict and sync information is actionable.
- Filters do not overwhelm the page.

Assessment questions:

- Is Monday-first calendar behavior clear?
- Does the calendar communicate project/event context well?
- Are sync states understandable for a planner who is not technical?

## Workflow 5: Finances / Reports

User type: Planner/admin/owner

Goal: Understand revenue, expenses, profitability, invoices, and payment status.

Steps:

1. Start at `/ease-events/reports` or `/ease-events/budgets`.
2. Review revenue, invoice, expense, vendor payment, and profitability information.
3. Identify whether accepted proposals and invoices clearly drive financial reporting.
4. Confirm the user can find the next financial action.

Expected result:

- Financial summaries should feel trustworthy.
- Missing proposal/invoice data should be explained clearly.
- Next actions should be obvious.

Assessment questions:

- Is the finance hierarchy clear enough for owners?
- Are warnings or missing-data states concrete?
- Is profitability connected cleanly to proposal and invoice status?

## Ready-To-Paste ChatGPT Prompt

Use this prompt with the screenshots attached:

```text
You are reviewing EaseEvents, a multi-tenant event operations platform intended to replace HoneyBook, Trello, and spreadsheet-based operational tracking for event planners.

Current sprint: UX consistency and Work Hub polish. This is a UX refinement sprint, not a feature sprint.

Assess the attached screenshots and workflows for:
- usability
- visual hierarchy
- save/exit confidence
- form clarity
- task/label visibility
- Work Hub polish
- mobile/responsive risk
- product-wide consistency

Please return:
1. Critical issues
2. High issues
3. Medium issues
4. Low issues
5. Findings-to-code map, using page/component names when source files are unknown
6. Suggested copy or interaction changes
7. What should not be redesigned because it is already working

Important product context:
- EaseEvents replaces HoneyBook, Trello, and Excel-style operations tracking.
- Completed phases include project workspace architecture, communications, files, proposals, booking, invoices, expenses, vendor payments, profitability, calendar sync, event-day command mode, automations, closeout, retention, and Phase 10A work management.
- Current focus is confidence, consistency, and polish.
- Preserve the existing architecture and avoid proposing parallel systems.

Key workflows to assess:
1. Lead pipeline -> Review booking requirements -> Proposal draft -> Save draft.
2. Work Hub -> Open task -> Edit labels/checklists/attachments/watchers -> Save/cancel/close.
3. Communications -> Review threads/meetings/recaps -> Compose/schedule -> Close/reset/save.
4. Calendar -> Review schedule/sync/conflicts -> Filter by project/provider.
5. Finances -> Review profitability/invoices/vendor payments -> Identify next action.
```

## Notes For Sharing

These screenshots are from the local demo/Supabase development workspace. If sharing externally, review visible names, emails, and financial details before uploading.
