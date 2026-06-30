import { createFileRoute } from "@tanstack/react-router";

import { assertStaff, getAuthenticatedProfile } from "@/lib/ease-events/integrations.server";
import { listMeetings } from "@/services/integrations/fathom";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to load Fathom meetings.";
}

export const Route = createFileRoute("/api/ease-events/integrations/fathom/meetings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const profile = await getAuthenticatedProfile(request);
          assertStaff(profile);
          const url = new URL(request.url);
          const limit = Number(url.searchParams.get("limit") ?? 20);
          const meetings = await listMeetings({
            organizationId: profile.organizationId,
            limit: Number.isFinite(limit) ? limit : 20,
          });
          return Response.json({ meetings });
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json({ error: getErrorMessage(error) }, { status: 500 });
        }
      },
    },
  },
});
