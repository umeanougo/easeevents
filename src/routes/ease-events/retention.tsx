import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { RetentionPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/retention")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Retention · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <RetentionPage />
    </EaseEventsRoute>
  );
}
