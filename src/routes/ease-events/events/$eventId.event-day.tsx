import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { EventDayCommandPage } from "@/components/ease-events/event-day-command";

export const Route = createFileRoute("/ease-events/events/$eventId/event-day")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Event-Day Command · EaseEvents" }],
  }),
});

function RouteComponent() {
  const { eventId } = Route.useParams();
  return (
    <EaseEventsRoute>
      <EventDayCommandPage eventId={eventId} />
    </EaseEventsRoute>
  );
}
