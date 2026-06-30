/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

import type {
  Approval,
  ApprovalStatus,
  ApprovalTemplate,
  AvailabilityBlock,
  BudgetTemplate,
  BudgetItem,
  CalendarConflict,
  CalendarSyncRun,
  CalendarSyncState,
  ClientConsent,
  ClientConsentStatus,
  ClientConsentType,
  ClientMilestone,
  ClientRecord,
  ClientReferralLink,
  ClientFeedbackResponse,
  ClientMilestoneType,
  ClientRelationshipStatus,
  CloseoutDeliverableStatus,
  CloseoutFinancialSnapshot,
  CloseoutReadinessStatus,
  CloseoutRequirementLevel,
  ConnectedAccount,
  CommunicationEligibilityLog,
  CommunicationMessage,
  CommunicationThread,
  CommentMessage,
  CommunicationDirection,
  CommunicationThreadStatus,
  EaseEventsData,
  EmailTemplate,
  EventTemplate,
  EventDayIssue,
  EventDayIssueSeverity,
  EventDayIssueStatus,
  EventDayIssueType,
  EventDaySession,
  EventDaySessionStatus,
  EventDayVendorStatus,
  EventDayVendorStatusRecord,
  EventFile,
  EventRecord,
  EventTeamMember,
  EventVendor,
  FinalDeliverable,
  ExternalCalendarEvent,
  ExpenseFileRecord,
  ExpensePaymentRecord,
  ExpenseRecord,
  InvoiceRecord,
  InvoicePaymentRecord,
  InvoiceStatus,
  InvoiceType,
  Lead,
  LeadStage,
  OrganizationBookingSettings,
  MeetingActionItem,
  MeetingRecord,
  MeetingStatus,
  MeetingType,
  Organization,
  ProjectBookingApproval,
  OrganizationFinanceSettings,
  OrganizationCloseoutSettings,
  OrganizationRetentionSettings,
  PostEventCloseout,
  PostEventCloseoutItem,
  PostEventCloseoutStatus,
  ProjectActivityEvent,
  ProjectInspirationLink,
  ProjectRecord,
  ProjectReminder,
  NotificationPreference,
  NotificationRecord,
  ProposalFile,
  ProposalLineItem,
  ProposalPaymentTerm,
  ProposalRecord,
  ProposalResponse,
  ProposalVersion,
  ReferralRecord,
  ReferralStatus,
  RebookingOpportunity,
  RebookingOpportunityStage,
  RebookingOpportunityType,
  RelationshipCommunicationPreference,
  TaskAttachment,
  TaskChecklist,
  TaskChecklistItem,
  TaskInboxItem,
  TaskLabel,
  TaskLabelAssignment,
  TaskLink,
  TaskParticipant,
  TaskSavedView,
  TaskTemplate,
  TaskWorkflowColumn,
  TaskRecord,
  TaskStatus,
  TimelineItem,
  TimelineVersion,
  TimelineVersionStatus,
  TimelineItemStatus,
  UpdateClientDetailsInput,
  UpdateEventDetailsInput,
  Vendor,
  VendorTemplate,
  SchedulingPreference,
  InternalRetrospective,
  VendorPerformanceReview,
  WorkflowActionRun,
  WorkflowAutomation,
  WorkflowAutomationAction,
  WorkflowAutomationStatus,
  WorkflowEvent,
  WorkflowExecution,
} from "./types";

export interface CreateLeadInput {
  clientName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  estimatedGuestCount: number;
  budgetRange: string;
  notes: string;
  source: string;
  inspirationLinks?: Array<{ label?: string; url: string }>;
}

export interface UpdateLeadInput extends CreateLeadInput {
  ownerId?: string;
}

export interface CreateTaskInput {
  projectId?: string;
  leadId?: string;
  eventId?: string;
  ownerId?: string;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskRecord["priority"];
  status?: TaskRecord["status"];
  workflowColumnId?: string;
  normalizedStatus?: TaskRecord["normalizedStatus"];
  position?: number;
  startAt?: string;
  dueAt?: string;
  visibility?: TaskRecord["visibility"];
  estimatedEffortMinutes?: number;
  workType?: TaskRecord["workType"];
  sourceType?: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  links?: Array<{ label?: string; url: string }>;
  labelIds?: string[];
  assigneeIds?: string[];
  watcherIds?: string[];
  checklistGroups?: Array<{
    title: string;
    items: Array<{ title: string; assigneeId?: string; dueAt?: string }>;
  }>;
}

export interface UpdateTaskInput extends CreateTaskInput {
  status: TaskRecord["status"];
  archivedAt?: string;
  archivedById?: string;
}

export interface UpdateTaskWorkStateInput {
  status?: TaskRecord["status"];
  workflowColumnId?: string;
  normalizedStatus?: TaskRecord["normalizedStatus"];
  position?: number;
  ownerId?: string;
  dueDate?: string;
  dueAt?: string;
  priority?: TaskRecord["priority"];
  visibility?: TaskRecord["visibility"];
  archivedAt?: string | null;
  archivedById?: string | null;
  cardCoverFileId?: string | null;
}

export interface CreateTaskLabelInput {
  name: string;
  color: string;
  description?: string;
}

export interface CreateTaskChecklistInput {
  taskId: string;
  title: string;
  sortOrder?: number;
}

export interface CreateTaskChecklistItemInput {
  taskId: string;
  checklistId?: string;
  title: string;
  assigneeId?: string;
  dueAt?: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateTaskChecklistItemInput {
  title?: string;
  isComplete?: boolean;
  assigneeId?: string | null;
  dueAt?: string | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface CreateTaskCommentInput {
  taskId: string;
  body: string;
  visibility?: "Internal" | "Client" | "Vendor";
  mentions?: string[];
}

export interface AttachTaskFileInput {
  taskId: string;
  fileId: string;
  label?: string;
}

export interface CreateTaskInboxItemInput {
  projectId?: string;
  eventId?: string;
  sourceType: string;
  sourceTable?: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  rawContent?: string;
  summary?: string;
  suggestedProjectId?: string;
  suggestedTitle?: string;
  suggestedOwnerId?: string;
  suggestedDueAt?: string;
  suggestedStatus?: TaskStatus;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEventTeamMemberInput {
  eventId: string;
  userId: string;
  roleLabel: string;
}

export interface CreateBudgetItemInput {
  eventId: string;
  vendorId?: string;
  category: BudgetItem["category"];
  description: string;
  plannedAmount: number;
  actualAmount: number;
  paidAmount: number;
  dueDate: string;
  marginEstimate: number;
}

export type UpdateBudgetItemInput = CreateBudgetItemInput;

export interface CreateInvoiceInput {
  projectId?: string;
  eventId?: string;
  clientId?: string;
  proposalId?: string;
  proposalVersionId?: string;
  proposalPaymentTermId?: string;
  invoiceType: InvoiceType;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateInvoiceInput extends CreateInvoiceInput {
  invoiceNumber: string;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
}

export interface CreateVendorInput {
  name: string;
  serviceCategory: Vendor["serviceCategory"];
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  notes: string;
  rating: number;
}

export interface CreateEventVendorInput {
  eventId: string;
  vendorId: string;
  serviceCategory: EventVendor["serviceCategory"];
  quotedAmount: number;
  actualAmount: number;
  paymentStatus: EventVendor["paymentStatus"];
  notes: string;
}

export interface CreateExpenseInput {
  projectId: string;
  eventId?: string;
  vendorId?: string;
  budgetItemId?: string;
  createdById?: string;
  approvedById?: string;
  expenseNumber?: string;
  description: string;
  category: ExpenseRecord["category"];
  source: ExpenseRecord["source"];
  status: ExpenseRecord["status"];
  currency: string;
  subtotal: number;
  taxAmount: number;
  serviceFeeAmount: number;
  tipAmount: number;
  totalAmount: number;
  expenseDate: string;
  dueDate?: string;
  notes?: string;
  paymentReference?: string;
  clientBillable: boolean;
  reimbursable: boolean;
  bookkeepingStatus: ExpenseRecord["bookkeepingStatus"];
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export type UpdateExpenseInput = CreateExpenseInput;

export interface CreateExpensePaymentInput {
  expenseId: string;
  amount: number;
  currency: string;
  paymentMethod: ExpensePaymentRecord["paymentMethod"];
  paymentDate: string;
  reference?: string;
  notes?: string;
  recordedById?: string;
  status: ExpensePaymentRecord["status"];
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface AttachExpenseFileInput {
  expenseId: string;
  fileId: string;
  visibility?: ExpenseFileRecord["visibility"];
  caption?: string;
  createdById?: string;
}

export interface CreateCommunicationThreadInput {
  projectId?: string;
  leadId?: string;
  eventId: string;
  assignedToId?: string;
  subject: string;
  clientName: string;
  participants: string[];
  channel: CommunicationThread["channel"];
  status: CommunicationThreadStatus;
  integrationSource?: string;
  preview: string;
  unreadCount: number;
  lastActivityAt: string;
}

export interface CreateCommunicationMessageInput {
  projectId?: string;
  leadId?: string;
  threadId: string;
  eventId: string;
  authorId?: string;
  direction: CommunicationDirection;
  body: string;
  summary?: string;
  visibility: CommunicationMessage["visibility"];
  externalProvider?: CommunicationMessage["externalProvider"];
  externalMessageId?: string;
  deliveryStatus?: string;
  deliveryMode?: CommunicationMessage["deliveryMode"];
  deliveryError?: string;
  metadata?: Record<string, unknown>;
  sentAt: string;
}

export interface CreateClientMilestoneInput {
  clientId: string;
  sourceProjectId?: string;
  milestoneType: ClientMilestoneType;
  title: string;
  milestoneDate?: string;
  month?: number;
  day?: number;
  recurrenceRule?: string;
  reminderOffsetDays?: number;
  nextOccurrenceDate?: string;
  sensitivity?: ClientMilestone["sensitivity"];
  source?: string;
  consentOrPurposeReferenceId?: string;
  isActive?: boolean;
  notes?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdById?: string;
}

export interface UpdateClientMilestoneInput extends CreateClientMilestoneInput {}

export interface CreateRebookingOpportunityInput {
  clientId: string;
  sourceProjectId?: string;
  sourceEventId?: string;
  sourceMilestoneId?: string;
  sourceReferralId?: string;
  assignedToId?: string;
  opportunityType: RebookingOpportunityType;
  title: string;
  description?: string;
  stage?: RebookingOpportunityStage;
  estimatedEventDate?: string;
  targetContactDate?: string;
  estimatedValue?: number;
  estimatedProbability?: number;
  eventType?: string;
  preferredContactChannel?: string;
  consentStatusSnapshot?: string;
  nextAction?: string;
  nextActionAt?: string;
  contactedAt?: string;
  respondedAt?: string;
  convertedLeadId?: string;
  convertedProjectId?: string;
  lostReason?: string;
  snoozedUntil?: string;
  aiSummary?: string;
  aiSummaryGeneratedAt?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdById?: string;
}

export interface UpdateRebookingOpportunityInput extends CreateRebookingOpportunityInput {}

export interface CreateClientReferralLinkInput {
  clientId: string;
  projectId?: string;
  referralCode: string;
  sourceCampaign?: string;
  expiresAt?: string;
  isActive?: boolean;
  createdById?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateReferralInput {
  referringClientId?: string;
  referringProjectId?: string;
  referralLinkId?: string;
  referredLeadId?: string;
  referredClientId?: string;
  assignedToId?: string;
  referralCode?: string;
  referralSource?: string;
  referrerNameSnapshot?: string;
  referredName?: string;
  referredEmail?: string;
  referredPhone?: string;
  status?: ReferralStatus;
  introductionMethod?: string;
  consentOrContactBasis?: string;
  firstContactAt?: string;
  convertedAt?: string;
  convertedProjectId?: string;
  rewardStatus?: ReferralRecord["rewardStatus"];
  rewardDescription?: string;
  notes?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateReferralInput extends CreateReferralInput {}

export interface CreateCommunicationEligibilityLogInput {
  clientId?: string;
  opportunityId?: string;
  referralId?: string;
  channel: string;
  communicationCategory: string;
  allowed: boolean;
  consentStatus?: string;
  consentSource?: string;
  consentRecordId?: string;
  expiryOrReviewAt?: string;
  suppressionReason?: string;
  unsubscribeStatus?: string;
  jurisdictionProfile?: string;
  requiresManualReview: boolean;
  explanation: string;
  checkedById?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ConvertRebookingOpportunityInput {
  ownerId?: string;
  eventDate?: string;
  eventType?: string;
  notes?: string;
  source?: string;
}

export interface CreateMeetingInput {
  projectId?: string;
  leadId?: string;
  eventId: string;
  title: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  startAt: string;
  endAt: string;
  organizerId?: string;
  connectedAccountId?: string;
  externalProvider?: ConnectedAccount["provider"];
  externalCalendarId?: string;
  externalEventId?: string;
  externalConferenceUrl?: string;
  syncedAt?: string;
  attendees: string[];
  agenda: string;
  link?: string;
  transcript: string;
  internalSummary: string;
  clientSummary: string;
  notes: string;
  actionItems: MeetingActionItem[];
  timezone?: string;
  syncStatus?: string;
  syncError?: string;
  fathomExpected?: boolean;
  idempotencyKey?: string;
}

export type UpdateMeetingInput = CreateMeetingInput;

export interface CreateProjectReminderInput {
  projectId: string;
  assignedToId?: string;
  title: string;
  dueAt?: string;
  status?: ProjectReminder["status"];
  automationSource?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateProjectReminderInput = CreateProjectReminderInput;

export interface UpdateWorkflowAutomationInput {
  name?: string;
  description?: string;
  status?: WorkflowAutomationStatus;
  approvalPolicy?: WorkflowAutomation["approvalPolicy"];
  cooldownMinutes?: number;
  priority?: number;
  conditions?: Record<string, unknown>[];
  quietHours?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationInput {
  status?: NotificationRecord["status"];
  readAt?: string | null;
  dismissedAt?: string | null;
}

export interface CreateNotificationInput {
  recipientUserId?: string;
  projectId?: string;
  eventId?: string;
  notificationType: string;
  severity?: NotificationRecord["severity"];
  title: string;
  body?: string;
  href?: string;
  channel?: NotificationRecord["channel"];
  actionRequired?: boolean;
  dueAt?: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}

export interface EnsurePostEventCloseoutInput {
  projectId: string;
  eventId: string;
  ownerId?: string;
  eventCompletedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePostEventCloseoutInput {
  status?: PostEventCloseoutStatus;
  ownerId?: string;
  completionPercentage?: number;
  unresolvedIssueCount?: number;
  financialStatus?: CloseoutReadinessStatus;
  deliverableStatus?: CloseoutReadinessStatus;
  feedbackStatus?: CloseoutReadinessStatus;
  vendorReviewStatus?: CloseoutReadinessStatus;
  internalReviewStatus?: CloseoutReadinessStatus;
  retentionStatus?: CloseoutReadinessStatus;
  finalNotes?: string;
  retentionHandoff?: Record<string, unknown>;
  readinessOverrides?: Record<string, unknown>[];
  readyToCloseAt?: string | null;
  closedAt?: string | null;
  closedById?: string | null;
  reopenedAt?: string | null;
  reopenedById?: string | null;
  reopenReason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdatePostEventCloseoutItemInput {
  status: CloseoutReadinessStatus;
  ownerId?: string;
  dueDate?: string;
  notes?: string;
  completedAt?: string | null;
  completedById?: string | null;
  overrideReason?: string | null;
}

export interface UpsertFinalDeliverableInput {
  id?: string;
  closeoutId?: string;
  projectId: string;
  eventId: string;
  fileId?: string;
  title: string;
  description?: string;
  category: string;
  externalUrl?: string;
  clientVisible: boolean;
  status: CloseoutDeliverableStatus;
  dueDate?: string;
  deliveredAt?: string;
  deliveredById?: string;
  expiresAt?: string;
  sortOrder?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitClientFeedbackInput {
  closeoutId?: string;
  projectId: string;
  eventId: string;
  clientId?: string;
  submittedById?: string;
  responderName?: string;
  responderEmail?: string;
  overallSatisfaction?: number;
  communicationRating?: number;
  planningProcessRating?: number;
  executionRating?: number;
  valueRating?: number;
  likelihoodToRecommend?: number;
  whatWentWell?: string;
  whatCouldImprove?: string;
  additionalComments?: string;
  permissionToContact?: boolean;
  concernLevel?: ClientFeedbackResponse["concernLevel"];
  serviceRecoveryStatus?: ClientFeedbackResponse["serviceRecoveryStatus"];
  metadata?: Record<string, unknown>;
}

export interface UpsertClientConsentInput {
  projectId?: string;
  eventId?: string;
  clientId?: string;
  consentType: ClientConsentType;
  status: ClientConsentStatus;
  consentWordingVersion?: string;
  requestedAt?: string;
  grantedAt?: string;
  declinedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  source?: string;
  capturedById?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertVendorPerformanceReviewInput {
  projectId: string;
  eventId: string;
  eventVendorId?: string;
  vendorId: string;
  reviewerId?: string;
  overallRating?: number;
  communicationRating?: number;
  punctualityRating?: number;
  qualityRating?: number;
  budgetAccuracyRating?: number;
  professionalismRating?: number;
  issueCount?: number;
  wouldUseAgain?: boolean;
  preferredVendorRecommendation?: string;
  operationalContext?: Record<string, unknown>;
  notes?: string;
}

export interface UpsertInternalRetrospectiveInput {
  closeoutId?: string;
  projectId: string;
  eventId: string;
  status: CloseoutReadinessStatus;
  facilitatorId?: string;
  contributors?: Record<string, unknown>[];
  whatWentWell?: string;
  whatDidNotGoWell?: string;
  majorDelays?: string;
  clientRequestChanges?: string;
  vendorIssues?: string;
  teamIssues?: string;
  budgetLessons?: string;
  schedulingLessons?: string;
  venueLessons?: string;
  processImprovements?: string;
  templateChangesRecommended?: string;
  reusableIdeas?: string;
  risksToAvoid?: string;
  reviewedAt?: string;
  reviewedById?: string;
  aiSummary?: string;
  aiSummaryGeneratedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCloseoutFinancialSnapshotInput {
  closeoutId: string;
  projectId: string;
  eventId: string;
  versionNumber: number;
  contractedRevenue: number;
  invoicedRevenue: number;
  collectedRevenue: number;
  outstandingClientBalance: number;
  plannedCost: number;
  incurredCost: number;
  paidCost: number;
  outstandingVendorBalance: number;
  forecastProfit: number;
  finalOperatingMargin: number;
  cashPosition: number;
  calculationVersion?: string;
  generatedById?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTimelineItemInput {
  eventId: string;
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  ownerId?: string;
  dependsOnItemId?: string;
  status: TimelineItemStatus;
  location?: string;
  visibility: TimelineItem["visibility"];
  sortOrder: number;
  plannedStartAt?: string;
  plannedEndAt?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  completedById?: string;
  criticality?: TimelineItem["criticality"];
  delayMinutes?: number;
  statusReason?: string;
  contingencyNotes?: string;
  eventDayNotes?: string;
  vendorAssignmentId?: string;
  teamAssignmentId?: string;
  versionNumber?: number;
  lockedAt?: string;
  pinnedCurrentAt?: string;
  pinnedCurrentById?: string;
  updatedById?: string;
}

export type UpdateTimelineItemInput = CreateTimelineItemInput;

export interface UpsertEventDaySessionInput {
  projectId?: string;
  eventId: string;
  status: EventDaySessionStatus;
  eventDayLeadId?: string;
  activeTimelineVersionId?: string;
  activatedById?: string;
  activatedAt?: string;
  pausedAt?: string;
  completedById?: string;
  completedAt?: string;
  archivedAt?: string;
  unresolvedWarnings?: Record<string, unknown>[];
  readinessOverrides?: Record<string, unknown>[];
  offlineManifest?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateTimelineVersionInput {
  projectId?: string;
  eventId: string;
  versionNumber: number;
  status: TimelineVersionStatus;
  finalizedById?: string;
  finalizedAt?: string;
  changeReason?: string;
  snapshot: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

export interface UpsertEventDayVendorStatusInput {
  projectId?: string;
  eventId: string;
  eventVendorId: string;
  vendorId: string;
  status: EventDayVendorStatus;
  arrivalTime?: string;
  setupWindowStart?: string;
  setupWindowEnd?: string;
  serviceStartAt?: string;
  breakdownAt?: string;
  assignedLocation?: string;
  deliverables?: string;
  delayMinutes?: number;
  issueSummary?: string;
  checkedInById?: string;
  checkedInAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEventDayIssueInput {
  projectId?: string;
  eventId: string;
  timelineItemId?: string;
  vendorId?: string;
  reportedById?: string;
  assignedToId?: string;
  type: EventDayIssueType;
  severity: EventDayIssueSeverity;
  title: string;
  description?: string;
  status?: EventDayIssueStatus;
  resolution?: string;
  openedAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface UpdateEventDayIssueInput extends CreateEventDayIssueInput {
  status: EventDayIssueStatus;
}

function db() {
  return supabase as any;
}

function toOrganization(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    currency: row.currency,
    logoUrl: row.logo_url ?? undefined,
    emailSenderName: row.email_sender_name ?? undefined,
    emailSignature: row.email_signature ?? undefined,
  };
}

function toLead(row: any): Lead {
  const clientNameSnapshot = row.client_name_snapshot ?? row.client_name ?? "";
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    clientId: row.client_id ?? undefined,
    ownerId: row.owner_id ?? undefined,
    stage: row.stage,
    clientNameSnapshot,
    clientName: clientNameSnapshot,
    email: row.email,
    phone: row.phone ?? "",
    eventType: row.event_type,
    eventDate: row.event_date ?? "",
    estimatedGuestCount: row.estimated_guest_count ?? 0,
    budgetRange: row.budget_range ?? "",
    notes: row.notes ?? "",
    source: row.source ?? "",
    convertedEventId: row.converted_event_id ?? undefined,
    createdAt: row.created_at,
  };
}

function toEvent(row: any): EventRecord {
  const clientNameSnapshot = row.client_name_snapshot ?? row.client_name ?? "";
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    clientId: row.client_id ?? undefined,
    clientUserId: row.client_user_id ?? undefined,
    plannerId: row.planner_id ?? undefined,
    clientNameSnapshot,
    clientName: clientNameSnapshot,
    clientEmail: row.client_email,
    clientPhone: row.client_phone ?? "",
    eventName: row.event_name,
    eventType: row.event_type,
    eventDate: row.event_date,
    startTime: row.start_time?.slice(0, 5) ?? "",
    endTime: row.end_time?.slice(0, 5) ?? "",
    location: row.location ?? "",
    guestCount: row.guest_count ?? 0,
    status: row.status,
    clientPrice: Number(row.client_price ?? 0),
    internalNotes: row.internal_notes ?? "",
    timelineNotes: row.timeline_notes ?? "",
    createdAt: row.created_at,
  };
}

function toClient(row: any): ClientRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone ?? undefined,
    companyName: row.company_name ?? undefined,
    status: row.status,
    source: row.source ?? undefined,
    notes: row.notes ?? undefined,
    lifetimeValue: Number(row.lifetime_value ?? 0),
    lastContactedAt: row.last_contacted_at ?? undefined,
    relationshipStatus: row.relationship_status ?? undefined,
    relationshipOwnerId: row.relationship_owner_id ?? undefined,
    preferredContactChannel: row.preferred_contact_channel ?? undefined,
    futureEventCommunicationPreference: row.future_event_communication_preference ?? undefined,
    marketingUnsubscribedAt: row.marketing_unsubscribed_at ?? undefined,
    relationshipScore: row.relationship_score ?? undefined,
    firstInquiryAt: row.first_inquiry_at ?? undefined,
    lastEventAt: row.last_event_at ?? undefined,
    nextRelationshipAction: row.next_relationship_action ?? undefined,
    nextRelationshipActionAt: row.next_relationship_action_at ?? undefined,
    relationshipNotes: row.relationship_notes ?? undefined,
    relationshipMetadata: row.relationship_metadata ?? undefined,
    createdAt: row.created_at,
  };
}

function toEventTeamMember(row: any): EventTeamMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id,
    userId: row.user_id,
    roleLabel: row.role_label,
    eventDayRole: row.event_day_role ?? undefined,
    eventDayStatus: row.event_day_status ?? undefined,
    onSiteAt: row.on_site_at ?? undefined,
    unavailableAt: row.unavailable_at ?? undefined,
    eventDayNotes: row.event_day_notes ?? undefined,
    createdAt: row.created_at,
  };
}

function toTask(row: any): TaskRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? undefined,
    ownerId: row.owner_id ?? undefined,
    title: row.title,
    description: row.description ?? "",
    dueDate: row.due_date ?? "",
    status: row.status,
    priority: row.priority,
    checklist: [],
    workType: row.work_type ?? "project",
    workflowColumnId: row.workflow_column_id ?? undefined,
    normalizedStatus: row.normalized_status ?? undefined,
    position: Number(row.position ?? 1000),
    startAt: row.start_at ?? undefined,
    dueAt: row.due_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    archivedById: row.archived_by ?? undefined,
    visibility: row.visibility ?? "Internal",
    cardCoverFileId: row.card_cover_file_id ?? undefined,
    estimatedEffortMinutes:
      row.estimated_effort_minutes === null || row.estimated_effort_minutes === undefined
        ? undefined
        : Number(row.estimated_effort_minutes),
    actualEffortMinutes:
      row.actual_effort_minutes === null || row.actual_effort_minutes === undefined
        ? undefined
        : Number(row.actual_effort_minutes),
    sourceType: row.source_type ?? undefined,
    sourceRecordId: row.source_record_id ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    lastActivityAt: row.last_activity_at ?? row.updated_at ?? row.created_at,
    createdById: row.created_by ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
  };
}

function toChecklistItem(row: any): TaskChecklistItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    checklistId: row.checklist_id ?? undefined,
    title: row.title,
    isComplete: row.is_complete,
    assigneeId: row.assignee_id ?? undefined,
    dueAt: row.due_at ?? undefined,
    notes: row.notes ?? undefined,
    sortOrder: Number(row.sort_order ?? 0),
    completedAt: row.completed_at ?? undefined,
    completedById: row.completed_by ?? undefined,
    convertedTaskId: row.converted_task_id ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function toTaskWorkflowColumn(row: any): TaskWorkflowColumn {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    name: row.name,
    normalizedStatus: row.normalized_status,
    mappedTaskStatus: row.mapped_task_status,
    sortOrder: Number(row.sort_order ?? 0),
    wipLimit:
      row.wip_limit === null || row.wip_limit === undefined ? undefined : Number(row.wip_limit),
    isDefault: Boolean(row.is_default),
    isArchived: Boolean(row.is_archived),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toTaskLabel(row: any): TaskLabel {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    color: row.color ?? "#64748b",
    description: row.description ?? undefined,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toTaskLabelAssignment(row: any): TaskLabelAssignment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    labelId: row.label_id,
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toTaskParticipant(row: any): TaskParticipant {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    userId: row.user_id,
    participantRole: row.participant_role,
    addedById: row.added_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toTaskChecklist(row: any): TaskChecklist {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    title: row.title,
    sortOrder: Number(row.sort_order ?? 0),
    createdById: row.created_by ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toVendor(row: any): Vendor {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    serviceCategory: row.service_category,
    contactName: row.contact_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? undefined,
    notes: row.notes ?? "",
    rating: row.rating ?? 3,
  };
}

function toConnectedAccount(row: any): ConnectedAccount {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    provider: row.provider,
    status: row.status,
    providerAccountId: row.provider_account_id,
    providerAccountEmail: row.provider_account_email,
    providerAccountName: row.provider_account_name ?? undefined,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    calendarId: row.calendar_id ?? undefined,
    lastMailSyncedAt: row.last_mail_synced_at ?? undefined,
    lastCalendarSyncedAt: row.last_calendar_synced_at ?? undefined,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCalendarSyncState(row: any): CalendarSyncState {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectedAccountId: row.connected_account_id ?? undefined,
    provider: row.provider,
    calendarId: row.calendar_id ?? "primary",
    syncWindowStart: row.sync_window_start ?? undefined,
    syncWindowEnd: row.sync_window_end ?? undefined,
    lastSuccessfulSyncAt: row.last_successful_sync_at ?? undefined,
    lastAttemptedSyncAt: row.last_attempted_sync_at ?? undefined,
    lastError: row.last_error ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toExternalCalendarEvent(row: any): ExternalCalendarEvent {
  const attendees = Array.isArray(row.attendees)
    ? row.attendees.map((item: any) =>
        typeof item === "string" ? item : (item?.email ?? item?.displayName ?? ""),
      )
    : [];

  return {
    id: row.id,
    organizationId: row.organization_id,
    connectedAccountId: row.connected_account_id ?? undefined,
    provider: row.provider,
    calendarId: row.calendar_id ?? "primary",
    externalEventId: row.external_event_id,
    iCalUid: row.i_cal_uid ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: Boolean(row.all_day),
    timezone: row.timezone ?? "America/Toronto",
    status: row.status ?? "Confirmed",
    location: row.location ?? undefined,
    meetingUrl: row.meeting_url ?? undefined,
    attendees: attendees.filter(Boolean),
    recurrence: row.recurrence ?? {},
    providerUpdatedAt: row.provider_updated_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    rawProviderPayload: row.raw_provider_payload ?? {},
    syncStatus: row.sync_status ?? "Synced",
    conflictStatus: row.conflict_status ?? "Unchecked",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toSchedulingPreference(row: any): SchedulingPreference {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    timezone: row.timezone ?? "America/Toronto",
    workingDays: Array.isArray(row.working_days) ? row.working_days : [1, 2, 3, 4, 5],
    workdayStart: row.workday_start?.slice(0, 5) ?? "09:00",
    workdayEnd: row.workday_end?.slice(0, 5) ?? "17:00",
    defaultMeetingDurationMinutes: Number(row.default_meeting_duration_minutes ?? 30),
    minimumNoticeMinutes: Number(row.minimum_notice_minutes ?? 120),
    bufferBeforeMinutes: Number(row.buffer_before_minutes ?? 0),
    bufferAfterMinutes: Number(row.buffer_after_minutes ?? 0),
    preferredMeetingProvider: row.preferred_meeting_provider ?? undefined,
    defaultConnectedAccountId: row.default_connected_account_id ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toAvailabilityBlock(row: any): AvailabilityBlock {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone ?? "America/Toronto",
    reason: row.reason ?? undefined,
    source: row.source ?? "Manual",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toCalendarConflict(row: any): CalendarConflict {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id ?? undefined,
    ownerId: row.owner_id ?? undefined,
    entryASourceType: row.entry_a_source_type,
    entryASourceId: row.entry_a_source_id,
    entryBSourceType: row.entry_b_source_type,
    entryBSourceId: row.entry_b_source_id,
    severity: row.severity,
    status: row.status ?? "Open",
    overrideReason: row.override_reason ?? undefined,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toCalendarSyncRun(row: any): CalendarSyncRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectedAccountId: row.connected_account_id ?? undefined,
    provider: row.provider,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    importedCount: Number(row.imported_count ?? 0),
    updatedCount: Number(row.updated_count ?? 0),
    deletedCount: Number(row.deleted_count ?? 0),
    errorMessage: row.error_message ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toEventVendor(row: any): EventVendor {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id,
    vendorId: row.vendor_id,
    serviceCategory: row.service_category,
    quotedAmount: Number(row.quoted_amount ?? 0),
    actualAmount: Number(row.actual_amount ?? 0),
    paymentStatus: row.payment_status,
    notes: row.notes ?? "",
  };
}

function toBudgetItem(row: any): BudgetItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id,
    category: row.category,
    description: row.description,
    plannedAmount: Number(row.planned_amount ?? 0),
    actualAmount: Number(row.actual_amount ?? 0),
    vendorId: row.vendor_id ?? undefined,
    paidAmount: Number(row.paid_amount ?? 0),
    dueDate: row.due_date ?? "",
    marginEstimate: Number(row.margin_estimate ?? 0),
  };
}

function toInvoice(row: any): InvoiceRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id ?? undefined,
    clientId: row.client_id ?? undefined,
    proposalId: row.proposal_id ?? undefined,
    proposalVersionId: row.proposal_version_id ?? undefined,
    proposalPaymentTermId: row.proposal_payment_term_id ?? undefined,
    invoiceNumber: row.invoice_number,
    invoiceType: row.invoice_type,
    amount: Number(row.amount ?? 0),
    paidAmount: Number(row.paid_amount ?? 0),
    balanceDue: Number(
      row.balance_due ?? Math.max(Number(row.amount ?? 0) - Number(row.paid_amount ?? 0), 0),
    ),
    dueDate: row.due_date ?? "",
    status: row.status,
    stripeInvoiceId: row.stripe_invoice_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
    notes: row.notes ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBookingSettings(row: any): OrganizationBookingSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    requireProposalAcceptance: Boolean(row.require_proposal_acceptance),
    requireTermsAcceptance: Boolean(row.require_terms_acceptance),
    requireDepositInvoiceIssued: Boolean(row.require_deposit_invoice_issued),
    requireDepositPaid: Boolean(row.require_deposit_paid),
    requireManualPlannerApproval: Boolean(row.require_manual_planner_approval),
    proposalExpirationDays: Number(row.proposal_expiration_days ?? 14),
    acceptanceStatement:
      row.acceptance_statement ??
      "I accept this proposal, the selected options, payment schedule, and terms for this project.",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProposal(row: any): ProposalRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? undefined,
    clientId: row.client_id ?? undefined,
    proposalNumber: row.proposal_number,
    title: row.title,
    status: row.status,
    currency: row.currency,
    currentVersionNumber: Number(row.current_version_number ?? 1),
    currentVersionId: row.current_version_id ?? undefined,
    validUntil: row.valid_until ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    declinedAt: row.declined_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
    viewedAt: row.viewed_at ?? undefined,
    createdById: row.created_by ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProposalVersion(row: any): ProposalVersion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    proposalId: row.proposal_id,
    versionNumber: Number(row.version_number ?? 1),
    introduction: row.introduction ?? undefined,
    scope: row.scope ?? undefined,
    terms: row.terms ?? undefined,
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    snapshot: row.snapshot ?? {},
    documentHash: row.document_hash ?? undefined,
    immutableAt: row.immutable_at ?? undefined,
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toProposalLineItem(row: any): ProposalLineItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    proposalVersionId: row.proposal_version_id,
    category: row.category ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    taxRate: row.tax_rate == null ? undefined : Number(row.tax_rate),
    totalAmount: Number(row.total_amount ?? 0),
    isOptional: Boolean(row.is_optional),
    isSelected: Boolean(row.is_selected),
    clientVisible: Boolean(row.client_visible),
    sortOrder: Number(row.sort_order ?? 0),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProposalPaymentTerm(row: any): ProposalPaymentTerm {
  return {
    id: row.id,
    organizationId: row.organization_id,
    proposalVersionId: row.proposal_version_id,
    label: row.label,
    paymentType: row.payment_type,
    amountType: row.amount_type,
    amountValue: Number(row.amount_value ?? 0),
    calculatedAmount: Number(row.calculated_amount ?? 0),
    dueRule: row.due_rule,
    dueDate: row.due_date ?? undefined,
    dueOffsetDays: row.due_offset_days == null ? undefined : Number(row.due_offset_days),
    requiredForBooking: Boolean(row.required_for_booking),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProposalResponse(row: any): ProposalResponse {
  return {
    id: row.id,
    organizationId: row.organization_id,
    proposalId: row.proposal_id,
    proposalVersionId: row.proposal_version_id,
    projectId: row.project_id,
    clientId: row.client_id ?? undefined,
    responseType: row.response_type,
    comment: row.comment ?? undefined,
    responderName: row.responder_name ?? undefined,
    responderEmail: row.responder_email ?? undefined,
    respondedAt: row.responded_at,
    ipMetadata: row.ip_metadata ?? {},
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toProposalFile(row: any): ProposalFile {
  return {
    id: row.id,
    organizationId: row.organization_id,
    proposalId: row.proposal_id,
    proposalVersionId: row.proposal_version_id ?? undefined,
    fileId: row.file_id,
    visibility: row.visibility,
    sortOrder: Number(row.sort_order ?? 0),
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toInvoicePayment(row: any): InvoicePaymentRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceId: row.invoice_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id ?? undefined,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
    reference: row.reference ?? undefined,
    note: row.note ?? undefined,
    recordedById: row.recorded_by ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toFinanceSettings(row: any): OrganizationFinanceSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    defaultCurrency: row.default_currency ?? "CAD",
    fiscalYearStartMonth: Number(row.fiscal_year_start_month ?? 1),
    requireExpenseApproval: Boolean(row.require_expense_approval),
    defaultMarginTargetPercent: Number(row.default_margin_target_percent ?? 30),
    receiptRequiredThreshold: Number(row.receipt_required_threshold ?? 250),
    enabledPaymentMethods: Array.isArray(row.enabled_payment_methods)
      ? row.enabled_payment_methods
      : ["Card", "Bank Transfer", "ACH", "Zelle", "Cash", "Check", "Other"],
    taxDisplayPreference: row.tax_display_preference ?? "Separate",
    clientFinancialVisibility: row.client_financial_visibility ?? "Invoices Only",
    defaultReportDateBasis: row.default_report_date_basis ?? "Accrual",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExpense(row: any): ExpenseRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    eventId: row.event_id ?? undefined,
    vendorId: row.vendor_id ?? undefined,
    budgetItemId: row.budget_item_id ?? undefined,
    createdById: row.created_by ?? undefined,
    approvedById: row.approved_by ?? undefined,
    expenseNumber: row.expense_number ?? undefined,
    description: row.description,
    category: row.category,
    source: row.source,
    status: row.status,
    currency: row.currency ?? "CAD",
    subtotal: Number(row.subtotal ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    serviceFeeAmount: Number(row.service_fee_amount ?? 0),
    tipAmount: Number(row.tip_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    expenseDate: row.expense_date,
    dueDate: row.due_date ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    voidedAt: row.voided_at ?? undefined,
    notes: row.notes ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    clientBillable: Boolean(row.client_billable),
    reimbursable: Boolean(row.reimbursable),
    bookkeepingStatus: row.bookkeeping_status,
    metadata: row.metadata ?? {},
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExpensePayment(row: any): ExpensePaymentRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    expenseId: row.expense_id,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? "CAD",
    paymentMethod: row.payment_method ?? "Other",
    paymentDate: row.payment_date,
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
    recordedById: row.recorded_by ?? undefined,
    status: row.status,
    metadata: row.metadata ?? {},
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExpenseFile(row: any): ExpenseFileRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    expenseId: row.expense_id,
    fileId: row.file_id,
    visibility: row.visibility,
    caption: row.caption ?? undefined,
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toProjectBookingApproval(row: any): ProjectBookingApproval {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    approvedById: row.approved_by ?? undefined,
    approvedAt: row.approved_at,
    note: row.note ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toApproval(row: any): Approval {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id,
    type: row.type,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    dueDate: row.due_date ?? "",
    respondedAt: row.responded_at ?? undefined,
  };
}

export function toEventFile(row: any): EventFile {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? "",
    uploadedById: row.uploaded_by ?? undefined,
    name: row.name,
    category: row.category,
    storagePath: row.storage_path,
    mimeType: row.mime_type ?? "application/octet-stream",
    sizeBytes: Number(row.size_bytes ?? 0),
    visibility: row.visibility ?? undefined,
    originalFilename: row.original_filename ?? undefined,
    caption: row.caption ?? undefined,
    createdAt: row.created_at,
  };
}

function toComment(row: any): CommentMessage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? undefined,
    taskId: row.task_id ?? undefined,
    parentCommentId: row.parent_comment_id ?? undefined,
    authorId: row.author_id ?? undefined,
    body: row.body,
    visibility: row.visibility,
    mentions: row.mentions ?? [],
    editedAt: row.edited_at ?? undefined,
    isDeleted: Boolean(row.is_deleted ?? false),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toCommunicationThread(row: any): CommunicationThread {
  const clientNameSnapshot = row.client_name_snapshot ?? row.client_name ?? "";
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? "",
    assignedToId: row.assigned_to_id ?? undefined,
    subject: row.subject,
    clientNameSnapshot,
    clientName: clientNameSnapshot,
    participants: Array.isArray(row.participants) ? row.participants : [],
    channel: row.channel,
    status: row.status,
    integrationSource: row.integration_source ?? undefined,
    externalProvider: row.external_provider ?? undefined,
    externalThreadId: row.external_thread_id ?? undefined,
    syncedAt: row.synced_at ?? undefined,
    preview: row.preview ?? "",
    unreadCount: Number(row.unread_count ?? 0),
    lastActivityAt: row.last_activity_at ?? row.created_at,
  };
}

function toCommunicationMessage(row: any): CommunicationMessage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    threadId: row.thread_id,
    eventId: row.event_id ?? "",
    authorId: row.author_id ?? undefined,
    direction: row.direction,
    body: row.body ?? "",
    summary: row.summary ?? undefined,
    visibility: row.visibility,
    externalProvider: row.external_provider ?? undefined,
    externalMessageId: row.external_message_id ?? undefined,
    syncedAt: row.synced_at ?? undefined,
    deliveryStatus: row.delivery_status ?? undefined,
    deliveryMode: row.delivery_mode ?? undefined,
    deliveryError: row.delivery_error ?? undefined,
    metadata: row.metadata ?? undefined,
    sentAt: row.sent_at ?? row.created_at,
  };
}

function toMeetingActionItem(item: any): MeetingActionItem {
  return {
    id: item?.id ?? `meeting-action-${Date.now()}`,
    title: item?.title ?? "",
    ownerId: item?.ownerId ?? undefined,
    dueDate: item?.dueDate ?? undefined,
    taskId: item?.taskId ?? undefined,
    isComplete: Boolean(item?.isComplete),
  };
}

function toMeeting(row: any): MeetingRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? "",
    title: row.title,
    meetingType: row.meeting_type,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    organizerId: row.organizer_id ?? undefined,
    connectedAccountId: row.connected_account_id ?? undefined,
    externalProvider: row.external_provider ?? undefined,
    externalCalendarId: row.external_calendar_id ?? undefined,
    externalEventId: row.external_event_id ?? undefined,
    externalConferenceUrl: row.external_conference_url ?? undefined,
    syncedAt: row.synced_at ?? undefined,
    timezone: row.timezone ?? undefined,
    syncStatus: row.sync_status ?? undefined,
    syncError: row.sync_error ?? undefined,
    providerUpdatedAt: row.provider_updated_at ?? undefined,
    fathomExpected: row.fathom_expected ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    attendees: Array.isArray(row.attendees) ? row.attendees : [],
    agenda: row.agenda ?? "",
    link: row.link ?? undefined,
    transcript: row.transcript ?? "",
    internalSummary: row.internal_summary ?? "",
    clientSummary: row.client_summary ?? "",
    notes: row.notes ?? "",
    actionItems: Array.isArray(row.action_items) ? row.action_items.map(toMeetingActionItem) : [],
    createdAt: row.created_at,
  };
}

function toProject(row: any): ProjectRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? undefined,
    clientId: row.client_id ?? undefined,
    ownerId: row.owner_id ?? undefined,
    name: row.name,
    stage: row.stage,
    lastActivityAt: row.last_activity_at ?? row.updated_at ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toProjectInspirationLink(row: any): ProjectInspirationLink {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? undefined,
    label: row.label ?? undefined,
    url: row.url,
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toTaskLink(row: any): TaskLink {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    label: row.label,
    url: row.url,
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toTaskAttachment(row: any): TaskAttachment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    fileId: row.file_id ?? undefined,
    label: row.label ?? undefined,
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toTaskSavedView(row: any): TaskSavedView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    name: row.name,
    scope: row.scope,
    viewType: row.view_type,
    filters: row.filters ?? {},
    sort: row.sort ?? {},
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toTaskInboxItem(row: any): TaskInboxItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id ?? undefined,
    sourceType: row.source_type,
    sourceTable: row.source_table ?? undefined,
    sourceRecordId: row.source_record_id ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    capturedById: row.captured_by ?? undefined,
    capturedAt: row.captured_at,
    rawContent: row.raw_content ?? undefined,
    summary: row.summary ?? undefined,
    suggestedProjectId: row.suggested_project_id ?? undefined,
    suggestedTitle: row.suggested_title ?? undefined,
    suggestedOwnerId: row.suggested_owner_id ?? undefined,
    suggestedDueAt: row.suggested_due_at ?? undefined,
    suggestedStatus: row.suggested_status ?? "To Do",
    status: row.status,
    convertedTaskId: row.converted_task_id ?? undefined,
    snoozedUntil: row.snoozed_until ?? undefined,
    dismissedAt: row.dismissed_at ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toEmailTemplate(row: any): EmailTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    templateType: row.template_type,
    subject: row.subject,
    body: row.body,
    isActive: Boolean(row.is_active),
    isDefault: Boolean(row.is_default),
    metadata: row.metadata ?? {},
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toProjectActivityEvent(row: any): ProjectActivityEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    actorId: row.actor_id ?? undefined,
    activityType: row.activity_type,
    title: row.title,
    body: row.body ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toProjectReminder(row: any): ProjectReminder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    assignedToId: row.assigned_to_id ?? undefined,
    title: row.title,
    dueAt: row.due_at ?? undefined,
    status: row.status,
    automationSource: row.automation_source ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toWorkflowAutomation(row: any): WorkflowAutomation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? undefined,
    triggerType: row.trigger_type,
    status: row.status,
    conditions: Array.isArray(row.conditions) ? row.conditions : [],
    approvalPolicy: row.approval_policy ?? "automatic",
    quietHours: row.quiet_hours ?? {},
    cooldownMinutes: Number(row.cooldown_minutes ?? 0),
    priority: Number(row.priority ?? 100),
    lastTriggeredAt: row.last_triggered_at ?? undefined,
    createdById: row.created_by ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toWorkflowAutomationAction(row: any): WorkflowAutomationAction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    automationId: row.automation_id,
    actionType: row.action_type,
    name: row.name,
    config: row.config ?? {},
    requiresApproval: Boolean(row.requires_approval),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toWorkflowEvent(row: any): WorkflowEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    eventId: row.event_id ?? undefined,
    sourceTable: row.source_table ?? undefined,
    sourceRecordId: row.source_record_id ?? undefined,
    eventType: row.event_type,
    status: row.status,
    payload: row.payload ?? {},
    dedupeKey: row.dedupe_key,
    occurredAt: row.occurred_at,
    processedAt: row.processed_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
  };
}

function toWorkflowExecution(row: any): WorkflowExecution {
  return {
    id: row.id,
    organizationId: row.organization_id,
    automationId: row.automation_id ?? undefined,
    workflowEventId: row.workflow_event_id ?? undefined,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id ?? undefined,
    status: row.status,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    attemptCount: Number(row.attempt_count ?? 0),
    nextRetryAt: row.next_retry_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    idempotencyKey: row.idempotency_key,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toWorkflowActionRun(row: any): WorkflowActionRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    executionId: row.execution_id,
    automationActionId: row.automation_action_id ?? undefined,
    actionType: row.action_type,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    errorMessage: row.error_message ?? undefined,
    output: row.output ?? {},
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toNotification(row: any): NotificationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recipientUserId: row.recipient_user_id ?? undefined,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id ?? undefined,
    workflowExecutionId: row.workflow_execution_id ?? undefined,
    notificationType: row.notification_type,
    severity: row.severity,
    status: row.status,
    title: row.title,
    body: row.body ?? undefined,
    href: row.href ?? undefined,
    channel: row.channel ?? "in_app",
    actionRequired: Boolean(row.action_required),
    dueAt: row.due_at ?? undefined,
    readAt: row.read_at ?? undefined,
    dismissedAt: row.dismissed_at ?? undefined,
    dedupeKey: row.dedupe_key,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toNotificationPreference(row: any): NotificationPreference {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    notificationType: row.notification_type,
    channel: row.channel ?? "in_app",
    isEnabled: Boolean(row.is_enabled),
    quietHours: row.quiet_hours ?? {},
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toCloseoutSettings(row: any): OrganizationCloseoutSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    closeoutDueDays: Number(row.closeout_due_days ?? 7),
    requireVendorReviews: Boolean(row.require_vendor_reviews),
    requireInternalRetrospective: Boolean(row.require_internal_retrospective),
    requireFeedbackRequest: Boolean(row.require_feedback_request),
    requireFinancialReview: Boolean(row.require_financial_review),
    publicReviewLink: row.public_review_link ?? undefined,
    publicReviewRequestsEnabled: Boolean(row.public_review_requests_enabled),
    defaultRetentionPolicy: row.default_retention_policy ?? {},
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toPostEventCloseout(row: any): PostEventCloseout {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    eventId: row.event_id,
    status: row.status,
    ownerId: row.owner_id ?? undefined,
    eventCompletedAt: row.event_completed_at ?? undefined,
    closeoutStartedAt: row.closeout_started_at ?? undefined,
    readyToCloseAt: row.ready_to_close_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    closedById: row.closed_by ?? undefined,
    reopenedAt: row.reopened_at ?? undefined,
    reopenedById: row.reopened_by ?? undefined,
    reopenReason: row.reopen_reason ?? undefined,
    completionPercentage: Number(row.completion_percentage ?? 0),
    unresolvedIssueCount: Number(row.unresolved_issue_count ?? 0),
    financialStatus: row.financial_status,
    deliverableStatus: row.deliverable_status,
    feedbackStatus: row.feedback_status,
    vendorReviewStatus: row.vendor_review_status,
    internalReviewStatus: row.internal_review_status,
    retentionStatus: row.retention_status,
    finalNotes: row.final_notes ?? undefined,
    retentionHandoff: row.retention_handoff ?? {},
    readinessOverrides: Array.isArray(row.readiness_overrides) ? row.readiness_overrides : [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toPostEventCloseoutItem(row: any): PostEventCloseoutItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    closeoutId: row.closeout_id,
    projectId: row.project_id,
    eventId: row.event_id,
    groupName: row.group_name,
    title: row.title,
    requirementLevel: row.requirement_level,
    status: row.status,
    ownerId: row.owner_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedById: row.completed_by ?? undefined,
    notes: row.notes ?? undefined,
    linkedTaskId: row.linked_task_id ?? undefined,
    linkedFileId: row.linked_file_id ?? undefined,
    linkedInvoiceId: row.linked_invoice_id ?? undefined,
    linkedExpenseId: row.linked_expense_id ?? undefined,
    overrideReason: row.override_reason ?? undefined,
    sortOrder: Number(row.sort_order ?? 0),
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toFinalDeliverable(row: any): FinalDeliverable {
  return {
    id: row.id,
    organizationId: row.organization_id,
    closeoutId: row.closeout_id ?? undefined,
    projectId: row.project_id,
    eventId: row.event_id,
    fileId: row.file_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    externalUrl: row.external_url ?? undefined,
    clientVisible: Boolean(row.client_visible),
    status: row.status,
    dueDate: row.due_date ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    deliveredById: row.delivered_by ?? undefined,
    viewedAt: row.viewed_at ?? undefined,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    accessState: row.access_state ?? "Available",
    sortOrder: Number(row.sort_order ?? 0),
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toClientFeedback(row: any): ClientFeedbackResponse {
  return {
    id: row.id,
    organizationId: row.organization_id,
    closeoutId: row.closeout_id ?? undefined,
    projectId: row.project_id,
    eventId: row.event_id,
    clientId: row.client_id ?? undefined,
    submittedById: row.submitted_by ?? undefined,
    responderName: row.responder_name ?? undefined,
    responderEmail: row.responder_email ?? undefined,
    overallSatisfaction: row.overall_satisfaction ?? undefined,
    communicationRating: row.communication_rating ?? undefined,
    planningProcessRating: row.planning_process_rating ?? undefined,
    executionRating: row.execution_rating ?? undefined,
    valueRating: row.value_rating ?? undefined,
    likelihoodToRecommend: row.likelihood_to_recommend ?? undefined,
    whatWentWell: row.what_went_well ?? undefined,
    whatCouldImprove: row.what_could_improve ?? undefined,
    additionalComments: row.additional_comments ?? undefined,
    permissionToContact: Boolean(row.permission_to_contact),
    concernLevel: row.concern_level ?? "None",
    serviceRecoveryStatus: row.service_recovery_status ?? "Not Required",
    submittedAt: row.submitted_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toClientConsent(row: any): ClientConsent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id ?? undefined,
    clientId: row.client_id ?? undefined,
    consentType: row.consent_type,
    status: row.status,
    consentWordingVersion: row.consent_wording_version ?? "v1",
    requestedAt: row.requested_at ?? undefined,
    grantedAt: row.granted_at ?? undefined,
    declinedAt: row.declined_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    source: row.source ?? undefined,
    capturedById: row.captured_by ?? undefined,
    evidenceFileId: row.evidence_file_id ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toRetentionSettings(row: any): OrganizationRetentionSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    jurisdictionProfile: row.jurisdiction_profile,
    promotionalOutreachEnabled: row.promotional_outreach_enabled,
    expressConsentRequired: row.express_consent_required,
    impliedConsentTrackingEnabled: row.implied_consent_tracking_enabled,
    consentReviewDays: Number(row.consent_review_days ?? 365),
    referralOutreachPolicy: row.referral_outreach_policy,
    quietHours: row.quiet_hours ?? {},
    defaultExecutionMode: row.default_execution_mode,
    defaultRetentionDays: Number(row.default_retention_days ?? 730),
    manualComplianceReview: Boolean(row.manual_compliance_review),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toClientMilestone(row: any): ClientMilestone {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    sourceProjectId: row.source_project_id ?? undefined,
    milestoneType: row.milestone_type,
    title: row.title,
    milestoneDate: row.milestone_date ?? undefined,
    month: row.month ?? undefined,
    day: row.day ?? undefined,
    recurrenceRule: row.recurrence_rule ?? undefined,
    reminderOffsetDays: Number(row.reminder_offset_days ?? 30),
    nextOccurrenceDate: row.next_occurrence_date ?? undefined,
    sensitivity: row.sensitivity,
    source: row.source,
    consentOrPurposeReferenceId: row.consent_or_purpose_reference ?? undefined,
    isActive: Boolean(row.is_active),
    notes: row.notes ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toRebookingOpportunity(row: any): RebookingOpportunity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    sourceProjectId: row.source_project_id ?? undefined,
    sourceEventId: row.source_event_id ?? undefined,
    sourceMilestoneId: row.source_milestone_id ?? undefined,
    sourceReferralId: row.source_referral_id ?? undefined,
    assignedToId: row.assigned_to ?? undefined,
    opportunityType: row.opportunity_type,
    title: row.title,
    description: row.description ?? undefined,
    stage: row.stage,
    estimatedEventDate: row.estimated_event_date ?? undefined,
    targetContactDate: row.target_contact_date ?? undefined,
    estimatedValue: row.estimated_value === null ? undefined : Number(row.estimated_value ?? 0),
    estimatedProbability:
      row.estimated_probability === null ? undefined : Number(row.estimated_probability ?? 0),
    eventType: row.event_type ?? undefined,
    preferredContactChannel: row.preferred_contact_channel ?? undefined,
    consentStatusSnapshot: row.consent_status_snapshot ?? undefined,
    nextAction: row.next_action ?? undefined,
    nextActionAt: row.next_action_at ?? undefined,
    contactedAt: row.contacted_at ?? undefined,
    respondedAt: row.responded_at ?? undefined,
    convertedLeadId: row.converted_lead_id ?? undefined,
    convertedProjectId: row.converted_project_id ?? undefined,
    lostReason: row.lost_reason ?? undefined,
    snoozedUntil: row.snoozed_until ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiSummaryGeneratedAt: row.ai_summary_generated_at ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toClientReferralLink(row: any): ClientReferralLink {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    projectId: row.project_id ?? undefined,
    referralCode: row.referral_code,
    sourceCampaign: row.source_campaign ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    isActive: Boolean(row.is_active),
    createdById: row.created_by ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toReferral(row: any): ReferralRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    referringClientId: row.referring_client_id ?? undefined,
    referringProjectId: row.referring_project_id ?? undefined,
    referralLinkId: row.referral_link_id ?? undefined,
    referredLeadId: row.referred_lead_id ?? undefined,
    referredClientId: row.referred_client_id ?? undefined,
    assignedToId: row.assigned_to ?? undefined,
    referralCode: row.referral_code ?? undefined,
    referralSource: row.referral_source ?? undefined,
    referrerNameSnapshot: row.referrer_name_snapshot ?? undefined,
    referredName: row.referred_name ?? undefined,
    referredEmail: row.referred_email ?? undefined,
    referredPhone: row.referred_phone ?? undefined,
    status: row.status,
    introductionMethod: row.introduction_method ?? undefined,
    consentOrContactBasis: row.consent_or_contact_basis ?? undefined,
    firstContactAt: row.first_contact_at ?? undefined,
    convertedAt: row.converted_at ?? undefined,
    convertedProjectId: row.converted_project_id ?? undefined,
    rewardStatus: row.reward_status,
    rewardDescription: row.reward_description ?? undefined,
    notes: row.notes ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toCommunicationEligibilityLog(row: any): CommunicationEligibilityLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id ?? undefined,
    opportunityId: row.opportunity_id ?? undefined,
    referralId: row.referral_id ?? undefined,
    channel: row.channel,
    communicationCategory: row.communication_category,
    allowed: Boolean(row.allowed),
    consentStatus: row.consent_status ?? undefined,
    consentSource: row.consent_source ?? undefined,
    consentRecordId: row.consent_record_id ?? undefined,
    expiryOrReviewAt: row.expiry_or_review_at ?? undefined,
    suppressionReason: row.suppression_reason ?? undefined,
    unsubscribeStatus: row.unsubscribe_status ?? undefined,
    jurisdictionProfile: row.jurisdiction_profile ?? undefined,
    requiresManualReview: Boolean(row.requires_manual_review),
    explanation: row.explanation,
    checkedById: row.checked_by ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toVendorPerformanceReview(row: any): VendorPerformanceReview {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    eventId: row.event_id,
    eventVendorId: row.event_vendor_id ?? undefined,
    vendorId: row.vendor_id,
    reviewerId: row.reviewer_id ?? undefined,
    overallRating: row.overall_rating ?? undefined,
    communicationRating: row.communication_rating ?? undefined,
    punctualityRating: row.punctuality_rating ?? undefined,
    qualityRating: row.quality_rating ?? undefined,
    budgetAccuracyRating: row.budget_accuracy_rating ?? undefined,
    professionalismRating: row.professionalism_rating ?? undefined,
    issueCount: Number(row.issue_count ?? 0),
    wouldUseAgain: row.would_use_again ?? undefined,
    preferredVendorRecommendation: row.preferred_vendor_recommendation ?? undefined,
    operationalContext: row.operational_context ?? {},
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toInternalRetrospective(row: any): InternalRetrospective {
  return {
    id: row.id,
    organizationId: row.organization_id,
    closeoutId: row.closeout_id ?? undefined,
    projectId: row.project_id,
    eventId: row.event_id,
    status: row.status,
    facilitatorId: row.facilitator_id ?? undefined,
    contributors: Array.isArray(row.contributors) ? row.contributors : [],
    whatWentWell: row.what_went_well ?? undefined,
    whatDidNotGoWell: row.what_did_not_go_well ?? undefined,
    majorDelays: row.major_delays ?? undefined,
    clientRequestChanges: row.client_request_changes ?? undefined,
    vendorIssues: row.vendor_issues ?? undefined,
    teamIssues: row.team_issues ?? undefined,
    budgetLessons: row.budget_lessons ?? undefined,
    schedulingLessons: row.scheduling_lessons ?? undefined,
    venueLessons: row.venue_lessons ?? undefined,
    processImprovements: row.process_improvements ?? undefined,
    templateChangesRecommended: row.template_changes_recommended ?? undefined,
    reusableIdeas: row.reusable_ideas ?? undefined,
    risksToAvoid: row.risks_to_avoid ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedById: row.reviewed_by ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiSummaryGeneratedAt: row.ai_summary_generated_at ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toCloseoutFinancialSnapshot(row: any): CloseoutFinancialSnapshot {
  return {
    id: row.id,
    organizationId: row.organization_id,
    closeoutId: row.closeout_id,
    projectId: row.project_id,
    eventId: row.event_id,
    versionNumber: Number(row.version_number ?? 1),
    contractedRevenue: Number(row.contracted_revenue ?? 0),
    invoicedRevenue: Number(row.invoiced_revenue ?? 0),
    collectedRevenue: Number(row.collected_revenue ?? 0),
    outstandingClientBalance: Number(row.outstanding_client_balance ?? 0),
    plannedCost: Number(row.planned_cost ?? 0),
    incurredCost: Number(row.incurred_cost ?? 0),
    paidCost: Number(row.paid_cost ?? 0),
    outstandingVendorBalance: Number(row.outstanding_vendor_balance ?? 0),
    forecastProfit: Number(row.forecast_profit ?? 0),
    finalOperatingMargin: Number(row.final_operating_margin ?? 0),
    cashPosition: Number(row.cash_position ?? 0),
    calculationVersion: row.calculation_version ?? "phase4-v1",
    generatedById: row.generated_by ?? undefined,
    generatedAt: row.generated_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function toTimelineItem(row: any): TimelineItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id,
    title: row.title,
    description: row.description ?? "",
    startTime: row.start_time?.slice(0, 5) ?? "",
    endTime: row.end_time?.slice(0, 5) ?? undefined,
    ownerId: row.owner_id ?? undefined,
    dependsOnItemId: row.depends_on_item_id ?? undefined,
    status: row.status,
    location: row.location ?? undefined,
    visibility: row.visibility,
    sortOrder: Number(row.sort_order ?? 0),
    plannedStartAt: row.planned_start_at ?? undefined,
    plannedEndAt: row.planned_end_at ?? undefined,
    actualStartAt: row.actual_start_at ?? undefined,
    actualEndAt: row.actual_end_at ?? undefined,
    checkedInAt: row.checked_in_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedById: row.completed_by ?? undefined,
    criticality: row.criticality ?? undefined,
    delayMinutes: Number(row.delay_minutes ?? 0),
    statusReason: row.status_reason ?? undefined,
    contingencyNotes: row.contingency_notes ?? undefined,
    eventDayNotes: row.event_day_notes ?? undefined,
    vendorAssignmentId: row.vendor_assignment_id ?? undefined,
    teamAssignmentId: row.team_assignment_id ?? undefined,
    versionNumber: Number(row.version_number ?? 1),
    lockedAt: row.locked_at ?? undefined,
    pinnedCurrentAt: row.pinned_current_at ?? undefined,
    pinnedCurrentById: row.pinned_current_by ?? undefined,
    updatedById: row.updated_by ?? undefined,
    createdAt: row.created_at,
  };
}

function toTimelineVersion(row: any): TimelineVersion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id,
    versionNumber: Number(row.version_number ?? 1),
    status: row.status,
    finalizedById: row.finalized_by ?? undefined,
    finalizedAt: row.finalized_at ?? undefined,
    changeReason: row.change_reason ?? undefined,
    snapshot: Array.isArray(row.snapshot) ? row.snapshot : [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toEventDaySession(row: any): EventDaySession {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id,
    status: row.status,
    eventDayLeadId: row.event_day_lead_id ?? undefined,
    activeTimelineVersionId: row.active_timeline_version_id ?? undefined,
    activatedById: row.activated_by ?? undefined,
    activatedAt: row.activated_at ?? undefined,
    pausedAt: row.paused_at ?? undefined,
    completedById: row.completed_by ?? undefined,
    completedAt: row.completed_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    unresolvedWarnings: Array.isArray(row.unresolved_warnings) ? row.unresolved_warnings : [],
    readinessOverrides: Array.isArray(row.readiness_overrides) ? row.readiness_overrides : [],
    offlineManifest: row.offline_manifest ?? {},
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toEventDayVendorStatus(row: any): EventDayVendorStatusRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id,
    eventVendorId: row.event_vendor_id,
    vendorId: row.vendor_id,
    status: row.status,
    arrivalTime: row.arrival_time ?? undefined,
    setupWindowStart: row.setup_window_start ?? undefined,
    setupWindowEnd: row.setup_window_end ?? undefined,
    serviceStartAt: row.service_start_at ?? undefined,
    breakdownAt: row.breakdown_at ?? undefined,
    assignedLocation: row.assigned_location ?? undefined,
    deliverables: row.deliverables ?? undefined,
    delayMinutes: Number(row.delay_minutes ?? 0),
    issueSummary: row.issue_summary ?? undefined,
    checkedInById: row.checked_in_by ?? undefined,
    checkedInAt: row.checked_in_at ?? undefined,
    notes: row.notes ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toEventDayIssue(row: any): EventDayIssue {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    eventId: row.event_id,
    timelineItemId: row.timeline_item_id ?? undefined,
    vendorId: row.vendor_id ?? undefined,
    reportedById: row.reported_by ?? undefined,
    assignedToId: row.assigned_to ?? undefined,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    resolution: row.resolution ?? undefined,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at ?? undefined,
    metadata: row.metadata ?? {},
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function toEventTemplate(row: any): EventTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    eventType: row.event_type,
    description: row.description ?? "",
    defaultGuestCount: Number(row.default_guest_count ?? 0),
    defaultClientPrice: Number(row.default_client_price ?? 0),
    timelineNotes: row.timeline_notes ?? "",
    internalNotes: row.internal_notes ?? "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

function toTaskTemplate(row: any): TaskTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventTemplateId: row.event_template_id ?? undefined,
    title: row.title,
    description: row.description ?? "",
    priority: row.priority,
    dueOffsetDays: Number(row.due_offset_days ?? 0),
    checklistItems: Array.isArray(row.checklist_items) ? row.checklist_items : [],
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function toBudgetTemplate(row: any): BudgetTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventTemplateId: row.event_template_id ?? undefined,
    category: row.category,
    description: row.description,
    plannedAmount: Number(row.planned_amount ?? 0),
    marginEstimate: Number(row.margin_estimate ?? 0),
    dueOffsetDays: Number(row.due_offset_days ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function toApprovalTemplate(row: any): ApprovalTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventTemplateId: row.event_template_id ?? undefined,
    type: row.type,
    title: row.title,
    description: row.description ?? "",
    dueOffsetDays: Number(row.due_offset_days ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function toVendorTemplate(row: any): VendorTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventTemplateId: row.event_template_id ?? undefined,
    serviceCategory: row.service_category,
    preferredVendorId: row.preferred_vendor_id ?? undefined,
    notes: row.notes ?? "",
    sortOrder: Number(row.sort_order ?? 0),
  };
}

async function selectAll(table: string, organizationId: string, orderColumn = "created_at") {
  const { data, error } = await db()
    .from(table)
    .select("*")
    .eq("organization_id", organizationId)
    .order(orderColumn, { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function selectOptionalAll(
  table: string,
  organizationId: string,
  orderColumn = "created_at",
) {
  try {
    return await selectAll(table, organizationId, orderColumn);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message)
          : String(error);
    if (message.includes(`'public.${table}'`) || message.includes(`'${table}'`)) {
      return [];
    }
    throw error;
  }
}

async function findByIdempotency<T>(
  table: string,
  organizationId: string,
  idempotencyKey: string | undefined,
  mapper: (row: any) => T,
): Promise<T | null> {
  if (!idempotencyKey) return null;
  const { data, error } = await db()
    .from(table)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data ? mapper(data) : null;
}

function isMissingSchemaError(error: unknown, tableOrColumn: string) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`'public.${tableOrColumn}'`) || message.includes(`'${tableOrColumn}'`);
}

async function findOrCreateClientForLead(lead: Lead) {
  if (lead.clientId) return lead.clientId;
  if (!lead.email) return undefined;
  const clientNameSnapshot = lead.clientNameSnapshot ?? lead.clientName;

  try {
    const { data: existingClient, error: existingError } = await db()
      .from("clients")
      .select("id")
      .eq("organization_id", lead.organizationId)
      .eq("email", lead.email)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingClient?.id) return existingClient.id as string;

    const { data: createdClient, error: createError } = await db()
      .from("clients")
      .insert({
        organization_id: lead.organizationId,
        display_name: clientNameSnapshot,
        email: lead.email,
        phone: lead.phone || null,
        status: "Active",
        source: lead.source || "Lead conversion",
        notes: lead.notes || null,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    return createdClient?.id as string | undefined;
  } catch (error) {
    if (isMissingSchemaError(error, "clients")) return undefined;
    throw error;
  }
}

async function syncClientIdentityForLead(lead: Lead) {
  const clientId = lead.clientId || (await findOrCreateClientForLead(lead));
  if (!clientId) return;
  const clientNameSnapshot = lead.clientNameSnapshot ?? lead.clientName;

  try {
    const { error } = await db()
      .from("clients")
      .update({
        display_name: clientNameSnapshot,
        email: lead.email,
        phone: lead.phone || null,
        source: lead.source || null,
        notes: lead.notes || null,
      })
      .eq("id", clientId)
      .eq("organization_id", lead.organizationId);

    if (error) throw error;
  } catch (error) {
    if (isMissingSchemaError(error, "clients")) return;
    throw error;
  }
}

export async function loadEaseEventsData(organizationId: string): Promise<EaseEventsData> {
  const [
    organizationResult,
    users,
    clients,
    projects,
    connectedAccounts,
    calendarSyncStates,
    externalCalendarEvents,
    schedulingPreferences,
    availabilityBlocks,
    calendarConflicts,
    calendarSyncRuns,
    leads,
    events,
    eventTeamMembers,
    tasks,
    taskWorkflowColumns,
    taskLabels,
    taskLabelAssignments,
    taskParticipants,
    taskChecklists,
    checklistItems,
    taskLinks,
    taskAttachments,
    taskSavedViews,
    taskInboxItems,
    vendors,
    eventVendors,
    budgetItems,
    invoices,
    invoicePayments,
    financeSettings,
    expenses,
    expensePayments,
    expenseFiles,
    bookingSettings,
    proposals,
    proposalVersions,
    proposalLineItems,
    proposalPaymentTerms,
    proposalResponses,
    proposalFiles,
    projectBookingApprovals,
    approvals,
    files,
    comments,
    communicationThreads,
    communicationMessages,
    meetings,
    projectInspirationLinks,
    emailTemplates,
    projectActivityEvents,
    projectReminders,
    workflowAutomations,
    workflowAutomationActions,
    workflowEvents,
    workflowExecutions,
    workflowActionRuns,
    notifications,
    notificationPreferences,
    closeoutSettings,
    postEventCloseouts,
    postEventCloseoutItems,
    finalDeliverables,
    clientFeedbackResponses,
    clientConsents,
    vendorPerformanceReviews,
    internalRetrospectives,
    closeoutFinancialSnapshots,
    retentionSettings,
    clientMilestones,
    rebookingOpportunities,
    clientReferralLinks,
    referrals,
    communicationEligibilityLogs,
    timelineItems,
    timelineVersions,
    eventDaySessions,
    eventDayVendorStatuses,
    eventDayIssues,
    eventTemplates,
    taskTemplates,
    budgetTemplates,
    approvalTemplates,
    vendorTemplates,
  ] = await Promise.all([
    db().from("organizations").select("*").eq("id", organizationId).single(),
    selectAll("users", organizationId),
    selectOptionalAll("clients", organizationId),
    selectOptionalAll("projects", organizationId, "last_activity_at"),
    selectOptionalAll("connected_accounts", organizationId),
    selectOptionalAll("calendar_sync_states", organizationId),
    selectOptionalAll("external_calendar_events", organizationId, "start_at"),
    selectOptionalAll("scheduling_preferences", organizationId),
    selectOptionalAll("availability_blocks", organizationId, "start_at"),
    selectOptionalAll("calendar_conflicts", organizationId, "detected_at"),
    selectOptionalAll("calendar_sync_runs", organizationId, "started_at"),
    selectAll("leads", organizationId),
    selectAll("events", organizationId, "event_date"),
    selectOptionalAll("event_team_members", organizationId),
    selectAll("tasks", organizationId, "due_date"),
    selectOptionalAll("task_workflow_columns", organizationId, "sort_order"),
    selectOptionalAll("task_labels", organizationId, "sort_order"),
    selectOptionalAll("task_label_assignments", organizationId),
    selectOptionalAll("task_participants", organizationId),
    selectOptionalAll("task_checklists", organizationId, "sort_order"),
    selectAll("task_checklist_items", organizationId, "sort_order"),
    selectOptionalAll("task_links", organizationId),
    selectOptionalAll("task_attachments", organizationId),
    selectOptionalAll("task_saved_views", organizationId),
    selectOptionalAll("task_inbox_items", organizationId, "created_at"),
    selectAll("vendors", organizationId),
    selectAll("event_vendors", organizationId),
    selectAll("budget_items", organizationId, "due_date"),
    selectOptionalAll("invoices", organizationId, "due_date"),
    selectOptionalAll("invoice_payments", organizationId, "paid_at"),
    selectOptionalAll("organization_finance_settings", organizationId),
    selectOptionalAll("expenses", organizationId, "expense_date"),
    selectOptionalAll("expense_payments", organizationId, "payment_date"),
    selectOptionalAll("expense_files", organizationId),
    selectOptionalAll("organization_booking_settings", organizationId),
    selectOptionalAll("proposals", organizationId, "updated_at"),
    selectOptionalAll("proposal_versions", organizationId, "created_at"),
    selectOptionalAll("proposal_line_items", organizationId, "sort_order"),
    selectOptionalAll("proposal_payment_terms", organizationId, "sort_order"),
    selectOptionalAll("proposal_responses", organizationId, "responded_at"),
    selectOptionalAll("proposal_files", organizationId, "sort_order"),
    selectOptionalAll("project_booking_approvals", organizationId),
    selectAll("approvals", organizationId, "due_date"),
    selectAll("files", organizationId),
    selectAll("comments", organizationId),
    selectOptionalAll("communication_threads", organizationId, "last_activity_at"),
    selectOptionalAll("communication_messages", organizationId, "sent_at"),
    selectOptionalAll("meetings", organizationId, "start_at"),
    selectOptionalAll("project_inspiration_links", organizationId),
    selectOptionalAll("email_templates", organizationId),
    selectOptionalAll("project_activity_events", organizationId),
    selectOptionalAll("project_reminders", organizationId),
    selectOptionalAll("workflow_automations", organizationId, "priority"),
    selectOptionalAll("workflow_automation_actions", organizationId, "sort_order"),
    selectOptionalAll("workflow_events", organizationId, "occurred_at"),
    selectOptionalAll("workflow_executions", organizationId, "scheduled_for"),
    selectOptionalAll("workflow_action_runs", organizationId, "created_at"),
    selectOptionalAll("notifications", organizationId, "created_at"),
    selectOptionalAll("notification_preferences", organizationId),
    selectOptionalAll("organization_closeout_settings", organizationId),
    selectOptionalAll("post_event_closeouts", organizationId, "updated_at"),
    selectOptionalAll("post_event_closeout_items", organizationId, "sort_order"),
    selectOptionalAll("final_deliverables", organizationId, "sort_order"),
    selectOptionalAll("client_feedback_responses", organizationId, "submitted_at"),
    selectOptionalAll("client_consents", organizationId, "created_at"),
    selectOptionalAll("vendor_performance_reviews", organizationId, "created_at"),
    selectOptionalAll("internal_retrospectives", organizationId, "updated_at"),
    selectOptionalAll("closeout_financial_snapshots", organizationId, "version_number"),
    selectOptionalAll("organization_retention_settings", organizationId),
    selectOptionalAll("client_milestones", organizationId, "next_occurrence_date"),
    selectOptionalAll("rebooking_opportunities", organizationId, "next_action_at"),
    selectOptionalAll("client_referral_links", organizationId),
    selectOptionalAll("referrals", organizationId, "created_at"),
    selectOptionalAll("communication_eligibility_logs", organizationId, "created_at"),
    selectOptionalAll("event_timeline_items", organizationId, "sort_order"),
    selectOptionalAll("timeline_versions", organizationId, "version_number"),
    selectOptionalAll("event_day_sessions", organizationId),
    selectOptionalAll("event_day_vendor_statuses", organizationId),
    selectOptionalAll("event_day_issues", organizationId, "opened_at"),
    selectOptionalAll("event_templates", organizationId),
    selectOptionalAll("task_templates", organizationId, "sort_order"),
    selectOptionalAll("budget_templates", organizationId, "sort_order"),
    selectOptionalAll("approval_templates", organizationId, "sort_order"),
    selectOptionalAll("vendor_templates", organizationId, "sort_order"),
  ]);

  if (organizationResult.error) throw organizationResult.error;

  const mappedChecklist = checklistItems.map(toChecklistItem);
  const mappedTaskWorkflowColumns = taskWorkflowColumns.map(toTaskWorkflowColumn);
  const mappedTaskLabels = taskLabels.map(toTaskLabel);
  const mappedTaskLabelAssignments = taskLabelAssignments.map(toTaskLabelAssignment);
  const mappedTaskParticipants = taskParticipants.map(toTaskParticipant);
  const mappedTaskChecklists = taskChecklists.map(toTaskChecklist);
  const mappedTaskLinks = taskLinks.map(toTaskLink);
  const mappedTaskAttachments = taskAttachments.map(toTaskAttachment);
  const mappedTasks = tasks.map(toTask).map((task) => ({
    ...task,
    checklist: mappedChecklist.filter((item) => item.taskId === task.id),
    links: mappedTaskLinks.filter((item) => item.taskId === task.id),
    attachments: mappedTaskAttachments.filter((item) => item.taskId === task.id),
    labels: mappedTaskLabelAssignments
      .filter((assignment) => assignment.taskId === task.id)
      .map((assignment) => mappedTaskLabels.find((label) => label.id === assignment.labelId))
      .filter(Boolean) as TaskLabel[],
    participants: mappedTaskParticipants.filter((participant) => participant.taskId === task.id),
    checklists: mappedTaskChecklists.filter((checklist) => checklist.taskId === task.id),
  }));

  return {
    organization: toOrganization(organizationResult.data),
    users: users.map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      role: row.role,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone ?? undefined,
    })),
    clients: clients.map(toClient),
    projects: projects.map(toProject),
    connectedAccounts: connectedAccounts.map(toConnectedAccount),
    calendarSyncStates: calendarSyncStates.map(toCalendarSyncState),
    externalCalendarEvents: externalCalendarEvents.map(toExternalCalendarEvent),
    schedulingPreferences: schedulingPreferences.map(toSchedulingPreference),
    availabilityBlocks: availabilityBlocks.map(toAvailabilityBlock),
    calendarConflicts: calendarConflicts.map(toCalendarConflict),
    calendarSyncRuns: calendarSyncRuns.map(toCalendarSyncRun),
    leads: leads.map(toLead),
    events: events.map(toEvent),
    eventTeamMembers: eventTeamMembers.map(toEventTeamMember),
    tasks: mappedTasks,
    taskWorkflowColumns: mappedTaskWorkflowColumns,
    taskLabels: mappedTaskLabels,
    taskLabelAssignments: mappedTaskLabelAssignments,
    taskParticipants: mappedTaskParticipants,
    taskChecklists: mappedTaskChecklists,
    vendors: vendors.map(toVendor),
    eventVendors: eventVendors.map(toEventVendor),
    budgetItems: budgetItems.map(toBudgetItem),
    invoices: invoices.map(toInvoice),
    invoicePayments: invoicePayments.map(toInvoicePayment),
    financeSettings: financeSettings.map(toFinanceSettings),
    expenses: expenses.map(toExpense),
    expensePayments: expensePayments.map(toExpensePayment),
    expenseFiles: expenseFiles.map(toExpenseFile),
    bookingSettings: bookingSettings.map(toBookingSettings),
    proposals: proposals.map(toProposal),
    proposalVersions: proposalVersions.map(toProposalVersion),
    proposalLineItems: proposalLineItems.map(toProposalLineItem),
    proposalPaymentTerms: proposalPaymentTerms.map(toProposalPaymentTerm),
    proposalResponses: proposalResponses.map(toProposalResponse),
    proposalFiles: proposalFiles.map(toProposalFile),
    projectBookingApprovals: projectBookingApprovals.map(toProjectBookingApproval),
    approvals: approvals.map(toApproval),
    files: files.map(toEventFile),
    comments: comments.map(toComment),
    communicationThreads: communicationThreads.map(toCommunicationThread),
    communicationMessages: communicationMessages.map(toCommunicationMessage),
    meetings: meetings.map(toMeeting),
    projectInspirationLinks: projectInspirationLinks.map(toProjectInspirationLink),
    taskLinks: mappedTaskLinks,
    taskAttachments: mappedTaskAttachments,
    taskSavedViews: taskSavedViews.map(toTaskSavedView),
    taskInboxItems: taskInboxItems.map(toTaskInboxItem),
    emailTemplates: emailTemplates.map(toEmailTemplate),
    projectActivityEvents: projectActivityEvents.map(toProjectActivityEvent),
    projectReminders: projectReminders.map(toProjectReminder),
    workflowAutomations: workflowAutomations.map(toWorkflowAutomation),
    workflowAutomationActions: workflowAutomationActions.map(toWorkflowAutomationAction),
    workflowEvents: workflowEvents.map(toWorkflowEvent),
    workflowExecutions: workflowExecutions.map(toWorkflowExecution),
    workflowActionRuns: workflowActionRuns.map(toWorkflowActionRun),
    notifications: notifications.map(toNotification),
    notificationPreferences: notificationPreferences.map(toNotificationPreference),
    closeoutSettings: closeoutSettings.map(toCloseoutSettings),
    postEventCloseouts: postEventCloseouts.map(toPostEventCloseout),
    postEventCloseoutItems: postEventCloseoutItems.map(toPostEventCloseoutItem),
    finalDeliverables: finalDeliverables.map(toFinalDeliverable),
    clientFeedbackResponses: clientFeedbackResponses.map(toClientFeedback),
    clientConsents: clientConsents.map(toClientConsent),
    vendorPerformanceReviews: vendorPerformanceReviews.map(toVendorPerformanceReview),
    internalRetrospectives: internalRetrospectives.map(toInternalRetrospective),
    closeoutFinancialSnapshots: closeoutFinancialSnapshots.map(toCloseoutFinancialSnapshot),
    retentionSettings: retentionSettings.map(toRetentionSettings),
    clientMilestones: clientMilestones.map(toClientMilestone),
    rebookingOpportunities: rebookingOpportunities.map(toRebookingOpportunity),
    clientReferralLinks: clientReferralLinks.map(toClientReferralLink),
    referrals: referrals.map(toReferral),
    communicationEligibilityLogs: communicationEligibilityLogs.map(toCommunicationEligibilityLog),
    timelineItems: timelineItems.map(toTimelineItem),
    timelineVersions: timelineVersions.map(toTimelineVersion),
    eventDaySessions: eventDaySessions.map(toEventDaySession),
    eventDayVendorStatuses: eventDayVendorStatuses.map(toEventDayVendorStatus),
    eventDayIssues: eventDayIssues.map(toEventDayIssue),
    eventTemplates: eventTemplates.map(toEventTemplate),
    taskTemplates: taskTemplates.map(toTaskTemplate),
    budgetTemplates: budgetTemplates.map(toBudgetTemplate),
    approvalTemplates: approvalTemplates.map(toApprovalTemplate),
    vendorTemplates: vendorTemplates.map(toVendorTemplate),
  };
}

export async function createLeadInSupabase(
  organizationId: string,
  ownerId: string | undefined,
  input: CreateLeadInput,
): Promise<Lead> {
  let clientId: string | undefined;

  const { data: existingClient, error: existingClientError } = await db()
    .from("clients")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("email", input.email)
    .maybeSingle();

  if (!existingClientError && existingClient?.id) {
    clientId = existingClient.id as string;
  } else if (!existingClientError) {
    const { data: createdClient, error: createClientError } = await db()
      .from("clients")
      .insert({
        organization_id: organizationId,
        display_name: input.clientName,
        email: input.email,
        phone: input.phone || null,
        status: "Prospect",
        source: input.source || "Inquiry",
        notes: input.notes || null,
      })
      .select("id")
      .single();

    if (!createClientError && createdClient?.id) {
      clientId = createdClient.id as string;
    }
  }

  const { data, error } = await db()
    .from("leads")
    .insert({
      organization_id: organizationId,
      owner_id: ownerId,
      client_id: clientId ?? null,
      stage: "New Inquiry",
      client_name_snapshot: input.clientName,
      email: input.email,
      phone: input.phone,
      event_type: input.eventType,
      event_date: input.eventDate || null,
      estimated_guest_count: input.estimatedGuestCount,
      budget_range: input.budgetRange,
      notes: input.notes,
      source: input.source,
    })
    .select("*")
    .single();

  if (error) throw error;
  let lead = toLead(data);

  const { data: projectData, error: projectError } = await db()
    .from("projects")
    .insert({
      organization_id: organizationId,
      lead_id: lead.id,
      client_id: clientId ?? null,
      owner_id: ownerId ?? null,
      name: `${input.clientName} ${input.eventType}`,
      stage: "Inquiry",
      last_activity_at: lead.createdAt,
    })
    .select("*")
    .single();

  if (projectError) throw projectError;

  const project = toProject(projectData);
  const { data: updatedLead, error: leadProjectError } = await db()
    .from("leads")
    .update({ project_id: project.id })
    .eq("id", lead.id)
    .select("*")
    .single();

  if (leadProjectError) throw leadProjectError;
  lead = toLead(updatedLead);

  const cleanedLinks =
    input.inspirationLinks
      ?.map((link) => ({ label: link.label?.trim() || null, url: link.url.trim() }))
      .filter((link) => link.url) ?? [];

  if (cleanedLinks.length) {
    const { error: linkError } = await db()
      .from("project_inspiration_links")
      .insert(
        cleanedLinks.map((link) => ({
          organization_id: organizationId,
          project_id: project.id,
          lead_id: lead.id,
          label: link.label,
          url: link.url,
          created_by: ownerId ?? null,
        })),
      );
    if (linkError) throw linkError;
  }

  await db()
    .from("project_activity_events")
    .insert({
      organization_id: organizationId,
      project_id: project.id,
      actor_id: ownerId ?? null,
      activity_type: "system",
      title: "Inquiry workspace created",
      body: "Lead, client profile, and project context were created together.",
      metadata: { source: input.source || "Inquiry" },
    });

  return lead;
}

export async function updateLeadStageInSupabase(leadId: string, stage: LeadStage) {
  const { error } = await db().from("leads").update({ stage }).eq("id", leadId);
  if (error) throw error;
}

export async function updateOrganizationEmailSignatureInSupabase(
  organizationId: string,
  emailSignature: string,
): Promise<Organization> {
  const { data, error } = await db()
    .from("organizations")
    .update({ email_signature: emailSignature.trim() || null })
    .eq("id", organizationId)
    .select("*")
    .single();

  if (error) throw error;
  return toOrganization(data);
}

export async function updateOrganizationEmailIdentityInSupabase(
  organizationId: string,
  input: { emailSenderName: string; emailSignature: string },
): Promise<Organization> {
  const { data, error } = await db()
    .from("organizations")
    .update({
      email_sender_name: input.emailSenderName.trim() || null,
      email_signature: input.emailSignature.trim() || null,
    })
    .eq("id", organizationId)
    .select("*")
    .single();

  if (error) throw error;
  return toOrganization(data);
}

export async function updateEventDetailsInSupabase(
  eventId: string,
  input: UpdateEventDetailsInput,
  actorId?: string,
): Promise<EventRecord> {
  const { data, error } = await db()
    .from("events")
    .update({
      planner_id: input.plannerId ?? null,
      event_name: input.eventName.trim(),
      event_type: input.eventType.trim(),
      event_date: input.eventDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      location: input.location.trim(),
      guest_count: input.guestCount,
      status: input.status,
      internal_notes: input.internalNotes,
      timeline_notes: input.timelineNotes,
    })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;
  const event = toEvent(data);

  if (event.projectId) {
    const now = new Date().toISOString();
    await Promise.all([
      db()
        .from("projects")
        .update({ name: event.eventName, owner_id: event.plannerId ?? null, last_activity_at: now })
        .eq("id", event.projectId),
      db()
        .from("project_activity_events")
        .insert({
          organization_id: event.organizationId,
          project_id: event.projectId,
          actor_id: actorId ?? null,
          activity_type: "status",
          title: "Event details updated",
          body: `${event.eventName} details were edited.`,
          metadata: { event_id: event.id },
        }),
    ]);
  }

  return event;
}

export async function updateClientDetailsInSupabase(
  clientId: string,
  input: UpdateClientDetailsInput,
  actorId?: string,
): Promise<ClientRecord> {
  const { data, error } = await db()
    .from("clients")
    .update({
      display_name: input.displayName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      company_name: input.companyName?.trim() || null,
      preferred_contact_channel: input.preferredContactChannel?.trim() || null,
      relationship_owner_id: input.relationshipOwnerId || null,
      notes: input.notes ?? null,
    })
    .eq("id", clientId)
    .select("*")
    .single();

  if (error) throw error;
  const client = toClient(data);
  const [{ data: events }, { data: leads }] = await Promise.all([
    db().from("events").select("id, project_id").eq("client_id", client.id),
    db().from("leads").select("id, project_id").eq("client_id", client.id),
  ]);

  const projectIds = Array.from(
    new Set(
      [...(events ?? []), ...(leads ?? [])]
        .map((record: any) => record.project_id as string | null)
        .filter(Boolean),
    ),
  );

  await Promise.all([
    db()
      .from("events")
      .update({
        client_name_snapshot: client.displayName,
        client_email: client.email,
        client_phone: client.phone ?? null,
      })
      .eq("client_id", client.id),
    db()
      .from("leads")
      .update({
        client_name_snapshot: client.displayName,
        email: client.email,
        phone: client.phone ?? null,
      })
      .eq("client_id", client.id),
    ...projectIds.map((projectId) =>
      db()
        .from("project_activity_events")
        .insert({
          organization_id: client.organizationId,
          project_id: projectId,
          actor_id: actorId ?? null,
          activity_type: "status",
          title: "Client details updated",
          body: `${client.displayName} contact details were edited.`,
          metadata: { client_id: client.id },
        }),
    ),
  ]);

  return client;
}

export async function updateLeadInSupabase(leadId: string, input: UpdateLeadInput): Promise<Lead> {
  const { data, error } = await db()
    .from("leads")
    .update({
      owner_id: input.ownerId ?? null,
      client_name_snapshot: input.clientName,
      email: input.email,
      phone: input.phone,
      event_type: input.eventType,
      event_date: input.eventDate || null,
      estimated_guest_count: input.estimatedGuestCount,
      budget_range: input.budgetRange,
      notes: input.notes,
      source: input.source,
    })
    .eq("id", leadId)
    .select("*")
    .single();

  if (error) throw error;
  const lead = toLead(data);
  await syncClientIdentityForLead(lead);
  return lead;
}

export async function convertLeadToEventInSupabase(lead: Lead): Promise<EventRecord> {
  const clientId = await findOrCreateClientForLead(lead);
  await syncClientIdentityForLead({ ...lead, clientId: clientId ?? lead.clientId });
  const { data: existingProject, error: existingProjectError } = await db()
    .from("projects")
    .select("*")
    .eq("organization_id", lead.organizationId)
    .eq("lead_id", lead.id)
    .maybeSingle();

  if (existingProjectError) throw existingProjectError;

  let project = existingProject;
  if (!project) {
    const { data: createdProject, error: createProjectError } = await db()
      .from("projects")
      .insert({
        organization_id: lead.organizationId,
        lead_id: lead.id,
        client_id: clientId ?? null,
        owner_id: lead.ownerId ?? null,
        name: `${lead.clientNameSnapshot ?? lead.clientName} ${lead.eventType}`,
        stage: "Booked",
        last_activity_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createProjectError) throw createProjectError;
    project = createdProject;
  }

  if (!project?.id) {
    throw new Error("Unable to create project workspace for converted lead.");
  }

  const eventPayload = {
    organization_id: lead.organizationId,
    project_id: project.id,
    lead_id: lead.id,
    ...(clientId ? { client_id: clientId } : {}),
    planner_id: lead.ownerId ?? null,
    client_name_snapshot: lead.clientNameSnapshot ?? lead.clientName,
    client_email: lead.email,
    client_phone: lead.phone,
    event_name: `${lead.clientNameSnapshot ?? lead.clientName} ${lead.eventType}`,
    event_type: lead.eventType,
    event_date: lead.eventDate,
    start_time: "17:00",
    end_time: "22:00",
    location: "Location TBD",
    guest_count: lead.estimatedGuestCount,
    status: "Planning",
    client_price: 0,
    internal_notes: lead.notes,
    timeline_notes: "TODO: Generate a detailed run-of-show after consultation notes are finalized.",
  };

  const { data: eventData, error: eventError } = await db()
    .from("events")
    .insert(eventPayload)
    .select("*")
    .single();

  if (eventError) throw eventError;

  const event = toEvent(eventData);

  const { error: leadError } = await db()
    .from("leads")
    .update({
      stage: "Booked",
      converted_event_id: event.id,
      project_id: project.id,
      ...(clientId ? { client_id: clientId } : {}),
    })
    .eq("id", lead.id);
  if (leadError) throw leadError;

  const today = new Date().toISOString().slice(0, 10);

  const { error: projectUpdateError } = await db()
    .from("projects")
    .update({
      event_id: event.id,
      client_id: clientId ?? null,
      owner_id: lead.ownerId ?? null,
      name: event.eventName,
      stage: "Planning",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", project.id);

  if (projectUpdateError) throw projectUpdateError;

  await Promise.all(
    [
      ["communication_threads", { event_id: event.id }],
      ["communication_messages", { event_id: event.id }],
      ["meetings", { event_id: event.id }],
      ["meeting_notes", { event_id: event.id }],
      ["files", { event_id: event.id }],
      ["tasks", { event_id: event.id }],
      ["comments", { event_id: event.id }],
      ["project_inspiration_links", { event_id: event.id }],
    ].map(([table, updates]) =>
      db()
        .from(table as string)
        .update(updates)
        .eq("organization_id", lead.organizationId)
        .eq("project_id", project.id)
        .is("event_id", null),
    ),
  );

  const setupWrites = [
    db()
      .from("approvals")
      .insert({
        organization_id: lead.organizationId,
        event_id: event.id,
        type: "Proposal",
        title: "Initial proposal approval",
        description: "Review the converted proposal and confirm scope before execution planning.",
        status: "Pending",
        due_date: lead.eventDate || today,
      }),
    db()
      .from("tasks")
      .insert({
        organization_id: lead.organizationId,
        project_id: project.id,
        event_id: event.id,
        lead_id: lead.id,
        owner_id: lead.ownerId ?? null,
        title: "Kick off booked event workspace",
        description: "Confirm venue, vendor gaps, budget assumptions, and client portal access.",
        due_date: today,
        status: "To Do",
        priority: "High",
      }),
    db()
      .from("tasks")
      .insert({
        organization_id: lead.organizationId,
        project_id: project.id,
        event_id: event.id,
        lead_id: lead.id,
        owner_id: lead.ownerId ?? null,
        title: "Configure payment terms before deposit invoice",
        description:
          "Set the deposit amount, due date, and payment schedule before sending a client invoice.",
        due_date: today,
        status: "To Do",
        priority: "High",
      }),
    db()
      .from("project_activity_events")
      .insert({
        organization_id: lead.organizationId,
        project_id: project.id,
        actor_id: lead.ownerId ?? null,
        activity_type: "status",
        title: "Lead converted to booked event",
        body: "Project history, communications, files, meetings, notes, and tasks were retained.",
        metadata: { lead_id: lead.id, event_id: event.id },
      }),
  ];

  if (lead.ownerId) {
    setupWrites.push(
      db().from("event_team_members").upsert(
        {
          organization_id: lead.organizationId,
          event_id: event.id,
          user_id: lead.ownerId,
          role_label: "Lead planner",
        },
        { onConflict: "event_id,user_id" },
      ),
    );
  }

  await Promise.all(setupWrites);

  return event;
}

export async function updateTaskStatusInSupabase(taskId: string, status: TaskStatus) {
  const { error } = await db().from("tasks").update({ status }).eq("id", taskId);
  if (error) throw error;
}

export async function updateTaskOwnerInSupabase(taskId: string, ownerId: string | undefined) {
  const { error } = await db()
    .from("tasks")
    .update({ owner_id: ownerId ?? null })
    .eq("id", taskId);
  if (error) throw error;
}

export async function updateTaskWorkStateInSupabase(
  taskId: string,
  input: UpdateTaskWorkStateInput,
) {
  const updates: Record<string, unknown> = {};
  if (input.status !== undefined) updates.status = input.status;
  if (input.workflowColumnId !== undefined)
    updates.workflow_column_id = input.workflowColumnId || null;
  if (input.normalizedStatus !== undefined) updates.normalized_status = input.normalizedStatus;
  if (input.position !== undefined) updates.position = input.position;
  if (input.ownerId !== undefined) updates.owner_id = input.ownerId || null;
  if (input.dueDate !== undefined) updates.due_date = input.dueDate || null;
  if (input.dueAt !== undefined) updates.due_at = input.dueAt || null;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.visibility !== undefined) updates.visibility = input.visibility;
  if ("archivedAt" in input) updates.archived_at = input.archivedAt ?? null;
  if ("archivedById" in input) updates.archived_by = input.archivedById ?? null;
  if ("cardCoverFileId" in input) updates.card_cover_file_id = input.cardCoverFileId ?? null;
  updates.last_activity_at = new Date().toISOString();

  const { error } = await db().from("tasks").update(updates).eq("id", taskId);
  if (error) throw error;
}

export async function toggleChecklistItemInSupabase(item: TaskChecklistItem) {
  const { error } = await db()
    .from("task_checklist_items")
    .update({ is_complete: !item.isComplete })
    .eq("id", item.id);
  if (error) throw error;
}

export async function updateApprovalStatusInSupabase(
  approvalId: string,
  status: ApprovalStatus,
  userId?: string,
) {
  const { error } = await db()
    .from("approvals")
    .update({
      status,
      approved_by: status === "Approved" ? (userId ?? null) : null,
      responded_at: status === "Pending" ? null : new Date().toISOString(),
    })
    .eq("id", approvalId);

  if (error) throw error;
}

export async function createTaskInSupabase(
  organizationId: string,
  input: CreateTaskInput,
): Promise<TaskRecord> {
  const { data, error } = await db()
    .from("tasks")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      lead_id: input.leadId ?? null,
      event_id: input.eventId || null,
      owner_id: input.ownerId ?? null,
      title: input.title,
      description: input.description,
      due_date: input.dueDate || null,
      status: input.status ?? "To Do",
      priority: input.priority,
      workflow_column_id: input.workflowColumnId ?? null,
      normalized_status: input.normalizedStatus ?? undefined,
      position: input.position ?? undefined,
      start_at: input.startAt || null,
      due_at: input.dueAt || null,
      visibility: input.visibility ?? "Internal",
      estimated_effort_minutes: input.estimatedEffortMinutes ?? null,
      work_type: input.workType ?? (input.projectId || input.eventId ? "project" : "internal"),
      source_type: input.sourceType ?? null,
      source_record_id: input.sourceRecordId ?? null,
      source_url: input.sourceUrl ?? null,
      created_by: await getCurrentUserId(),
    })
    .select("*")
    .single();

  if (error) throw error;
  const task = toTask(data);
  await syncTaskAssociations(organizationId, task, input, { replace: false });
  return loadTaskWithAssociations(task);
}

async function getCurrentUserId() {
  const { data } = await db().auth.getUser();
  return data.user?.id ?? null;
}

async function syncTaskAssociations(
  organizationId: string,
  task: TaskRecord,
  input: Pick<
    CreateTaskInput,
    "links" | "labelIds" | "assigneeIds" | "watcherIds" | "checklistGroups"
  >,
  options: { replace: boolean },
) {
  const currentUserId = await getCurrentUserId();

  if (options.replace && input.links) {
    const { error } = await db().from("task_links").delete().eq("task_id", task.id);
    if (error) throw error;
  }

  const cleanedLinks =
    input.links
      ?.map((link) => ({
        label: link.label?.trim() || link.url.trim(),
        url: link.url.trim(),
      }))
      .filter((link) => link.url) ?? [];

  if (cleanedLinks.length) {
    const { error } = await db()
      .from("task_links")
      .insert(
        cleanedLinks.map((link) => ({
          organization_id: organizationId,
          task_id: task.id,
          label: link.label,
          url: link.url,
          created_by: currentUserId,
        })),
      );

    if (error) throw error;
  }

  if (options.replace && input.labelIds) {
    const { error } = await db().from("task_label_assignments").delete().eq("task_id", task.id);
    if (error) throw error;
  }

  if (input.labelIds?.length) {
    const { error } = await db()
      .from("task_label_assignments")
      .upsert(
        input.labelIds.map((labelId) => ({
          organization_id: organizationId,
          task_id: task.id,
          label_id: labelId,
          created_by: currentUserId,
        })),
        { onConflict: "organization_id,task_id,label_id" },
      );
    if (error) throw error;
  }

  const participantRows = [
    ...(input.assigneeIds ?? []).map((userId) => ({ userId, participantRole: "Assignee" })),
    ...(input.watcherIds ?? []).map((userId) => ({ userId, participantRole: "Watcher" })),
  ];

  if (options.replace && (input.assigneeIds || input.watcherIds)) {
    const { error } = await db().from("task_participants").delete().eq("task_id", task.id);
    if (error) throw error;
  }

  if (participantRows.length) {
    const { error } = await db()
      .from("task_participants")
      .upsert(
        participantRows.map((participant) => ({
          organization_id: organizationId,
          task_id: task.id,
          user_id: participant.userId,
          participant_role: participant.participantRole,
          added_by: currentUserId,
        })),
        { onConflict: "organization_id,task_id,user_id,participant_role" },
      );
    if (error) throw error;
  }

  if (input.checklistGroups?.length) {
    for (const [index, checklist] of input.checklistGroups.entries()) {
      const { data: createdChecklist, error: checklistError } = await db()
        .from("task_checklists")
        .insert({
          organization_id: organizationId,
          task_id: task.id,
          title: checklist.title.trim() || "Checklist",
          sort_order: index * 10,
          created_by: currentUserId,
        })
        .select("*")
        .single();

      if (checklistError) throw checklistError;

      const itemRows = checklist.items
        .map((item, itemIndex) => ({
          organization_id: organizationId,
          task_id: task.id,
          checklist_id: createdChecklist.id,
          title: item.title.trim(),
          assignee_id: item.assigneeId ?? null,
          due_at: item.dueAt || null,
          sort_order: itemIndex * 10,
        }))
        .filter((item) => item.title);

      if (itemRows.length) {
        const { error: itemError } = await db().from("task_checklist_items").insert(itemRows);
        if (itemError) throw itemError;
      }
    }
  }
}

async function loadTaskWithAssociations(task: TaskRecord): Promise<TaskRecord> {
  const [
    checklistItems,
    taskLinks,
    taskAttachments,
    labelAssignments,
    labels,
    participants,
    checklists,
  ] = await Promise.all([
    selectOptionalAll("task_checklist_items", task.organizationId, "sort_order"),
    selectOptionalAll("task_links", task.organizationId),
    selectOptionalAll("task_attachments", task.organizationId),
    selectOptionalAll("task_label_assignments", task.organizationId),
    selectOptionalAll("task_labels", task.organizationId, "sort_order"),
    selectOptionalAll("task_participants", task.organizationId),
    selectOptionalAll("task_checklists", task.organizationId, "sort_order"),
  ]);

  const mappedLabels = labels.map(toTaskLabel);
  const mappedAssignments = labelAssignments.map(toTaskLabelAssignment);
  return {
    ...task,
    checklist: checklistItems.map(toChecklistItem).filter((item) => item.taskId === task.id),
    links: taskLinks.map(toTaskLink).filter((item) => item.taskId === task.id),
    attachments: taskAttachments.map(toTaskAttachment).filter((item) => item.taskId === task.id),
    labels: mappedAssignments
      .filter((assignment) => assignment.taskId === task.id)
      .map((assignment) => mappedLabels.find((label) => label.id === assignment.labelId))
      .filter(Boolean) as TaskLabel[],
    participants: participants.map(toTaskParticipant).filter((item) => item.taskId === task.id),
    checklists: checklists.map(toTaskChecklist).filter((item) => item.taskId === task.id),
  };
}

export async function updateTaskInSupabase(
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskRecord> {
  const { data, error } = await db()
    .from("tasks")
    .update({
      project_id: input.projectId ?? null,
      lead_id: input.leadId ?? null,
      event_id: input.eventId || null,
      owner_id: input.ownerId ?? null,
      title: input.title,
      description: input.description,
      due_date: input.dueDate || null,
      status: input.status,
      priority: input.priority,
      workflow_column_id: input.workflowColumnId ?? null,
      normalized_status: input.normalizedStatus ?? undefined,
      position: input.position ?? undefined,
      start_at: input.startAt || null,
      due_at: input.dueAt || null,
      visibility: input.visibility ?? "Internal",
      estimated_effort_minutes: input.estimatedEffortMinutes ?? null,
      work_type: input.workType ?? (input.projectId || input.eventId ? "project" : "internal"),
      source_type: input.sourceType ?? null,
      source_record_id: input.sourceRecordId ?? null,
      source_url: input.sourceUrl ?? null,
      archived_at: input.archivedAt ?? null,
      archived_by: input.archivedById ?? null,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  const task = toTask(data);
  await syncTaskAssociations(task.organizationId, task, input, { replace: true });
  return loadTaskWithAssociations(task);
}

export async function createTaskLabelInSupabase(
  organizationId: string,
  input: CreateTaskLabelInput,
): Promise<TaskLabel> {
  const { data, error } = await db()
    .from("task_labels")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      color: input.color,
      description: input.description || null,
      created_by: await getCurrentUserId(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return toTaskLabel(data);
}

export async function setTaskLabelAssignmentsInSupabase(
  taskId: string,
  organizationId: string,
  labelIds: string[],
) {
  const currentUserId = await getCurrentUserId();
  const { error: deleteError } = await db()
    .from("task_label_assignments")
    .delete()
    .eq("task_id", taskId);
  if (deleteError) throw deleteError;
  if (!labelIds.length) return;
  const { error } = await db()
    .from("task_label_assignments")
    .insert(
      labelIds.map((labelId) => ({
        organization_id: organizationId,
        task_id: taskId,
        label_id: labelId,
        created_by: currentUserId,
      })),
    );
  if (error) throw error;
}

export async function setTaskParticipantsInSupabase(
  taskId: string,
  organizationId: string,
  assigneeIds: string[],
  watcherIds: string[],
) {
  const currentUserId = await getCurrentUserId();
  const { error: deleteError } = await db()
    .from("task_participants")
    .delete()
    .eq("task_id", taskId);
  if (deleteError) throw deleteError;
  const rows = [
    ...assigneeIds.map((userId) => ({ userId, participantRole: "Assignee" })),
    ...watcherIds.map((userId) => ({ userId, participantRole: "Watcher" })),
  ];
  if (!rows.length) return;
  const { error } = await db()
    .from("task_participants")
    .insert(
      rows.map((row) => ({
        organization_id: organizationId,
        task_id: taskId,
        user_id: row.userId,
        participant_role: row.participantRole,
        added_by: currentUserId,
      })),
    );
  if (error) throw error;
}

export async function createTaskChecklistInSupabase(
  organizationId: string,
  input: CreateTaskChecklistInput,
): Promise<TaskChecklist> {
  const { data, error } = await db()
    .from("task_checklists")
    .insert({
      organization_id: organizationId,
      task_id: input.taskId,
      title: input.title.trim() || "Checklist",
      sort_order: input.sortOrder ?? 0,
      created_by: await getCurrentUserId(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return toTaskChecklist(data);
}

export async function createTaskChecklistItemInSupabase(
  organizationId: string,
  input: CreateTaskChecklistItemInput,
): Promise<TaskChecklistItem> {
  const { data, error } = await db()
    .from("task_checklist_items")
    .insert({
      organization_id: organizationId,
      task_id: input.taskId,
      checklist_id: input.checklistId ?? null,
      title: input.title.trim(),
      assignee_id: input.assigneeId ?? null,
      due_at: input.dueAt || null,
      notes: input.notes || null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toChecklistItem(data);
}

export async function updateTaskChecklistItemInSupabase(
  itemId: string,
  input: UpdateTaskChecklistItemInput,
) {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.isComplete !== undefined) {
    updates.is_complete = input.isComplete;
    updates.completed_at = input.isComplete ? new Date().toISOString() : null;
  }
  if (input.assigneeId !== undefined) updates.assignee_id = input.assigneeId;
  if (input.dueAt !== undefined) updates.due_at = input.dueAt;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
  const { error } = await db().from("task_checklist_items").update(updates).eq("id", itemId);
  if (error) throw error;
}

export async function createTaskCommentInSupabase(
  organizationId: string,
  input: CreateTaskCommentInput,
): Promise<CommentMessage> {
  const { data, error } = await db()
    .from("comments")
    .insert({
      organization_id: organizationId,
      task_id: input.taskId,
      author_id: await getCurrentUserId(),
      body: input.body,
      visibility: input.visibility ?? "Internal",
      mentions: input.mentions ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return toComment(data);
}

export async function attachTaskFileInSupabase(
  organizationId: string,
  input: AttachTaskFileInput,
): Promise<TaskAttachment> {
  const { data, error } = await db()
    .from("task_attachments")
    .insert({
      organization_id: organizationId,
      task_id: input.taskId,
      file_id: input.fileId,
      label: input.label || null,
      created_by: await getCurrentUserId(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return toTaskAttachment(data);
}

export async function createTaskInboxItemInSupabase(
  organizationId: string,
  input: CreateTaskInboxItemInput,
): Promise<TaskInboxItem> {
  const existing = await findByIdempotency(
    "task_inbox_items",
    organizationId,
    input.idempotencyKey,
    toTaskInboxItem,
  );
  if (existing) return existing;

  const { data, error } = await db()
    .from("task_inbox_items")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      event_id: input.eventId ?? null,
      source_type: input.sourceType,
      source_table: input.sourceTable ?? null,
      source_record_id: input.sourceRecordId ?? null,
      source_url: input.sourceUrl ?? null,
      captured_by: await getCurrentUserId(),
      raw_content: input.rawContent ?? null,
      summary: input.summary ?? null,
      suggested_project_id: input.suggestedProjectId ?? input.projectId ?? null,
      suggested_title: input.suggestedTitle ?? null,
      suggested_owner_id: input.suggestedOwnerId ?? null,
      suggested_due_at: input.suggestedDueAt ?? null,
      suggested_status: input.suggestedStatus ?? "To Do",
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return toTaskInboxItem(data);
}

export async function updateTaskInboxItemInSupabase(
  itemId: string,
  updates: Partial<
    Pick<TaskInboxItem, "status" | "convertedTaskId" | "snoozedUntil" | "dismissedAt">
  >,
) {
  const { error } = await db()
    .from("task_inbox_items")
    .update({
      status: updates.status,
      converted_task_id: updates.convertedTaskId,
      snoozed_until: updates.snoozedUntil,
      dismissed_at: updates.dismissedAt,
    })
    .eq("id", itemId);
  if (error) throw error;
}

export async function createEventTeamMemberInSupabase(
  organizationId: string,
  input: CreateEventTeamMemberInput,
): Promise<EventTeamMember> {
  const { data, error } = await db()
    .from("event_team_members")
    .insert({
      organization_id: organizationId,
      event_id: input.eventId,
      user_id: input.userId,
      role_label: input.roleLabel,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toEventTeamMember(data);
}

export async function deleteEventTeamMemberInSupabase(memberId: string) {
  const { error } = await db().from("event_team_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function createBudgetItemInSupabase(
  organizationId: string,
  input: CreateBudgetItemInput,
): Promise<BudgetItem> {
  const { data, error } = await db()
    .from("budget_items")
    .insert({
      organization_id: organizationId,
      event_id: input.eventId,
      vendor_id: input.vendorId ?? null,
      category: input.category,
      description: input.description,
      planned_amount: input.plannedAmount,
      actual_amount: input.actualAmount,
      paid_amount: input.paidAmount,
      due_date: input.dueDate || null,
      margin_estimate: input.marginEstimate,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toBudgetItem(data);
}

export async function updateBudgetItemInSupabase(
  itemId: string,
  input: UpdateBudgetItemInput,
): Promise<BudgetItem> {
  const { data, error } = await db()
    .from("budget_items")
    .update({
      event_id: input.eventId,
      vendor_id: input.vendorId ?? null,
      category: input.category,
      description: input.description,
      planned_amount: input.plannedAmount,
      actual_amount: input.actualAmount,
      paid_amount: input.paidAmount,
      due_date: input.dueDate || null,
      margin_estimate: input.marginEstimate,
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw error;
  return toBudgetItem(data);
}

function createInvoiceNumber() {
  const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${compactDate}-${suffix}`;
}

export async function createInvoiceInSupabase(
  organizationId: string,
  input: CreateInvoiceInput,
): Promise<InvoiceRecord> {
  const { data, error } = await db()
    .from("invoices")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      event_id: input.eventId ?? null,
      client_id: input.clientId ?? null,
      proposal_id: input.proposalId ?? null,
      proposal_version_id: input.proposalVersionId ?? null,
      proposal_payment_term_id: input.proposalPaymentTermId ?? null,
      invoice_number: createInvoiceNumber(),
      invoice_type: input.invoiceType,
      amount: input.amount,
      paid_amount: input.paidAmount,
      due_date: input.dueDate || null,
      status: input.status,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return toInvoice(data);
}

export async function updateInvoiceInSupabase(
  invoiceId: string,
  input: UpdateInvoiceInput,
): Promise<InvoiceRecord> {
  const { data, error } = await db()
    .from("invoices")
    .update({
      project_id: input.projectId ?? null,
      event_id: input.eventId ?? null,
      client_id: input.clientId ?? null,
      proposal_id: input.proposalId ?? null,
      proposal_version_id: input.proposalVersionId ?? null,
      proposal_payment_term_id: input.proposalPaymentTermId ?? null,
      invoice_number: input.invoiceNumber,
      invoice_type: input.invoiceType,
      amount: input.amount,
      paid_amount: input.paidAmount,
      due_date: input.dueDate || null,
      status: input.status,
      stripe_invoice_id: input.stripeInvoiceId ?? null,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error) throw error;
  return toInvoice(data);
}

function createExpenseNumber() {
  const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EXP-${compactDate}-${suffix}`;
}

async function findExpenseByIdempotencyKey(organizationId: string, idempotencyKey?: string) {
  if (!idempotencyKey) return null;
  const { data, error } = await db()
    .from("expenses")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data ? toExpense(data) : null;
}

async function findExpensePaymentByIdempotencyKey(organizationId: string, idempotencyKey?: string) {
  if (!idempotencyKey) return null;
  const { data, error } = await db()
    .from("expense_payments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data ? toExpensePayment(data) : null;
}

export async function createExpenseInSupabase(
  organizationId: string,
  input: CreateExpenseInput,
): Promise<ExpenseRecord> {
  const existing = await findExpenseByIdempotencyKey(organizationId, input.idempotencyKey);
  if (existing) return existing;

  const { data, error } = await db()
    .from("expenses")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      event_id: input.eventId ?? null,
      vendor_id: input.vendorId ?? null,
      budget_item_id: input.budgetItemId ?? null,
      created_by: input.createdById ?? null,
      approved_by: input.approvedById ?? null,
      expense_number: input.expenseNumber || createExpenseNumber(),
      description: input.description,
      category: input.category,
      source: input.source,
      status: input.status,
      currency: input.currency,
      subtotal: input.subtotal,
      tax_amount: input.taxAmount,
      service_fee_amount: input.serviceFeeAmount,
      tip_amount: input.tipAmount,
      total_amount: input.totalAmount,
      expense_date: input.expenseDate,
      due_date: input.dueDate || null,
      approved_at: input.status === "Approved" ? new Date().toISOString() : null,
      notes: input.notes ?? null,
      payment_reference: input.paymentReference ?? null,
      client_billable: input.clientBillable,
      reimbursable: input.reimbursable,
      bookkeeping_status: input.bookkeepingStatus,
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (input.idempotencyKey && error.code === "23505") {
      const retryExisting = await findExpenseByIdempotencyKey(organizationId, input.idempotencyKey);
      if (retryExisting) return retryExisting;
    }
    throw error;
  }
  return toExpense(data);
}

export async function updateExpenseInSupabase(
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<ExpenseRecord> {
  const { data, error } = await db()
    .from("expenses")
    .update({
      project_id: input.projectId,
      event_id: input.eventId ?? null,
      vendor_id: input.vendorId ?? null,
      budget_item_id: input.budgetItemId ?? null,
      created_by: input.createdById ?? null,
      approved_by: input.approvedById ?? null,
      expense_number: input.expenseNumber ?? null,
      description: input.description,
      category: input.category,
      source: input.source,
      status: input.status,
      currency: input.currency,
      subtotal: input.subtotal,
      tax_amount: input.taxAmount,
      service_fee_amount: input.serviceFeeAmount,
      tip_amount: input.tipAmount,
      total_amount: input.totalAmount,
      expense_date: input.expenseDate,
      due_date: input.dueDate || null,
      approved_at: input.status === "Approved" ? new Date().toISOString() : null,
      notes: input.notes ?? null,
      payment_reference: input.paymentReference ?? null,
      client_billable: input.clientBillable,
      reimbursable: input.reimbursable,
      bookkeeping_status: input.bookkeepingStatus,
      metadata: input.metadata ?? {},
    })
    .eq("id", expenseId)
    .select("*")
    .single();

  if (error) throw error;
  return toExpense(data);
}

export async function recordExpensePaymentInSupabase(
  organizationId: string,
  input: CreateExpensePaymentInput,
): Promise<ExpensePaymentRecord> {
  const existing = await findExpensePaymentByIdempotencyKey(organizationId, input.idempotencyKey);
  if (existing) return existing;

  const { data: expenseRow, error: expenseError } = await db()
    .from("expenses")
    .select("*")
    .eq("id", input.expenseId)
    .single();
  if (expenseError) throw expenseError;
  const expense = toExpense(expenseRow);

  const { data: existingPayments, error: paymentsError } = await db()
    .from("expense_payments")
    .select("*")
    .eq("expense_id", input.expenseId)
    .eq("status", "Completed");
  if (paymentsError) throw paymentsError;

  const paidAlready = (existingPayments ?? []).reduce(
    (sum: number, payment: any) => sum + Number(payment.amount ?? 0),
    0,
  );
  if (input.status === "Completed" && paidAlready + input.amount > expense.totalAmount + 0.01) {
    throw new Error("Expense payment exceeds the outstanding balance.");
  }

  const { data, error } = await db()
    .from("expense_payments")
    .insert({
      organization_id: organizationId,
      expense_id: input.expenseId,
      amount: input.amount,
      currency: input.currency,
      payment_method: input.paymentMethod,
      payment_date: input.paymentDate,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      recorded_by: input.recordedById ?? null,
      status: input.status,
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (input.idempotencyKey && error.code === "23505") {
      const retryExisting = await findExpensePaymentByIdempotencyKey(
        organizationId,
        input.idempotencyKey,
      );
      if (retryExisting) return retryExisting;
    }
    throw error;
  }

  const totalPaid = input.status === "Completed" ? paidAlready + input.amount : paidAlready;
  const nextStatus =
    totalPaid >= expense.totalAmount ? "Paid" : totalPaid > 0 ? "Partially Paid" : expense.status;
  await db().from("expenses").update({ status: nextStatus }).eq("id", input.expenseId);

  return toExpensePayment(data);
}

export async function attachExpenseFileInSupabase(
  organizationId: string,
  input: AttachExpenseFileInput,
): Promise<ExpenseFileRecord> {
  const { data, error } = await db()
    .from("expense_files")
    .upsert(
      {
        organization_id: organizationId,
        expense_id: input.expenseId,
        file_id: input.fileId,
        visibility: input.visibility ?? "Internal",
        caption: input.caption ?? null,
        created_by: input.createdById ?? null,
      },
      { onConflict: "expense_id,file_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return toExpenseFile(data);
}

export async function createVendorInSupabase(
  organizationId: string,
  input: CreateVendorInput,
): Promise<Vendor> {
  const { data, error } = await db()
    .from("vendors")
    .insert({
      organization_id: organizationId,
      name: input.name,
      service_category: input.serviceCategory,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone,
      website: input.website || null,
      notes: input.notes,
      rating: input.rating,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toVendor(data);
}

export async function createEventVendorInSupabase(
  organizationId: string,
  input: CreateEventVendorInput,
): Promise<EventVendor> {
  const { data, error } = await db()
    .from("event_vendors")
    .insert({
      organization_id: organizationId,
      event_id: input.eventId,
      vendor_id: input.vendorId,
      service_category: input.serviceCategory,
      quoted_amount: input.quotedAmount,
      actual_amount: input.actualAmount,
      payment_status: input.paymentStatus,
      notes: input.notes,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toEventVendor(data);
}

export async function createFileRecordInSupabase(file: EventFile): Promise<EventFile> {
  const { data, error } = await db()
    .from("files")
    .insert({
      id: file.id,
      organization_id: file.organizationId,
      project_id: file.projectId ?? null,
      lead_id: file.leadId ?? null,
      event_id: file.eventId || null,
      uploaded_by: file.uploadedById ?? null,
      category: file.category,
      storage_path: file.storagePath,
      name: file.name,
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
      visibility: file.visibility ?? "Client",
      original_filename: file.originalFilename ?? file.name,
      caption: file.caption ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toEventFile(data);
}

export async function createCommunicationThreadInSupabase(
  organizationId: string,
  input: CreateCommunicationThreadInput,
): Promise<CommunicationThread> {
  const { data, error } = await db()
    .from("communication_threads")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      lead_id: input.leadId ?? null,
      event_id: input.eventId || null,
      assigned_to_id: input.assignedToId ?? null,
      subject: input.subject,
      client_name_snapshot: input.clientName,
      participants: input.participants,
      channel: input.channel,
      status: input.status,
      integration_source: input.integrationSource ?? null,
      preview: input.preview,
      unread_count: input.unreadCount,
      last_activity_at: input.lastActivityAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toCommunicationThread(data);
}

export async function createCommunicationMessageInSupabase(
  organizationId: string,
  input: CreateCommunicationMessageInput,
): Promise<CommunicationMessage> {
  const { data, error } = await db()
    .from("communication_messages")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      lead_id: input.leadId ?? null,
      thread_id: input.threadId,
      event_id: input.eventId || null,
      author_id: input.authorId ?? null,
      direction: input.direction,
      body: input.body,
      summary: input.summary ?? null,
      visibility: input.visibility,
      external_provider: input.externalProvider ?? null,
      external_message_id: input.externalMessageId ?? null,
      delivery_status: input.deliveryStatus ?? null,
      delivery_mode: input.deliveryMode ?? null,
      delivery_error: input.deliveryError ?? null,
      metadata: input.metadata ?? {},
      sent_at: input.sentAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toCommunicationMessage(data);
}

export async function createClientMilestoneInSupabase(
  organizationId: string,
  input: CreateClientMilestoneInput,
): Promise<ClientMilestone> {
  const existing = await findByIdempotency(
    "client_milestones",
    organizationId,
    input.idempotencyKey,
    toClientMilestone,
  );
  if (existing) return existing;

  const { data, error } = await db()
    .from("client_milestones")
    .insert({
      organization_id: organizationId,
      client_id: input.clientId,
      source_project_id: input.sourceProjectId ?? null,
      milestone_type: input.milestoneType,
      title: input.title,
      milestone_date: input.milestoneDate ?? null,
      month: input.month ?? null,
      day: input.day ?? null,
      recurrence_rule: input.recurrenceRule ?? null,
      reminder_offset_days: input.reminderOffsetDays ?? 30,
      next_occurrence_date: input.nextOccurrenceDate ?? input.milestoneDate ?? null,
      sensitivity: input.sensitivity ?? "Standard",
      source: input.source ?? "Planner confirmed",
      consent_or_purpose_reference: input.consentOrPurposeReferenceId ?? null,
      is_active: input.isActive ?? true,
      notes: input.notes ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
      created_by: input.createdById ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toClientMilestone(data);
}

export async function updateClientMilestoneInSupabase(
  milestoneId: string,
  input: UpdateClientMilestoneInput,
): Promise<ClientMilestone> {
  const { data, error } = await db()
    .from("client_milestones")
    .update({
      client_id: input.clientId,
      source_project_id: input.sourceProjectId ?? null,
      milestone_type: input.milestoneType,
      title: input.title,
      milestone_date: input.milestoneDate ?? null,
      month: input.month ?? null,
      day: input.day ?? null,
      recurrence_rule: input.recurrenceRule ?? null,
      reminder_offset_days: input.reminderOffsetDays ?? 30,
      next_occurrence_date: input.nextOccurrenceDate ?? input.milestoneDate ?? null,
      sensitivity: input.sensitivity ?? "Standard",
      source: input.source ?? "Planner confirmed",
      consent_or_purpose_reference: input.consentOrPurposeReferenceId ?? null,
      is_active: input.isActive ?? true,
      notes: input.notes ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
      created_by: input.createdById ?? null,
    })
    .eq("id", milestoneId)
    .select("*")
    .single();

  if (error) throw error;
  return toClientMilestone(data);
}

export async function createRebookingOpportunityInSupabase(
  organizationId: string,
  input: CreateRebookingOpportunityInput,
): Promise<RebookingOpportunity> {
  const existing = await findByIdempotency(
    "rebooking_opportunities",
    organizationId,
    input.idempotencyKey,
    toRebookingOpportunity,
  );
  if (existing) return existing;

  const { data, error } = await db()
    .from("rebooking_opportunities")
    .insert({
      organization_id: organizationId,
      client_id: input.clientId,
      source_project_id: input.sourceProjectId ?? null,
      source_event_id: input.sourceEventId ?? null,
      source_milestone_id: input.sourceMilestoneId ?? null,
      source_referral_id: input.sourceReferralId ?? null,
      assigned_to: input.assignedToId ?? null,
      opportunity_type: input.opportunityType,
      title: input.title,
      description: input.description ?? null,
      stage: input.stage ?? "Identified",
      estimated_event_date: input.estimatedEventDate ?? null,
      target_contact_date: input.targetContactDate ?? null,
      estimated_value: input.estimatedValue ?? null,
      estimated_probability: input.estimatedProbability ?? null,
      event_type: input.eventType ?? null,
      preferred_contact_channel: input.preferredContactChannel ?? null,
      consent_status_snapshot: input.consentStatusSnapshot ?? null,
      next_action: input.nextAction ?? null,
      next_action_at: input.nextActionAt ?? null,
      contacted_at: input.contactedAt ?? null,
      responded_at: input.respondedAt ?? null,
      converted_lead_id: input.convertedLeadId ?? null,
      converted_project_id: input.convertedProjectId ?? null,
      lost_reason: input.lostReason ?? null,
      snoozed_until: input.snoozedUntil ?? null,
      ai_summary: input.aiSummary ?? null,
      ai_summary_generated_at: input.aiSummaryGeneratedAt ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
      created_by: input.createdById ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toRebookingOpportunity(data);
}

export async function updateRebookingOpportunityInSupabase(
  opportunityId: string,
  input: UpdateRebookingOpportunityInput,
): Promise<RebookingOpportunity> {
  const { data, error } = await db()
    .from("rebooking_opportunities")
    .update({
      client_id: input.clientId,
      source_project_id: input.sourceProjectId ?? null,
      source_event_id: input.sourceEventId ?? null,
      source_milestone_id: input.sourceMilestoneId ?? null,
      source_referral_id: input.sourceReferralId ?? null,
      assigned_to: input.assignedToId ?? null,
      opportunity_type: input.opportunityType,
      title: input.title,
      description: input.description ?? null,
      stage: input.stage ?? "Identified",
      estimated_event_date: input.estimatedEventDate ?? null,
      target_contact_date: input.targetContactDate ?? null,
      estimated_value: input.estimatedValue ?? null,
      estimated_probability: input.estimatedProbability ?? null,
      event_type: input.eventType ?? null,
      preferred_contact_channel: input.preferredContactChannel ?? null,
      consent_status_snapshot: input.consentStatusSnapshot ?? null,
      next_action: input.nextAction ?? null,
      next_action_at: input.nextActionAt ?? null,
      contacted_at: input.contactedAt ?? null,
      responded_at: input.respondedAt ?? null,
      converted_lead_id: input.convertedLeadId ?? null,
      converted_project_id: input.convertedProjectId ?? null,
      lost_reason: input.lostReason ?? null,
      snoozed_until: input.snoozedUntil ?? null,
      ai_summary: input.aiSummary ?? null,
      ai_summary_generated_at: input.aiSummaryGeneratedAt ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
      created_by: input.createdById ?? null,
    })
    .eq("id", opportunityId)
    .select("*")
    .single();

  if (error) throw error;
  return toRebookingOpportunity(data);
}

export async function createClientReferralLinkInSupabase(
  organizationId: string,
  input: CreateClientReferralLinkInput,
): Promise<ClientReferralLink> {
  const { data: existing, error: existingError } = await db()
    .from("client_referral_links")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("referral_code", input.referralCode)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return toClientReferralLink(existing);

  const { data, error } = await db()
    .from("client_referral_links")
    .insert({
      organization_id: organizationId,
      client_id: input.clientId,
      project_id: input.projectId ?? null,
      referral_code: input.referralCode,
      source_campaign: input.sourceCampaign ?? null,
      expires_at: input.expiresAt ?? null,
      is_active: input.isActive ?? true,
      created_by: input.createdById ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return toClientReferralLink(data);
}

export async function createReferralInSupabase(
  organizationId: string,
  input: CreateReferralInput,
): Promise<ReferralRecord> {
  const existing = await findByIdempotency(
    "referrals",
    organizationId,
    input.idempotencyKey,
    toReferral,
  );
  if (existing) return existing;

  const { data, error } = await db()
    .from("referrals")
    .insert({
      organization_id: organizationId,
      referring_client_id: input.referringClientId ?? null,
      referring_project_id: input.referringProjectId ?? null,
      referral_link_id: input.referralLinkId ?? null,
      referred_lead_id: input.referredLeadId ?? null,
      referred_client_id: input.referredClientId ?? null,
      assigned_to: input.assignedToId ?? null,
      referral_code: input.referralCode ?? null,
      referral_source: input.referralSource ?? null,
      referrer_name_snapshot: input.referrerNameSnapshot ?? null,
      referred_name: input.referredName ?? null,
      referred_email: input.referredEmail ?? null,
      referred_phone: input.referredPhone ?? null,
      status: input.status ?? "Submitted",
      introduction_method: input.introductionMethod ?? null,
      consent_or_contact_basis: input.consentOrContactBasis ?? null,
      first_contact_at: input.firstContactAt ?? null,
      converted_at: input.convertedAt ?? null,
      converted_project_id: input.convertedProjectId ?? null,
      reward_status: input.rewardStatus ?? "Not Eligible",
      reward_description: input.rewardDescription ?? null,
      notes: input.notes ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return toReferral(data);
}

export async function updateReferralInSupabase(
  referralId: string,
  input: UpdateReferralInput,
): Promise<ReferralRecord> {
  const { data, error } = await db()
    .from("referrals")
    .update({
      referring_client_id: input.referringClientId ?? null,
      referring_project_id: input.referringProjectId ?? null,
      referral_link_id: input.referralLinkId ?? null,
      referred_lead_id: input.referredLeadId ?? null,
      referred_client_id: input.referredClientId ?? null,
      assigned_to: input.assignedToId ?? null,
      referral_code: input.referralCode ?? null,
      referral_source: input.referralSource ?? null,
      referrer_name_snapshot: input.referrerNameSnapshot ?? null,
      referred_name: input.referredName ?? null,
      referred_email: input.referredEmail ?? null,
      referred_phone: input.referredPhone ?? null,
      status: input.status ?? "Submitted",
      introduction_method: input.introductionMethod ?? null,
      consent_or_contact_basis: input.consentOrContactBasis ?? null,
      first_contact_at: input.firstContactAt ?? null,
      converted_at: input.convertedAt ?? null,
      converted_project_id: input.convertedProjectId ?? null,
      reward_status: input.rewardStatus ?? "Not Eligible",
      reward_description: input.rewardDescription ?? null,
      notes: input.notes ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
    })
    .eq("id", referralId)
    .select("*")
    .single();

  if (error) throw error;
  return toReferral(data);
}

export async function createCommunicationEligibilityLogInSupabase(
  organizationId: string,
  input: CreateCommunicationEligibilityLogInput,
): Promise<CommunicationEligibilityLog> {
  const existing = await findByIdempotency(
    "communication_eligibility_logs",
    organizationId,
    input.idempotencyKey,
    toCommunicationEligibilityLog,
  );
  if (existing) return existing;

  const { data, error } = await db()
    .from("communication_eligibility_logs")
    .insert({
      organization_id: organizationId,
      client_id: input.clientId ?? null,
      opportunity_id: input.opportunityId ?? null,
      referral_id: input.referralId ?? null,
      channel: input.channel,
      communication_category: input.communicationCategory,
      allowed: input.allowed,
      consent_status: input.consentStatus ?? null,
      consent_source: input.consentSource ?? null,
      consent_record_id: input.consentRecordId ?? null,
      expiry_or_review_at: input.expiryOrReviewAt ?? null,
      suppression_reason: input.suppressionReason ?? null,
      unsubscribe_status: input.unsubscribeStatus ?? null,
      jurisdiction_profile: input.jurisdictionProfile ?? null,
      requires_manual_review: input.requiresManualReview,
      explanation: input.explanation,
      checked_by: input.checkedById ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return toCommunicationEligibilityLog(data);
}

export async function convertRebookingOpportunityInSupabase(
  opportunityId: string,
  input: ConvertRebookingOpportunityInput,
): Promise<{ opportunity: RebookingOpportunity; lead: Lead; project: ProjectRecord }> {
  const { data: opportunityRow, error: opportunityError } = await db()
    .from("rebooking_opportunities")
    .select("*")
    .eq("id", opportunityId)
    .single();
  if (opportunityError) throw opportunityError;
  const opportunity = toRebookingOpportunity(opportunityRow);

  if (opportunity.convertedLeadId && opportunity.convertedProjectId) {
    const [{ data: leadRow, error: leadError }, { data: projectRow, error: projectError }] =
      await Promise.all([
        db().from("leads").select("*").eq("id", opportunity.convertedLeadId).single(),
        db().from("projects").select("*").eq("id", opportunity.convertedProjectId).single(),
      ]);
    if (leadError) throw leadError;
    if (projectError) throw projectError;
    return {
      opportunity,
      lead: toLead(leadRow),
      project: toProject(projectRow),
    };
  }

  const { data: clientRow, error: clientError } = await db()
    .from("clients")
    .select("*")
    .eq("id", opportunity.clientId)
    .single();
  if (clientError) throw clientError;
  const client = toClient(clientRow);
  const now = new Date().toISOString();
  const eventType = input.eventType ?? opportunity.eventType ?? "Repeat event";

  const { data: leadRow, error: leadError } = await db()
    .from("leads")
    .insert({
      organization_id: opportunity.organizationId,
      owner_id: input.ownerId ?? opportunity.assignedToId ?? null,
      client_id: opportunity.clientId,
      project_id: null,
      stage: "New Inquiry",
      client_name_snapshot: client.displayName,
      email: client.email,
      phone: client.phone ?? "",
      event_type: eventType,
      event_date: input.eventDate ?? opportunity.estimatedEventDate ?? null,
      estimated_guest_count: 0,
      budget_range: opportunity.estimatedValue
        ? `$${Math.round(opportunity.estimatedValue).toLocaleString()}`
        : "",
      notes:
        input.notes ??
        `Created from rebooking opportunity "${opportunity.title}". Review consent and scope before outreach.`,
      source: input.source ?? "Rebooking opportunity",
    })
    .select("*")
    .single();
  if (leadError) throw leadError;
  const lead = toLead(leadRow);

  const { data: projectRow, error: projectError } = await db()
    .from("projects")
    .insert({
      organization_id: opportunity.organizationId,
      lead_id: lead.id,
      client_id: opportunity.clientId,
      owner_id: lead.ownerId ?? opportunity.assignedToId ?? null,
      name: `${client.displayName} ${eventType}`,
      stage: "Inquiry",
      last_activity_at: now,
      metadata: {
        source: "rebooking_opportunity",
        rebooking_opportunity_id: opportunity.id,
        source_project_id: opportunity.sourceProjectId,
      },
    })
    .select("*")
    .single();
  if (projectError) throw projectError;
  const project = toProject(projectRow);

  await db().from("leads").update({ project_id: project.id }).eq("id", lead.id);
  const { data: convertedRow, error: convertedError } = await db()
    .from("rebooking_opportunities")
    .update({
      stage: "Converted",
      converted_lead_id: lead.id,
      converted_project_id: project.id,
      responded_at: now,
      next_action: "Continue the repeat-client inquiry workflow.",
      next_action_at: now,
    })
    .eq("id", opportunity.id)
    .select("*")
    .single();
  if (convertedError) throw convertedError;

  return { opportunity: toRebookingOpportunity(convertedRow), lead, project };
}

export async function createMeetingInSupabase(
  organizationId: string,
  input: CreateMeetingInput,
): Promise<MeetingRecord> {
  const { data, error } = await db()
    .from("meetings")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      lead_id: input.leadId ?? null,
      event_id: input.eventId || null,
      title: input.title,
      meeting_type: input.meetingType,
      status: input.status,
      start_at: input.startAt,
      end_at: input.endAt,
      organizer_id: input.organizerId ?? null,
      connected_account_id: input.connectedAccountId ?? null,
      external_provider: input.externalProvider ?? null,
      external_calendar_id: input.externalCalendarId ?? null,
      external_event_id: input.externalEventId ?? null,
      external_conference_url: input.externalConferenceUrl ?? null,
      synced_at: input.syncedAt ?? null,
      attendees: input.attendees,
      agenda: input.agenda,
      link: input.link ?? null,
      transcript: input.transcript,
      internal_summary: input.internalSummary,
      client_summary: input.clientSummary,
      notes: input.notes,
      action_items: input.actionItems,
      timezone: input.timezone ?? null,
      sync_status: input.syncStatus ?? null,
      sync_error: input.syncError ?? null,
      fathom_expected: input.fathomExpected ?? false,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toMeeting(data);
}

export async function updateMeetingInSupabase(
  meetingId: string,
  input: UpdateMeetingInput,
): Promise<MeetingRecord> {
  const { data, error } = await db()
    .from("meetings")
    .update({
      project_id: input.projectId ?? null,
      lead_id: input.leadId ?? null,
      event_id: input.eventId || null,
      title: input.title,
      meeting_type: input.meetingType,
      status: input.status,
      start_at: input.startAt,
      end_at: input.endAt,
      organizer_id: input.organizerId ?? null,
      connected_account_id: input.connectedAccountId ?? null,
      external_provider: input.externalProvider ?? null,
      external_calendar_id: input.externalCalendarId ?? null,
      external_event_id: input.externalEventId ?? null,
      external_conference_url: input.externalConferenceUrl ?? null,
      synced_at: input.syncedAt ?? null,
      attendees: input.attendees,
      agenda: input.agenda,
      link: input.link ?? null,
      transcript: input.transcript,
      internal_summary: input.internalSummary,
      client_summary: input.clientSummary,
      notes: input.notes,
      action_items: input.actionItems,
      timezone: input.timezone ?? null,
      sync_status: input.syncStatus ?? null,
      sync_error: input.syncError ?? null,
      fathom_expected: input.fathomExpected ?? false,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .eq("id", meetingId)
    .select("*")
    .single();

  if (error) throw error;
  return toMeeting(data);
}

export async function createProjectReminderInSupabase(
  organizationId: string,
  input: CreateProjectReminderInput,
): Promise<ProjectReminder> {
  const { data, error } = await db()
    .from("project_reminders")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      assigned_to_id: input.assignedToId ?? null,
      title: input.title,
      due_at: input.dueAt ?? null,
      status: input.status ?? "Open",
      automation_source: input.automationSource ?? "manual",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return toProjectReminder(data);
}

export async function updateProjectReminderInSupabase(
  reminderId: string,
  input: UpdateProjectReminderInput,
): Promise<ProjectReminder> {
  const { data, error } = await db()
    .from("project_reminders")
    .update({
      project_id: input.projectId,
      assigned_to_id: input.assignedToId ?? null,
      title: input.title,
      due_at: input.dueAt ?? null,
      status: input.status ?? "Open",
      automation_source: input.automationSource ?? "manual",
      metadata: input.metadata ?? {},
    })
    .eq("id", reminderId)
    .select("*")
    .single();

  if (error) throw error;
  return toProjectReminder(data);
}

export async function updateWorkflowAutomationInSupabase(
  automationId: string,
  input: UpdateWorkflowAutomationInput,
): Promise<WorkflowAutomation> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.approvalPolicy !== undefined) payload.approval_policy = input.approvalPolicy;
  if (input.cooldownMinutes !== undefined) payload.cooldown_minutes = input.cooldownMinutes;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.conditions !== undefined) payload.conditions = input.conditions;
  if (input.quietHours !== undefined) payload.quiet_hours = input.quietHours;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  const { data, error } = await db()
    .from("workflow_automations")
    .update(payload)
    .eq("id", automationId)
    .select("*")
    .single();

  if (error) throw error;
  return toWorkflowAutomation(data);
}

export async function updateNotificationInSupabase(
  notificationId: string,
  input: UpdateNotificationInput,
): Promise<NotificationRecord> {
  const payload: Record<string, unknown> = {};
  if (input.status !== undefined) payload.status = input.status;
  if (input.readAt !== undefined) payload.read_at = input.readAt;
  if (input.dismissedAt !== undefined) payload.dismissed_at = input.dismissedAt;

  const { data, error } = await db()
    .from("notifications")
    .update(payload)
    .eq("id", notificationId)
    .select("*")
    .single();

  if (error) throw error;
  return toNotification(data);
}

export async function createNotificationInSupabase(
  organizationId: string,
  input: CreateNotificationInput,
): Promise<NotificationRecord> {
  const payload = {
    organization_id: organizationId,
    recipient_user_id: input.recipientUserId ?? null,
    project_id: input.projectId ?? null,
    event_id: input.eventId ?? null,
    notification_type: input.notificationType,
    severity: input.severity ?? "Info",
    status: "Unread",
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    channel: input.channel ?? "in_app",
    action_required: input.actionRequired ?? true,
    due_at: input.dueAt ?? null,
    dedupe_key: input.dedupeKey,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await db()
    .from("notifications")
    .upsert(payload, { onConflict: "organization_id,dedupe_key" })
    .select("*")
    .single();

  if (error) throw error;
  return toNotification(data);
}

const defaultCloseoutItems: Array<{
  groupName: string;
  title: string;
  requirementLevel: CloseoutRequirementLevel;
  sortOrder: number;
}> = [
  {
    groupName: "Operational",
    title: "Event-Day Mode completed",
    requirementLevel: "Required",
    sortOrder: 10,
  },
  {
    groupName: "Operational",
    title: "Actual timeline reviewed",
    requirementLevel: "Required",
    sortOrder: 20,
  },
  {
    groupName: "Operational",
    title: "Unresolved event-day issues assigned or resolved",
    requirementLevel: "Required",
    sortOrder: 30,
  },
  {
    groupName: "Financial",
    title: "Client balance reconciled or explicitly deferred",
    requirementLevel: "Required",
    sortOrder: 40,
  },
  {
    groupName: "Financial",
    title: "Vendor payments reconciled or explicitly deferred",
    requirementLevel: "Required",
    sortOrder: 50,
  },
  {
    groupName: "Financial",
    title: "Budget variance and final profitability reviewed",
    requirementLevel: "Required",
    sortOrder: 60,
  },
  {
    groupName: "Deliverables",
    title: "Final client-facing deliverables prepared",
    requirementLevel: "Required",
    sortOrder: 70,
  },
  {
    groupName: "Relationship",
    title: "Client feedback requested or intentionally deferred",
    requirementLevel: "Recommended",
    sortOrder: 80,
  },
  {
    groupName: "Relationship",
    title: "Vendor performance reviews completed",
    requirementLevel: "Recommended",
    sortOrder: 90,
  },
  {
    groupName: "Closure",
    title: "Internal retrospective completed",
    requirementLevel: "Recommended",
    sortOrder: 100,
  },
  {
    groupName: "Closure",
    title: "Retention and rebooking handoff classified",
    requirementLevel: "Required",
    sortOrder: 110,
  },
];

export async function ensurePostEventCloseoutInSupabase(
  organizationId: string,
  input: EnsurePostEventCloseoutInput,
): Promise<{ closeout: PostEventCloseout; items: PostEventCloseoutItem[] }> {
  const { data: existing, error: existingError } = await db()
    .from("post_event_closeouts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("event_id", input.eventId)
    .maybeSingle();
  if (existingError) throw existingError;

  let closeoutRow = existing;
  if (!closeoutRow) {
    const now = new Date().toISOString();
    const { data, error } = await db()
      .from("post_event_closeouts")
      .insert({
        organization_id: organizationId,
        project_id: input.projectId,
        event_id: input.eventId,
        status: "Closeout In Progress",
        owner_id: input.ownerId ?? null,
        event_completed_at: input.eventCompletedAt ?? now,
        closeout_started_at: now,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;
    closeoutRow = data;

    await Promise.allSettled([
      db().from("events").update({ status: "Closeout In Progress" }).eq("id", input.eventId),
      db().from("projects").update({ stage: "Post-Event" }).eq("id", input.projectId),
      db()
        .from("project_activity_events")
        .insert({
          organization_id: organizationId,
          project_id: input.projectId,
          actor_id: input.ownerId ?? null,
          activity_type: "status",
          title: "Post-event closeout started",
          body: "Event-day execution ended. Closeout blockers, deliverables, feedback, vendor reviews, and financial reconciliation are now tracked.",
          metadata: { event_id: input.eventId, closeout_id: data.id },
        }),
    ]);
  }

  const closeout = toPostEventCloseout(closeoutRow);
  for (const item of defaultCloseoutItems) {
    const idempotencyKey = `${closeout.id}:${item.groupName}:${item.title}`.toLowerCase();
    const { data: existingItem, error: itemError } = await db()
      .from("post_event_closeout_items")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (itemError) throw itemError;
    if (existingItem) continue;

    const { error } = await db()
      .from("post_event_closeout_items")
      .insert({
        organization_id: organizationId,
        closeout_id: closeout.id,
        project_id: input.projectId,
        event_id: input.eventId,
        group_name: item.groupName,
        title: item.title,
        requirement_level: item.requirementLevel,
        status: "Not Started",
        owner_id: input.ownerId ?? null,
        sort_order: item.sortOrder,
        idempotency_key: idempotencyKey,
        metadata: { seeded: true },
      });
    if (error) throw error;
  }

  const { data: itemRows, error: loadItemsError } = await db()
    .from("post_event_closeout_items")
    .select("*")
    .eq("closeout_id", closeout.id)
    .order("sort_order", { ascending: true });
  if (loadItemsError) throw loadItemsError;

  return { closeout, items: (itemRows ?? []).map(toPostEventCloseoutItem) };
}

export async function updatePostEventCloseoutInSupabase(
  closeoutId: string,
  input: UpdatePostEventCloseoutInput,
): Promise<PostEventCloseout> {
  const payload: Record<string, unknown> = {};
  if (input.status !== undefined) payload.status = input.status;
  if (input.ownerId !== undefined) payload.owner_id = input.ownerId || null;
  if (input.completionPercentage !== undefined)
    payload.completion_percentage = input.completionPercentage;
  if (input.unresolvedIssueCount !== undefined)
    payload.unresolved_issue_count = input.unresolvedIssueCount;
  if (input.financialStatus !== undefined) payload.financial_status = input.financialStatus;
  if (input.deliverableStatus !== undefined) payload.deliverable_status = input.deliverableStatus;
  if (input.feedbackStatus !== undefined) payload.feedback_status = input.feedbackStatus;
  if (input.vendorReviewStatus !== undefined)
    payload.vendor_review_status = input.vendorReviewStatus;
  if (input.internalReviewStatus !== undefined)
    payload.internal_review_status = input.internalReviewStatus;
  if (input.retentionStatus !== undefined) payload.retention_status = input.retentionStatus;
  if (input.finalNotes !== undefined) payload.final_notes = input.finalNotes || null;
  if (input.retentionHandoff !== undefined) payload.retention_handoff = input.retentionHandoff;
  if (input.readinessOverrides !== undefined)
    payload.readiness_overrides = input.readinessOverrides;
  if (input.readyToCloseAt !== undefined) payload.ready_to_close_at = input.readyToCloseAt;
  if (input.closedAt !== undefined) payload.closed_at = input.closedAt;
  if (input.closedById !== undefined) payload.closed_by = input.closedById;
  if (input.reopenedAt !== undefined) payload.reopened_at = input.reopenedAt;
  if (input.reopenedById !== undefined) payload.reopened_by = input.reopenedById;
  if (input.reopenReason !== undefined) payload.reopen_reason = input.reopenReason;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  const { data, error } = await db()
    .from("post_event_closeouts")
    .update(payload)
    .eq("id", closeoutId)
    .select("*")
    .single();
  if (error) throw error;
  return toPostEventCloseout(data);
}

export async function updatePostEventCloseoutItemInSupabase(
  itemId: string,
  input: UpdatePostEventCloseoutItemInput,
): Promise<PostEventCloseoutItem> {
  const { data, error } = await db()
    .from("post_event_closeout_items")
    .update({
      status: input.status,
      owner_id: input.ownerId ?? null,
      due_date: input.dueDate ?? null,
      notes: input.notes ?? null,
      completed_at: input.completedAt ?? null,
      completed_by: input.completedById ?? null,
      override_reason: input.overrideReason ?? null,
    })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;
  return toPostEventCloseoutItem(data);
}

export async function upsertFinalDeliverableInSupabase(
  organizationId: string,
  input: UpsertFinalDeliverableInput,
): Promise<FinalDeliverable> {
  const payload = {
    id: input.id,
    organization_id: organizationId,
    closeout_id: input.closeoutId ?? null,
    project_id: input.projectId,
    event_id: input.eventId,
    file_id: input.fileId ?? null,
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    external_url: input.externalUrl ?? null,
    client_visible: input.clientVisible,
    status: input.status,
    due_date: input.dueDate ?? null,
    delivered_at: input.deliveredAt ?? null,
    delivered_by: input.deliveredById ?? null,
    expires_at: input.expiresAt ?? null,
    sort_order: input.sortOrder ?? 0,
    idempotency_key: input.idempotencyKey ?? null,
    metadata: input.metadata ?? {},
  };
  const { data, error } = await db()
    .from("final_deliverables")
    .upsert(payload, { onConflict: input.id ? "id" : "organization_id,idempotency_key" })
    .select("*")
    .single();
  if (error) throw error;
  return toFinalDeliverable(data);
}

export async function submitClientFeedbackInSupabase(
  organizationId: string,
  input: SubmitClientFeedbackInput,
): Promise<ClientFeedbackResponse> {
  const { data, error } = await db()
    .from("client_feedback_responses")
    .upsert(
      {
        organization_id: organizationId,
        closeout_id: input.closeoutId ?? null,
        project_id: input.projectId,
        event_id: input.eventId,
        client_id: input.clientId ?? null,
        submitted_by: input.submittedById ?? null,
        responder_name: input.responderName ?? null,
        responder_email: input.responderEmail ?? null,
        overall_satisfaction: input.overallSatisfaction ?? null,
        communication_rating: input.communicationRating ?? null,
        planning_process_rating: input.planningProcessRating ?? null,
        execution_rating: input.executionRating ?? null,
        value_rating: input.valueRating ?? null,
        likelihood_to_recommend: input.likelihoodToRecommend ?? null,
        what_went_well: input.whatWentWell ?? null,
        what_could_improve: input.whatCouldImprove ?? null,
        additional_comments: input.additionalComments ?? null,
        permission_to_contact: input.permissionToContact ?? false,
        concern_level: input.concernLevel ?? "None",
        service_recovery_status: input.serviceRecoveryStatus ?? "Not Required",
        metadata: input.metadata ?? {},
      },
      { onConflict: "organization_id,project_id,client_id" },
    )
    .select("*")
    .single();
  if (error) throw error;

  if (["Medium", "High"].includes(input.concernLevel ?? "None")) {
    const { data: existingRecoveryTask, error: recoveryLookupError } = await db()
      .from("tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("project_id", input.projectId)
      .eq("event_id", input.eventId)
      .eq("title", "Review client closeout concern")
      .maybeSingle();
    if (recoveryLookupError) throw recoveryLookupError;

    if (!existingRecoveryTask) {
      await db()
        .from("tasks")
        .insert({
          organization_id: organizationId,
          project_id: input.projectId,
          event_id: input.eventId,
          title: "Review client closeout concern",
          description:
            input.whatCouldImprove ??
            input.additionalComments ??
            "Client feedback requires recovery review.",
          due_date: new Date().toISOString().slice(0, 10),
          status: "To Do",
          priority: input.concernLevel === "High" ? "Urgent" : "High",
        });
    }
  }

  return toClientFeedback(data);
}

export async function upsertClientConsentInSupabase(
  organizationId: string,
  input: UpsertClientConsentInput,
): Promise<ClientConsent> {
  const { data, error } = await db()
    .from("client_consents")
    .upsert(
      {
        organization_id: organizationId,
        project_id: input.projectId ?? null,
        event_id: input.eventId ?? null,
        client_id: input.clientId ?? null,
        consent_type: input.consentType,
        status: input.status,
        consent_wording_version: input.consentWordingVersion ?? "v1",
        requested_at: input.requestedAt ?? null,
        granted_at: input.grantedAt ?? null,
        declined_at: input.declinedAt ?? null,
        revoked_at: input.revokedAt ?? null,
        expires_at: input.expiresAt ?? null,
        source: input.source ?? null,
        captured_by: input.capturedById ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: "organization_id,project_id,client_id,consent_type" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return toClientConsent(data);
}

export async function upsertVendorPerformanceReviewInSupabase(
  organizationId: string,
  input: UpsertVendorPerformanceReviewInput,
): Promise<VendorPerformanceReview> {
  const { data, error } = await db()
    .from("vendor_performance_reviews")
    .upsert(
      {
        organization_id: organizationId,
        project_id: input.projectId,
        event_id: input.eventId,
        event_vendor_id: input.eventVendorId ?? null,
        vendor_id: input.vendorId,
        reviewer_id: input.reviewerId ?? null,
        overall_rating: input.overallRating ?? null,
        communication_rating: input.communicationRating ?? null,
        punctuality_rating: input.punctualityRating ?? null,
        quality_rating: input.qualityRating ?? null,
        budget_accuracy_rating: input.budgetAccuracyRating ?? null,
        professionalism_rating: input.professionalismRating ?? null,
        issue_count: input.issueCount ?? 0,
        would_use_again: input.wouldUseAgain ?? null,
        preferred_vendor_recommendation: input.preferredVendorRecommendation ?? null,
        operational_context: input.operationalContext ?? {},
        notes: input.notes ?? null,
      },
      { onConflict: "organization_id,event_vendor_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return toVendorPerformanceReview(data);
}

export async function upsertInternalRetrospectiveInSupabase(
  organizationId: string,
  input: UpsertInternalRetrospectiveInput,
): Promise<InternalRetrospective> {
  const { data, error } = await db()
    .from("internal_retrospectives")
    .upsert(
      {
        organization_id: organizationId,
        closeout_id: input.closeoutId ?? null,
        project_id: input.projectId,
        event_id: input.eventId,
        status: input.status,
        facilitator_id: input.facilitatorId ?? null,
        contributors: input.contributors ?? [],
        what_went_well: input.whatWentWell ?? null,
        what_did_not_go_well: input.whatDidNotGoWell ?? null,
        major_delays: input.majorDelays ?? null,
        client_request_changes: input.clientRequestChanges ?? null,
        vendor_issues: input.vendorIssues ?? null,
        team_issues: input.teamIssues ?? null,
        budget_lessons: input.budgetLessons ?? null,
        scheduling_lessons: input.schedulingLessons ?? null,
        venue_lessons: input.venueLessons ?? null,
        process_improvements: input.processImprovements ?? null,
        template_changes_recommended: input.templateChangesRecommended ?? null,
        reusable_ideas: input.reusableIdeas ?? null,
        risks_to_avoid: input.risksToAvoid ?? null,
        reviewed_at: input.reviewedAt ?? null,
        reviewed_by: input.reviewedById ?? null,
        ai_summary: input.aiSummary ?? null,
        ai_summary_generated_at: input.aiSummaryGeneratedAt ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: "organization_id,project_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return toInternalRetrospective(data);
}

export async function createCloseoutFinancialSnapshotInSupabase(
  organizationId: string,
  input: CreateCloseoutFinancialSnapshotInput,
): Promise<CloseoutFinancialSnapshot> {
  const { data, error } = await db()
    .from("closeout_financial_snapshots")
    .upsert(
      {
        organization_id: organizationId,
        closeout_id: input.closeoutId,
        project_id: input.projectId,
        event_id: input.eventId,
        version_number: input.versionNumber,
        contracted_revenue: input.contractedRevenue,
        invoiced_revenue: input.invoicedRevenue,
        collected_revenue: input.collectedRevenue,
        outstanding_client_balance: input.outstandingClientBalance,
        planned_cost: input.plannedCost,
        incurred_cost: input.incurredCost,
        paid_cost: input.paidCost,
        outstanding_vendor_balance: input.outstandingVendorBalance,
        forecast_profit: input.forecastProfit,
        final_operating_margin: input.finalOperatingMargin,
        cash_position: input.cashPosition,
        calculation_version: input.calculationVersion ?? "phase4-v1",
        generated_by: input.generatedById ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: "organization_id,closeout_id,version_number" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return toCloseoutFinancialSnapshot(data);
}

export async function createTimelineItemInSupabase(
  organizationId: string,
  input: CreateTimelineItemInput,
): Promise<TimelineItem> {
  const { data, error } = await db()
    .from("event_timeline_items")
    .insert({
      organization_id: organizationId,
      event_id: input.eventId,
      title: input.title,
      description: input.description,
      start_time: input.startTime,
      end_time: input.endTime || null,
      owner_id: input.ownerId ?? null,
      depends_on_item_id: input.dependsOnItemId ?? null,
      status: input.status,
      location: input.location || null,
      visibility: input.visibility,
      sort_order: input.sortOrder,
      planned_start_at: input.plannedStartAt ?? null,
      planned_end_at: input.plannedEndAt ?? null,
      actual_start_at: input.actualStartAt ?? null,
      actual_end_at: input.actualEndAt ?? null,
      checked_in_at: input.checkedInAt ?? null,
      completed_at: input.completedAt ?? null,
      completed_by: input.completedById ?? null,
      criticality: input.criticality ?? "Normal",
      delay_minutes: input.delayMinutes ?? 0,
      status_reason: input.statusReason ?? null,
      contingency_notes: input.contingencyNotes ?? null,
      event_day_notes: input.eventDayNotes ?? null,
      vendor_assignment_id: input.vendorAssignmentId ?? null,
      team_assignment_id: input.teamAssignmentId ?? null,
      version_number: input.versionNumber ?? 1,
      locked_at: input.lockedAt ?? null,
      pinned_current_at: input.pinnedCurrentAt ?? null,
      pinned_current_by: input.pinnedCurrentById ?? null,
      updated_by: input.updatedById ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toTimelineItem(data);
}

export async function updateTimelineItemInSupabase(
  itemId: string,
  input: UpdateTimelineItemInput,
): Promise<TimelineItem> {
  const { data, error } = await db()
    .from("event_timeline_items")
    .update({
      event_id: input.eventId,
      title: input.title,
      description: input.description,
      start_time: input.startTime,
      end_time: input.endTime || null,
      owner_id: input.ownerId ?? null,
      depends_on_item_id: input.dependsOnItemId ?? null,
      status: input.status,
      location: input.location || null,
      visibility: input.visibility,
      sort_order: input.sortOrder,
      planned_start_at: input.plannedStartAt ?? null,
      planned_end_at: input.plannedEndAt ?? null,
      actual_start_at: input.actualStartAt ?? null,
      actual_end_at: input.actualEndAt ?? null,
      checked_in_at: input.checkedInAt ?? null,
      completed_at: input.completedAt ?? null,
      completed_by: input.completedById ?? null,
      criticality: input.criticality ?? "Normal",
      delay_minutes: input.delayMinutes ?? 0,
      status_reason: input.statusReason ?? null,
      contingency_notes: input.contingencyNotes ?? null,
      event_day_notes: input.eventDayNotes ?? null,
      vendor_assignment_id: input.vendorAssignmentId ?? null,
      team_assignment_id: input.teamAssignmentId ?? null,
      version_number: input.versionNumber ?? 1,
      locked_at: input.lockedAt ?? null,
      pinned_current_at: input.pinnedCurrentAt ?? null,
      pinned_current_by: input.pinnedCurrentById ?? null,
      updated_by: input.updatedById ?? null,
    })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw error;
  return toTimelineItem(data);
}

export async function upsertEventDaySessionInSupabase(
  organizationId: string,
  input: UpsertEventDaySessionInput,
): Promise<EventDaySession> {
  const { data, error } = await db()
    .from("event_day_sessions")
    .upsert(
      {
        organization_id: organizationId,
        project_id: input.projectId ?? null,
        event_id: input.eventId,
        status: input.status,
        event_day_lead_id: input.eventDayLeadId ?? null,
        active_timeline_version_id: input.activeTimelineVersionId ?? null,
        activated_by: input.activatedById ?? null,
        activated_at: input.activatedAt ?? null,
        paused_at: input.pausedAt ?? null,
        completed_by: input.completedById ?? null,
        completed_at: input.completedAt ?? null,
        archived_at: input.archivedAt ?? null,
        unresolved_warnings: input.unresolvedWarnings ?? [],
        readiness_overrides: input.readinessOverrides ?? [],
        offline_manifest: input.offlineManifest ?? {},
        metadata: input.metadata ?? {},
      },
      { onConflict: "organization_id,event_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return toEventDaySession(data);
}

export async function createTimelineVersionInSupabase(
  organizationId: string,
  input: CreateTimelineVersionInput,
): Promise<TimelineVersion> {
  const { data, error } = await db()
    .from("timeline_versions")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      event_id: input.eventId,
      version_number: input.versionNumber,
      status: input.status,
      finalized_by: input.finalizedById ?? null,
      finalized_at: input.finalizedAt ?? null,
      change_reason: input.changeReason ?? null,
      snapshot: input.snapshot,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return toTimelineVersion(data);
}

export async function upsertEventDayVendorStatusInSupabase(
  organizationId: string,
  input: UpsertEventDayVendorStatusInput,
): Promise<EventDayVendorStatusRecord> {
  const { data, error } = await db()
    .from("event_day_vendor_statuses")
    .upsert(
      {
        organization_id: organizationId,
        project_id: input.projectId ?? null,
        event_id: input.eventId,
        event_vendor_id: input.eventVendorId,
        vendor_id: input.vendorId,
        status: input.status,
        arrival_time: input.arrivalTime ?? null,
        setup_window_start: input.setupWindowStart ?? null,
        setup_window_end: input.setupWindowEnd ?? null,
        service_start_at: input.serviceStartAt ?? null,
        breakdown_at: input.breakdownAt ?? null,
        assigned_location: input.assignedLocation ?? null,
        deliverables: input.deliverables ?? null,
        delay_minutes: input.delayMinutes ?? 0,
        issue_summary: input.issueSummary ?? null,
        checked_in_by: input.checkedInById ?? null,
        checked_in_at: input.checkedInAt ?? null,
        notes: input.notes ?? null,
        metadata: input.metadata ?? {},
      },
      { onConflict: "organization_id,event_vendor_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return toEventDayVendorStatus(data);
}

export async function createEventDayIssueInSupabase(
  organizationId: string,
  input: CreateEventDayIssueInput,
): Promise<EventDayIssue> {
  const { data, error } = await db()
    .from("event_day_issues")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId ?? null,
      event_id: input.eventId,
      timeline_item_id: input.timelineItemId ?? null,
      vendor_id: input.vendorId ?? null,
      reported_by: input.reportedById ?? null,
      assigned_to: input.assignedToId ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "Open",
      resolution: input.resolution ?? null,
      opened_at: input.openedAt ?? new Date().toISOString(),
      resolved_at: input.resolvedAt ?? null,
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (input.idempotencyKey && error.code === "23505") {
      const { data: existing, error: existingError } = await db()
        .from("event_day_issues")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      if (existingError) throw existingError;
      return toEventDayIssue(existing);
    }
    throw error;
  }
  return toEventDayIssue(data);
}

export async function updateEventDayIssueInSupabase(
  issueId: string,
  input: UpdateEventDayIssueInput,
): Promise<EventDayIssue> {
  const { data, error } = await db()
    .from("event_day_issues")
    .update({
      project_id: input.projectId ?? null,
      event_id: input.eventId,
      timeline_item_id: input.timelineItemId ?? null,
      vendor_id: input.vendorId ?? null,
      reported_by: input.reportedById ?? null,
      assigned_to: input.assignedToId ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      resolution: input.resolution ?? null,
      opened_at: input.openedAt ?? new Date().toISOString(),
      resolved_at: input.resolvedAt ?? null,
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotencyKey ?? null,
    })
    .eq("id", issueId)
    .select("*")
    .single();

  if (error) throw error;
  return toEventDayIssue(data);
}
