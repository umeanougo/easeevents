import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { CalendarPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/calendar")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Calendar · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <CalendarPage />
    </EaseEventsRoute>
  );
}
