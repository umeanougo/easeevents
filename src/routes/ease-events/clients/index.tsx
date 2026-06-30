import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { ClientsPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/clients/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Clients · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <ClientsPage />
    </EaseEventsRoute>
  );
}
