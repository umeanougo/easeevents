import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { LeadDetailPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/leads/$leadId")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Lead Detail · EaseEvents" }],
  }),
});

function RouteComponent() {
  const { leadId } = Route.useParams();
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <LeadDetailPage leadId={leadId} />
    </EaseEventsRoute>
  );
}
