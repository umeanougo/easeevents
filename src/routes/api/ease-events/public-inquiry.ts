import { createFileRoute } from "@tanstack/react-router";

import {
  initializePublicInquiry,
  PublicInquirySchema,
} from "@/lib/ease-events/public-inquiry.server";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to submit inquiry.";
}

export const Route = createFileRoute("/api/ease-events/public-inquiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = PublicInquirySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid inquiry.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        try {
          const result = await initializePublicInquiry(parsed.data);
          return Response.json(result);
        } catch (error) {
          return Response.json({ error: getErrorMessage(error) }, { status: 500 });
        }
      },
    },
  },
});
