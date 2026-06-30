import { createFileRoute } from "@tanstack/react-router";

import { handleOAuthCallback } from "@/lib/ease-events/integrations.server";

export const Route = createFileRoute("/api/ease-events/integrations/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handleOAuthCallback(request),
    },
  },
});
