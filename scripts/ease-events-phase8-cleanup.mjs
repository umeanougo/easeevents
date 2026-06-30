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

async function deleteGeneratedClientUser(supabase, testId) {
  const email = `${testId}-client@example.test`;
  const { data: users, error } = await supabase.from("users").select("id,email").eq("email", email);
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

loadDotEnv();

const testId = process.env.EASE_EVENTS_PHASE8_TEST_ID;
if (!testId?.startsWith("easeevents-phase8-")) {
  throw new Error("Set EASE_EVENTS_PHASE8_TEST_ID to the exact easeevents-phase8-* test id.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select("id,lead_id,event_id,client_id")
  .eq("name", `${testId} Closeout Test`);
if (projectError) throw projectError;
const project = projects?.[0];

if (!project) {
  await supabase.from("clients").delete().eq("notes", testId);
  await supabase.from("leads").delete().eq("notes", testId);
  await supabase.from("vendors").delete().eq("notes", testId);
  await deleteGeneratedClientUser(supabase, testId);
  console.log(`No Phase 8 project found for ${testId}.`);
  process.exit(0);
}

const { data: closeouts, error: closeoutError } = await supabase
  .from("post_event_closeouts")
  .select("id")
  .eq("project_id", project.id);
if (closeoutError) throw closeoutError;
const closeoutIds = (closeouts ?? []).map((item) => item.id);

if (closeoutIds.length) {
  await supabase.from("closeout_financial_snapshots").delete().in("closeout_id", closeoutIds);
  await supabase.from("post_event_closeout_items").delete().in("closeout_id", closeoutIds);
}

await supabase.from("communication_messages").delete().eq("project_id", project.id);
await supabase.from("communication_threads").delete().eq("project_id", project.id);
await supabase.from("client_consents").delete().eq("project_id", project.id);
await supabase.from("client_feedback_responses").delete().eq("project_id", project.id);
await supabase.from("vendor_performance_reviews").delete().eq("project_id", project.id);
await supabase.from("internal_retrospectives").delete().eq("project_id", project.id);
await supabase.from("final_deliverables").delete().eq("project_id", project.id);
await supabase.from("post_event_closeouts").delete().eq("project_id", project.id);
await supabase.from("event_day_issues").delete().eq("project_id", project.id);
await supabase.from("event_day_vendor_statuses").delete().eq("project_id", project.id);
await supabase.from("event_day_sessions").delete().eq("project_id", project.id);
await supabase.from("timeline_versions").delete().eq("project_id", project.id);
await supabase.from("project_activity_events").delete().eq("project_id", project.id);
await supabase.from("project_reminders").delete().eq("project_id", project.id);
await supabase.from("tasks").delete().eq("project_id", project.id);
await supabase.from("invoice_payments").delete().eq("project_id", project.id);
await supabase.from("invoices").delete().eq("project_id", project.id);

const { data: expenses, error: expenseError } = await supabase
  .from("expenses")
  .select("id")
  .eq("project_id", project.id);
if (expenseError) throw expenseError;
const expenseIds = (expenses ?? []).map((item) => item.id);
if (expenseIds.length) {
  await supabase.from("expense_files").delete().in("expense_id", expenseIds);
  await supabase.from("expense_payments").delete().in("expense_id", expenseIds);
}
await supabase.from("expenses").delete().eq("project_id", project.id);

await supabase.from("files").delete().eq("project_id", project.id);

if (project.event_id) {
  await supabase.from("budget_items").delete().eq("event_id", project.event_id);
  await supabase.from("event_timeline_items").delete().eq("event_id", project.event_id);
  await supabase.from("event_team_members").delete().eq("event_id", project.event_id);
  await supabase.from("event_vendors").delete().eq("event_id", project.event_id);
  await supabase.from("events").delete().eq("id", project.event_id);
}

await supabase.from("vendors").delete().eq("notes", testId);
await supabase.from("projects").delete().eq("id", project.id);
if (project.lead_id) await supabase.from("leads").delete().eq("id", project.lead_id);
if (project.client_id) await supabase.from("clients").delete().eq("id", project.client_id);
await deleteGeneratedClientUser(supabase, testId);

console.log(`Cleaned Phase 8 test records for ${testId}.`);
