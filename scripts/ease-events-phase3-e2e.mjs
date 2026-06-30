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

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function insert(client, table, payload) {
  const { data, error } = await client.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

loadDotEnv();

if (process.env.EASE_EVENTS_EMAIL_MODE === "live") {
  throw new Error("Refusing to run Phase 3 e2e while EASE_EVENTS_EMAIL_MODE=live.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE3_TEST_ID || `easeevents-phase3-${Date.now()}`;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 3 e2e test id: ${testId}`);

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
  phone: "555-0100",
  status: "Prospect",
  source: "Phase 3 e2e",
  notes: testId,
});

const lead = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: owner?.id ?? null,
  client_id: clientRecord.id,
  stage: "Consultation Completed",
  client_name_snapshot: clientRecord.display_name,
  email: clientRecord.email,
  phone: clientRecord.phone,
  event_type: "Birthday celebration",
  event_date: "2026-10-02",
  estimated_guest_count: 100,
  budget_range: "$15,000-$20,000",
  notes: testId,
  source: "Phase 3 e2e",
});

const project = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  owner_id: owner?.id ?? null,
  name: `${testId} Birthday`,
  stage: "Proposal",
});

await supabase.from("leads").update({ project_id: project.id }).eq("id", lead.id);

const proposal = await insert(supabase, "proposals", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  proposal_number: `PROP-${testId}`,
  title: `${testId} Proposal`,
  status: "Draft",
  currency: org.currency || "CAD",
  current_version_number: 1,
  valid_until: "2026-07-01",
  created_by: owner?.id ?? null,
  metadata: { test_identifier: testId },
});

async function createVersion(versionNumber, optionalPrice) {
  const requiredA = 8000;
  const requiredB = 5000;
  const total = requiredA + requiredB + optionalPrice;
  const version = await insert(supabase, "proposal_versions", {
    organization_id: org.id,
    proposal_id: proposal.id,
    version_number: versionNumber,
    introduction: "Phase 3 e2e introduction",
    scope: "Two required services and one optional upgrade.",
    terms: "Client acceptance confirms proposal terms.",
    subtotal: total,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: total,
    snapshot: { test_identifier: testId },
    document_hash: `hash-${testId}-${versionNumber}`,
    immutable_at: new Date().toISOString(),
    created_by: owner?.id ?? null,
  });
  const lineItems = [
    ["Planning package", requiredA, false],
    ["Decor production", requiredB, false],
    ["Dance floor upgrade", optionalPrice, true],
  ];
  for (const [name, amount, optional] of lineItems) {
    await insert(supabase, "proposal_line_items", {
      organization_id: org.id,
      proposal_version_id: version.id,
      category: optional ? "Entertainment" : "Decor",
      name,
      quantity: 1,
      unit_price: amount,
      discount_amount: 0,
      total_amount: amount,
      is_optional: optional,
      is_selected: true,
      client_visible: true,
    });
  }
  const deposit = await insert(supabase, "proposal_payment_terms", {
    organization_id: org.id,
    proposal_version_id: version.id,
    label: "Deposit to book",
    payment_type: "Deposit",
    amount_type: "Percent",
    amount_value: 50,
    calculated_amount: money(total * 0.5),
    due_rule: "On Acceptance",
    required_for_booking: true,
    sort_order: 0,
  });
  const final = await insert(supabase, "proposal_payment_terms", {
    organization_id: org.id,
    proposal_version_id: version.id,
    label: "Final balance",
    payment_type: "Final",
    amount_type: "Percent",
    amount_value: 50,
    calculated_amount: money(total * 0.5),
    due_rule: "Before Event",
    due_date: "2026-09-18",
    required_for_booking: false,
    sort_order: 1,
  });
  return { version, deposit, final, total };
}

const v1 = await createVersion(1, 1500);
await supabase
  .from("proposals")
  .update({
    current_version_id: v1.version.id,
    current_version_number: 1,
    status: "Sent",
    sent_at: new Date().toISOString(),
  })
  .eq("id", proposal.id);
await insert(supabase, "proposal_responses", {
  organization_id: org.id,
  proposal_id: proposal.id,
  proposal_version_id: v1.version.id,
  project_id: project.id,
  client_id: clientRecord.id,
  response_type: "Changes Requested",
  comment: "Please revise optional dance floor pricing.",
  responder_name: clientRecord.display_name,
  responder_email: clientRecord.email,
  metadata: { test_identifier: testId },
});

const v2 = await createVersion(2, 1200);
await supabase
  .from("proposals")
  .update({
    current_version_id: v2.version.id,
    current_version_number: 2,
    status: "Accepted",
    accepted_at: new Date().toISOString(),
    metadata: { test_identifier: testId, accepted_total: v2.total },
  })
  .eq("id", proposal.id);
await insert(supabase, "proposal_responses", {
  organization_id: org.id,
  proposal_id: proposal.id,
  proposal_version_id: v2.version.id,
  project_id: project.id,
  client_id: clientRecord.id,
  response_type: "Accepted",
  comment: "Accepted in Phase 3 e2e.",
  responder_name: clientRecord.display_name,
  responder_email: clientRecord.email,
  metadata: { test_identifier: testId, selected_line_item_ids: [] },
});

for (const term of [v2.deposit, v2.final]) {
  await insert(supabase, "invoices", {
    organization_id: org.id,
    project_id: project.id,
    client_id: clientRecord.id,
    proposal_id: proposal.id,
    proposal_version_id: v2.version.id,
    proposal_payment_term_id: term.id,
    invoice_number: `INV-${testId}-${term.payment_type}`,
    invoice_type: term.payment_type === "Deposit" ? "Deposit" : "Final",
    amount: term.calculated_amount,
    paid_amount: 0,
    due_date: term.due_date || new Date().toISOString().slice(0, 10),
    status: "Draft",
    metadata: { test_identifier: testId },
  });
}

const { data: invoicesBeforePayment } = await supabase
  .from("invoices")
  .select("*")
  .eq("proposal_id", proposal.id);
assert(invoicesBeforePayment.length === 2, "Expected exactly two generated invoices.");
assert(project.stage !== "Booked", "Project should not be booked before deposit payment.");

const depositInvoice = invoicesBeforePayment.find((invoice) => invoice.invoice_type === "Deposit");
await insert(supabase, "invoice_payments", {
  organization_id: org.id,
  invoice_id: depositInvoice.id,
  project_id: project.id,
  amount: depositInvoice.amount,
  payment_method: "Offline",
  paid_at: new Date().toISOString(),
  reference: testId,
  recorded_by: owner?.id ?? null,
  idempotency_key: `${testId}-deposit`,
  metadata: { test_identifier: testId },
});
await supabase
  .from("invoices")
  .update({ paid_amount: depositInvoice.amount, status: "Paid" })
  .eq("id", depositInvoice.id);

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
  event_type: lead.event_type,
  event_date: lead.event_date,
  start_time: "17:00",
  end_time: "22:00",
  location: "Phase 3 Test Venue",
  guest_count: 100,
  status: "Setup",
  client_price: v2.total,
  internal_notes: testId,
  timeline_notes: testId,
});
await supabase
  .from("projects")
  .update({ event_id: event.id, stage: "Booked", name: event.event_name })
  .eq("id", project.id);
await supabase
  .from("leads")
  .update({ stage: "Booked", converted_event_id: event.id })
  .eq("id", lead.id);
await supabase.from("invoices").update({ event_id: event.id }).eq("project_id", project.id);

const [{ data: eventCount }, { data: invoiceCount }, { data: responseCount }] = await Promise.all([
  supabase.from("events").select("id").eq("project_id", project.id),
  supabase.from("invoices").select("id").eq("proposal_id", proposal.id),
  supabase.from("proposal_responses").select("id,response_type").eq("proposal_id", proposal.id),
]);
assert(eventCount.length === 1, "Expected one booked event.");
assert(invoiceCount.length === 2, "Expected no duplicate invoices.");
assert(
  responseCount.filter((item) => item.response_type === "Accepted").length === 1,
  "Expected one acceptance.",
);

if (process.env.VITE_SUPABASE_ANON_KEY) {
  const anon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anonRows, error: anonError } = await anon
    .from("proposals")
    .select("id")
    .eq("id", proposal.id);
  assert(
    !anonRows?.length || anonError,
    "Anonymous cross-organization/public proposal read was not denied.",
  );
}

console.log("Phase 3 e2e completed without sending email or charging a payment method.");
console.log(`Cleanup: EASE_EVENTS_PHASE3_TEST_ID=${testId} npm run events:phase3:cleanup`);
