import { createFileRoute } from "@tanstack/react-router";

import { PublicEaseEventsRoute } from "@/components/ease-events/app-shell";
import { InquiryPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/inquiry")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "New Inquiry · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <PublicEaseEventsRoute>
      <InquiryPage />
    </PublicEaseEventsRoute>
  );
}
