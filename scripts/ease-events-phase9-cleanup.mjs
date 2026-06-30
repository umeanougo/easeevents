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

async function deleteAuthUsersByEmail(supabase, emails) {
  for (const email of emails.filter(Boolean)) {
    const { data: users, error } = await supabase
      .from("users")
      .select("id,email")
      .eq("email", email);
    if (error) throw error;
    for (const user of users ?? []) {
      await supabase.from("users").delete().eq("id", user.id);
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (authDeleteError) {
        console.warn(
          `Could not delete generated auth user ${user.email}: ${authDeleteError.message}`,
        );
      }
    }
  }
}

loadDotEnv();

const testId = process.env.EASE_EVENTS_PHASE9_TEST_ID;
if (!testId?.startsWith("easeevents-phase9-")) {
  throw new Error("Set EASE_EVENTS_PHASE9_TEST_ID to the exact easeevents-phase9-* test id.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: clients, error: clientError } = await supabase
  .from("clients")
  .select("id,email")
  .eq("notes", testId);
if (clientError) throw clientError;
const clientIds = (clients ?? []).map((client) => client.id);

const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select("id,lead_id,event_id,client_id")
  .ilike("name", `${testId}%`);
if (projectError) throw projectError;
const projectIds = (projects ?? []).map((project) => project.id);
const leadIds = (projects ?? []).map((project) => project.lead_id).filter(Boolean);
const eventIds = (projects ?? []).map((project) => project.event_id).filter(Boolean);

const { data: otherOrgs, error: otherOrgError } = await supabase
  .from("organizations")
  .select("id")
  .eq("slug", `${testId}-other-org`);
if (otherOrgError) throw otherOrgError;
const otherOrgIds = (otherOrgs ?? []).map((org) => org.id);

if (clientIds.length) {
  await supabase.from("communication_eligibility_logs").delete().in("client_id", clientIds);
  await supabase.from("referrals").delete().in("referring_client_id", clientIds);
  await supabase.from("client_referral_links").delete().in("client_id", clientIds);
  await supabase.from("rebooking_opportunities").delete().in("client_id", clientIds);
  await supabase.from("client_milestones").delete().in("client_id", clientIds);
  await supabase.from("client_consents").delete().in("client_id", clientIds);
}

if (projectIds.length) {
  await supabase.from("communication_messages").delete().in("project_id", projectIds);
  await supabase.from("communication_threads").delete().in("project_id", projectIds);
  await supabase.from("project_activity_events").delete().in("project_id", projectIds);
  await supabase.from("project_reminders").delete().in("project_id", projectIds);
  await supabase.from("tasks").delete().in("project_id", projectIds);
}

if (eventIds.length) {
  await supabase.from("events").delete().in("id", eventIds);
}

if (projectIds.length) {
  await supabase.from("projects").delete().in("id", projectIds);
}

if (leadIds.length) {
  await supabase.from("leads").delete().in("id", leadIds);
}

if (clientIds.length) {
  await supabase.from("clients").delete().in("id", clientIds);
}

await deleteAuthUsersByEmail(supabase, [
  `${testId}-other-admin@example.test`,
  `${testId}-client@example.test`,
]);

if (otherOrgIds.length) {
  await supabase.from("organizations").delete().in("id", otherOrgIds);
}

console.log(`Cleaned Phase 9 test records for ${testId}.`);
