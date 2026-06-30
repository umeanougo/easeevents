import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { draftMeetingSummaries } from "@/lib/ease-events/ai.server";

const MeetingSummarySchema = z.object({
  eventName: z.string().min(1),
  transcript: z.string(),
  agenda: z.string(),
  notes: z.string(),
});

export const Route = createFileRoute("/api/ease-events/ai/meeting-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = MeetingSummarySchema.safeParse(await request.json().catch(() => null));
        if (!body.success) {
          return Response.json({ error: "Invalid meeting summary request." }, { status: 400 });
        }

        try {
          const result = await draftMeetingSummaries(request, body.data);
          return Response.json(result);
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json(
            { error: error instanceof Error ? error.message : "Unable to draft summaries." },
            { status: 500 },
          );
        }
      },
    },
  },
});
