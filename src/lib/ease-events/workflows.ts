import type {
  EaseEventsData,
  NotificationSeverity,
  ProjectRecord,
  WorkflowAutomation,
  WorkflowAutomationAction,
  WorkflowEvent,
} from "./types";

export const workflowTriggers = [
  {
    value: "inquiry_created",
    label: "Inquiry created",
    description: "A new public or staff-created inquiry entered the pipeline.",
  },
  {
    value: "consultation_starting_soon",
    label: "Consultation starting soon",
    description: "A consultation is inside the configured reminder window.",
  },
  {
    value: "proposal_not_viewed",
    label: "Proposal not viewed",
    description: "A sent proposal has not been opened after the follow-up window.",
  },
  {
    value: "invoice_overdue",
    label: "Invoice overdue",
    description: "A client invoice has passed its due date with an open balance.",
  },
  {
    value: "task_overdue",
    label: "Task overdue",
    description: "A planner task passed its due date while still open.",
  },
  {
    value: "approval_due",
    label: "Approval due",
    description: "A client approval is approaching or past its due date.",
  },
  {
    value: "event_day_readiness_due",
    label: "Event-day readiness due",
    description: "An event is close enough that the command center should be reviewed.",
  },
  {
    value: "event_completed",
    label: "Event completed",
    description: "An event moved into post-event wrap-up or completion.",
  },
  {
    value: "event_day_completed",
    label: "Event-Day completed",
    description: "Event-Day Command Mode finished and the closeout handoff should begin.",
  },
  {
    value: "closeout_feedback_due",
    label: "Closeout feedback due",
    description: "A client feedback request should be prepared after event completion.",
  },
  {
    value: "final_deliverable_due",
    label: "Final deliverable due",
    description: "A post-event deliverable is due soon or overdue.",
  },
  {
    value: "vendor_review_due",
    label: "Vendor review due",
    description: "Assigned event vendors need post-event performance reviews.",
  },
  {
    value: "financial_closeout_due",
    label: "Financial closeout due",
    description: "Post-event financial reconciliation needs staff review.",
  },
  {
    value: "project_closed",
    label: "Project closed",
    description: "A closed project is ready for relationship handoff and retention review.",
  },
  {
    value: "milestone_due",
    label: "Client milestone due",
    description: "A confirmed client milestone is inside the configured review window.",
  },
  {
    value: "corporate_recurrence_due",
    label: "Corporate recurrence due",
    description: "A repeat corporate or annual event opportunity should be reviewed.",
  },
  {
    value: "repeat_client_follow_up_due",
    label: "Repeat-client follow-up due",
    description: "A past client has a safe, staff-reviewed relationship follow-up due.",
  },
  {
    value: "referral_converted",
    label: "Referral converted",
    description: "A referral became qualified or converted and needs relationship follow-up.",
  },
  {
    value: "dormant_client_due",
    label: "Dormant client review due",
    description:
      "A previously valuable client has gone quiet and should be reviewed before outreach.",
  },
] as const;

export const workflowActions = [
  {
    value: "send_in_app_notification",
    label: "Send in-app notification",
    description: "Creates a staff-visible notification with a deep link.",
  },
  {
    value: "create_reminder",
    label: "Create reminder",
    description: "Creates a project reminder assigned to the owner or selected team member.",
  },
  {
    value: "create_project_note",
    label: "Create project note",
    description: "Adds an internal activity/note to the project history.",
  },
  {
    value: "create_email_draft",
    label: "Create email draft",
    description: "Records a safe draft/test communication message without live delivery.",
  },
] as const;

export function getWorkflowTriggerLabel(triggerType: string) {
  return workflowTriggers.find((trigger) => trigger.value === triggerType)?.label ?? triggerType;
}

export function getWorkflowActionLabel(actionType: string) {
  return workflowActions.find((action) => action.value === actionType)?.label ?? actionType;
}

export function getAutomationActions(
  automation: WorkflowAutomation,
  actions: WorkflowAutomationAction[],
) {
  return actions
    .filter((action) => action.automationId === automation.id && action.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getProjectOwnerId(project: ProjectRecord | undefined, data: EaseEventsData) {
  if (project?.ownerId) return project.ownerId;
  const admin = data.users.find((user) => user.role === "admin");
  return admin?.id ?? data.users[0]?.id;
}

export function buildWorkflowEventDedupeKey(params: {
  organizationId: string;
  eventType: string;
  sourceTable?: string;
  sourceRecordId?: string;
  projectId?: string;
  occurredAt?: string;
}) {
  return [
    params.organizationId,
    params.eventType,
    params.sourceTable ?? "manual",
    params.sourceRecordId ?? params.projectId ?? "none",
    params.occurredAt?.slice(0, 10) ?? "once",
  ].join(":");
}

export function buildWorkflowExecutionIdempotencyKey(
  event: Pick<WorkflowEvent, "id" | "dedupeKey">,
  automation: Pick<WorkflowAutomation, "id">,
) {
  return `${event.dedupeKey}:${automation.id}`;
}

export function getNotificationSeverity(value: unknown): NotificationSeverity {
  if (value === "Critical" || value === "Warning" || value === "Success" || value === "Info") {
    return value;
  }
  return "Info";
}

export function summarizeAutomation(
  automation: WorkflowAutomation,
  actions: WorkflowAutomationAction[],
) {
  const activeActions = getAutomationActions(automation, actions);
  return `${getWorkflowTriggerLabel(automation.triggerType)} -> ${activeActions
    .map((action) => getWorkflowActionLabel(action.actionType))
    .join(", ")}`;
}
