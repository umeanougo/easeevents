import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { VendorsPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/vendors/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Vendors · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner", "vendor"]}>
      <VendorsPage />
    </EaseEventsRoute>
  );
}
