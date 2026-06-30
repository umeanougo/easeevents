import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { ReportsPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/reports")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Reports · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <ReportsPage />
    </EaseEventsRoute>
  );
}
