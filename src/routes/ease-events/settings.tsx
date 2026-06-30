import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { SettingsPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/settings")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Settings · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute>
      <SettingsPage />
    </EaseEventsRoute>
  );
}
