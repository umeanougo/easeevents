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

async function upsertSingle(client, table, payload, onConflict) {
  const { data, error } = await client
    .from(table)
    .upsert(payload, { onConflict })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function createIssueOnce(client, payload) {
  const { data: existing, error: existingError } = await client
    .from("event_day_issues")
    .select("*")
    .eq("organization_id", payload.organization_id)
    .eq("idempotency_key", payload.idempotency_key)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;
  return insert(client, "event_day_issues", payload);
}

async function count(client, table, column, value) {
  const { count: found, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return found ?? 0;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isoOn(date, time) {
  return `${date}T${time}:00.000Z`;
}

async function ensureGeneratedPlanner(supabase, orgId, testId, index) {
  const email = `${testId}-team-${index}@example.test`;
  const { data: existingProfile, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("organization_id", orgId)
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingProfile) return existingProfile;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: `Phase6-${Date.now()}-${index}!`,
    email_confirm: true,
    user_metadata: { test_identifier: testId },
  });
  if (authError) throw authError;

  return insert(supabase, "users", {
    id: authData.user.id,
    organization_id: orgId,
    role: "planner",
    full_name: `${testId} Planner ${index}`,
    email,
    phone: `555-060${index}`,
  });
}

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE6_TEST_ID || `easeevents-phase6-${Date.now()}`;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 6 e2e test id: ${testId}`);

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

const { data: staffRows, error: staffError } = await supabase
  .from("users")
  .select("*")
  .eq("organization_id", org.id)
  .in("role", ["admin", "planner"])
  .limit(3);
if (staffError) throw staffError;

let staff = staffRows ?? [];
if (!staff.length) {
  staff = [await ensureGeneratedPlanner(supabase, org.id, testId, 0)];
}
while (staff.length < 3) {
  staff.push(await ensureGeneratedPlanner(supabase, org.id, testId, staff.length));
}

const owner = staff[0];
const teamOne = staff[1];
const teamTwo = staff[2];
const eventDate = todayDate();

const clientRecord = await insert(supabase, "clients", {
  organization_id: org.id,
  display_name: `${testId} Client`,
  email: `${testId}@example.test`,
  phone: "555-0600",
  status: "Active",
  source: "Phase 6 e2e",
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
  event_type: "Event-day command test",
  event_date: eventDate,
  estimated_guest_count: 120,
  budget_range: "$25,000",
  notes: testId,
  source: "Phase 6 e2e",
});

const project = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: clientRecord.id,
  owner_id: owner.id,
  name: `${testId} Event-Day Test`,
  stage: "Event Day",
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
  event_type: "Birthday celebration",
  event_date: eventDate,
  start_time: "10:00",
  end_time: "18:00",
  location: "Toronto Event Loft",
  guest_count: 120,
  status: "In Progress",
  client_price: 0,
  internal_notes: testId,
  timeline_notes: testId,
});
await supabase.from("projects").update({ event_id: event.id }).eq("id", project.id);
await supabase.from("leads").update({ converted_event_id: event.id }).eq("id", lead.id);

const eventLead = await insert(supabase, "event_team_members", {
  organization_id: org.id,
  event_id: event.id,
  user_id: owner.id,
  role_label: "Event-Day Lead",
  event_day_role: "Command lead",
  event_day_status: "On Site",
  on_site_at: isoOn(eventDate, "09:30"),
  event_day_notes: testId,
});
await insert(supabase, "event_team_members", {
  organization_id: org.id,
  event_id: event.id,
  user_id: teamOne.id,
  role_label: "Planner",
  event_day_role: "Vendor arrivals",
  event_day_status: "Confirmed",
  event_day_notes: testId,
});
await insert(supabase, "event_team_members", {
  organization_id: org.id,
  event_id: event.id,
  user_id: teamTwo.id,
  role_label: "Assistant",
  event_day_role: "Client runner",
  event_day_status: "Confirmed",
  event_day_notes: testId,
});

const vendorPayloads = [
  {
    name: `${testId} Decor Vendor`,
    service_category: "Decor",
    contact_name: "Decor Lead",
    email: `${testId}-decor@example.test`,
    phone: "555-0611",
  },
  {
    name: `${testId} Catering Vendor`,
    service_category: "Catering",
    contact_name: "Catering Lead",
    email: `${testId}-catering@example.test`,
    phone: "555-0612",
  },
  {
    name: `${testId} Florals Vendor`,
    service_category: "Florals",
    contact_name: "Florals Lead",
    email: `${testId}-florals@example.test`,
    phone: "555-0613",
  },
];
const vendors = [];
const eventVendorAssignments = [];
for (const vendorPayload of vendorPayloads) {
  const vendor = await insert(supabase, "vendors", {
    organization_id: org.id,
    ...vendorPayload,
    website: "https://example.test",
    notes: testId,
    rating: 5,
  });
  vendors.push(vendor);
  eventVendorAssignments.push(
    await insert(supabase, "event_vendors", {
      organization_id: org.id,
      event_id: event.id,
      vendor_id: vendor.id,
      service_category: vendor.service_category,
      quoted_amount: 0,
      actual_amount: 0,
      payment_status: "Not Paid",
      notes: testId,
    }),
  );
}

for (let index = 1; index <= 2; index += 1) {
  await insert(supabase, "files", {
    organization_id: org.id,
    project_id: project.id,
    event_id: event.id,
    uploaded_by: owner.id,
    category: "Event Documents",
    bucket: "event-files",
    storage_path: `organizations/${org.id}/projects/${project.id}/event-day/${testId}-file-${index}.pdf`,
    name: `${testId} Event-Day File ${index}.pdf`,
    original_filename: `${testId}-file-${index}.pdf`,
    caption: `Phase 6 event-day file ${index}`,
    mime_type: "application/pdf",
    size_bytes: 1024 * index,
    visibility: "Internal",
  });
}

const timelineRows = [
  {
    title: "Planner arrival",
    start: "09:30",
    end: "09:45",
    owner: owner.id,
    status: "Ready",
    criticality: "Important",
  },
  {
    title: "Vendor load-in begins",
    start: "10:00",
    end: "10:30",
    owner: teamOne.id,
    status: "Upcoming",
    criticality: "Critical",
    vendor: eventVendorAssignments[0].id,
    dependsOn: 0,
  },
  {
    title: "Decor installation",
    start: "10:30",
    end: "12:00",
    owner: teamOne.id,
    status: "Upcoming",
    criticality: "Critical",
    vendor: eventVendorAssignments[0].id,
    dependsOn: 1,
  },
  {
    title: "Catering load-in",
    start: "11:30",
    end: "12:00",
    owner: teamOne.id,
    status: "Upcoming",
    criticality: "Important",
    vendor: eventVendorAssignments[1].id,
  },
  {
    title: "Floral placement",
    start: "12:00",
    end: "13:00",
    owner: teamTwo.id,
    status: "Upcoming",
    criticality: "Important",
    vendor: eventVendorAssignments[2].id,
    dependsOn: 2,
  },
  {
    title: "Client walkthrough",
    start: "13:30",
    end: "14:00",
    owner: owner.id,
    status: "Upcoming",
    criticality: "Critical",
    dependsOn: 4,
  },
  {
    title: "Guest arrival",
    start: "15:00",
    end: "15:30",
    owner: teamTwo.id,
    status: "Upcoming",
    criticality: "Critical",
  },
  {
    title: "Program starts",
    start: "16:00",
    end: "16:30",
    owner: owner.id,
    status: "Upcoming",
    criticality: "Critical",
  },
  {
    title: "Dessert service",
    start: "17:00",
    end: "17:30",
    owner: teamOne.id,
    status: "Upcoming",
    criticality: "Normal",
  },
  {
    title: "Strike and load-out",
    start: "18:00",
    end: "19:00",
    owner: teamTwo.id,
    status: "Upcoming",
    criticality: "Important",
  },
];
const timelineItems = [];
for (let index = 0; index < timelineRows.length; index += 1) {
  const row = timelineRows[index];
  const dependsOnItemId =
    typeof row.dependsOn === "number" ? timelineItems[row.dependsOn]?.id : null;
  timelineItems.push(
    await insert(supabase, "event_timeline_items", {
      organization_id: org.id,
      event_id: event.id,
      title: `${testId} ${row.title}`,
      description: testId,
      start_time: row.start,
      end_time: row.end,
      owner_id: row.owner,
      depends_on_item_id: dependsOnItemId,
      status: row.status,
      location: "Main hall",
      visibility: "Internal",
      sort_order: index + 1,
      planned_start_at: isoOn(eventDate, row.start),
      planned_end_at: isoOn(eventDate, row.end),
      criticality: row.criticality,
      vendor_assignment_id: row.vendor,
      team_assignment_id: row.owner === owner.id ? eventLead.id : null,
      version_number: 1,
      event_day_notes: testId,
    }),
  );
}

const version = await insert(supabase, "timeline_versions", {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  version_number: 1,
  status: "Finalized",
  finalized_by: owner.id,
  finalized_at: new Date().toISOString(),
  change_reason: "Phase 6 e2e activation",
  snapshot: timelineItems.map((item) => ({
    id: item.id,
    title: item.title,
    startTime: item.start_time,
    status: item.status,
  })),
  metadata: { test_identifier: testId },
});

const session = await upsertSingle(
  supabase,
  "event_day_sessions",
  {
    organization_id: org.id,
    project_id: project.id,
    event_id: event.id,
    status: "Active",
    event_day_lead_id: owner.id,
    active_timeline_version_id: version.id,
    activated_by: owner.id,
    activated_at: new Date().toISOString(),
    unresolved_warnings: [],
    readiness_overrides: [],
    offline_manifest: { selectedFiles: 2, generatedBy: testId },
    metadata: { test_identifier: testId },
  },
  "organization_id,event_id",
);

const firstStartedAt = new Date().toISOString();
await supabase
  .from("event_timeline_items")
  .update({
    status: "Completed",
    actual_start_at: firstStartedAt,
    actual_end_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    completed_by: owner.id,
    pinned_current_at: firstStartedAt,
    pinned_current_by: owner.id,
    updated_by: owner.id,
  })
  .eq("id", timelineItems[0].id)
  .throwOnError();

await supabase
  .from("event_timeline_items")
  .update({
    status: "Delayed",
    delay_minutes: 15,
    status_reason: "Phase 6 e2e delay",
    updated_by: owner.id,
  })
  .eq("id", timelineItems[1].id)
  .throwOnError();

await supabase
  .from("event_timeline_items")
  .update({
    owner_id: teamTwo.id,
    updated_by: owner.id,
    event_day_notes: `${testId} reassigned`,
  })
  .eq("id", timelineItems[7].id)
  .throwOnError();

await upsertSingle(
  supabase,
  "event_day_vendor_statuses",
  {
    organization_id: org.id,
    project_id: project.id,
    event_id: event.id,
    event_vendor_id: eventVendorAssignments[0].id,
    vendor_id: vendors[0].id,
    status: "Arrived",
    arrival_time: isoOn(eventDate, "09:55"),
    assigned_location: "Loading dock A",
    deliverables: "Decor install",
    checked_in_by: owner.id,
    checked_in_at: new Date().toISOString(),
    notes: testId,
    metadata: { test_identifier: testId },
  },
  "organization_id,event_vendor_id",
);
await upsertSingle(
  supabase,
  "event_day_vendor_statuses",
  {
    organization_id: org.id,
    project_id: project.id,
    event_id: event.id,
    event_vendor_id: eventVendorAssignments[1].id,
    vendor_id: vendors[1].id,
    status: "Delayed",
    delay_minutes: 20,
    issue_summary: "Phase 6 e2e vendor delay",
    assigned_location: "Kitchen entrance",
    deliverables: "Catering setup",
    notes: testId,
    metadata: { test_identifier: testId },
  },
  "organization_id,event_vendor_id",
);

const issuePayload = {
  organization_id: org.id,
  project_id: project.id,
  event_id: event.id,
  timeline_item_id: timelineItems[1].id,
  vendor_id: vendors[1].id,
  reported_by: owner.id,
  assigned_to: teamOne.id,
  type: "Vendor",
  severity: "Urgent",
  title: `${testId} Catering arrival delay`,
  description: testId,
  status: "Open",
  opened_at: new Date().toISOString(),
  metadata: { test_identifier: testId },
  idempotency_key: `${testId}-issue-1`,
};
const issue = await createIssueOnce(supabase, issuePayload);
await createIssueOnce(supabase, issuePayload);
await supabase
  .from("event_day_issues")
  .update({
    status: "Resolved",
    resolution: "Vendor confirmed ETA and backup setup owner.",
    resolved_at: new Date().toISOString(),
  })
  .eq("id", issue.id)
  .throwOnError();

const thread = await insert(supabase, "communication_threads", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  event_id: event.id,
  assigned_to_id: owner.id,
  subject: `${testId} Event-day notes`,
  client_name_snapshot: clientRecord.display_name,
  participants: [owner.email],
  channel: "Meeting",
  status: "Closed",
  integration_source: "phase6-e2e",
  preview: testId,
  unread_count: 0,
  last_activity_at: new Date().toISOString(),
});
await insert(supabase, "communication_messages", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  thread_id: thread.id,
  event_id: event.id,
  author_id: owner.id,
  direction: "Internal",
  body: `${testId} internal note and photo placeholder`,
  summary: "Phase 6 event-day note",
  visibility: "Internal",
  sent_at: new Date().toISOString(),
});

await supabase
  .from("event_day_sessions")
  .update({
    status: "Completed",
    completed_by: owner.id,
    completed_at: new Date().toISOString(),
    metadata: { test_identifier: testId, completed: true },
  })
  .eq("id", session.id)
  .throwOnError();

assert(
  (await count(supabase, "event_timeline_items", "event_id", event.id)) === 10,
  "Expected ten run-of-show items.",
);
assert(
  (await count(supabase, "event_vendors", "event_id", event.id)) === 3,
  "Expected three vendors assigned.",
);
assert(
  (await count(supabase, "files", "project_id", project.id)) === 2,
  "Expected two event-day files.",
);
assert(
  (await count(supabase, "event_day_sessions", "event_id", event.id)) === 1,
  "Expected one event-day session.",
);
assert(
  (await count(supabase, "event_day_issues", "event_id", event.id)) === 1,
  "Issue idempotency failed.",
);

const { data: delayedItem, error: delayedError } = await supabase
  .from("event_timeline_items")
  .select("*")
  .eq("id", timelineItems[1].id)
  .single();
if (delayedError) throw delayedError;
assert(
  delayedItem.status === "Delayed" && delayedItem.delay_minutes === 15,
  "Expected delayed timeline item.",
);

const { data: completedSession, error: sessionError } = await supabase
  .from("event_day_sessions")
  .select("*")
  .eq("id", session.id)
  .single();
if (sessionError) throw sessionError;
assert(completedSession.status === "Completed", "Expected Event-Day Mode completion.");

const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (anonKey) {
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anonymousRows, error: anonymousError } = await anonClient
    .from("event_day_sessions")
    .select("id")
    .eq("event_id", event.id)
    .limit(1);
  assert(
    anonymousError || (anonymousRows?.length ?? 0) === 0,
    "Anonymous access should not read event-day sessions.",
  );
}

console.log("Phase 6 e2e passed.");
console.log(`Command route: /ease-events/events/${event.id}/event-day`);
console.log(`Cleanup command: EASE_EVENTS_PHASE6_TEST_ID=${testId} npm run events:phase6:cleanup`);
console.log("No real email, calendar invitation, or payment was triggered.");
