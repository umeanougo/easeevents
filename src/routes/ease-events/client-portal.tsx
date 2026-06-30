import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { ClientPortalPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/client-portal")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Client Portal · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner", "client"]}>
      <ClientPortalPage />
    </EaseEventsRoute>
  );
}
