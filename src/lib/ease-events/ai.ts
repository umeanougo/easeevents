import { hasOpenAIConfig } from "./config";
import type { EventRecord } from "./types";

export type AIFeature =
  | "generate-event-timeline"
  | "summarize-client-notes"
  | "suggest-vendor-checklist"
  | "budget-variance-explanation"
  | "post-event-summary";

export interface AIPlaceholderResult {
  enabled: boolean;
  title: string;
  summary: string;
  todo: string;
}

export function runAIPlaceholder(feature: AIFeature, event?: EventRecord): AIPlaceholderResult {
  const enabled = hasOpenAIConfig();
  const eventName = event?.eventName ?? "selected event";

  const copy: Record<AIFeature, Omit<AIPlaceholderResult, "enabled">> = {
    "generate-event-timeline": {
      title: "Generate event timeline",
      summary: `Draft a production timeline for ${eventName} from vendor load-in through strike.`,
      todo: "TODO: Call an OpenAI server route with event, vendor, task, and approval context.",
    },
    "summarize-client-notes": {
      title: "Summarize client notes",
      summary: `Turn scattered client comments for ${eventName} into crisp decisions and open questions.`,
      todo: "TODO: Store note summaries with source links and planner review status.",
    },
    "suggest-vendor-checklist": {
      title: "Suggest vendor checklist",
      summary: `Create a vendor-specific checklist for ${eventName} based on category and venue constraints.`,
      todo: "TODO: Generate checklist items, then require planner confirmation before saving.",
    },
    "budget-variance-explanation": {
      title: "Budget variance explanation",
      summary: `Explain planned vs. actual cost movement for ${eventName} in client-friendly language.`,
      todo: "TODO: Use budget_items history and vendor quote deltas once audit logs exist.",
    },
    "post-event-summary": {
      title: "Post-event summary",
      summary: `Summarize wins, issues, margins, referrals, and next steps after ${eventName}.`,
      todo: "TODO: Pull tasks, files, comments, and final budget into a post-event report draft.",
    },
  };

  return {
    enabled,
    ...copy[feature],
  };
}
