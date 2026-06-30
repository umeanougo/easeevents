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

loadDotEnv();

const testId = process.env.EASE_EVENTS_PHASE7_TEST_ID;
if (!testId?.startsWith("easeevents-phase7-")) {
  throw new Error("Set EASE_EVENTS_PHASE7_TEST_ID to the exact easeevents-phase7-* test id.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select("id,lead_id,client_id")
  .eq("name", `${testId} Automation Test`);
if (projectError) throw projectError;
const project = projects?.[0];

const { data: automations, error: automationError } = await supabase
  .from("workflow_automations")
  .select("id")
  .contains("metadata", { test_identifier: testId });
if (automationError) throw automationError;
const automationIds = (automations ?? []).map((item) => item.id);

if (project) {
  await supabase.from("notifications").delete().eq("project_id", project.id);
  const { data: executions, error: executionError } = await supabase
    .from("workflow_executions")
    .select("id")
    .eq("project_id", project.id);
  if (executionError) throw executionError;
  const executionIds = (executions ?? []).map((item) => item.id);
  if (executionIds.length) {
    await supabase.from("workflow_action_runs").delete().in("execution_id", executionIds);
  }
  await supabase.from("workflow_executions").delete().eq("project_id", project.id);
  await supabase.from("workflow_events").delete().eq("project_id", project.id);
  await supabase.from("communication_messages").delete().eq("project_id", project.id);
  await supabase.from("communication_threads").delete().eq("project_id", project.id);
  await supabase.from("project_reminders").delete().eq("project_id", project.id);
  await supabase.from("project_activity_events").delete().eq("project_id", project.id);
  await supabase.from("projects").delete().eq("id", project.id);
  if (project.lead_id) await supabase.from("leads").delete().eq("id", project.lead_id);
  if (project.client_id) await supabase.from("clients").delete().eq("id", project.client_id);
}

if (automationIds.length) {
  await supabase.from("workflow_automation_actions").delete().in("automation_id", automationIds);
  await supabase.from("workflow_automations").delete().in("id", automationIds);
}

await supabase.from("clients").delete().eq("notes", testId);
await supabase.from("leads").delete().eq("notes", testId);

console.log(`Cleaned Phase 7 test records for ${testId}.`);
