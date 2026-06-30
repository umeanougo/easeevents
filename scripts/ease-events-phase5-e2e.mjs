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

async function count(client, table, column, value) {
  const { count: found, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return found ?? 0;
}

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE5_TEST_ID || `easeevents-phase5-${Date.now()}`;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 5 e2e test id: ${testId}`);

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
assert(owner?.id, "A staff user is required for Phase 5 e2e.");

const clientRecord = await insert(supabase, "clients", {
  organization_id: org.id,
  display_name: `${testId} Client`,
  email: `${testId}@example.test`,
  phone: "555-0500",
  status: "Active",
  source: "Phase 5 e2e",
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
  event_type: "Calendar operations test",
  event_date: "2026-10-10",
  estimated_guest_count: 80,
  budget_range: "$15,000",
  notes: testId,
  source: "Phase 5 e2e",
});

const project = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  owner_id: owner.id,
  name: `${testId} Calendar Test`,
  stage: "Booked",
});
await supabase.from("leads").update({ project_id: project.id }).eq("id", lead.id);

const event = await insert(supabase, "events", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  planner_id: owner.id,
  client_name_snapshot: clientRecord.display_name,
  client_email: clientRecord.email,
  client_phone: clientRecord.phone,
  event_name: `${testId} Event`,
  event_type: "Corporate dinner",
  event_date: "2026-10-10",
  start_time: "18:00",
  end_time: "22:00",
  location: "Toronto",
  guest_count: 80,
  status: "Planning",
  client_price: 0,
  internal_notes: testId,
  timeline_notes: testId,
});
await supabase.from("projects").update({ event_id: event.id }).eq("id", project.id);
await supabase.from("leads").update({ converted_event_id: event.id }).eq("id", lead.id);

const meetingOne = await insert(supabase, "meetings", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  event_id: event.id,
  title: `${testId} Consultation`,
  meeting_type: "Google Meet",
  status: "Scheduled",
  start_at: "2026-10-01T14:00:00Z",
  end_at: "2026-10-01T14:30:00Z",
  organizer_id: owner.id,
  attendees: [clientRecord.email, owner.email],
  agenda: testId,
  transcript: "",
  internal_summary: "",
  client_summary: "",
  notes: testId,
  action_items: [],
  timezone: org.timezone || "America/Toronto",
  sync_status: "Not Synced",
  fathom_expected: true,
  idempotency_key: `${testId}-meeting-1`,
});

const meetingTwo = await insert(supabase, "meetings", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  event_id: event.id,
  title: `${testId} Planner overlap`,
  meeting_type: "Phone",
  status: "Scheduled",
  start_at: "2026-10-01T14:15:00Z",
  end_at: "2026-10-01T14:45:00Z",
  organizer_id: owner.id,
  attendees: [owner.email],
  agenda: testId,
  transcript: "",
  internal_summary: "",
  client_summary: "",
  notes: testId,
  action_items: [],
  timezone: org.timezone || "America/Toronto",
  sync_status: "Not Synced",
  idempotency_key: `${testId}-meeting-2`,
});

await insert(supabase, "tasks", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  event_id: event.id,
  owner_id: owner.id,
  title: `${testId} Task deadline`,
  description: testId,
  due_date: "2026-10-03",
  status: "To Do",
  priority: "High",
});

await insert(supabase, "approvals", {
  organization_id: org.id,
  event_id: event.id,
  type: "Timeline",
  title: `${testId} Timeline approval`,
  description: testId,
  status: "Pending",
  due_date: "2026-10-04",
});

await insert(supabase, "event_timeline_items", {
  organization_id: org.id,
  event_id: event.id,
  title: `${testId} Doors open`,
  description: testId,
  start_time: "18:00",
  end_time: "18:30",
  owner_id: owner.id,
  status: "Planned",
  visibility: "Internal",
  sort_order: 1,
});

const proposal = await insert(supabase, "proposals", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  event_id: event.id,
  client_id: clientRecord.id,
  proposal_number: `PROP-${testId}`,
  title: `${testId} Proposal`,
  status: "Sent",
  currency: org.currency || "CAD",
  current_version_number: 1,
  valid_until: "2026-10-05",
  created_by: owner.id,
  metadata: { test_identifier: testId },
});

await insert(supabase, "invoices", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  client_id: clientRecord.id,
  proposal_id: proposal.id,
  invoice_number: `INV-${testId}`,
  invoice_type: "Deposit",
  amount: 1500,
  paid_amount: 0,
  due_date: "2026-10-06",
  status: "Sent",
  notes: testId,
  metadata: { test_identifier: testId },
});

await insert(supabase, "expenses", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  created_by: owner.id,
  expense_number: `EXP-${testId}`,
  description: `${testId} Vendor bill`,
  category: "Decor",
  source: "Vendor Bill",
  status: "Submitted",
  currency: org.currency || "CAD",
  subtotal: 500,
  tax_amount: 0,
  service_fee_amount: 0,
  tip_amount: 0,
  total_amount: 500,
  expense_date: "2026-10-02",
  due_date: "2026-10-07",
  notes: testId,
  metadata: { test_identifier: testId },
});

await insert(supabase, "project_reminders", {
  organization_id: org.id,
  project_id: project.id,
  assigned_to_id: owner.id,
  title: `${testId} Reminder`,
  due_at: "2026-10-08T13:00:00Z",
  status: "Open",
  automation_source: "phase5-e2e",
  metadata: { test_identifier: testId },
});

await supabase
  .from("external_calendar_events")
  .upsert(
    {
      organization_id: org.id,
      provider: "google",
      calendar_id: "primary",
      external_event_id: `${testId}-external-hold`,
      title: `${testId} External hold`,
      description: testId,
      start_at: "2026-10-09T15:00:00Z",
      end_at: "2026-10-09T16:00:00Z",
      all_day: false,
      timezone: org.timezone || "America/Toronto",
      status: "Confirmed",
      meeting_url: "https://meet.google.com/test-phase5",
      attendees: [owner.email],
      sync_status: "Synced",
      raw_provider_payload: { test_identifier: testId },
      metadata: { test_identifier: testId },
    },
    { onConflict: "organization_id,provider,calendar_id,external_event_id" },
  )
  .throwOnError();

await supabase
  .from("external_calendar_events")
  .upsert(
    {
      organization_id: org.id,
      provider: "google",
      calendar_id: "primary",
      external_event_id: `${testId}-external-hold`,
      title: `${testId} External hold updated`,
      description: testId,
      start_at: "2026-10-09T15:00:00Z",
      end_at: "2026-10-09T16:00:00Z",
      all_day: false,
      timezone: org.timezone || "America/Toronto",
      status: "Confirmed",
      attendees: [owner.email],
      sync_status: "Synced",
      raw_provider_payload: { test_identifier: testId, retry: true },
      metadata: { test_identifier: testId },
    },
    { onConflict: "organization_id,provider,calendar_id,external_event_id" },
  )
  .throwOnError();

await supabase
  .from("calendar_sync_states")
  .insert({
    organization_id: org.id,
    provider: "google",
    calendar_id: `phase5-${testId}`,
    last_successful_sync_at: new Date().toISOString(),
    last_attempted_sync_at: new Date().toISOString(),
    metadata: { test_identifier: testId },
  })
  .throwOnError();

await supabase
  .from("calendar_sync_runs")
  .insert({
    organization_id: org.id,
    provider: "google",
    status: "Completed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    imported_count: 1,
    updated_count: 1,
    metadata: { test_identifier: testId },
  })
  .throwOnError();

const meetingCount = await count(supabase, "meetings", "project_id", project.id);
assert(meetingCount === 2, "Expected exactly two test meetings.");

const { count: externalCount, error: externalCountError } = await supabase
  .from("external_calendar_events")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", org.id)
  .eq("external_event_id", `${testId}-external-hold`);
if (externalCountError) throw externalCountError;
assert(externalCount === 1, "External calendar cache upsert was not idempotent.");

assert(
  new Date(meetingOne.start_at).getTime() < new Date(meetingTwo.end_at).getTime() &&
    new Date(meetingTwo.start_at).getTime() < new Date(meetingOne.end_at).getTime(),
  "Expected overlapping meetings for conflict verification.",
);

for (const table of [
  "tasks",
  "approvals",
  "event_timeline_items",
  "proposals",
  "invoices",
  "expenses",
  "project_reminders",
  "calendar_sync_states",
  "calendar_sync_runs",
]) {
  const recordCount =
    table === "calendar_sync_states" || table === "calendar_sync_runs"
      ? await count(supabase, table, "organization_id", org.id)
      : await count(
          supabase,
          table,
          table === "project_reminders" ||
            table === "proposals" ||
            table === "invoices" ||
            table === "expenses"
            ? "project_id"
            : "event_id",
          table === "project_reminders" ||
            table === "proposals" ||
            table === "invoices" ||
            table === "expenses"
            ? project.id
            : event.id,
        );
  assert(recordCount > 0, `Expected ${table} test data.`);
}

const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (anonKey) {
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anonymousExternalRows, error: anonymousError } = await anonClient
    .from("external_calendar_events")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1);
  assert(
    anonymousError || (anonymousExternalRows?.length ?? 0) === 0,
    "Anonymous access should not read external calendar events.",
  );
}

console.log("Phase 5 e2e passed.");
console.log(`Cleanup command: EASE_EVENTS_PHASE5_TEST_ID=${testId} npm run events:phase5:cleanup`);
