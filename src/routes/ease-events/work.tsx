import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { WorkPage } from "@/components/ease-events/work-management";

export const Route = createFileRoute("/ease-events/work")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Work · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner", "vendor"]}>
      <WorkPage />
    </EaseEventsRoute>
  );
}
