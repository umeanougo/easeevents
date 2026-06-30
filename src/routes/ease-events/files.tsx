import { createFileRoute } from "@tanstack/react-router";

import { EaseEventsRoute } from "@/components/ease-events/app-shell";
import { FilesPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/files")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Files · EaseEvents" }],
  }),
});

function RouteComponent() {
  return (
    <EaseEventsRoute>
      <FilesPage />
    </EaseEventsRoute>
  );
}
