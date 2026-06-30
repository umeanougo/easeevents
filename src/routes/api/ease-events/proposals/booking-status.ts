import { createFileRoute } from "@tanstack/react-router";

import { getProjectBookingStatus } from "@/lib/ease-events/proposals.server";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load booking status.";
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 500;
  return Response.json({ error: message }, { status: Number.isFinite(status) ? status : 500 });
}

export const Route = createFileRoute("/api/ease-events/proposals/booking-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const projectId = new URL(request.url).searchParams.get("projectId");
        if (!projectId) return Response.json({ error: "projectId is required." }, { status: 400 });

        try {
          return Response.json(await getProjectBookingStatus(request, projectId));
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
