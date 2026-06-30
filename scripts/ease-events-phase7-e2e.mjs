import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { processWorkflowQueue } from "./ease-events-workflows-process.mjs";

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

if (process.env.EASE_EVENTS_EMAIL_MODE === "live") {
  throw new Error("Refusing to run Phase 7 e2e while EASE_EVENTS_EMAIL_MODE=live.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE7_TEST_ID || `easeevents-phase7-${Date.now()}`;
assert(
  testId.startsWith("easeevents-phase7-"),
  "Phase 7 test id must start with easeevents-phase7-.",
);
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 7 e2e test id: ${testId}`);

const configuredOrganizationId =
  process.env.EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
  process.env.VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
  "00000000-0000-4000-8000-000000000001";

const { data: configuredOrg, error: organizationError } = await supabase
  .from("organizations")
  .select("*")
  .eq("id", configuredOrganizationId)
  .maybeSingle();
if (organizationError) throw organizationError;
const org =
  configuredOrg ??
  (await supabase.from("organizations").select("*").limit(1).single().throwOnError()).data;
assert(org?.id, "No organization found.");

const { data: staffRows, error: staffError } = await supabase
  .from("users")
  .select("*")
  .eq("organization_id", org.id)
  .in("role", ["admin", "planner"])
  .limit(1);
if (staffError) throw staffError;
const owner = staffRows?.[0];
assert(owner?.id, "At least one admin/planner user is required for Phase 7 e2e.");

const client = await insert(supabase, "clients", {
  organization_id: org.id,
  display_name: `${testId} Client`,
  email: `${testId}@example.test`,
  phone: "555-0700",
  status: "Prospect",
  source: "Phase 7 e2e",
  notes: testId,
});

const lead = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: owner.id,
  client_id: client.id,
  stage: "New Inquiry",
  client_name_snapshot: client.display_name,
  email: client.email,
  phone: client.phone,
  event_type: "Lifecycle automation test",
  event_date: "2026-10-02",
  estimated_guest_count: 100,
  budget_range: "$10,000",
  notes: testId,
  source: "Phase 7 e2e",
});

const project = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: client.id,
  owner_id: owner.id,
  name: `${testId} Automation Test`,
  stage: "Inquiry",
});
await supabase.from("leads").update({ project_id: project.id }).eq("id", lead.id);

const automation = await insert(supabase, "workflow_automations", {
  organization_id: org.id,
  name: `${testId} Inquiry automation`,
  description: "Controlled Phase 7 e2e automation.",
  trigger_type: "inquiry_created",
  status: "Active",
  conditions: [],
  approval_policy: "automatic",
  priority: 1,
  metadata: { test_identifier: testId },
});

const actions = [
  {
    action_type: "send_in_app_notification",
    name: `${testId} Notify owner`,
    config: {
      recipient: "project_owner",
      severity: "Warning",
      title: `${testId} Inquiry needs action`,
      body: "Automation notification created by the controlled Phase 7 test.",
    },
    sort_order: 10,
  },
  {
    action_type: "create_reminder",
    name: `${testId} Follow-up reminder`,
    config: { title: `${testId} Follow up on inquiry`, delay_hours: 1 },
    sort_order: 20,
  },
  {
    action_type: "create_project_note",
    name: `${testId} Internal note`,
    config: {
      title: `${testId} Automation note`,
      body: "Workflow processing wrote this project activity record.",
    },
    sort_order: 30,
  },
  {
    action_type: "create_email_draft",
    name: `${testId} Email draft`,
    config: {
      subject: `${testId} Follow-up draft`,
      summary: `${testId} Suppressed automation email draft`,
      body: "This draft is recorded in disabled/test mode and is not delivered.",
    },
    sort_order: 40,
  },
];

for (const action of actions) {
  await insert(supabase, "workflow_automation_actions", {
    organization_id: org.id,
    automation_id: automation.id,
    ...action,
    requires_approval: false,
    is_active: true,
  });
}

const eventDedupeKey = `${testId}:inquiry_created:${lead.id}`;
await insert(supabase, "workflow_events", {
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  source_table: "leads",
  source_record_id: lead.id,
  event_type: "inquiry_created",
  status: "Pending",
  payload: { test_identifier: testId, lead_id: lead.id },
  dedupe_key: eventDedupeKey,
});

const duplicateInsert = await supabase.from("workflow_events").insert({
  organization_id: org.id,
  project_id: project.id,
  lead_id: lead.id,
  source_table: "leads",
  source_record_id: lead.id,
  event_type: "inquiry_created",
  status: "Pending",
  payload: { test_identifier: testId, duplicate: true },
  dedupe_key: eventDedupeKey,
});
assert(duplicateInsert.error, "Duplicate workflow event insert should be rejected.");

const firstRun = await processWorkflowQueue(supabase, { limit: 25 });
const secondRun = await processWorkflowQueue(supabase, { limit: 25 });
console.log("Workflow processor results:", { firstRun, secondRun });

const executionCount = await count(
  supabase,
  "workflow_executions",
  "idempotency_key",
  `${eventDedupeKey}:${automation.id}`,
);
assert(executionCount === 1, "Exactly one workflow execution should be created.");

const { data: execution, error: executionError } = await supabase
  .from("workflow_executions")
  .select("*")
  .eq("idempotency_key", `${eventDedupeKey}:${automation.id}`)
  .single();
if (executionError) throw executionError;
assert(execution.status === "Completed", "Workflow execution should complete.");

const { count: actionRunCount, error: actionRunError } = await supabase
  .from("workflow_action_runs")
  .select("id", { count: "exact", head: true })
  .eq("execution_id", execution.id);
if (actionRunError) throw actionRunError;
assert(actionRunCount === 4, "Each configured automation action should have one action run.");

const { count: notificationCount, error: notificationError } = await supabase
  .from("notifications")
  .select("id", { count: "exact", head: true })
  .eq("project_id", project.id)
  .eq("title", `${testId} Inquiry needs action`);
if (notificationError) throw notificationError;
assert(notificationCount === 1, "Exactly one notification should be created.");

const { count: reminderCount, error: reminderError } = await supabase
  .from("project_reminders")
  .select("id", { count: "exact", head: true })
  .eq("project_id", project.id)
  .eq("title", `${testId} Follow up on inquiry`);
if (reminderError) throw reminderError;
assert(reminderCount === 1, "Exactly one reminder should be created.");

const { count: activityCount, error: activityError } = await supabase
  .from("project_activity_events")
  .select("id", { count: "exact", head: true })
  .eq("project_id", project.id)
  .eq("title", `${testId} Automation note`);
if (activityError) throw activityError;
assert(activityCount === 1, "Exactly one project activity note should be created.");

const { data: messages, error: messageError } = await supabase
  .from("communication_messages")
  .select("id,delivery_status,delivery_mode,metadata")
  .eq("project_id", project.id)
  .contains("metadata", { automation_draft: true });
if (messageError) throw messageError;
assert(messages?.length === 1, "Exactly one automation email draft should be recorded.");
assert(messages[0].delivery_status === "Suppressed", "Automation email draft must be suppressed.");
assert(messages[0].delivery_mode !== "live", "Automation email draft must not use live delivery.");

console.log(
  `Phase 7 e2e passed for ${testId}. No real email, payment, or calendar side effect was triggered.`,
);
