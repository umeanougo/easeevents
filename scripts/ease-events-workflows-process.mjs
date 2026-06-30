import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
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

function addHours(date, hours) {
  return new Date(date.getTime() + Number(hours ?? 0) * 60 * 60 * 1000).toISOString();
}

async function insertOnce(client, table, payload, uniqueColumn, uniqueValue) {
  const { data: existing, error: existingError } = await client
    .from(table)
    .select("*")
    .eq(uniqueColumn, uniqueValue)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { row: existing, created: false };

  const { data, error } = await client.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return { row: data, created: true };
}

async function getProject(client, projectId) {
  if (!projectId) return null;
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getPrimaryStaff(client, organizationId, project) {
  if (project?.owner_id) {
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("id", project.owner_id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("organization_id", organizationId)
    .in("role", ["admin", "planner"])
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function projectHref(project) {
  if (!project) return "/ease-events";
  if (project.event_id) return `/ease-events/events/${project.event_id}`;
  if (project.lead_id) return `/ease-events/leads/${project.lead_id}`;
  return "/ease-events";
}

async function createNotification(client, { organizationId, execution, action, project, config }) {
  const recipient = await getPrimaryStaff(client, organizationId, project);
  const dedupeKey = `${execution.idempotency_key}:${action.id}:notification:${recipient?.id ?? "org"}`;
  const payload = {
    organization_id: organizationId,
    recipient_user_id: recipient?.id ?? null,
    project_id: project?.id ?? execution.project_id ?? null,
    event_id: project?.event_id ?? execution.event_id ?? null,
    workflow_execution_id: execution.id,
    notification_type: action.action_type,
    severity: config.severity ?? "Info",
    status: "Unread",
    title: config.title ?? action.name,
    body: config.body ?? null,
    href: config.href ?? projectHref(project),
    channel: "in_app",
    action_required: config.action_required ?? true,
    due_at: config.due_at ?? null,
    dedupe_key: dedupeKey,
    metadata: { workflow_action_id: action.id, automation_action_name: action.name },
  };

  return insertOnce(client, "notifications", payload, "dedupe_key", dedupeKey);
}

async function createReminder(client, { organizationId, execution, action, project, config }) {
  const recipient = await getPrimaryStaff(client, organizationId, project);
  const dedupeKey = `${execution.idempotency_key}:${action.id}:reminder`;
  const { data: existing, error: existingError } = await client
    .from("project_reminders")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("project_id", project?.id ?? execution.project_id)
    .contains("metadata", { idempotency_key: dedupeKey })
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { row: existing, created: false };

  const dueAt = addHours(new Date(), config.delay_hours ?? 24);
  const { data, error } = await client
    .from("project_reminders")
    .insert({
      organization_id: organizationId,
      project_id: project?.id ?? execution.project_id,
      assigned_to_id: recipient?.id ?? null,
      title: config.title ?? action.name,
      due_at: dueAt,
      status: "Open",
      automation_source: "workflow_automation",
      metadata: {
        idempotency_key: dedupeKey,
        workflow_execution_id: execution.id,
        workflow_action_id: action.id,
      },
    })
    .select("*")
    .single();
  if (error) throw error;
  return { row: data, created: true };
}

async function createProjectNote(client, { organizationId, execution, action, project, config }) {
  const dedupeKey = `${execution.idempotency_key}:${action.id}:activity`;
  const { data: existing, error: existingError } = await client
    .from("project_activity_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("project_id", project?.id ?? execution.project_id)
    .contains("metadata", { idempotency_key: dedupeKey })
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { row: existing, created: false };

  const { data, error } = await client
    .from("project_activity_events")
    .insert({
      organization_id: organizationId,
      project_id: project?.id ?? execution.project_id,
      activity_type: "system",
      title: config.title ?? action.name,
      body: config.body ?? null,
      metadata: {
        idempotency_key: dedupeKey,
        workflow_execution_id: execution.id,
        workflow_action_id: action.id,
      },
    })
    .select("*")
    .single();
  if (error) throw error;
  return { row: data, created: true };
}

async function createEmailDraft(client, { organizationId, execution, action, project, config }) {
  const now = new Date().toISOString();
  const dedupeKey = `${execution.idempotency_key}:${action.id}:email-draft`;
  const { data: existingMessage, error: existingError } = await client
    .from("communication_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .contains("metadata", { idempotency_key: dedupeKey })
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingMessage) return { row: existingMessage, created: false };

  const { data: existingThread, error: threadError } = await client
    .from("communication_threads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("project_id", project?.id ?? execution.project_id)
    .eq("channel", "Email")
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (threadError) throw threadError;

  let thread = existingThread;
  if (!thread) {
    const { data, error } = await client
      .from("communication_threads")
      .insert({
        organization_id: organizationId,
        project_id: project?.id ?? execution.project_id,
        lead_id: project?.lead_id ?? null,
        event_id: project?.event_id ?? execution.event_id ?? null,
        assigned_to_id: project?.owner_id ?? null,
        subject: config.subject ?? "Automation follow-up draft",
        client_name_snapshot: project?.name ?? "Project",
        participants: config.participants ?? [],
        channel: "Email",
        status: "Waiting on Client",
        integration_source: "workflow_automation",
        preview: config.summary ?? "Automation draft created.",
        unread_count: 0,
        last_activity_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    thread = data;
  }

  const { data, error } = await client
    .from("communication_messages")
    .insert({
      organization_id: organizationId,
      project_id: project?.id ?? execution.project_id,
      lead_id: project?.lead_id ?? null,
      thread_id: thread.id,
      event_id: project?.event_id ?? execution.event_id ?? null,
      author_id: project?.owner_id ?? null,
      direction: "Outbound",
      body: config.body ?? "Automation follow-up draft.",
      summary: config.summary ?? "Automation follow-up draft.",
      visibility: "Internal",
      sent_at: now,
      delivery_status: "Suppressed",
      delivery_mode: process.env.EASE_EVENTS_EMAIL_MODE || "disabled",
      metadata: {
        idempotency_key: dedupeKey,
        workflow_execution_id: execution.id,
        workflow_action_id: action.id,
        automation_draft: true,
      },
    })
    .select("*")
    .single();
  if (error) throw error;
  return { row: data, created: true };
}

async function executeAction(client, params) {
  if (params.action.action_type === "send_in_app_notification") {
    return createNotification(client, params);
  }
  if (params.action.action_type === "create_reminder") {
    return createReminder(client, params);
  }
  if (params.action.action_type === "create_project_note") {
    return createProjectNote(client, params);
  }
  if (params.action.action_type === "create_email_draft") {
    return createEmailDraft(client, params);
  }
  return { row: null, created: false, skipped: true };
}

async function queueExecutionsForPendingEvents(client, options) {
  const now = new Date().toISOString();
  const { data: events, error: eventError } = await client
    .from("workflow_events")
    .select("*")
    .eq("status", "Pending")
    .order("occurred_at", { ascending: true })
    .limit(options.limit);
  if (eventError) throw eventError;

  let queued = 0;
  for (const event of events ?? []) {
    const { data: automations, error: automationError } = await client
      .from("workflow_automations")
      .select("*")
      .eq("organization_id", event.organization_id)
      .eq("trigger_type", event.event_type)
      .eq("status", "Active")
      .order("priority", { ascending: true });
    if (automationError) throw automationError;

    for (const automation of automations ?? []) {
      const idempotencyKey = `${event.dedupe_key}:${automation.id}`;
      const initialStatus =
        automation.approval_policy === "automatic" ? "Queued" : "Awaiting Approval";
      const { created } = await insertOnce(
        client,
        "workflow_executions",
        {
          organization_id: event.organization_id,
          automation_id: automation.id,
          workflow_event_id: event.id,
          project_id: event.project_id,
          event_id: event.event_id,
          status: initialStatus,
          scheduled_for: now,
          attempt_count: 0,
          idempotency_key: idempotencyKey,
          metadata: { workflow_event_payload: event.payload },
        },
        "idempotency_key",
        idempotencyKey,
      );
      if (created) queued += 1;
    }

    await client
      .from("workflow_events")
      .update({
        status: "Processed",
        processed_at: now,
        error_message: null,
      })
      .eq("id", event.id);
  }

  return queued;
}

async function processDueExecutions(client, options) {
  const now = new Date().toISOString();
  const { data: executions, error: executionError } = await client
    .from("workflow_executions")
    .select("*")
    .eq("status", "Queued")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(options.limit);
  if (executionError) throw executionError;

  let completed = 0;
  let failed = 0;
  let awaitingApproval = 0;

  for (const execution of executions ?? []) {
    const startedAt = new Date().toISOString();
    await client
      .from("workflow_executions")
      .update({
        status: "Running",
        started_at: startedAt,
        attempt_count: Number(execution.attempt_count ?? 0) + 1,
      })
      .eq("id", execution.id);

    const { data: actions, error: actionError } = await client
      .from("workflow_automation_actions")
      .select("*")
      .eq("automation_id", execution.automation_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (actionError) throw actionError;

    const project = await getProject(client, execution.project_id);
    let hasFailure = false;
    let hasApproval = false;

    for (const action of actions ?? []) {
      const actionKey = `${execution.idempotency_key}:${action.id}`;
      const status = action.requires_approval ? "Awaiting Approval" : "Queued";
      const { row: actionRun, created } = await insertOnce(
        client,
        "workflow_action_runs",
        {
          organization_id: execution.organization_id,
          execution_id: execution.id,
          automation_action_id: action.id,
          action_type: action.action_type,
          status,
          idempotency_key: actionKey,
          output: {},
        },
        "idempotency_key",
        actionKey,
      );

      if (action.requires_approval) {
        hasApproval = true;
        continue;
      }
      if (!created && actionRun.status === "Completed") continue;

      try {
        await client
          .from("workflow_action_runs")
          .update({ status: "Running", started_at: new Date().toISOString() })
          .eq("id", actionRun.id);

        const result = await executeAction(client, {
          organizationId: execution.organization_id,
          execution,
          action,
          project,
          config: action.config ?? {},
        });

        await client
          .from("workflow_action_runs")
          .update({
            status: result.skipped ? "Skipped" : "Completed",
            completed_at: new Date().toISOString(),
            output: {
              record_id: result.row?.id,
              created: Boolean(result.created),
              skipped: Boolean(result.skipped),
            },
          })
          .eq("id", actionRun.id);
      } catch (error) {
        hasFailure = true;
        await client
          .from("workflow_action_runs")
          .update({
            status: "Failed",
            completed_at: new Date().toISOString(),
            error_message: error.message,
          })
          .eq("id", actionRun.id);
      }
    }

    const finalStatus = hasFailure ? "Failed" : hasApproval ? "Awaiting Approval" : "Completed";
    const { error: updateError } = await client
      .from("workflow_executions")
      .update({
        status: finalStatus,
        completed_at: finalStatus === "Completed" ? new Date().toISOString() : null,
        error_message: hasFailure ? "One or more automation actions failed." : null,
      })
      .eq("id", execution.id);
    if (updateError) throw updateError;

    if (finalStatus === "Failed") failed += 1;
    if (finalStatus === "Awaiting Approval") awaitingApproval += 1;
    if (finalStatus === "Completed") completed += 1;
  }

  return { completed, failed, awaitingApproval };
}

export async function processWorkflowQueue(client, options = {}) {
  const limit = Number(options.limit ?? process.env.EASE_EVENTS_WORKFLOW_LIMIT ?? 50);
  const queued = await queueExecutionsForPendingEvents(client, { limit });
  const processed = await processDueExecutions(client, { limit });
  return { queued, ...processed };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadDotEnv();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(supabaseUrl && serviceKey, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  processWorkflowQueue(client)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
