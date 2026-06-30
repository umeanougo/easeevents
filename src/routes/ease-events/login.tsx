import { createFileRoute } from "@tanstack/react-router";

import { PublicEaseEventsRoute } from "@/components/ease-events/app-shell";
import { LoginPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/login")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Login · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <PublicEaseEventsRoute>
      <LoginPage />
    </PublicEaseEventsRoute>
  );
}
