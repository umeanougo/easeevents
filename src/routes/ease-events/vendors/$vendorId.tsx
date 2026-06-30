import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { VendorDetailPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/vendors/$vendorId")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Vendor Profile · EaseEvents" }],
  }),
});

function RouteComponent() {
  const { vendorId } = Route.useParams();
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner", "vendor"]}>
      <VendorDetailPage vendorId={vendorId} />
    </EaseEventsRoute>
  );
}
