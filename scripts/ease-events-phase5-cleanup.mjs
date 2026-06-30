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

const testId = process.env.EASE_EVENTS_PHASE5_TEST_ID;
if (!testId?.startsWith("easeevents-phase5-")) {
  throw new Error("Set EASE_EVENTS_PHASE5_TEST_ID to the exact easeevents-phase5-* test id.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select("id, lead_id, event_id, client_id")
  .eq("name", `${testId} Calendar Test`);
if (projectError) throw projectError;
const project = projects?.[0];

await supabase
  .from("calendar_sync_runs")
  .delete()
  .contains("metadata", { test_identifier: testId });
await supabase
  .from("calendar_sync_states")
  .delete()
  .contains("metadata", { test_identifier: testId });
await supabase
  .from("external_calendar_events")
  .delete()
  .eq("external_event_id", `${testId}-external-hold`);

if (!project) {
  await supabase.from("clients").delete().eq("notes", testId);
  await supabase.from("leads").delete().eq("notes", testId);
  console.log(`No Phase 5 project found for ${testId}.`);
  process.exit(0);
}

await supabase.from("project_reminders").delete().eq("project_id", project.id);
await supabase.from("meetings").delete().eq("project_id", project.id);
await supabase.from("tasks").delete().eq("project_id", project.id);
await supabase.from("invoices").delete().eq("project_id", project.id);
await supabase.from("expenses").delete().eq("project_id", project.id);
await supabase.from("proposals").delete().eq("project_id", project.id);

if (project.event_id) {
  await supabase.from("event_timeline_items").delete().eq("event_id", project.event_id);
  await supabase.from("approvals").delete().eq("event_id", project.event_id);
  await supabase.from("events").delete().eq("id", project.event_id);
}

await supabase.from("project_activity_events").delete().eq("project_id", project.id);
await supabase.from("projects").delete().eq("id", project.id);
if (project.lead_id) await supabase.from("leads").delete().eq("id", project.lead_id);
if (project.client_id) await supabase.from("clients").delete().eq("id", project.client_id);

console.log(`Cleaned Phase 5 test records for ${testId}.`);
