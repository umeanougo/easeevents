import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { DashboardPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/")({
  component: RouteComponent,
  head: () => ({
    meta: [
      { title: "EaseEvents Dashboard" },
      {
        name: "description",
        content:
          "Event operations dashboard for Coco Cabana leads, events, budgets, tasks, approvals, and vendors.",
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute>
      <DashboardPage />
    </EaseEventsRoute>
  );
}
