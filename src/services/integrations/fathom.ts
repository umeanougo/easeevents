/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getOpenAIMaxCompletionTokens,
  getOpenAIModel,
  limitOpenAITranscript,
} from "@/lib/ease-events/openai.server";

type JsonObject = Record<string, unknown>;

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
  raw: unknown;
}

export interface FathomTranscript {
  text: string;
  transcriptUrl?: string;
  raw: unknown;
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
  rawProviderPayload: unknown;
  aiEnrichment: AiMeetingEnrichment;
  aiFollowUpDraft?: string;
  aiError?: string;
  aiEnrichedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FathomImportOptions {
  organizationId: string;
  eventId?: string;
}

export interface FathomListOptions {
  organizationId?: string;
  limit?: number;
}

export interface FathomSyncOptions {
  organizationId: string;
  limit?: number;
}

interface EaseEventsMeetingMatch {
  id: string;
  event_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  link: string | null;
  external_conference_url: string | null;
}

interface EaseEventsEventMatch {
  id: string;
  event_name: string;
  event_date: string;
  client_name_snapshot: string;
  client_email: string;
  clients?: { display_name?: string | null } | null;
}

interface AiMeetingEnrichment {
  clientRequirements: string[];
  eventDetails: string[];
  budgetNotes: string[];
  vendorNotes: string[];
  decorThemeIdeas: string[];
  actionItems: string[];
  risksIssues: string[];
  followUpDraft: string;
}

const emptyEnrichment: AiMeetingEnrichment = {
  clientRequirements: [],
  eventDetails: [],
  budgetNotes: [],
  vendorNotes: [],
  decorThemeIdeas: [],
  actionItems: [],
  risksIssues: [],
  followUpDraft: "",
};

function normalizeEmail(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

const listMeetingPaths = [
  "/external/v1/meetings",
  "/meetings",
  "/v1/meetings",
  "/api/v1/meetings",
  "/recordings",
];

function meetingPaths(meetingId: string) {
  const encoded = encodeURIComponent(meetingId);
  return [
    `/external/v1/meetings/${encoded}`,
    `/meetings/${encoded}`,
    `/v1/meetings/${encoded}`,
    `/api/v1/meetings/${encoded}`,
    `/recordings/${encoded}`,
  ];
}

function transcriptPaths(meetingId: string) {
  const encoded = encodeURIComponent(meetingId);
  return [
    `/external/v1/recordings/${encoded}/transcript`,
    `/meetings/${encoded}/transcript`,
    `/v1/meetings/${encoded}/transcript`,
    `/api/v1/meetings/${encoded}/transcript`,
    `/transcripts/${encoded}`,
    `/v1/transcripts/${encoded}`,
  ];
}

function readFathomApiKey() {
  const key = process.env.FATHOM_API_KEY;
  if (!key) throw new Response("FATHOM_API_KEY is not configured.", { status: 501 });
  return key;
}

function getFathomBaseUrl() {
  return (process.env.FATHOM_API_BASE_URL || "https://api.fathom.ai").replace(/\/$/, "");
}

function appendQuery(path: string, params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${getFathomBaseUrl()}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

async function readProviderResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fathomFetch(path: string, init?: RequestInit) {
  const apiKey = readFathomApiKey();
  let response: Response;
  try {
    response = await fetch(`${getFathomBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Api-Key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed.";
    throw new Error(`Unable to reach Fathom API at ${getFathomBaseUrl()}: ${message}`);
  }
  const payload = await readProviderResponse(response);
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload
        ? ((payload as any).error?.message ??
          (payload as any).message ??
          (payload as any).error ??
          `Fathom API request failed: ${path}`)
        : `Fathom API request failed: ${path}`;
    throw Object.assign(new Error(String(message)), { status: response.status, payload });
  }
  return payload;
}

async function tryFathomPaths(paths: string[], init?: RequestInit) {
  let lastError: unknown;
  for (const path of paths) {
    try {
      return await fathomFetch(path, init);
    } catch (error) {
      lastError = error;
      if ((error as { status?: number }).status !== 404) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Fathom API request failed.");
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

function pickString(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return "";
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function pickNumber(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function normalizeIso(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeUrl(value: string | undefined | null) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.replace(/\/$/, "").toLowerCase();
  }
}

function normalizeTitle(value: string | undefined | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapMeetingList(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  return asArray(
    record.meetings || record.items || record.data || record.recordings || record.results,
  );
}

function normalizeParticipants(raw: unknown) {
  return asArray(raw).map((participant) => {
    if (!participant || typeof participant !== "object") return { name: String(participant) };
    return {
      name: pickString(participant, ["name", "display_name", "displayName", "full_name"]),
      email: pickString(participant, ["email", "email_address", "emailAddress"]),
    };
  });
}

function normalizeActionItems(raw: unknown) {
  return asArray(raw).map((item) => {
    if (!item || typeof item !== "object") return { title: String(item) };
    const assignee = (item as Record<string, unknown>).assignee;
    return {
      title: pickString(item, ["title", "text", "description", "task"]),
      owner:
        assignee && typeof assignee === "object"
          ? pickString(assignee, ["name", "email"])
          : pickString(item, ["owner", "assignee", "assignee_name"]),
      dueDate: pickString(item, ["due_date", "dueDate"]),
      raw: item,
    };
  });
}

function actionItemTitles(items: unknown[]) {
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const title = pickString(item, ["title", "text", "description", "task"]);
      const owner = pickString(item, ["owner"]);
      return title && owner ? `${title} (${owner})` : title;
    })
    .filter(Boolean);
}

function primaryActionOwner(items: unknown[]) {
  return (
    items
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        return pickString(item, ["owner"]);
      })
      .find(Boolean) ?? ""
  );
}

function makeFathomEnrichment(meeting: FathomMeetingPreview, actionItems: unknown[]) {
  return {
    ...emptyEnrichment,
    eventDetails: meeting.summary ? [meeting.summary] : [],
    actionItems: actionItemTitles(actionItems),
  };
}

function speakerNameFromSegment(segment: unknown) {
  if (!segment || typeof segment !== "object") return "";
  const speaker = (segment as Record<string, unknown>).speaker;
  if (speaker && typeof speaker === "object") {
    return pickString(speaker, [
      "display_name",
      "displayName",
      "name",
      "matched_calendar_invitee_email",
    ]);
  }
  return pickString(segment, ["speaker", "speaker_name", "speakerName"]);
}

function extractSummary(raw: unknown) {
  const direct = pickString(raw, ["summary", "ai_summary", "aiSummary", "fathom_summary"]);
  if (direct) return direct;
  if (!raw || typeof raw !== "object") return "";
  const defaultSummary = (raw as Record<string, unknown>).default_summary;
  if (!defaultSummary || typeof defaultSummary !== "object") return "";
  return pickString(defaultSummary, ["markdown_formatted", "markdownFormatted", "text", "summary"]);
}

function normalizeTranscript(payload: unknown): FathomTranscript {
  const transcriptText =
    pickString(payload, [
      "transcript_text",
      "transcriptText",
      "transcript",
      "text",
      "plain_text",
    ]) ||
    asArray((payload as any)?.transcript || (payload as any)?.segments)
      .map((segment) => {
        if (!segment || typeof segment !== "object") return String(segment);
        const speaker = speakerNameFromSegment(segment);
        const text = pickString(segment, ["text", "content", "transcript"]);
        return speaker ? `${speaker}: ${text}` : text;
      })
      .filter(Boolean)
      .join("\n");

  return {
    text: transcriptText,
    transcriptUrl: pickString(payload, ["transcript_url", "transcriptUrl", "url"]),
    raw: payload,
  };
}

function normalizeMeeting(raw: unknown): FathomMeetingPreview {
  const id = pickString(raw, ["id", "meeting_id", "meetingId", "uuid", "recording_id"]);
  const title = pickString(raw, ["title", "name", "meeting_title", "meetingTitle", "topic"]);
  const startedAt = normalizeIso(
    pickString(raw, ["started_at", "startedAt", "start_time", "startTime", "scheduled_start_time"]),
  );
  const endedAt = normalizeIso(
    pickString(raw, ["ended_at", "endedAt", "end_time", "endTime", "scheduled_end_time"]),
  );
  const recordingUrl = pickString(raw, [
    "recording_url",
    "recordingUrl",
    "share_url",
    "shareUrl",
    "video_url",
    "url",
  ]);
  const transcriptUrl = pickString(raw, ["transcript_url", "transcriptUrl"]);
  const meetingUrl = pickString(raw, [
    "meeting_url",
    "meetingUrl",
    "conference_url",
    "conferenceUrl",
    "join_url",
    "joinUrl",
    "google_meet_url",
    "googleMeetUrl",
  ]);
  const summary = extractSummary(raw);

  return {
    id,
    title: title || "Fathom meeting",
    startedAt,
    endedAt,
    durationSeconds: pickNumber(raw, ["duration_seconds", "durationSeconds", "duration"]),
    recordingUrl,
    transcriptUrl,
    meetingUrl,
    participants: normalizeParticipants(
      (raw as any)?.calendar_invitees || (raw as any)?.participants || (raw as any)?.attendees,
    ),
    summary,
    raw,
  };
}

function mapMeetingNote(row: any): FathomMeetingNote {
  const rawProviderPayload = row.raw_provider_payload ?? {};
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id ?? undefined,
    meetingId: row.meeting_id ?? undefined,
    title: row.title,
    provider: "fathom",
    providerMeetingId: row.provider_meeting_id,
    recordingUrl: row.recording_url ?? undefined,
    transcriptUrl: row.transcript_url ?? undefined,
    transcriptText: row.transcript_text ?? undefined,
    fathomSummary: row.fathom_summary ?? undefined,
    fathomActionItems: Array.isArray(row.fathom_action_items) ? row.fathom_action_items : [],
    participants: Array.isArray(row.participants) ? row.participants : [],
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    syncedAt: row.synced_at ?? undefined,
    rawProviderPayload,
    aiEnrichment: { ...emptyEnrichment, ...(row.ai_enrichment ?? {}) },
    aiFollowUpDraft: row.ai_follow_up_draft ?? undefined,
    aiError:
      typeof rawProviderPayload?.aiError === "string" && rawProviderPayload.aiError.trim()
        ? rawProviderPayload.aiError
        : undefined,
    aiEnrichedAt: row.ai_enriched_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadMatchingRecords(organizationId: string) {
  const [meetingsResult, eventsResult] = await Promise.all([
    (supabaseAdmin as any)
      .from("meetings")
      .select("id,event_id,title,start_at,end_at,link,external_conference_url")
      .eq("organization_id", organizationId),
    (supabaseAdmin as any)
      .from("events")
      .select("id,event_name,event_date,client_name_snapshot,client_email,clients(display_name)")
      .eq("organization_id", organizationId),
  ]);

  if (meetingsResult.error) throw meetingsResult.error;
  if (eventsResult.error) throw eventsResult.error;

  return {
    meetings: (meetingsResult.data ?? []) as EaseEventsMeetingMatch[],
    events: (eventsResult.data ?? []) as EaseEventsEventMatch[],
  };
}

function findMatchingMeeting(meeting: FathomMeetingPreview, records: EaseEventsMeetingMatch[]) {
  const meetingUrl = normalizeUrl(meeting.meetingUrl);
  if (meetingUrl) {
    const urlMatch = records.find(
      (record) =>
        normalizeUrl(record.link) === meetingUrl ||
        normalizeUrl(record.external_conference_url) === meetingUrl,
    );
    if (urlMatch) return urlMatch;
  }

  const meetingStart = meeting.startedAt ? new Date(meeting.startedAt).getTime() : null;
  const title = normalizeTitle(meeting.title);
  if (!title || !meetingStart) return null;

  return (
    records.find((record) => {
      const recordStart = new Date(record.start_at).getTime();
      const isNear = Math.abs(recordStart - meetingStart) <= 60 * 60 * 1000;
      const recordTitle = normalizeTitle(record.title);
      return isNear && (recordTitle.includes(title) || title.includes(recordTitle));
    }) ?? null
  );
}

function findMatchingEvent(meeting: FathomMeetingPreview, records: EaseEventsEventMatch[]) {
  const participantEmails = new Set(
    meeting.participants.map((participant) => normalizeEmail(participant.email)).filter(Boolean),
  );
  const participantMatch = records.find((event) =>
    participantEmails.has(normalizeEmail(event.client_email)),
  );
  if (participantMatch) return participantMatch;

  const searchText = normalizeTitle(
    `${meeting.title} ${meeting.summary ?? ""} ${meeting.participants
      .map((participant) => `${participant.name ?? ""} ${participant.email ?? ""}`)
      .join(" ")}`,
  );
  if (!searchText) return null;

  return (
    records.find((event) => {
      const eventTitle = normalizeTitle(event.event_name);
      const clientName = normalizeTitle(event.clients?.display_name ?? event.client_name_snapshot);
      return (
        (eventTitle && (eventTitle.includes(searchText) || searchText.includes(eventTitle))) ||
        (clientName && searchText.includes(clientName))
      );
    }) ?? null
  );
}

async function addMatchHints(
  meetings: FathomMeetingPreview[],
  organizationId?: string,
): Promise<FathomMeetingPreview[]> {
  if (!organizationId || !meetings.length) return meetings;
  const records = await loadMatchingRecords(organizationId);
  return meetings.map((meeting) => {
    const matchedMeeting = findMatchingMeeting(meeting, records.meetings);
    const matchedEvent =
      (matchedMeeting?.event_id
        ? records.events.find((event) => event.id === matchedMeeting.event_id)
        : null) ?? findMatchingEvent(meeting, records.events);
    return {
      ...meeting,
      matchedMeetingId: matchedMeeting?.id,
      matchedEventId: matchedEvent?.id ?? matchedMeeting?.event_id ?? undefined,
      matchedEventName: matchedEvent?.event_name,
    };
  });
}

function parseAiList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function parseAiEnrichment(value: unknown): AiMeetingEnrichment {
  if (!value || typeof value !== "object") return emptyEnrichment;
  const record = value as Record<string, unknown>;
  return {
    clientRequirements: parseAiList(record.clientRequirements),
    eventDetails: parseAiList(record.eventDetails),
    budgetNotes: parseAiList(record.budgetNotes),
    vendorNotes: parseAiList(record.vendorNotes),
    decorThemeIdeas: parseAiList(record.decorThemeIdeas),
    actionItems: parseAiList(record.actionItems),
    risksIssues: parseAiList(record.risksIssues),
    followUpDraft: typeof record.followUpDraft === "string" ? record.followUpDraft.trim() : "",
  };
}

async function enrichMeetingNote(args: {
  meeting: FathomMeetingPreview;
  transcriptText: string;
  eventName?: string;
}) {
  if (!process.env.OPENAI_API_KEY || !args.transcriptText.trim()) return emptyEnrichment;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      max_completion_tokens: getOpenAIMaxCompletionTokens(),
      messages: [
        {
          role: "system",
          content:
            "Extract structured event-planning intelligence from meeting transcripts. Return only JSON with keys: clientRequirements, eventDetails, budgetNotes, vendorNotes, decorThemeIdeas, actionItems, risksIssues, followUpDraft. Array fields must contain at most 5 short strings, each under 18 words. followUpDraft must be a polished client-facing email draft under 140 words.",
        },
        {
          role: "user",
          content: JSON.stringify({
            eventName: args.eventName,
            meetingTitle: args.meeting.title,
            startedAt: args.meeting.startedAt,
            participants: args.meeting.participants,
            fathomSummary: args.meeting.summary,
            transcript: limitOpenAITranscript(args.transcriptText),
          }),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || "OpenAI enrichment failed.";
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI enrichment returned no content.");
  return parseAiEnrichment(JSON.parse(content));
}

function summarizeForPreview(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function cleanFathomSummary(summary: string, actionItems: unknown[]) {
  const authoritativeOwner = primaryActionOwner(actionItems);
  let cleaned = summary
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\\~/g, "~")
    .replace(/\*\*/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (authoritativeOwner) {
    cleaned = cleaned
      .replace(/\bAbhishek\b/g, authoritativeOwner)
      .replace(/\bAbhishek:/g, `${authoritativeOwner}:`);
  }

  return cleaned
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{2}\s+/, "")
        .replace(/^#{3}\s+/, "")
        .replace(/^\s*-\s+/, "- ")
        .replace(/\s+/g, " ")
        .trimEnd(),
    )
    .join("\n")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

function buildFathomCommunicationBody(args: {
  meeting: FathomMeetingPreview;
  transcriptText: string;
  actionItems: unknown[];
}) {
  const cleanSummary = args.meeting.summary
    ? cleanFathomSummary(args.meeting.summary, args.actionItems)
    : "";
  const metadata = [
    args.meeting.startedAt ? `Recorded ${new Date(args.meeting.startedAt).toLocaleString()}` : "",
    args.meeting.recordingUrl ? `Recording: ${args.meeting.recordingUrl}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const lines = [
    cleanSummary || "Fathom did not return a meeting summary.",
    metadata ? "" : "",
    metadata,
  ].filter(Boolean);

  const actionItems = actionItemTitles(args.actionItems);
  if (actionItems.length) {
    lines.push("", "Action items", ...actionItems.map((item) => `- ${item}`));
  }

  if (!args.meeting.summary && args.transcriptText) {
    lines.push("", "Transcript excerpt", args.transcriptText.slice(0, 1200));
  }

  return lines.join("\n");
}

async function upsertFathomCommunication(args: {
  organizationId: string;
  event: EaseEventsEventMatch;
  meeting: FathomMeetingPreview;
  transcriptText: string;
  actionItems: unknown[];
  syncedAt: string;
}) {
  const externalThreadId = `fathom:${args.meeting.id}`;
  const externalMessageId = `fathom:${args.meeting.id}:summary`;
  const body = buildFathomCommunicationBody({
    meeting: args.meeting,
    transcriptText: args.transcriptText,
    actionItems: args.actionItems,
  });
  const preview =
    summarizeForPreview(cleanFathomSummary(args.meeting.summary || body, args.actionItems)) ||
    `Fathom summary for ${args.meeting.title}`;
  const participants = Array.from(
    new Set([
      args.event.client_email,
      ...args.meeting.participants
        .map((participant) => normalizeEmail(participant.email))
        .filter(Boolean),
    ]),
  );

  const { data: thread, error: threadError } = await (supabaseAdmin as any)
    .from("communication_threads")
    .upsert(
      {
        organization_id: args.organizationId,
        event_id: args.event.id,
        subject: `${args.meeting.title} - Fathom recap`,
        client_name_snapshot: args.event.clients?.display_name ?? args.event.client_name_snapshot,
        participants,
        channel: "Meeting",
        status: args.actionItems.length ? "Needs Reply" : "Closed",
        integration_source: "Fathom",
        external_provider: "fathom",
        external_thread_id: externalThreadId,
        synced_at: args.syncedAt,
        preview,
        unread_count: 0,
        last_activity_at: args.meeting.startedAt ?? args.syncedAt,
      },
      { onConflict: "organization_id,external_provider,external_thread_id" },
    )
    .select("id")
    .single();

  if (threadError || !thread) {
    throw threadError ?? new Error("Unable to upsert Fathom communication thread.");
  }

  const { error: messageError } = await (supabaseAdmin as any)
    .from("communication_messages")
    .upsert(
      {
        organization_id: args.organizationId,
        thread_id: thread.id,
        event_id: args.event.id,
        direction: "Internal",
        body,
        summary: preview,
        visibility: "Internal",
        external_provider: "fathom",
        external_message_id: externalMessageId,
        synced_at: args.syncedAt,
        sent_at: args.meeting.startedAt ?? args.syncedAt,
      },
      { onConflict: "organization_id,external_provider,external_message_id" },
    );

  if (messageError) throw messageError;
}

export async function listMeetings(options: FathomListOptions = {}) {
  const limit = options.limit ?? 20;
  const payload = await tryFathomPaths(
    listMeetingPaths.map((path) =>
      appendQuery(path, {
        limit,
        include_summary: true,
        include_action_items: true,
      }),
    ),
  );
  const meetings = unwrapMeetingList(payload)
    .map(normalizeMeeting)
    .filter((meeting) => meeting.id);
  return addMatchHints(meetings, options.organizationId);
}

export async function getMeeting(meetingId: string) {
  let listPayload: unknown = null;
  try {
    listPayload = await fathomFetch(
      appendQuery("/external/v1/meetings", {
        limit: 100,
        include_summary: true,
        include_action_items: true,
      }),
    );
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
  }
  const listedMeeting = unwrapMeetingList(listPayload)
    .map(normalizeMeeting)
    .find((meeting) => meeting.id === meetingId);
  if (listedMeeting) return listedMeeting;

  const payload = await tryFathomPaths(meetingPaths(meetingId));
  return normalizeMeeting(payload);
}

export async function getTranscript(meetingId: string) {
  try {
    const payload = await tryFathomPaths(transcriptPaths(meetingId));
    return normalizeTranscript(payload);
  } catch (error) {
    const meeting = await getMeeting(meetingId);
    const transcript = normalizeTranscript(meeting.raw);
    if (transcript.text) return transcript;
    throw error;
  }
}

export async function importMeeting(meetingId: string, options: FathomImportOptions) {
  const [meeting, transcript] = await Promise.all([
    getMeeting(meetingId),
    getTranscript(meetingId),
  ]);
  const records = await loadMatchingRecords(options.organizationId);
  const matchedMeeting = findMatchingMeeting(meeting, records.meetings);
  const matchedEvent =
    (options.eventId ? records.events.find((event) => event.id === options.eventId) : null) ??
    (matchedMeeting?.event_id
      ? records.events.find((event) => event.id === matchedMeeting.event_id)
      : null) ??
    findMatchingEvent(meeting, records.events);

  if (options.eventId && !matchedEvent) {
    throw new Response("Selected event was not found for this organization.", { status: 404 });
  }

  const transcriptText = transcript.text;
  const fathomActionItems = normalizeActionItems(
    (meeting.raw as any)?.action_items || (meeting.raw as any)?.actionItems,
  );
  let enrichment = makeFathomEnrichment(meeting, fathomActionItems);
  let enrichmentError: string | null = null;
  let enrichedWithOpenAI = false;
  if (!meeting.summary) {
    try {
      enrichment = await enrichMeetingNote({
        meeting,
        transcriptText,
        eventName: matchedEvent?.event_name,
      });
      enrichedWithOpenAI = true;
    } catch (error) {
      enrichmentError = error instanceof Error ? error.message : "AI enrichment failed.";
    }
  }
  const syncedAt = new Date().toISOString();
  if (matchedEvent) {
    await upsertFathomCommunication({
      organizationId: options.organizationId,
      event: matchedEvent,
      meeting,
      transcriptText,
      actionItems: fathomActionItems,
      syncedAt,
    });
  }
  const payload = {
    organization_id: options.organizationId,
    event_id: matchedEvent?.id ?? matchedMeeting?.event_id ?? null,
    meeting_id: matchedMeeting?.id ?? null,
    title: meeting.title,
    provider: "fathom",
    provider_meeting_id: meeting.id,
    recording_url: meeting.recordingUrl || null,
    transcript_url: transcript.transcriptUrl || meeting.transcriptUrl || null,
    transcript_text: transcriptText || null,
    fathom_summary: meeting.summary || null,
    fathom_action_items: fathomActionItems,
    participants: meeting.participants,
    started_at: meeting.startedAt ?? null,
    ended_at: meeting.endedAt ?? null,
    duration_seconds: meeting.durationSeconds ?? null,
    synced_at: syncedAt,
    raw_provider_payload: {
      meeting: meeting.raw,
      transcript: transcript.raw,
      normalized: meeting,
      match: {
        meetingId: matchedMeeting?.id ?? null,
        eventId: matchedEvent?.id ?? matchedMeeting?.event_id ?? null,
      },
      aiError: enrichmentError,
    } satisfies JsonObject,
    ai_enrichment: enrichment,
    ai_follow_up_draft: enrichment.followUpDraft || null,
    ai_enriched_at: enrichedWithOpenAI && !enrichmentError ? syncedAt : null,
  };

  const { data, error } = await (supabaseAdmin as any)
    .from("meeting_notes")
    .upsert(payload, { onConflict: "organization_id,provider,provider_meeting_id" })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Unable to save Fathom meeting note.");
  return mapMeetingNote(data);
}

export async function syncRecentMeetings(options: FathomSyncOptions) {
  const meetings = await listMeetings({
    organizationId: options.organizationId,
    limit: options.limit ?? 10,
  });
  const imported: FathomMeetingNote[] = [];
  const errors: Array<{ meetingId: string; message: string }> = [];

  for (const meeting of meetings) {
    try {
      imported.push(
        await importMeeting(meeting.id, {
          organizationId: options.organizationId,
          eventId: meeting.matchedEventId,
        }),
      );
    } catch (error) {
      errors.push({
        meetingId: meeting.id,
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  return {
    scanned: meetings.length,
    imported: imported.length,
    importedNotes: imported,
    errors,
  };
}
