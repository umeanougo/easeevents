export type UserRole = "admin" | "planner" | "client" | "vendor";
export type ClientStatus = "Prospect" | "Active" | "Past" | "Archived";

export type LeadStage =
  | "New Inquiry"
  | "Consultation Scheduled"
  | "Consultation Completed"
  | "Proposal Draft"
  | "Proposal Sent"
  | "Changes Requested"
  | "Accepted"
  | "Booked"
  | "Lost";

export type EventStatus =
  | "Setup"
  | "Planning"
  | "Awaiting Client Approval"
  | "Confirmed"
  | "In Progress"
  | "Finalization"
  | "Event Day"
  | "Event Day Completed"
  | "Closeout In Progress"
  | "Awaiting Client Deliverables"
  | "Financial Reconciliation"
  | "Ready to Close"
  | "Closed"
  | "Reopened"
  | "Post-Event"
  | "Completed"
  | "Cancelled";

export type TaskStatus = "To Do" | "In Progress" | "Blocked" | "Done";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";
export type TaskNormalizedStatus =
  | "Not Started"
  | "Active"
  | "Waiting"
  | "Blocked"
  | "Completed"
  | "Cancelled";
export type TaskVisibility = "Internal" | "Client" | "Vendor";
export type TaskParticipantRole = "Assignee" | "Watcher" | "Mentioned";
export type TaskInboxStatus = "New" | "Triaged" | "Converted" | "Snoozed" | "Dismissed";

export type BudgetCategory =
  | "Decor"
  | "Venue"
  | "Catering"
  | "Rentals"
  | "Florals"
  | "Photography"
  | "Entertainment"
  | "Staffing"
  | "Transportation"
  | "Permits"
  | "Marketing"
  | "Software"
  | "Professional Services"
  | "Reimbursement"
  | "Miscellaneous";

export type PaymentStatus = "Not Paid" | "Deposit Paid" | "Partially Paid" | "Paid" | "Overdue";
export type ApprovalType = "Budget" | "Moodboard" | "Timeline" | "Proposal";
export type ApprovalStatus = "Pending" | "Approved" | "Changes Requested";
export type FileCategory =
  | "Contracts"
  | "Inspiration Images"
  | "Receipts"
  | "Vendor Quotes"
  | "Event Documents";

export type MessageVisibility = "Internal" | "Client" | "Vendor";
export type CommunicationChannel = "Email" | "Meeting" | "Phone";
export type IntegrationProvider = "google" | "microsoft" | "fathom";
export type ConnectedAccountStatus = "Connected" | "Expired" | "Action Required" | "Error";
export type CommunicationThreadStatus =
  | "Needs Reply"
  | "Scheduled"
  | "Waiting on Client"
  | "Closed";
export type CommunicationDirection = "Inbound" | "Outbound" | "Internal";
export type MeetingType = "Google Meet" | "Microsoft Teams" | "Phone" | "In Person";
export type MeetingStatus = "Scheduled" | "Completed" | "Cancelled";
export type MeetingSyncStatus = "Not Synced" | "Synced" | "Sync Failed" | "Retry Required";
export type TimelineItemStatus =
  | "Planned"
  | "Upcoming"
  | "Ready"
  | "In Progress"
  | "Delayed"
  | "Blocked"
  | "Complete"
  | "Completed"
  | "Skipped"
  | "Cancelled";
export type TimelineCriticality = "Normal" | "Important" | "Critical";
export type InvoiceType = "Deposit" | "Interim" | "Final" | "Custom";
export type InvoiceStatus = "Draft" | "Sent" | "Partially Paid" | "Paid" | "Overdue" | "Void";
export type ExpenseSource =
  | "Manual"
  | "Vendor Bill"
  | "Receipt"
  | "Reimbursement"
  | "Adjustment"
  | "Imported";
export type ExpenseStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Voided"
  | "Refunded";
export type ExpenseBookkeepingStatus = "Unreviewed" | "Reviewed" | "Exported" | "Reconciled";
export type ExpensePaymentStatus = "Pending" | "Completed" | "Failed" | "Refunded" | "Voided";
export type ExpensePaymentMethod =
  | "Card"
  | "Bank Transfer"
  | "ACH"
  | "Zelle"
  | "Cash"
  | "Check"
  | "Other";
export type ProposalStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Changes Requested"
  | "Accepted"
  | "Declined"
  | "Expired"
  | "Superseded"
  | "Cancelled";
export type ProposalResponseType = "Viewed" | "Accepted" | "Changes Requested" | "Declined";
export type ProposalPaymentType = "Deposit" | "Installment" | "Final" | "Custom";
export type ProposalAmountType = "Fixed" | "Percent";
export type ProposalDueRule = "On Acceptance" | "Fixed Date" | "Before Event" | "After Acceptance";
export type ProjectStage =
  | "Inquiry"
  | "Consultation"
  | "Proposal"
  | "Booked"
  | "Planning"
  | "Finalization"
  | "Event Day"
  | "Post-Event"
  | "Completed"
  | "Lost";
export type EventDaySessionStatus =
  | "Preview"
  | "Ready"
  | "Active"
  | "Paused"
  | "Completed"
  | "Archived";
export type EventDayVendorStatus =
  | "Not Confirmed"
  | "Confirmed"
  | "En Route"
  | "Arrived"
  | "Setting Up"
  | "Ready"
  | "Active"
  | "Completed"
  | "Delayed"
  | "Issue";
export type EventDayIssueType =
  | "Timing"
  | "Vendor"
  | "Client Request"
  | "Venue"
  | "Equipment"
  | "Staffing"
  | "Guest Experience"
  | "Logistics"
  | "Other";
export type EventDayIssueSeverity = "Informational" | "Attention Needed" | "Urgent" | "Critical";
export type EventDayIssueStatus = "Open" | "Investigating" | "Waiting" | "Resolved" | "Closed";
export type TimelineVersionStatus = "Draft" | "Finalized" | "Superseded";
export type EmailTemplateType =
  | "inquiry_acknowledgment"
  | "consultation_follow_up"
  | "proposal_sent"
  | "booking_confirmation"
  | "payment_reminder"
  | "feedback_request"
  | "review_request"
  | "deliverable_notification"
  | "retention_check_in"
  | "anniversary_acknowledgment"
  | "rebooking_follow_up"
  | "referral_thank_you"
  | "general";
export type ProjectActivityType =
  | "system"
  | "email"
  | "call"
  | "note"
  | "meeting"
  | "file"
  | "task"
  | "status";

export type ClientRelationshipStatus =
  | "Active Project"
  | "Recent Client"
  | "Retention Follow-Up"
  | "Rebooking Opportunity"
  | "Repeat Client"
  | "Referral Partner"
  | "Dormant"
  | "Do Not Market"
  | "Archived";
export type RelationshipCommunicationPreference =
  | "Allowed"
  | "Personal Only"
  | "Manual Review"
  | "Do Not Market"
  | "Unsubscribed";
export type RebookingOpportunityType =
  | "Anniversary"
  | "Birthday"
  | "Wedding-Related Milestone"
  | "Corporate Recurring Event"
  | "Seasonal Event"
  | "Referral Follow-Up"
  | "Planner Recommendation"
  | "Client-Requested Follow-Up"
  | "Repeat Event"
  | "Other";
export type RebookingOpportunityStage =
  | "Identified"
  | "Review Required"
  | "Planned Follow-Up"
  | "Ready to Contact"
  | "Contacted"
  | "Engaged"
  | "Consultation Scheduled"
  | "Qualified"
  | "Converted"
  | "Snoozed"
  | "Not Interested"
  | "Do Not Contact"
  | "Closed";
export type ClientMilestoneType =
  | "Event Anniversary"
  | "Birthday"
  | "Corporate Annual Event"
  | "Holiday Event"
  | "Launch Anniversary"
  | "Graduation Window"
  | "Renewal Date"
  | "Custom";
export type MilestoneSensitivity = "Standard" | "Private" | "Sensitive";
export type ReferralStatus =
  | "Submitted"
  | "Review Required"
  | "Introduction Pending"
  | "Contact Permitted"
  | "Contacted"
  | "Qualified"
  | "Converted"
  | "Not Interested"
  | "Invalid"
  | "Duplicate"
  | "Closed";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  logoUrl?: string;
  emailSenderName?: string;
  emailSignature?: string;
}

export interface AppUser {
  id: string;
  organizationId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
}

export interface ClientRecord {
  id: string;
  organizationId: string;
  userId?: string;
  displayName: string;
  email: string;
  phone?: string;
  companyName?: string;
  status: ClientStatus;
  source?: string;
  notes?: string;
  lifetimeValue: number;
  lastContactedAt?: string;
  relationshipStatus?: ClientRelationshipStatus;
  relationshipOwnerId?: string;
  preferredContactChannel?: string;
  futureEventCommunicationPreference?: RelationshipCommunicationPreference;
  marketingUnsubscribedAt?: string;
  relationshipScore?: number;
  firstInquiryAt?: string;
  lastEventAt?: string;
  nextRelationshipAction?: string;
  nextRelationshipActionAt?: string;
  relationshipNotes?: string;
  relationshipMetadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UpdateClientDetailsInput {
  displayName: string;
  email: string;
  phone?: string;
  companyName?: string;
  preferredContactChannel?: string;
  relationshipOwnerId?: string;
  notes?: string;
}

export interface ProjectRecord {
  id: string;
  organizationId: string;
  leadId?: string;
  eventId?: string;
  clientId?: string;
  ownerId?: string;
  name: string;
  stage: ProjectStage;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  projectId?: string;
  clientId?: string;
  ownerId?: string;
  stage: LeadStage;
  clientNameSnapshot?: string;
  /** @deprecated Use clients.displayName for identity and clientNameSnapshot for historical fallback. */
  clientName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  estimatedGuestCount: number;
  budgetRange: string;
  notes: string;
  source: string;
  convertedEventId?: string;
  createdAt: string;
}

export interface EventRecord {
  id: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  clientId?: string;
  clientUserId?: string;
  plannerId?: string;
  clientNameSnapshot?: string;
  /** @deprecated Use clients.displayName for identity and clientNameSnapshot for historical fallback. */
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  guestCount: number;
  status: EventStatus;
  clientPrice: number;
  internalNotes: string;
  timelineNotes: string;
  createdAt: string;
}

export interface UpdateEventDetailsInput {
  eventName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  guestCount: number;
  status: EventStatus;
  plannerId?: string;
  internalNotes: string;
  timelineNotes: string;
}

export interface EventTeamMember {
  id: string;
  organizationId: string;
  eventId: string;
  userId: string;
  roleLabel: string;
  eventDayRole?: string;
  eventDayStatus?: string;
  onSiteAt?: string;
  unavailableAt?: string;
  eventDayNotes?: string;
  createdAt: string;
}

export interface TaskChecklistItem {
  id: string;
  organizationId: string;
  taskId: string;
  checklistId?: string;
  title: string;
  isComplete: boolean;
  assigneeId?: string;
  dueAt?: string;
  notes?: string;
  sortOrder?: number;
  completedAt?: string;
  completedById?: string;
  convertedTaskId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskChecklist {
  id: string;
  organizationId: string;
  taskId: string;
  title: string;
  sortOrder: number;
  createdById?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  eventId?: string;
  ownerId?: string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  checklist: TaskChecklistItem[];
  links?: TaskLink[];
  attachments?: TaskAttachment[];
  workType?: "project" | "internal" | "inbox";
  workflowColumnId?: string;
  normalizedStatus?: TaskNormalizedStatus;
  position?: number;
  startAt?: string;
  dueAt?: string;
  completedAt?: string;
  archivedAt?: string;
  archivedById?: string;
  visibility?: TaskVisibility;
  cardCoverFileId?: string;
  estimatedEffortMinutes?: number;
  actualEffortMinutes?: number;
  sourceType?: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  lastActivityAt?: string;
  createdById?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  labels?: TaskLabel[];
  participants?: TaskParticipant[];
  checklists?: TaskChecklist[];
}

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  serviceCategory: BudgetCategory;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  notes: string;
  rating: number;
}

export interface EventVendor {
  id: string;
  organizationId: string;
  eventId: string;
  vendorId: string;
  serviceCategory: BudgetCategory;
  quotedAmount: number;
  actualAmount: number;
  paymentStatus: PaymentStatus;
  notes: string;
}

export interface BudgetItem {
  id: string;
  organizationId: string;
  eventId: string;
  category: BudgetCategory;
  description: string;
  plannedAmount: number;
  actualAmount: number;
  vendorId?: string;
  paidAmount: number;
  dueDate: string;
  marginEstimate: number;
}

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  projectId?: string;
  eventId?: string;
  clientId?: string;
  proposalId?: string;
  proposalVersionId?: string;
  proposalPaymentTermId?: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  amount: number;
  paidAmount: number;
  balanceDue: number;
  dueDate: string;
  status: InvoiceStatus;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationBookingSettings {
  id: string;
  organizationId: string;
  requireProposalAcceptance: boolean;
  requireTermsAcceptance: boolean;
  requireDepositInvoiceIssued: boolean;
  requireDepositPaid: boolean;
  requireManualPlannerApproval: boolean;
  proposalExpirationDays: number;
  acceptanceStatement: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalRecord {
  id: string;
  organizationId: string;
  projectId: string;
  leadId?: string;
  eventId?: string;
  clientId?: string;
  proposalNumber: string;
  title: string;
  status: ProposalStatus;
  currency: string;
  currentVersionNumber: number;
  currentVersionId?: string;
  validUntil?: string;
  acceptedAt?: string;
  declinedAt?: string;
  sentAt?: string;
  viewedAt?: string;
  createdById?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalVersion {
  id: string;
  organizationId: string;
  proposalId: string;
  versionNumber: number;
  introduction?: string;
  scope?: string;
  terms?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  snapshot: Record<string, unknown>;
  documentHash?: string;
  immutableAt?: string;
  createdById?: string;
  createdAt: string;
}

export interface ProposalLineItem {
  id: string;
  organizationId: string;
  proposalVersionId: string;
  category?: BudgetCategory;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate?: number;
  totalAmount: number;
  isOptional: boolean;
  isSelected: boolean;
  clientVisible: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalPaymentTerm {
  id: string;
  organizationId: string;
  proposalVersionId: string;
  label: string;
  paymentType: ProposalPaymentType;
  amountType: ProposalAmountType;
  amountValue: number;
  calculatedAmount: number;
  dueRule: ProposalDueRule;
  dueDate?: string;
  dueOffsetDays?: number;
  requiredForBooking: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalResponse {
  id: string;
  organizationId: string;
  proposalId: string;
  proposalVersionId: string;
  projectId: string;
  clientId?: string;
  responseType: ProposalResponseType;
  comment?: string;
  responderName?: string;
  responderEmail?: string;
  respondedAt: string;
  ipMetadata: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProposalFile {
  id: string;
  organizationId: string;
  proposalId: string;
  proposalVersionId?: string;
  fileId: string;
  visibility: MessageVisibility;
  sortOrder: number;
  createdById?: string;
  createdAt: string;
}

export interface InvoicePaymentRecord {
  id: string;
  organizationId: string;
  invoiceId: string;
  projectId?: string;
  eventId?: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  reference?: string;
  note?: string;
  recordedById?: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OrganizationFinanceSettings {
  id: string;
  organizationId: string;
  defaultCurrency: string;
  fiscalYearStartMonth: number;
  requireExpenseApproval: boolean;
  defaultMarginTargetPercent: number;
  receiptRequiredThreshold: number;
  enabledPaymentMethods: ExpensePaymentMethod[];
  taxDisplayPreference: string;
  clientFinancialVisibility: string;
  defaultReportDateBasis: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  organizationId: string;
  projectId: string;
  eventId?: string;
  vendorId?: string;
  budgetItemId?: string;
  createdById?: string;
  approvedById?: string;
  expenseNumber?: string;
  description: string;
  category: BudgetCategory;
  source: ExpenseSource;
  status: ExpenseStatus;
  currency: string;
  subtotal: number;
  taxAmount: number;
  serviceFeeAmount: number;
  tipAmount: number;
  totalAmount: number;
  expenseDate: string;
  dueDate?: string;
  approvedAt?: string;
  voidedAt?: string;
  notes?: string;
  paymentReference?: string;
  clientBillable: boolean;
  reimbursable: boolean;
  bookkeepingStatus: ExpenseBookkeepingStatus;
  metadata: Record<string, unknown>;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePaymentRecord {
  id: string;
  organizationId: string;
  expenseId: string;
  amount: number;
  currency: string;
  paymentMethod: ExpensePaymentMethod | string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  recordedById?: string;
  status: ExpensePaymentStatus;
  metadata: Record<string, unknown>;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFileRecord {
  id: string;
  organizationId: string;
  expenseId: string;
  fileId: string;
  visibility: MessageVisibility;
  caption?: string;
  createdById?: string;
  createdAt: string;
}

export interface ProjectBookingApproval {
  id: string;
  organizationId: string;
  projectId: string;
  approvedById?: string;
  approvedAt: string;
  note?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Approval {
  id: string;
  organizationId: string;
  eventId: string;
  type: ApprovalType;
  title: string;
  description: string;
  status: ApprovalStatus;
  dueDate: string;
  respondedAt?: string;
}

export interface EventFile {
  id: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  eventId: string;
  uploadedById?: string;
  name: string;
  category: FileCategory;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  visibility?: MessageVisibility;
  originalFilename?: string;
  caption?: string;
  createdAt: string;
}

export interface CommentMessage {
  id: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  eventId?: string;
  taskId?: string;
  parentCommentId?: string;
  authorId?: string;
  body: string;
  visibility: MessageVisibility;
  mentions?: string[];
  editedAt?: string;
  isDeleted?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ConnectedAccount {
  id: string;
  organizationId: string;
  userId: string;
  provider: IntegrationProvider;
  status: ConnectedAccountStatus;
  providerAccountId: string;
  providerAccountEmail: string;
  providerAccountName?: string;
  scopes: string[];
  calendarId?: string;
  lastMailSyncedAt?: string;
  lastCalendarSyncedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEntrySourceType =
  | "event"
  | "meeting"
  | "timeline"
  | "task"
  | "approval"
  | "proposal"
  | "invoice"
  | "expense"
  | "reminder"
  | "external";

export type CalendarEntryCategory =
  | "Event"
  | "Consultation"
  | "Client meeting"
  | "Internal meeting"
  | "Task deadline"
  | "Approval deadline"
  | "Proposal expiration"
  | "Invoice deadline"
  | "Expense deadline"
  | "Run of show"
  | "Reminder"
  | "External-only";

export type CalendarEntryVisibility = "Internal" | "Client" | "Vendor" | "Public";
export type CalendarSyncRunStatus = "Started" | "Completed" | "Failed";
export type CalendarConflictSeverity = "Hard Conflict" | "Warning" | "Info";

export interface CalendarEntry {
  id: string;
  organizationId: string;
  sourceType: CalendarEntrySourceType;
  sourceId: string;
  projectId?: string;
  leadId?: string;
  eventId?: string;
  clientId?: string;
  ownerId?: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  status: string;
  category: CalendarEntryCategory;
  visibility: CalendarEntryVisibility;
  location?: string;
  meetingUrl?: string;
  externalProvider?: IntegrationProvider;
  externalEventId?: string;
  syncStatus?: string;
  isEditable: boolean;
  isRecurring: boolean;
  href?: string;
  metadata: Record<string, unknown>;
}

export interface CalendarSyncState {
  id: string;
  organizationId: string;
  connectedAccountId?: string;
  provider: IntegrationProvider;
  calendarId: string;
  syncWindowStart?: string;
  syncWindowEnd?: string;
  lastSuccessfulSyncAt?: string;
  lastAttemptedSyncAt?: string;
  lastError?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalCalendarEvent {
  id: string;
  organizationId: string;
  connectedAccountId?: string;
  provider: IntegrationProvider;
  calendarId: string;
  externalEventId: string;
  iCalUid?: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  status: string;
  location?: string;
  meetingUrl?: string;
  attendees: string[];
  recurrence: Record<string, unknown>;
  providerUpdatedAt?: string;
  deletedAt?: string;
  rawProviderPayload: Record<string, unknown>;
  syncStatus: string;
  conflictStatus: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulingPreference {
  id: string;
  organizationId: string;
  userId?: string;
  timezone: string;
  workingDays: number[];
  workdayStart: string;
  workdayEnd: string;
  defaultMeetingDurationMinutes: number;
  minimumNoticeMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  preferredMeetingProvider?: IntegrationProvider;
  defaultConnectedAccountId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityBlock {
  id: string;
  organizationId: string;
  userId?: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  reason?: string;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarConflict {
  id: string;
  organizationId: string;
  projectId?: string;
  eventId?: string;
  ownerId?: string;
  entryASourceType: CalendarEntrySourceType | string;
  entryASourceId: string;
  entryBSourceType: CalendarEntrySourceType | string;
  entryBSourceId: string;
  severity: CalendarConflictSeverity;
  status: string;
  overrideReason?: string;
  detectedAt: string;
  resolvedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarSyncRun {
  id: string;
  organizationId: string;
  connectedAccountId?: string;
  provider: IntegrationProvider;
  status: CalendarSyncRunStatus;
  startedAt: string;
  completedAt?: string;
  importedCount: number;
  updatedCount: number;
  deletedCount: number;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationThread {
  id: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  eventId: string;
  assignedToId?: string;
  subject: string;
  clientNameSnapshot?: string;
  /** @deprecated Use event.clientId -> clients.displayName for identity and clientNameSnapshot for fallback. */
  clientName: string;
  participants: string[];
  channel: CommunicationChannel;
  status: CommunicationThreadStatus;
  integrationSource?: string;
  externalProvider?: IntegrationProvider;
  externalThreadId?: string;
  syncedAt?: string;
  preview: string;
  unreadCount: number;
  lastActivityAt: string;
}

export interface CommunicationMessage {
  id: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  threadId: string;
  eventId: string;
  authorId?: string;
  direction: CommunicationDirection;
  body: string;
  summary?: string;
  visibility: MessageVisibility;
  externalProvider?: IntegrationProvider;
  externalMessageId?: string;
  syncedAt?: string;
  deliveryStatus?: string;
  deliveryMode?: "disabled" | "test" | "live";
  deliveryError?: string;
  metadata?: Record<string, unknown>;
  sentAt: string;
}

export interface MeetingActionItem {
  id: string;
  title: string;
  ownerId?: string;
  dueDate?: string;
  taskId?: string;
  isComplete: boolean;
}

export interface MeetingRecord {
  id: string;
  organizationId: string;
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
  externalProvider?: IntegrationProvider;
  externalCalendarId?: string;
  externalEventId?: string;
  externalConferenceUrl?: string;
  syncedAt?: string;
  timezone?: string;
  syncStatus?: MeetingSyncStatus | string;
  syncError?: string;
  providerUpdatedAt?: string;
  fathomExpected?: boolean;
  idempotencyKey?: string;
  attendees: string[];
  agenda: string;
  link?: string;
  transcript: string;
  internalSummary: string;
  clientSummary: string;
  notes: string;
  actionItems: MeetingActionItem[];
  createdAt: string;
}

export interface ProjectInspirationLink {
  id: string;
  organizationId: string;
  projectId: string;
  leadId?: string;
  eventId?: string;
  label?: string;
  url: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLink {
  id: string;
  organizationId: string;
  taskId: string;
  label: string;
  url: string;
  createdById?: string;
  createdAt: string;
}

export interface TaskWorkflowColumn {
  id: string;
  organizationId: string;
  projectId?: string;
  name: string;
  normalizedStatus: TaskNormalizedStatus;
  mappedTaskStatus: TaskStatus;
  sortOrder: number;
  wipLimit?: number;
  isDefault: boolean;
  isArchived: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLabel {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLabelAssignment {
  id: string;
  organizationId: string;
  taskId: string;
  labelId: string;
  createdById?: string;
  createdAt: string;
}

export interface TaskParticipant {
  id: string;
  organizationId: string;
  taskId: string;
  userId: string;
  participantRole: TaskParticipantRole;
  addedById?: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  organizationId: string;
  taskId: string;
  fileId?: string;
  label?: string;
  createdById?: string;
  createdAt: string;
}

export interface TaskSavedView {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  scope: "private" | "team" | "organization";
  viewType: "board" | "table" | "calendar" | "timeline" | "workload";
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInboxItem {
  id: string;
  organizationId: string;
  projectId?: string;
  eventId?: string;
  sourceType: string;
  sourceTable?: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  capturedById?: string;
  capturedAt: string;
  rawContent?: string;
  summary?: string;
  suggestedProjectId?: string;
  suggestedTitle?: string;
  suggestedOwnerId?: string;
  suggestedDueAt?: string;
  suggestedStatus: TaskStatus;
  status: TaskInboxStatus;
  convertedTaskId?: string;
  snoozedUntil?: string;
  dismissedAt?: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  organizationId: string;
  name: string;
  templateType: EmailTemplateType;
  subject: string;
  body: string;
  isActive: boolean;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectActivityEvent {
  id: string;
  organizationId: string;
  projectId: string;
  actorId?: string;
  activityType: ProjectActivityType;
  title: string;
  body?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectReminder {
  id: string;
  organizationId: string;
  projectId: string;
  assignedToId?: string;
  title: string;
  dueAt?: string;
  status: "Open" | "Done" | "Dismissed";
  automationSource?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type PostEventCloseoutStatus =
  | "Event Day Completed"
  | "Closeout In Progress"
  | "Awaiting Client Deliverables"
  | "Financial Reconciliation"
  | "Ready to Close"
  | "Closed"
  | "Reopened"
  | "Cancelled";
export type CloseoutReadinessStatus =
  | "Not Started"
  | "In Progress"
  | "Blocked"
  | "Ready"
  | "Complete"
  | "Deferred"
  | "Overridden";
export type CloseoutRequirementLevel = "Required" | "Recommended" | "Informational";
export type CloseoutDeliverableStatus =
  | "Draft"
  | "Awaiting Upload"
  | "Ready"
  | "Delivered"
  | "Viewed"
  | "Acknowledged"
  | "Replaced"
  | "Expired";
export type ClientConsentType =
  | "Service Feedback"
  | "Public Review"
  | "Testimonial"
  | "Photo/Video Portfolio"
  | "Marketing Communication";
export type ClientConsentStatus =
  | "Not Requested"
  | "Requested"
  | "Granted"
  | "Declined"
  | "Revoked"
  | "Expired";

export interface OrganizationCloseoutSettings {
  id: string;
  organizationId: string;
  closeoutDueDays: number;
  requireVendorReviews: boolean;
  requireInternalRetrospective: boolean;
  requireFeedbackRequest: boolean;
  requireFinancialReview: boolean;
  publicReviewLink?: string;
  publicReviewRequestsEnabled: boolean;
  defaultRetentionPolicy: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PostEventCloseout {
  id: string;
  organizationId: string;
  projectId: string;
  eventId: string;
  status: PostEventCloseoutStatus;
  ownerId?: string;
  eventCompletedAt?: string;
  closeoutStartedAt?: string;
  readyToCloseAt?: string;
  closedAt?: string;
  closedById?: string;
  reopenedAt?: string;
  reopenedById?: string;
  reopenReason?: string;
  completionPercentage: number;
  unresolvedIssueCount: number;
  financialStatus: CloseoutReadinessStatus;
  deliverableStatus: CloseoutReadinessStatus;
  feedbackStatus: CloseoutReadinessStatus;
  vendorReviewStatus: CloseoutReadinessStatus;
  internalReviewStatus: CloseoutReadinessStatus;
  retentionStatus: CloseoutReadinessStatus;
  finalNotes?: string;
  retentionHandoff: Record<string, unknown>;
  readinessOverrides: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PostEventCloseoutItem {
  id: string;
  organizationId: string;
  closeoutId: string;
  projectId: string;
  eventId: string;
  groupName: string;
  title: string;
  requirementLevel: CloseoutRequirementLevel;
  status: CloseoutReadinessStatus;
  ownerId?: string;
  dueDate?: string;
  completedAt?: string;
  completedById?: string;
  notes?: string;
  linkedTaskId?: string;
  linkedFileId?: string;
  linkedInvoiceId?: string;
  linkedExpenseId?: string;
  overrideReason?: string;
  sortOrder: number;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FinalDeliverable {
  id: string;
  organizationId: string;
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
  viewedAt?: string;
  acknowledgedAt?: string;
  expiresAt?: string;
  accessState: string;
  sortOrder: number;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFeedbackResponse {
  id: string;
  organizationId: string;
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
  permissionToContact: boolean;
  concernLevel: "None" | "Low" | "Medium" | "High";
  serviceRecoveryStatus: "Not Required" | "Open" | "In Review" | "Resolved";
  submittedAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientConsent {
  id: string;
  organizationId: string;
  projectId?: string;
  eventId?: string;
  clientId?: string;
  consentType: ClientConsentType;
  status: ClientConsentStatus;
  consentWordingVersion: string;
  requestedAt?: string;
  grantedAt?: string;
  declinedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  source?: string;
  capturedById?: string;
  evidenceFileId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPerformanceReview {
  id: string;
  organizationId: string;
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
  issueCount: number;
  wouldUseAgain?: boolean;
  preferredVendorRecommendation?: string;
  operationalContext: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InternalRetrospective {
  id: string;
  organizationId: string;
  closeoutId?: string;
  projectId: string;
  eventId: string;
  status: CloseoutReadinessStatus;
  facilitatorId?: string;
  contributors: Record<string, unknown>[];
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
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CloseoutFinancialSnapshot {
  id: string;
  organizationId: string;
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
  calculationVersion: string;
  generatedById?: string;
  generatedAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OrganizationRetentionSettings {
  id: string;
  organizationId: string;
  jurisdictionProfile: string;
  promotionalOutreachEnabled: boolean;
  expressConsentRequired: boolean;
  impliedConsentTrackingEnabled: boolean;
  consentReviewDays: number;
  referralOutreachPolicy: "disabled" | "review_required" | "client_initiated_only";
  quietHours: Record<string, unknown>;
  defaultExecutionMode: "automatic" | "approval_required" | "draft_only";
  defaultRetentionDays: number;
  manualComplianceReview: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientMilestone {
  id: string;
  organizationId: string;
  clientId: string;
  sourceProjectId?: string;
  milestoneType: ClientMilestoneType;
  title: string;
  milestoneDate?: string;
  month?: number;
  day?: number;
  recurrenceRule?: string;
  reminderOffsetDays: number;
  nextOccurrenceDate?: string;
  sensitivity: MilestoneSensitivity;
  source: string;
  consentOrPurposeReferenceId?: string;
  isActive: boolean;
  notes?: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RebookingOpportunity {
  id: string;
  organizationId: string;
  clientId: string;
  sourceProjectId?: string;
  sourceEventId?: string;
  sourceMilestoneId?: string;
  sourceReferralId?: string;
  assignedToId?: string;
  opportunityType: RebookingOpportunityType;
  title: string;
  description?: string;
  stage: RebookingOpportunityStage;
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
  metadata: Record<string, unknown>;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientReferralLink {
  id: string;
  organizationId: string;
  clientId: string;
  projectId?: string;
  referralCode: string;
  sourceCampaign?: string;
  expiresAt?: string;
  isActive: boolean;
  createdById?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralRecord {
  id: string;
  organizationId: string;
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
  status: ReferralStatus;
  introductionMethod?: string;
  consentOrContactBasis?: string;
  firstContactAt?: string;
  convertedAt?: string;
  convertedProjectId?: string;
  rewardStatus:
    | "Not Eligible"
    | "Pending Review"
    | "Eligible"
    | "Approved"
    | "Fulfilled"
    | "Declined";
  rewardDescription?: string;
  notes?: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationEligibilityLog {
  id: string;
  organizationId: string;
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
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type WorkflowAutomationStatus = "Inactive" | "Active" | "Paused" | "Archived";
export type WorkflowExecutionStatus =
  | "Queued"
  | "Awaiting Approval"
  | "Running"
  | "Completed"
  | "Failed"
  | "Skipped"
  | "Cancelled";
export type WorkflowActionRunStatus = WorkflowExecutionStatus;
export type WorkflowEventStatus = "Pending" | "Processed" | "Failed" | "Ignored";
export type NotificationStatus = "Unread" | "Read" | "Dismissed" | "Archived";
export type NotificationSeverity = "Info" | "Success" | "Warning" | "Critical";

export interface WorkflowAutomation {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  triggerType: string;
  status: WorkflowAutomationStatus;
  conditions: Record<string, unknown>[];
  approvalPolicy: "automatic" | "approval_required" | "draft_only";
  quietHours: Record<string, unknown>;
  cooldownMinutes: number;
  priority: number;
  lastTriggeredAt?: string;
  createdById?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowAutomationAction {
  id: string;
  organizationId: string;
  automationId: string;
  actionType: string;
  name: string;
  config: Record<string, unknown>;
  requiresApproval: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowEvent {
  id: string;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  eventId?: string;
  sourceTable?: string;
  sourceRecordId?: string;
  eventType: string;
  status: WorkflowEventStatus;
  payload: Record<string, unknown>;
  dedupeKey: string;
  occurredAt: string;
  processedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  organizationId: string;
  automationId?: string;
  workflowEventId?: string;
  projectId?: string;
  eventId?: string;
  status: WorkflowExecutionStatus;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount: number;
  nextRetryAt?: string;
  errorMessage?: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowActionRun {
  id: string;
  organizationId: string;
  executionId: string;
  automationActionId?: string;
  actionType: string;
  status: WorkflowActionRunStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  output: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  organizationId: string;
  recipientUserId?: string;
  projectId?: string;
  eventId?: string;
  workflowExecutionId?: string;
  notificationType: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  title: string;
  body?: string;
  href?: string;
  channel: "in_app" | "email" | "sms" | "push";
  actionRequired: boolean;
  dueAt?: string;
  readAt?: string;
  dismissedAt?: string;
  dedupeKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  organizationId: string;
  userId: string;
  notificationType: string;
  channel: "in_app" | "email" | "sms" | "push";
  isEnabled: boolean;
  quietHours: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineItem {
  id: string;
  organizationId: string;
  eventId: string;
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  ownerId?: string;
  dependsOnItemId?: string;
  status: TimelineItemStatus;
  location?: string;
  visibility: MessageVisibility;
  sortOrder: number;
  plannedStartAt?: string;
  plannedEndAt?: string;
  actualStartAt?: string;
  actualEndAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  completedById?: string;
  criticality?: TimelineCriticality;
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
  createdAt: string;
}

export interface TimelineVersion {
  id: string;
  organizationId: string;
  projectId?: string;
  eventId: string;
  versionNumber: number;
  status: TimelineVersionStatus;
  finalizedById?: string;
  finalizedAt?: string;
  changeReason?: string;
  snapshot: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EventDaySession {
  id: string;
  organizationId: string;
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
  unresolvedWarnings: Record<string, unknown>[];
  readinessOverrides: Record<string, unknown>[];
  offlineManifest: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EventDayVendorStatusRecord {
  id: string;
  organizationId: string;
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
  delayMinutes: number;
  issueSummary?: string;
  checkedInById?: string;
  checkedInAt?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EventDayIssue {
  id: string;
  organizationId: string;
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
  status: EventDayIssueStatus;
  resolution?: string;
  openedAt: string;
  resolvedAt?: string;
  metadata: Record<string, unknown>;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventTemplate {
  id: string;
  organizationId: string;
  name: string;
  eventType: string;
  description: string;
  defaultGuestCount: number;
  defaultClientPrice: number;
  timelineNotes: string;
  internalNotes: string;
  isActive: boolean;
  createdAt: string;
}

export interface TaskTemplate {
  id: string;
  organizationId: string;
  eventTemplateId?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueOffsetDays: number;
  checklistItems: string[];
  sortOrder: number;
}

export interface BudgetTemplate {
  id: string;
  organizationId: string;
  eventTemplateId?: string;
  category: BudgetCategory;
  description: string;
  plannedAmount: number;
  marginEstimate: number;
  dueOffsetDays: number;
  sortOrder: number;
}

export interface ApprovalTemplate {
  id: string;
  organizationId: string;
  eventTemplateId?: string;
  type: ApprovalType;
  title: string;
  description: string;
  dueOffsetDays: number;
  sortOrder: number;
}

export interface VendorTemplate {
  id: string;
  organizationId: string;
  eventTemplateId?: string;
  serviceCategory: BudgetCategory;
  preferredVendorId?: string;
  notes: string;
  sortOrder: number;
}

export interface EaseEventsData {
  organization: Organization;
  users: AppUser[];
  clients: ClientRecord[];
  projects: ProjectRecord[];
  connectedAccounts: ConnectedAccount[];
  calendarSyncStates: CalendarSyncState[];
  externalCalendarEvents: ExternalCalendarEvent[];
  schedulingPreferences: SchedulingPreference[];
  availabilityBlocks: AvailabilityBlock[];
  calendarConflicts: CalendarConflict[];
  calendarSyncRuns: CalendarSyncRun[];
  leads: Lead[];
  events: EventRecord[];
  eventTeamMembers: EventTeamMember[];
  tasks: TaskRecord[];
  taskWorkflowColumns: TaskWorkflowColumn[];
  taskLabels: TaskLabel[];
  taskLabelAssignments: TaskLabelAssignment[];
  taskParticipants: TaskParticipant[];
  taskChecklists: TaskChecklist[];
  vendors: Vendor[];
  eventVendors: EventVendor[];
  budgetItems: BudgetItem[];
  invoices: InvoiceRecord[];
  invoicePayments: InvoicePaymentRecord[];
  financeSettings: OrganizationFinanceSettings[];
  expenses: ExpenseRecord[];
  expensePayments: ExpensePaymentRecord[];
  expenseFiles: ExpenseFileRecord[];
  bookingSettings: OrganizationBookingSettings[];
  proposals: ProposalRecord[];
  proposalVersions: ProposalVersion[];
  proposalLineItems: ProposalLineItem[];
  proposalPaymentTerms: ProposalPaymentTerm[];
  proposalResponses: ProposalResponse[];
  proposalFiles: ProposalFile[];
  projectBookingApprovals: ProjectBookingApproval[];
  approvals: Approval[];
  files: EventFile[];
  comments: CommentMessage[];
  communicationThreads: CommunicationThread[];
  communicationMessages: CommunicationMessage[];
  meetings: MeetingRecord[];
  projectInspirationLinks: ProjectInspirationLink[];
  taskLinks: TaskLink[];
  taskAttachments: TaskAttachment[];
  taskSavedViews: TaskSavedView[];
  taskInboxItems: TaskInboxItem[];
  emailTemplates: EmailTemplate[];
  projectActivityEvents: ProjectActivityEvent[];
  projectReminders: ProjectReminder[];
  workflowAutomations: WorkflowAutomation[];
  workflowAutomationActions: WorkflowAutomationAction[];
  workflowEvents: WorkflowEvent[];
  workflowExecutions: WorkflowExecution[];
  workflowActionRuns: WorkflowActionRun[];
  notifications: NotificationRecord[];
  notificationPreferences: NotificationPreference[];
  closeoutSettings: OrganizationCloseoutSettings[];
  postEventCloseouts: PostEventCloseout[];
  postEventCloseoutItems: PostEventCloseoutItem[];
  finalDeliverables: FinalDeliverable[];
  clientFeedbackResponses: ClientFeedbackResponse[];
  clientConsents: ClientConsent[];
  vendorPerformanceReviews: VendorPerformanceReview[];
  internalRetrospectives: InternalRetrospective[];
  closeoutFinancialSnapshots: CloseoutFinancialSnapshot[];
  retentionSettings: OrganizationRetentionSettings[];
  clientMilestones: ClientMilestone[];
  rebookingOpportunities: RebookingOpportunity[];
  clientReferralLinks: ClientReferralLink[];
  referrals: ReferralRecord[];
  communicationEligibilityLogs: CommunicationEligibilityLog[];
  timelineItems: TimelineItem[];
  timelineVersions: TimelineVersion[];
  eventDaySessions: EventDaySession[];
  eventDayVendorStatuses: EventDayVendorStatusRecord[];
  eventDayIssues: EventDayIssue[];
  eventTemplates: EventTemplate[];
  taskTemplates: TaskTemplate[];
  budgetTemplates: BudgetTemplate[];
  approvalTemplates: ApprovalTemplate[];
  vendorTemplates: VendorTemplate[];
}

export interface BudgetSummary {
  totalPlannedBudget: number;
  totalActualCost: number;
  totalPaid: number;
  totalBalanceDue: number;
  clientPrice: number;
  hasClientPrice: boolean;
  estimatedProfit: number;
  profitMarginPercentage: number;
}

export interface ProjectFinanceSummary {
  projectId?: string;
  eventId?: string;
  contractedRevenue: number;
  contractedRevenueSource: "Accepted Proposal" | "Legacy Event Price" | "None";
  invoicedRevenue: number;
  collectedRevenue: number;
  outstandingClientBalance: number;
  plannedCost: number;
  currentCostForecast: number;
  incurredExpenses: number;
  paidExpenses: number;
  outstandingExpenseBalance: number;
  forecastGrossProfit: number;
  forecastMarginPercentage: number;
  cashPosition: number;
  expenseCount: number;
  invoiceCount: number;
  alerts: FinanceAlert[];
}

export interface FinanceAlert {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  label: string;
  description: string;
  href?: string;
}

export interface BudgetVarianceRow {
  id: string;
  projectId?: string;
  eventId?: string;
  budgetItemId?: string;
  category: BudgetCategory;
  description: string;
  vendorId?: string;
  plannedAmount: number;
  forecastAmount: number;
  incurredAmount: number;
  paidAmount: number;
  varianceAmount: number;
  variancePercentage: number;
  remainingBudget: number;
  linkedExpenseCount: number;
  status: "On Track" | "Over Budget" | "Under Review" | "No Budget";
}

export const leadStages: LeadStage[] = [
  "New Inquiry",
  "Consultation Scheduled",
  "Consultation Completed",
  "Proposal Draft",
  "Proposal Sent",
  "Changes Requested",
  "Accepted",
  "Booked",
  "Lost",
];

export const eventStatuses: EventStatus[] = [
  "Setup",
  "Planning",
  "Awaiting Client Approval",
  "Confirmed",
  "In Progress",
  "Finalization",
  "Event Day",
  "Event Day Completed",
  "Closeout In Progress",
  "Awaiting Client Deliverables",
  "Financial Reconciliation",
  "Ready to Close",
  "Closed",
  "Reopened",
  "Post-Event",
  "Completed",
  "Cancelled",
];

export const taskStatuses: TaskStatus[] = ["To Do", "In Progress", "Blocked", "Done"];
export const taskPriorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];
export const taskNormalizedStatuses: TaskNormalizedStatus[] = [
  "Not Started",
  "Active",
  "Waiting",
  "Blocked",
  "Completed",
  "Cancelled",
];
export const taskVisibilities: TaskVisibility[] = ["Internal", "Client", "Vendor"];
export const taskParticipantRoles: TaskParticipantRole[] = ["Assignee", "Watcher", "Mentioned"];
export const taskInboxStatuses: TaskInboxStatus[] = [
  "New",
  "Triaged",
  "Converted",
  "Snoozed",
  "Dismissed",
];

export const budgetCategories: BudgetCategory[] = [
  "Decor",
  "Venue",
  "Catering",
  "Rentals",
  "Florals",
  "Photography",
  "Entertainment",
  "Staffing",
  "Transportation",
  "Permits",
  "Marketing",
  "Software",
  "Professional Services",
  "Reimbursement",
  "Miscellaneous",
];

export const expenseSources: ExpenseSource[] = [
  "Manual",
  "Vendor Bill",
  "Receipt",
  "Reimbursement",
  "Adjustment",
  "Imported",
];

export const expenseStatuses: ExpenseStatus[] = [
  "Draft",
  "Submitted",
  "Approved",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Voided",
  "Refunded",
];

export const expenseBookkeepingStatuses: ExpenseBookkeepingStatus[] = [
  "Unreviewed",
  "Reviewed",
  "Exported",
  "Reconciled",
];

export const expensePaymentStatuses: ExpensePaymentStatus[] = [
  "Pending",
  "Completed",
  "Failed",
  "Refunded",
  "Voided",
];

export const expensePaymentMethods: ExpensePaymentMethod[] = [
  "Card",
  "Bank Transfer",
  "ACH",
  "Zelle",
  "Cash",
  "Check",
  "Other",
];

export const invoiceTypes: InvoiceType[] = ["Deposit", "Interim", "Final", "Custom"];
export const invoiceStatuses: InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Void",
];

export const proposalStatuses: ProposalStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Changes Requested",
  "Accepted",
  "Declined",
  "Expired",
  "Superseded",
  "Cancelled",
];

export const proposalPaymentTypes: ProposalPaymentType[] = [
  "Deposit",
  "Installment",
  "Final",
  "Custom",
];

export const proposalAmountTypes: ProposalAmountType[] = ["Fixed", "Percent"];
export const proposalDueRules: ProposalDueRule[] = [
  "On Acceptance",
  "Fixed Date",
  "Before Event",
  "After Acceptance",
];

export const emailTemplateTypes: EmailTemplateType[] = [
  "inquiry_acknowledgment",
  "consultation_follow_up",
  "proposal_sent",
  "booking_confirmation",
  "payment_reminder",
  "feedback_request",
  "review_request",
  "deliverable_notification",
  "retention_check_in",
  "anniversary_acknowledgment",
  "rebooking_follow_up",
  "referral_thank_you",
  "general",
];

export const postEventCloseoutStatuses: PostEventCloseoutStatus[] = [
  "Event Day Completed",
  "Closeout In Progress",
  "Awaiting Client Deliverables",
  "Financial Reconciliation",
  "Ready to Close",
  "Closed",
  "Reopened",
  "Cancelled",
];

export const closeoutReadinessStatuses: CloseoutReadinessStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Ready",
  "Complete",
  "Deferred",
  "Overridden",
];

export const closeoutDeliverableStatuses: CloseoutDeliverableStatus[] = [
  "Draft",
  "Awaiting Upload",
  "Ready",
  "Delivered",
  "Viewed",
  "Acknowledged",
  "Replaced",
  "Expired",
];

export const clientConsentTypes: ClientConsentType[] = [
  "Service Feedback",
  "Public Review",
  "Testimonial",
  "Photo/Video Portfolio",
  "Marketing Communication",
];

export const clientConsentStatuses: ClientConsentStatus[] = [
  "Not Requested",
  "Requested",
  "Granted",
  "Declined",
  "Revoked",
  "Expired",
];

export const clientRelationshipStatuses: ClientRelationshipStatus[] = [
  "Active Project",
  "Recent Client",
  "Retention Follow-Up",
  "Rebooking Opportunity",
  "Repeat Client",
  "Referral Partner",
  "Dormant",
  "Do Not Market",
  "Archived",
];

export const relationshipCommunicationPreferences: RelationshipCommunicationPreference[] = [
  "Allowed",
  "Personal Only",
  "Manual Review",
  "Do Not Market",
  "Unsubscribed",
];

export const rebookingOpportunityTypes: RebookingOpportunityType[] = [
  "Anniversary",
  "Birthday",
  "Wedding-Related Milestone",
  "Corporate Recurring Event",
  "Seasonal Event",
  "Referral Follow-Up",
  "Planner Recommendation",
  "Client-Requested Follow-Up",
  "Repeat Event",
  "Other",
];

export const rebookingOpportunityStages: RebookingOpportunityStage[] = [
  "Identified",
  "Review Required",
  "Planned Follow-Up",
  "Ready to Contact",
  "Contacted",
  "Engaged",
  "Consultation Scheduled",
  "Qualified",
  "Converted",
  "Snoozed",
  "Not Interested",
  "Do Not Contact",
  "Closed",
];

export const clientMilestoneTypes: ClientMilestoneType[] = [
  "Event Anniversary",
  "Birthday",
  "Corporate Annual Event",
  "Holiday Event",
  "Launch Anniversary",
  "Graduation Window",
  "Renewal Date",
  "Custom",
];

export const referralStatuses: ReferralStatus[] = [
  "Submitted",
  "Review Required",
  "Introduction Pending",
  "Contact Permitted",
  "Contacted",
  "Qualified",
  "Converted",
  "Not Interested",
  "Invalid",
  "Duplicate",
  "Closed",
];

export const approvalTypes: ApprovalType[] = ["Budget", "Moodboard", "Timeline", "Proposal"];

export const fileCategories: FileCategory[] = [
  "Contracts",
  "Inspiration Images",
  "Receipts",
  "Vendor Quotes",
  "Event Documents",
];

export const communicationChannels: CommunicationChannel[] = ["Email", "Meeting", "Phone"];
export const communicationThreadStatuses: CommunicationThreadStatus[] = [
  "Needs Reply",
  "Scheduled",
  "Waiting on Client",
  "Closed",
];
export const communicationDirections: CommunicationDirection[] = [
  "Inbound",
  "Outbound",
  "Internal",
];
export const meetingTypes: MeetingType[] = ["Google Meet", "Microsoft Teams", "Phone", "In Person"];
export const meetingStatuses: MeetingStatus[] = ["Scheduled", "Completed", "Cancelled"];
export const clientStatuses: ClientStatus[] = ["Prospect", "Active", "Past", "Archived"];
export const timelineItemStatuses: TimelineItemStatus[] = [
  "Planned",
  "Upcoming",
  "Ready",
  "In Progress",
  "Delayed",
  "Blocked",
  "Complete",
  "Completed",
  "Skipped",
  "Cancelled",
];
export const timelineCriticalities: TimelineCriticality[] = ["Normal", "Important", "Critical"];
export const eventDaySessionStatuses: EventDaySessionStatus[] = [
  "Preview",
  "Ready",
  "Active",
  "Paused",
  "Completed",
  "Archived",
];
export const eventDayVendorStatuses: EventDayVendorStatus[] = [
  "Not Confirmed",
  "Confirmed",
  "En Route",
  "Arrived",
  "Setting Up",
  "Ready",
  "Active",
  "Completed",
  "Delayed",
  "Issue",
];
export const eventDayIssueTypes: EventDayIssueType[] = [
  "Timing",
  "Vendor",
  "Client Request",
  "Venue",
  "Equipment",
  "Staffing",
  "Guest Experience",
  "Logistics",
  "Other",
];
export const eventDayIssueSeverities: EventDayIssueSeverity[] = [
  "Informational",
  "Attention Needed",
  "Urgent",
  "Critical",
];
export const eventDayIssueStatuses: EventDayIssueStatus[] = [
  "Open",
  "Investigating",
  "Waiting",
  "Resolved",
  "Closed",
];
