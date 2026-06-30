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

async function deleteGeneratedUsers(supabase, testId) {
  const { data: generatedUsers, error } = await supabase
    .from("users")
    .select("id,email")
    .ilike("email", `${testId}-team-%@example.test`);
  if (error) throw error;
  for (const user of generatedUsers ?? []) {
    await supabase.from("users").delete().eq("id", user.id);
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.warn(
        `Could not delete generated auth user ${user.email}: ${authDeleteError.message}`,
      );
    }
  }
}

loadDotEnv();

const testId = process.env.EASE_EVENTS_PHASE6_TEST_ID;
if (!testId?.startsWith("easeevents-phase6-")) {
  throw new Error("Set EASE_EVENTS_PHASE6_TEST_ID to the exact easeevents-phase6-* test id.");
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
  .eq("name", `${testId} Event-Day Test`);
if (projectError) throw projectError;
const project = projects?.[0];

if (!project) {
  await supabase.from("clients").delete().eq("notes", testId);
  await supabase.from("leads").delete().eq("notes", testId);
  await deleteGeneratedUsers(supabase, testId);
  console.log(`No Phase 6 project found for ${testId}.`);
  process.exit(0);
}

await supabase.from("communication_messages").delete().eq("project_id", project.id);
await supabase.from("communication_threads").delete().eq("project_id", project.id);
await supabase.from("event_day_issues").delete().eq("project_id", project.id);
await supabase.from("event_day_vendor_statuses").delete().eq("project_id", project.id);
await supabase.from("event_day_sessions").delete().eq("project_id", project.id);
await supabase.from("timeline_versions").delete().eq("project_id", project.id);
await supabase.from("files").delete().eq("project_id", project.id);
await supabase.from("project_activity_events").delete().eq("project_id", project.id);

if (project.event_id) {
  await supabase.from("event_timeline_items").delete().eq("event_id", project.event_id);
  await supabase.from("event_team_members").delete().eq("event_id", project.event_id);
  await supabase.from("event_vendors").delete().eq("event_id", project.event_id);
  await supabase.from("events").delete().eq("id", project.event_id);
}

await supabase.from("vendors").delete().eq("notes", testId);
await supabase.from("projects").delete().eq("id", project.id);
if (project.lead_id) await supabase.from("leads").delete().eq("id", project.lead_id);
if (project.client_id) await supabase.from("clients").delete().eq("id", project.client_id);
await deleteGeneratedUsers(supabase, testId);

console.log(`Cleaned Phase 6 test records for ${testId}.`);
