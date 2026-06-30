import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { assertStaff, getAuthenticatedProfile } from "@/lib/ease-events/integrations.server";
import { importMeeting } from "@/services/integrations/fathom";

const ImportSchema = z.object({
  meetingId: z.string().min(1),
  eventId: z.string().optional(),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to import Fathom meeting.";
}

export const Route = createFileRoute("/api/ease-events/integrations/fathom/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = ImportSchema.safeParse(await request.json().catch(() => null));
        if (!body.success) {
          return Response.json({ error: "Invalid Fathom import request." }, { status: 400 });
        }

        try {
          const profile = await getAuthenticatedProfile(request);
          assertStaff(profile);
          const note = await importMeeting(body.data.meetingId, {
            organizationId: profile.organizationId,
            eventId: body.data.eventId || undefined,
          });
          return Response.json({ note });
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json({ error: getErrorMessage(error) }, { status: 500 });
        }
      },
    },
  },
});
