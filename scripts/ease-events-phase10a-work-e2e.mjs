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

async function count(client, table, filters) {
  let query = client.from(table).select("id", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { count: found, error } = await query;
  if (error) throw error;
  return found ?? 0;
}

function today(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

loadDotEnv();

if (process.env.EASE_EVENTS_EMAIL_MODE === "live") {
  throw new Error("Refusing to run Phase 10A work e2e while EASE_EVENTS_EMAIL_MODE=live.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const testId = process.env.EASE_EVENTS_PHASE10A_TEST_ID || `easeevents-phase10a-work-${Date.now()}`;
assert(
  testId.startsWith("easeevents-phase10a-work-"),
  "Phase 10A test id must start with easeevents-phase10a-work-.",
);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Phase 10A work e2e test id: ${testId}`);

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

const { data: owners, error: ownerError } = await supabase
  .from("users")
  .select("*")
  .eq("organization_id", org.id)
  .in("role", ["admin", "planner"])
  .limit(2);
if (ownerError) throw ownerError;
assert((owners ?? []).length >= 1, "At least one admin/planner user is required.");
const owner = owners[0];
const collaborator = owners[1] ?? owners[0];

const { data: columns, error: columnError } = await supabase
  .from("task_workflow_columns")
  .select("*")
  .eq("organization_id", org.id)
  .is("project_id", null)
  .order("sort_order");
if (columnError) throw columnError;
assert((columns ?? []).length >= 4, "Phase 10A workflow columns are missing.");
const todoColumn = columns.find((column) => column.name === "To Do") ?? columns[0];
const progressColumn = columns.find((column) => column.name === "In Progress") ?? columns[1];
const blockedColumn = columns.find((column) => column.name === "Blocked") ?? columns[2];
const doneColumn = columns.find((column) => column.name === "Done") ?? columns[columns.length - 1];

const labelA = await insert(supabase, "task_labels", {
  organization_id: org.id,
  name: `${testId} Client`,
  color: "#2563eb",
  description: testId,
  sort_order: 900,
  created_by: owner.id,
});
const labelB = await insert(supabase, "task_labels", {
  organization_id: org.id,
  name: `${testId} Event Day`,
  color: "#dc2626",
  description: testId,
  sort_order: 910,
  created_by: owner.id,
});

const client = await insert(supabase, "clients", {
  organization_id: org.id,
  display_name: `${testId} Client`,
  email: `${testId}-client@example.test`,
  phone: "555-1010",
  status: "Active",
  source: "Phase 10A e2e",
  notes: testId,
});

const lead = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: owner.id,
  client_id: client.id,
  stage: "Booked",
  client_name_snapshot: client.display_name,
  email: client.email,
  phone: client.phone,
  event_type: "Work management",
  event_date: today(45),
  estimated_guest_count: 120,
  budget_range: "$18,000",
  notes: testId,
  source: "Phase 10A e2e",
});

const projectOne = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: lead.id,
  client_id: client.id,
  owner_id: owner.id,
  name: `${testId} Project Alpha`,
  stage: "Planning",
});
await supabase.from("leads").update({ project_id: projectOne.id }).eq("id", lead.id);

const eventOne = await insert(supabase, "events", {
  organization_id: org.id,
  project_id: projectOne.id,
  lead_id: lead.id,
  client_id: client.id,
  planner_id: owner.id,
  client_name_snapshot: client.display_name,
  client_email: client.email,
  client_phone: client.phone,
  event_name: `${testId} Event Alpha`,
  event_type: "Birthday",
  event_date: today(45),
  start_time: "15:00",
  end_time: "22:00",
  location: "Phase 10A Studio",
  guest_count: 120,
  status: "Planning",
  client_price: 18000,
  internal_notes: testId,
  timeline_notes: testId,
});
await supabase.from("projects").update({ event_id: eventOne.id }).eq("id", projectOne.id);

const leadTwo = await insert(supabase, "leads", {
  organization_id: org.id,
  owner_id: collaborator.id,
  client_id: client.id,
  stage: "Booked",
  client_name_snapshot: client.display_name,
  email: client.email,
  phone: client.phone,
  event_type: "Work management follow-up",
  event_date: today(75),
  estimated_guest_count: 90,
  budget_range: "$14,000",
  notes: testId,
  source: "Phase 10A e2e",
});

const projectTwo = await insert(supabase, "projects", {
  organization_id: org.id,
  lead_id: leadTwo.id,
  client_id: client.id,
  owner_id: collaborator.id,
  name: `${testId} Project Beta`,
  stage: "Planning",
});
await supabase.from("leads").update({ project_id: projectTwo.id }).eq("id", leadTwo.id);
const eventTwo = await insert(supabase, "events", {
  organization_id: org.id,
  project_id: projectTwo.id,
  lead_id: leadTwo.id,
  client_id: client.id,
  planner_id: collaborator.id,
  client_name_snapshot: client.display_name,
  client_email: client.email,
  client_phone: client.phone,
  event_name: `${testId} Event Beta`,
  event_type: "Corporate",
  event_date: today(75),
  start_time: "09:00",
  end_time: "14:00",
  location: "Phase 10A Hall",
  guest_count: 90,
  status: "Planning",
  client_price: 14000,
  internal_notes: testId,
  timeline_notes: testId,
});
await supabase.from("projects").update({ event_id: eventTwo.id }).eq("id", projectTwo.id);

const projectColumn = await insert(supabase, "task_workflow_columns", {
  organization_id: org.id,
  project_id: projectOne.id,
  name: `${testId} Waiting on Vendor`,
  normalized_status: "Waiting",
  mapped_task_status: "In Progress",
  sort_order: 45,
  is_default: false,
  metadata: { test_identifier: testId },
});

const tasks = [];
for (let index = 0; index < 30; index += 1) {
  const isInternal = index % 10 === 0;
  const project = index % 2 === 0 ? projectOne : projectTwo;
  const event = index % 2 === 0 ? eventOne : eventTwo;
  const column = index % 5 === 0 ? blockedColumn : index % 3 === 0 ? progressColumn : todoColumn;
  tasks.push(
    await insert(supabase, "tasks", {
      organization_id: org.id,
      project_id: isInternal ? null : project.id,
      event_id: isInternal ? null : event.id,
      owner_id: index % 2 === 0 ? owner.id : collaborator.id,
      title: `${testId} Task ${index + 1}`,
      description: `${testId} canonical task ${index + 1}`,
      due_date: today(index - 3),
      status: column.mapped_task_status,
      priority: index % 7 === 0 ? "Urgent" : index % 4 === 0 ? "High" : "Medium",
      workflow_column_id: column.id,
      normalized_status: column.normalized_status,
      position: (index + 1) * 1000,
      due_at: `${today(index - 3)}T17:00:00Z`,
      work_type: isInternal ? "internal" : "project",
      visibility: index % 8 === 0 ? "Client" : index % 9 === 0 ? "Vendor" : "Internal",
      estimated_effort_minutes: 30 + index * 5,
      metadata: { test_identifier: testId },
      created_by: owner.id,
    }),
  );
}

const primaryTask = tasks[0];
await insert(supabase, "task_label_assignments", {
  organization_id: org.id,
  task_id: primaryTask.id,
  label_id: labelA.id,
  created_by: owner.id,
});
await insert(supabase, "task_label_assignments", {
  organization_id: org.id,
  task_id: primaryTask.id,
  label_id: labelB.id,
  created_by: owner.id,
});
await insert(supabase, "task_participants", {
  organization_id: org.id,
  task_id: primaryTask.id,
  user_id: collaborator.id,
  participant_role: "Assignee",
  added_by: owner.id,
});
await insert(supabase, "task_participants", {
  organization_id: org.id,
  task_id: primaryTask.id,
  user_id: owner.id,
  participant_role: "Watcher",
  added_by: owner.id,
});
await insert(supabase, "task_links", {
  organization_id: org.id,
  task_id: primaryTask.id,
  label: "Production board reference",
  url: "https://example.test/phase10a-work",
  created_by: owner.id,
});

const imageFile = await insert(supabase, "files", {
  organization_id: org.id,
  project_id: projectOne.id,
  event_id: eventOne.id,
  uploaded_by: owner.id,
  category: "Inspiration Images",
  bucket: "event-files",
  storage_path: `organizations/${org.id}/projects/${projectOne.id}/phase10a/${testId}.webp`,
  name: `${testId}.webp`,
  mime_type: "image/webp",
  size_bytes: 2048,
  visibility: "Internal",
  original_filename: `${testId}.webp`,
  caption: testId,
});
const pdfFile = await insert(supabase, "files", {
  organization_id: org.id,
  project_id: projectOne.id,
  event_id: eventOne.id,
  uploaded_by: owner.id,
  category: "Event Documents",
  bucket: "event-files",
  storage_path: `organizations/${org.id}/projects/${projectOne.id}/phase10a/${testId}.pdf`,
  name: `${testId}.pdf`,
  mime_type: "application/pdf",
  size_bytes: 4096,
  visibility: "Internal",
  original_filename: `${testId}.pdf`,
  caption: testId,
});
await insert(supabase, "task_attachments", {
  organization_id: org.id,
  task_id: primaryTask.id,
  file_id: imageFile.id,
  label: "Card cover candidate",
  created_by: owner.id,
});
await insert(supabase, "task_attachments", {
  organization_id: org.id,
  task_id: primaryTask.id,
  file_id: pdfFile.id,
  label: "Reference PDF",
  created_by: owner.id,
});
await supabase.from("tasks").update({ card_cover_file_id: imageFile.id }).eq("id", primaryTask.id);

const checklistA = await insert(supabase, "task_checklists", {
  organization_id: org.id,
  task_id: primaryTask.id,
  title: "Client Requirements",
  sort_order: 10,
  created_by: owner.id,
  metadata: { test_identifier: testId },
});
const checklistB = await insert(supabase, "task_checklists", {
  organization_id: org.id,
  task_id: primaryTask.id,
  title: "Vendor Confirmations",
  sort_order: 20,
  created_by: owner.id,
  metadata: { test_identifier: testId },
});
const checklistItem = await insert(supabase, "task_checklist_items", {
  organization_id: org.id,
  task_id: primaryTask.id,
  checklist_id: checklistA.id,
  title: `${testId} checklist item assigned`,
  assignee_id: collaborator.id,
  due_at: `${today(2)}T17:00:00Z`,
  sort_order: 10,
});
await insert(supabase, "task_checklist_items", {
  organization_id: org.id,
  task_id: primaryTask.id,
  checklist_id: checklistB.id,
  title: `${testId} vendor confirmation`,
  assignee_id: owner.id,
  due_at: `${today(4)}T17:00:00Z`,
  sort_order: 10,
});
const convertedTask = await insert(supabase, "tasks", {
  organization_id: org.id,
  project_id: projectOne.id,
  event_id: eventOne.id,
  owner_id: collaborator.id,
  title: `${testId} Converted checklist item`,
  description: testId,
  due_date: today(2),
  status: "To Do",
  priority: "Medium",
  workflow_column_id: todoColumn.id,
  normalized_status: "Not Started",
  position: 99000,
  work_type: "project",
  visibility: "Internal",
  metadata: { test_identifier: testId, converted_from_checklist_item_id: checklistItem.id },
  created_by: owner.id,
});
await supabase
  .from("task_checklist_items")
  .update({ converted_task_id: convertedTask.id })
  .eq("id", checklistItem.id);

await insert(supabase, "comments", {
  organization_id: org.id,
  task_id: primaryTask.id,
  author_id: owner.id,
  body: `${testId} comment mentioning @${collaborator.full_name?.split(" ")[0] ?? "planner"}`,
  visibility: "Internal",
  mentions: [collaborator.id],
  metadata: { test_identifier: testId },
});

const inboxItem = await insert(supabase, "task_inbox_items", {
  organization_id: org.id,
  project_id: projectOne.id,
  event_id: eventOne.id,
  source_type: "Fathom Action Item",
  source_table: "meeting_notes",
  captured_by: owner.id,
  raw_content: `${testId} captured source content`,
  summary: `${testId} captured inbox item`,
  suggested_project_id: projectOne.id,
  suggested_title: `${testId} Inbox converted task`,
  suggested_owner_id: owner.id,
  suggested_due_at: `${today(5)}T17:00:00Z`,
  suggested_status: "To Do",
  idempotency_key: `${testId}:inbox`,
  metadata: { test_identifier: testId },
});
const inboxTask = await insert(supabase, "tasks", {
  organization_id: org.id,
  project_id: projectOne.id,
  event_id: eventOne.id,
  owner_id: owner.id,
  title: inboxItem.suggested_title,
  description: inboxItem.raw_content,
  due_date: today(5),
  status: "To Do",
  priority: "Medium",
  workflow_column_id: todoColumn.id,
  normalized_status: "Not Started",
  position: 100000,
  source_type: inboxItem.source_type,
  source_record_id: inboxItem.id,
  work_type: "project",
  metadata: { test_identifier: testId },
  created_by: owner.id,
});
await supabase
  .from("task_inbox_items")
  .update({ status: "Converted", converted_task_id: inboxTask.id })
  .eq("id", inboxItem.id);

await supabase
  .from("tasks")
  .update({
    workflow_column_id: projectColumn.id,
    normalized_status: "Waiting",
    status: "In Progress",
    position: 123.45,
  })
  .eq("id", primaryTask.id);
await supabase
  .from("tasks")
  .update({ priority: "High" })
  .in(
    "id",
    tasks.slice(1, 6).map((task) => task.id),
  );
await supabase
  .from("tasks")
  .update({ archived_at: new Date().toISOString(), archived_by: owner.id })
  .eq("id", tasks[2].id);
await supabase.from("tasks").update({ archived_at: null, archived_by: null }).eq("id", tasks[2].id);

const { data: taskRows, error: taskRowsError } = await supabase
  .from("tasks")
  .select("id,workflow_column_id,status,normalized_status,archived_at")
  .eq("organization_id", org.id)
  .ilike("title", `${testId}%`);
if (taskRowsError) throw taskRowsError;
assert((taskRows ?? []).length >= 32, "Expected canonical tasks were not created.");
assert(
  (taskRows ?? []).filter((task) => task.workflow_column_id === projectColumn.id).length === 1,
  "Board move did not update the canonical task record.",
);
assert(
  (taskRows ?? []).every((task) => task.archived_at === null),
  "Archive/restore left a generated task archived.",
);

const checklistCount = await count(supabase, "task_checklists", { task_id: primaryTask.id });
assert(checklistCount === 2, "Multiple checklists were not created.");
const attachmentCount = await count(supabase, "task_attachments", { task_id: primaryTask.id });
assert(attachmentCount === 2, "Task attachments were not linked.");
const participantCount = await count(supabase, "task_participants", { task_id: primaryTask.id });
assert(participantCount === 2, "Assignee/watcher participants were not linked.");
const commentCount = await count(supabase, "comments", { task_id: primaryTask.id });
assert(commentCount === 1, "Task comment was not recorded.");

const { data: convertedInbox, error: convertedInboxError } = await supabase
  .from("task_inbox_items")
  .select("status,converted_task_id")
  .eq("id", inboxItem.id)
  .single();
if (convertedInboxError) throw convertedInboxError;
assert(
  convertedInbox.status === "Converted" && convertedInbox.converted_task_id,
  "Inbox conversion failed.",
);

console.log(
  "Phase 10A work e2e passed. No external email, payment, invitation, or provider call was made.",
);
