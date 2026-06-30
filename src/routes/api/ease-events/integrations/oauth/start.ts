import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { createOAuthStartUrl } from "@/lib/ease-events/integrations.server";

const StartOAuthSchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  returnPath: z.string().optional(),
});

export const Route = createFileRoute("/api/ease-events/integrations/oauth/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = StartOAuthSchema.safeParse(await request.json().catch(() => null));
        if (!body.success) {
          return Response.json({ error: "Invalid integration request." }, { status: 400 });
        }

        try {
          const url = await createOAuthStartUrl(request, body.data.provider, body.data.returnPath);
          return Response.json({ url });
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json(
            {
              error:
                error instanceof Error ? error.message : "Unable to start provider connection.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
