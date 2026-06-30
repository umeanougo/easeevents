# EaseEvents Demo Walkthrough

Use this guide to demo EaseEvents to Coco Cabana or another event planning business.

Demo URL:

```text
http://localhost:8080/ease-events/login
```

Demo password for all accounts:

```text
demo123
```

## Demo Setup

Open four browser tabs before the call:

| Tab | Role          | Login                     | URL after login              |
| --- | ------------- | ------------------------- | ---------------------------- |
| 1   | Admin / owner | `owner@cococabana.demo`   | `/ease-events`               |
| 2   | Planner       | `planner@cococabana.demo` | `/ease-events/tasks`         |
| 3   | Client        | `client@cococabana.demo`  | `/ease-events/client-portal` |
| 4   | Vendor        | `vendor@cococabana.demo`  | `/ease-events/events`        |

Suggested tab names:

- `Admin dashboard`
- `Planner execution`
- `Client portal`
- `Vendor view`

If you are short on time, use only two tabs: Admin and Client.

## Opening Position

Say:

> Today I want to show what it looks like when Coco Cabana’s HoneyBook, Trello, Google Sheets, Google Drive, approvals, vendor tracking, and client updates live in one branded workspace.

Then frame the promise:

> The goal is not to make another generic CRM. The goal is to manage the full event workflow from inquiry to booked event to execution, with budget visibility built in from day one.

## 1. Admin Dashboard

Start on:

```text
/ease-events
```

Show:

- Active events
- Upcoming events
- Unpaid balances
- Pending client approvals
- Overdue tasks
- Monthly revenue summary

Talking points:

- “This replaces the owner’s morning scan across HoneyBook, Trello, Sheets, Drive, and text threads.”
- “The dashboard is not just activity. It highlights risk: approvals waiting on clients, vendor balances, and overdue execution work.”
- “Revenue and margin are visible without opening a spreadsheet.”

Click into:

```text
Patel Sangeet & Reception
```

## 2. Event Workspace

Show the event detail page.

Walk through the tabs:

### Overview

Show:

- Client info
- Date, time, location
- Guest count
- Status
- Internal notes
- Timeline notes
- Messages placeholder

Say:

> This becomes the single source of truth for the event. The planner should not need to ask, “Where is the latest note?” or “Which sheet has the current timeline?”

### Tasks

Show:

- Task title
- Owner
- Due date
- Priority
- Status
- Checklist items

Change one task status if useful.

Say:

> This is the Trello replacement, but tied directly to the event, budget, vendors, and approvals.

### Budget

This is the key differentiator. Spend extra time here.

Show:

- Planned budget
- Actual cost
- Client price
- Estimated profit
- Profit margin percentage
- Vendor balance due
- Category-level budget items

Say:

> A lot of event tools manage tasks or invoices, but Coco Cabana’s real operational pain is knowing whether an event is still profitable as vendor quotes change.

Then point to planned vs. actual:

> This gives the owner a live margin view without rebuilding a Google Sheet for every event.

### Vendors

Show assigned vendors.

Say:

> Vendors are no longer buried in email threads or separate notes. Each event can track who is assigned, the quote, actual amount, payment status, and any vendor-specific notes.

### Files

Show uploaded files.

Say:

> This is the Google Drive replacement layer: contracts, quotes, receipts, inspiration images, and event documents tied to the event record.

Mention:

> In production this uses Supabase Storage with private organization-scoped access.

### Approvals

Show pending approvals.

Say:

> Instead of approvals scattered through text, email, and PDFs, the client gets a simple approval queue. Budget, moodboard, timeline, and proposal approvals are all tracked.

### AI

Show the AI placeholder tab.

Say:

> These are future assistant workflows. We are not forcing AI into the MVP, but the architecture is ready for timeline drafts, note summaries, vendor checklists, budget variance explanations, and post-event recaps.

## 3. Lead Pipeline

Go to:

```text
/ease-events/leads
```

Show the pipeline:

- New Inquiry
- Consultation Scheduled
- Proposal Sent
- Booked
- Lost

Talking points:

- “This replaces the front half of HoneyBook for inquiry tracking.”
- “Leads can move through consultation and proposal stages.”
- “A booked lead becomes an event workspace.”

Click a lead, such as:

```text
Grace Wilson
```

Show:

- Client name
- Email
- Phone
- Event type
- Event date
- Guest count
- Budget range
- Notes
- Source

Optional live action:

- Click **Convert to event**
- Show that the event workspace is created

Say:

> This is the handoff from sales to operations. Once the lead is booked, the system creates the operational workspace instead of asking the team to manually create boards, folders, and budget sheets.

## 4. Inquiry Form

Go to:

```text
/ease-events/inquiry
```

Show the public inquiry form.

Talking points:

- “This can replace or augment the existing website/HoneyBook inquiry form.”
- “Submitted inquiries land directly in the lead pipeline.”
- “This keeps intake structured from the beginning.”

Optional live action:

Create a quick lead:

```text
Client name: Taylor Brooks
Email: taylor@example.com
Phone: 416-555-0199
Event type: Milestone birthday
Event date: 2026-09-19
Guest count: 90
Budget range: $18k-$25k
Source: Instagram
Notes: Wants tropical decor, rentals, florals, and a signature bar moment.
```

Then open the lead from the success state.

## 5. Planner View

Switch to the Planner tab:

```text
planner@cococabana.demo
/ease-events/tasks
```

Show:

- Tasks across events
- Due dates
- Priorities
- Status changes
- Checklist items

Talking points:

- “The planner does not need the full owner dashboard first. Their default view is execution.”
- “This keeps the team focused on what is due, blocked, or in progress.”
- “Permissions can keep planners away from owner-only settings or financial controls later.”

## 6. Client Portal

Switch to the Client tab:

```text
client@cococabana.demo
/ease-events/client-portal
```

Show:

- Event overview
- Date/location/guest count
- Timeline
- Pending approvals
- Invoice placeholder
- Files
- Messages placeholder

Talking points:

- “The client sees only their event.”
- “They do not see internal notes, other clients, or the full operations dashboard.”
- “Approvals are simple: approve, request changes, or review pending items.”

Optional live action:

- Approve one pending item
- Switch back to Admin dashboard and show approval count changes

Say:

> This is how we reduce manual follow-ups. The system remembers what is pending instead of the planner chasing it manually.

## 7. Vendor View

Switch to the Vendor tab:

```text
vendor@cococabana.demo
/ease-events/events
```

Show:

- Role-aware navigation
- Event access
- Tasks/files as applicable

Talking points:

- “The vendor experience can start lightweight. They do not need the entire platform; they need the relevant event details, files, and tasks.”
- “This gives Coco Cabana a path to cleaner vendor coordination without exposing client or financial data unnecessarily.”

## 8. Budget and Reporting

Return to Admin.

Go to:

```text
/ease-events/budgets
```

Show:

- Event-level budget cards
- Planned vs. actual costs
- Estimated profit
- Margin percentage
- Category rollup

Talking points:

- “This is where the platform becomes more valuable than the tools it replaces.”
- “HoneyBook handles sales and invoices. Trello handles tasks. Drive holds files. Sheets holds budget logic. EaseEvents ties those together around profitability.”

## 9. Vendors

Go to:

```text
/ease-events/vendors
```

Show:

- Vendor database
- Service category
- Contact info
- Event assignments

Click a vendor profile.

Talking points:

- “This builds a reusable vendor database over time.”
- “The next phase can add preferred vendor scoring, performance notes, payment history, and quote comparisons.”

## 10. Settings and Next Phase

Go to:

```text
/ease-events/settings
```

Show:

- Organization
- Users and roles
- Supabase, Stripe, and OpenAI readiness
- Next phase TODO list

Say:

> The MVP is intentionally focused. The next phase is turning the demo datastore into Supabase-backed CRUD, adding invitations, Stripe invoices, messaging, audit logs, and production AI workflows.

## Recommended Demo Flow

For a 15-minute demo:

1. Admin dashboard
2. Patel event workspace
3. Budget tab
4. Lead pipeline and conversion
5. Client portal
6. Settings / next phase

For a 30-minute demo:

1. Admin dashboard
2. Event workspace overview
3. Tasks
4. Budget
5. Vendors
6. Files
7. Approvals
8. Lead pipeline
9. Inquiry form
10. Client portal
11. Vendor view
12. Settings / roadmap

## Strong Close

Say:

> The MVP already shows the full operating model: inquiry, booking, event workspace, budget control, vendor coordination, tasks, files, client approvals, and reporting. The next decision is which parts Coco Cabana wants production-ready first: client portal, budget engine, or lead-to-event workflow.
