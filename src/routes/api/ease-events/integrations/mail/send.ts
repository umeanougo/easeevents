import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { sendProjectEmail } from "@/lib/ease-events/integrations.server";

const EmailSchema = z.object({
  accountId: z.string().optional(),
  threadId: z.string().optional(),
  thread: z
    .object({
      eventId: z.string().min(1),
      projectId: z.string().optional(),
      leadId: z.string().optional(),
      assignedToId: z.string().optional(),
      subject: z.string().min(1),
      clientName: z.string().min(1),
      participants: z.array(z.string()),
    })
    .optional(),
  eventId: z.string().min(1),
  projectId: z.string().optional(),
  leadId: z.string().optional(),
  to: z.array(z.string()).min(1),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  visibility: z.enum(["Internal", "Client", "Vendor"]).optional(),
  idempotencyKey: z.string().optional(),
});

export const Route = createFileRoute("/api/ease-events/integrations/mail/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = EmailSchema.safeParse(await request.json().catch(() => null));
        if (!body.success) {
          return Response.json(
            { error: "Invalid email send request.", issues: body.error.issues },
            { status: 400 },
          );
        }

        try {
          const result = await sendProjectEmail(request, body.data);
          return Response.json(result);
        } catch (error) {
          if (error instanceof Response) return error;
          return Response.json(
            { error: error instanceof Error ? error.message : "Unable to send email." },
            { status: 500 },
          );
        }
      },
    },
  },
});
