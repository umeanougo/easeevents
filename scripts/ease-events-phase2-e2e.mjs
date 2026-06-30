import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { cleanupPhase2E2E } from "./ease-events-phase2-cleanup.mjs";

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
    // .env is optional in CI if variables are already exported.
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, received ${actual}.`);
  }
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function postJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function uploadFile(baseUrl, uploadToken, slot, fixture) {
  const form = new FormData();
  form.append("uploadToken", uploadToken);
  form.append("uploadId", slot.id);
  form.append("file", new Blob([fixture.bytes], { type: fixture.mimeType }), fixture.name);
  const response = await fetch(`${baseUrl}/api/ease-events/public-inquiry/upload`, {
    method: "POST",
    body: form,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? `Upload failed for ${fixture.name}`);
  }
  return payload;
}

async function selectSingle(supabase, table, match, columns = "*") {
  let query = supabase.from(table).select(columns);
  for (const [key, value] of Object.entries(match)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function selectMany(supabase, table, match, columns = "*") {
  let query = supabase.from(table).select(columns);
  for (const [key, value] of Object.entries(match)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function insertSingle(supabase, table, payload, columns = "*") {
  const { data, error } = await supabase.from(table).insert(payload).select(columns).single();
  if (error) throw error;
  return data;
}

async function runFailureTests({ baseUrl, identifier, fixtures }) {
  const basePayload = {
    submissionKey: `${identifier}-failure-base`,
    testIdentifier: identifier,
    clientName: `Failure ${identifier}`,
    email: `failure-${identifier}@example.com`,
    phone: "555-0100",
    eventType: "Failure Test",
    eventDate: "2026-10-02",
    estimatedGuestCount: 25,
    budgetRange: "$5k-$10k",
    notes: "Failure handling validation.",
    source: identifier,
    inspirationLinks: [],
  };

  const unsupported = await postJson(baseUrl, "/api/ease-events/public-inquiry", {
    ...basePayload,
    submissionKey: `${identifier}-unsupported`,
    files: [
      {
        clientFileId: "bad-file",
        originalFilename: "notes.txt",
        mimeType: "text/plain",
        sizeBytes: 12,
      },
    ],
  });
  assert(!unsupported.response.ok, "Unsupported file type should be rejected.");

  const tooLarge = await postJson(baseUrl, "/api/ease-events/public-inquiry", {
    ...basePayload,
    submissionKey: `${identifier}-too-large`,
    files: [
      {
        clientFileId: "too-large",
        originalFilename: "large.pdf",
        mimeType: "application/pdf",
        sizeBytes: 11 * 1024 * 1024,
      },
    ],
  });
  assert(!tooLarge.response.ok, "Oversized file manifest should be rejected.");

  const tooMany = await postJson(baseUrl, "/api/ease-events/public-inquiry", {
    ...basePayload,
    submissionKey: `${identifier}-too-many`,
    files: Array.from({ length: 11 }, (_, index) => ({
      clientFileId: `many-${index}`,
      originalFilename: `many-${index}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: fixtures.pdf.bytes.length,
      fileDigest: digest(fixtures.pdf.bytes),
    })),
  });
  assert(!tooMany.response.ok, "Too many files should be rejected.");

  const duplicateName = await postJson(baseUrl, "/api/ease-events/public-inquiry", {
    ...basePayload,
    submissionKey: `${identifier}-duplicate-name`,
    files: [
      {
        clientFileId: "duplicate-a",
        originalFilename: "duplicate.pdf",
        mimeType: "application/pdf",
        sizeBytes: fixtures.pdf.bytes.length,
        fileDigest: digest(fixtures.pdf.bytes),
      },
      {
        clientFileId: "duplicate-b",
        originalFilename: "duplicate.pdf",
        mimeType: "application/pdf",
        sizeBytes: fixtures.pdf.bytes.length,
        fileDigest: digest(fixtures.pdf.bytes),
      },
    ],
  });
  assert(!duplicateName.response.ok, "Duplicate filenames should be rejected.");
}

async function run() {
  loadEnv();

  const emailMode = process.env.EASE_EVENTS_EMAIL_MODE || "disabled";
  assert(emailMode !== "live", "Refusing to run Phase 2 e2e while EASE_EVENTS_EMAIL_MODE=live.");

  const baseUrl = (process.env.EASE_EVENTS_E2E_BASE_URL || "http://127.0.0.1:8083").replace(
    /\/$/,
    "",
  );
  const organizationId =
    process.env.EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
    process.env.VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID;
  assert(organizationId, "EASE_EVENTS_PUBLIC_ORGANIZATION_ID is required.");

  const timestamp = Date.now();
  const identifier = process.env.EASE_EVENTS_E2E_TEST_IDENTIFIER || `easeevents-e2e-${timestamp}`;
  assert(
    identifier.startsWith("easeevents-e2e-"),
    "Test identifier must start with easeevents-e2e-.",
  );

  const supabase = getAdminClient();
  const fixtures = {
    jpg: {
      clientFileId: "inspiration-jpg",
      name: `${identifier}-inspiration.jpg`,
      mimeType: "image/jpeg",
      bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x45, 0x45, 0xff, 0xd9]),
    },
    png: {
      clientFileId: "inspiration-png",
      name: `${identifier}-moodboard.png`,
      mimeType: "image/png",
      bytes: Uint8Array.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]),
    },
    pdf: {
      clientFileId: "inspiration-pdf",
      name: `${identifier}-proposal.pdf`,
      mimeType: "application/pdf",
      bytes: new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"),
    },
  };

  const fileFixtures = [fixtures.jpg, fixtures.png, fixtures.pdf];
  let cleanupResult = null;

  try {
    await runFailureTests({ baseUrl, identifier, fixtures });

    const submission = {
      submissionKey: identifier,
      testIdentifier: identifier,
      clientName: `Phase2 ${timestamp}`,
      email: `${identifier}@example.com`,
      phone: "555-0199",
      eventType: "Birthday Celebration",
      eventDate: "2026-10-02",
      estimatedGuestCount: 100,
      budgetRange: "$15k-$25k",
      notes: `Phase 2 public inquiry upload verification ${identifier}.`,
      source: identifier,
      inspirationLinks: [
        { label: "Pinterest", url: `https://example.com/${identifier}/pinterest` },
        { label: "Mood board", url: `https://example.com/${identifier}/moodboard` },
      ],
      files: fileFixtures.map((fixture) => ({
        clientFileId: fixture.clientFileId,
        originalFilename: fixture.name,
        mimeType: fixture.mimeType,
        sizeBytes: fixture.bytes.length,
        fileDigest: digest(fixture.bytes),
      })),
    };

    const createResult = await postJson(baseUrl, "/api/ease-events/public-inquiry", submission);
    assert(
      createResult.response.ok,
      createResult.payload?.error ?? "Public inquiry creation failed.",
    );
    assert(createResult.payload.uploadToken, "Upload token was not returned.");
    assertEqual(
      createResult.payload.uploadSlots.length,
      3,
      "Three upload slots should be returned.",
    );
    assertEqual(createResult.payload.emailMode, emailMode, "Email mode should match environment.");
    assert(
      ["Suppressed", "Test Redirected", "Retry Required", "Queued"].includes(
        createResult.payload.acknowledgmentStatus,
      ),
      "Acknowledgment status should be recorded.",
    );
    assert(
      emailMode !== "live" && createResult.payload.acknowledgmentStatus !== "Sent",
      "E2E must not send real external email.",
    );

    const slotsByClientFileId = new Map(
      createResult.payload.uploadSlots.map((slot) => [slot.clientFileId, slot]),
    );
    for (const fixture of fileFixtures) {
      const slot = slotsByClientFileId.get(fixture.clientFileId);
      assert(slot?.id, `Missing upload slot for ${fixture.name}.`);
      await uploadFile(baseUrl, createResult.payload.uploadToken, slot, fixture);
    }

    const finalizeResult = await postJson(baseUrl, "/api/ease-events/public-inquiry/finalize", {
      uploadToken: createResult.payload.uploadToken,
    });
    assert(finalizeResult.response.ok, finalizeResult.payload?.error ?? "Finalize failed.");

    const lead = await selectSingle(supabase, "leads", { id: createResult.payload.lead.id });
    const project = await selectSingle(supabase, "projects", {
      id: createResult.payload.project.id,
    });
    const primaryThread = await selectSingle(supabase, "communication_threads", {
      id: createResult.payload.thread.id,
    });
    assert(lead, "Lead should exist.");
    assert(project, "Project should exist.");
    assert(primaryThread, "Primary communication thread should exist.");
    assertEqual(project.id, lead.project_id, "Lead should point at the project.");

    const submissions = await selectMany(supabase, "public_inquiry_submissions", {
      test_identifier: identifier,
    });
    assertEqual(submissions.length, 1, "Exactly one inquiry submission should exist.");
    assertEqual(submissions[0].lead_id, lead.id, "Submission should reference the lead.");
    assertEqual(submissions[0].project_id, project.id, "Submission should reference the project.");

    const inspirationLinks = await selectMany(supabase, "project_inspiration_links", {
      project_id: project.id,
    });
    assertEqual(inspirationLinks.length, 2, "Two structured inspiration links should be stored.");

    const uploads = await selectMany(supabase, "public_inquiry_uploads", {
      submission_id: submissions[0].id,
    });
    assertEqual(uploads.length, 3, "Three upload metadata rows should exist.");
    assert(
      uploads.every(
        (upload) =>
          upload.status === "finalized" &&
          upload.storage_path.startsWith(`${organizationId}/projects/${project.id}/inquiry/`),
      ),
      "Upload paths should be finalized and project scoped.",
    );

    const files = await selectMany(supabase, "files", { project_id: project.id });
    assertEqual(files.length, 3, "Three project file records should exist.");

    const messagesBefore = await selectMany(supabase, "communication_messages", {
      thread_id: primaryThread.id,
    });
    assertEqual(messagesBefore.length, 1, "Inquiry acknowledgment should be recorded once.");
    assert(
      messagesBefore[0].delivery_status === "Suppressed" ||
        messagesBefore[0].delivery_status === "Test Redirected" ||
        messagesBefore[0].delivery_status === "Retry Required",
      "Acknowledgment should be safely recorded in non-live mode.",
    );

    const leadWorkspaceResponse = await fetch(`${baseUrl}/ease-events/leads/${lead.id}`);
    assert(
      leadWorkspaceResponse.ok || leadWorkspaceResponse.status === 302,
      `Lead workspace route should respond, received ${leadWorkspaceResponse.status}.`,
    );

    await insertSingle(supabase, "communication_messages", {
      organization_id: organizationId,
      project_id: project.id,
      lead_id: lead.id,
      thread_id: primaryThread.id,
      event_id: null,
      direction: "Internal",
      body: `Internal note for ${identifier}`,
      summary: "Internal note",
      visibility: "Internal",
    });

    const callThread = await insertSingle(supabase, "communication_threads", {
      organization_id: organizationId,
      project_id: project.id,
      lead_id: lead.id,
      event_id: null,
      subject: `Call log ${identifier}`,
      client_name_snapshot: lead.client_name_snapshot,
      participants: [lead.email],
      channel: "Phone",
      status: "Closed",
      preview: "Logged discovery call.",
    });
    await insertSingle(supabase, "communication_messages", {
      organization_id: organizationId,
      project_id: project.id,
      lead_id: lead.id,
      thread_id: callThread.id,
      event_id: null,
      direction: "Internal",
      body: `Logged call outcome and follow-up for ${identifier}`,
      summary: "Call logged",
      visibility: "Internal",
    });

    const task = await insertSingle(supabase, "tasks", {
      organization_id: organizationId,
      project_id: project.id,
      lead_id: lead.id,
      event_id: null,
      title: `Review inspiration files ${identifier}`,
      description: "Task with a link and an uploaded attachment.",
      due_date: "2026-09-01",
      status: "To Do",
      priority: "High",
    });
    await insertSingle(supabase, "task_links", {
      organization_id: organizationId,
      task_id: task.id,
      label: "Client inspiration board",
      url: submission.inspirationLinks[0].url,
    });
    await insertSingle(supabase, "task_attachments", {
      organization_id: organizationId,
      task_id: task.id,
      file_id: files[0].id,
      label: "Reference image",
    });

    const event = await insertSingle(supabase, "events", {
      organization_id: organizationId,
      project_id: project.id,
      lead_id: lead.id,
      client_id: lead.client_id,
      planner_id: lead.owner_id,
      client_name_snapshot: lead.client_name_snapshot,
      client_email: lead.email,
      client_phone: lead.phone,
      event_name: `${lead.client_name_snapshot} ${lead.event_type}`,
      event_type: lead.event_type,
      event_date: lead.event_date,
      start_time: "17:00",
      end_time: "22:00",
      location: "Location TBD",
      guest_count: lead.estimated_guest_count,
      status: "Planning",
      client_price: 0,
      internal_notes: lead.notes,
      timeline_notes: "Created by Phase 2 verification.",
    });

    await supabase
      .from("leads")
      .update({ stage: "Booked", converted_event_id: event.id, project_id: project.id })
      .eq("id", lead.id);
    await supabase
      .from("projects")
      .update({ event_id: event.id, stage: "Planning", last_activity_at: new Date().toISOString() })
      .eq("id", project.id);

    for (const table of [
      "communication_threads",
      "communication_messages",
      "meetings",
      "meeting_notes",
      "files",
      "tasks",
      "comments",
      "project_inspiration_links",
    ]) {
      await supabase
        .from(table)
        .update({ event_id: event.id })
        .eq("organization_id", organizationId)
        .eq("project_id", project.id)
        .is("event_id", null);
    }

    await insertSingle(supabase, "tasks", {
      organization_id: organizationId,
      project_id: project.id,
      lead_id: lead.id,
      event_id: event.id,
      title: "Configure payment terms before deposit invoice",
      description: "Set a real deposit amount and schedule before creating an invoice.",
      due_date: new Date().toISOString().slice(0, 10),
      status: "To Do",
      priority: "High",
    });

    const retainedFiles = await selectMany(supabase, "files", { project_id: project.id });
    const retainedMessages = await selectMany(supabase, "communication_messages", {
      project_id: project.id,
    });
    const retainedTasks = await selectMany(supabase, "tasks", { project_id: project.id });
    assertEqual(retainedFiles.length, 3, "Files should remain visible after conversion.");
    assert(
      retainedMessages.length >= 3,
      "Communications and notes should remain visible after conversion.",
    );
    assert(retainedTasks.length >= 2, "Tasks should remain visible after conversion.");

    const invoices = await selectMany(supabase, "invoices", { project_id: project.id });
    assertEqual(invoices.length, 0, "No guessed invoice should be created.");
    assert(
      retainedTasks.some((row) => row.title === "Configure payment terms before deposit invoice"),
      "Payment-terms setup task should exist.",
    );

    const retryResult = await postJson(baseUrl, "/api/ease-events/public-inquiry", submission);
    assert(retryResult.response.ok, retryResult.payload?.error ?? "Idempotency retry failed.");
    assertEqual(retryResult.payload.lead.id, lead.id, "Retry should return the same lead.");
    assertEqual(
      retryResult.payload.project.id,
      project.id,
      "Retry should return the same project.",
    );
    assertEqual(
      retryResult.payload.thread.id,
      primaryThread.id,
      "Retry should return the same primary thread.",
    );
    const retrySubmissions = await selectMany(supabase, "public_inquiry_submissions", {
      test_identifier: identifier,
    });
    assertEqual(retrySubmissions.length, 1, "Retry should not create duplicate submissions.");

    const anon = getAnonClient();
    if (anon) {
      const { data: anonUploads, error: anonUploadError } = await anon
        .from("public_inquiry_uploads")
        .select("id")
        .eq("project_id", project.id);
      assert(
        anonUploadError || !anonUploads?.length,
        "Anonymous client should not read public inquiry upload records.",
      );
      const { data: listedObjects, error: listError } = await anon.storage
        .from("event-files")
        .list(`${organizationId}/projects/${project.id}/inquiry`);
      assert(
        listError || !listedObjects?.length,
        "Anonymous client should not enumerate storage objects.",
      );
    }

    await supabase
      .from("public_inquiry_submissions")
      .update({ token_expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", submissions[0].id);
    const expiredUpload = await uploadFile(
      baseUrl,
      createResult.payload.uploadToken,
      slotsByClientFileId.get(fixtures.jpg.clientFileId),
      fixtures.jpg,
    ).then(
      () => ({ ok: true }),
      (error) => ({ ok: false, error }),
    );
    assert(!expiredUpload.ok, "Expired upload token should be rejected.");

    cleanupResult = await cleanupPhase2E2E(identifier);
    console.log(`Phase 2 e2e passed for ${identifier}`);
    console.log(JSON.stringify({ identifier, cleanup: cleanupResult }, null, 2));
  } catch (error) {
    if (process.env.EASE_EVENTS_E2E_KEEP_DATA !== "true") {
      try {
        cleanupResult = await cleanupPhase2E2E(identifier);
        console.error(`Cleaned up after failure for ${identifier}`);
        console.error(JSON.stringify(cleanupResult, null, 2));
      } catch (cleanupError) {
        console.error(`Cleanup failed for ${identifier}: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
