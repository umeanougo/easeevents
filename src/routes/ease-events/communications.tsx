import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { CommunicationsPage } from "@/components/ease-events/communications-page";

export const Route = createFileRoute("/ease-events/communications")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Communications · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <CommunicationsPage />
    </EaseEventsRoute>
  );
}
