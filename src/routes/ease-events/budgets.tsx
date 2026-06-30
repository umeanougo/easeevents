import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { BudgetsPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/budgets")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Budgets · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute allowedRoles={["admin", "planner"]}>
      <BudgetsPage />
    </EaseEventsRoute>
  );
}
