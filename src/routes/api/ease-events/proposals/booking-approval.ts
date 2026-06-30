import { createFileRoute } from "@tanstack/react-router";

import { approveProjectBooking, ManualApprovalSchema } from "@/lib/ease-events/proposals.server";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to approve booking.";
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 500;
  return Response.json({ error: message }, { status: Number.isFinite(status) ? status : 500 });
}

export const Route = createFileRoute("/api/ease-events/proposals/booking-approval")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = ManualApprovalSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid approval request.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          return Response.json(await approveProjectBooking(request, parsed.data));
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
