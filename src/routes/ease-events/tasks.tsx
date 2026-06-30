import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { WorkPage } from "@/components/ease-events/work-management";

export const Route = createFileRoute("/ease-events/tasks")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Tasks · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner", "vendor"]}>
      <WorkPage />
    </EaseEventsRoute>
  );
}
