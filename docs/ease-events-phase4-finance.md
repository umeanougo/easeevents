# EaseEvents Phase 4: Expenses, Profitability, and Financial Reporting

## Architecture Decision

Phase 4 extends the existing project, proposal, invoice, vendor, budget, and file architecture. It does not create a second finance model.

Expenses are now the source of truth for incurred costs. Expense payments are the source of truth for cash paid to vendors or other recipients. Budget items remain the planning/forecast layer. Event vendor assignments remain commitment/context records.

## Source-Of-Truth Definitions

- Contracted revenue: accepted active proposal version total.
- Legacy contracted revenue fallback: `events.client_price` only when no accepted proposal exists.
- Invoiced revenue: valid issued invoices, excluding draft and void invoices.
- Collected revenue: recorded invoice payments. If an invoice has no payment rows, legacy `invoices.paid_amount` is used as a fallback.
- Planned cost: total planned amount from budget items.
- Current cost forecast: per budget item, the higher of budget forecast and linked incurred expenses, plus unbudgeted expenses.
- Incurred expenses: expenses with status `Approved`, `Partially Paid`, `Paid`, or `Overdue`.
- Paid expenses: completed rows in `expense_payments`.
- Outstanding expense balance: incurred expenses minus completed expense payments.
- Forecast gross profit: contracted revenue minus current cost forecast.
- Forecast margin percentage: forecast gross profit divided by contracted revenue.
- Cash position: collected revenue minus paid expenses. This is not accounting net income.

## Legacy Strategy

Do not bulk-convert these fields into expenses:

- `budget_items.actual_amount`
- `budget_items.paid_amount`
- `event_vendors.actual_amount`

They may represent estimates, demo data, commitments, or cash payments depending on when they were entered. The app treats them as legacy/forecast context and never double-counts them with linked expense records.

Preferred model going forward:

- `event_vendors`: assignment and commitment details.
- `budget_items`: planned/forecast budget.
- `expenses`: actual incurred costs.
- `expense_payments`: actual cash paid out.
- `files` plus `expense_files`: receipts, vendor invoices, proof of payment, and supporting documents.

## Migration

Migration:

```bash
supabase/migrations/20260619140000_ease_events_phase4_expenses_finance.sql
```

Adds:

- `organization_finance_settings`
- `expenses`
- `expense_payments`
- `expense_files`
- expense enums
- added budget categories
- organization consistency triggers
- updated-at triggers
- staff-only RLS policies for internal expense data

Clients and vendors do not receive expense, margin, receipt, or internal vendor-cost visibility.

## UI Surfaces

- Event workspace: new `Finances` tab with overview, budget variance, expenses, invoices, payments, and profitability.
- Global Finances page: portfolio financial overview, expense filters, CSV export, record-expense flow.
- Vendors table: separates assignment commitment from recorded expenses and paid balances.
- Dashboard: financial action queue for expense approvals, missing receipts, over-budget projects, low margin, open invoices, and vendor balances.
- Reports: contracted/invoiced/collected revenue, expenses, forecast profit, cash position, and CSV export.
- Settings: read-only financial settings summary.

## Verification Commands

Apply migration:

```bash
supabase db push
```

Build:

```bash
npm run build
```

Controlled Phase 4 e2e:

```bash
EASE_EVENTS_PHASE4_TEST_ID=easeevents-phase4-$(date +%s) npm run events:phase4:e2e
```

Cleanup:

```bash
EASE_EVENTS_PHASE4_TEST_ID=<exact-test-id> npm run events:phase4:cleanup
```

The e2e records offline test payments only. It does not send real email and does not charge a real payment method.
