import { supabase } from "@/integrations/supabase/client";

import type { CreateMeetingInput } from "./supabase-repository";
import type { AppUser, MeetingRecord } from "./types";

export interface FathomMeetingPreview {
  id: string;
  title: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  meetingUrl?: string;
  participants: Array<{ name?: string; email?: string }>;
  summary?: string;
  matchedMeetingId?: string;
  matchedEventId?: string;
  matchedEventName?: string;
}

export interface FathomMeetingNote {
  id: string;
  organizationId: string;
  eventId?: string;
  meetingId?: string;
  title: string;
  provider: "fathom";
  providerMeetingId: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  transcriptText?: string;
  fathomSummary?: string;
  fathomActionItems: unknown[];
  participants: unknown[];
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  syncedAt?: string;
  aiEnrichment: {
    clientRequirements: string[];
    eventDetails: string[];
    budgetNotes: string[];
    vendorNotes: string[];
    decorThemeIdeas: string[];
    actionItems: string[];
    risksIssues: string[];
    followUpDraft: string;
  };
  aiFollowUpDraft?: string;
  aiError?: string;
  aiEnrichedAt?: string;
}

export async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers || {}),
    },
  });
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text } as T;
  }
}

export async function startIntegrationConnection(
  provider: "google" | "microsoft",
  returnPath: string,
) {
  const response = await authorizedFetch("/api/ease-events/integrations/oauth/start", {
    method: "POST",
    body: JSON.stringify({ provider, returnPath }),
  });
  const result = await readJson<{ url?: string; error?: string }>(response);
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? "Unable to start the provider connection.");
  }
  window.location.assign(result.url);
}

export async function syncMailbox(accountId: string) {
  const response = await authorizedFetch("/api/ease-events/integrations/mail/sync", {
    method: "POST",
    body: JSON.stringify({ accountId }),
  });
  const result = await readJson<{ error?: string } & Record<string, number>>(response);
  if (!response.ok) {
    throw new Error(result.error ?? "Mailbox sync failed.");
  }
  return result;
}

export async function sendProjectEmailRequest(input: {
  accountId?: string;
  threadId?: string;
  thread?: {
    eventId: string;
    projectId?: string;
    leadId?: string;
    assignedToId?: string;
    subject: string;
    clientName: string;
    participants: string[];
  };
  eventId: string;
  projectId?: string;
  leadId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  visibility?: "Internal" | "Client" | "Vendor";
  idempotencyKey?: string;
}) {
  const response = await authorizedFetch("/api/ease-events/integrations/mail/send", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const result = await readJson<{
    threadId?: string;
    messageId?: string;
    deliveryStatus?: string;
    deliveryMode?: string;
    deliveryError?: string | null;
    error?: string;
  }>(response);
  if (!response.ok || !result.threadId || !result.messageId) {
    throw new Error(result.error ?? "Unable to send email.");
  }
  return result;
}

export async function syncCalendar(accountId: string) {
  const response = await authorizedFetch("/api/ease-events/integrations/calendar/sync", {
    method: "POST",
    body: JSON.stringify({ accountId }),
  });
  const result = await readJson<{ error?: string } & Record<string, number>>(response);
  if (!response.ok) {
    throw new Error(result.error ?? "Calendar sync failed.");
  }
  return result;
}

export async function disconnectIntegrationAccount(accountId: string) {
  const response = await authorizedFetch("/api/ease-events/integrations/accounts/disconnect", {
    method: "POST",
    body: JSON.stringify({ accountId }),
  });
  const result = await readJson<{ success?: boolean; error?: string }>(response);
  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Unable to disconnect this account.");
  }
}

export async function createIntegratedMeetingRequest(input: CreateMeetingInput) {
  const response = await authorizedFetch("/api/ease-events/integrations/meetings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const result = await readJson<MeetingRecord & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(result.error ?? "Unable to create the meeting.");
  }
  return result;
}

export async function provisionClientPortalAccessRequest(eventId: string) {
  const response = await authorizedFetch("/api/ease-events/client-portal-access", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
  const result = await readJson<{
    user?: AppUser;
    inviteSent?: boolean;
    inviteError?: string;
    clientPortalPath?: string;
    error?: string;
  }>(response);

  if (!response.ok || !result.user) {
    throw new Error(result.error ?? "Unable to create client portal access.");
  }

  return {
    user: result.user,
    inviteSent: Boolean(result.inviteSent),
    inviteError: result.inviteError,
    clientPortalPath: result.clientPortalPath ?? "/ease-events/client-portal",
  };
}

export async function draftMeetingSummariesRequest(input: {
  eventName: string;
  transcript: string;
  agenda: string;
  notes: string;
}) {
  const response = await authorizedFetch("/api/ease-events/ai/meeting-summary", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const result = await readJson<{
    internalSummary?: string;
    clientSummary?: string;
    error?: string;
  }>(response);
  if (!response.ok || !result.internalSummary || !result.clientSummary) {
    throw new Error(result.error ?? "Unable to draft meeting summaries.");
  }
  return {
    internalSummary: result.internalSummary,
    clientSummary: result.clientSummary,
  };
}

export async function listFathomMeetings(limit = 20) {
  const response = await authorizedFetch(
    `/api/ease-events/integrations/fathom/meetings?limit=${encodeURIComponent(String(limit))}`,
  );
  const result = await readJson<{ meetings?: FathomMeetingPreview[]; error?: string }>(response);
  if (!response.ok) {
    throw new Error(result.error ?? "Unable to load Fathom meetings.");
  }
  return result.meetings ?? [];
}

export async function importFathomMeeting(input: { meetingId: string; eventId?: string }) {
  const response = await authorizedFetch("/api/ease-events/integrations/fathom/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const result = await readJson<{ note?: FathomMeetingNote; error?: string }>(response);
  if (!response.ok || !result.note) {
    throw new Error(result.error ?? "Unable to import Fathom meeting.");
  }
  return result.note;
}

export async function syncFathomMeetings(limit = 10) {
  const response = await authorizedFetch("/api/ease-events/integrations/fathom/sync", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
  const result = await readJson<{
    scanned?: number;
    imported?: number;
    importedNotes?: FathomMeetingNote[];
    errors?: Array<{ meetingId: string; message: string }>;
    error?: string;
  }>(response);
  if (!response.ok) {
    throw new Error(result.error ?? "Unable to sync Fathom meetings.");
  }
  return {
    scanned: result.scanned ?? 0,
    imported: result.imported ?? 0,
    importedNotes: result.importedNotes ?? [],
    errors: result.errors ?? [],
  };
}

export interface ProposalLineItemInput {
  category?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate?: number;
  isOptional: boolean;
  isSelected: boolean;
  clientVisible: boolean;
  sortOrder: number;
}

export interface ProposalPaymentTermInput {
  label: string;
  paymentType: "Deposit" | "Installment" | "Final" | "Custom";
  amountType: "Fixed" | "Percent";
  amountValue: number;
  dueRule: "On Acceptance" | "Fixed Date" | "Before Event" | "After Acceptance";
  dueDate?: string;
  dueOffsetDays?: number;
  requiredForBooking: boolean;
  sortOrder: number;
}

export interface ProposalDraftRequest {
  projectId: string;
  proposalId?: string;
  title: string;
  introduction: string;
  scope: string;
  terms: string;
  discountAmount: number;
  taxAmount: number;
  validUntil?: string;
  lineItems: ProposalLineItemInput[];
  paymentTerms: ProposalPaymentTermInput[];
}

export async function saveProposalDraftRequest(input: ProposalDraftRequest) {
  const response = await authorizedFetch("/api/ease-events/proposals/draft", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const result = await readJson<{ proposal?: unknown; version?: unknown; error?: string }>(
    response,
  );
  if (!response.ok || !result.proposal) {
    throw new Error(result.error ?? "Unable to save proposal.");
  }
  return result;
}

export async function sendProposalRequest(proposalId: string) {
  const response = await authorizedFetch("/api/ease-events/proposals/send", {
    method: "POST",
    body: JSON.stringify({
      proposalId,
      idempotencyKey:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `proposal-send-${crypto.randomUUID()}`
          : `proposal-send-${Date.now()}`,
    }),
  });
  const result = await readJson<{
    proposal?: unknown;
    reviewUrl?: string;
    deliveryStatus?: string;
    deliveryError?: string;
    emailMode?: string;
    error?: string;
  }>(response);
  if (!response.ok || !result.proposal) {
    throw new Error(result.error ?? "Unable to send proposal.");
  }
  return result;
}

export async function recordOfflineProposalPaymentRequest(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paidAt?: string;
  reference?: string;
  note?: string;
}) {
  const response = await authorizedFetch("/api/ease-events/proposals/payment", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      idempotencyKey:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `offline-${crypto.randomUUID()}`
          : `offline-${Date.now()}`,
    }),
  });
  const result = await readJson<{
    payment?: unknown;
    invoice?: unknown;
    booking?: unknown;
    error?: string;
  }>(response);
  if (!response.ok || !result.invoice) {
    throw new Error(result.error ?? "Unable to record payment.");
  }
  return result;
}

export async function approveProjectBookingRequest(projectId: string, note?: string) {
  const response = await authorizedFetch("/api/ease-events/proposals/booking-approval", {
    method: "POST",
    body: JSON.stringify({ projectId, note: note ?? "" }),
  });
  const result = await readJson<{ approval?: unknown; booking?: unknown; error?: string }>(
    response,
  );
  if (!response.ok || !result.approval) {
    throw new Error(result.error ?? "Unable to approve booking.");
  }
  return result;
}
