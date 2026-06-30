import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { syncConnectedMailbox } from "@/lib/ease-events/integrations.server";

const SyncSchema = z.object({
  accountId: z.string().min(1),
});

export const Route = createFileRoute("/api/ease-events/integrations/mail/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = SyncSchema.safeParse(await request.json().catch(() => null));
        if (!body.success) {
          return Response.json({ error: "Invalid mailbox sync request." }, { status: 400 });
        }

        try {
          const result = await syncConnectedMailbox(request, body.data.accountId);
          return Response.json(result);
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json(
            { error: error instanceof Error ? error.message : "Mailbox sync failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
