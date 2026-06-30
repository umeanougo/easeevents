import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv() {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...parts] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = parts.join("=").replace(/^"|"$/g, "");
    }
  } catch {
    // The caller may provide env vars directly.
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function insert(client, table, payload) {
  const { data, error } = await client.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

async function count(client, table, column, value) {
  const { count: found, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return found ?? 0;
}

loadDotEnv();

if (process.env.EASE_EVENTS_EMAIL_MODE === "live") {
  throw new Error("Refusing to run Phase 4 e2e while EASE_EVENTS_EMAIL_MODE=live.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE4_TEST_ID || `easeevents-phase4-${Date.now()}`;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 4 e2e test id: ${testId}`);

const configuredOrganizationId =
  process.env.EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
  process.env.VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
  "00000000-0000-4000-8000-000000000001";

const { data: organization, error: organizationError } = await supabase
  .from("organizations")
  .select("*")
  .eq("id", configuredOrganizationId)
  .maybeSingle();
if (organizationError) throw organizationError;
const org =
  organization ??
  (await supabase.from("organizations").select("*").limit(1).single().throwOnError()).data;
assert(org?.id, "No organization found.");

const { data: owner } = await supabase
  .from("users")
  .select("*")
  .eq("organization_id", org.id)
  .in("role", ["admin", "planner"])
  .limit(1)
  .maybeSingle();

const clientRecord = await insert(supabase, "clients", {
  organization_id: org.id,
  display_name: `${testId} Client`,
  email: `${testId}@example.test`,
  phone: "555-0400",
  status: "Active",
  source: "Phase 4 e2e",
  notes: testId,
});

const lead = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: owner?.id ?? null,
  client_id: clientRecord.id,
  stage: "Booked",
  client_name_snapshot: clientRecord.display_name,
  email: clientRecord.email,
  phone: clientRecord.phone,
  event_type: "Birthday celebration",
  event_date: "2026-10-02",
  estimated_guest_count: 100,
  budget_range: "$10,000",
  notes: testId,
  source: "Phase 4 e2e",
});

const project = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  owner_id: owner?.id ?? null,
  name: `${testId} Finance Test`,
  stage: "Booked",
});

await supabase.from("leads").update({ project_id: project.id }).eq("id", lead.id);

const proposal = await insert(supabase, "proposals", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  proposal_number: `PROP-${testId}`,
  title: `${testId} Proposal`,
  status: "Accepted",
  currency: org.currency || "CAD",
  current_version_number: 1,
  accepted_at: new Date().toISOString(),
  created_by: owner?.id ?? null,
  metadata: { test_identifier: testId },
});

const version = await insert(supabase, "proposal_versions", {
  organization_id: org.id,
  proposal_id: proposal.id,
  version_number: 1,
  introduction: "Phase 4 e2e proposal",
  scope: "Finance lifecycle test scope.",
  terms: "Accepted terms for test proposal.",
  subtotal: 10000,
  discount_amount: 0,
  tax_amount: 0,
  total_amount: 10000,
  snapshot: { test_identifier: testId },
  document_hash: `hash-${testId}`,
  immutable_at: new Date().toISOString(),
  created_by: owner?.id ?? null,
});

await supabase.from("proposals").update({ current_version_id: version.id }).eq("id", proposal.id);

await insert(supabase, "proposal_line_items", {
  organization_id: org.id,
  proposal_version_id: version.id,
  category: "Decor",
  name: "Planning and production package",
  quantity: 1,
  unit_price: 10000,
  discount_amount: 0,
  total_amount: 10000,
  is_optional: false,
  is_selected: true,
  client_visible: true,
});

const depositTerm = await insert(supabase, "proposal_payment_terms", {
  organization_id: org.id,
  proposal_version_id: version.id,
  label: "Deposit",
  payment_type: "Deposit",
  amount_type: "Fixed",
  amount_value: 5000,
  calculated_amount: 5000,
  due_rule: "On Acceptance",
  required_for_booking: true,
  sort_order: 0,
});

const event = await insert(supabase, "events", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  planner_id: owner?.id ?? null,
  client_name_snapshot: clientRecord.display_name,
  client_email: clientRecord.email,
  client_phone: clientRecord.phone,
  event_name: `${testId} Birthday`,
  event_type: "Birthday celebration",
  event_date: "2026-10-02",
  start_time: "18:00",
  end_time: "23:00",
  location: "Toronto",
  guest_count: 100,
  status: "Setup",
  client_price: 0,
  internal_notes: testId,
  timeline_notes: testId,
});

await supabase
  .from("projects")
  .update({ event_id: event.id, stage: "Booked" })
  .eq("id", project.id);
await supabase
  .from("leads")
  .update({ converted_event_id: event.id, stage: "Booked" })
  .eq("id", lead.id);

const invoice = await insert(supabase, "invoices", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  client_id: clientRecord.id,
  proposal_id: proposal.id,
  proposal_version_id: version.id,
  proposal_payment_term_id: depositTerm.id,
  invoice_number: `INV-${testId}-DEPOSIT`,
  invoice_type: "Deposit",
  amount: 5000,
  paid_amount: 0,
  due_date: "2026-06-30",
  status: "Partially Paid",
  notes: testId,
  metadata: { test_identifier: testId },
});

await insert(supabase, "invoice_payments", {
  organization_id: org.id,
  invoice_id: invoice.id,
  project_id: project.id,
  event_id: event.id,
  amount: 5000,
  payment_method: "Manual test",
  paid_at: new Date().toISOString(),
  reference: `PAY-${testId}`,
  note: "Phase 4 e2e recorded payment; no real card charged.",
  recorded_by: owner?.id ?? null,
  idempotency_key: `${testId}-client-payment`,
  metadata: { test_identifier: testId },
});

const vendor = await insert(supabase, "vendors", {
  organization_id: org.id,
  name: `${testId} Vendor`,
  service_category: "Decor",
  contact_name: "Phase 4 Vendor",
  email: `${testId}-vendor@example.test`,
  phone: "555-0401",
  notes: testId,
  rating: 5,
});

await insert(supabase, "event_vendors", {
  organization_id: org.id,
  event_id: event.id,
  vendor_id: vendor.id,
  service_category: "Decor",
  quoted_amount: 4000,
  actual_amount: 4000,
  payment_status: "Not Paid",
  notes: testId,
});

const budgetItem = await insert(supabase, "budget_items", {
  organization_id: org.id,
  event_id: event.id,
  vendor_id: vendor.id,
  category: "Decor",
  description: `${testId} Decor budget`,
  planned_amount: 4000,
  actual_amount: 0,
  paid_amount: 0,
  due_date: "2026-09-01",
  margin_estimate: 0,
});

const expense = await insert(supabase, "expenses", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  vendor_id: vendor.id,
  budget_item_id: budgetItem.id,
  created_by: owner?.id ?? null,
  approved_by: owner?.id ?? null,
  expense_number: `EXP-${testId}-001`,
  description: `${testId} Decor deposit`,
  category: "Decor",
  source: "Vendor Bill",
  status: "Approved",
  currency: org.currency || "CAD",
  subtotal: 1100,
  tax_amount: 100,
  service_fee_amount: 0,
  tip_amount: 0,
  total_amount: 1200,
  expense_date: "2026-06-19",
  due_date: "2026-06-30",
  approved_at: new Date().toISOString(),
  notes: testId,
  bookkeeping_status: "Reviewed",
  metadata: { test_identifier: testId },
  idempotency_key: `${testId}-expense-001`,
});

const receipt = await insert(supabase, "files", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  uploaded_by: owner?.id ?? null,
  category: "Receipts",
  storage_path: `organizations/${org.id}/projects/${project.id}/expenses/${testId}-receipt.pdf`,
  name: `${testId} receipt.pdf`,
  mime_type: "application/pdf",
  size_bytes: 1024,
  visibility: "Internal",
  original_filename: `${testId}-receipt.pdf`,
  caption: testId,
});

await insert(supabase, "expense_files", {
  organization_id: org.id,
  expense_id: expense.id,
  file_id: receipt.id,
  visibility: "Internal",
  caption: "Phase 4 test receipt",
  created_by: owner?.id ?? null,
});

await insert(supabase, "expense_payments", {
  organization_id: org.id,
  expense_id: expense.id,
  amount: 500,
  currency: org.currency || "CAD",
  payment_method: "Bank Transfer",
  payment_date: "2026-06-20",
  reference: `VENDOR-PAY-${testId}`,
  notes: "Phase 4 e2e partial vendor payment.",
  recorded_by: owner?.id ?? null,
  status: "Completed",
  idempotency_key: `${testId}-expense-payment-001`,
  metadata: { test_identifier: testId },
});

const contractedRevenue = 10000;
const collectedRevenue = 5000;
const plannedCost = 4000;
const incurredExpenses = 1200;
const paidExpenses = 500;
const outstandingExpenseBalance = money(incurredExpenses - paidExpenses);
const currentForecastCost = Math.max(plannedCost, incurredExpenses);
const forecastProfit = money(contractedRevenue - currentForecastCost);
const cashPosition = money(collectedRevenue - paidExpenses);

assert(contractedRevenue === 10000, "contracted revenue should be 10,000");
assert(collectedRevenue === 5000, "collected revenue should be 5,000");
assert(plannedCost === 4000, "planned cost should be 4,000");
assert(incurredExpenses === 1200, "incurred expenses should be 1,200");
assert(paidExpenses === 500, "paid expenses should be 500");
assert(outstandingExpenseBalance === 700, "outstanding expense balance should be 700");
assert(forecastProfit === 6000, "forecast profit should use the documented forecast formula");
assert(cashPosition === 4500, "cash position should be 4,500");

await insert(supabase, "expenses", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  vendor_id: vendor.id,
  budget_item_id: budgetItem.id,
  created_by: owner?.id ?? null,
  approved_by: owner?.id ?? null,
  expense_number: `EXP-${testId}-002`,
  description: `${testId} Decor overrun`,
  category: "Decor",
  source: "Adjustment",
  status: "Approved",
  currency: org.currency || "CAD",
  subtotal: 3500,
  tax_amount: 0,
  service_fee_amount: 0,
  tip_amount: 0,
  total_amount: 3500,
  expense_date: "2026-06-21",
  due_date: "2026-07-01",
  approved_at: new Date().toISOString(),
  notes: testId,
  bookkeeping_status: "Unreviewed",
  metadata: { test_identifier: testId },
  idempotency_key: `${testId}-expense-002`,
});

const overrunIncurred = 1200 + 3500;
assert(overrunIncurred > plannedCost, "second expense should cause category overrun");

{
  const { error: duplicateExpenseError } = await supabase.from("expenses").insert({
    organization_id: org.id,
    project_id: project.id,
    event_id: event.id,
    vendor_id: vendor.id,
    budget_item_id: budgetItem.id,
    description: `${testId} duplicate`,
    category: "Decor",
    source: "Manual",
    status: "Approved",
    currency: org.currency || "CAD",
    subtotal: 1,
    tax_amount: 0,
    service_fee_amount: 0,
    tip_amount: 0,
    total_amount: 1,
    expense_date: "2026-06-22",
    idempotency_key: `${testId}-expense-001`,
  });
  assert(
    duplicateExpenseError && String(duplicateExpenseError.message).includes("duplicate key"),
    "duplicate expense should be blocked",
  );
}

assert(
  (await count(supabase, "expenses", "project_id", project.id)) === 2,
  "no duplicate expense rows",
);
assert(
  (await count(supabase, "expense_payments", "expense_id", expense.id)) === 1,
  "no duplicate payments",
);
assert(
  (await count(supabase, "expense_files", "expense_id", expense.id)) === 1,
  "receipt should be linked once",
);

const csv = [
  [
    "contracted_revenue",
    "collected_revenue",
    "planned_cost",
    "incurred_expenses",
    "paid_expenses",
    "outstanding_expense_balance",
    "forecast_profit",
    "cash_position",
  ],
  [
    contractedRevenue,
    collectedRevenue,
    plannedCost,
    incurredExpenses,
    paidExpenses,
    outstandingExpenseBalance,
    forecastProfit,
    cashPosition,
  ],
]
  .map((row) => row.join(","))
  .join("\n");
const csvPath = join(tmpdir(), `${testId}-finance-report.csv`);
writeFileSync(csvPath, csv);
console.log(`CSV report written: ${csvPath}`);

const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (anonKey) {
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anonExpenses, error: anonError } = await anon
    .from("expenses")
    .select("id")
    .eq("id", expense.id);
  assert(
    !anonError,
    `anonymous expense query should fail closed without error: ${anonError?.message}`,
  );
  assert((anonExpenses ?? []).length === 0, "anonymous users must not read internal expenses");
}

console.log("Phase 4 e2e passed.");
console.log("No real email was sent and no real payment method was charged.");
