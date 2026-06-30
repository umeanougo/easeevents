import { createFileRoute } from "@tanstack/react-router";

import {
  getProposalReview,
  ProposalReviewResponseSchema,
  respondToProposalReview,
} from "@/lib/ease-events/proposals.server";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load proposal.";
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 500;
  return Response.json({ error: message }, { status: Number.isFinite(status) ? status : 500 });
}

export const Route = createFileRoute("/api/ease-events/proposals/review/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          return Response.json(await getProposalReview(params.token));
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request, params }) => {
        const parsed = ProposalReviewResponseSchema.safeParse(
          await request.json().catch(() => null),
        );
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid proposal response.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          return Response.json(await respondToProposalReview(params.token, parsed.data, request));
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
