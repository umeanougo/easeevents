import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import {
  createSupabaseAdminClient,
  getConfiguredEmailMode,
  hashToken,
  normalizeEmail,
} from "./public-inquiry.server";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

const LineItemSchema = z.object({
  id: z.string().optional(),
  category: z.string().optional(),
  name: z.string().min(1).max(220),
  description: z.string().max(2000).optional().default(""),
  quantity: z.number().min(0).default(1),
  unitPrice: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).optional(),
  isOptional: z.boolean().default(false),
  isSelected: z.boolean().default(true),
  clientVisible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const PaymentTermSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(160),
  paymentType: z.enum(["Deposit", "Installment", "Final", "Custom"]).default("Deposit"),
  amountType: z.enum(["Fixed", "Percent"]).default("Fixed"),
  amountValue: z.number().min(0).default(0),
  dueRule: z
    .enum(["On Acceptance", "Fixed Date", "Before Event", "After Acceptance"])
    .default("On Acceptance"),
  dueDate: z.string().optional().default(""),
  dueOffsetDays: z.number().int().optional(),
  requiredForBooking: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const ProposalDraftSchema = z.object({
  projectId: z.string().uuid(),
  proposalId: z.string().uuid().optional(),
  title: z.string().min(1).max(220),
  introduction: z.string().max(8000).optional().default(""),
  scope: z.string().max(12000).optional().default(""),
  terms: z.string().max(12000).optional().default(""),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  validUntil: z.string().optional().default(""),
  lineItems: z.array(LineItemSchema).min(1),
  paymentTerms: z.array(PaymentTermSchema).default([]),
});

export const ProposalSendSchema = z.object({
  proposalId: z.string().uuid(),
  idempotencyKey: z.string().max(160).optional(),
});

export const ProposalReviewResponseSchema = z.object({
  responseType: z.enum(["Accepted", "Changes Requested", "Declined"]),
  responderName: z.string().min(1).max(160),
  responderEmail: z.string().email().max(255),
  comment: z.string().max(4000).optional().default(""),
  selectedLineItemIds: z.array(z.string().uuid()).optional().default([]),
  acceptanceStatement: z.string().max(2000).optional().default(""),
  idempotencyKey: z.string().max(160).optional(),
});

export const OfflinePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.string().min(1).max(80),
  paidAt: z.string().optional(),
  reference: z.string().max(220).optional().default(""),
  note: z.string().max(1000).optional().default(""),
  idempotencyKey: z.string().max(160).optional(),
});

export const ManualApprovalSchema = z.object({
  projectId: z.string().uuid(),
  note: z.string().max(1000).optional().default(""),
});

export type ProposalDraftInput = z.infer<typeof ProposalDraftSchema>;

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function calculateLineTotal(item: z.infer<typeof LineItemSchema>) {
  const subtotal = item.quantity * item.unitPrice;
  const afterDiscount = Math.max(subtotal - item.discountAmount, 0);
  const tax = item.taxRate ? afterDiscount * (item.taxRate / 100) : 0;
  return money(afterDiscount + tax);
}

function calculateVersionTotals(input: ProposalDraftInput) {
  const visibleItems = input.lineItems.filter((item) => item.clientVisible && item.isSelected);
  const subtotal = money(
    visibleItems.reduce(
      (sum, item) => sum + Math.max(item.quantity * item.unitPrice - item.discountAmount, 0),
      0,
    ),
  );
  const itemTax = visibleItems.reduce((sum, item) => {
    const taxableAmount = Math.max(item.quantity * item.unitPrice - item.discountAmount, 0);
    return sum + (item.taxRate ? taxableAmount * (item.taxRate / 100) : 0);
  }, 0);
  const taxAmount = money(input.taxAmount + itemTax);
  const discountAmount = money(input.discountAmount);
  const totalAmount = money(Math.max(subtotal - discountAmount + taxAmount, 0));
  return { subtotal, discountAmount, taxAmount, totalAmount };
}

function calculatePaymentAmount(
  term: z.infer<typeof PaymentTermSchema>,
  proposalTotal: number,
  acceptedLineItemsTotal?: number,
) {
  const total = acceptedLineItemsTotal ?? proposalTotal;
  if (term.amountType === "Percent") return money(total * (term.amountValue / 100));
  return money(term.amountValue);
}

function documentHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function getBaseUrl(request: Request) {
  const configured = process.env.EASE_EVENTS_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function mergeTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = values[key];
    return value?.trim() ? value : "";
  });
}

async function getStaffContext(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Sign in with a Supabase staff account first."), {
      status: 401,
    });
  }

  const supabase = createSupabaseAdminClient();
  const token = authHeader.slice("Bearer ".length).trim();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) throw Object.assign(new Error("Unauthorized."), { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, organization_id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw Object.assign(new Error("EaseEvents user profile not found."), { status: 403 });
  }
  if (profile.role !== "admin" && profile.role !== "planner") {
    throw Object.assign(new Error("Only admins and planners can perform this action."), {
      status: 403,
    });
  }

  return { supabase, profile };
}

async function insertActivity(
  supabase: SupabaseAdminClient,
  input: {
    organizationId: string;
    projectId: string;
    actorId?: string | null;
    activityType?: "system" | "email" | "call" | "note" | "meeting" | "file" | "task" | "status";
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("project_activity_events").insert({
    organization_id: input.organizationId,
    project_id: input.projectId,
    actor_id: input.actorId ?? null,
    activity_type: input.activityType ?? "system",
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  });

  await supabase
    .from("projects")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", input.projectId);
}

async function maybeFetchById(
  supabase: SupabaseAdminClient,
  tableName: string,
  id?: string | null,
) {
  if (!id) return null;
  const { data, error } = await supabase.from(tableName).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function maybeFetchByProjectId(
  supabase: SupabaseAdminClient,
  tableName: string,
  projectId: string,
) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getProjectWithRelations(
  supabase: SupabaseAdminClient,
  projectId: string,
  organizationId?: string,
) {
  let query = supabase.from("projects").select("*").eq("id", projectId);
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data: project, error } = await query.maybeSingle();
  if (error) throw error;
  if (!project) throw Object.assign(new Error("Project not found."), { status: 404 });

  const [lead, event, organization] = await Promise.all([
    maybeFetchById(supabase, "leads", project.lead_id).then(
      (record) => record ?? maybeFetchByProjectId(supabase, "leads", project.id),
    ),
    maybeFetchById(supabase, "events", project.event_id).then(
      (record) => record ?? maybeFetchByProjectId(supabase, "events", project.id),
    ),
    maybeFetchById(supabase, "organizations", project.organization_id),
  ]);
  const client = await maybeFetchById(
    supabase,
    "clients",
    project.client_id ?? event?.client_id ?? lead?.client_id,
  );

  return {
    ...project,
    leads: lead,
    events: event,
    clients: client,
    organizations: organization,
  };
}

async function getProjectBundle(
  supabase: SupabaseAdminClient,
  projectId: string,
  organizationId: string,
) {
  return getProjectWithRelations(supabase, projectId, organizationId);
}

function createProposalNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PROP-${date}-${suffix}`;
}

function getClientIdentity(bundle: any) {
  const lead = Array.isArray(bundle.leads) ? bundle.leads[0] : bundle.leads;
  const event = Array.isArray(bundle.events) ? bundle.events[0] : bundle.events;
  const client = Array.isArray(bundle.clients) ? bundle.clients[0] : bundle.clients;
  const displayName =
    client?.display_name ?? lead?.client_name_snapshot ?? event?.client_name_snapshot ?? "Client";
  const email = normalizeEmail(client?.email ?? lead?.email ?? event?.client_email ?? "");
  return { lead, event, client, displayName, email };
}

export async function createOrReviseProposal(request: Request, input: ProposalDraftInput) {
  const { supabase, profile } = await getStaffContext(request);
  const bundle = await getProjectBundle(supabase, input.projectId, profile.organization_id);
  const { lead, event, client } = getClientIdentity(bundle);
  const totals = calculateVersionTotals(input);

  let proposal: any;
  let versionNumber = 1;

  if (input.proposalId) {
    const { data: existing, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", input.proposalId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();
    if (error || !existing) throw Object.assign(new Error("Proposal not found."), { status: 404 });

    if (existing.status === "Accepted" || existing.status === "Declined") {
      throw Object.assign(new Error("Accepted or declined proposals cannot be revised."), {
        status: 409,
      });
    }

    const { data: latestVersion } = await supabase
      .from("proposal_versions")
      .select("version_number")
      .eq("proposal_id", existing.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    versionNumber =
      Number(latestVersion?.version_number ?? existing.current_version_number ?? 1) + 1;

    const { data: updated, error: updateError } = await supabase
      .from("proposals")
      .update({
        title: input.title,
        status: "Draft",
        valid_until: input.validUntil || null,
        metadata: {
          ...(existing.metadata ?? {}),
          revised_at: new Date().toISOString(),
          previous_status: existing.status,
        },
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    proposal = updated;
  } else {
    const validUntil =
      input.validUntil ||
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: created, error } = await supabase
      .from("proposals")
      .insert({
        organization_id: profile.organization_id,
        project_id: input.projectId,
        lead_id: lead?.id ?? bundle.lead_id ?? null,
        event_id: event?.id ?? bundle.event_id ?? null,
        client_id: client?.id ?? bundle.client_id ?? null,
        proposal_number: createProposalNumber(),
        title: input.title,
        status: "Draft",
        currency: bundle.organizations?.currency ?? "CAD",
        current_version_number: 1,
        valid_until: validUntil,
        created_by: profile.id,
        metadata: { source: "phase3_proposal_builder" },
      })
      .select("*")
      .single();
    if (error) throw error;
    proposal = created;
  }

  const versionSnapshot = {
    title: input.title,
    totals,
    lineItems: input.lineItems,
    paymentTerms: input.paymentTerms,
    validUntil: input.validUntil || proposal.valid_until,
  };

  const { data: version, error: versionError } = await supabase
    .from("proposal_versions")
    .insert({
      organization_id: profile.organization_id,
      proposal_id: proposal.id,
      version_number: versionNumber,
      introduction: input.introduction || null,
      scope: input.scope || null,
      terms: input.terms || null,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      snapshot: versionSnapshot,
      document_hash: documentHash(versionSnapshot),
      created_by: profile.id,
    })
    .select("*")
    .single();
  if (versionError) throw versionError;

  if (input.lineItems.length) {
    const { error } = await supabase.from("proposal_line_items").insert(
      input.lineItems.map((item, index) => ({
        organization_id: profile.organization_id,
        proposal_version_id: version.id,
        category: item.category || null,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        tax_rate: item.taxRate ?? null,
        total_amount: calculateLineTotal(item),
        is_optional: item.isOptional,
        is_selected: item.isSelected,
        client_visible: item.clientVisible,
        sort_order: item.sortOrder || index,
      })),
    );
    if (error) throw error;
  }

  if (input.paymentTerms.length) {
    const { error } = await supabase.from("proposal_payment_terms").insert(
      input.paymentTerms.map((term, index) => ({
        organization_id: profile.organization_id,
        proposal_version_id: version.id,
        label: term.label,
        payment_type: term.paymentType,
        amount_type: term.amountType,
        amount_value: term.amountValue,
        calculated_amount: calculatePaymentAmount(term, totals.totalAmount),
        due_rule: term.dueRule,
        due_date: term.dueDate || null,
        due_offset_days: term.dueOffsetDays ?? null,
        required_for_booking: term.requiredForBooking,
        sort_order: term.sortOrder || index,
      })),
    );
    if (error) throw error;
  }

  const { data: finalizedProposal, error: proposalUpdateError } = await supabase
    .from("proposals")
    .update({
      current_version_id: version.id,
      current_version_number: version.version_number,
      status: "Draft",
      valid_until: input.validUntil || proposal.valid_until,
    })
    .eq("id", proposal.id)
    .select("*")
    .single();
  if (proposalUpdateError) throw proposalUpdateError;

  await supabase
    .from("leads")
    .update({ stage: "Proposal Draft" })
    .eq("id", lead?.id ?? bundle.lead_id ?? "")
    .eq("organization_id", profile.organization_id);
  await supabase
    .from("projects")
    .update({ stage: "Proposal" })
    .eq("id", input.projectId)
    .eq("organization_id", profile.organization_id);
  await insertActivity(supabase, {
    organizationId: profile.organization_id,
    projectId: input.projectId,
    actorId: profile.id,
    activityType: "status",
    title: input.proposalId ? "Proposal revised" : "Proposal drafted",
    body: `${finalizedProposal.proposal_number} v${version.version_number} is ready to send.`,
    metadata: { proposal_id: finalizedProposal.id, proposal_version_id: version.id },
  });

  return { proposal: finalizedProposal, version };
}

async function getProposalBundle(supabase: SupabaseAdminClient, proposalId: string) {
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select(
      "*, projects(*), leads(*), events(*), clients(*), organizations(id,name,currency,logo_url)",
    )
    .eq("id", proposalId)
    .maybeSingle();
  if (error || !proposal) throw Object.assign(new Error("Proposal not found."), { status: 404 });

  const { data: version, error: versionError } = await supabase
    .from("proposal_versions")
    .select("*")
    .eq("id", proposal.current_version_id)
    .maybeSingle();
  if (versionError || !version) {
    throw Object.assign(new Error("Proposal version not found."), { status: 404 });
  }

  const [{ data: lineItems }, { data: paymentTerms }, { data: responses }] = await Promise.all([
    supabase
      .from("proposal_line_items")
      .select("*")
      .eq("proposal_version_id", version.id)
      .order("sort_order"),
    supabase
      .from("proposal_payment_terms")
      .select("*")
      .eq("proposal_version_id", version.id)
      .order("sort_order"),
    supabase
      .from("proposal_responses")
      .select("*")
      .eq("proposal_id", proposal.id)
      .order("responded_at", { ascending: false }),
  ]);

  return {
    proposal,
    version,
    lineItems: lineItems ?? [],
    paymentTerms: paymentTerms ?? [],
    responses: responses ?? [],
  };
}

async function renderProposalEmail(
  supabase: SupabaseAdminClient,
  bundle: any,
  reviewUrl: string,
  plannerName: string,
) {
  const proposal = bundle.proposal;
  const projectBundle = proposal.projects;
  const lead = proposal.leads;
  const event = proposal.events;
  const client = proposal.clients;
  const organization = proposal.organizations;
  const mergeValues = {
    client_name:
      client?.display_name ?? lead?.client_name_snapshot ?? event?.client_name_snapshot ?? "there",
    event_type: lead?.event_type ?? event?.event_type ?? "event",
    event_date: lead?.event_date ?? event?.event_date ?? "your event date",
    planner_name: plannerName,
    organization_name: organization?.name ?? "EaseEvents",
    proposal_link: reviewUrl,
    valid_until: proposal.valid_until ?? "the listed expiration date",
    project_name: projectBundle?.name ?? proposal.title,
  };

  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("organization_id", proposal.organization_id)
    .eq("template_type", "proposal_sent")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    subject: mergeTemplate(
      template?.subject ?? "Your {{event_type}} proposal is ready",
      mergeValues,
    ),
    body: mergeTemplate(
      template?.body ??
        "Hi {{client_name}},\n\nYour proposal is ready.\n\nReview it here: {{proposal_link}}",
      mergeValues,
    ),
    intendedRecipient: normalizeEmail(client?.email ?? lead?.email ?? event?.client_email ?? ""),
  };
}

async function ensureProjectThread(supabase: SupabaseAdminClient, proposal: any) {
  const { data: existing } = await supabase
    .from("communication_threads")
    .select("*")
    .eq("organization_id", proposal.organization_id)
    .eq("project_id", proposal.project_id)
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const clientName =
    proposal.clients?.display_name ??
    proposal.leads?.client_name_snapshot ??
    proposal.events?.client_name_snapshot ??
    "Client";
  const { data: thread, error } = await supabase
    .from("communication_threads")
    .insert({
      organization_id: proposal.organization_id,
      project_id: proposal.project_id,
      lead_id: proposal.lead_id ?? null,
      event_id: proposal.event_id ?? null,
      assigned_to_id: proposal.projects?.owner_id ?? null,
      subject: `Proposal: ${proposal.title}`,
      client_name_snapshot: clientName,
      participants: [
        proposal.clients?.email ?? proposal.leads?.email ?? proposal.events?.client_email,
      ].filter(Boolean),
      channel: "Email",
      status: "Waiting on Client",
      integration_source: "EaseEvents",
      preview: "Proposal conversation opened.",
      unread_count: 0,
      last_activity_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return thread;
}

async function recordProposalEmail(params: {
  supabase: SupabaseAdminClient;
  proposalBundle: any;
  plannerId: string;
  plannerName: string;
  request: Request;
  reviewUrl: string;
  idempotencyKey?: string;
}) {
  const { supabase, proposalBundle, plannerId, plannerName, request, reviewUrl, idempotencyKey } =
    params;
  const { proposal } = proposalBundle;
  const mode = getConfiguredEmailMode();
  const rendered = await renderProposalEmail(supabase, proposalBundle, reviewUrl, plannerName);
  const thread = await ensureProjectThread(supabase, proposal);
  const now = new Date().toISOString();
  const baseSubject = rendered.subject;
  let subject = baseSubject;
  let actualRecipient: string | null = null;
  let deliveryStatus = "Suppressed";
  let deliveryError: string | null = null;

  try {
    if (mode === "test") {
      actualRecipient = normalizeEmail(process.env.EASE_EVENTS_TEST_EMAIL ?? "");
      if (!actualRecipient) {
        deliveryStatus = "Retry Required";
        deliveryError = "EASE_EVENTS_TEST_EMAIL is required when EASE_EVENTS_EMAIL_MODE=test.";
      } else {
        subject = `${process.env.EASE_EVENTS_TEST_EMAIL_PREFIX ?? "[EaseEvents Test]"} ${baseSubject}`;
        const { error } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: randomBytes(12).toString("hex"),
            to: actualRecipient,
            from: `${proposal.organizations?.name ?? "EaseEvents"} <noreply@easeops.ca>`,
            sender_domain: "easeops.ca",
            subject,
            text: rendered.body,
            html: rendered.body.replace(/\n/g, "<br />"),
            purpose: "transactional",
            label: "easeevents-proposal-sent-test",
            idempotency_key:
              idempotencyKey ??
              `easeevents-proposal-send-${proposal.id}-${proposal.current_version_id}`,
            intended_recipient: rendered.intendedRecipient,
            queued_at: now,
          },
        });
        if (error) throw error;
        deliveryStatus = "Test Redirected";
      }
    } else if (mode === "live") {
      actualRecipient = rendered.intendedRecipient;
      const { error } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: randomBytes(12).toString("hex"),
          to: actualRecipient,
          from: `${proposal.organizations?.name ?? "EaseEvents"} <noreply@easeops.ca>`,
          sender_domain: "easeops.ca",
          subject,
          text: rendered.body,
          html: rendered.body.replace(/\n/g, "<br />"),
          purpose: "transactional",
          label: "easeevents-proposal-sent",
          idempotency_key:
            idempotencyKey ??
            `easeevents-proposal-send-${proposal.id}-${proposal.current_version_id}`,
          queued_at: now,
        },
      });
      if (error) throw error;
      deliveryStatus = "Queued";
    }
  } catch (error) {
    deliveryStatus = "Retry Required";
    deliveryError = error instanceof Error ? error.message : "Unable to enqueue proposal email.";
  }

  const { data: message, error: messageError } = await supabase
    .from("communication_messages")
    .insert({
      organization_id: proposal.organization_id,
      project_id: proposal.project_id,
      lead_id: proposal.lead_id ?? null,
      event_id: proposal.event_id ?? null,
      thread_id: thread.id,
      author_id: plannerId,
      direction: "Outbound",
      body: rendered.body,
      summary: `Proposal ${proposal.proposal_number} v${proposal.current_version_number} sent.`,
      visibility: "Client",
      sent_at: now,
      delivery_status: deliveryStatus,
      delivery_mode: mode,
      delivery_error: deliveryError,
      metadata: {
        proposal_id: proposal.id,
        proposal_version_id: proposal.current_version_id,
        proposal_url: reviewUrl,
        intended_recipient: rendered.intendedRecipient,
        actual_recipient: actualRecipient,
        subject,
        base_subject: baseSubject,
        request_url: request.url,
      },
    })
    .select("*")
    .single();
  if (messageError) throw messageError;

  await supabase
    .from("communication_threads")
    .update({
      preview: `Proposal sent: ${proposal.title}`,
      status: "Waiting on Client",
      last_activity_at: now,
    })
    .eq("id", thread.id);

  return {
    message,
    deliveryStatus,
    deliveryError,
    mode,
    intendedRecipient: rendered.intendedRecipient,
  };
}

export async function sendProposal(request: Request, input: z.infer<typeof ProposalSendSchema>) {
  const { supabase, profile } = await getStaffContext(request);
  const bundle = await getProposalBundle(supabase, input.proposalId);
  const { proposal, version } = bundle;
  if (proposal.organization_id !== profile.organization_id) {
    throw Object.assign(new Error("Proposal not found."), { status: 404 });
  }
  if (proposal.current_version_id !== version.id) {
    throw Object.assign(new Error("Only the active proposal version can be sent."), {
      status: 409,
    });
  }
  if (proposal.status === "Accepted" || proposal.status === "Declined") {
    throw Object.assign(new Error("This proposal is already closed."), { status: 409 });
  }

  const reviewToken = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: tokenRow, error: tokenError } = await supabase
    .from("proposal_review_tokens")
    .insert({
      organization_id: proposal.organization_id,
      proposal_id: proposal.id,
      proposal_version_id: version.id,
      token_hash: hashToken(reviewToken),
      expires_at: expiresAt,
      created_by: profile.id,
    })
    .select("*")
    .single();
  if (tokenError) throw tokenError;

  const now = new Date().toISOString();
  await supabase
    .from("proposal_versions")
    .update({
      immutable_at: version.immutable_at ?? now,
      document_hash: version.document_hash ?? documentHash(version.snapshot ?? {}),
    })
    .eq("id", version.id);
  const { data: updatedProposal, error: updateError } = await supabase
    .from("proposals")
    .update({ status: "Sent", sent_at: proposal.sent_at ?? now })
    .eq("id", proposal.id)
    .select("*")
    .single();
  if (updateError) throw updateError;

  await supabase
    .from("leads")
    .update({ stage: "Proposal Sent" })
    .eq("id", proposal.lead_id ?? "")
    .eq("organization_id", proposal.organization_id);

  const reviewUrl = `${getBaseUrl(request)}/ease-events/proposals/${reviewToken}`;
  const emailResult = await recordProposalEmail({
    supabase,
    proposalBundle: { ...bundle, proposal: { ...proposal, ...updatedProposal } },
    plannerId: profile.id,
    plannerName: profile.full_name,
    request,
    reviewUrl,
    idempotencyKey: input.idempotencyKey,
  });

  await insertActivity(supabase, {
    organizationId: proposal.organization_id,
    projectId: proposal.project_id,
    actorId: profile.id,
    activityType: "email",
    title: `Proposal sent: ${updatedProposal.proposal_number}`,
    body: `Delivery status: ${emailResult.deliveryStatus}.`,
    metadata: {
      proposal_id: proposal.id,
      proposal_version_id: version.id,
      token_id: tokenRow.id,
      delivery_status: emailResult.deliveryStatus,
    },
  });

  return {
    proposal: updatedProposal,
    reviewUrl,
    tokenExpiresAt: expiresAt,
    deliveryStatus: emailResult.deliveryStatus,
    deliveryError: emailResult.deliveryError,
    emailMode: emailResult.mode,
  };
}

async function getReviewBundleByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data: tokenRow, error } = await supabase
    .from("proposal_review_tokens")
    .select("*")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !tokenRow)
    throw Object.assign(new Error("Proposal link not found."), { status: 404 });
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error("This proposal link has expired."), { status: 410 });
  }

  const bundle = await getProposalBundle(supabase, tokenRow.proposal_id);
  if (bundle.proposal.current_version_id !== tokenRow.proposal_version_id) {
    throw Object.assign(new Error("A newer proposal version is available."), { status: 409 });
  }

  await supabase
    .from("proposal_review_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return { supabase, tokenRow, ...bundle };
}

function publicProposalPayload(bundle: any, token: string) {
  const proposal = bundle.proposal;
  const lead = proposal.leads;
  const event = proposal.events;
  const client = proposal.clients;
  const org = proposal.organizations;
  return {
    token,
    organization: {
      name: org?.name ?? "EaseEvents",
      logoUrl: org?.logo_url ?? undefined,
      currency: proposal.currency,
    },
    project: {
      id: proposal.project_id,
      name: proposal.projects?.name ?? proposal.title,
      eventType: lead?.event_type ?? event?.event_type ?? "",
      eventDate: lead?.event_date ?? event?.event_date ?? "",
      clientName:
        client?.display_name ?? lead?.client_name_snapshot ?? event?.client_name_snapshot ?? "",
      clientEmail: client?.email ?? lead?.email ?? event?.client_email ?? "",
    },
    proposal: {
      id: proposal.id,
      proposalNumber: proposal.proposal_number,
      title: proposal.title,
      status: proposal.status,
      validUntil: proposal.valid_until,
      currentVersionId: proposal.current_version_id,
      currentVersionNumber: proposal.current_version_number,
      sentAt: proposal.sent_at,
      viewedAt: proposal.viewed_at,
      acceptedAt: proposal.accepted_at,
    },
    version: {
      id: bundle.version.id,
      versionNumber: bundle.version.version_number,
      introduction: bundle.version.introduction,
      scope: bundle.version.scope,
      terms: bundle.version.terms,
      subtotal: Number(bundle.version.subtotal ?? 0),
      discountAmount: Number(bundle.version.discount_amount ?? 0),
      taxAmount: Number(bundle.version.tax_amount ?? 0),
      totalAmount: Number(bundle.version.total_amount ?? 0),
      documentHash: bundle.version.document_hash,
    },
    lineItems: bundle.lineItems
      .filter((item: any) => item.client_visible)
      .map((item: any) => ({
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unit_price ?? 0),
        discountAmount: Number(item.discount_amount ?? 0),
        taxRate: item.tax_rate == null ? undefined : Number(item.tax_rate),
        totalAmount: Number(item.total_amount ?? 0),
        isOptional: Boolean(item.is_optional),
        isSelected: Boolean(item.is_selected),
        sortOrder: Number(item.sort_order ?? 0),
      })),
    paymentTerms: bundle.paymentTerms.map((term: any) => ({
      id: term.id,
      label: term.label,
      paymentType: term.payment_type,
      amountType: term.amount_type,
      amountValue: Number(term.amount_value ?? 0),
      calculatedAmount: Number(term.calculated_amount ?? 0),
      dueRule: term.due_rule,
      dueDate: term.due_date,
      dueOffsetDays: term.due_offset_days,
      requiredForBooking: Boolean(term.required_for_booking),
      sortOrder: Number(term.sort_order ?? 0),
    })),
    responses: bundle.responses.map((response: any) => ({
      id: response.id,
      responseType: response.response_type,
      comment: response.comment,
      responderName: response.responder_name,
      responderEmail: response.responder_email,
      respondedAt: response.responded_at,
    })),
  };
}

export async function getProposalReview(token: string) {
  const bundle = await getReviewBundleByToken(token);
  const now = new Date().toISOString();

  if (!bundle.proposal.viewed_at && bundle.proposal.status === "Sent") {
    await bundle.supabase
      .from("proposals")
      .update({ status: "Viewed", viewed_at: now })
      .eq("id", bundle.proposal.id);
    await bundle.supabase.from("proposal_responses").insert({
      organization_id: bundle.proposal.organization_id,
      proposal_id: bundle.proposal.id,
      proposal_version_id: bundle.version.id,
      project_id: bundle.proposal.project_id,
      client_id: bundle.proposal.client_id ?? null,
      response_type: "Viewed",
      responded_at: now,
      metadata: { source: "proposal_review_link" },
    });
    await insertActivity(bundle.supabase, {
      organizationId: bundle.proposal.organization_id,
      projectId: bundle.proposal.project_id,
      activityType: "status",
      title: "Proposal viewed",
      body: `${bundle.proposal.proposal_number} v${bundle.version.version_number} was opened by the client.`,
      metadata: { proposal_id: bundle.proposal.id, proposal_version_id: bundle.version.id },
    });
  }

  return publicProposalPayload(bundle, token);
}

function getAcceptedLineItemTotal(lineItems: any[], selectedLineItemIds: string[]) {
  return money(
    lineItems
      .filter((item) => !item.is_optional || selectedLineItemIds.includes(item.id))
      .reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0),
  );
}

async function generateInvoicesForAcceptedProposal(
  supabase: SupabaseAdminClient,
  input: {
    proposal: any;
    version: any;
    paymentTerms: any[];
    selectedLineItemIds: string[];
    lineItems: any[];
  },
) {
  const acceptedTotal = getAcceptedLineItemTotal(input.lineItems, input.selectedLineItemIds);
  const invoices = [];
  for (const term of input.paymentTerms) {
    const amount = calculatePaymentAmount(
      {
        label: term.label,
        paymentType: term.payment_type,
        amountType: term.amount_type,
        amountValue: Number(term.amount_value ?? 0),
        dueRule: term.due_rule,
        dueDate: term.due_date ?? "",
        dueOffsetDays: term.due_offset_days ?? undefined,
        requiredForBooking: Boolean(term.required_for_booking),
        sortOrder: Number(term.sort_order ?? 0),
      },
      Number(input.version.total_amount ?? 0),
      acceptedTotal,
    );
    if (amount <= 0) continue;

    const dueDate =
      term.due_date ??
      (term.due_rule === "After Acceptance" && term.due_offset_days != null
        ? new Date(Date.now() + Number(term.due_offset_days) * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)
        : new Date().toISOString().slice(0, 10));

    const { data: existingInvoice, error: existingError } = await supabase
      .from("invoices")
      .select("*")
      .eq("organization_id", input.proposal.organization_id)
      .eq("proposal_payment_term_id", term.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingInvoice) {
      invoices.push(existingInvoice);
      continue;
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        organization_id: input.proposal.organization_id,
        project_id: input.proposal.project_id,
        event_id: input.proposal.event_id ?? null,
        client_id: input.proposal.client_id ?? null,
        proposal_id: input.proposal.id,
        proposal_version_id: input.version.id,
        proposal_payment_term_id: term.id,
        invoice_number: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${term.id.slice(0, 8).toUpperCase()}`,
        invoice_type: term.payment_type === "Installment" ? "Interim" : term.payment_type,
        amount,
        paid_amount: 0,
        due_date: dueDate,
        status: "Draft",
        notes: `${term.label} generated from accepted proposal ${input.proposal.proposal_number}.`,
        metadata: {
          generated_from: "accepted_proposal",
          required_for_booking: Boolean(term.required_for_booking),
          accepted_line_item_total: acceptedTotal,
        },
      })
      .select("*")
      .single();
    if (error) throw error;
    invoices.push(invoice);
  }
  return invoices;
}

async function getBookingRequirements(supabase: SupabaseAdminClient, projectId: string) {
  const project = await getProjectWithRelations(supabase, projectId);

  const { data: settings } = await supabase
    .from("organization_booking_settings")
    .select("*")
    .eq("organization_id", project.organization_id)
    .maybeSingle();

  const { data: acceptedProposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "Accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: acceptedResponse } = acceptedProposal
    ? await supabase
        .from("proposal_responses")
        .select("*")
        .eq("proposal_id", acceptedProposal.id)
        .eq("response_type", "Accepted")
        .order("responded_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: invoices } = acceptedProposal
    ? await supabase.from("invoices").select("*").eq("proposal_id", acceptedProposal.id)
    : { data: [] };

  const { data: manualApproval } = await supabase
    .from("project_booking_approvals")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const depositInvoices = (invoices ?? []).filter(
    (invoice: any) => invoice.invoice_type === "Deposit",
  );
  const depositIssued = depositInvoices.length > 0;
  const depositPaid = depositInvoices.some(
    (invoice: any) => Number(invoice.balance_due ?? invoice.amount - invoice.paid_amount) <= 0,
  );

  const config = settings ?? {
    require_proposal_acceptance: true,
    require_terms_acceptance: true,
    require_deposit_invoice_issued: true,
    require_deposit_paid: true,
    require_manual_planner_approval: false,
  };
  const checks = [
    {
      key: "proposal_accepted",
      label: "Proposal accepted",
      required: Boolean(config.require_proposal_acceptance),
      complete: Boolean(acceptedProposal),
      responsibleParty: "Client",
    },
    {
      key: "terms_accepted",
      label: "Terms accepted",
      required: Boolean(config.require_terms_acceptance),
      complete: Boolean(acceptedResponse),
      responsibleParty: "Client",
    },
    {
      key: "deposit_invoice_issued",
      label: "Deposit invoice issued",
      required: Boolean(config.require_deposit_invoice_issued),
      complete: depositIssued,
      responsibleParty: "Planner",
    },
    {
      key: "deposit_paid",
      label: "Deposit paid",
      required: Boolean(config.require_deposit_paid),
      complete: depositPaid,
      responsibleParty: "Client",
    },
    {
      key: "manual_planner_approval",
      label: "Planner booking approval",
      required: Boolean(config.require_manual_planner_approval),
      complete: Boolean(manualApproval),
      responsibleParty: "Planner",
    },
  ];
  const requiredChecks = checks.filter((check) => check.required);
  const outstanding = requiredChecks.filter((check) => !check.complete);
  return {
    project,
    settings: config,
    acceptedProposal,
    invoices: invoices ?? [],
    checks,
    outstanding,
    readyToBook: outstanding.length === 0,
  };
}

async function finalizeBookingIfReady(
  supabase: SupabaseAdminClient,
  projectId: string,
  actorId?: string | null,
) {
  const requirements = await getBookingRequirements(supabase, projectId);
  if (!requirements.readyToBook) return requirements;

  const project = requirements.project;
  const lead = Array.isArray(project.leads) ? project.leads[0] : project.leads;
  const event = Array.isArray(project.events) ? project.events[0] : project.events;
  const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
  if (event?.id) {
    await supabase
      .from("leads")
      .update({ stage: "Booked", converted_event_id: event.id })
      .eq("id", project.lead_id ?? "")
      .eq("organization_id", project.organization_id);
    await supabase
      .from("projects")
      .update({ stage: "Booked", event_id: event.id })
      .eq("id", project.id);
    return { ...(await getBookingRequirements(supabase, projectId)), event };
  }

  if (!lead) return requirements;
  const { data: createdEvent, error: eventError } = await supabase
    .from("events")
    .insert({
      organization_id: project.organization_id,
      project_id: project.id,
      lead_id: lead.id,
      client_id: client?.id ?? project.client_id ?? null,
      planner_id: project.owner_id ?? lead.owner_id ?? null,
      client_name_snapshot: client?.display_name ?? lead.client_name_snapshot,
      client_email: client?.email ?? lead.email,
      client_phone: client?.phone ?? lead.phone,
      event_name: `${client?.display_name ?? lead.client_name_snapshot} ${lead.event_type}`,
      event_type: lead.event_type,
      event_date: lead.event_date ?? new Date().toISOString().slice(0, 10),
      start_time: "17:00",
      end_time: "22:00",
      location: "Location TBD",
      guest_count: lead.estimated_guest_count ?? 0,
      status: "Setup",
      client_price: Number(requirements.acceptedProposal?.metadata?.accepted_total ?? 0),
      internal_notes: lead.notes,
      timeline_notes: "Create run-of-show from accepted proposal and consultation notes.",
    })
    .select("*")
    .single();
  if (eventError) throw eventError;

  await Promise.all([
    supabase
      .from("leads")
      .update({ stage: "Booked", converted_event_id: createdEvent.id })
      .eq("id", lead.id),
    supabase
      .from("projects")
      .update({
        stage: "Booked",
        event_id: createdEvent.id,
        name: createdEvent.event_name,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", project.id),
    supabase
      .from("proposals")
      .update({ event_id: createdEvent.id })
      .eq("project_id", project.id)
      .is("event_id", null),
    supabase
      .from("invoices")
      .update({ event_id: createdEvent.id })
      .eq("project_id", project.id)
      .is("event_id", null),
  ]);

  await Promise.all(
    [
      "communication_threads",
      "communication_messages",
      "meetings",
      "meeting_notes",
      "files",
      "tasks",
      "comments",
      "project_inspiration_links",
    ].map((table) =>
      supabase
        .from(table)
        .update({ event_id: createdEvent.id })
        .eq("organization_id", project.organization_id)
        .eq("project_id", project.id)
        .is("event_id", null),
    ),
  );

  if (project.owner_id ?? lead.owner_id) {
    await supabase.from("event_team_members").upsert(
      {
        organization_id: project.organization_id,
        event_id: createdEvent.id,
        user_id: project.owner_id ?? lead.owner_id,
        role_label: "Lead planner",
      },
      { onConflict: "event_id,user_id" },
    );
  }

  const existingSetupTask = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", project.id)
    .eq("title", "Kick off booked event workspace")
    .maybeSingle();
  if (!existingSetupTask.data) {
    await supabase.from("tasks").insert({
      organization_id: project.organization_id,
      project_id: project.id,
      lead_id: lead.id,
      event_id: createdEvent.id,
      owner_id: project.owner_id ?? lead.owner_id ?? null,
      title: "Kick off booked event workspace",
      description:
        "Confirm event setup, team ownership, vendors, budget, and client portal access.",
      due_date: new Date().toISOString().slice(0, 10),
      status: "To Do",
      priority: "High",
    });
  }

  await insertActivity(supabase, {
    organizationId: project.organization_id,
    projectId: project.id,
    actorId,
    activityType: "status",
    title: "Project booked",
    body: "Booking requirements are complete. The event setup workspace is now active.",
    metadata: { event_id: createdEvent.id, proposal_id: requirements.acceptedProposal?.id },
  });

  return { ...(await getBookingRequirements(supabase, projectId)), event: createdEvent };
}

export async function respondToProposalReview(
  token: string,
  input: z.infer<typeof ProposalReviewResponseSchema>,
  request: Request,
) {
  const bundle = await getReviewBundleByToken(token);
  const { supabase, proposal, version } = bundle;
  if (proposal.current_version_id !== version.id) {
    throw Object.assign(new Error("This proposal version is no longer active."), { status: 409 });
  }
  if (proposal.status === "Accepted") {
    return {
      proposal: publicProposalPayload(bundle, token),
      booking: await getBookingRequirements(supabase, proposal.project_id),
    };
  }

  const selectedLineItemIds = input.selectedLineItemIds.length
    ? input.selectedLineItemIds
    : bundle.lineItems.filter((item: any) => item.is_selected).map((item: any) => item.id);
  const acceptedTotal = getAcceptedLineItemTotal(bundle.lineItems, selectedLineItemIds);
  const responseMetadata = {
    selected_line_item_ids: selectedLineItemIds,
    accepted_total: acceptedTotal,
    acceptance_statement: input.acceptanceStatement,
    user_agent: request.headers.get("user-agent") ?? undefined,
  };

  const { data: response, error: responseError } = await supabase
    .from("proposal_responses")
    .insert({
      organization_id: proposal.organization_id,
      proposal_id: proposal.id,
      proposal_version_id: version.id,
      project_id: proposal.project_id,
      client_id: proposal.client_id ?? null,
      response_type: input.responseType,
      comment: input.comment || null,
      responder_name: input.responderName,
      responder_email: normalizeEmail(input.responderEmail),
      ip_metadata: {
        forwarded_for: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
      },
      metadata: responseMetadata,
    })
    .select("*")
    .single();
  if (responseError) {
    if (String(responseError.message).includes("proposal_responses_one_acceptance")) {
      return {
        proposal: publicProposalPayload(bundle, token),
        booking: await getBookingRequirements(supabase, proposal.project_id),
      };
    }
    throw responseError;
  }

  const nextStatus = input.responseType;
  const statusUpdate: Record<string, unknown> = {
    status: nextStatus,
    metadata: {
      ...(proposal.metadata ?? {}),
      accepted_total: input.responseType === "Accepted" ? acceptedTotal : undefined,
      latest_response_id: response.id,
    },
  };
  if (input.responseType === "Accepted") statusUpdate.accepted_at = new Date().toISOString();
  if (input.responseType === "Declined") statusUpdate.declined_at = new Date().toISOString();

  await supabase.from("proposals").update(statusUpdate).eq("id", proposal.id);
  await supabase
    .from("leads")
    .update({
      stage:
        input.responseType === "Accepted"
          ? "Accepted"
          : input.responseType === "Changes Requested"
            ? "Changes Requested"
            : "Lost",
    })
    .eq("id", proposal.lead_id ?? "")
    .eq("organization_id", proposal.organization_id);

  let generatedInvoices: any[] = [];
  if (input.responseType === "Accepted") {
    generatedInvoices = await generateInvoicesForAcceptedProposal(supabase, {
      proposal,
      version,
      paymentTerms: bundle.paymentTerms,
      selectedLineItemIds,
      lineItems: bundle.lineItems,
    });
  }

  await insertActivity(supabase, {
    organizationId: proposal.organization_id,
    projectId: proposal.project_id,
    activityType: "status",
    title:
      input.responseType === "Accepted"
        ? "Proposal accepted"
        : input.responseType === "Changes Requested"
          ? "Client requested proposal changes"
          : "Proposal declined",
    body: input.comment || undefined,
    metadata: {
      proposal_id: proposal.id,
      proposal_version_id: version.id,
      response_id: response.id,
      generated_invoice_ids: generatedInvoices.map((invoice) => invoice.id),
    },
  });

  const booking = await finalizeBookingIfReady(supabase, proposal.project_id, null);
  return {
    proposal: await getProposalReview(token),
    response,
    generatedInvoices,
    booking,
  };
}

export async function recordOfflinePayment(
  request: Request,
  input: z.infer<typeof OfflinePaymentSchema>,
) {
  const { supabase, profile } = await getStaffContext(request);
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", input.invoiceId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (error || !invoice) throw Object.assign(new Error("Invoice not found."), { status: 404 });

  const idempotencyKey =
    input.idempotencyKey ??
    `offline-${invoice.id}-${money(input.amount)}-${input.paidAt ?? new Date().toISOString().slice(0, 10)}`;
  const { data: existingPayment } = await supabase
    .from("invoice_payments")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingPayment) {
    return {
      payment: existingPayment,
      invoice,
      booking: invoice.project_id
        ? await finalizeBookingIfReady(supabase, invoice.project_id, profile.id)
        : undefined,
    };
  }

  const paidAt = input.paidAt || new Date().toISOString();
  const { data: payment, error: paymentError } = await supabase
    .from("invoice_payments")
    .insert({
      organization_id: profile.organization_id,
      invoice_id: invoice.id,
      project_id: invoice.project_id,
      event_id: invoice.event_id,
      amount: money(input.amount),
      payment_method: input.paymentMethod,
      paid_at: paidAt,
      reference: input.reference || null,
      note: input.note || null,
      recorded_by: profile.id,
      idempotency_key: idempotencyKey,
      metadata: { source: "manual_offline_payment" },
    })
    .select("*")
    .single();
  if (paymentError) throw paymentError;

  const newPaidAmount = money(Number(invoice.paid_amount ?? 0) + money(input.amount));
  const status =
    newPaidAmount >= Number(invoice.amount ?? 0)
      ? "Paid"
      : newPaidAmount > 0
        ? "Partially Paid"
        : invoice.status;
  const { data: updatedInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .update({
      paid_amount: Math.min(newPaidAmount, Number(invoice.amount ?? 0)),
      status,
      metadata: {
        ...(invoice.metadata ?? {}),
        last_manual_payment_at: paidAt,
        last_manual_payment_method: input.paymentMethod,
      },
    })
    .eq("id", invoice.id)
    .select("*")
    .single();
  if (invoiceError) throw invoiceError;

  if (invoice.project_id) {
    await insertActivity(supabase, {
      organizationId: profile.organization_id,
      projectId: invoice.project_id,
      actorId: profile.id,
      activityType: "status",
      title: "Offline payment recorded",
      body: `${input.paymentMethod} payment recorded for ${invoice.invoice_number}.`,
      metadata: { invoice_id: invoice.id, payment_id: payment.id, amount: input.amount },
    });
  }

  return {
    payment,
    invoice: updatedInvoice,
    booking: invoice.project_id
      ? await finalizeBookingIfReady(supabase, invoice.project_id, profile.id)
      : undefined,
  };
}

export async function approveProjectBooking(
  request: Request,
  input: z.infer<typeof ManualApprovalSchema>,
) {
  const { supabase, profile } = await getStaffContext(request);
  const { data: approval, error } = await supabase
    .from("project_booking_approvals")
    .upsert(
      {
        organization_id: profile.organization_id,
        project_id: input.projectId,
        approved_by: profile.id,
        note: input.note || null,
      },
      { onConflict: "project_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return {
    approval,
    booking: await finalizeBookingIfReady(supabase, input.projectId, profile.id),
  };
}

export async function getProjectBookingStatus(request: Request, projectId: string) {
  const { supabase, profile } = await getStaffContext(request);
  const status = await getBookingRequirements(supabase, projectId);
  if (status.project.organization_id !== profile.organization_id) {
    throw Object.assign(new Error("Project not found."), { status: 404 });
  }
  return status;
}
