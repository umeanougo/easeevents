import { createFileRoute } from "@tanstack/react-router";

import { ProposalReviewPage } from "@/components/ease-events/pages";

export const Route = createFileRoute("/ease-events/proposals/$token")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Review Proposal · EaseEvents" }],
  }),
});

function RouteComponent() {
  const { token } = Route.useParams();
  return <ProposalReviewPage token={token} />;
}
