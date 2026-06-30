import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { EventDetailPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/events/$eventId")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Event Workspace · EaseEvents" }],
  }),
});

function RouteComponent() {
  const { eventId } = Route.useParams();
  const location = useLocation();
  if (location.pathname.endsWith("/event-day")) return <Outlet />;

  return (
    <EaseEventsRoute>
      <EventDetailPage eventId={eventId} />
    </EaseEventsRoute>
  );
}
