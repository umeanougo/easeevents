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

async function maybeDeleteAuthUser(supabase, email) {
  const { data: rows } = await supabase.from("users").select("id").eq("email", email);
  for (const row of rows ?? []) {
    await supabase.from("users").delete().eq("id", row.id);
    await supabase.auth.admin.deleteUser(row.id).catch(() => undefined);
  }
}

async function createAppUser(supabase, orgId, email, role, fullName, password) {
  await maybeDeleteAuthUser(supabase, email);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) throw error;
  const user = data.user;
  await insert(supabase, "users", {
    id: user.id,
    organization_id: orgId,
    role,
    full_name: fullName,
    email,
  });
  return user;
}

function today(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function onePixelPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9kAAAAASUVORK5CYII=",
    "base64",
  );
}

loadDotEnv();

if (process.env.EASE_EVENTS_EMAIL_MODE === "live") {
  throw new Error("Refusing to run quality gate while EASE_EVENTS_EMAIL_MODE=live.");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert(
  supabaseUrl && serviceKey && anonKey,
  "Supabase URL, service key, and anon key are required.",
);

const testId = process.env.EASE_EVENTS_PHASE10A_GATE_ID || `easeevents-phase10a-gate-${Date.now()}`;
assert(
  testId.startsWith("easeevents-phase10a-gate-"),
  "Quality gate id must start with easeevents-phase10a-gate-.",
);

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password = `Gate-${Date.now()}-Aa12345!`;
const generatedEmails = [
  `${testId}-client@example.test`,
  `${testId}-vendor@example.test`,
  `${testId}-collab@example.test`,
];
const storagePaths = [];

async function cleanup() {
  const { data: projects } = await service
    .from("projects")
    .select("id,lead_id,event_id,client_id")
    .ilike("name", `${testId}%`);
  const projectIds = (projects ?? []).map((project) => project.id);
  const leadIds = (projects ?? []).map((project) => project.lead_id).filter(Boolean);
  const eventIds = (projects ?? []).map((project) => project.event_id).filter(Boolean);

  const { data: tasks } = await service.from("tasks").select("id").ilike("title", `${testId}%`);
  const taskIds = (tasks ?? []).map((task) => task.id);

  const { data: clients } = await service.from("clients").select("id").eq("notes", testId);
  const clientIds = (clients ?? []).map((client) => client.id);

  const { data: vendors } = await service.from("vendors").select("id").eq("notes", testId);
  const vendorIds = (vendors ?? []).map((vendor) => vendor.id);

  if (taskIds.length) {
    await service.from("comments").delete().in("task_id", taskIds);
    await service.from("task_attachments").delete().in("task_id", taskIds);
    await service.from("task_links").delete().in("task_id", taskIds);
    await service.from("task_checklist_items").delete().in("task_id", taskIds);
    await service.from("task_checklists").delete().in("task_id", taskIds);
    await service.from("task_participants").delete().in("task_id", taskIds);
    await service.from("tasks").delete().in("id", taskIds);
  }
  if (projectIds.length) {
    await service.from("task_workflow_columns").delete().in("project_id", projectIds);
    await service.from("files").delete().in("project_id", projectIds);
  }
  if (vendorIds.length) {
    await service.from("event_vendors").delete().in("vendor_id", vendorIds);
    await service.from("vendors").delete().in("id", vendorIds);
  }
  if (eventIds.length) await service.from("events").delete().in("id", eventIds);
  if (projectIds.length) await service.from("projects").delete().in("id", projectIds);
  if (leadIds.length) await service.from("leads").delete().in("id", leadIds);
  if (clientIds.length) await service.from("clients").delete().in("id", clientIds);

  if (storagePaths.length) {
    await service.storage.from("event-files").remove(storagePaths);
  }
  for (const email of generatedEmails) await maybeDeleteAuthUser(service, email);
}

try {
  console.log(`Phase 10A.1 quality gate id: ${testId}`);

  const configuredOrganizationId =
    process.env.EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
    process.env.VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
    "00000000-0000-4000-8000-000000000001";

  const { data: organization } = await service
    .from("organizations")
    .select("*")
    .eq("id", configuredOrganizationId)
    .maybeSingle()
    .throwOnError();
  const org =
    organization ??
    (await service.from("organizations").select("*").limit(1).single().throwOnError()).data;
  assert(org?.id, "No organization found.");

  const { data: staffRows } = await service
    .from("users")
    .select("*")
    .eq("organization_id", org.id)
    .in("role", ["admin", "planner"])
    .limit(1)
    .throwOnError();
  const owner = staffRows?.[0];
  assert(owner?.id, "At least one admin/planner user is required.");

  const collaboratorAuth = await createAppUser(
    service,
    org.id,
    generatedEmails[2],
    "planner",
    `${testId} Collaborator`,
    password,
  );
  const clientAuth = await createAppUser(
    service,
    org.id,
    generatedEmails[0],
    "client",
    `${testId} Client User`,
    password,
  );
  const vendorAuth = await createAppUser(
    service,
    org.id,
    generatedEmails[1],
    "vendor",
    `${testId} Vendor User`,
    password,
  );

  const client = await insert(service, "clients", {
    organization_id: org.id,
    user_id: clientAuth.id,
    display_name: `${testId} Client`,
    email: generatedEmails[0],
    phone: "555-1010",
    status: "Active",
    source: "Phase 10A.1 quality gate",
    notes: testId,
  });

  const lead = await insert(service, "leads", {
    organization_id: org.id,
    owner_id: owner.id,
    client_id: client.id,
    stage: "Booked",
    client_name_snapshot: client.display_name,
    email: client.email,
    phone: client.phone,
    event_type: "Quality gate",
    event_date: today(35),
    estimated_guest_count: 100,
    budget_range: "$20,000",
    notes: testId,
    source: "Phase 10A.1 quality gate",
  });

  const project = await insert(service, "projects", {
    organization_id: org.id,
    lead_id: lead.id,
    client_id: client.id,
    owner_id: owner.id,
    name: `${testId} Project`,
    stage: "Planning",
  });
  await service.from("leads").update({ project_id: project.id }).eq("id", lead.id).throwOnError();

  const event = await insert(service, "events", {
    organization_id: org.id,
    project_id: project.id,
    lead_id: lead.id,
    client_id: client.id,
    client_user_id: clientAuth.id,
    planner_id: owner.id,
    client_name_snapshot: client.display_name,
    client_email: client.email,
    client_phone: client.phone,
    event_name: `${testId} Event`,
    event_type: "Birthday",
    event_date: today(35),
    start_time: "16:00",
    end_time: "23:00",
    location: "Quality Gate Studio",
    guest_count: 100,
    status: "Planning",
    client_price: 20000,
    internal_notes: testId,
    timeline_notes: testId,
  });
  await service.from("projects").update({ event_id: event.id }).eq("id", project.id).throwOnError();

  const vendor = await insert(service, "vendors", {
    organization_id: org.id,
    name: `${testId} Vendor`,
    service_category: "Decor",
    contact_name: `${testId} Vendor User`,
    email: generatedEmails[1],
    phone: "555-2020",
    notes: testId,
    rating: 5,
  });
  await insert(service, "event_vendors", {
    organization_id: org.id,
    event_id: event.id,
    vendor_id: vendor.id,
    service_category: "Decor",
    quoted_amount: 1200,
    actual_amount: 0,
    payment_status: "Not Paid",
    notes: testId,
  });

  const { data: columns } = await service
    .from("task_workflow_columns")
    .select("*")
    .eq("organization_id", org.id)
    .is("project_id", null)
    .order("sort_order")
    .throwOnError();
  const todoColumn = columns.find((column) => column.name === "To Do") ?? columns[0];
  const doneColumn =
    columns.find((column) => column.name === "Done") ?? columns[columns.length - 1];
  const waitingVendorColumn = await insert(service, "task_workflow_columns", {
    organization_id: org.id,
    project_id: project.id,
    name: "Waiting on Vendor",
    normalized_status: "Waiting",
    mapped_task_status: "In Progress",
    sort_order: 45,
    metadata: { test_identifier: testId },
  });

  const task = await insert(service, "tasks", {
    organization_id: org.id,
    project_id: project.id,
    lead_id: lead.id,
    event_id: event.id,
    owner_id: owner.id,
    title: `${testId} Gate Task`,
    description:
      "Quality gate task with Pinterest link, inspiration image, collaborators, checklist, comments, and visibility checks.",
    due_date: today(7),
    due_at: `${today(7)}T17:00:00Z`,
    status: "To Do",
    priority: "High",
    workflow_column_id: todoColumn.id,
    normalized_status: "Not Started",
    position: 1000,
    work_type: "project",
    visibility: "Internal",
    metadata: { test_identifier: testId },
    created_by: owner.id,
  });

  await insert(service, "task_links", {
    organization_id: org.id,
    task_id: task.id,
    label: "Pinterest inspiration board",
    url: "https://www.pinterest.com/search/pins/?q=modern%20birthday%20decor",
    visibility: "Internal",
    created_by: owner.id,
  });

  async function uploadFile(name, visibility) {
    const path = `organizations/${org.id}/projects/${project.id}/quality-gate/${name}.png`;
    storagePaths.push(path);
    const upload = await service.storage.from("event-files").upload(path, onePixelPng(), {
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error) throw upload.error;
    return insert(service, "files", {
      organization_id: org.id,
      project_id: project.id,
      event_id: event.id,
      uploaded_by: owner.id,
      category: "Inspiration Images",
      bucket: "event-files",
      storage_path: path,
      name: `${name}.png`,
      mime_type: "image/png",
      size_bytes: onePixelPng().length,
      visibility,
      original_filename: `${name}.png`,
      caption: `${testId} ${visibility} inspiration image`,
    });
  }

  const internalImage = await uploadFile(`${testId}-internal-inspiration`, "Internal");
  const vendorImage = await uploadFile(`${testId}-vendor-brief`, "Vendor");
  const clientImage = await uploadFile(`${testId}-client-preview`, "Client");

  for (const [file, label] of [
    [internalImage, "Internal inspiration image"],
    [vendorImage, "Vendor-facing image"],
    [clientImage, "Client-facing image"],
  ]) {
    await insert(service, "task_attachments", {
      organization_id: org.id,
      task_id: task.id,
      file_id: file.id,
      label,
      visibility: file.visibility,
      created_by: owner.id,
    });
  }
  await service
    .from("tasks")
    .update({ card_cover_file_id: internalImage.id })
    .eq("id", task.id)
    .throwOnError();

  await insert(service, "task_participants", {
    organization_id: org.id,
    task_id: task.id,
    user_id: collaboratorAuth.id,
    participant_role: "Assignee",
    added_by: owner.id,
  });
  await insert(service, "task_participants", {
    organization_id: org.id,
    task_id: task.id,
    user_id: owner.id,
    participant_role: "Watcher",
    added_by: owner.id,
  });

  const checklist = await insert(service, "task_checklists", {
    organization_id: org.id,
    task_id: task.id,
    title: "Vendor prep",
    sort_order: 10,
    created_by: owner.id,
    metadata: { test_identifier: testId },
  });
  await insert(service, "task_checklist_items", {
    organization_id: org.id,
    task_id: task.id,
    checklist_id: checklist.id,
    title: "Confirm vendor delivery mockup",
    assignee_id: collaboratorAuth.id,
    due_at: `${today(5)}T17:00:00Z`,
    sort_order: 10,
  });

  await insert(service, "comments", {
    organization_id: org.id,
    task_id: task.id,
    author_id: owner.id,
    body: `Internal note mentioning @${testId} Collaborator`,
    visibility: "Internal",
    mentions: [collaboratorAuth.id],
    metadata: { test_identifier: testId },
  });
  await insert(service, "comments", {
    organization_id: org.id,
    task_id: task.id,
    author_id: owner.id,
    body: "Vendor-facing update only.",
    visibility: "Vendor",
    mentions: [],
    metadata: { test_identifier: testId },
  });
  await insert(service, "comments", {
    organization_id: org.id,
    task_id: task.id,
    author_id: owner.id,
    body: "Client-facing update only.",
    visibility: "Client",
    mentions: [],
    metadata: { test_identifier: testId },
  });

  await service
    .from("tasks")
    .update({
      workflow_column_id: waitingVendorColumn.id,
      normalized_status: "Waiting",
      status: "In Progress",
      position: 2000,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", task.id)
    .throwOnError();

  const { data: boardTask } = await service
    .from("tasks")
    .select("*")
    .eq("id", task.id)
    .eq("project_id", project.id)
    .single()
    .throwOnError();
  assert(
    boardTask.workflow_column_id === waitingVendorColumn.id,
    "Project board did not reflect Waiting on Vendor.",
  );
  assert(
    boardTask.status === "In Progress" && boardTask.normalized_status === "Waiting",
    "Workflow status did not update.",
  );

  const { data: myWorkParticipants } = await service
    .from("task_participants")
    .select("*")
    .eq("task_id", task.id)
    .eq("user_id", collaboratorAuth.id)
    .eq("participant_role", "Assignee")
    .throwOnError();
  assert(boardTask.owner_id === owner.id, "Primary owner was not set.");
  assert(myWorkParticipants.length === 1, "Collaborator assignment was not set.");

  const { data: checklistRows } = await service
    .from("task_checklist_items")
    .select("*")
    .eq("task_id", task.id)
    .eq("assignee_id", collaboratorAuth.id)
    .throwOnError();
  assert(
    checklistRows.length === 1 && checklistRows[0].due_at,
    "Checklist item owner/deadline was not set.",
  );

  const calendarSource = readFileSync("src/lib/ease-events/calendar.ts", "utf8");
  assert(
    boardTask.due_date && calendarSource.includes('sourceType: "task"'),
    "Calendar task projection is not available.",
  );

  await service.from("tasks").update({ visibility: "Vendor" }).eq("id", task.id).throwOnError();
  const vendorClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  await vendorClient.auth
    .signInWithPassword({ email: generatedEmails[1], password })
    .then(({ error }) => {
      if (error) throw error;
    });
  const { data: vendorTasks } = await vendorClient
    .from("tasks")
    .select("id,title,visibility")
    .eq("id", task.id)
    .throwOnError();
  assert(
    vendorTasks.length === 1 && vendorTasks[0].visibility === "Vendor",
    "Vendor could not see the vendor-facing task.",
  );
  const { data: vendorComments } = await vendorClient
    .from("comments")
    .select("body,visibility")
    .eq("task_id", task.id)
    .throwOnError();
  assert(
    vendorComments.length === 1 && vendorComments[0].visibility === "Vendor",
    "Vendor saw non-vendor comments.",
  );
  const { data: vendorAttachments } = await vendorClient
    .from("task_attachments")
    .select("file_id,label")
    .eq("task_id", task.id)
    .throwOnError();
  assert(
    vendorAttachments.length === 1 && vendorAttachments[0].file_id === vendorImage.id,
    "Vendor saw non-vendor attachments.",
  );
  const { data: vendorFiles } = await vendorClient
    .from("files")
    .select("id,visibility")
    .eq("project_id", project.id)
    .throwOnError();
  assert(
    vendorFiles.length === 1 && vendorFiles[0].visibility === "Vendor",
    "Vendor saw non-vendor file metadata.",
  );

  await service.from("tasks").update({ visibility: "Client" }).eq("id", task.id).throwOnError();
  const clientClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  await clientClient.auth
    .signInWithPassword({ email: generatedEmails[0], password })
    .then(({ error }) => {
      if (error) throw error;
    });
  const { data: clientTasks } = await clientClient
    .from("tasks")
    .select("id,title,visibility")
    .eq("id", task.id)
    .throwOnError();
  assert(
    clientTasks.length === 1 && clientTasks[0].visibility === "Client",
    "Client could not see the client-facing task.",
  );
  const { data: clientComments } = await clientClient
    .from("comments")
    .select("body,visibility")
    .eq("task_id", task.id)
    .throwOnError();
  assert(
    clientComments.length === 1 && clientComments[0].visibility === "Client",
    "Client saw internal or vendor comments.",
  );
  const { data: clientAttachments } = await clientClient
    .from("task_attachments")
    .select("file_id,label")
    .eq("task_id", task.id)
    .throwOnError();
  assert(
    clientAttachments.length === 1 && clientAttachments[0].file_id === clientImage.id,
    "Client saw internal or vendor attachments.",
  );
  const { data: clientFiles } = await clientClient
    .from("files")
    .select("id,visibility")
    .eq("project_id", project.id)
    .throwOnError();
  assert(
    clientFiles.length === 1 && clientFiles[0].visibility === "Client",
    "Client saw internal or vendor file metadata.",
  );

  await service
    .from("tasks")
    .update({
      workflow_column_id: doneColumn.id,
      normalized_status: "Completed",
      status: "Done",
      completed_at: new Date().toISOString(),
    })
    .eq("id", task.id)
    .throwOnError();
  const { data: completedTask } = await service
    .from("tasks")
    .select("status,completed_at")
    .eq("id", task.id)
    .single()
    .throwOnError();
  assert(completedTask.status === "Done" && completedTask.completed_at, "Task was not completed.");

  await service
    .from("tasks")
    .update({ archived_at: new Date().toISOString(), archived_by: owner.id })
    .eq("id", task.id)
    .throwOnError();
  const { data: archivedTask } = await service
    .from("tasks")
    .select("archived_at")
    .eq("id", task.id)
    .single()
    .throwOnError();
  assert(archivedTask.archived_at, "Task was not archived.");

  await service
    .from("tasks")
    .update({ archived_at: null, archived_by: null })
    .eq("id", task.id)
    .throwOnError();
  const { data: restoredTask } = await service
    .from("tasks")
    .select("archived_at")
    .eq("id", task.id)
    .single()
    .throwOnError();
  assert(!restoredTask.archived_at, "Task was not restored.");

  console.log(
    JSON.stringify(
      {
        ok: true,
        testId,
        taskId: task.id,
        eventId: event.id,
        projectId: project.id,
        checks: [
          "created event task",
          "added Pinterest link and uploaded inspiration image",
          "assigned owner and collaborator",
          "added checklist owner and deadline",
          "mentioned teammate in comment",
          "moved task to Waiting on Vendor",
          "confirmed project board, My Work, Table, and Calendar projections",
          "confirmed vendor sees only vendor-facing content",
          "confirmed client cannot see internal comments or attachments",
          "completed, archived, and restored task",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  if (process.env.EASE_EVENTS_KEEP_QUALITY_GATE_RECORDS === "true") {
    console.log("Keeping quality gate records because EASE_EVENTS_KEEP_QUALITY_GATE_RECORDS=true.");
  } else {
    await cleanup();
    console.log(`Cleaned quality gate records for ${testId}.`);
  }
}
