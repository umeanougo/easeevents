import { assertStaff, getAuthenticatedProfile } from "./integrations.server";
import {
  getOpenAIMaxCompletionTokens,
  getOpenAIModel,
  limitOpenAITranscript,
} from "./openai.server";

export interface MeetingSummaryDraftInput {
  eventName: string;
  transcript: string;
  agenda: string;
  notes: string;
}

export interface MeetingSummaryDraftResult {
  internalSummary: string;
  clientSummary: string;
}

function readOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Response("OPENAI_API_KEY is not configured.", { status: 501 });
  return key;
}

function parseSummaryPayload(value: unknown): MeetingSummaryDraftResult {
  if (!value || typeof value !== "object") {
    throw new Error("AI response was empty.");
  }

  const candidate = value as Partial<MeetingSummaryDraftResult>;
  return {
    internalSummary: String(candidate.internalSummary ?? "").trim(),
    clientSummary: String(candidate.clientSummary ?? "").trim(),
  };
}

export async function draftMeetingSummaries(
  request: Request,
  input: MeetingSummaryDraftInput,
): Promise<MeetingSummaryDraftResult> {
  const profile = await getAuthenticatedProfile(request);
  assertStaff(profile);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${readOpenAIKey()}`,
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
            "You draft concise event-planning meeting recaps. Return only JSON with internalSummary and clientSummary. The internal summary is candid for planners. The client summary is polished, warm, and action-oriented. Keep each summary under 140 words.",
        },
        {
          role: "user",
          content: JSON.stringify({
            eventName: input.eventName,
            agenda: input.agenda,
            transcriptOrRawNotes: limitOpenAITranscript(input.transcript),
            plannerNotes: input.notes,
          }),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || "OpenAI meeting summary request failed.";
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI did not return summary text.");

  const parsed = parseSummaryPayload(JSON.parse(content));
  if (!parsed.internalSummary || !parsed.clientSummary) {
    throw new Error("OpenAI summary response was missing required fields.");
  }

  return parsed;
}
