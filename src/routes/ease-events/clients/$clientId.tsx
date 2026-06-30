import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { ClientDetailPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/clients/$clientId")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Client profile · EaseEvents" }],
  }),
});

function RouteComponent() {
  const { clientId } = Route.useParams();

  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <ClientDetailPage clientId={clientId} />
    </EaseEventsRoute>
  );
}
