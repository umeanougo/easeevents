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

const testId = process.env.EASE_EVENTS_PHASE10A_TEST_ID;
if (!testId?.startsWith("easeevents-phase10a-work-")) {
  throw new Error(
    "Set EASE_EVENTS_PHASE10A_TEST_ID to the exact easeevents-phase10a-work-* test id.",
  );
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required.");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: tasks, error: taskError } = await supabase
  .from("tasks")
  .select("id,project_id,event_id")
  .ilike("title", `${testId}%`);
if (taskError) throw taskError;
const taskIds = (tasks ?? []).map((task) => task.id);

const { data: projects, error: projectError } = await supabase
  .from("projects")
  .select("id,lead_id,event_id,client_id")
  .ilike("name", `${testId}%`);
if (projectError) throw projectError;
const projectIds = (projects ?? []).map((project) => project.id);
const leadIds = (projects ?? []).map((project) => project.lead_id).filter(Boolean);
const eventIds = (projects ?? []).map((project) => project.event_id).filter(Boolean);

const { data: clients, error: clientError } = await supabase
  .from("clients")
  .select("id")
  .eq("notes", testId);
if (clientError) throw clientError;
const clientIds = (clients ?? []).map((client) => client.id);

const { data: labels, error: labelError } = await supabase
  .from("task_labels")
  .select("id")
  .ilike("name", `${testId}%`);
if (labelError) throw labelError;
const labelIds = (labels ?? []).map((label) => label.id);

if (taskIds.length) {
  await supabase.from("task_inbox_items").delete().in("converted_task_id", taskIds);
  await supabase.from("comments").delete().in("task_id", taskIds);
  await supabase.from("task_attachments").delete().in("task_id", taskIds);
  await supabase.from("task_links").delete().in("task_id", taskIds);
  await supabase.from("task_checklist_items").delete().in("task_id", taskIds);
  await supabase.from("task_checklists").delete().in("task_id", taskIds);
  await supabase.from("task_participants").delete().in("task_id", taskIds);
  await supabase.from("task_label_assignments").delete().in("task_id", taskIds);
  await supabase.from("tasks").delete().in("id", taskIds);
}

if (projectIds.length) {
  await supabase.from("task_inbox_items").delete().in("project_id", projectIds);
  await supabase.from("files").delete().in("project_id", projectIds);
  await supabase.from("task_workflow_columns").delete().in("project_id", projectIds);
}

if (labelIds.length) {
  await supabase.from("task_label_assignments").delete().in("label_id", labelIds);
  await supabase.from("task_labels").delete().in("id", labelIds);
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

console.log(`Cleaned Phase 10A work test records for ${testId}.`);
