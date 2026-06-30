import { createHash, randomBytes, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export const PublicInquiryFileManifestSchema = z.object({
  clientFileId: z.string().min(1).max(120),
  originalFilename: z.string().min(1).max(240),
  mimeType: z.enum(allowedMimeTypes),
  sizeBytes: z.number().int().min(1),
  fileDigest: z.string().min(16).max(160).optional(),
});

export const PublicInquirySchema = z.object({
  submissionKey: z.string().min(12).max(160),
  testIdentifier: z.string().max(160).optional(),
  clientName: z.string().min(1).max(160),
  email: z.string().email().max(255),
  phone: z.string().max(80).optional().default(""),
  eventType: z.string().min(1).max(180),
  eventDate: z.string().optional().default(""),
  estimatedGuestCount: z.number().int().min(0).max(100000).optional().default(0),
  budgetRange: z.string().max(120).optional().default(""),
  notes: z.string().max(6000).optional().default(""),
  source: z.string().max(120).optional().default("Website"),
  inspirationLinks: z
    .array(z.object({ label: z.string().max(120).optional(), url: z.string().url().max(2000) }))
    .max(12)
    .optional()
    .default([]),
  files: z.array(PublicInquiryFileManifestSchema).optional().default([]),
});

export type PublicInquiryInput = z.infer<typeof PublicInquirySchema>;
export type PublicInquiryFileManifest = z.infer<typeof PublicInquiryFileManifestSchema>;
export type EmailMode = "disabled" | "test" | "live";

type SupabaseAdminClient = ReturnType<typeof createClient>;

export function getPublicInquiryUploadLimits() {
  const maxFiles = Number(process.env.EASE_EVENTS_PUBLIC_UPLOAD_MAX_FILES ?? 10);
  const maxFileMb = Number(process.env.EASE_EVENTS_PUBLIC_UPLOAD_MAX_FILE_MB ?? 10);
  const maxTotalMb = Number(process.env.EASE_EVENTS_PUBLIC_UPLOAD_MAX_TOTAL_MB ?? 30);
  return {
    maxFiles: Number.isFinite(maxFiles) && maxFiles > 0 ? maxFiles : 10,
    maxFileBytes:
      Number.isFinite(maxFileMb) && maxFileMb > 0 ? maxFileMb * 1024 * 1024 : 10 * 1024 * 1024,
    maxTotalBytes:
      Number.isFinite(maxTotalMb) && maxTotalMb > 0 ? maxTotalMb * 1024 * 1024 : 30 * 1024 * 1024,
    allowedMimeTypes: [...allowedMimeTypes],
  };
}

export function getConfiguredEmailMode(): EmailMode {
  const mode = process.env.EASE_EVENTS_EMAIL_MODE;
  if (mode === "live" || mode === "test" || mode === "disabled") return mode;
  return "disabled";
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server configuration is missing.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getPublicInquiryOrganizationId() {
  return (
    process.env.EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
    import.meta.env.VITE_EASE_EVENTS_PUBLIC_ORGANIZATION_ID ||
    ""
  );
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function sanitizeFilename(filename: string) {
  const fallback = "upload";
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
  return cleaned || fallback;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createUploadToken() {
  return randomBytes(32).toString("base64url");
}

function mergeTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = values[key];
    return value?.trim() ? value : "";
  });
}

function toClient(row: any) {
  if (!row) return undefined;
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone ?? undefined,
    companyName: row.company_name ?? undefined,
    status: row.status,
    source: row.source ?? undefined,
    notes: row.notes ?? undefined,
    lifetimeValue: Number(row.lifetime_value ?? 0),
    lastContactedAt: row.last_contacted_at ?? undefined,
    createdAt: row.created_at,
  };
}

function toLead(row: any, projectId?: string) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: projectId ?? row.project_id ?? undefined,
    clientId: row.client_id ?? undefined,
    ownerId: row.owner_id ?? undefined,
    stage: row.stage,
    clientNameSnapshot: row.client_name_snapshot ?? row.client_name ?? "",
    clientName: row.client_name_snapshot ?? row.client_name ?? "",
    email: row.email,
    phone: row.phone ?? "",
    eventType: row.event_type,
    eventDate: row.event_date ?? "",
    estimatedGuestCount: row.estimated_guest_count ?? 0,
    budgetRange: row.budget_range ?? "",
    notes: row.notes ?? "",
    source: row.source ?? "",
    convertedEventId: row.converted_event_id ?? undefined,
    createdAt: row.created_at,
  };
}

function toProject(row: any) {
  if (!row) return undefined;
  return {
    id: row.id,
    organizationId: row.organization_id,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? undefined,
    clientId: row.client_id ?? undefined,
    ownerId: row.owner_id ?? undefined,
    name: row.name,
    stage: row.stage,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toThread(row: any) {
  if (!row) return undefined;
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? "",
    assignedToId: row.assigned_to_id ?? undefined,
    subject: row.subject,
    clientNameSnapshot: row.client_name_snapshot ?? row.client_name ?? "",
    clientName: row.client_name_snapshot ?? row.client_name ?? "",
    participants: Array.isArray(row.participants) ? row.participants : [],
    channel: row.channel,
    status: row.status,
    integrationSource: row.integration_source ?? undefined,
    preview: row.preview ?? "",
    unreadCount: Number(row.unread_count ?? 0),
    lastActivityAt: row.last_activity_at,
  };
}

function toUploadSlot(row: any) {
  return {
    id: row.id,
    clientFileId: row.client_file_id,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    storagePath: row.storage_path,
    fileId: row.file_id ?? undefined,
  };
}

async function updateSubmission(
  supabase: SupabaseAdminClient,
  submissionId: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("public_inquiry_submissions")
    .update(updates)
    .eq("id", submissionId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function validateFileManifest(files: PublicInquiryFileManifest[]) {
  const limits = getPublicInquiryUploadLimits();
  if (files.length > limits.maxFiles) {
    throw new Error(`Attach up to ${limits.maxFiles} files.`);
  }

  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  if (totalBytes > limits.maxTotalBytes) {
    throw new Error(
      `Combined upload size is too large. Limit is ${Math.floor(limits.maxTotalBytes / 1024 / 1024)} MB.`,
    );
  }

  const seenNames = new Set<string>();
  const seenClientIds = new Set<string>();
  files.forEach((file) => {
    if (!allowedMimeTypes.includes(file.mimeType as (typeof allowedMimeTypes)[number])) {
      throw new Error(`${file.originalFilename} is not a supported file type.`);
    }
    if (file.sizeBytes > limits.maxFileBytes) {
      throw new Error(
        `${file.originalFilename} is too large. Limit is ${Math.floor(limits.maxFileBytes / 1024 / 1024)} MB per file.`,
      );
    }
    const normalizedName = file.originalFilename.trim().toLowerCase();
    if (seenNames.has(normalizedName)) {
      throw new Error(`Duplicate filename: ${file.originalFilename}. Rename or remove one copy.`);
    }
    seenNames.add(normalizedName);
    if (seenClientIds.has(file.clientFileId)) {
      throw new Error("Duplicate client file identifier. Refresh the page and try again.");
    }
    seenClientIds.add(file.clientFileId);
  });
}

async function resolveOrganizationAndOwner(supabase: SupabaseAdminClient, organizationId: string) {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (organizationError || !organization) throw new Error("EaseEvents organization not found.");

  const { data: owner } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("organization_id", organizationId)
    .in("role", ["admin", "planner"])
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { organization, owner };
}

async function upsertUploadSlots(
  supabase: SupabaseAdminClient,
  submission: any,
  files: PublicInquiryFileManifest[],
) {
  if (!files.length) return [];

  const { data: existingRows, error: existingError } = await supabase
    .from("public_inquiry_uploads")
    .select("*")
    .eq("submission_id", submission.id);
  if (existingError) throw existingError;

  const existingByClientFileId = new Map(
    (existingRows ?? []).map((row: any) => [row.client_file_id, row]),
  );
  const rows = [];
  for (const file of files) {
    if (existingByClientFileId.has(file.clientFileId)) continue;
    const uploadId = randomUUID();
    const sanitized = sanitizeFilename(file.originalFilename);
    rows.push({
      id: uploadId,
      organization_id: submission.organization_id,
      submission_id: submission.id,
      project_id: submission.project_id,
      lead_id: submission.lead_id,
      client_file_id: file.clientFileId,
      file_digest: file.fileDigest ?? null,
      original_filename: file.originalFilename,
      sanitized_filename: sanitized,
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
      storage_path: `${submission.organization_id}/projects/${submission.project_id}/inquiry/${uploadId}-${sanitized}`,
      status: "pending",
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      metadata: {
        test_identifier: submission.test_identifier,
      },
    });
  }

  if (rows.length) {
    const { error } = await supabase.from("public_inquiry_uploads").insert(rows);
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from("public_inquiry_uploads")
    .select("*")
    .eq("submission_id", submission.id);
  if (error) throw error;
  return (data ?? []).map(toUploadSlot);
}

async function recordAcknowledgmentEmail(params: {
  supabase: SupabaseAdminClient;
  organization: any;
  owner: any;
  input: PublicInquiryInput;
  lead: any;
  project: any;
  thread: any;
}) {
  const { supabase, organization, owner, input, lead, project, thread } = params;
  const clientEmail = normalizeEmail(input.email);
  const mode = getConfiguredEmailMode();
  const now = new Date().toISOString();

  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("template_type", "inquiry_acknowledgment")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  const consultationLink = process.env.EASE_EVENTS_CONSULTATION_LINK || "";
  const mergeValues = {
    client_name: input.clientName,
    event_type: input.eventType,
    event_date: input.eventDate || "your preferred date",
    planner_name: owner?.full_name ?? organization.name,
    organization_name: organization.name,
    consultation_link: consultationLink ? `Book a consultation here: ${consultationLink}` : "",
  };
  const baseSubject = mergeTemplate(
    template?.subject ?? "We received your {{event_type}} inquiry",
    mergeValues,
  );
  const body = mergeTemplate(
    template?.body ??
      "Hi {{client_name}},\n\nThank you for reaching out to {{organization_name}} about your {{event_type}}. We received your inquiry and will follow up shortly.\n\n{{consultation_link}}",
    mergeValues,
  );

  let actualRecipient: string | null = null;
  let subject = baseSubject;
  let deliveryStatus:
    | "Queued"
    | "Sent"
    | "Test Redirected"
    | "Suppressed"
    | "Failed"
    | "Retry Required" = "Suppressed";
  let deliveryError: string | null = null;

  try {
    if (mode === "disabled") {
      deliveryStatus = "Suppressed";
    } else if (mode === "test") {
      actualRecipient = normalizeEmail(process.env.EASE_EVENTS_TEST_EMAIL ?? "");
      if (!actualRecipient) {
        deliveryStatus = "Retry Required";
        deliveryError = "EASE_EVENTS_TEST_EMAIL is required when EASE_EVENTS_EMAIL_MODE=test.";
      } else {
        subject = `${process.env.EASE_EVENTS_TEST_EMAIL_PREFIX ?? "[EaseEvents Test]"} ${baseSubject}`;
        const { error } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: randomUUID(),
            to: actualRecipient,
            from: `${organization.name} <noreply@easeops.ca>`,
            sender_domain: "easeops.ca",
            subject,
            text: body,
            html: body.replace(/\n/g, "<br />"),
            purpose: "transactional",
            label: "easeevents-inquiry-acknowledgment-test",
            idempotency_key: `easeevents-inquiry-ack-${lead.id}`,
            intended_recipient: clientEmail,
            queued_at: now,
          },
        });
        if (error) throw error;
        deliveryStatus = "Test Redirected";
      }
    } else {
      actualRecipient = clientEmail;
      const { error } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: randomUUID(),
          to: actualRecipient,
          from: `${organization.name} <noreply@easeops.ca>`,
          sender_domain: "easeops.ca",
          subject,
          text: body,
          html: body.replace(/\n/g, "<br />"),
          purpose: "transactional",
          label: "easeevents-inquiry-acknowledgment",
          idempotency_key: `easeevents-inquiry-ack-${lead.id}`,
          queued_at: now,
        },
      });
      if (error) throw error;
      deliveryStatus = "Queued";
    }
  } catch (error) {
    deliveryStatus = "Retry Required";
    deliveryError = error instanceof Error ? error.message : "Unable to enqueue email.";
  }

  const { data: message, error: messageError } = await supabase
    .from("communication_messages")
    .insert({
      organization_id: organization.id,
      project_id: project.id,
      lead_id: lead.id,
      thread_id: thread.id,
      event_id: null,
      author_id: owner?.id ?? null,
      direction: "Outbound",
      body,
      summary: `Inquiry acknowledgment ${deliveryStatus.toLowerCase()}.`,
      visibility: "Client",
      sent_at: now,
      delivery_status: deliveryStatus,
      delivery_mode: mode,
      delivery_error: deliveryError,
      metadata: {
        intended_recipient: clientEmail,
        actual_recipient: actualRecipient,
        subject,
        base_subject: baseSubject,
        test_identifier: input.testIdentifier,
      },
    })
    .select("*")
    .single();

  if (messageError) throw messageError;

  await supabase.from("project_activity_events").insert({
    organization_id: organization.id,
    project_id: project.id,
    actor_id: owner?.id ?? null,
    activity_type: "email",
    title: `Inquiry acknowledgment: ${deliveryStatus}`,
    body:
      deliveryError ??
      (mode === "test"
        ? `Redirected to ${actualRecipient}; intended recipient was ${clientEmail}.`
        : mode === "disabled"
          ? "Email delivery is disabled. The intended message was recorded only."
          : "Outbound acknowledgment was queued."),
    metadata: {
      lead_id: lead.id,
      thread_id: thread.id,
      message_id: message.id,
      status: deliveryStatus,
      mode,
      intended_recipient: clientEmail,
      actual_recipient: actualRecipient,
      error: deliveryError,
      test_identifier: input.testIdentifier,
    },
  });

  return {
    message,
    mode,
    status: deliveryStatus,
    intendedRecipient: clientEmail,
    actualRecipient,
    subject,
    error: deliveryError,
  };
}

async function ensureInspirationLinks(params: {
  supabase: SupabaseAdminClient;
  organizationId: string;
  projectId: string;
  leadId: string;
  links: PublicInquiryInput["inspirationLinks"];
}) {
  const links = params.links.filter((link) => link.url.trim());
  if (!links.length) return;

  const { data: existingLinks, error: existingError } = await params.supabase
    .from("project_inspiration_links")
    .select("url")
    .eq("organization_id", params.organizationId)
    .eq("project_id", params.projectId);
  if (existingError) throw existingError;

  const existingUrls = new Set((existingLinks ?? []).map((link: any) => String(link.url)));
  const rows = links
    .filter((link) => !existingUrls.has(link.url.trim()))
    .map((link) => ({
      organization_id: params.organizationId,
      project_id: params.projectId,
      lead_id: params.leadId,
      label: link.label?.trim() || null,
      url: link.url.trim(),
    }));

  if (rows.length) {
    const { error } = await params.supabase.from("project_inspiration_links").insert(rows);
    if (error) throw error;
  }
}

async function ensureFollowUpReminder(params: {
  supabase: SupabaseAdminClient;
  organizationId: string;
  projectId: string;
  leadId: string;
  ownerId?: string | null;
  clientName: string;
  acknowledgmentStatus?: string;
  testIdentifier?: string;
}) {
  const { data: existingReminder, error: existingError } = await params.supabase
    .from("project_reminders")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("project_id", params.projectId)
    .eq("automation_source", "inquiry_acknowledgment")
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingReminder) return;

  const { error } = await params.supabase.from("project_reminders").insert({
    organization_id: params.organizationId,
    project_id: params.projectId,
    assigned_to_id: params.ownerId ?? null,
    title: `Follow up with ${params.clientName}`,
    due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Open",
    automation_source: "inquiry_acknowledgment",
    metadata: {
      lead_id: params.leadId,
      acknowledgment_status: params.acknowledgmentStatus,
      test_identifier: params.testIdentifier,
    },
  });
  if (error) throw error;
}

export async function initializePublicInquiry(input: PublicInquiryInput) {
  validateFileManifest(input.files);

  const organizationId = getPublicInquiryOrganizationId();
  if (!organizationId) throw new Error("Public inquiry organization is not configured.");

  const supabase = createSupabaseAdminClient();
  const { organization, owner } = await resolveOrganizationAndOwner(supabase, organizationId);
  const now = new Date().toISOString();
  const clientEmail = normalizeEmail(input.email);
  const uploadToken = createUploadToken();
  const uploadTokenHash = hashToken(uploadToken);
  const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data: insertedSubmission, error: submissionInsertError } = await supabase
    .from("public_inquiry_submissions")
    .insert({
      organization_id: organizationId,
      submission_key: input.submissionKey,
      upload_token_hash: uploadTokenHash,
      token_expires_at: tokenExpiresAt,
      test_identifier: input.testIdentifier ?? null,
      status: "initialized",
      email_mode: getConfiguredEmailMode(),
      email_status: getConfiguredEmailMode() === "disabled" ? "Suppressed" : "Queued",
      intended_recipient: clientEmail,
      metadata: { source: input.source },
    })
    .select("*")
    .maybeSingle();

  if (submissionInsertError && submissionInsertError.code !== "23505") {
    throw submissionInsertError;
  }

  let submission = insertedSubmission;
  if (!submission) {
    const { data: existingSubmission, error: existingSubmissionError } = await supabase
      .from("public_inquiry_submissions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("submission_key", input.submissionKey)
      .maybeSingle();
    if (existingSubmissionError || !existingSubmission) {
      throw existingSubmissionError ?? new Error("Unable to read existing inquiry submission.");
    }
    submission = existingSubmission;
    await supabase
      .from("public_inquiry_submissions")
      .update({ upload_token_hash: uploadTokenHash, token_expires_at: tokenExpiresAt })
      .eq("id", submission.id);
    submission.upload_token_hash = uploadTokenHash;
    submission.token_expires_at = tokenExpiresAt;
    submission = await updateSubmission(supabase, submission.id, {
      status: "initialized",
      upload_token_hash: uploadTokenHash,
      token_expires_at: tokenExpiresAt,
      email_mode: submission.email_mode ?? getConfiguredEmailMode(),
      intended_recipient: submission.intended_recipient ?? clientEmail,
      metadata: {
        ...(submission.metadata ?? {}),
        source: input.source,
        retry_at: now,
        test_identifier: input.testIdentifier ?? submission.test_identifier ?? null,
      },
    });
  }

  try {
    let client: any = null;
    if (submission.client_id) {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", submission.client_id)
        .maybeSingle();
      if (error) throw error;
      client = data;
    }

    if (!client) {
      const { data: existingClient, error: existingClientError } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("email", clientEmail)
        .maybeSingle();
      if (existingClientError) throw existingClientError;

      client =
        existingClient ??
        (
          await supabase
            .from("clients")
            .insert({
              organization_id: organizationId,
              display_name: input.clientName,
              email: clientEmail,
              phone: input.phone || null,
              status: "Prospect",
              source: input.source,
              notes: input.notes || null,
            })
            .select("*")
            .single()
        ).data;
    }

    if (!client?.id) throw new Error("Unable to create client profile.");
    if (submission.client_id !== client.id) {
      submission = await updateSubmission(supabase, submission.id, {
        client_id: client.id,
      });
    }

    let lead: any = null;
    if (submission.lead_id) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", submission.lead_id)
        .maybeSingle();
      if (error) throw error;
      lead = data;
    }

    if (!lead) {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          organization_id: organizationId,
          client_id: client.id,
          owner_id: owner?.id ?? null,
          stage: "New Inquiry",
          client_name_snapshot: input.clientName,
          email: clientEmail,
          phone: input.phone || null,
          event_type: input.eventType,
          event_date: input.eventDate || null,
          estimated_guest_count: input.estimatedGuestCount,
          budget_range: input.budgetRange,
          notes: input.notes,
          source: input.source,
        })
        .select("*")
        .single();
      if (error || !data) throw error ?? new Error("Unable to create lead.");
      lead = data;
    }

    if (submission.lead_id !== lead.id || submission.client_id !== client.id) {
      submission = await updateSubmission(supabase, submission.id, {
        client_id: client.id,
        lead_id: lead.id,
      });
    }

    let project: any = null;
    if (submission.project_id) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", submission.project_id)
        .maybeSingle();
      if (error) throw error;
      project = data;
    }

    if (!project) {
      const { data: existingProject, error: existingProjectError } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("lead_id", lead.id)
        .maybeSingle();
      if (existingProjectError) throw existingProjectError;

      project =
        existingProject ??
        (
          await supabase
            .from("projects")
            .insert({
              organization_id: organizationId,
              lead_id: lead.id,
              client_id: client.id,
              owner_id: owner?.id ?? null,
              name: `${input.clientName} ${input.eventType}`,
              stage: "Inquiry",
              last_activity_at: now,
            })
            .select("*")
            .single()
        ).data;
    }

    if (!project?.id) throw new Error("Unable to create project.");
    if (submission.project_id !== project.id) {
      submission = await updateSubmission(supabase, submission.id, {
        client_id: client.id,
        lead_id: lead.id,
        project_id: project.id,
      });
    }

    await supabase.from("leads").update({ project_id: project.id }).eq("id", lead.id);

    await ensureInspirationLinks({
      supabase,
      organizationId,
      projectId: project.id,
      leadId: lead.id,
      links: input.inspirationLinks,
    });

    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, body")
      .eq("organization_id", organizationId)
      .eq("template_type", "inquiry_acknowledgment")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    const subject = mergeTemplate(template?.subject ?? "We received your {{event_type}} inquiry", {
      client_name: input.clientName,
      event_type: input.eventType,
      event_date: input.eventDate || "your preferred date",
      planner_name: owner?.full_name ?? organization.name,
      organization_name: organization.name,
      consultation_link: process.env.EASE_EVENTS_CONSULTATION_LINK || "",
    });

    let thread: any = null;
    if (submission.thread_id) {
      const { data, error } = await supabase
        .from("communication_threads")
        .select("*")
        .eq("id", submission.thread_id)
        .maybeSingle();
      if (error) throw error;
      thread = data;
    }

    if (!thread) {
      const { data: existingThread, error: existingThreadError } = await supabase
        .from("communication_threads")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("project_id", project.id)
        .eq("channel", "Email")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existingThreadError) throw existingThreadError;

      thread =
        existingThread ??
        (
          await supabase
            .from("communication_threads")
            .insert({
              organization_id: organizationId,
              project_id: project.id,
              lead_id: lead.id,
              event_id: null,
              assigned_to_id: owner?.id ?? null,
              subject,
              client_name_snapshot: input.clientName,
              participants: [clientEmail, owner?.email ?? ""].filter(Boolean),
              channel: "Email",
              status: "Waiting on Client",
              integration_source: "EaseEvents inquiry acknowledgment",
              preview: "Inquiry acknowledgment prepared.",
              unread_count: 0,
              last_activity_at: now,
            })
            .select("*")
            .single()
        ).data;
    }

    if (!thread?.id) throw new Error("Unable to create thread.");
    if (submission.thread_id !== thread.id) {
      submission = await updateSubmission(supabase, submission.id, {
        client_id: client.id,
        lead_id: lead.id,
        project_id: project.id,
        thread_id: thread.id,
      });
    }

    let acknowledgment: Awaited<ReturnType<typeof recordAcknowledgmentEmail>> | null = null;
    if (!submission.acknowledgment_message_id) {
      acknowledgment = await recordAcknowledgmentEmail({
        supabase,
        organization,
        owner,
        input,
        lead,
        project,
        thread,
      });
    } else {
      const { data: message, error: messageError } = await supabase
        .from("communication_messages")
        .select("*")
        .eq("id", submission.acknowledgment_message_id)
        .maybeSingle();
      if (messageError) throw messageError;
      acknowledgment = {
        message,
        mode: submission.email_mode,
        status: submission.email_status,
        intendedRecipient: submission.intended_recipient,
        actualRecipient: submission.actual_recipient,
        subject: submission.email_subject,
        error: submission.email_error,
      };
    }

    await ensureFollowUpReminder({
      supabase,
      organizationId,
      projectId: project.id,
      leadId: lead.id,
      ownerId: owner?.id ?? null,
      clientName: input.clientName,
      acknowledgmentStatus: acknowledgment?.status,
      testIdentifier: input.testIdentifier,
    });

    submission = await updateSubmission(supabase, submission.id, {
      client_id: client.id,
      lead_id: lead.id,
      project_id: project.id,
      thread_id: thread.id,
      acknowledgment_message_id:
        acknowledgment?.message?.id ?? submission.acknowledgment_message_id,
      email_mode: acknowledgment?.mode ?? submission.email_mode,
      email_status: acknowledgment?.status ?? submission.email_status,
      intended_recipient: acknowledgment?.intendedRecipient ?? submission.intended_recipient,
      actual_recipient: acknowledgment?.actualRecipient ?? submission.actual_recipient,
      email_subject: acknowledgment?.subject ?? submission.email_subject,
      email_error: acknowledgment?.error ?? submission.email_error,
      metadata: {
        ...(submission.metadata ?? {}),
        source: input.source,
        test_identifier: input.testIdentifier,
      },
    });

    const fullSubmission = {
      ...submission,
      organization_id: organizationId,
      client_id: client.id,
      lead_id: lead.id,
      project_id: project.id,
      thread_id: thread.id,
      test_identifier: input.testIdentifier ?? null,
    };
    const uploadSlots = await upsertUploadSlots(supabase, fullSubmission, input.files);

    return {
      lead: toLead({ ...lead, project_id: project.id }),
      client: toClient(client),
      project: toProject(project),
      thread: toThread(thread),
      uploadToken,
      tokenExpiresAt,
      uploadSlots,
      acknowledgmentStatus: acknowledgment?.status ?? submission.email_status,
      acknowledgmentError: acknowledgment?.error ?? submission.email_error,
      emailMode: acknowledgment?.mode ?? submission.email_mode,
      idempotent: !insertedSubmission,
    };
  } catch (error) {
    await supabase
      .from("public_inquiry_submissions")
      .update({
        status: "failed",
        email_status: "Failed",
        email_error: error instanceof Error ? error.message : "Inquiry initialization failed.",
      })
      .eq("id", submission.id);
    throw error;
  }
}

export async function getSubmissionByUploadToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(token);
  const { data: submission, error } = await supabase
    .from("public_inquiry_submissions")
    .select("*")
    .eq("upload_token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!submission) throw new Error("Upload token is invalid.");
  if (new Date(submission.token_expires_at).getTime() < Date.now()) {
    throw new Error("Upload token has expired.");
  }
  return { supabase, submission };
}

export function detectMimeFromSignature(bytes: Uint8Array) {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  return "application/octet-stream";
}

export async function cleanupAbandonedPublicInquiryUploads(supabase = createSupabaseAdminClient()) {
  const { data: uploads, error } = await supabase
    .from("public_inquiry_uploads")
    .select("id, storage_path, status")
    .lt("expires_at", new Date().toISOString())
    .in("status", ["pending", "uploading", "failed"]);
  if (error) throw error;

  const storagePaths = (uploads ?? [])
    .filter((upload) => upload.storage_path && upload.status !== "pending")
    .map((upload) => upload.storage_path);
  if (storagePaths.length) {
    await supabase.storage.from("event-files").remove(storagePaths);
  }
  if (uploads?.length) {
    await supabase
      .from("public_inquiry_uploads")
      .update({ status: "abandoned", error_message: "Upload session expired." })
      .in(
        "id",
        uploads.map((upload) => upload.id),
      );
  }

  return uploads?.length ?? 0;
}
