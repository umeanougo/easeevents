import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { EventsPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/events/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Events · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute>
      <EventsPage />
    </EaseEventsRoute>
  );
}
