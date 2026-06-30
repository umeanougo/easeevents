/* eslint-disable react-refresh/only-export-components */
import * as React from "react";

import { useEaseEventsAuth } from "./auth";
import { getPublicEaseEventsOrganizationId, hasSupabaseConfig } from "./config";
import { initialEaseEventsData } from "./demo-data";
import {
  approveProjectBookingRequest,
  createIntegratedMeetingRequest,
  provisionClientPortalAccessRequest,
  recordOfflineProposalPaymentRequest,
  saveProposalDraftRequest,
  sendProposalRequest,
  type ProposalDraftRequest,
} from "./integrations";
import {
  attachTaskFileInSupabase,
  createBudgetItemInSupabase,
  createCommunicationMessageInSupabase,
  createCommunicationThreadInSupabase,
  createCommunicationEligibilityLogInSupabase,
  createClientMilestoneInSupabase,
  createClientReferralLinkInSupabase,
  createEventVendorInSupabase,
  createEventTeamMemberInSupabase,
  createExpenseInSupabase,
  createEventDayIssueInSupabase,
  attachExpenseFileInSupabase,
  createFileRecordInSupabase,
  createLeadInSupabase,
  createInvoiceInSupabase,
  createMeetingInSupabase,
  createNotificationInSupabase,
  createProjectReminderInSupabase,
  createCloseoutFinancialSnapshotInSupabase,
  createRebookingOpportunityInSupabase,
  createReferralInSupabase,
  createTaskInSupabase,
  createTaskChecklistInSupabase,
  createTaskChecklistItemInSupabase,
  createTaskCommentInSupabase,
  createTaskInboxItemInSupabase,
  createTaskLabelInSupabase,
  createTimelineItemInSupabase,
  createTimelineVersionInSupabase,
  createVendorInSupabase,
  convertLeadToEventInSupabase,
  convertRebookingOpportunityInSupabase,
  deleteEventTeamMemberInSupabase,
  recordExpensePaymentInSupabase,
  loadEaseEventsData,
  setTaskLabelAssignmentsInSupabase,
  setTaskParticipantsInSupabase,
  toggleChecklistItemInSupabase,
  updateExpenseInSupabase,
  updateClientDetailsInSupabase,
  updateEventDetailsInSupabase,
  updateEventDayIssueInSupabase,
  updateApprovalStatusInSupabase,
  updateLeadInSupabase,
  updateLeadStageInSupabase,
  updateBudgetItemInSupabase,
  updateClientMilestoneInSupabase,
  updateInvoiceInSupabase,
  updateMeetingInSupabase,
  updateOrganizationEmailIdentityInSupabase,
  updateOrganizationEmailSignatureInSupabase,
  updateProjectReminderInSupabase,
  updateRebookingOpportunityInSupabase,
  updateReferralInSupabase,
  updateWorkflowAutomationInSupabase,
  updateNotificationInSupabase,
  ensurePostEventCloseoutInSupabase,
  updatePostEventCloseoutInSupabase,
  updatePostEventCloseoutItemInSupabase,
  upsertFinalDeliverableInSupabase,
  submitClientFeedbackInSupabase,
  upsertClientConsentInSupabase,
  upsertVendorPerformanceReviewInSupabase,
  upsertInternalRetrospectiveInSupabase,
  updateTaskOwnerInSupabase,
  updateTaskInSupabase,
  updateTaskChecklistItemInSupabase,
  updateTaskInboxItemInSupabase,
  updateTaskStatusInSupabase,
  updateTaskWorkStateInSupabase,
  updateTimelineItemInSupabase,
  upsertEventDaySessionInSupabase,
  upsertEventDayVendorStatusInSupabase,
  type CreateBudgetItemInput,
  type CreateCommunicationMessageInput,
  type CreateCommunicationThreadInput,
  type CreateEventVendorInput,
  type CreateEventTeamMemberInput,
  type CreateExpenseInput,
  type CreateEventDayIssueInput,
  type CreateExpensePaymentInput,
  type AttachExpenseFileInput,
  type AttachTaskFileInput,
  type ConvertRebookingOpportunityInput,
  type CreateLeadInput,
  type CreateCommunicationEligibilityLogInput,
  type CreateClientMilestoneInput,
  type CreateClientReferralLinkInput,
  type CreateInvoiceInput,
  type CreateMeetingInput,
  type CreateNotificationInput,
  type CreateProjectReminderInput,
  type CreateRebookingOpportunityInput,
  type CreateReferralInput,
  type CreateCloseoutFinancialSnapshotInput,
  type CreateTaskInput,
  type CreateTaskChecklistInput,
  type CreateTaskChecklistItemInput,
  type CreateTaskCommentInput,
  type CreateTaskInboxItemInput,
  type CreateTaskLabelInput,
  type CreateTimelineItemInput,
  type CreateTimelineVersionInput,
  type CreateVendorInput,
  type UpdateBudgetItemInput,
  type UpdateClientMilestoneInput,
  type UpdateExpenseInput,
  type UpdateEventDayIssueInput,
  type UpdateInvoiceInput,
  type UpdateLeadInput,
  type UpdateMeetingInput,
  type UpdateProjectReminderInput,
  type UpdateRebookingOpportunityInput,
  type UpdateReferralInput,
  type UpdateWorkflowAutomationInput,
  type UpdateNotificationInput,
  type EnsurePostEventCloseoutInput,
  type UpdatePostEventCloseoutInput,
  type UpdatePostEventCloseoutItemInput,
  type UpsertFinalDeliverableInput,
  type SubmitClientFeedbackInput,
  type UpsertClientConsentInput,
  type UpsertVendorPerformanceReviewInput,
  type UpsertInternalRetrospectiveInput,
  type UpdateTaskInput,
  type UpdateTaskChecklistItemInput,
  type UpdateTaskWorkStateInput,
  type UpdateTimelineItemInput,
  type UpsertEventDaySessionInput,
  type UpsertEventDayVendorStatusInput,
} from "./supabase-repository";
import type {
  ApprovalStatus,
  AppUser,
  BudgetItem,
  ClientRecord,
  ClientMilestone,
  ClientReferralLink,
  CommunicationMessage,
  CommunicationThread,
  CommunicationEligibilityLog,
  ClientConsent,
  ClientFeedbackResponse,
  CloseoutFinancialSnapshot,
  EaseEventsData,
  EventFile,
  ExpenseFileRecord,
  ExpensePaymentRecord,
  ExpenseRecord,
  EventDayIssue,
  EventDaySession,
  EventDayVendorStatusRecord,
  MeetingRecord,
  NotificationRecord,
  Organization,
  FinalDeliverable,
  EventRecord,
  EventTeamMember,
  EventVendor,
  InvoiceRecord,
  Lead,
  LeadStage,
  ProposalRecord,
  ProjectActivityEvent,
  ProjectInspirationLink,
  ProjectRecord,
  ProjectReminder,
  PostEventCloseout,
  PostEventCloseoutItem,
  ReferralRecord,
  RebookingOpportunity,
  WorkflowAutomation,
  CommentMessage,
  TaskChecklist,
  TaskChecklistItem,
  TaskAttachment,
  TaskInboxItem,
  TaskLabel,
  TaskLink,
  TaskRecord,
  TaskStatus,
  TimelineItem,
  TimelineVersion,
  Vendor,
  VendorPerformanceReview,
  InternalRetrospective,
  UpdateClientDetailsInput,
  UpdateEventDetailsInput,
} from "./types";

const storageKey = "ease-events-demo-data";

function taskNotificationHref(task: TaskRecord) {
  if (task.eventId) return `/ease-events/events/${task.eventId}?tab=tasks`;
  if (task.leadId) return `/ease-events/leads/${task.leadId}`;
  return "/ease-events/work";
}

function taskNotification(
  task: TaskRecord,
  recipientUserId: string,
  notificationType: string,
  title: string,
  body: string,
  dedupeSuffix: string,
): CreateNotificationInput {
  return {
    recipientUserId,
    projectId: task.projectId,
    eventId: task.eventId,
    notificationType,
    severity: "Info",
    title,
    body,
    href: taskNotificationHref(task),
    channel: "in_app",
    actionRequired: true,
    dedupeKey: `task:${task.id}:${notificationType}:${recipientUserId}:${dedupeSuffix}`,
    metadata: { task_id: task.id },
  };
}

function taskParticipantIds(task: TaskRecord | undefined, role: "Assignee" | "Watcher") {
  return new Set(
    (task?.participants ?? [])
      .filter((participant) => participant.participantRole === role)
      .map((participant) => participant.userId),
  );
}

function taskChangeNotifications(
  taskBeforeUpdate: TaskRecord | undefined,
  taskAfterUpdate: TaskRecord,
  input: UpdateTaskInput,
) {
  const notifications: CreateNotificationInput[] = [];
  const title = taskAfterUpdate.title;

  if (input.ownerId && input.ownerId !== taskBeforeUpdate?.ownerId) {
    notifications.push(
      taskNotification(
        taskAfterUpdate,
        input.ownerId,
        "task_assigned",
        "Task assigned to you",
        title,
        `owner:${input.ownerId}`,
      ),
    );
  }

  const previousAssignees = taskParticipantIds(taskBeforeUpdate, "Assignee");
  for (const userId of input.assigneeIds ?? []) {
    if (!previousAssignees.has(userId)) {
      notifications.push(
        taskNotification(
          taskAfterUpdate,
          userId,
          "task_assigned",
          "You were added as a collaborator",
          title,
          `assignee:${userId}`,
        ),
      );
    }
  }

  const previousWatchers = taskParticipantIds(taskBeforeUpdate, "Watcher");
  for (const userId of input.watcherIds ?? []) {
    if (!previousWatchers.has(userId)) {
      notifications.push(
        taskNotification(
          taskAfterUpdate,
          userId,
          "task_watcher_added",
          "You are now watching a task",
          title,
          `watcher:${userId}`,
        ),
      );
    }
  }

  const previousDue = taskBeforeUpdate?.dueAt ?? taskBeforeUpdate?.dueDate;
  const nextDue = input.dueAt ?? input.dueDate;
  if (nextDue && nextDue !== previousDue) {
    const recipients = new Set<string>();
    if (taskAfterUpdate.ownerId) recipients.add(taskAfterUpdate.ownerId);
    for (const userId of input.assigneeIds ?? []) recipients.add(userId);
    for (const userId of input.watcherIds ?? []) recipients.add(userId);
    for (const userId of recipients) {
      notifications.push(
        taskNotification(
          taskAfterUpdate,
          userId,
          "task_due_date_changed",
          "Task due date changed",
          `${title} is now due ${nextDue.slice(0, 10)}.`,
          `due:${nextDue}:${userId}`,
        ),
      );
    }
  }

  return notifications;
}

interface EaseEventsStoreValue {
  data: EaseEventsData;
  isLoading: boolean;
  error: string | null;
  persistenceMode: "demo" | "supabase";
  refreshData: () => Promise<void>;
  resetDemoData: () => void;
  updateOrganizationEmailIdentity: (identity: {
    emailSenderName: string;
    emailSignature: string;
  }) => Promise<Organization>;
  updateOrganizationEmailSignature: (emailSignature: string) => Promise<Organization>;
  createLead: (lead: CreateLeadInput) => Promise<Lead>;
  updateLead: (leadId: string, lead: UpdateLeadInput) => Promise<Lead>;
  updateLeadStage: (leadId: string, stage: LeadStage) => Promise<void>;
  convertLeadToEvent: (leadId: string) => Promise<EventRecord | null>;
  updateEventDetails: (eventId: string, event: UpdateEventDetailsInput) => Promise<EventRecord>;
  updateClientDetails: (
    clientId: string,
    client: UpdateClientDetailsInput,
  ) => Promise<ClientRecord>;
  provisionClientPortalAccess: (eventId: string) => Promise<{
    user: AppUser;
    inviteSent: boolean;
    inviteError?: string;
    clientPortalPath: string;
  }>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateTaskOwner: (taskId: string, ownerId: string | undefined) => Promise<void>;
  updateTaskWorkState: (taskId: string, input: UpdateTaskWorkStateInput) => Promise<void>;
  toggleChecklistItem: (taskId: string, checklistItemId: string) => Promise<void>;
  createTaskLabel: (label: CreateTaskLabelInput) => Promise<TaskLabel>;
  setTaskLabels: (taskId: string, labelIds: string[]) => Promise<void>;
  setTaskParticipants: (
    taskId: string,
    assigneeIds: string[],
    watcherIds: string[],
  ) => Promise<void>;
  createTaskChecklist: (checklist: CreateTaskChecklistInput) => Promise<TaskChecklist>;
  createTaskChecklistItem: (item: CreateTaskChecklistItemInput) => Promise<TaskChecklistItem>;
  updateTaskChecklistItem: (itemId: string, item: UpdateTaskChecklistItemInput) => Promise<void>;
  createTaskComment: (comment: CreateTaskCommentInput) => Promise<CommentMessage>;
  attachTaskFile: (attachment: AttachTaskFileInput) => Promise<TaskAttachment>;
  createTaskInboxItem: (item: CreateTaskInboxItemInput) => Promise<TaskInboxItem>;
  updateTaskInboxItem: (
    itemId: string,
    updates: Partial<
      Pick<TaskInboxItem, "status" | "convertedTaskId" | "snoozedUntil" | "dismissedAt">
    >,
  ) => Promise<void>;
  updateApprovalStatus: (approvalId: string, status: ApprovalStatus) => Promise<void>;
  createTask: (task: CreateTaskInput) => Promise<TaskRecord>;
  updateTask: (taskId: string, task: UpdateTaskInput) => Promise<TaskRecord>;
  createTimelineItem: (item: CreateTimelineItemInput) => Promise<TimelineItem>;
  updateTimelineItem: (itemId: string, item: UpdateTimelineItemInput) => Promise<TimelineItem>;
  addEventTeamMember: (member: CreateEventTeamMemberInput) => Promise<EventTeamMember>;
  removeEventTeamMember: (memberId: string) => Promise<void>;
  createBudgetItem: (item: CreateBudgetItemInput) => Promise<BudgetItem>;
  updateBudgetItem: (itemId: string, item: UpdateBudgetItemInput) => Promise<BudgetItem>;
  createInvoice: (invoice: CreateInvoiceInput) => Promise<InvoiceRecord>;
  updateInvoice: (invoiceId: string, invoice: UpdateInvoiceInput) => Promise<InvoiceRecord>;
  createExpense: (expense: CreateExpenseInput) => Promise<ExpenseRecord>;
  updateExpense: (expenseId: string, expense: UpdateExpenseInput) => Promise<ExpenseRecord>;
  recordExpensePayment: (payment: CreateExpensePaymentInput) => Promise<ExpensePaymentRecord>;
  attachExpenseFile: (attachment: AttachExpenseFileInput) => Promise<ExpenseFileRecord>;
  saveProposalDraft: (proposal: ProposalDraftRequest) => Promise<ProposalRecord | null>;
  sendProposal: (proposalId: string) => Promise<{ reviewUrl?: string; deliveryStatus?: string }>;
  recordOfflinePayment: (input: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paidAt?: string;
    reference?: string;
    note?: string;
  }) => Promise<void>;
  approveProjectBooking: (projectId: string, note?: string) => Promise<void>;
  createVendor: (vendor: CreateVendorInput) => Promise<Vendor>;
  createEventVendor: (vendor: CreateEventVendorInput) => Promise<EventVendor>;
  addFile: (file: EventFile) => Promise<EventFile>;
  createCommunicationThread: (
    thread: CreateCommunicationThreadInput,
  ) => Promise<CommunicationThread>;
  addCommunicationMessage: (
    message: CreateCommunicationMessageInput,
  ) => Promise<CommunicationMessage>;
  createClientMilestone: (milestone: CreateClientMilestoneInput) => Promise<ClientMilestone>;
  updateClientMilestone: (
    milestoneId: string,
    milestone: UpdateClientMilestoneInput,
  ) => Promise<ClientMilestone>;
  createRebookingOpportunity: (
    opportunity: CreateRebookingOpportunityInput,
  ) => Promise<RebookingOpportunity>;
  updateRebookingOpportunity: (
    opportunityId: string,
    opportunity: UpdateRebookingOpportunityInput,
  ) => Promise<RebookingOpportunity>;
  createClientReferralLink: (link: CreateClientReferralLinkInput) => Promise<ClientReferralLink>;
  createReferral: (referral: CreateReferralInput) => Promise<ReferralRecord>;
  updateReferral: (referralId: string, referral: UpdateReferralInput) => Promise<ReferralRecord>;
  createCommunicationEligibilityLog: (
    log: CreateCommunicationEligibilityLogInput,
  ) => Promise<CommunicationEligibilityLog>;
  convertRebookingOpportunity: (
    opportunityId: string,
    input: ConvertRebookingOpportunityInput,
  ) => Promise<{ opportunity: RebookingOpportunity; lead: Lead; project: ProjectRecord }>;
  createMeeting: (meeting: CreateMeetingInput) => Promise<MeetingRecord>;
  updateMeeting: (meetingId: string, meeting: UpdateMeetingInput) => Promise<MeetingRecord>;
  createProjectReminder: (reminder: CreateProjectReminderInput) => Promise<ProjectReminder>;
  updateProjectReminder: (
    reminderId: string,
    reminder: UpdateProjectReminderInput,
  ) => Promise<ProjectReminder>;
  updateWorkflowAutomation: (
    automationId: string,
    automation: UpdateWorkflowAutomationInput,
  ) => Promise<WorkflowAutomation>;
  updateNotification: (
    notificationId: string,
    notification: UpdateNotificationInput,
  ) => Promise<NotificationRecord>;
  markAllNotificationsRead: () => Promise<void>;
  ensurePostEventCloseout: (
    closeout: EnsurePostEventCloseoutInput,
  ) => Promise<{ closeout: PostEventCloseout; items: PostEventCloseoutItem[] }>;
  updatePostEventCloseout: (
    closeoutId: string,
    closeout: UpdatePostEventCloseoutInput,
  ) => Promise<PostEventCloseout>;
  updatePostEventCloseoutItem: (
    itemId: string,
    item: UpdatePostEventCloseoutItemInput,
  ) => Promise<PostEventCloseoutItem>;
  upsertFinalDeliverable: (deliverable: UpsertFinalDeliverableInput) => Promise<FinalDeliverable>;
  submitClientFeedback: (feedback: SubmitClientFeedbackInput) => Promise<ClientFeedbackResponse>;
  upsertClientConsent: (consent: UpsertClientConsentInput) => Promise<ClientConsent>;
  upsertVendorPerformanceReview: (
    review: UpsertVendorPerformanceReviewInput,
  ) => Promise<VendorPerformanceReview>;
  upsertInternalRetrospective: (
    retrospective: UpsertInternalRetrospectiveInput,
  ) => Promise<InternalRetrospective>;
  createCloseoutFinancialSnapshot: (
    snapshot: CreateCloseoutFinancialSnapshotInput,
  ) => Promise<CloseoutFinancialSnapshot>;
  upsertEventDaySession: (session: UpsertEventDaySessionInput) => Promise<EventDaySession>;
  createTimelineVersion: (version: CreateTimelineVersionInput) => Promise<TimelineVersion>;
  upsertEventDayVendorStatus: (
    status: UpsertEventDayVendorStatusInput,
  ) => Promise<EventDayVendorStatusRecord>;
  createEventDayIssue: (issue: CreateEventDayIssueInput) => Promise<EventDayIssue>;
  updateEventDayIssue: (issueId: string, issue: UpdateEventDayIssueInput) => Promise<EventDayIssue>;
}

const EaseEventsStore = React.createContext<EaseEventsStoreValue | undefined>(undefined);

function cloneInitialData(): EaseEventsData {
  return JSON.parse(JSON.stringify(initialEaseEventsData)) as EaseEventsData;
}

function mergeById<T extends { id: string }>(base: T[], overrides: T[] | undefined) {
  const records = new Map(base.map((item) => [item.id, item]));
  overrides?.forEach((item) => records.set(item.id, item));
  return Array.from(records.values());
}

function readStoredData() {
  if (typeof window === "undefined") return cloneInitialData();
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return cloneInitialData();

  try {
    const base = cloneInitialData();
    const storedData = JSON.parse(stored) as Partial<EaseEventsData>;
    return {
      ...base,
      ...storedData,
      users: mergeById(base.users, storedData.users),
      clients: mergeById(base.clients, storedData.clients),
      projects: mergeById(base.projects, storedData.projects),
      connectedAccounts: mergeById(base.connectedAccounts, storedData.connectedAccounts),
      calendarSyncStates: mergeById(base.calendarSyncStates, storedData.calendarSyncStates),
      externalCalendarEvents: mergeById(
        base.externalCalendarEvents,
        storedData.externalCalendarEvents,
      ),
      schedulingPreferences: mergeById(
        base.schedulingPreferences,
        storedData.schedulingPreferences,
      ),
      availabilityBlocks: mergeById(base.availabilityBlocks, storedData.availabilityBlocks),
      calendarConflicts: mergeById(base.calendarConflicts, storedData.calendarConflicts),
      calendarSyncRuns: mergeById(base.calendarSyncRuns, storedData.calendarSyncRuns),
      projectInspirationLinks: mergeById(
        base.projectInspirationLinks,
        storedData.projectInspirationLinks,
      ),
      taskWorkflowColumns: mergeById(base.taskWorkflowColumns, storedData.taskWorkflowColumns),
      taskLabels: mergeById(base.taskLabels, storedData.taskLabels),
      taskLabelAssignments: mergeById(base.taskLabelAssignments, storedData.taskLabelAssignments),
      taskParticipants: mergeById(base.taskParticipants, storedData.taskParticipants),
      taskChecklists: mergeById(base.taskChecklists, storedData.taskChecklists),
      taskLinks: mergeById(base.taskLinks, storedData.taskLinks),
      taskAttachments: mergeById(base.taskAttachments, storedData.taskAttachments),
      taskSavedViews: mergeById(base.taskSavedViews, storedData.taskSavedViews),
      taskInboxItems: mergeById(base.taskInboxItems, storedData.taskInboxItems),
      emailTemplates: mergeById(base.emailTemplates, storedData.emailTemplates),
      projectActivityEvents: mergeById(
        base.projectActivityEvents,
        storedData.projectActivityEvents,
      ),
      projectReminders: mergeById(base.projectReminders, storedData.projectReminders),
      workflowAutomations: mergeById(base.workflowAutomations, storedData.workflowAutomations),
      workflowAutomationActions: mergeById(
        base.workflowAutomationActions,
        storedData.workflowAutomationActions,
      ),
      workflowEvents: mergeById(base.workflowEvents, storedData.workflowEvents),
      workflowExecutions: mergeById(base.workflowExecutions, storedData.workflowExecutions),
      workflowActionRuns: mergeById(base.workflowActionRuns, storedData.workflowActionRuns),
      notifications: mergeById(base.notifications, storedData.notifications),
      notificationPreferences: mergeById(
        base.notificationPreferences,
        storedData.notificationPreferences,
      ),
      closeoutSettings: mergeById(base.closeoutSettings, storedData.closeoutSettings),
      postEventCloseouts: mergeById(base.postEventCloseouts, storedData.postEventCloseouts),
      postEventCloseoutItems: mergeById(
        base.postEventCloseoutItems,
        storedData.postEventCloseoutItems,
      ),
      finalDeliverables: mergeById(base.finalDeliverables, storedData.finalDeliverables),
      clientFeedbackResponses: mergeById(
        base.clientFeedbackResponses,
        storedData.clientFeedbackResponses,
      ),
      clientConsents: mergeById(base.clientConsents, storedData.clientConsents),
      vendorPerformanceReviews: mergeById(
        base.vendorPerformanceReviews,
        storedData.vendorPerformanceReviews,
      ),
      internalRetrospectives: mergeById(
        base.internalRetrospectives,
        storedData.internalRetrospectives,
      ),
      closeoutFinancialSnapshots: mergeById(
        base.closeoutFinancialSnapshots,
        storedData.closeoutFinancialSnapshots,
      ),
      retentionSettings: mergeById(base.retentionSettings, storedData.retentionSettings),
      clientMilestones: mergeById(base.clientMilestones, storedData.clientMilestones),
      rebookingOpportunities: mergeById(
        base.rebookingOpportunities,
        storedData.rebookingOpportunities,
      ),
      clientReferralLinks: mergeById(base.clientReferralLinks, storedData.clientReferralLinks),
      referrals: mergeById(base.referrals, storedData.referrals),
      communicationEligibilityLogs: mergeById(
        base.communicationEligibilityLogs,
        storedData.communicationEligibilityLogs,
      ),
      eventTeamMembers: mergeById(base.eventTeamMembers, storedData.eventTeamMembers),
      invoicePayments: mergeById(base.invoicePayments, storedData.invoicePayments),
      financeSettings: mergeById(base.financeSettings, storedData.financeSettings),
      expenses: mergeById(base.expenses, storedData.expenses),
      expensePayments: mergeById(base.expensePayments, storedData.expensePayments),
      expenseFiles: mergeById(base.expenseFiles, storedData.expenseFiles),
      bookingSettings: mergeById(base.bookingSettings, storedData.bookingSettings),
      proposals: mergeById(base.proposals, storedData.proposals),
      proposalVersions: mergeById(base.proposalVersions, storedData.proposalVersions),
      proposalLineItems: mergeById(base.proposalLineItems, storedData.proposalLineItems),
      proposalPaymentTerms: mergeById(base.proposalPaymentTerms, storedData.proposalPaymentTerms),
      proposalResponses: mergeById(base.proposalResponses, storedData.proposalResponses),
      proposalFiles: mergeById(base.proposalFiles, storedData.proposalFiles),
      projectBookingApprovals: mergeById(
        base.projectBookingApprovals,
        storedData.projectBookingApprovals,
      ),
      timelineItems: mergeById(base.timelineItems, storedData.timelineItems),
      timelineVersions: mergeById(base.timelineVersions, storedData.timelineVersions),
      eventDaySessions: mergeById(base.eventDaySessions, storedData.eventDaySessions),
      eventDayVendorStatuses: mergeById(
        base.eventDayVendorStatuses,
        storedData.eventDayVendorStatuses,
      ),
      eventDayIssues: mergeById(base.eventDayIssues, storedData.eventDayIssues),
      eventTemplates: mergeById(base.eventTemplates, storedData.eventTemplates),
      taskTemplates: mergeById(base.taskTemplates, storedData.taskTemplates),
      budgetTemplates: mergeById(base.budgetTemplates, storedData.budgetTemplates),
      approvalTemplates: mergeById(base.approvalTemplates, storedData.approvalTemplates),
      vendorTemplates: mergeById(base.vendorTemplates, storedData.vendorTemplates),
    } as EaseEventsData;
  } catch {
    return cloneInitialData();
  }
}

function nextId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

export function EaseEventsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, authMode } = useEaseEventsAuth();
  const [data, setData] = React.useState<EaseEventsData>(readStoredData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const persistenceMode = currentUser && authMode === "supabase" ? "supabase" : "demo";

  React.useEffect(() => {
    if (typeof window !== "undefined" && persistenceMode === "demo") {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [data, persistenceMode]);

  const refreshData = React.useCallback(async () => {
    if (!currentUser || authMode !== "supabase") {
      setData(readStoredData());
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loaded = await loadEaseEventsData(currentUser.organizationId);
      setData(loaded);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Supabase data. Falling back to demo data.";
      setError(message);
      setData(readStoredData());
    } finally {
      setIsLoading(false);
    }
  }, [authMode, currentUser]);

  React.useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const resetDemoData = React.useCallback(() => {
    const reset = cloneInitialData();
    setData(reset);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(reset));
    }
  }, []);

  const updateOrganizationEmailSignature = React.useCallback(
    async (emailSignature: string) => {
      if (persistenceMode === "supabase" && currentUser) {
        const organization = await updateOrganizationEmailSignatureInSupabase(
          currentUser.organizationId,
          emailSignature,
        );
        setData((current) => ({ ...current, organization }));
        return organization;
      }

      const signature = emailSignature.trim();
      const organization = {
        ...data.organization,
        emailSignature: signature || undefined,
      };
      setData((current) => ({ ...current, organization }));
      return organization;
    },
    [currentUser, data.organization, persistenceMode],
  );

  const updateOrganizationEmailIdentity = React.useCallback(
    async (identity: { emailSenderName: string; emailSignature: string }) => {
      if (persistenceMode === "supabase" && currentUser) {
        const organization = await updateOrganizationEmailIdentityInSupabase(
          currentUser.organizationId,
          identity,
        );
        setData((current) => ({ ...current, organization }));
        return organization;
      }

      const organization = {
        ...data.organization,
        emailSenderName: identity.emailSenderName.trim() || undefined,
        emailSignature: identity.emailSignature.trim() || undefined,
      };
      setData((current) => ({ ...current, organization }));
      return organization;
    },
    [currentUser, data.organization, persistenceMode],
  );

  const recordTaskNotifications = React.useCallback(
    async (inputs: CreateNotificationInput[]) => {
      const uniqueInputs = inputs.filter(
        (input, index, list) =>
          input.recipientUserId &&
          input.recipientUserId !== currentUser?.id &&
          list.findIndex((candidate) => candidate.dedupeKey === input.dedupeKey) === index,
      );
      if (!uniqueInputs.length) return;

      if (persistenceMode === "supabase" && currentUser) {
        const notifications = await Promise.all(
          uniqueInputs.map((input) =>
            createNotificationInSupabase(currentUser.organizationId, input),
          ),
        );
        setData((current) => ({
          ...current,
          notifications: [
            ...notifications,
            ...current.notifications.filter(
              (notification) =>
                !notifications.some((created) => created.dedupeKey === notification.dedupeKey),
            ),
          ],
        }));
        return;
      }

      const now = new Date().toISOString();
      setData((current) => {
        const existingKeys = new Set(
          current.notifications.map((notification) => notification.dedupeKey),
        );
        const notifications = uniqueInputs
          .filter((input) => !existingKeys.has(input.dedupeKey))
          .map((input) => ({
            id: nextId("notification"),
            organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
            recipientUserId: input.recipientUserId,
            projectId: input.projectId,
            eventId: input.eventId,
            notificationType: input.notificationType,
            severity: input.severity ?? "Info",
            status: "Unread" as const,
            title: input.title,
            body: input.body,
            href: input.href,
            channel: input.channel ?? "in_app",
            actionRequired: input.actionRequired ?? true,
            dueAt: input.dueAt,
            dedupeKey: input.dedupeKey,
            metadata: input.metadata ?? {},
            createdAt: now,
            updatedAt: now,
          }));
        return { ...current, notifications: [...notifications, ...current.notifications] };
      });
    },
    [currentUser, persistenceMode],
  );

  const createLead = React.useCallback(
    async (input: CreateLeadInput) => {
      const publicOrganizationId = getPublicEaseEventsOrganizationId();
      const canCreateInSupabase =
        (persistenceMode === "supabase" && currentUser) ||
        (!currentUser && hasSupabaseConfig() && publicOrganizationId);

      if (!currentUser && hasSupabaseConfig() && publicOrganizationId) {
        const response = await fetch("/api/ease-events/public-inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            submissionKey:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `store-${crypto.randomUUID()}`
                : `store-${Date.now()}`,
            files: [],
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to submit inquiry.");
        }
        const lead = payload.lead as Lead;
        setData((current) => ({
          ...current,
          clients: payload.client ? [payload.client, ...current.clients] : current.clients,
          projects: payload.project ? [payload.project, ...current.projects] : current.projects,
          leads: [lead, ...current.leads],
          communicationThreads: payload.thread
            ? [payload.thread, ...current.communicationThreads]
            : current.communicationThreads,
        }));
        return lead;
      }

      if (canCreateInSupabase) {
        const lead = await createLeadInSupabase(
          currentUser?.organizationId ?? publicOrganizationId,
          currentUser?.id,
          input,
        );
        setData((current) => ({ ...current, leads: [lead, ...current.leads] }));
        return lead;
      }

      const clientId = nextId("client");
      const projectId = nextId("project");
      const now = new Date().toISOString();
      const organizationId = currentUser?.organizationId ?? initialEaseEventsData.organization.id;
      const client: ClientRecord = {
        id: clientId,
        organizationId,
        displayName: input.clientName,
        email: input.email,
        phone: input.phone,
        status: "Prospect",
        source: input.source,
        notes: input.notes,
        lifetimeValue: 0,
        createdAt: now,
      };
      const lead: Lead = {
        id: nextId("lead"),
        organizationId,
        projectId,
        clientId,
        ownerId: currentUser?.id ?? "user-admin-ava",
        stage: "New Inquiry",
        ...input,
        clientNameSnapshot: input.clientName,
        createdAt: now,
      };
      const project: ProjectRecord = {
        id: projectId,
        organizationId,
        leadId: lead.id,
        clientId,
        ownerId: lead.ownerId,
        name: `${input.clientName} ${input.eventType}`,
        stage: "Inquiry",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      };
      const inspirationLinks: ProjectInspirationLink[] =
        input.inspirationLinks
          ?.map((link) => ({
            id: nextId("inspiration"),
            organizationId,
            projectId,
            leadId: lead.id,
            label: link.label,
            url: link.url.trim(),
            createdById: currentUser?.id,
            createdAt: now,
            updatedAt: now,
          }))
          .filter((link) => link.url) ?? [];
      const ackThread: CommunicationThread = {
        id: nextId("thread"),
        organizationId,
        projectId,
        leadId: lead.id,
        eventId: "",
        assignedToId: lead.ownerId,
        subject: `Inquiry received: ${input.eventType}`,
        clientName: input.clientName,
        clientNameSnapshot: input.clientName,
        participants: [input.email, currentUser?.email ?? "owner@cococabana.demo"],
        channel: "Email",
        status: "Waiting on Client",
        integrationSource: "EaseEvents",
        preview: "Inquiry acknowledgment recorded. Email delivery is pending in demo mode.",
        unreadCount: 0,
        lastActivityAt: now,
      };
      const ackMessage: CommunicationMessage = {
        id: nextId("message"),
        organizationId,
        projectId,
        leadId: lead.id,
        threadId: ackThread.id,
        eventId: "",
        authorId: lead.ownerId,
        direction: "Outbound",
        body: `Hi ${input.clientName}, thank you for reaching out to ${initialEaseEventsData.organization.name} about your ${input.eventType}. We received your inquiry and will follow up with consultation options shortly.`,
        summary: "Inquiry acknowledgment recorded.",
        visibility: "Client",
        sentAt: now,
      };
      const activity: ProjectActivityEvent = {
        id: nextId("activity"),
        organizationId,
        projectId,
        actorId: currentUser?.id,
        activityType: "system",
        title: "Inquiry workspace created",
        body: "Client, lead, communication thread, inspiration links, and follow-up reminder were created together.",
        metadata: { source: input.source },
        createdAt: now,
      };
      const reminder: ProjectReminder = {
        id: nextId("reminder"),
        organizationId,
        projectId,
        assignedToId: lead.ownerId,
        title: `Follow up with ${input.clientName}`,
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "Open",
        automationSource: "inquiry_acknowledgment",
        metadata: { lead_id: lead.id },
        createdAt: now,
        updatedAt: now,
      };

      setData((current) => ({
        ...current,
        clients: [client, ...current.clients],
        projects: [project, ...current.projects],
        leads: [lead, ...current.leads],
        projectInspirationLinks: [...inspirationLinks, ...current.projectInspirationLinks],
        communicationThreads: [ackThread, ...current.communicationThreads],
        communicationMessages: [ackMessage, ...current.communicationMessages],
        projectActivityEvents: [activity, ...current.projectActivityEvents],
        projectReminders: [reminder, ...current.projectReminders],
      }));
      return lead;
    },
    [currentUser, persistenceMode],
  );

  const updateLeadStage = React.useCallback(
    async (leadId: string, stage: LeadStage) => {
      if (persistenceMode === "supabase") {
        await updateLeadStageInSupabase(leadId, stage);
      }

      setData((current) => ({
        ...current,
        leads: current.leads.map((lead) => (lead.id === leadId ? { ...lead, stage } : lead)),
      }));
    },
    [persistenceMode],
  );

  const updateLead = React.useCallback(
    async (leadId: string, input: UpdateLeadInput) => {
      if (persistenceMode === "supabase") {
        const lead = await updateLeadInSupabase(leadId, input);
        setData((current) => ({
          ...current,
          leads: current.leads.map((item) => (item.id === leadId ? lead : item)),
          clients: lead.clientId
            ? current.clients.map((client) =>
                client.id === lead.clientId
                  ? {
                      ...client,
                      displayName: lead.clientNameSnapshot ?? lead.clientName,
                      email: lead.email,
                      phone: lead.phone,
                      source: lead.source,
                      notes: lead.notes,
                    }
                  : client,
              )
            : current.clients,
        }));
        return lead;
      }

      let updatedLead: Lead | null = null;
      setData((current) => {
        const previousLead = current.leads.find((lead) => lead.id === leadId);
        const nextLead = previousLead
          ? { ...previousLead, ...input, clientNameSnapshot: input.clientName }
          : null;
        updatedLead = nextLead;

        return {
          ...current,
          leads: current.leads.map((lead) => (lead.id === leadId && nextLead ? nextLead : lead)),
          clients: nextLead?.clientId
            ? current.clients.map((client) =>
                client.id === nextLead.clientId
                  ? {
                      ...client,
                      displayName: nextLead.clientNameSnapshot ?? nextLead.clientName,
                      email: nextLead.email,
                      phone: nextLead.phone,
                      source: nextLead.source,
                      notes: nextLead.notes,
                    }
                  : client,
              )
            : current.clients,
        };
      });

      return (
        updatedLead ?? {
          id: leadId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          stage: "New Inquiry",
          convertedEventId: undefined,
          clientNameSnapshot: input.clientName,
          createdAt: new Date().toISOString(),
          ...input,
        }
      );
    },
    [currentUser?.organizationId, persistenceMode],
  );

  const convertLeadToEvent = React.useCallback(
    async (leadId: string) => {
      const existingLead = data.leads.find((item) => item.id === leadId);
      if (!existingLead) return null;

      if (persistenceMode === "supabase") {
        const event = await convertLeadToEventInSupabase(existingLead);
        await refreshData();
        return event;
      }

      let createdEvent: EventRecord | null = null;
      const eventId = nextId("event");
      const existingProject =
        data.projects.find((project) => project.id === existingLead.projectId) ??
        data.projects.find((project) => project.leadId === existingLead.id);
      const projectId = existingLead.projectId ?? existingProject?.id ?? nextId("project");
      const clientId = existingLead.clientId ?? nextId("client");
      const clientNameSnapshot = existingLead.clientNameSnapshot ?? existingLead.clientName;
      const now = new Date().toISOString();
      const createdClient: ClientRecord | null = existingLead.clientId
        ? null
        : {
            id: clientId,
            organizationId: existingLead.organizationId,
            displayName: clientNameSnapshot,
            email: existingLead.email,
            phone: existingLead.phone,
            status: "Active",
            source: existingLead.source,
            notes: existingLead.notes,
            lifetimeValue: 0,
            lastContactedAt: now,
            createdAt: existingLead.createdAt,
          };
      createdEvent = {
        id: eventId,
        organizationId: existingLead.organizationId,
        projectId,
        leadId: existingLead.id,
        clientId,
        plannerId: existingLead.ownerId,
        clientNameSnapshot,
        clientName: clientNameSnapshot,
        clientEmail: existingLead.email,
        clientPhone: existingLead.phone,
        eventName: `${clientNameSnapshot} ${existingLead.eventType}`,
        eventType: existingLead.eventType,
        eventDate: existingLead.eventDate,
        startTime: "17:00",
        endTime: "22:00",
        location: "Location TBD",
        guestCount: existingLead.estimatedGuestCount,
        status: "Planning",
        clientPrice: 0,
        internalNotes: existingLead.notes,
        timelineNotes:
          "TODO: Generate a detailed run-of-show after consultation notes are finalized.",
        createdAt: now,
      };

      setData((current) => ({
        ...current,
        leads: current.leads.map((item) =>
          item.id === leadId
            ? { ...item, projectId, clientId, stage: "Booked", convertedEventId: eventId }
            : item,
        ),
        projects: existingProject
          ? current.projects.map((project) =>
              project.id === projectId
                ? {
                    ...project,
                    eventId,
                    clientId,
                    ownerId: existingLead.ownerId,
                    name: createdEvent?.eventName ?? project.name,
                    stage: "Planning",
                    lastActivityAt: now,
                    updatedAt: now,
                  }
                : project,
            )
          : [
              {
                id: projectId,
                organizationId: existingLead.organizationId,
                leadId: existingLead.id,
                eventId,
                clientId,
                ownerId: existingLead.ownerId,
                name: createdEvent?.eventName ?? `${clientNameSnapshot} ${existingLead.eventType}`,
                stage: "Planning",
                lastActivityAt: now,
                createdAt: existingLead.createdAt,
                updatedAt: now,
              },
              ...current.projects,
            ],
        clients: createdClient
          ? [createdClient, ...current.clients]
          : current.clients.map((client) =>
              client.id === clientId ? { ...client, status: "Active" } : client,
            ),
        events: createdEvent ? [createdEvent, ...current.events] : current.events,
        communicationThreads: current.communicationThreads.map((thread) =>
          thread.projectId === projectId && !thread.eventId ? { ...thread, eventId } : thread,
        ),
        communicationMessages: current.communicationMessages.map((message) =>
          message.projectId === projectId && !message.eventId ? { ...message, eventId } : message,
        ),
        meetings: current.meetings.map((meeting) =>
          meeting.projectId === projectId && !meeting.eventId ? { ...meeting, eventId } : meeting,
        ),
        files: current.files.map((file) =>
          file.projectId === projectId && !file.eventId ? { ...file, eventId } : file,
        ),
        comments: current.comments.map((comment) =>
          comment.projectId === projectId && !comment.eventId ? { ...comment, eventId } : comment,
        ),
        projectInspirationLinks: current.projectInspirationLinks.map((link) =>
          link.projectId === projectId && !link.eventId ? { ...link, eventId } : link,
        ),
        eventTeamMembers: existingLead.ownerId
          ? [
              {
                id: nextId("team"),
                organizationId: existingLead.organizationId,
                eventId,
                userId: existingLead.ownerId,
                roleLabel: "Lead planner",
                createdAt: new Date().toISOString(),
              },
              ...current.eventTeamMembers.filter(
                (member) => member.eventId !== eventId || member.userId !== existingLead.ownerId,
              ),
            ]
          : current.eventTeamMembers,
        approvals: [
          {
            id: nextId("approval"),
            organizationId: existingLead.organizationId,
            eventId,
            type: "Proposal",
            title: "Initial proposal approval",
            description:
              "Review the converted proposal and confirm scope before execution planning.",
            status: "Pending",
            dueDate: existingLead.eventDate,
          },
          ...current.approvals,
        ],
        tasks: [
          {
            id: nextId("task"),
            organizationId: existingLead.organizationId,
            projectId,
            leadId: existingLead.id,
            eventId,
            ownerId: existingLead.ownerId,
            title: "Kick off booked event workspace",
            description:
              "Confirm venue, vendor gaps, budget assumptions, and client portal access.",
            dueDate: new Date().toISOString().slice(0, 10),
            status: "To Do",
            priority: "High",
            checklist: [],
          },
          {
            id: nextId("task"),
            organizationId: existingLead.organizationId,
            projectId,
            leadId: existingLead.id,
            eventId,
            ownerId: existingLead.ownerId,
            title: "Configure payment terms before deposit invoice",
            description:
              "Set the deposit amount, due date, and payment schedule before sending a client invoice.",
            dueDate: new Date().toISOString().slice(0, 10),
            status: "To Do",
            priority: "High",
            checklist: [],
          },
          ...current.tasks,
        ],
        projectActivityEvents: [
          {
            id: nextId("activity"),
            organizationId: existingLead.organizationId,
            projectId,
            actorId: currentUser?.id,
            activityType: "status",
            title: "Lead converted to booked event",
            body: "Project history, communications, files, meetings, notes, and tasks were retained.",
            metadata: { lead_id: existingLead.id, event_id: eventId },
            createdAt: now,
          },
          ...current.projectActivityEvents,
        ],
      }));

      return createdEvent;
    },
    [currentUser?.id, data.leads, data.projects, persistenceMode, refreshData],
  );

  const updateEventDetails = React.useCallback(
    async (eventId: string, input: UpdateEventDetailsInput) => {
      if (persistenceMode === "supabase") {
        const event = await updateEventDetailsInSupabase(eventId, input, currentUser?.id);
        await refreshData();
        return event;
      }

      let updatedEvent: EventRecord | undefined;
      const now = new Date().toISOString();
      setData((current) => {
        const previous = current.events.find((event) => event.id === eventId);
        if (!previous) return current;
        updatedEvent = { ...previous, ...input };
        return {
          ...current,
          events: current.events.map((event) => (event.id === eventId ? updatedEvent! : event)),
          projects: current.projects.map((project) =>
            project.id === previous.projectId
              ? {
                  ...project,
                  name: input.eventName,
                  ownerId: input.plannerId,
                  lastActivityAt: now,
                  updatedAt: now,
                }
              : project,
          ),
          projectActivityEvents: previous.projectId
            ? [
                {
                  id: nextId("activity"),
                  organizationId: previous.organizationId,
                  projectId: previous.projectId,
                  actorId: currentUser?.id,
                  activityType: "status",
                  title: "Event details updated",
                  body: `${input.eventName} details were edited.`,
                  metadata: { event_id: previous.id },
                  createdAt: now,
                },
                ...current.projectActivityEvents,
              ]
            : current.projectActivityEvents,
        };
      });
      if (!updatedEvent) throw new Error("Event not found.");
      return updatedEvent;
    },
    [currentUser?.id, persistenceMode, refreshData],
  );

  const updateClientDetails = React.useCallback(
    async (clientId: string, input: UpdateClientDetailsInput) => {
      if (persistenceMode === "supabase") {
        const client = await updateClientDetailsInSupabase(clientId, input, currentUser?.id);
        await refreshData();
        return client;
      }

      let updatedClient: ClientRecord | undefined;
      const now = new Date().toISOString();
      setData((current) => {
        const previous = current.clients.find((client) => client.id === clientId);
        if (!previous) return current;
        updatedClient = {
          ...previous,
          displayName: input.displayName,
          email: input.email,
          phone: input.phone,
          companyName: input.companyName,
          preferredContactChannel: input.preferredContactChannel,
          relationshipOwnerId: input.relationshipOwnerId,
          notes: input.notes,
        };
        const relatedProjectIds = new Set<string>();
        current.events.forEach((event) => {
          if (event.clientId === clientId && event.projectId)
            relatedProjectIds.add(event.projectId);
        });
        current.leads.forEach((lead) => {
          if (lead.clientId === clientId && lead.projectId) relatedProjectIds.add(lead.projectId);
        });
        return {
          ...current,
          clients: current.clients.map((client) =>
            client.id === clientId ? updatedClient! : client,
          ),
          events: current.events.map((event) =>
            event.clientId === clientId
              ? {
                  ...event,
                  clientNameSnapshot: input.displayName,
                  clientName: input.displayName,
                  clientEmail: input.email,
                  clientPhone: input.phone ?? "",
                }
              : event,
          ),
          leads: current.leads.map((lead) =>
            lead.clientId === clientId
              ? {
                  ...lead,
                  clientNameSnapshot: input.displayName,
                  clientName: input.displayName,
                  email: input.email,
                  phone: input.phone ?? "",
                }
              : lead,
          ),
          projectActivityEvents: relatedProjectIds.size
            ? [
                ...Array.from(relatedProjectIds).map((projectId) => ({
                  id: nextId("activity"),
                  organizationId: previous.organizationId,
                  projectId,
                  actorId: currentUser?.id,
                  activityType: "status" as const,
                  title: "Client details updated",
                  body: `${input.displayName} contact details were edited.`,
                  metadata: { client_id: previous.id },
                  createdAt: now,
                })),
                ...current.projectActivityEvents,
              ]
            : current.projectActivityEvents,
        };
      });
      if (!updatedClient) throw new Error("Client not found.");
      return updatedClient;
    },
    [currentUser?.id, persistenceMode, refreshData],
  );

  const provisionClientPortalAccess = React.useCallback(
    async (eventId: string) => {
      if (persistenceMode === "supabase") {
        const result = await provisionClientPortalAccessRequest(eventId);
        await refreshData();
        return result;
      }

      const event = data.events.find((item) => item.id === eventId);
      if (!event) throw new Error("Event not found.");

      const existingClient = data.users.find(
        (user) =>
          user.organizationId === event.organizationId &&
          user.email.toLowerCase() === event.clientEmail.toLowerCase(),
      );
      const canonicalClient = data.clients.find(
        (client) =>
          client.id === event.clientId ||
          client.email.toLowerCase() === event.clientEmail.toLowerCase(),
      );
      const clientUser: AppUser =
        existingClient ??
        ({
          id: nextId("user-client"),
          organizationId: event.organizationId,
          role: "client",
          fullName: canonicalClient?.displayName ?? event.clientNameSnapshot ?? event.clientName,
          email: event.clientEmail,
          phone: event.clientPhone,
        } satisfies AppUser);

      setData((current) => ({
        ...current,
        users: existingClient ? current.users : [clientUser, ...current.users],
        events: current.events.map((item) =>
          item.id === eventId ? { ...item, clientUserId: clientUser.id } : item,
        ),
      }));

      return {
        user: clientUser,
        inviteSent: false,
        clientPortalPath: "/ease-events/client-portal",
      };
    },
    [data.events, data.users, persistenceMode, refreshData],
  );

  const updateTaskStatus = React.useCallback(
    async (taskId: string, status: TaskStatus) => {
      if (persistenceMode === "supabase") {
        await updateTaskStatusInSupabase(taskId, status);
      }

      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
      }));
    },
    [persistenceMode],
  );

  const updateTaskOwner = React.useCallback(
    async (taskId: string, ownerId: string | undefined) => {
      if (persistenceMode === "supabase") {
        await updateTaskOwnerInSupabase(taskId, ownerId);
      }

      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ownerId } : task)),
      }));
    },
    [persistenceMode],
  );

  const updateTaskWorkState = React.useCallback(
    async (taskId: string, input: UpdateTaskWorkStateInput) => {
      if (persistenceMode === "supabase") {
        await updateTaskWorkStateInSupabase(taskId, input);
      }

      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...input,
                archivedAt:
                  input.archivedAt === null ? undefined : (input.archivedAt ?? task.archivedAt),
                archivedById:
                  input.archivedById === null
                    ? undefined
                    : (input.archivedById ?? task.archivedById),
                cardCoverFileId:
                  input.cardCoverFileId === null
                    ? undefined
                    : (input.cardCoverFileId ?? task.cardCoverFileId),
                lastActivityAt: new Date().toISOString(),
              }
            : task,
        ),
      }));
    },
    [persistenceMode],
  );

  const toggleChecklistItem = React.useCallback(
    async (taskId: string, checklistItemId: string) => {
      const task = data.tasks.find((item) => item.id === taskId);
      const checklistItem = task?.checklist.find((item) => item.id === checklistItemId);

      if (persistenceMode === "supabase" && checklistItem) {
        await toggleChecklistItemInSupabase(checklistItem);
      }

      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                checklist: task.checklist.map((item) =>
                  item.id === checklistItemId ? { ...item, isComplete: !item.isComplete } : item,
                ),
              }
            : task,
        ),
      }));
    },
    [data.tasks, persistenceMode],
  );

  const createTaskLabel = React.useCallback(
    async (input: CreateTaskLabelInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const label = await createTaskLabelInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, taskLabels: [label, ...current.taskLabels] }));
        return label;
      }

      const label: TaskLabel = {
        id: nextId("task-label"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        name: input.name,
        color: input.color,
        description: input.description,
        isActive: true,
        sortOrder: data.taskLabels.length * 10,
        createdById: currentUser?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({ ...current, taskLabels: [label, ...current.taskLabels] }));
      return label;
    },
    [currentUser, data.taskLabels.length, persistenceMode],
  );

  const setTaskLabels = React.useCallback(
    async (taskId: string, labelIds: string[]) => {
      const task = data.tasks.find((item) => item.id === taskId);
      if (!task) return;

      if (persistenceMode === "supabase") {
        await setTaskLabelAssignmentsInSupabase(taskId, task.organizationId, labelIds);
      }

      const now = new Date().toISOString();
      const assignments = labelIds.map((labelId) => ({
        id: `task-label-assignment-${taskId}-${labelId}`,
        organizationId: task.organizationId,
        taskId,
        labelId,
        createdById: currentUser?.id,
        createdAt: now,
      }));
      setData((current) => ({
        ...current,
        taskLabelAssignments: [
          ...assignments,
          ...current.taskLabelAssignments.filter((assignment) => assignment.taskId !== taskId),
        ],
        tasks: current.tasks.map((item) =>
          item.id === taskId
            ? {
                ...item,
                labels: current.taskLabels.filter((label) => labelIds.includes(label.id)),
                lastActivityAt: now,
              }
            : item,
        ),
      }));
    },
    [currentUser?.id, data.tasks, persistenceMode],
  );

  const setTaskParticipants = React.useCallback(
    async (taskId: string, assigneeIds: string[], watcherIds: string[]) => {
      const task = data.tasks.find((item) => item.id === taskId);
      if (!task) return;

      if (persistenceMode === "supabase") {
        await setTaskParticipantsInSupabase(taskId, task.organizationId, assigneeIds, watcherIds);
      }

      const now = new Date().toISOString();
      const participants = [
        ...assigneeIds.map((userId) => ({
          id: `task-participant-${taskId}-${userId}-assignee`,
          organizationId: task.organizationId,
          taskId,
          userId,
          participantRole: "Assignee" as const,
          addedById: currentUser?.id,
          createdAt: now,
        })),
        ...watcherIds.map((userId) => ({
          id: `task-participant-${taskId}-${userId}-watcher`,
          organizationId: task.organizationId,
          taskId,
          userId,
          participantRole: "Watcher" as const,
          addedById: currentUser?.id,
          createdAt: now,
        })),
      ];

      setData((current) => ({
        ...current,
        taskParticipants: [
          ...participants,
          ...current.taskParticipants.filter((participant) => participant.taskId !== taskId),
        ],
        tasks: current.tasks.map((item) =>
          item.id === taskId ? { ...item, participants, lastActivityAt: now } : item,
        ),
      }));
    },
    [currentUser?.id, data.tasks, persistenceMode],
  );

  const createTaskChecklist = React.useCallback(
    async (input: CreateTaskChecklistInput) => {
      const organizationId = currentUser?.organizationId ?? initialEaseEventsData.organization.id;
      if (persistenceMode === "supabase") {
        const checklist = await createTaskChecklistInSupabase(organizationId, input);
        setData((current) => ({
          ...current,
          taskChecklists: [checklist, ...current.taskChecklists],
          tasks: current.tasks.map((task) =>
            task.id === input.taskId
              ? { ...task, checklists: [checklist, ...(task.checklists ?? [])] }
              : task,
          ),
        }));
        return checklist;
      }

      const checklist: TaskChecklist = {
        id: nextId("task-checklist"),
        organizationId,
        taskId: input.taskId,
        title: input.title,
        sortOrder: input.sortOrder ?? 0,
        createdById: currentUser?.id,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        taskChecklists: [checklist, ...current.taskChecklists],
        tasks: current.tasks.map((task) =>
          task.id === input.taskId
            ? { ...task, checklists: [checklist, ...(task.checklists ?? [])] }
            : task,
        ),
      }));
      return checklist;
    },
    [currentUser, persistenceMode],
  );

  const createTaskChecklistItem = React.useCallback(
    async (input: CreateTaskChecklistItemInput) => {
      const organizationId = currentUser?.organizationId ?? initialEaseEventsData.organization.id;
      if (persistenceMode === "supabase") {
        const item = await createTaskChecklistItemInSupabase(organizationId, input);
        setData((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === input.taskId ? { ...task, checklist: [...task.checklist, item] } : task,
          ),
        }));
        return item;
      }

      const item: TaskChecklistItem = {
        id: nextId("check"),
        organizationId,
        taskId: input.taskId,
        checklistId: input.checklistId,
        title: input.title,
        isComplete: false,
        assigneeId: input.assigneeId,
        dueAt: input.dueAt,
        notes: input.notes,
        sortOrder: input.sortOrder ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === input.taskId ? { ...task, checklist: [...task.checklist, item] } : task,
        ),
      }));
      return item;
    },
    [currentUser?.organizationId, persistenceMode],
  );

  const updateTaskChecklistItem = React.useCallback(
    async (itemId: string, input: UpdateTaskChecklistItemInput) => {
      if (persistenceMode === "supabase") {
        await updateTaskChecklistItemInSupabase(itemId, input);
      }

      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => ({
          ...task,
          checklist: task.checklist.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...input,
                  isComplete: input.isComplete ?? item.isComplete,
                  assigneeId:
                    input.assigneeId === null ? undefined : (input.assigneeId ?? item.assigneeId),
                  dueAt: input.dueAt === null ? undefined : (input.dueAt ?? item.dueAt),
                  notes: input.notes === null ? undefined : (input.notes ?? item.notes),
                  completedAt:
                    input.isComplete === undefined
                      ? item.completedAt
                      : input.isComplete
                        ? new Date().toISOString()
                        : undefined,
                }
              : item,
          ),
        })),
      }));
    },
    [persistenceMode],
  );

  const createTaskComment = React.useCallback(
    async (input: CreateTaskCommentInput) => {
      const organizationId = currentUser?.organizationId ?? initialEaseEventsData.organization.id;
      const task = data.tasks.find((item) => item.id === input.taskId);
      if (persistenceMode === "supabase") {
        const comment = await createTaskCommentInSupabase(organizationId, input);
        setData((current) => ({ ...current, comments: [comment, ...current.comments] }));
        if (task) {
          const recipients = new Set<string>([
            ...(input.mentions ?? []),
            ...(task.participants ?? [])
              .filter((participant) => participant.participantRole === "Watcher")
              .map((participant) => participant.userId),
          ]);
          await recordTaskNotifications(
            [...recipients].map((userId) =>
              taskNotification(
                task,
                userId,
                input.mentions?.includes(userId) ? "task_mentioned" : "task_comment_added",
                input.mentions?.includes(userId)
                  ? "You were mentioned on a task"
                  : "New task comment",
                task.title,
                `comment:${comment.id}:${userId}`,
              ),
            ),
          );
        }
        return comment;
      }

      const comment: CommentMessage = {
        id: nextId("comment"),
        organizationId,
        taskId: input.taskId,
        authorId: currentUser?.id,
        body: input.body,
        visibility: input.visibility ?? "Internal",
        mentions: input.mentions ?? [],
        metadata: {},
        createdAt: new Date().toISOString(),
      };
      setData((current) => ({ ...current, comments: [comment, ...current.comments] }));
      if (task) {
        const recipients = new Set<string>([
          ...(input.mentions ?? []),
          ...(task.participants ?? [])
            .filter((participant) => participant.participantRole === "Watcher")
            .map((participant) => participant.userId),
        ]);
        await recordTaskNotifications(
          [...recipients].map((userId) =>
            taskNotification(
              task,
              userId,
              input.mentions?.includes(userId) ? "task_mentioned" : "task_comment_added",
              input.mentions?.includes(userId)
                ? "You were mentioned on a task"
                : "New task comment",
              task.title,
              `comment:${comment.id}:${userId}`,
            ),
          ),
        );
      }
      return comment;
    },
    [currentUser, data.tasks, persistenceMode, recordTaskNotifications],
  );

  const attachTaskFile = React.useCallback(
    async (input: AttachTaskFileInput) => {
      const task = data.tasks.find((item) => item.id === input.taskId);
      const organizationId =
        task?.organizationId ??
        currentUser?.organizationId ??
        initialEaseEventsData.organization.id;
      if (persistenceMode === "supabase") {
        const attachment = await attachTaskFileInSupabase(organizationId, input);
        setData((current) => ({
          ...current,
          taskAttachments: [attachment, ...current.taskAttachments],
          tasks: current.tasks.map((item) =>
            item.id === input.taskId
              ? { ...item, attachments: [attachment, ...(item.attachments ?? [])] }
              : item,
          ),
        }));
        return attachment;
      }

      const attachment: TaskAttachment = {
        id: nextId("task-attachment"),
        organizationId,
        taskId: input.taskId,
        fileId: input.fileId,
        label: input.label,
        createdById: currentUser?.id,
        createdAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        taskAttachments: [attachment, ...current.taskAttachments],
        tasks: current.tasks.map((item) =>
          item.id === input.taskId
            ? { ...item, attachments: [attachment, ...(item.attachments ?? [])] }
            : item,
        ),
      }));
      return attachment;
    },
    [currentUser, data.tasks, persistenceMode],
  );

  const createTaskInboxItem = React.useCallback(
    async (input: CreateTaskInboxItemInput) => {
      const organizationId = currentUser?.organizationId ?? initialEaseEventsData.organization.id;
      if (persistenceMode === "supabase") {
        const item = await createTaskInboxItemInSupabase(organizationId, input);
        setData((current) => ({ ...current, taskInboxItems: [item, ...current.taskInboxItems] }));
        return item;
      }

      const item: TaskInboxItem = {
        id: nextId("task-inbox"),
        organizationId,
        sourceType: input.sourceType,
        sourceTable: input.sourceTable,
        sourceRecordId: input.sourceRecordId,
        sourceUrl: input.sourceUrl,
        projectId: input.projectId,
        eventId: input.eventId,
        capturedById: currentUser?.id,
        capturedAt: new Date().toISOString(),
        rawContent: input.rawContent,
        summary: input.summary,
        suggestedProjectId: input.suggestedProjectId ?? input.projectId,
        suggestedTitle: input.suggestedTitle,
        suggestedOwnerId: input.suggestedOwnerId,
        suggestedDueAt: input.suggestedDueAt,
        suggestedStatus: input.suggestedStatus ?? "To Do",
        status: "New",
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({ ...current, taskInboxItems: [item, ...current.taskInboxItems] }));
      return item;
    },
    [currentUser, persistenceMode],
  );

  const updateTaskInboxItem = React.useCallback(
    async (
      itemId: string,
      updates: Partial<
        Pick<TaskInboxItem, "status" | "convertedTaskId" | "snoozedUntil" | "dismissedAt">
      >,
    ) => {
      if (persistenceMode === "supabase") {
        await updateTaskInboxItemInSupabase(itemId, updates);
      }

      setData((current) => ({
        ...current,
        taskInboxItems: current.taskInboxItems.map((item) =>
          item.id === itemId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item,
        ),
      }));
    },
    [persistenceMode],
  );

  const updateApprovalStatus = React.useCallback(
    async (approvalId: string, status: ApprovalStatus) => {
      if (persistenceMode === "supabase") {
        await updateApprovalStatusInSupabase(approvalId, status, currentUser?.id);
      }

      setData((current) => ({
        ...current,
        approvals: current.approvals.map((approval) =>
          approval.id === approvalId
            ? {
                ...approval,
                status,
                respondedAt: status === "Pending" ? undefined : new Date().toISOString(),
              }
            : approval,
        ),
      }));
    },
    [currentUser?.id, persistenceMode],
  );

  const createTask = React.useCallback(
    async (input: CreateTaskInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const task = await createTaskInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, tasks: [task, ...current.tasks] }));
        return task;
      }

      const task: TaskRecord = {
        id: nextId("task"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        leadId: input.leadId,
        eventId: input.eventId,
        ownerId: input.ownerId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        status: input.status ?? "To Do",
        priority: input.priority,
        workflowColumnId: input.workflowColumnId,
        normalizedStatus: input.normalizedStatus,
        position: input.position ?? Date.now(),
        startAt: input.startAt,
        dueAt: input.dueAt,
        visibility: input.visibility ?? "Internal",
        estimatedEffortMinutes: input.estimatedEffortMinutes,
        workType: input.workType ?? (input.projectId || input.eventId ? "project" : "internal"),
        sourceType: input.sourceType,
        sourceRecordId: input.sourceRecordId,
        sourceUrl: input.sourceUrl,
        lastActivityAt: new Date().toISOString(),
        createdById: currentUser?.id,
        metadata: {},
        checklist: [],
        links:
          input.links?.map((link) => ({
            id: nextId("task-link"),
            organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
            taskId: "",
            label: link.label?.trim() || link.url.trim(),
            url: link.url.trim(),
            createdById: currentUser?.id,
            createdAt: new Date().toISOString(),
          })) ?? [],
      };
      task.links = task.links?.map((link) => ({ ...link, taskId: task.id }));
      const participants = [
        ...(input.assigneeIds ?? []).map((userId) => ({
          id: `task-participant-${task.id}-${userId}-assignee`,
          organizationId: task.organizationId,
          taskId: task.id,
          userId,
          participantRole: "Assignee" as const,
          addedById: currentUser?.id,
          createdAt: new Date().toISOString(),
        })),
        ...(input.watcherIds ?? []).map((userId) => ({
          id: `task-participant-${task.id}-${userId}-watcher`,
          organizationId: task.organizationId,
          taskId: task.id,
          userId,
          participantRole: "Watcher" as const,
          addedById: currentUser?.id,
          createdAt: new Date().toISOString(),
        })),
      ];
      const labels = data.taskLabels.filter((label) => input.labelIds?.includes(label.id));
      const labelAssignments = labels.map((label) => ({
        id: `task-label-assignment-${task.id}-${label.id}`,
        organizationId: task.organizationId,
        taskId: task.id,
        labelId: label.id,
        createdById: currentUser?.id,
        createdAt: new Date().toISOString(),
      }));
      const checklists =
        input.checklistGroups?.map((checklist, index) => ({
          id: nextId("task-checklist"),
          organizationId: task.organizationId,
          taskId: task.id,
          title: checklist.title,
          sortOrder: index * 10,
          createdById: currentUser?.id,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })) ?? [];
      const checklistItems =
        input.checklistGroups?.flatMap((checklist, checklistIndex) =>
          checklist.items.map((item, itemIndex) => ({
            id: nextId("check"),
            organizationId: task.organizationId,
            taskId: task.id,
            checklistId: checklists[checklistIndex]?.id,
            title: item.title,
            isComplete: false,
            assigneeId: item.assigneeId,
            dueAt: item.dueAt,
            sortOrder: itemIndex * 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
        ) ?? [];
      task.participants = participants;
      task.labels = labels;
      task.checklists = checklists;
      task.checklist = checklistItems;

      setData((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
        taskLinks: [...(task.links ?? []), ...current.taskLinks],
        taskParticipants: [...participants, ...current.taskParticipants],
        taskLabelAssignments: [...labelAssignments, ...current.taskLabelAssignments],
        taskChecklists: [...checklists, ...current.taskChecklists],
      }));
      return task;
    },
    [currentUser, data.taskLabels, persistenceMode],
  );

  const updateTask = React.useCallback(
    async (taskId: string, input: UpdateTaskInput) => {
      const taskBeforeUpdate = data.tasks.find((item) => item.id === taskId);
      if (persistenceMode === "supabase") {
        const task = await updateTaskInSupabase(taskId, input);
        setData((current) => ({
          ...current,
          tasks: current.tasks.map((item) =>
            item.id === taskId ? { ...task, checklist: item.checklist } : item,
          ),
        }));
        await recordTaskNotifications(taskChangeNotifications(taskBeforeUpdate, task, input));
        return task;
      }

      let updatedTask: TaskRecord | null = null;
      const labelIds = input.labelIds;
      const assigneeIds = input.assigneeIds;
      const watcherIds = input.watcherIds;
      const labels =
        labelIds && taskBeforeUpdate
          ? data.taskLabels.filter((label) => labelIds.includes(label.id))
          : undefined;
      const participants =
        taskBeforeUpdate && (assigneeIds || watcherIds)
          ? [
              ...(assigneeIds ?? []).map((userId) => ({
                id: `task-participant-${taskId}-${userId}-assignee`,
                organizationId: taskBeforeUpdate.organizationId,
                taskId,
                userId,
                participantRole: "Assignee" as const,
                addedById: currentUser?.id,
                createdAt: new Date().toISOString(),
              })),
              ...(watcherIds ?? []).map((userId) => ({
                id: `task-participant-${taskId}-${userId}-watcher`,
                organizationId: taskBeforeUpdate.organizationId,
                taskId,
                userId,
                participantRole: "Watcher" as const,
                addedById: currentUser?.id,
                createdAt: new Date().toISOString(),
              })),
            ]
          : undefined;
      const labelAssignments =
        labels?.map((label) => ({
          id: `task-label-assignment-${taskId}-${label.id}`,
          organizationId:
            taskBeforeUpdate?.organizationId ??
            currentUser?.organizationId ??
            initialEaseEventsData.organization.id,
          taskId,
          labelId: label.id,
          createdById: currentUser?.id,
          createdAt: new Date().toISOString(),
        })) ?? [];

      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const links =
            input.links?.map((link) => ({
              id: nextId("task-link"),
              organizationId: task.organizationId,
              taskId,
              label: link.label?.trim() || link.url.trim(),
              url: link.url.trim(),
              createdById: currentUser?.id,
              createdAt: new Date().toISOString(),
            })) ?? task.links;
          updatedTask = {
            ...task,
            ...input,
            links,
            labels: labels ?? task.labels,
            participants: participants ?? task.participants,
            lastActivityAt: new Date().toISOString(),
          };
          return updatedTask;
        }),
        taskLinks: input.links
          ? [
              ...input.links
                .map((link) => ({
                  id: nextId("task-link"),
                  organizationId:
                    currentUser?.organizationId ?? initialEaseEventsData.organization.id,
                  taskId,
                  label: link.label?.trim() || link.url.trim(),
                  url: link.url.trim(),
                  createdById: currentUser?.id,
                  createdAt: new Date().toISOString(),
                }))
                .filter((link) => link.url),
              ...current.taskLinks.filter((link) => link.taskId !== taskId),
            ]
          : current.taskLinks,
        taskLabelAssignments: labelIds
          ? [
              ...labelAssignments,
              ...current.taskLabelAssignments.filter((assignment) => assignment.taskId !== taskId),
            ]
          : current.taskLabelAssignments,
        taskParticipants: participants
          ? [
              ...participants,
              ...current.taskParticipants.filter((participant) => participant.taskId !== taskId),
            ]
          : current.taskParticipants,
      }));

      const fallbackTask = updatedTask ?? {
        id: taskId,
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        checklist: [],
        ...input,
      };
      await recordTaskNotifications(taskChangeNotifications(taskBeforeUpdate, fallbackTask, input));
      return fallbackTask;
    },
    [currentUser, data.taskLabels, data.tasks, persistenceMode, recordTaskNotifications],
  );

  const createTimelineItem = React.useCallback(
    async (input: CreateTimelineItemInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const item = await createTimelineItemInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, timelineItems: [item, ...current.timelineItems] }));
        return item;
      }

      const item: TimelineItem = {
        id: nextId("timeline"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        createdAt: new Date().toISOString(),
      };

      setData((current) => ({ ...current, timelineItems: [item, ...current.timelineItems] }));
      return item;
    },
    [currentUser, persistenceMode],
  );

  const updateTimelineItem = React.useCallback(
    async (itemId: string, input: UpdateTimelineItemInput) => {
      if (persistenceMode === "supabase") {
        const item = await updateTimelineItemInSupabase(itemId, input);
        setData((current) => ({
          ...current,
          timelineItems: current.timelineItems.map((currentItem) =>
            currentItem.id === itemId ? item : currentItem,
          ),
        }));
        return item;
      }

      let updatedItem: TimelineItem | null = null;
      setData((current) => ({
        ...current,
        timelineItems: current.timelineItems.map((item) => {
          if (item.id !== itemId) return item;
          updatedItem = { ...item, ...input };
          return updatedItem;
        }),
      }));

      return (
        updatedItem ?? {
          id: itemId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          ...input,
          createdAt: new Date().toISOString(),
        }
      );
    },
    [currentUser?.organizationId, persistenceMode],
  );

  const addEventTeamMember = React.useCallback(
    async (input: CreateEventTeamMemberInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const member = await createEventTeamMemberInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          eventTeamMembers: [member, ...current.eventTeamMembers],
        }));
        return member;
      }

      const member: EventTeamMember = {
        id: nextId("team"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        eventId: input.eventId,
        userId: input.userId,
        roleLabel: input.roleLabel,
        createdAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        eventTeamMembers: [member, ...current.eventTeamMembers],
      }));
      return member;
    },
    [currentUser, persistenceMode],
  );

  const removeEventTeamMember = React.useCallback(
    async (memberId: string) => {
      const removed = data.eventTeamMembers.find((member) => member.id === memberId);

      if (persistenceMode === "supabase") {
        if (removed) {
          const ownedTasks = data.tasks.filter(
            (task) => task.eventId === removed.eventId && task.ownerId === removed.userId,
          );
          await Promise.all(
            ownedTasks.map((task) => updateTaskOwnerInSupabase(task.id, undefined)),
          );
        }
        await deleteEventTeamMemberInSupabase(memberId);
      }

      setData((current) => {
        return {
          ...current,
          eventTeamMembers: current.eventTeamMembers.filter((member) => member.id !== memberId),
          tasks: current.tasks.map((task) =>
            removed && task.eventId === removed.eventId && task.ownerId === removed.userId
              ? { ...task, ownerId: undefined }
              : task,
          ),
        };
      });
    },
    [data.eventTeamMembers, data.tasks, persistenceMode],
  );

  const createBudgetItem = React.useCallback(
    async (input: CreateBudgetItemInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const item = await createBudgetItemInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, budgetItems: [item, ...current.budgetItems] }));
        return item;
      }

      const item: BudgetItem = {
        id: nextId("budget"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
      };

      setData((current) => ({ ...current, budgetItems: [item, ...current.budgetItems] }));
      return item;
    },
    [currentUser, persistenceMode],
  );

  const updateBudgetItem = React.useCallback(
    async (itemId: string, input: UpdateBudgetItemInput) => {
      if (persistenceMode === "supabase") {
        const item = await updateBudgetItemInSupabase(itemId, input);
        setData((current) => ({
          ...current,
          budgetItems: current.budgetItems.map((currentItem) =>
            currentItem.id === itemId ? item : currentItem,
          ),
        }));
        return item;
      }

      let updatedItem: BudgetItem | null = null;
      setData((current) => ({
        ...current,
        budgetItems: current.budgetItems.map((item) => {
          if (item.id !== itemId) return item;
          updatedItem = { ...item, ...input };
          return updatedItem;
        }),
      }));

      return (
        updatedItem ?? {
          id: itemId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          ...input,
        }
      );
    },
    [currentUser?.organizationId, persistenceMode],
  );

  const createInvoice = React.useCallback(
    async (input: CreateInvoiceInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const invoice = await createInvoiceInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, invoices: [invoice, ...current.invoices] }));
        return invoice;
      }

      const now = new Date().toISOString();
      const invoice: InvoiceRecord = {
        id: nextId("invoice"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        invoiceNumber: `INV-${now.slice(0, 10).replace(/-/g, "")}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`,
        balanceDue: Math.max(input.amount - input.paidAmount, 0),
        createdAt: now,
        updatedAt: now,
        metadata: input.metadata ?? {},
      };

      setData((current) => ({ ...current, invoices: [invoice, ...current.invoices] }));
      return invoice;
    },
    [currentUser, persistenceMode],
  );

  const updateInvoice = React.useCallback(
    async (invoiceId: string, input: UpdateInvoiceInput) => {
      if (persistenceMode === "supabase") {
        const invoice = await updateInvoiceInSupabase(invoiceId, input);
        setData((current) => ({
          ...current,
          invoices: current.invoices.map((currentInvoice) =>
            currentInvoice.id === invoiceId ? invoice : currentInvoice,
          ),
        }));
        return invoice;
      }

      let updatedInvoice: InvoiceRecord | null = null;
      setData((current) => ({
        ...current,
        invoices: current.invoices.map((invoice) => {
          if (invoice.id !== invoiceId) return invoice;
          updatedInvoice = {
            ...invoice,
            ...input,
            balanceDue: Math.max(input.amount - input.paidAmount, 0),
            updatedAt: new Date().toISOString(),
          };
          return updatedInvoice;
        }),
      }));

      return (
        updatedInvoice ?? {
          id: invoiceId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          ...input,
          balanceDue: Math.max(input.amount - input.paidAmount, 0),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: input.metadata ?? {},
        }
      );
    },
    [currentUser?.organizationId, persistenceMode],
  );

  const createExpense = React.useCallback(
    async (input: CreateExpenseInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const expense = await createExpenseInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          expenses: [expense, ...current.expenses.filter((item) => item.id !== expense.id)],
        }));
        return expense;
      }

      const now = new Date().toISOString();
      const expense: ExpenseRecord = {
        id: nextId("expense"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        approvedAt: input.status === "Approved" ? now : undefined,
        expenseNumber:
          input.expenseNumber ??
          `EXP-${now.slice(0, 10).replace(/-/g, "")}-${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };

      setData((current) => ({
        ...current,
        expenses: [expense, ...current.expenses],
        projectActivityEvents: [
          {
            id: nextId("activity"),
            organizationId: expense.organizationId,
            projectId: expense.projectId,
            actorId: currentUser?.id,
            activityType: "status",
            title: "Expense recorded",
            body: `${expense.description} for ${expense.currency} ${expense.totalAmount.toLocaleString()}.`,
            metadata: { expense_id: expense.id },
            createdAt: now,
          },
          ...current.projectActivityEvents,
        ],
      }));
      return expense;
    },
    [currentUser, persistenceMode],
  );

  const updateExpense = React.useCallback(
    async (expenseId: string, input: UpdateExpenseInput) => {
      if (persistenceMode === "supabase") {
        const expense = await updateExpenseInSupabase(expenseId, input);
        setData((current) => ({
          ...current,
          expenses: current.expenses.map((item) => (item.id === expenseId ? expense : item)),
        }));
        return expense;
      }

      let updatedExpense: ExpenseRecord | null = null;
      const now = new Date().toISOString();
      setData((current) => ({
        ...current,
        expenses: current.expenses.map((expense) => {
          if (expense.id !== expenseId) return expense;
          updatedExpense = {
            ...expense,
            ...input,
            approvedAt: input.status === "Approved" ? (expense.approvedAt ?? now) : undefined,
            metadata: input.metadata ?? expense.metadata,
            updatedAt: now,
          };
          return updatedExpense;
        }),
      }));

      return (
        updatedExpense ?? {
          id: expenseId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          ...input,
          approvedAt: input.status === "Approved" ? now : undefined,
          metadata: input.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        }
      );
    },
    [currentUser?.organizationId, persistenceMode],
  );

  const recordExpensePayment = React.useCallback(
    async (input: CreateExpensePaymentInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const payment = await recordExpensePaymentInSupabase(currentUser.organizationId, input);
        await refreshData();
        return payment;
      }

      const expense = data.expenses.find((item) => item.id === input.expenseId);
      const paidAlready = data.expensePayments
        .filter(
          (payment) => payment.expenseId === input.expenseId && payment.status === "Completed",
        )
        .reduce((sum, payment) => sum + payment.amount, 0);
      if (
        expense &&
        input.status === "Completed" &&
        paidAlready + input.amount > expense.totalAmount + 0.01
      ) {
        throw new Error("Expense payment exceeds the outstanding balance.");
      }

      const now = new Date().toISOString();
      const payment: ExpensePaymentRecord = {
        id: nextId("expense-payment"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };

      setData((current) => {
        const nextPaidTotal =
          input.status === "Completed" ? paidAlready + input.amount : paidAlready;
        return {
          ...current,
          expensePayments: [payment, ...current.expensePayments],
          expenses: current.expenses.map((item) => {
            if (item.id !== input.expenseId) return item;
            const status =
              nextPaidTotal >= item.totalAmount
                ? "Paid"
                : nextPaidTotal > 0
                  ? "Partially Paid"
                  : item.status;
            return { ...item, status, updatedAt: now };
          }),
          projectActivityEvents: expense
            ? [
                {
                  id: nextId("activity"),
                  organizationId: payment.organizationId,
                  projectId: expense.projectId,
                  actorId: currentUser?.id,
                  activityType: "status",
                  title: "Expense payment recorded",
                  body: `${payment.paymentMethod} payment for ${payment.currency} ${payment.amount.toLocaleString()}.`,
                  metadata: { expense_id: expense.id, expense_payment_id: payment.id },
                  createdAt: now,
                },
                ...current.projectActivityEvents,
              ]
            : current.projectActivityEvents,
        };
      });
      return payment;
    },
    [currentUser, data.expensePayments, data.expenses, persistenceMode, refreshData],
  );

  const attachExpenseFile = React.useCallback(
    async (input: AttachExpenseFileInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const attachment = await attachExpenseFileInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          expenseFiles: [
            attachment,
            ...current.expenseFiles.filter((item) => item.id !== attachment.id),
          ],
        }));
        return attachment;
      }

      const now = new Date().toISOString();
      const attachment: ExpenseFileRecord = {
        id: nextId("expense-file"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        expenseId: input.expenseId,
        fileId: input.fileId,
        visibility: input.visibility ?? "Internal",
        caption: input.caption,
        createdById: input.createdById ?? currentUser?.id,
        createdAt: now,
      };

      setData((current) => ({
        ...current,
        expenseFiles: [
          attachment,
          ...current.expenseFiles.filter(
            (item) => item.expenseId !== input.expenseId || item.fileId !== input.fileId,
          ),
        ],
      }));
      return attachment;
    },
    [currentUser, persistenceMode],
  );

  const saveProposalDraft = React.useCallback(
    async (input: ProposalDraftRequest) => {
      if (persistenceMode === "supabase" && currentUser) {
        const result = await saveProposalDraftRequest(input);
        await refreshData();
        return result.proposal as ProposalRecord;
      }

      const project = data.projects.find((item) => item.id === input.projectId);
      const lead = data.leads.find((item) => item.id === project?.leadId);
      const event = data.events.find((item) => item.id === project?.eventId);
      const now = new Date().toISOString();
      const proposalId = input.proposalId ?? nextId("proposal");
      const nextVersionNumber =
        data.proposalVersions
          .filter((version) => version.proposalId === proposalId)
          .reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
      const versionId = nextId("proposal-version");
      const subtotal = input.lineItems
        .filter((item) => item.clientVisible && item.isSelected)
        .reduce(
          (sum, item) => sum + Math.max(item.quantity * item.unitPrice - item.discountAmount, 0),
          0,
        );
      const totalAmount = Math.max(subtotal - input.discountAmount + input.taxAmount, 0);
      const proposal: ProposalRecord = {
        id: proposalId,
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        leadId: lead?.id,
        eventId: event?.id,
        clientId: lead?.clientId ?? event?.clientId,
        proposalNumber:
          data.proposals.find((item) => item.id === proposalId)?.proposalNumber ??
          `PROP-${now.slice(0, 10).replace(/-/g, "")}-${Math.random()
            .toString(36)
            .slice(2, 7)
            .toUpperCase()}`,
        title: input.title,
        status: "Draft",
        currency: data.organization.currency,
        currentVersionNumber: nextVersionNumber,
        currentVersionId: versionId,
        validUntil: input.validUntil,
        createdById: currentUser?.id,
        metadata: { source: "demo_proposal_builder" },
        createdAt: data.proposals.find((item) => item.id === proposalId)?.createdAt ?? now,
        updatedAt: now,
      };

      setData((current) => ({
        ...current,
        leads: lead
          ? current.leads.map((item) =>
              item.id === lead.id ? { ...item, stage: "Proposal Draft" } : item,
            )
          : current.leads,
        projects: current.projects.map((item) =>
          item.id === input.projectId
            ? { ...item, stage: "Proposal", lastActivityAt: now, updatedAt: now }
            : item,
        ),
        proposals: [proposal, ...current.proposals.filter((item) => item.id !== proposal.id)],
        proposalVersions: [
          {
            id: versionId,
            organizationId: proposal.organizationId,
            proposalId,
            versionNumber: nextVersionNumber,
            introduction: input.introduction,
            scope: input.scope,
            terms: input.terms,
            subtotal,
            discountAmount: input.discountAmount,
            taxAmount: input.taxAmount,
            totalAmount,
            snapshot: {
              lineItems: input.lineItems,
              paymentTerms: input.paymentTerms,
            },
            documentHash: undefined,
            createdById: currentUser?.id,
            createdAt: now,
          },
          ...current.proposalVersions,
        ],
        proposalLineItems: [
          ...input.lineItems.map((item, index) => ({
            id: nextId("proposal-line"),
            organizationId: proposal.organizationId,
            proposalVersionId: versionId,
            category: item.category as never,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxRate: item.taxRate,
            totalAmount: Math.max(item.quantity * item.unitPrice - item.discountAmount, 0),
            isOptional: item.isOptional,
            isSelected: item.isSelected,
            clientVisible: item.clientVisible,
            sortOrder: item.sortOrder || index,
            metadata: {},
            createdAt: now,
            updatedAt: now,
          })),
          ...current.proposalLineItems,
        ],
        proposalPaymentTerms: [
          ...input.paymentTerms.map((term, index) => ({
            id: nextId("proposal-term"),
            organizationId: proposal.organizationId,
            proposalVersionId: versionId,
            label: term.label,
            paymentType: term.paymentType,
            amountType: term.amountType,
            amountValue: term.amountValue,
            calculatedAmount:
              term.amountType === "Percent"
                ? Math.round(totalAmount * (term.amountValue / 100) * 100) / 100
                : term.amountValue,
            dueRule: term.dueRule,
            dueDate: term.dueDate,
            dueOffsetDays: term.dueOffsetDays,
            requiredForBooking: term.requiredForBooking,
            sortOrder: term.sortOrder || index,
            createdAt: now,
            updatedAt: now,
          })),
          ...current.proposalPaymentTerms,
        ],
        projectActivityEvents: [
          {
            id: nextId("activity"),
            organizationId: proposal.organizationId,
            projectId: input.projectId,
            actorId: currentUser?.id,
            activityType: "status",
            title: input.proposalId ? "Proposal revised" : "Proposal drafted",
            body: `${proposal.proposalNumber} v${nextVersionNumber} is ready to send.`,
            metadata: { proposal_id: proposal.id, proposal_version_id: versionId },
            createdAt: now,
          },
          ...current.projectActivityEvents,
        ],
      }));

      return proposal;
    },
    [currentUser, data, persistenceMode, refreshData],
  );

  const sendProposal = React.useCallback(
    async (proposalId: string) => {
      if (persistenceMode === "supabase" && currentUser) {
        const result = await sendProposalRequest(proposalId);
        await refreshData();
        return { reviewUrl: result.reviewUrl, deliveryStatus: result.deliveryStatus };
      }

      const now = new Date().toISOString();
      setData((current) => {
        const proposal = current.proposals.find((item) => item.id === proposalId);
        if (!proposal) return current;
        return {
          ...current,
          leads: proposal.leadId
            ? current.leads.map((lead) =>
                lead.id === proposal.leadId ? { ...lead, stage: "Proposal Sent" } : lead,
              )
            : current.leads,
          proposals: current.proposals.map((item) =>
            item.id === proposalId
              ? { ...item, status: "Sent", sentAt: now, updatedAt: now }
              : item,
          ),
          proposalVersions: current.proposalVersions.map((version) =>
            version.id === proposal.currentVersionId
              ? { ...version, immutableAt: now, documentHash: `demo-${version.id}` }
              : version,
          ),
          projectActivityEvents: [
            {
              id: nextId("activity"),
              organizationId: proposal.organizationId,
              projectId: proposal.projectId,
              actorId: currentUser?.id,
              activityType: "email",
              title: `Proposal sent: ${proposal.proposalNumber}`,
              body: "Demo mode suppressed email delivery.",
              metadata: { proposal_id: proposal.id, delivery_status: "Suppressed" },
              createdAt: now,
            },
            ...current.projectActivityEvents,
          ],
        };
      });
      return {
        reviewUrl: `/ease-events/proposals/demo-${proposalId}`,
        deliveryStatus: "Suppressed",
      };
    },
    [currentUser, persistenceMode, refreshData],
  );

  const recordOfflinePayment = React.useCallback(
    async (input: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      paidAt?: string;
      reference?: string;
      note?: string;
    }) => {
      if (persistenceMode === "supabase" && currentUser) {
        await recordOfflineProposalPaymentRequest(input);
        await refreshData();
        return;
      }

      await updateInvoice(input.invoiceId, {
        ...(data.invoices.find((invoice) => invoice.id === input.invoiceId) as InvoiceRecord),
        paidAmount: Math.min(
          (data.invoices.find((invoice) => invoice.id === input.invoiceId)?.paidAmount ?? 0) +
            input.amount,
          data.invoices.find((invoice) => invoice.id === input.invoiceId)?.amount ?? input.amount,
        ),
        status: "Paid",
      });
    },
    [currentUser, data.invoices, persistenceMode, refreshData, updateInvoice],
  );

  const approveProjectBooking = React.useCallback(
    async (projectId: string, note?: string) => {
      if (persistenceMode === "supabase" && currentUser) {
        await approveProjectBookingRequest(projectId, note);
        await refreshData();
      }
    },
    [currentUser, persistenceMode, refreshData],
  );

  const createVendor = React.useCallback(
    async (input: CreateVendorInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const vendor = await createVendorInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, vendors: [vendor, ...current.vendors] }));
        return vendor;
      }

      const vendor: Vendor = {
        id: nextId("vendor"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
      };

      setData((current) => ({ ...current, vendors: [vendor, ...current.vendors] }));
      return vendor;
    },
    [currentUser, persistenceMode],
  );

  const createEventVendor = React.useCallback(
    async (input: CreateEventVendorInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const eventVendor = await createEventVendorInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          eventVendors: [eventVendor, ...current.eventVendors],
        }));
        return eventVendor;
      }

      const eventVendor: EventVendor = {
        id: nextId("event-vendor"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
      };

      setData((current) => ({
        ...current,
        eventVendors: [eventVendor, ...current.eventVendors],
      }));
      return eventVendor;
    },
    [currentUser, persistenceMode],
  );

  const addFile = React.useCallback(
    async (file: EventFile) => {
      const savedFile =
        persistenceMode === "supabase" ? await createFileRecordInSupabase(file) : file;

      setData((current) => ({ ...current, files: [savedFile, ...current.files] }));
      return savedFile;
    },
    [persistenceMode],
  );

  const createCommunicationThread = React.useCallback(
    async (input: CreateCommunicationThreadInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const thread = await createCommunicationThreadInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          communicationThreads: [thread, ...current.communicationThreads],
        }));
        return thread;
      }

      const thread: CommunicationThread = {
        id: nextId("thread"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
      };

      setData((current) => ({
        ...current,
        communicationThreads: [thread, ...current.communicationThreads],
      }));
      return thread;
    },
    [currentUser, persistenceMode],
  );

  const addCommunicationMessage = React.useCallback(
    async (input: CreateCommunicationMessageInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const message = await createCommunicationMessageInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          communicationMessages: [message, ...current.communicationMessages],
          communicationThreads: current.communicationThreads.map((thread) =>
            thread.id === input.threadId
              ? {
                  ...thread,
                  preview: input.summary ?? input.body,
                  lastActivityAt: input.sentAt,
                  unreadCount: input.direction === "Inbound" ? thread.unreadCount + 1 : 0,
                  status:
                    input.direction === "Inbound"
                      ? "Needs Reply"
                      : input.direction === "Outbound"
                        ? "Waiting on Client"
                        : thread.status,
                }
              : thread,
          ),
        }));
        return message;
      }

      const message: CommunicationMessage = {
        id: nextId("message"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
      };

      setData((current) => ({
        ...current,
        communicationMessages: [message, ...current.communicationMessages],
        communicationThreads: current.communicationThreads.map((thread) =>
          thread.id === input.threadId
            ? {
                ...thread,
                preview: input.summary ?? input.body,
                lastActivityAt: input.sentAt,
                unreadCount: input.direction === "Inbound" ? thread.unreadCount + 1 : 0,
                status:
                  input.direction === "Inbound"
                    ? "Needs Reply"
                    : input.direction === "Outbound"
                      ? "Waiting on Client"
                      : thread.status,
              }
            : thread,
        ),
      }));
      return message;
    },
    [currentUser, persistenceMode],
  );

  const createClientMilestone = React.useCallback(
    async (input: CreateClientMilestoneInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const milestone = await createClientMilestoneInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          clientMilestones: [milestone, ...current.clientMilestones],
        }));
        return milestone;
      }

      const now = new Date().toISOString();
      const milestone: ClientMilestone = {
        id: nextId("milestone"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        clientId: input.clientId,
        sourceProjectId: input.sourceProjectId,
        milestoneType: input.milestoneType,
        title: input.title,
        milestoneDate: input.milestoneDate,
        month: input.month,
        day: input.day,
        recurrenceRule: input.recurrenceRule,
        reminderOffsetDays: input.reminderOffsetDays ?? 30,
        nextOccurrenceDate: input.nextOccurrenceDate ?? input.milestoneDate,
        sensitivity: input.sensitivity ?? "Standard",
        source: input.source ?? "Planner confirmed",
        consentOrPurposeReferenceId: input.consentOrPurposeReferenceId,
        isActive: input.isActive ?? true,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata ?? {},
        createdById: input.createdById ?? currentUser?.id,
        createdAt: now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        clientMilestones: [milestone, ...current.clientMilestones],
      }));
      return milestone;
    },
    [currentUser, persistenceMode],
  );

  const updateClientMilestone = React.useCallback(
    async (milestoneId: string, input: UpdateClientMilestoneInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const milestone = await updateClientMilestoneInSupabase(milestoneId, input);
        setData((current) => ({
          ...current,
          clientMilestones: current.clientMilestones.map((item) =>
            item.id === milestoneId ? milestone : item,
          ),
        }));
        return milestone;
      }

      const existing = data.clientMilestones.find((item) => item.id === milestoneId);
      const milestone: ClientMilestone = {
        ...(existing ?? {
          id: milestoneId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          createdAt: new Date().toISOString(),
        }),
        clientId: input.clientId,
        sourceProjectId: input.sourceProjectId,
        milestoneType: input.milestoneType,
        title: input.title,
        milestoneDate: input.milestoneDate,
        month: input.month,
        day: input.day,
        recurrenceRule: input.recurrenceRule,
        reminderOffsetDays: input.reminderOffsetDays ?? existing?.reminderOffsetDays ?? 30,
        nextOccurrenceDate: input.nextOccurrenceDate ?? input.milestoneDate,
        sensitivity: input.sensitivity ?? existing?.sensitivity ?? "Standard",
        source: input.source ?? existing?.source ?? "Planner confirmed",
        consentOrPurposeReferenceId: input.consentOrPurposeReferenceId,
        isActive: input.isActive ?? true,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata ?? existing?.metadata ?? {},
        createdById: input.createdById ?? existing?.createdById ?? currentUser?.id,
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        clientMilestones: current.clientMilestones.map((item) =>
          item.id === milestoneId ? milestone : item,
        ),
      }));
      return milestone;
    },
    [currentUser, data.clientMilestones, persistenceMode],
  );

  const createRebookingOpportunity = React.useCallback(
    async (input: CreateRebookingOpportunityInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const opportunity = await createRebookingOpportunityInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          rebookingOpportunities: [opportunity, ...current.rebookingOpportunities],
        }));
        return opportunity;
      }

      const now = new Date().toISOString();
      const opportunity: RebookingOpportunity = {
        id: nextId("rebooking"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        stage: input.stage ?? "Identified",
        metadata: input.metadata ?? {},
        createdById: input.createdById ?? currentUser?.id,
        createdAt: now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        rebookingOpportunities: [opportunity, ...current.rebookingOpportunities],
      }));
      return opportunity;
    },
    [currentUser, persistenceMode],
  );

  const updateRebookingOpportunity = React.useCallback(
    async (opportunityId: string, input: UpdateRebookingOpportunityInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const opportunity = await updateRebookingOpportunityInSupabase(opportunityId, input);
        setData((current) => ({
          ...current,
          rebookingOpportunities: current.rebookingOpportunities.map((item) =>
            item.id === opportunityId ? opportunity : item,
          ),
        }));
        return opportunity;
      }

      const existing = data.rebookingOpportunities.find((item) => item.id === opportunityId);
      const opportunity: RebookingOpportunity = {
        ...(existing ?? {
          id: opportunityId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          createdAt: new Date().toISOString(),
        }),
        ...input,
        stage: input.stage ?? existing?.stage ?? "Identified",
        metadata: input.metadata ?? existing?.metadata ?? {},
        createdById: input.createdById ?? existing?.createdById ?? currentUser?.id,
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        rebookingOpportunities: current.rebookingOpportunities.map((item) =>
          item.id === opportunityId ? opportunity : item,
        ),
      }));
      return opportunity;
    },
    [currentUser, data.rebookingOpportunities, persistenceMode],
  );

  const createClientReferralLink = React.useCallback(
    async (input: CreateClientReferralLinkInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const link = await createClientReferralLinkInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          clientReferralLinks: [
            link,
            ...current.clientReferralLinks.filter((item) => item.id !== link.id),
          ],
        }));
        return link;
      }

      const now = new Date().toISOString();
      const link: ClientReferralLink = {
        id: nextId("referral-link"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        clientId: input.clientId,
        projectId: input.projectId,
        referralCode: input.referralCode,
        sourceCampaign: input.sourceCampaign,
        expiresAt: input.expiresAt,
        isActive: input.isActive ?? true,
        createdById: input.createdById ?? currentUser?.id,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        clientReferralLinks: [link, ...current.clientReferralLinks],
      }));
      return link;
    },
    [currentUser, persistenceMode],
  );

  const createReferral = React.useCallback(
    async (input: CreateReferralInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const referral = await createReferralInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, referrals: [referral, ...current.referrals] }));
        return referral;
      }

      const now = new Date().toISOString();
      const referral: ReferralRecord = {
        id: nextId("referral"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        status: input.status ?? "Submitted",
        rewardStatus: input.rewardStatus ?? "Not Eligible",
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      setData((current) => ({ ...current, referrals: [referral, ...current.referrals] }));
      return referral;
    },
    [currentUser, persistenceMode],
  );

  const updateReferral = React.useCallback(
    async (referralId: string, input: UpdateReferralInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const referral = await updateReferralInSupabase(referralId, input);
        setData((current) => ({
          ...current,
          referrals: current.referrals.map((item) => (item.id === referralId ? referral : item)),
        }));
        return referral;
      }

      const existing = data.referrals.find((item) => item.id === referralId);
      const referral: ReferralRecord = {
        ...(existing ?? {
          id: referralId,
          organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
          createdAt: new Date().toISOString(),
        }),
        ...input,
        status: input.status ?? existing?.status ?? "Submitted",
        rewardStatus: input.rewardStatus ?? existing?.rewardStatus ?? "Not Eligible",
        metadata: input.metadata ?? existing?.metadata ?? {},
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        referrals: current.referrals.map((item) => (item.id === referralId ? referral : item)),
      }));
      return referral;
    },
    [currentUser, data.referrals, persistenceMode],
  );

  const createCommunicationEligibilityLog = React.useCallback(
    async (input: CreateCommunicationEligibilityLogInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const log = await createCommunicationEligibilityLogInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          communicationEligibilityLogs: [log, ...current.communicationEligibilityLogs],
        }));
        return log;
      }

      const log: CommunicationEligibilityLog = {
        id: nextId("eligibility"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        metadata: input.metadata ?? {},
        checkedById: input.checkedById ?? currentUser?.id,
        createdAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        communicationEligibilityLogs: [log, ...current.communicationEligibilityLogs],
      }));
      return log;
    },
    [currentUser, persistenceMode],
  );

  const convertRebookingOpportunity = React.useCallback(
    async (opportunityId: string, input: ConvertRebookingOpportunityInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const result = await convertRebookingOpportunityInSupabase(opportunityId, input);
        await refreshData();
        return result;
      }

      const opportunity = data.rebookingOpportunities.find((item) => item.id === opportunityId);
      if (!opportunity) throw new Error("Rebooking opportunity not found.");
      if (opportunity.convertedLeadId && opportunity.convertedProjectId) {
        const lead = data.leads.find((item) => item.id === opportunity.convertedLeadId);
        const project = data.projects.find((item) => item.id === opportunity.convertedProjectId);
        if (lead && project) return { opportunity, lead, project };
      }

      const client = data.clients.find((item) => item.id === opportunity.clientId);
      if (!client) throw new Error("Client not found for rebooking opportunity.");
      const now = new Date().toISOString();
      const eventType = input.eventType ?? opportunity.eventType ?? "Repeat event";
      const lead: Lead = {
        id: nextId("lead"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        clientId: client.id,
        ownerId: input.ownerId ?? opportunity.assignedToId ?? currentUser?.id,
        stage: "New Inquiry",
        clientNameSnapshot: client.displayName,
        clientName: client.displayName,
        email: client.email,
        phone: client.phone ?? "",
        eventType,
        eventDate:
          input.eventDate ??
          opportunity.estimatedEventDate ??
          new Date().toISOString().slice(0, 10),
        estimatedGuestCount: 0,
        budgetRange: opportunity.estimatedValue
          ? `$${Math.round(opportunity.estimatedValue).toLocaleString()}`
          : "",
        notes:
          input.notes ??
          `Created from rebooking opportunity "${opportunity.title}". Review consent and scope before outreach.`,
        source: input.source ?? "Rebooking opportunity",
        createdAt: now,
      };
      const project: ProjectRecord = {
        id: nextId("project"),
        organizationId: lead.organizationId,
        leadId: lead.id,
        clientId: client.id,
        ownerId: lead.ownerId,
        name: `${client.displayName} ${eventType}`,
        stage: "Inquiry",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      };
      const convertedOpportunity: RebookingOpportunity = {
        ...opportunity,
        stage: "Converted",
        convertedLeadId: lead.id,
        convertedProjectId: project.id,
        respondedAt: now,
        nextAction: "Continue the repeat-client inquiry workflow.",
        nextActionAt: now,
        updatedAt: now,
      };
      lead.projectId = project.id;
      setData((current) => ({
        ...current,
        leads: [lead, ...current.leads],
        projects: [project, ...current.projects],
        rebookingOpportunities: current.rebookingOpportunities.map((item) =>
          item.id === opportunityId ? convertedOpportunity : item,
        ),
      }));
      return { opportunity: convertedOpportunity, lead, project };
    },
    [
      currentUser,
      data.clients,
      data.leads,
      data.projects,
      data.rebookingOpportunities,
      persistenceMode,
      refreshData,
    ],
  );

  const createMeeting = React.useCallback(
    async (input: CreateMeetingInput) => {
      const scopedActionItems = input.actionItems.filter((item) => item.title.trim().length > 0);
      const createdTasks = await Promise.all(
        scopedActionItems.map((item) =>
          createTask({
            projectId: input.projectId,
            leadId: input.leadId,
            eventId: input.eventId,
            ownerId: item.ownerId,
            title: item.title,
            description: `Action item from ${input.title}`,
            dueDate: item.dueDate ?? input.startAt.slice(0, 10),
            priority: "Medium",
          }),
        ),
      );

      const actionItemsWithTasks = scopedActionItems.map((item, index) => ({
        ...item,
        id: item.id || nextId("meeting-action"),
        dueDate: item.dueDate ?? input.startAt.slice(0, 10),
        taskId: createdTasks[index]?.id,
      }));

      const payload: CreateMeetingInput = {
        ...input,
        actionItems: actionItemsWithTasks,
      };

      if (persistenceMode === "supabase" && currentUser) {
        const meeting = await createIntegratedMeetingRequest(payload);
        setData((current) => ({
          ...current,
          meetings: [meeting, ...current.meetings],
        }));
        return meeting;
      }

      const meeting: MeetingRecord = {
        id: nextId("meeting"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...payload,
        createdAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        meetings: [meeting, ...current.meetings],
      }));
      return meeting;
    },
    [createTask, currentUser, persistenceMode],
  );

  const updateMeeting = React.useCallback(
    async (meetingId: string, input: UpdateMeetingInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const meeting = await updateMeetingInSupabase(meetingId, input);
        setData((current) => ({
          ...current,
          meetings: current.meetings.map((item) => (item.id === meetingId ? meeting : item)),
        }));
        return meeting;
      }

      const existing = data.meetings.find((meeting) => meeting.id === meetingId);
      const meeting: MeetingRecord = {
        id: meetingId,
        organizationId:
          existing?.organizationId ??
          currentUser?.organizationId ??
          initialEaseEventsData.organization.id,
        ...input,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        meetings: current.meetings.map((item) => (item.id === meetingId ? meeting : item)),
      }));
      return meeting;
    },
    [currentUser, data.meetings, persistenceMode],
  );

  const createProjectReminder = React.useCallback(
    async (input: CreateProjectReminderInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const reminder = await createProjectReminderInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          projectReminders: [reminder, ...current.projectReminders],
        }));
        return reminder;
      }

      const reminder: ProjectReminder = {
        id: nextId("reminder"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        assignedToId: input.assignedToId,
        title: input.title,
        dueAt: input.dueAt,
        status: input.status ?? "Open",
        automationSource: input.automationSource ?? "manual",
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        projectReminders: [reminder, ...current.projectReminders],
      }));
      return reminder;
    },
    [currentUser, persistenceMode],
  );

  const updateProjectReminder = React.useCallback(
    async (reminderId: string, input: UpdateProjectReminderInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const reminder = await updateProjectReminderInSupabase(reminderId, input);
        setData((current) => ({
          ...current,
          projectReminders: current.projectReminders.map((item) =>
            item.id === reminderId ? reminder : item,
          ),
        }));
        return reminder;
      }

      const existing = data.projectReminders.find((reminder) => reminder.id === reminderId);
      const reminder: ProjectReminder = {
        id: reminderId,
        organizationId:
          existing?.organizationId ??
          currentUser?.organizationId ??
          initialEaseEventsData.organization.id,
        projectId: input.projectId,
        assignedToId: input.assignedToId,
        title: input.title,
        dueAt: input.dueAt,
        status: input.status ?? "Open",
        automationSource: input.automationSource ?? existing?.automationSource ?? "manual",
        metadata: input.metadata ?? existing?.metadata ?? {},
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        projectReminders: current.projectReminders.map((item) =>
          item.id === reminderId ? reminder : item,
        ),
      }));
      return reminder;
    },
    [currentUser, data.projectReminders, persistenceMode],
  );

  const updateWorkflowAutomation = React.useCallback(
    async (automationId: string, input: UpdateWorkflowAutomationInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const automation = await updateWorkflowAutomationInSupabase(automationId, input);
        setData((current) => ({
          ...current,
          workflowAutomations: current.workflowAutomations.map((item) =>
            item.id === automationId ? automation : item,
          ),
        }));
        return automation;
      }

      const existing = data.workflowAutomations.find((item) => item.id === automationId);
      if (!existing) throw new Error("Automation not found.");
      const automation: WorkflowAutomation = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        workflowAutomations: current.workflowAutomations.map((item) =>
          item.id === automationId ? automation : item,
        ),
      }));
      return automation;
    },
    [currentUser, data.workflowAutomations, persistenceMode],
  );

  const updateNotification = React.useCallback(
    async (notificationId: string, input: UpdateNotificationInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const notification = await updateNotificationInSupabase(notificationId, input);
        setData((current) => ({
          ...current,
          notifications: current.notifications.map((item) =>
            item.id === notificationId ? notification : item,
          ),
        }));
        return notification;
      }

      const existing = data.notifications.find((item) => item.id === notificationId);
      if (!existing) throw new Error("Notification not found.");
      const notification: NotificationRecord = {
        ...existing,
        ...input,
        readAt: input.readAt === null ? undefined : (input.readAt ?? existing.readAt),
        dismissedAt:
          input.dismissedAt === null ? undefined : (input.dismissedAt ?? existing.dismissedAt),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === notificationId ? notification : item,
        ),
      }));
      return notification;
    },
    [currentUser, data.notifications, persistenceMode],
  );

  const markAllNotificationsRead = React.useCallback(async () => {
    const now = new Date().toISOString();
    const unread = data.notifications.filter(
      (notification) =>
        notification.status === "Unread" &&
        (!currentUser ||
          !notification.recipientUserId ||
          notification.recipientUserId === currentUser.id),
    );
    await Promise.all(
      unread.map((notification) =>
        updateNotification(notification.id, {
          status: "Read",
          readAt: now,
        }),
      ),
    );
  }, [currentUser, data.notifications, updateNotification]);

  const ensurePostEventCloseout = React.useCallback(
    async (input: EnsurePostEventCloseoutInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const result = await ensurePostEventCloseoutInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          postEventCloseouts: [
            result.closeout,
            ...current.postEventCloseouts.filter((item) => item.id !== result.closeout.id),
          ],
          postEventCloseoutItems: [
            ...result.items,
            ...current.postEventCloseoutItems.filter(
              (item) => item.closeoutId !== result.closeout.id,
            ),
          ],
          events: current.events.map((event) =>
            event.id === input.eventId ? { ...event, status: "Closeout In Progress" } : event,
          ),
          projects: current.projects.map((project) =>
            project.id === input.projectId ? { ...project, stage: "Post-Event" } : project,
          ),
        }));
        return result;
      }

      const existing = data.postEventCloseouts.find((item) => item.eventId === input.eventId);
      if (existing) {
        return {
          closeout: existing,
          items: data.postEventCloseoutItems.filter((item) => item.closeoutId === existing.id),
        };
      }

      const now = new Date().toISOString();
      const closeout: PostEventCloseout = {
        id: nextId("closeout"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        status: "Closeout In Progress",
        ownerId: input.ownerId,
        eventCompletedAt: input.eventCompletedAt ?? now,
        closeoutStartedAt: now,
        completionPercentage: 0,
        unresolvedIssueCount: 0,
        financialStatus: "Not Started",
        deliverableStatus: "Not Started",
        feedbackStatus: "Not Started",
        vendorReviewStatus: "Not Started",
        internalReviewStatus: "Not Started",
        retentionStatus: "Not Started",
        retentionHandoff: {},
        readinessOverrides: [],
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      const titles = [
        ["Operational", "Event-Day Mode completed", "Required"],
        ["Operational", "Actual timeline reviewed", "Required"],
        ["Operational", "Unresolved event-day issues assigned or resolved", "Required"],
        ["Financial", "Client balance reconciled or explicitly deferred", "Required"],
        ["Financial", "Vendor payments reconciled or explicitly deferred", "Required"],
        ["Financial", "Budget variance and final profitability reviewed", "Required"],
        ["Deliverables", "Final client-facing deliverables prepared", "Required"],
        ["Relationship", "Client feedback requested or intentionally deferred", "Recommended"],
        ["Relationship", "Vendor performance reviews completed", "Recommended"],
        ["Closure", "Internal retrospective completed", "Recommended"],
        ["Closure", "Retention and rebooking handoff classified", "Required"],
      ] as const;
      const items: PostEventCloseoutItem[] = titles.map(
        ([groupName, title, requirementLevel], index) => ({
          id: nextId("closeout-item"),
          organizationId: closeout.organizationId,
          closeoutId: closeout.id,
          projectId: input.projectId,
          eventId: input.eventId,
          groupName,
          title,
          requirementLevel,
          status: "Not Started",
          ownerId: input.ownerId,
          sortOrder: (index + 1) * 10,
          idempotencyKey: `${closeout.id}:${groupName}:${title}`.toLowerCase(),
          metadata: { seeded: true },
          createdAt: now,
          updatedAt: now,
        }),
      );

      setData((current) => ({
        ...current,
        postEventCloseouts: [closeout, ...current.postEventCloseouts],
        postEventCloseoutItems: [...items, ...current.postEventCloseoutItems],
        events: current.events.map((event) =>
          event.id === input.eventId ? { ...event, status: "Closeout In Progress" } : event,
        ),
        projects: current.projects.map((project) =>
          project.id === input.projectId ? { ...project, stage: "Post-Event" } : project,
        ),
      }));
      return { closeout, items };
    },
    [currentUser, data.postEventCloseoutItems, data.postEventCloseouts, persistenceMode],
  );

  const updatePostEventCloseout = React.useCallback(
    async (closeoutId: string, input: UpdatePostEventCloseoutInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const closeout = await updatePostEventCloseoutInSupabase(closeoutId, input);
        setData((current) => ({
          ...current,
          postEventCloseouts: current.postEventCloseouts.map((item) =>
            item.id === closeoutId ? closeout : item,
          ),
          events: current.events.map((event) =>
            event.id === closeout.eventId && input.status
              ? { ...event, status: input.status as EventRecord["status"] }
              : event,
          ),
          projects: current.projects.map((project) =>
            project.id === closeout.projectId && input.status === "Closed"
              ? { ...project, stage: "Completed" }
              : project,
          ),
        }));
        return closeout;
      }

      const existing = data.postEventCloseouts.find((item) => item.id === closeoutId);
      if (!existing) throw new Error("Closeout not found.");
      const closeout: PostEventCloseout = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        postEventCloseouts: current.postEventCloseouts.map((item) =>
          item.id === closeoutId ? closeout : item,
        ),
      }));
      return closeout;
    },
    [currentUser, data.postEventCloseouts, persistenceMode],
  );

  const updatePostEventCloseoutItem = React.useCallback(
    async (itemId: string, input: UpdatePostEventCloseoutItemInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const item = await updatePostEventCloseoutItemInSupabase(itemId, input);
        setData((current) => ({
          ...current,
          postEventCloseoutItems: current.postEventCloseoutItems.map((entry) =>
            entry.id === itemId ? item : entry,
          ),
        }));
        return item;
      }

      const existing = data.postEventCloseoutItems.find((item) => item.id === itemId);
      if (!existing) throw new Error("Closeout item not found.");
      const item: PostEventCloseoutItem = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        postEventCloseoutItems: current.postEventCloseoutItems.map((entry) =>
          entry.id === itemId ? item : entry,
        ),
      }));
      return item;
    },
    [currentUser, data.postEventCloseoutItems, persistenceMode],
  );

  const upsertFinalDeliverable = React.useCallback(
    async (input: UpsertFinalDeliverableInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const deliverable = await upsertFinalDeliverableInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          finalDeliverables: [
            deliverable,
            ...current.finalDeliverables.filter((item) => item.id !== deliverable.id),
          ],
        }));
        return deliverable;
      }

      const now = new Date().toISOString();
      const deliverable: FinalDeliverable = {
        id: input.id ?? nextId("deliverable"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        closeoutId: input.closeoutId,
        projectId: input.projectId,
        eventId: input.eventId,
        fileId: input.fileId,
        title: input.title,
        description: input.description,
        category: input.category,
        externalUrl: input.externalUrl,
        clientVisible: input.clientVisible,
        status: input.status,
        dueDate: input.dueDate,
        deliveredAt: input.deliveredAt,
        deliveredById: input.deliveredById,
        expiresAt: input.expiresAt,
        accessState: "Available",
        sortOrder: input.sortOrder ?? 0,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        finalDeliverables: [
          deliverable,
          ...current.finalDeliverables.filter((item) => item.id !== deliverable.id),
        ],
      }));
      return deliverable;
    },
    [currentUser, persistenceMode],
  );

  const submitClientFeedback = React.useCallback(
    async (input: SubmitClientFeedbackInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const feedback = await submitClientFeedbackInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          clientFeedbackResponses: [
            feedback,
            ...current.clientFeedbackResponses.filter((item) => item.id !== feedback.id),
          ],
        }));
        return feedback;
      }

      const now = new Date().toISOString();
      const feedback: ClientFeedbackResponse = {
        id: nextId("feedback"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        closeoutId: input.closeoutId,
        projectId: input.projectId,
        eventId: input.eventId,
        clientId: input.clientId,
        submittedById: input.submittedById,
        responderName: input.responderName,
        responderEmail: input.responderEmail,
        overallSatisfaction: input.overallSatisfaction,
        communicationRating: input.communicationRating,
        planningProcessRating: input.planningProcessRating,
        executionRating: input.executionRating,
        valueRating: input.valueRating,
        likelihoodToRecommend: input.likelihoodToRecommend,
        whatWentWell: input.whatWentWell,
        whatCouldImprove: input.whatCouldImprove,
        additionalComments: input.additionalComments,
        permissionToContact: input.permissionToContact ?? false,
        concernLevel: input.concernLevel ?? "None",
        serviceRecoveryStatus: input.serviceRecoveryStatus ?? "Not Required",
        submittedAt: now,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        clientFeedbackResponses: [feedback, ...current.clientFeedbackResponses],
      }));
      return feedback;
    },
    [currentUser, persistenceMode],
  );

  const upsertClientConsent = React.useCallback(
    async (input: UpsertClientConsentInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const consent = await upsertClientConsentInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          clientConsents: [
            consent,
            ...current.clientConsents.filter((item) => item.id !== consent.id),
          ],
        }));
        return consent;
      }

      const now = new Date().toISOString();
      const existing = data.clientConsents.find(
        (item) =>
          item.projectId === input.projectId &&
          item.clientId === input.clientId &&
          item.consentType === input.consentType,
      );
      const consent: ClientConsent = {
        id: existing?.id ?? nextId("consent"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        clientId: input.clientId,
        consentType: input.consentType,
        status: input.status,
        consentWordingVersion: input.consentWordingVersion ?? "v1",
        requestedAt: input.requestedAt,
        grantedAt: input.grantedAt,
        declinedAt: input.declinedAt,
        revokedAt: input.revokedAt,
        expiresAt: input.expiresAt,
        source: input.source,
        capturedById: input.capturedById,
        metadata: input.metadata ?? {},
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        clientConsents: [
          consent,
          ...current.clientConsents.filter((item) => item.id !== consent.id),
        ],
      }));
      return consent;
    },
    [currentUser, data.clientConsents, persistenceMode],
  );

  const upsertVendorPerformanceReview = React.useCallback(
    async (input: UpsertVendorPerformanceReviewInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const review = await upsertVendorPerformanceReviewInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          vendorPerformanceReviews: [
            review,
            ...current.vendorPerformanceReviews.filter((item) => item.id !== review.id),
          ],
        }));
        return review;
      }

      const now = new Date().toISOString();
      const existing = data.vendorPerformanceReviews.find(
        (item) => item.eventVendorId === input.eventVendorId,
      );
      const review: VendorPerformanceReview = {
        id: existing?.id ?? nextId("vendor-review"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        eventVendorId: input.eventVendorId,
        vendorId: input.vendorId,
        reviewerId: input.reviewerId,
        overallRating: input.overallRating,
        communicationRating: input.communicationRating,
        punctualityRating: input.punctualityRating,
        qualityRating: input.qualityRating,
        budgetAccuracyRating: input.budgetAccuracyRating,
        professionalismRating: input.professionalismRating,
        issueCount: input.issueCount ?? 0,
        wouldUseAgain: input.wouldUseAgain,
        preferredVendorRecommendation: input.preferredVendorRecommendation,
        operationalContext: input.operationalContext ?? {},
        notes: input.notes,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        vendorPerformanceReviews: [
          review,
          ...current.vendorPerformanceReviews.filter((item) => item.id !== review.id),
        ],
      }));
      return review;
    },
    [currentUser, data.vendorPerformanceReviews, persistenceMode],
  );

  const upsertInternalRetrospective = React.useCallback(
    async (input: UpsertInternalRetrospectiveInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const retrospective = await upsertInternalRetrospectiveInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          internalRetrospectives: [
            retrospective,
            ...current.internalRetrospectives.filter((item) => item.id !== retrospective.id),
          ],
        }));
        return retrospective;
      }

      const now = new Date().toISOString();
      const existing = data.internalRetrospectives.find(
        (item) => item.projectId === input.projectId,
      );
      const retrospective: InternalRetrospective = {
        id: existing?.id ?? nextId("retrospective"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        closeoutId: input.closeoutId,
        projectId: input.projectId,
        eventId: input.eventId,
        status: input.status,
        facilitatorId: input.facilitatorId,
        contributors: input.contributors ?? [],
        whatWentWell: input.whatWentWell,
        whatDidNotGoWell: input.whatDidNotGoWell,
        majorDelays: input.majorDelays,
        clientRequestChanges: input.clientRequestChanges,
        vendorIssues: input.vendorIssues,
        teamIssues: input.teamIssues,
        budgetLessons: input.budgetLessons,
        schedulingLessons: input.schedulingLessons,
        venueLessons: input.venueLessons,
        processImprovements: input.processImprovements,
        templateChangesRecommended: input.templateChangesRecommended,
        reusableIdeas: input.reusableIdeas,
        risksToAvoid: input.risksToAvoid,
        reviewedAt: input.reviewedAt,
        reviewedById: input.reviewedById,
        aiSummary: input.aiSummary,
        aiSummaryGeneratedAt: input.aiSummaryGeneratedAt,
        metadata: input.metadata ?? {},
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      setData((current) => ({
        ...current,
        internalRetrospectives: [
          retrospective,
          ...current.internalRetrospectives.filter((item) => item.id !== retrospective.id),
        ],
      }));
      return retrospective;
    },
    [currentUser, data.internalRetrospectives, persistenceMode],
  );

  const createCloseoutFinancialSnapshot = React.useCallback(
    async (input: CreateCloseoutFinancialSnapshotInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const snapshot = await createCloseoutFinancialSnapshotInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          closeoutFinancialSnapshots: [
            snapshot,
            ...current.closeoutFinancialSnapshots.filter((item) => item.id !== snapshot.id),
          ],
        }));
        return snapshot;
      }

      const snapshot: CloseoutFinancialSnapshot = {
        id: nextId("closeout-snapshot"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        ...input,
        calculationVersion: input.calculationVersion ?? "phase4-v1",
        generatedAt: new Date().toISOString(),
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        closeoutFinancialSnapshots: [snapshot, ...current.closeoutFinancialSnapshots],
      }));
      return snapshot;
    },
    [currentUser, persistenceMode],
  );

  const upsertEventDaySession = React.useCallback(
    async (input: UpsertEventDaySessionInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const session = await upsertEventDaySessionInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          eventDaySessions: [
            session,
            ...current.eventDaySessions.filter((item) => item.id !== session.id),
          ],
        }));
        return session;
      }

      const existing = data.eventDaySessions.find((item) => item.eventId === input.eventId);
      const session: EventDaySession = {
        id: existing?.id ?? nextId("event-day-session"),
        organizationId:
          existing?.organizationId ??
          currentUser?.organizationId ??
          initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        status: input.status,
        eventDayLeadId: input.eventDayLeadId,
        activeTimelineVersionId: input.activeTimelineVersionId,
        activatedById: input.activatedById,
        activatedAt: input.activatedAt,
        pausedAt: input.pausedAt,
        completedById: input.completedById,
        completedAt: input.completedAt,
        archivedAt: input.archivedAt,
        unresolvedWarnings: input.unresolvedWarnings ?? [],
        readinessOverrides: input.readinessOverrides ?? [],
        offlineManifest: input.offlineManifest ?? {},
        metadata: input.metadata ?? {},
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        eventDaySessions: [
          session,
          ...current.eventDaySessions.filter((item) => item.id !== session.id),
        ],
      }));
      return session;
    },
    [currentUser, data.eventDaySessions, persistenceMode],
  );

  const createTimelineVersion = React.useCallback(
    async (input: CreateTimelineVersionInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const version = await createTimelineVersionInSupabase(currentUser.organizationId, input);
        setData((current) => ({
          ...current,
          timelineVersions: [version, ...current.timelineVersions],
        }));
        return version;
      }

      const version: TimelineVersion = {
        id: nextId("timeline-version"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        versionNumber: input.versionNumber,
        status: input.status,
        finalizedById: input.finalizedById,
        finalizedAt: input.finalizedAt,
        changeReason: input.changeReason,
        snapshot: input.snapshot,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        timelineVersions: [version, ...current.timelineVersions],
      }));
      return version;
    },
    [currentUser, persistenceMode],
  );

  const upsertEventDayVendorStatus = React.useCallback(
    async (input: UpsertEventDayVendorStatusInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const status = await upsertEventDayVendorStatusInSupabase(
          currentUser.organizationId,
          input,
        );
        setData((current) => ({
          ...current,
          eventDayVendorStatuses: [
            status,
            ...current.eventDayVendorStatuses.filter((item) => item.id !== status.id),
          ],
        }));
        return status;
      }

      const existing = data.eventDayVendorStatuses.find(
        (item) => item.eventVendorId === input.eventVendorId,
      );
      const status: EventDayVendorStatusRecord = {
        id: existing?.id ?? nextId("event-day-vendor"),
        organizationId:
          existing?.organizationId ??
          currentUser?.organizationId ??
          initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        eventVendorId: input.eventVendorId,
        vendorId: input.vendorId,
        status: input.status,
        arrivalTime: input.arrivalTime,
        setupWindowStart: input.setupWindowStart,
        setupWindowEnd: input.setupWindowEnd,
        serviceStartAt: input.serviceStartAt,
        breakdownAt: input.breakdownAt,
        assignedLocation: input.assignedLocation,
        deliverables: input.deliverables,
        delayMinutes: input.delayMinutes ?? 0,
        issueSummary: input.issueSummary,
        checkedInById: input.checkedInById,
        checkedInAt: input.checkedInAt,
        notes: input.notes,
        metadata: input.metadata ?? {},
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        eventDayVendorStatuses: [
          status,
          ...current.eventDayVendorStatuses.filter((item) => item.id !== status.id),
        ],
      }));
      return status;
    },
    [currentUser, data.eventDayVendorStatuses, persistenceMode],
  );

  const createEventDayIssue = React.useCallback(
    async (input: CreateEventDayIssueInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const issue = await createEventDayIssueInSupabase(currentUser.organizationId, input);
        setData((current) => ({ ...current, eventDayIssues: [issue, ...current.eventDayIssues] }));
        return issue;
      }

      const issue: EventDayIssue = {
        id: nextId("event-day-issue"),
        organizationId: currentUser?.organizationId ?? initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        timelineItemId: input.timelineItemId,
        vendorId: input.vendorId,
        reportedById: input.reportedById,
        assignedToId: input.assignedToId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description,
        status: input.status ?? "Open",
        resolution: input.resolution,
        openedAt: input.openedAt ?? new Date().toISOString(),
        resolvedAt: input.resolvedAt,
        metadata: input.metadata ?? {},
        idempotencyKey: input.idempotencyKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({ ...current, eventDayIssues: [issue, ...current.eventDayIssues] }));
      return issue;
    },
    [currentUser, persistenceMode],
  );

  const updateEventDayIssue = React.useCallback(
    async (issueId: string, input: UpdateEventDayIssueInput) => {
      if (persistenceMode === "supabase" && currentUser) {
        const issue = await updateEventDayIssueInSupabase(issueId, input);
        setData((current) => ({
          ...current,
          eventDayIssues: current.eventDayIssues.map((item) =>
            item.id === issueId ? issue : item,
          ),
        }));
        return issue;
      }

      const existing = data.eventDayIssues.find((issue) => issue.id === issueId);
      const issue: EventDayIssue = {
        id: issueId,
        organizationId:
          existing?.organizationId ??
          currentUser?.organizationId ??
          initialEaseEventsData.organization.id,
        projectId: input.projectId,
        eventId: input.eventId,
        timelineItemId: input.timelineItemId,
        vendorId: input.vendorId,
        reportedById: input.reportedById,
        assignedToId: input.assignedToId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description,
        status: input.status,
        resolution: input.resolution,
        openedAt: input.openedAt ?? existing?.openedAt ?? new Date().toISOString(),
        resolvedAt: input.resolvedAt,
        metadata: input.metadata ?? existing?.metadata ?? {},
        idempotencyKey: input.idempotencyKey ?? existing?.idempotencyKey,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        eventDayIssues: current.eventDayIssues.map((item) => (item.id === issueId ? issue : item)),
      }));
      return issue;
    },
    [currentUser, data.eventDayIssues, persistenceMode],
  );

  const value = React.useMemo(
    () => ({
      data,
      isLoading,
      error,
      persistenceMode,
      refreshData,
      resetDemoData,
      updateOrganizationEmailIdentity,
      updateOrganizationEmailSignature,
      createLead,
      updateLead,
      updateLeadStage,
      convertLeadToEvent,
      updateEventDetails,
      updateClientDetails,
      provisionClientPortalAccess,
      updateTaskStatus,
      updateTaskOwner,
      updateTaskWorkState,
      toggleChecklistItem,
      createTaskLabel,
      setTaskLabels,
      setTaskParticipants,
      createTaskChecklist,
      createTaskChecklistItem,
      updateTaskChecklistItem,
      createTaskComment,
      attachTaskFile,
      createTaskInboxItem,
      updateTaskInboxItem,
      updateApprovalStatus,
      createTask,
      updateTask,
      createTimelineItem,
      updateTimelineItem,
      addEventTeamMember,
      removeEventTeamMember,
      createBudgetItem,
      updateBudgetItem,
      createInvoice,
      updateInvoice,
      createExpense,
      updateExpense,
      recordExpensePayment,
      attachExpenseFile,
      saveProposalDraft,
      sendProposal,
      recordOfflinePayment,
      approveProjectBooking,
      createVendor,
      createEventVendor,
      addFile,
      createCommunicationThread,
      addCommunicationMessage,
      createClientMilestone,
      updateClientMilestone,
      createRebookingOpportunity,
      updateRebookingOpportunity,
      createClientReferralLink,
      createReferral,
      updateReferral,
      createCommunicationEligibilityLog,
      convertRebookingOpportunity,
      createMeeting,
      updateMeeting,
      createProjectReminder,
      updateProjectReminder,
      updateWorkflowAutomation,
      updateNotification,
      markAllNotificationsRead,
      ensurePostEventCloseout,
      updatePostEventCloseout,
      updatePostEventCloseoutItem,
      upsertFinalDeliverable,
      submitClientFeedback,
      upsertClientConsent,
      upsertVendorPerformanceReview,
      upsertInternalRetrospective,
      createCloseoutFinancialSnapshot,
      upsertEventDaySession,
      createTimelineVersion,
      upsertEventDayVendorStatus,
      createEventDayIssue,
      updateEventDayIssue,
    }),
    [
      addFile,
      addCommunicationMessage,
      addEventTeamMember,
      attachTaskFile,
      attachExpenseFile,
      convertRebookingOpportunity,
      createBudgetItem,
      createClientMilestone,
      createClientReferralLink,
      createCommunicationThread,
      createCommunicationEligibilityLog,
      createEventVendor,
      createInvoice,
      createMeeting,
      createProjectReminder,
      createTimelineVersion,
      createCloseoutFinancialSnapshot,
      createExpense,
      createEventDayIssue,
      createRebookingOpportunity,
      createReferral,
      approveProjectBooking,
      convertLeadToEvent,
      createLead,
      createTask,
      createTaskChecklist,
      createTaskChecklistItem,
      createTaskComment,
      createTaskInboxItem,
      createTaskLabel,
      createTimelineItem,
      createVendor,
      data,
      error,
      ensurePostEventCloseout,
      isLoading,
      markAllNotificationsRead,
      persistenceMode,
      provisionClientPortalAccess,
      refreshData,
      removeEventTeamMember,
      recordOfflinePayment,
      recordExpensePayment,
      resetDemoData,
      saveProposalDraft,
      sendProposal,
      setTaskLabels,
      setTaskParticipants,
      submitClientFeedback,
      toggleChecklistItem,
      upsertClientConsent,
      upsertFinalDeliverable,
      updateApprovalStatus,
      updateBudgetItem,
      updateClientDetails,
      updateClientMilestone,
      updateEventDetails,
      updateExpense,
      updateInvoice,
      updateLead,
      updateLeadStage,
      updateMeeting,
      updateOrganizationEmailIdentity,
      updateOrganizationEmailSignature,
      updateProjectReminder,
      updateRebookingOpportunity,
      updateReferral,
      updateEventDayIssue,
      updateWorkflowAutomation,
      updateNotification,
      upsertEventDaySession,
      updatePostEventCloseout,
      updatePostEventCloseoutItem,
      upsertInternalRetrospective,
      upsertVendorPerformanceReview,
      upsertEventDayVendorStatus,
      updateTask,
      updateTaskChecklistItem,
      updateTaskInboxItem,
      updateTaskOwner,
      updateTaskStatus,
      updateTaskWorkState,
      updateTimelineItem,
    ],
  );

  return <EaseEventsStore.Provider value={value}>{children}</EaseEventsStore.Provider>;
}

export function useEaseEventsStore() {
  const value = React.useContext(EaseEventsStore);
  if (!value) throw new Error("useEaseEventsStore must be used inside EaseEventsProvider.");
  return value;
}
