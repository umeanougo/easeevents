import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { assertStaff, getAuthenticatedProfile } from "@/lib/ease-events/integrations.server";
import { syncRecentMeetings } from "@/services/integrations/fathom";

const SyncSchema = z.object({
  limit: z.number().int().positive().max(50).optional(),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to sync Fathom meetings.";
}

export const Route = createFileRoute("/api/ease-events/integrations/fathom/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = SyncSchema.safeParse(await request.json().catch(() => ({})));
        if (!body.success) {
          return Response.json({ error: "Invalid Fathom sync request." }, { status: 400 });
        }

        try {
          const profile = await getAuthenticatedProfile(request);
          assertStaff(profile);
          const result = await syncRecentMeetings({
            organizationId: profile.organizationId,
            limit: body.data.limit ?? 10,
          });
          return Response.json(result);
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json({ error: getErrorMessage(error) }, { status: 500 });
        }
      },
    },
  },
});
