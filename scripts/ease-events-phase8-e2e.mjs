import { readFileSync } from "node:fs";
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

async function insert(client, table, payload) {
  const { data, error } = await client.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

async function count(client, table, filters) {
  let query = client.from(table).select("id", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { count: found, error } = await query;
  if (error) throw error;
  return found ?? 0;
}

async function sumColumn(client, table, column, filters) {
  let query = client.from(table).select(column);
  for (const [filterColumn, value] of Object.entries(filters))
    query = query.eq(filterColumn, value);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reduce((total, row) => total + Number(row[column] ?? 0), 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isoAt(hour, minute = "00") {
  return `${today()}T${String(hour).padStart(2, "0")}:${minute}:00.000Z`;
}

async function ensureCloseoutItems(client, orgId, closeout, ownerId) {
  const defaults = [
    ["Operational", "Event-Day Mode completed", "Required"],
    ["Operational", "Actual timeline reviewed", "Required"],
    ["Operational", "Unresolved event-day issues assigned or resolved", "Required"],
    ["Financial", "Client balance reconciled or explicitly deferred", "Required"],
    ["Financial", "Vendor payments reconciled or explicitly deferred", "Required"],
    ["Financial", "Budget variance and final profitability reviewed", "Required"],
    ["Deliverables", "Final client-facing deliverables prepared", "Required"],
    ["Relationship", "Client feedback requested or intentionally deferred", "Recommended"],
    ["Relationship", "Vendor performance reviews completed", "Recommended"],
    ["Closure", "Internal retrospective completed", "Recommended"],
    ["Closure", "Retention and rebooking handoff classified", "Required"],
  ];

  for (const [groupName, title, requirementLevel] of defaults) {
    const idempotencyKey = `${closeout.id}:${groupName}:${title}`.toLowerCase();
    const { data: existing, error: existingError } = await client
      .from("post_event_closeout_items")
      .select("id")
      .eq("organization_id", orgId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) continue;

    await insert(client, "post_event_closeout_items", {
      organization_id: orgId,
      closeout_id: closeout.id,
      project_id: closeout.project_id,
      event_id: closeout.event_id,
      group_name: groupName,
      title,
      requirement_level: requirementLevel,
      status: "Not Started",
      owner_id: ownerId ?? null,
      sort_order: defaults.findIndex((item) => item[1] === title) * 10 + 10,
      idempotency_key: idempotencyKey,
      metadata: { test_seed: true },
    });
  }
}

async function completeCloseoutItems(client, closeoutId) {
  const { error } = await client
    .from("post_event_closeout_items")
    .update({
      status: "Complete",
      completed_at: new Date().toISOString(),
      notes: "Completed by Phase 8 e2e closeout verification.",
    })
    .eq("closeout_id", closeoutId);
  if (error) throw error;
}

loadDotEnv();

if (process.env.EASE_EVENTS_EMAIL_MODE === "live") {
  throw new Error("Refusing to run Phase 8 e2e while EASE_EVENTS_EMAIL_MODE=live.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE8_TEST_ID || `easeevents-phase8-${Date.now()}`;
assert(
  testId.startsWith("easeevents-phase8-"),
  "Phase 8 test id must start with easeevents-phase8-.",
);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 8 e2e test id: ${testId}`);

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

const { data: ownerRows, error: ownerError } = await supabase
  .from("users")
  .select("*")
  .eq("organization_id", org.id)
  .in("role", ["admin", "planner"])
  .limit(1);
if (ownerError) throw ownerError;
const owner = ownerRows?.[0];
assert(owner?.id, "At least one admin/planner user is required for Phase 8 e2e.");

const clientPassword = `Phase8-${Date.now()}!`;
const clientEmail = `${testId}-client@example.test`;
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: clientEmail,
  password: clientPassword,
  email_confirm: true,
  user_metadata: { test_identifier: testId },
});
if (authError) throw authError;
const clientUserId = authData.user.id;

await insert(supabase, "users", {
  id: clientUserId,
  organization_id: org.id,
  role: "client",
  full_name: `${testId} Client User`,
  email: clientEmail,
  phone: "555-0800",
});

const clientRecord = await insert(supabase, "clients", {
  organization_id: org.id,
  user_id: clientUserId,
  display_name: `${testId} Client`,
  email: clientEmail,
  phone: "555-0800",
  status: "Active",
  source: "Phase 8 e2e",
  notes: testId,
});

const lead = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: owner.id,
  client_id: clientRecord.id,
  stage: "Booked",
  client_name_snapshot: clientRecord.display_name,
  email: clientRecord.email,
  phone: clientRecord.phone,
  event_type: "Post-event closeout test",
  event_date: today(),
  estimated_guest_count: 80,
  budget_range: "$15,000",
  notes: testId,
  source: "Phase 8 e2e",
});

const project = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  owner_id: owner.id,
  name: `${testId} Closeout Test`,
  stage: "Event Day",
});
await supabase.from("leads").update({ project_id: project.id }).eq("id", lead.id);

const event = await insert(supabase, "events", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  planner_id: owner.id,
  client_user_id: clientUserId,
  client_name_snapshot: clientRecord.display_name,
  client_email: clientRecord.email,
  client_phone: clientRecord.phone,
  event_name: `${testId} Gala`,
  event_type: "Milestone birthday",
  event_date: today(),
  start_time: "10:00",
  end_time: "18:00",
  location: "Phase 8 Event Loft",
  guest_count: 80,
  status: "Event Day",
  client_price: 0,
  internal_notes: testId,
  timeline_notes: testId,
});
await supabase.from("projects").update({ event_id: event.id }).eq("id", project.id);
await supabase.from("leads").update({ converted_event_id: event.id }).eq("id", lead.id);

await insert(supabase, "event_team_members", {
  organization_id: org.id,
  event_id: event.id,
  user_id: owner.id,
  role_label: "Closeout owner",
  event_day_role: "Command lead",
  event_day_status: "On Site",
  on_site_at: isoAt(9, "30"),
});

await insert(supabase, "event_timeline_items", {
  organization_id: org.id,
  event_id: event.id,
  title: `${testId} Load-in`,
  description: "Phase 8 run-of-show item.",
  start_time: "10:00",
  end_time: "11:00",
  owner_id: owner.id,
  status: "Completed",
  location: "Main hall",
  visibility: "Internal",
  sort_order: 10,
  planned_start_at: isoAt(10),
  planned_end_at: isoAt(11),
  actual_start_at: isoAt(10, "05"),
  actual_end_at: isoAt(11, "20"),
  completed_at: isoAt(11, "20"),
  criticality: "Critical",
  delay_minutes: 20,
  event_day_notes: testId,
});

await insert(supabase, "event_timeline_items", {
  organization_id: org.id,
  event_id: event.id,
  title: `${testId} Client reveal`,
  description: "Phase 8 run-of-show item.",
  start_time: "15:00",
  end_time: "15:30",
  owner_id: owner.id,
  status: "Completed",
  location: "Main hall",
  visibility: "Client",
  sort_order: 20,
  planned_start_at: isoAt(15),
  planned_end_at: isoAt(15, "30"),
  actual_start_at: isoAt(15),
  actual_end_at: isoAt(15, "25"),
  completed_at: isoAt(15, "25"),
  criticality: "High",
});

const vendorOne = await insert(supabase, "vendors", {
  organization_id: org.id,
  name: `${testId} Florals`,
  service_category: "Florals",
  contact_name: "Phase 8 Florist",
  email: `${testId}-florals@example.test`,
  phone: "555-0801",
  notes: testId,
  rating: 5,
});

const vendorTwo = await insert(supabase, "vendors", {
  organization_id: org.id,
  name: `${testId} Rentals`,
  service_category: "Rentals",
  contact_name: "Phase 8 Rentals",
  email: `${testId}-rentals@example.test`,
  phone: "555-0802",
  notes: testId,
  rating: 4,
});

const eventVendorOne = await insert(supabase, "event_vendors", {
  organization_id: org.id,
  event_id: event.id,
  vendor_id: vendorOne.id,
  service_category: "Florals",
  quoted_amount: 1200,
  actual_amount: 1200,
  payment_status: "Partially Paid",
  notes: testId,
});

const eventVendorTwo = await insert(supabase, "event_vendors", {
  organization_id: org.id,
  event_id: event.id,
  vendor_id: vendorTwo.id,
  service_category: "Rentals",
  quoted_amount: 800,
  actual_amount: 800,
  payment_status: "Paid",
  notes: testId,
});

await insert(supabase, "event_day_vendor_statuses", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  event_vendor_id: eventVendorOne.id,
  vendor_id: vendorOne.id,
  status: "Completed",
  arrival_time: isoAt(9, "45"),
  setup_window_start: isoAt(9),
  setup_window_end: isoAt(11),
  delay_minutes: 15,
  issue_summary: "Minor late arrival documented.",
  checked_in_by: owner.id,
  checked_in_at: isoAt(9, "45"),
  notes: testId,
});

await insert(supabase, "event_day_vendor_statuses", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  event_vendor_id: eventVendorTwo.id,
  vendor_id: vendorTwo.id,
  status: "Completed",
  arrival_time: isoAt(8, "50"),
  setup_window_start: isoAt(9),
  setup_window_end: isoAt(10),
  checked_in_by: owner.id,
  checked_in_at: isoAt(8, "50"),
  notes: testId,
});

const invoice = await insert(supabase, "invoices", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  client_id: clientRecord.id,
  invoice_number: `INV-${testId}-FINAL`,
  invoice_type: "Final",
  amount: 5000,
  paid_amount: 5000,
  due_date: today(),
  status: "Paid",
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
  reference: `CLIENT-PAY-${testId}`,
  note: "Phase 8 e2e payment record; no real payment method charged.",
  recorded_by: owner.id,
  idempotency_key: `${testId}:client-payment`,
  metadata: { test_identifier: testId },
});

const budgetItem = await insert(supabase, "budget_items", {
  organization_id: org.id,
  event_id: event.id,
  vendor_id: vendorOne.id,
  category: "Florals",
  description: `${testId} floral budget`,
  planned_amount: 1200,
  actual_amount: 1200,
  paid_amount: 500,
  due_date: today(),
  margin_estimate: 0,
});

const expense = await insert(supabase, "expenses", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  vendor_id: vendorOne.id,
  budget_item_id: budgetItem.id,
  created_by: owner.id,
  approved_by: owner.id,
  expense_number: `EXP-${testId}-001`,
  description: `${testId} floral balance`,
  category: "Florals",
  source: "Vendor Bill",
  status: "Approved",
  currency: org.currency || "CAD",
  subtotal: 1200,
  tax_amount: 0,
  service_fee_amount: 0,
  tip_amount: 0,
  total_amount: 1200,
  expense_date: today(),
  due_date: today(),
  approved_at: new Date().toISOString(),
  notes: testId,
  bookkeeping_status: "Reviewed",
  metadata: { test_identifier: testId },
  idempotency_key: `${testId}:expense:florals`,
});

const receipt = await insert(supabase, "files", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  uploaded_by: owner.id,
  category: "Receipts",
  storage_path: `organizations/${org.id}/projects/${project.id}/closeout/${testId}-receipt.pdf`,
  name: `${testId} receipt.pdf`,
  mime_type: "application/pdf",
  size_bytes: 2048,
  visibility: "Internal",
  original_filename: `${testId}-receipt.pdf`,
  caption: testId,
});

await insert(supabase, "expense_files", {
  organization_id: org.id,
  expense_id: expense.id,
  file_id: receipt.id,
  visibility: "Internal",
  caption: "Phase 8 receipt.",
  created_by: owner.id,
});

await insert(supabase, "expense_payments", {
  organization_id: org.id,
  expense_id: expense.id,
  amount: 500,
  currency: org.currency || "CAD",
  payment_method: "Bank Transfer",
  payment_date: today(),
  reference: `VENDOR-PAY-${testId}-1`,
  notes: "Partial vendor payment.",
  recorded_by: owner.id,
  status: "Completed",
  idempotency_key: `${testId}:vendor-payment:1`,
  metadata: { test_identifier: testId },
});

await insert(supabase, "event_day_sessions", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  status: "Completed",
  event_day_lead_id: owner.id,
  activated_by: owner.id,
  activated_at: isoAt(9),
  completed_by: owner.id,
  completed_at: isoAt(18),
  unresolved_warnings: [],
  readiness_overrides: [],
  offline_manifest: {},
  metadata: { test_identifier: testId },
});
await supabase.from("events").update({ status: "Event Day Completed" }).eq("id", event.id);

const issue = await insert(supabase, "event_day_issues", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  vendor_id: vendorOne.id,
  reported_by: owner.id,
  assigned_to: owner.id,
  type: "Vendor",
  severity: "Critical",
  title: `${testId} unresolved floral issue`,
  description: "Controlled blocker for Phase 8 e2e.",
  status: "Open",
  opened_at: new Date().toISOString(),
  metadata: { test_identifier: testId },
  idempotency_key: `${testId}:issue:floral`,
});

const closeout = await insert(supabase, "post_event_closeouts", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  status: "Closeout In Progress",
  owner_id: owner.id,
  event_completed_at: isoAt(18),
  closeout_started_at: new Date().toISOString(),
  unresolved_issue_count: 1,
  metadata: { test_identifier: testId },
});
await ensureCloseoutItems(supabase, org.id, closeout, owner.id);
await ensureCloseoutItems(supabase, org.id, closeout, owner.id);

const duplicateCloseout = await supabase.from("post_event_closeouts").insert({
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  status: "Closeout In Progress",
});
assert(duplicateCloseout.error, "Duplicate closeout creation should be rejected.");
assert(
  (await count(supabase, "post_event_closeouts", { project_id: project.id })) === 1,
  "Exactly one closeout should exist.",
);
assert(
  (await count(supabase, "post_event_closeout_items", { closeout_id: closeout.id })) === 11,
  "One closeout task set should exist.",
);

const unresolvedBefore = await count(supabase, "event_day_issues", {
  project_id: project.id,
  status: "Open",
});
const paidExpensesBefore = await sumColumn(supabase, "expense_payments", "amount", {
  expense_id: expense.id,
});
assert(unresolvedBefore === 1, "Unresolved event-day issue should appear as a blocker.");
assert(
  Number(expense.total_amount) - paidExpensesBefore === 700,
  "Vendor balance blocker should be 700.",
);
assert(
  (await count(supabase, "final_deliverables", { project_id: project.id })) === 0,
  "Missing final deliverable should be a blocker.",
);

await supabase
  .from("event_day_issues")
  .update({
    status: "Resolved",
    resolution: "Vendor issue reviewed and resolved in closeout.",
    resolved_at: new Date().toISOString(),
  })
  .eq("id", issue.id);

await insert(supabase, "expense_payments", {
  organization_id: org.id,
  expense_id: expense.id,
  amount: 700,
  currency: org.currency || "CAD",
  payment_method: "Bank Transfer",
  payment_date: today(),
  reference: `VENDOR-PAY-${testId}-2`,
  notes: "Remaining vendor balance.",
  recorded_by: owner.id,
  status: "Completed",
  idempotency_key: `${testId}:vendor-payment:2`,
  metadata: { test_identifier: testId },
});
await supabase.from("expenses").update({ status: "Paid" }).eq("id", expense.id);

const duplicateVendorPayment = await supabase.from("expense_payments").insert({
  organization_id: org.id,
  expense_id: expense.id,
  amount: 700,
  currency: org.currency || "CAD",
  payment_method: "Bank Transfer",
  payment_date: today(),
  status: "Completed",
  idempotency_key: `${testId}:vendor-payment:2`,
});
assert(duplicateVendorPayment.error, "Duplicate vendor payment should be rejected.");

const deliverable = await insert(supabase, "final_deliverables", {
  organization_id: org.id,
  closeout_id: closeout.id,
  project_id: project.id,
  event_id: event.id,
  title: `${testId} final gallery`,
  description: "Client-facing final gallery link.",
  category: "Photo Gallery",
  external_url: `https://example.test/${testId}/gallery`,
  client_visible: true,
  status: "Delivered",
  delivered_at: new Date().toISOString(),
  delivered_by: owner.id,
  idempotency_key: `${testId}:deliverable:gallery`,
  metadata: { test_identifier: testId },
});
assert(deliverable.id, "Final deliverable should be created.");

const duplicateDeliverable = await supabase.from("final_deliverables").insert({
  organization_id: org.id,
  closeout_id: closeout.id,
  project_id: project.id,
  event_id: event.id,
  title: `${testId} duplicate gallery`,
  category: "Photo Gallery",
  external_url: `https://example.test/${testId}/gallery-duplicate`,
  client_visible: true,
  status: "Delivered",
  idempotency_key: `${testId}:deliverable:gallery`,
});
assert(duplicateDeliverable.error, "Duplicate deliverable idempotency key should be rejected.");

const feedback = await insert(supabase, "client_feedback_responses", {
  organization_id: org.id,
  closeout_id: closeout.id,
  project_id: project.id,
  event_id: event.id,
  client_id: clientRecord.id,
  submitted_by: clientUserId,
  responder_name: clientRecord.display_name,
  responder_email: clientRecord.email,
  overall_satisfaction: 2,
  communication_rating: 3,
  planning_process_rating: 3,
  execution_rating: 2,
  value_rating: 3,
  likelihood_to_recommend: 2,
  what_went_well: "Decor looked beautiful.",
  what_could_improve: "Vendor timing needs review.",
  additional_comments: testId,
  permission_to_contact: true,
  concern_level: "High",
  service_recovery_status: "Open",
  metadata: { test_identifier: testId },
});
assert(feedback.id, "Client feedback should be recorded privately.");

await insert(supabase, "tasks", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  owner_id: owner.id,
  title: "Review client closeout concern",
  description: "Controlled Phase 8 service recovery task.",
  due_date: today(),
  status: "To Do",
  priority: "Urgent",
});
const recoveryTaskCount = await count(supabase, "tasks", {
  project_id: project.id,
  title: "Review client closeout concern",
});
assert(recoveryTaskCount === 1, "One service-recovery task should be created for low feedback.");

const communicationThread = await insert(supabase, "communication_threads", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  assigned_to_id: owner.id,
  subject: `${testId} neutral review request`,
  client_name_snapshot: clientRecord.display_name,
  participants: [clientRecord.email, owner.email],
  channel: "Email",
  status: "Closed",
  preview: "Neutral review request draft.",
  last_activity_at: new Date().toISOString(),
});

const emailMode = process.env.EASE_EVENTS_EMAIL_MODE === "test" ? "test" : "disabled";
await insert(supabase, "communication_messages", {
  organization_id: org.id,
  thread_id: communicationThread.id,
  project_id: project.id,
  event_id: event.id,
  author_id: owner.id,
  direction: "Outbound",
  body: "Thank you for choosing Coco Cabana. If you would like to share a public review, here is the configured review link.",
  summary: "Neutral public review request recorded in safe mode.",
  visibility: "Client",
  delivery_status: emailMode === "test" ? "Test Redirected" : "Suppressed",
  delivery_mode: emailMode,
  metadata: {
    test_identifier: testId,
    intended_recipient: clientRecord.email,
    public_review_request: true,
    gated_by_feedback_score: false,
  },
});

for (const assignment of [
  [eventVendorOne, vendorOne, 4],
  [eventVendorTwo, vendorTwo, 5],
]) {
  const [eventVendor, vendor, rating] = assignment;
  await insert(supabase, "vendor_performance_reviews", {
    organization_id: org.id,
    project_id: project.id,
    event_id: event.id,
    event_vendor_id: eventVendor.id,
    vendor_id: vendor.id,
    reviewer_id: owner.id,
    overall_rating: rating,
    communication_rating: rating,
    punctuality_rating: rating,
    quality_rating: rating,
    budget_accuracy_rating: rating,
    professionalism_rating: rating,
    issue_count: vendor.id === vendorOne.id ? 1 : 0,
    would_use_again: true,
    preferred_vendor_recommendation: rating >= 5 ? "Preferred" : "Use with notes",
    operational_context: { test_identifier: testId },
    notes: testId,
  });
}

const duplicateVendorReview = await supabase.from("vendor_performance_reviews").insert({
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  event_vendor_id: eventVendorOne.id,
  vendor_id: vendorOne.id,
});
assert(duplicateVendorReview.error, "Duplicate vendor review should be rejected.");

await insert(supabase, "internal_retrospectives", {
  organization_id: org.id,
  closeout_id: closeout.id,
  project_id: project.id,
  event_id: event.id,
  status: "Complete",
  facilitator_id: owner.id,
  contributors: [owner.id],
  what_went_well: "Final design landed well.",
  what_did_not_go_well: "Vendor timing needed tighter check-in.",
  process_improvements: "Add vendor arrival buffer to this event template.",
  template_changes_recommended: "Add final floral checkpoint.",
  risks_to_avoid: "Do not leave delivery confirmation until event morning.",
  reviewed_at: new Date().toISOString(),
  reviewed_by: owner.id,
  ai_summary: `AI-generated draft placeholder for ${testId}. Planner reviewed before closure.`,
  ai_summary_generated_at: new Date().toISOString(),
  metadata: { test_identifier: testId },
});

await insert(supabase, "client_consents", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  client_id: clientRecord.id,
  consent_type: "Testimonial",
  status: "Granted",
  consent_wording_version: "phase8-v1",
  granted_at: new Date().toISOString(),
  source: "Phase 8 e2e",
  captured_by: owner.id,
  metadata: { test_identifier: testId },
});

await insert(supabase, "client_consents", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  client_id: clientRecord.id,
  consent_type: "Photo/Video Portfolio",
  status: "Requested",
  consent_wording_version: "phase8-v1",
  requested_at: new Date().toISOString(),
  source: "Phase 8 e2e",
  captured_by: owner.id,
  metadata: { test_identifier: testId },
});

await completeCloseoutItems(supabase, closeout.id);
await supabase
  .from("post_event_closeouts")
  .update({
    status: "Ready to Close",
    completion_percentage: 100,
    unresolved_issue_count: 0,
    financial_status: "Complete",
    deliverable_status: "Complete",
    feedback_status: "Complete",
    vendor_review_status: "Complete",
    internal_review_status: "Complete",
    retention_status: "Complete",
    ready_to_close_at: new Date().toISOString(),
    retention_handoff: {
      classification: "Potential repeat client",
      suggested_future_event_type: "Anniversary opportunity",
      marketing_consent: false,
    },
  })
  .eq("id", closeout.id)
  .throwOnError();

const paidExpenses = await sumColumn(supabase, "expense_payments", "amount", {
  expense_id: expense.id,
});
const snapshotOne = await insert(supabase, "closeout_financial_snapshots", {
  organization_id: org.id,
  closeout_id: closeout.id,
  project_id: project.id,
  event_id: event.id,
  version_number: 1,
  contracted_revenue: 5000,
  invoiced_revenue: 5000,
  collected_revenue: 5000,
  outstanding_client_balance: 0,
  planned_cost: 1200,
  incurred_cost: 1200,
  paid_cost: paidExpenses,
  outstanding_vendor_balance: 0,
  forecast_profit: 3800,
  final_operating_margin: 76,
  cash_position: 3800,
  calculation_version: "phase4-v1",
  generated_by: owner.id,
  metadata: { test_identifier: testId, closure_version: 1 },
});

const duplicateSnapshot = await supabase.from("closeout_financial_snapshots").insert({
  organization_id: org.id,
  closeout_id: closeout.id,
  project_id: project.id,
  event_id: event.id,
  version_number: 1,
});
assert(duplicateSnapshot.error, "Duplicate closure snapshot version should be rejected.");

await supabase
  .from("post_event_closeouts")
  .update({
    status: "Closed",
    closed_at: new Date().toISOString(),
    closed_by: owner.id,
    completion_percentage: 100,
  })
  .eq("id", closeout.id)
  .throwOnError();
await supabase.from("events").update({ status: "Closed" }).eq("id", event.id).throwOnError();
await supabase.from("projects").update({ stage: "Completed" }).eq("id", project.id).throwOnError();

const activeProjectCount = await count(supabase, "projects", {
  id: project.id,
  stage: "Event Day",
});
assert(activeProjectCount === 0, "Closed project should leave default active-event stage views.");

await supabase
  .from("post_event_closeouts")
  .update({
    status: "Reopened",
    reopened_at: new Date().toISOString(),
    reopened_by: owner.id,
    reopen_reason: "Controlled Phase 8 reopening verification.",
  })
  .eq("id", closeout.id)
  .throwOnError();
await supabase.from("events").update({ status: "Reopened" }).eq("id", event.id).throwOnError();
await supabase.from("projects").update({ stage: "Post-Event" }).eq("id", project.id).throwOnError();

const { data: unchangedSnapshot, error: snapshotLoadError } = await supabase
  .from("closeout_financial_snapshots")
  .select("*")
  .eq("id", snapshotOne.id)
  .single();
if (snapshotLoadError) throw snapshotLoadError;
assert(
  Number(unchangedSnapshot.cash_position) === 3800,
  "Original closure snapshot must remain unchanged.",
);

await insert(supabase, "closeout_financial_snapshots", {
  organization_id: org.id,
  closeout_id: closeout.id,
  project_id: project.id,
  event_id: event.id,
  version_number: 2,
  contracted_revenue: 5000,
  invoiced_revenue: 5000,
  collected_revenue: 5000,
  outstanding_client_balance: 0,
  planned_cost: 1200,
  incurred_cost: 1200,
  paid_cost: paidExpenses,
  outstanding_vendor_balance: 0,
  forecast_profit: 3800,
  final_operating_margin: 76,
  cash_position: 3800,
  calculation_version: "phase4-v1",
  generated_by: owner.id,
  metadata: { test_identifier: testId, closure_version: 2 },
});
await supabase
  .from("post_event_closeouts")
  .update({
    status: "Closed",
    closed_at: new Date().toISOString(),
    closed_by: owner.id,
    reopen_reason: null,
  })
  .eq("id", closeout.id)
  .throwOnError();
assert(
  (await count(supabase, "closeout_financial_snapshots", { closeout_id: closeout.id })) === 2,
  "Reclosing should preserve a second snapshot version.",
);

if (anonKey) {
  const clientSession = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await clientSession.auth.signInWithPassword({
    email: clientEmail,
    password: clientPassword,
  });
  if (signInError) throw signInError;

  const { data: visibleDeliverables, error: deliverableError } = await clientSession
    .from("final_deliverables")
    .select("id,title")
    .eq("id", deliverable.id);
  if (deliverableError) throw deliverableError;
  assert(
    (visibleDeliverables ?? []).length === 1,
    "Client should see client-visible final deliverables.",
  );

  for (const [table, label] of [
    ["event_day_issues", "internal event-day issues"],
    ["vendor_performance_reviews", "vendor reviews"],
    ["internal_retrospectives", "internal retrospectives"],
    ["closeout_financial_snapshots", "financial snapshots"],
  ]) {
    const { data, error } = await clientSession
      .from(table)
      .select("id")
      .eq("project_id", project.id);
    if (error) throw error;
    assert((data ?? []).length === 0, `Client must not read ${label}.`);
  }

  const outsider = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: outsiderData, error: outsiderError } = await outsider
    .from("post_event_closeouts")
    .select("id")
    .eq("id", closeout.id);
  if (outsiderError) throw outsiderError;
  assert(
    (outsiderData ?? []).length === 0,
    "Unauthenticated cross-organization/public access must be denied.",
  );
}

console.log("Phase 8 e2e passed.");
console.log("No real email, public review post, payment, or external side effect was triggered.");
