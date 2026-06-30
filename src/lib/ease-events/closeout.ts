import { getProjectFinanceSummary } from "./finance";
import type {
  EaseEventsData,
  EventRecord,
  PostEventCloseout,
  PostEventCloseoutItem,
  ProjectFinanceSummary,
  ProjectRecord,
} from "./types";

export type CloseoutReadinessItem = {
  label: string;
  status: "complete" | "blocked" | "warning" | "info";
  requirement: "Required" | "Recommended" | "Informational";
  detail: string;
  href?: string;
};

export type CloseoutReadinessSummary = {
  completionPercentage: number;
  blockers: CloseoutReadinessItem[];
  warnings: CloseoutReadinessItem[];
  informational: CloseoutReadinessItem[];
  finance: ProjectFinanceSummary;
  isReadyToClose: boolean;
  nextAction: string;
};

function isCompleteStatus(status: string) {
  return (
    status === "Complete" || status === "Ready" || status === "Overridden" || status === "Deferred"
  );
}

export function getEventCloseout(data: EaseEventsData, event: EventRecord) {
  return data.postEventCloseouts.find((closeout) => closeout.eventId === event.id);
}

export function getCloseoutItems(data: EaseEventsData, closeout?: PostEventCloseout) {
  if (!closeout) return [] as PostEventCloseoutItem[];
  return data.postEventCloseoutItems
    .filter((item) => item.closeoutId === closeout.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function buildCloseoutReadiness(
  data: EaseEventsData,
  event: EventRecord,
  project?: ProjectRecord,
): CloseoutReadinessSummary {
  const closeout = getEventCloseout(data, event);
  const items = getCloseoutItems(data, closeout);
  const projectId = project?.id ?? event.projectId;
  const finance = getProjectFinanceSummary(data, projectId, event.id);
  const unresolvedIssues = data.eventDayIssues.filter(
    (issue) => issue.eventId === event.id && !["Resolved", "Closed"].includes(issue.status),
  );
  const criticalIssues = unresolvedIssues.filter((issue) => issue.severity === "Critical");
  const deliverables = data.finalDeliverables.filter(
    (deliverable) => deliverable.eventId === event.id,
  );
  const clientVisibleDelivered = deliverables.filter(
    (deliverable) =>
      deliverable.clientVisible &&
      ["Delivered", "Viewed", "Acknowledged"].includes(deliverable.status),
  );
  const eventVendorAssignments = data.eventVendors.filter(
    (assignment) => assignment.eventId === event.id,
  );
  const vendorReviews = data.vendorPerformanceReviews.filter(
    (review) => review.eventId === event.id,
  );
  const feedback = data.clientFeedbackResponses.find((response) => response.eventId === event.id);
  const retrospective = data.internalRetrospectives.find((record) => record.eventId === event.id);
  const requiredItems = items.filter((item) => item.requirementLevel === "Required");
  const requiredComplete = requiredItems.filter((item) => isCompleteStatus(item.status)).length;
  const completionFromItems = requiredItems.length
    ? Math.round((requiredComplete / requiredItems.length) * 100)
    : (closeout?.completionPercentage ?? 0);

  const readiness: CloseoutReadinessItem[] = [
    {
      label: "Event-Day Mode completed",
      status: data.eventDaySessions.some(
        (session) => session.eventId === event.id && session.status === "Completed",
      )
        ? "complete"
        : "blocked",
      requirement: "Required",
      detail: "Operational execution must be ended before closeout can finish.",
      href: `/ease-events/events/${event.id}/event-day`,
    },
    {
      label: "Critical event-day issues resolved",
      status: criticalIssues.length ? "blocked" : unresolvedIssues.length ? "warning" : "complete",
      requirement: "Required",
      detail: criticalIssues.length
        ? `${criticalIssues.length} critical issue${criticalIssues.length === 1 ? "" : "s"} still open.`
        : unresolvedIssues.length
          ? `${unresolvedIssues.length} non-critical issue${unresolvedIssues.length === 1 ? "" : "s"} still need owner review.`
          : "No unresolved event-day issues.",
    },
    {
      label: "Client balance reconciled",
      status: finance.outstandingClientBalance > 0 ? "blocked" : "complete",
      requirement: "Required",
      detail:
        finance.outstandingClientBalance > 0
          ? "A client balance remains open or needs an authorized deferral."
          : "Client invoice balance is clear.",
      href: `/ease-events/events/${event.id}?tab=finances`,
    },
    {
      label: "Vendor balance reconciled",
      status: finance.outstandingExpenseBalance > 0 ? "warning" : "complete",
      requirement: "Required",
      detail:
        finance.outstandingExpenseBalance > 0
          ? "Vendor/expense balances remain open or need an authorized deferral."
          : "Recorded vendor/expense balances are clear.",
      href: `/ease-events/events/${event.id}?tab=finances`,
    },
    {
      label: "Final deliverables delivered",
      status: clientVisibleDelivered.length
        ? "complete"
        : deliverables.length
          ? "warning"
          : "blocked",
      requirement: "Required",
      detail: clientVisibleDelivered.length
        ? `${clientVisibleDelivered.length} client-facing deliverable${clientVisibleDelivered.length === 1 ? "" : "s"} delivered.`
        : deliverables.length
          ? "Deliverables exist, but none are marked delivered to the client."
          : "No final deliverables have been prepared.",
    },
    {
      label: "Vendor reviews completed",
      status:
        eventVendorAssignments.length === 0 || vendorReviews.length >= eventVendorAssignments.length
          ? "complete"
          : "warning",
      requirement: "Recommended",
      detail: `${vendorReviews.length}/${eventVendorAssignments.length} assigned vendor reviews completed.`,
    },
    {
      label: "Client feedback captured",
      status: feedback ? (feedback.concernLevel === "High" ? "blocked" : "complete") : "warning",
      requirement: "Recommended",
      detail: feedback
        ? feedback.concernLevel === "High"
          ? "Client feedback has a high concern and requires service recovery review."
          : "Client feedback is recorded."
        : "Client feedback has not been submitted yet.",
    },
    {
      label: "Internal retrospective completed",
      status: retrospective && isCompleteStatus(retrospective.status) ? "complete" : "warning",
      requirement: "Recommended",
      detail:
        retrospective && isCompleteStatus(retrospective.status)
          ? "Internal lessons learned are captured."
          : "Retrospective is not complete.",
    },
  ];

  const blockers = readiness.filter((item) => item.status === "blocked");
  const warnings = readiness.filter((item) => item.status === "warning");
  const informational = readiness.filter((item) => item.status === "info");
  const nextAction =
    blockers[0]?.label ??
    warnings[0]?.label ??
    (closeout?.status === "Closed" ? "Closed" : "Ready for authorized closure");

  return {
    completionPercentage: closeout?.completionPercentage
      ? Math.max(closeout.completionPercentage, completionFromItems)
      : completionFromItems,
    blockers,
    warnings,
    informational,
    finance,
    isReadyToClose: blockers.length === 0,
    nextAction,
  };
}
