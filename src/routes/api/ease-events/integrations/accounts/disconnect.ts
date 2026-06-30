import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { disconnectConnectedAccount } from "@/lib/ease-events/integrations.server";

const DisconnectSchema = z.object({
  accountId: z.string().min(1),
});

export const Route = createFileRoute("/api/ease-events/integrations/accounts/disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = DisconnectSchema.safeParse(await request.json().catch(() => null));
        if (!body.success) {
          return Response.json({ error: "Invalid disconnect request." }, { status: 400 });
        }

        try {
          const result = await disconnectConnectedAccount(request, body.data.accountId);
          return Response.json(result);
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json(
            { error: error instanceof Error ? error.message : "Unable to disconnect account." },
            { status: 500 },
          );
        }
      },
    },
  },
});
