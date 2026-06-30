import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const env = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional in CI if the variables are already exported.
  }
}

function assertTestIdentifier(identifier) {
  if (!identifier || !identifier.startsWith("easeevents-e2e-")) {
    throw new Error("Cleanup requires an identifier that starts with easeevents-e2e-.");
  }
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function selectRows(supabase, table, column, values, columns = "*") {
  if (!values.length) return [];
  const { data, error } = await supabase.from(table).select(columns).in(column, values);
  if (error) throw error;
  return data ?? [];
}

async function deleteRows(supabase, table, column, values) {
  if (!values.length) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error) throw error;
}

export async function cleanupPhase2E2E(identifier) {
  assertTestIdentifier(identifier);
  const supabase = getAdminClient();

  const { data: submissions, error: submissionError } = await supabase
    .from("public_inquiry_submissions")
    .select("*")
    .eq("test_identifier", identifier);
  if (submissionError) throw submissionError;

  const submissionRows = submissions ?? [];
  const submissionIds = submissionRows.map((row) => row.id);
  const projectIds = [...new Set(submissionRows.map((row) => row.project_id).filter(Boolean))];
  const leadIds = [...new Set(submissionRows.map((row) => row.lead_id).filter(Boolean))];
  const clientIds = [...new Set(submissionRows.map((row) => row.client_id).filter(Boolean))];
  const submissionThreadIds = submissionRows.map((row) => row.thread_id).filter(Boolean);
  const projectThreads = await selectRows(
    supabase,
    "communication_threads",
    "project_id",
    projectIds,
    "id",
  );
  const threadIds = [...new Set([...submissionThreadIds, ...projectThreads.map((row) => row.id)])];

  const uploads = await selectRows(
    supabase,
    "public_inquiry_uploads",
    "submission_id",
    submissionIds,
    "id,file_id,storage_path",
  );
  const uploadFileIds = uploads.map((row) => row.file_id).filter(Boolean);
  const storagePaths = uploads.map((row) => row.storage_path).filter(Boolean);

  const projectFiles = await selectRows(
    supabase,
    "files",
    "project_id",
    projectIds,
    "id,storage_path",
  );
  const fileIds = [...new Set([...uploadFileIds, ...projectFiles.map((row) => row.id)])];
  for (const path of projectFiles.map((row) => row.storage_path).filter(Boolean)) {
    if (!storagePaths.includes(path)) storagePaths.push(path);
  }

  const tasks = await selectRows(supabase, "tasks", "project_id", projectIds, "id");
  const taskIds = tasks.map((row) => row.id);
  const events = await selectRows(supabase, "events", "project_id", projectIds, "id");
  const eventIds = events.map((row) => row.id);

  await deleteRows(supabase, "task_attachments", "task_id", taskIds);
  await deleteRows(supabase, "task_links", "task_id", taskIds);
  await deleteRows(supabase, "task_checklist_items", "task_id", taskIds);
  await deleteRows(supabase, "tasks", "id", taskIds);
  await deleteRows(supabase, "project_activity_events", "project_id", projectIds);
  await deleteRows(supabase, "project_reminders", "project_id", projectIds);
  await deleteRows(supabase, "project_inspiration_links", "project_id", projectIds);
  await deleteRows(supabase, "communication_messages", "thread_id", threadIds);
  await deleteRows(supabase, "communication_threads", "id", threadIds);
  await deleteRows(supabase, "meeting_notes", "project_id", projectIds);
  await deleteRows(supabase, "meetings", "project_id", projectIds);
  await deleteRows(supabase, "files", "id", fileIds);
  await deleteRows(supabase, "approvals", "event_id", eventIds);
  await deleteRows(supabase, "invoices", "project_id", projectIds);
  await deleteRows(supabase, "events", "id", eventIds);
  await deleteRows(supabase, "public_inquiry_uploads", "submission_id", submissionIds);
  await deleteRows(supabase, "public_inquiry_submissions", "id", submissionIds);
  await deleteRows(supabase, "projects", "id", projectIds);
  await deleteRows(supabase, "leads", "id", leadIds);

  if (clientIds.length) {
    const { data: safeClients, error: clientError } = await supabase
      .from("clients")
      .select("id,email")
      .in("id", clientIds);
    if (clientError) throw clientError;
    const safeClientIds = (safeClients ?? [])
      .filter((client) => String(client.email ?? "").includes(identifier))
      .map((client) => client.id);
    await deleteRows(supabase, "clients", "id", safeClientIds);
  }

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage.from("event-files").remove(storagePaths);
    if (storageError) {
      console.warn(`Storage cleanup warning: ${storageError.message}`);
    }
  }

  return {
    submissions: submissionIds.length,
    projects: projectIds.length,
    leads: leadIds.length,
    events: eventIds.length,
    files: fileIds.length,
    storageObjects: storagePaths.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  loadEnv();

  const identifier = process.argv[2] || process.env.EASE_EVENTS_E2E_TEST_IDENTIFIER;
  cleanupPhase2E2E(identifier)
    .then((result) => {
      console.log(`Cleaned EaseEvents test data for ${identifier}`);
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
