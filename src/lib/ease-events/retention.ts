import type {
  ClientRecord,
  CommunicationEligibilityLog,
  EaseEventsData,
  RebookingOpportunity,
} from "./types";

export interface ClientRelationshipMetrics {
  eventCount: number;
  closedEventCount: number;
  leadCount: number;
  opportunityCount: number;
  referralCount: number;
  contractedRevenue: number;
  invoicedRevenue: number;
  collectedRevenue: number;
  lastEventDate?: string;
  nextMilestoneDate?: string;
}

export interface CommunicationEligibilityResult {
  allowed: boolean;
  consentStatus: string;
  consentSource?: string;
  consentRecordId?: string;
  requiresManualReview: boolean;
  suppressionReason?: string;
  unsubscribeStatus?: string;
  explanation: string;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function calculateNextMilestoneOccurrence(
  month: number | undefined,
  day: number | undefined,
  fromDate = new Date(),
) {
  if (!month || !day) return undefined;
  const year = fromDate.getUTCFullYear();
  const thisYear = new Date(Date.UTC(year, month - 1, day));
  const next =
    thisYear.getTime() >= fromDate.getTime()
      ? thisYear
      : new Date(Date.UTC(year + 1, month - 1, day));
  return dateOnly(next);
}

export function getClientRelationshipMetrics(
  data: EaseEventsData,
  clientId: string,
): ClientRelationshipMetrics {
  const events = data.events.filter((event) => event.clientId === clientId);
  const leads = data.leads.filter((lead) => lead.clientId === clientId);
  const projects = data.projects.filter((project) => project.clientId === clientId);
  const projectIds = new Set(projects.map((project) => project.id));
  const eventIds = new Set(events.map((event) => event.id));
  const proposals = data.proposals.filter(
    (proposal) => proposal.clientId === clientId || projectIds.has(proposal.projectId),
  );
  const acceptedProposalIds = new Set(
    proposals.filter((proposal) => proposal.status === "Accepted").map((proposal) => proposal.id),
  );
  const contractedRevenue = data.proposalVersions
    .filter((version) => acceptedProposalIds.has(version.proposalId))
    .reduce((sum, version) => sum + version.totalAmount, 0);
  const invoicedRevenue = data.invoices
    .filter(
      (invoice) =>
        invoice.clientId === clientId ||
        (invoice.projectId && projectIds.has(invoice.projectId)) ||
        (invoice.eventId && eventIds.has(invoice.eventId)),
    )
    .filter((invoice) => invoice.status !== "Cancelled" && invoice.status !== "Draft")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const invoiceIds = new Set(
    data.invoices
      .filter(
        (invoice) =>
          invoice.clientId === clientId ||
          (invoice.projectId && projectIds.has(invoice.projectId)) ||
          (invoice.eventId && eventIds.has(invoice.eventId)),
      )
      .map((invoice) => invoice.id),
  );
  const collectedRevenue = data.invoicePayments
    .filter((payment) => invoiceIds.has(payment.invoiceId))
    .reduce((sum, payment) => sum + payment.amount, 0);
  const sortedEvents = [...events].sort(
    (left, right) => new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime(),
  );
  const milestones = data.clientMilestones
    .filter((milestone) => milestone.clientId === clientId && milestone.isActive)
    .sort(
      (left, right) =>
        new Date(left.nextOccurrenceDate ?? left.milestoneDate ?? "9999-12-31").getTime() -
        new Date(right.nextOccurrenceDate ?? right.milestoneDate ?? "9999-12-31").getTime(),
    );

  return {
    eventCount: events.length,
    closedEventCount: events.filter((event) => event.status === "Completed").length,
    leadCount: leads.length,
    opportunityCount: data.rebookingOpportunities.filter((item) => item.clientId === clientId)
      .length,
    referralCount: data.referrals.filter(
      (referral) =>
        referral.referringClientId === clientId || referral.referredClientId === clientId,
    ).length,
    contractedRevenue:
      contractedRevenue || events.reduce((sum, event) => sum + event.clientPrice, 0),
    invoicedRevenue,
    collectedRevenue,
    lastEventDate: sortedEvents[0]?.eventDate,
    nextMilestoneDate: milestones[0]?.nextOccurrenceDate ?? milestones[0]?.milestoneDate,
  };
}

export function getCommunicationEligibility(
  data: EaseEventsData,
  client: ClientRecord | undefined,
  category = "retention",
): CommunicationEligibilityResult {
  const settings = data.retentionSettings.find(
    (item) => item.organizationId === data.organization.id,
  );
  if (!client) {
    return {
      allowed: false,
      consentStatus: "Unknown",
      requiresManualReview: true,
      suppressionReason: "missing_client",
      explanation: "No canonical client record is available for this outreach.",
    };
  }

  if (client.marketingUnsubscribedAt) {
    return {
      allowed: false,
      consentStatus: "Revoked",
      requiresManualReview: true,
      suppressionReason: "unsubscribed",
      unsubscribeStatus: "Unsubscribed",
      explanation: "The client has unsubscribed from future marketing communication.",
    };
  }

  if (
    client.relationshipStatus === "Do Not Market" ||
    client.futureEventCommunicationPreference === "Do Not Market" ||
    client.futureEventCommunicationPreference === "Unsubscribed"
  ) {
    return {
      allowed: false,
      consentStatus: client.futureEventCommunicationPreference ?? "Do Not Market",
      requiresManualReview: true,
      suppressionReason: "do_not_market",
      unsubscribeStatus: client.futureEventCommunicationPreference,
      explanation: "This client is marked as do-not-market or unsubscribed.",
    };
  }

  const marketingConsent = data.clientConsents
    .filter(
      (consent) =>
        consent.clientId === client.id && consent.consentType === "Marketing Communication",
    )
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];
  if (marketingConsent?.status === "Revoked" || marketingConsent?.status === "Declined") {
    return {
      allowed: false,
      consentStatus: marketingConsent.status,
      consentSource: marketingConsent.source,
      consentRecordId: marketingConsent.id,
      requiresManualReview: true,
      suppressionReason: "marketing_consent_declined",
      explanation: "The latest marketing communication consent is not granted.",
    };
  }
  if (marketingConsent?.status === "Granted") {
    const expiresAt = parseDate(marketingConsent.expiresAt);
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return {
        allowed: false,
        consentStatus: "Expired",
        consentSource: marketingConsent.source,
        consentRecordId: marketingConsent.id,
        requiresManualReview: true,
        suppressionReason: "marketing_consent_expired",
        explanation: "Marketing consent exists, but it has expired and needs review.",
      };
    }
    return {
      allowed: settings?.promotionalOutreachEnabled ?? false,
      consentStatus: "Granted",
      consentSource: marketingConsent.source,
      consentRecordId: marketingConsent.id,
      requiresManualReview: settings?.manualComplianceReview ?? true,
      explanation: settings?.promotionalOutreachEnabled
        ? "Marketing consent is granted. Respect the configured safe-email mode before sending."
        : "Marketing consent is granted, but promotional outreach is disabled for this organization.",
    };
  }

  if (
    client.futureEventCommunicationPreference === "Allowed" &&
    !settings?.expressConsentRequired
  ) {
    return {
      allowed: true,
      consentStatus: "Preference Allowed",
      requiresManualReview: settings?.manualComplianceReview ?? true,
      explanation:
        "The client preference permits future-event communication; staff review is still recommended.",
    };
  }

  return {
    allowed: false,
    consentStatus: client.futureEventCommunicationPreference ?? "Manual Review",
    requiresManualReview: true,
    suppressionReason: category === "service" ? undefined : "manual_review_required",
    explanation:
      category === "service"
        ? "Service-related communication may be logged manually; promotional outreach requires consent review."
        : "Future-event outreach should stay as an internal draft until consent and purpose are confirmed.",
  };
}

export function buildEligibilityLogInput(params: {
  client: ClientRecord;
  opportunity?: RebookingOpportunity;
  result: CommunicationEligibilityResult;
  channel?: string;
  communicationCategory?: string;
  checkedById?: string;
  idempotencyKey?: string;
}): Omit<CommunicationEligibilityLog, "id" | "organizationId" | "createdAt"> {
  return {
    clientId: params.client.id,
    opportunityId: params.opportunity?.id,
    channel: params.channel ?? "Email",
    communicationCategory: params.communicationCategory ?? "retention",
    allowed: params.result.allowed,
    consentStatus: params.result.consentStatus,
    consentSource: params.result.consentSource,
    consentRecordId: params.result.consentRecordId,
    suppressionReason: params.result.suppressionReason,
    unsubscribeStatus: params.result.unsubscribeStatus,
    requiresManualReview: params.result.requiresManualReview,
    explanation: params.result.explanation,
    checkedById: params.checkedById,
    idempotencyKey: params.idempotencyKey,
    metadata: {},
  };
}

export function getRetentionActionItems(data: EaseEventsData) {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const openStages = new Set([
    "Review Required",
    "Ready to Contact",
    "Planned Follow-Up",
    "Contacted",
  ]);
  const dueOpportunities = data.rebookingOpportunities.filter((opportunity) => {
    if (!openStages.has(opportunity.stage)) return false;
    const due = parseDate(opportunity.nextActionAt ?? opportunity.targetContactDate);
    return !due || due.getTime() <= now + thirtyDays;
  });
  const upcomingMilestones = data.clientMilestones.filter((milestone) => {
    if (!milestone.isActive) return false;
    const due = parseDate(milestone.nextOccurrenceDate ?? milestone.milestoneDate);
    return Boolean(due && due.getTime() <= now + 90 * 24 * 60 * 60 * 1000);
  });
  const referralsNeedingReview = data.referrals.filter((referral) =>
    ["Submitted", "Review Required", "Introduction Pending"].includes(referral.status),
  );

  return { dueOpportunities, upcomingMilestones, referralsNeedingReview };
}
