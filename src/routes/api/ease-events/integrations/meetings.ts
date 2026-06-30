import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { createIntegratedMeeting } from "@/lib/ease-events/integrations.server";

const MeetingSchema = z.object({
  eventId: z.string().min(1),
  projectId: z.string().optional(),
  leadId: z.string().optional(),
  title: z.string().min(1),
  meetingType: z.enum(["Google Meet", "Microsoft Teams", "Phone", "In Person"]),
  status: z.enum(["Scheduled", "Completed", "Cancelled"]),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  organizerId: z.string().optional(),
  connectedAccountId: z.string().optional(),
  attendees: z.array(z.string()),
  agenda: z.string(),
  link: z.string().optional(),
  transcript: z.string(),
  internalSummary: z.string(),
  clientSummary: z.string(),
  notes: z.string(),
  actionItems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      ownerId: z.string().optional(),
      dueDate: z.string().optional(),
      taskId: z.string().optional(),
      isComplete: z.boolean(),
    }),
  ),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to create meeting.";
}

export const Route = createFileRoute("/api/ease-events/integrations/meetings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = MeetingSchema.safeParse(await request.json().catch(() => null));
        if (!body.success) {
          return Response.json(
            { error: "Invalid meeting request.", issues: body.error.issues },
            { status: 400 },
          );
        }

        try {
          const meeting = await createIntegratedMeeting(request, body.data);
          return Response.json(meeting);
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json({ error: getErrorMessage(error) }, { status: 500 });
        }
      },
    },
  },
});
