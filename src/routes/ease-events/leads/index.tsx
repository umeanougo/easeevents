import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { LeadsPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/leads/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Leads · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <LeadsPage />
    </EaseEventsRoute>
  );
}
