import * as React from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  Inbox,
  MessageSquare,
  Pencil,
  Plus,
  Radio,
  ReceiptText,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  Wallet,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useEaseEventsAuth } from "@/lib/ease-events/auth";
import { easeEventsBrand } from "@/lib/ease-events/brand";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getEffectiveMeetingStatus,
  getInitials,
  isOverdueTask,
  isUpcomingMeeting,
  isUpcomingEvent,
} from "@/lib/ease-events/calculations";
import {
  hasGoogleMeetConfig,
  hasGoogleWorkspaceConfig,
  hasMicrosoft365Config,
  hasOpenAIConfig,
  hasStripeConfig,
  hasSupabaseConfig,
} from "@/lib/ease-events/config";
import { runAIPlaceholder, type AIFeature } from "@/lib/ease-events/ai";
import {
  createCheckoutSession,
  dollarsToCents,
  type CheckoutAmountType,
} from "@/lib/ease-events/payments";
import { getGlobalFinanceSummary, getProjectFinanceSummary } from "@/lib/ease-events/finance";
import { buildCalendarProjection } from "@/lib/ease-events/calendar";
import {
  buildCloseoutReadiness,
  getCloseoutItems,
  getEventCloseout,
} from "@/lib/ease-events/closeout";
import {
  buildEligibilityLogInput,
  getClientRelationshipMetrics,
  getCommunicationEligibility,
  getRetentionActionItems,
} from "@/lib/ease-events/retention";
import { getWorkflowTriggerLabel } from "@/lib/ease-events/workflows";
import type {
  CreateCloseoutFinancialSnapshotInput,
  CreateTimelineItemInput,
  EnsurePostEventCloseoutInput,
  UpdatePostEventCloseoutInput,
  UpdatePostEventCloseoutItemInput,
  UpdateLeadInput,
  UpdateTimelineItemInput,
  UpsertClientConsentInput,
  UpsertFinalDeliverableInput,
  UpsertInternalRetrospectiveInput,
  UpsertVendorPerformanceReviewInput,
} from "@/lib/ease-events/supabase-repository";
import { useEaseEventsStore } from "@/lib/ease-events/store";
import {
  approvalTypes,
  budgetCategories,
  clientStatuses,
  clientMilestoneTypes,
  eventStatuses,
  invoiceStatuses,
  invoiceTypes,
  leadStages,
  rebookingOpportunityStages,
  rebookingOpportunityTypes,
  timelineItemStatuses,
  taskPriorities,
  taskStatuses,
  type ApprovalStatus,
  type BudgetItem,
  type BudgetCategory,
  type ClientRecord,
  type EaseEventsData,
  type EventVendor,
  type EventStatus,
  type EventRecord,
  type InvoiceRecord,
  type InvoiceStatus,
  type InvoiceType,
  type Lead,
  type LeadStage,
  type ProjectRecord,
  type RebookingOpportunity,
  type ProposalLineItem,
  type ProposalPaymentTerm,
  type ProposalRecord,
  type ProposalResponse,
  type ProposalVersion,
  type PostEventCloseout,
  type PostEventCloseoutItem,
  type TimelineItem,
  type TaskRecord,
  type TaskPriority,
  type TaskStatus,
  type UpdateClientDetailsInput,
  type UpdateEventDetailsInput,
  type UserRole,
} from "@/lib/ease-events/types";
import { cn } from "@/lib/utils";

import { BudgetSummaryGrid } from "./budget-summary-grid";
import { CalendarWorkspace } from "./calendar-workspace";
import { ClientMeetingsPanel, EventCommunicationsPanel } from "./communications-page";
import { ActionHub, type ActionHubItem } from "./action-hub";
import { EmptyState } from "./empty-state";
import { FileUploadPanel } from "./file-upload-panel";
import { ProjectTaskWorkspace } from "./work-management";
import {
  FinanceReportPanel,
  GlobalFinancePanel,
  ProjectFinancePanel,
  VendorFinancialSummary,
} from "./finance-panels";
import { PageHeader } from "./app-shell";
import { MetricCard } from "./metric-card";
import { StatusBadge } from "./status-badge";

function eventHref(eventId: string) {
  return `/ease-events/events/${eventId}`;
}

function eventDayHref(eventId: string) {
  return `${eventHref(eventId)}/event-day`;
}

function leadHref(leadId: string) {
  return `/ease-events/leads/${leadId}`;
}

function clientHref(clientId: string) {
  return `/ease-events/clients/${clientId}`;
}

function vendorHref(vendorId: string) {
  return `/ease-events/vendors/${vendorId}`;
}

function withQuery(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function normalizeDecimalInput(value: string, precision = 2) {
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[^\d.]/g, "");
  const [whole, ...decimalParts] = cleaned.split(".");
  if (!decimalParts.length) return whole;
  return `${whole}.${decimalParts.join("").slice(0, precision)}`;
}

function parseDecimalInput(value: string | number | undefined, precision = 2) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value?.trim()) return 0;
  const parsed = Number(normalizeDecimalInput(value, precision));
  if (!Number.isFinite(parsed)) return 0;
  const factor = 10 ** precision;
  return Math.round(parsed * factor) / factor;
}

function readQueryParam(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

function getPaymentReturnState() {
  if (typeof window === "undefined") return null;
  const payment = new URLSearchParams(window.location.search).get("payment");
  if (payment !== "success" && payment !== "cancelled") return null;
  return payment;
}

function getLeadForEvent(data: EaseEventsData, event: EventRecord) {
  return (
    data.leads.find((lead) => lead.convertedEventId === event.id) ??
    data.leads.find((lead) => lead.id === event.leadId)
  );
}

function getProjectForLead(data: EaseEventsData, lead: Lead) {
  return (
    data.projects.find((project) => project.id === lead.projectId) ??
    data.projects.find((project) => project.leadId === lead.id)
  );
}

function getProjectForEvent(data: EaseEventsData, event: EventRecord) {
  return (
    data.projects.find((project) => project.id === event.projectId) ??
    data.projects.find((project) => project.eventId === event.id) ??
    (event.leadId ? data.projects.find((project) => project.leadId === event.leadId) : undefined)
  );
}

function getProjectIdForLead(data: EaseEventsData, lead: Lead) {
  return lead.projectId ?? getProjectForLead(data, lead)?.id;
}

function getProjectIdForEvent(data: EaseEventsData, event: EventRecord) {
  return event.projectId ?? getProjectForEvent(data, event)?.id;
}

function getClientForEvent(data: EaseEventsData, event: EventRecord) {
  return (
    data.clients.find((client) => client.id === event.clientId) ??
    data.clients.find((client) => client.email.toLowerCase() === event.clientEmail.toLowerCase())
  );
}

function getClientForLead(data: EaseEventsData, lead: Lead) {
  return (
    data.clients.find((client) => client.id === lead.clientId) ??
    data.clients.find((client) => client.email.toLowerCase() === lead.email.toLowerCase())
  );
}

function getEventClientName(data: EaseEventsData, event: EventRecord) {
  const client = getClientForEvent(data, event);
  return client?.displayName ?? event.clientNameSnapshot ?? event.clientName;
}

function getLeadClientName(data: EaseEventsData, lead: Lead) {
  const client = getClientForLead(data, lead);
  return client?.displayName ?? lead.clientNameSnapshot ?? lead.clientName;
}

function getEventClientKey(data: EaseEventsData, event: EventRecord) {
  return (
    event.clientId ??
    getClientForEvent(data, event)?.id ??
    event.clientEmail ??
    event.clientNameSnapshot ??
    event.clientName
  );
}

function getLeadClientKey(data: EaseEventsData, lead: Lead) {
  return (
    lead.clientId ??
    getClientForLead(data, lead)?.id ??
    lead.email ??
    lead.clientNameSnapshot ??
    lead.clientName
  );
}

function getClientOptions(data: EaseEventsData) {
  const options = new Map<string, { key: string; name: string }>();
  data.clients.forEach((client) => {
    const key = client.id;
    options.set(key, { key, name: client.displayName });
  });
  data.events.forEach((event) => {
    const key = getEventClientKey(data, event);
    const name = getEventClientName(data, event);
    if (!options.has(key)) {
      options.set(key, { key, name });
    }
  });
  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name));
}

interface ClientDirectoryRecord {
  client?: ClientRecord;
  id: string;
  name: string;
  email: string;
  phone: string;
  status: ClientRecord["status"];
  source?: string;
  notes?: string;
  lifetimeValue: number;
  events: EventRecord[];
  leads: Lead[];
  pendingApprovals: number;
  lastActivityAt?: string;
}

function getClientDirectoryRecords(data: EaseEventsData): ClientDirectoryRecord[] {
  const records = new Map<string, ClientDirectoryRecord>();

  data.clients.forEach((client) => {
    records.set(client.id, {
      client,
      id: client.id,
      name: client.displayName,
      email: client.email,
      phone: client.phone ?? "",
      status: client.status,
      source: client.source,
      notes: client.notes,
      lifetimeValue: client.lifetimeValue,
      events: [],
      leads: [],
      pendingApprovals: 0,
      lastActivityAt: client.lastContactedAt ?? client.createdAt,
    });
  });

  function findRecord({
    clientId,
    email,
    name,
    phone,
  }: {
    clientId?: string;
    email: string;
    name: string;
    phone?: string;
  }) {
    const byId = clientId ? records.get(clientId) : undefined;
    if (byId) return byId;

    const normalizedEmail = email.toLowerCase();
    const byEmail = Array.from(records.values()).find(
      (record) => record.email.toLowerCase() === normalizedEmail,
    );
    if (byEmail) return byEmail;

    const fallbackId = email || name;
    const fallback =
      records.get(fallbackId) ??
      ({
        id: fallbackId,
        name,
        email,
        phone: phone ?? "",
        status: "Active",
        lifetimeValue: 0,
        events: [],
        leads: [],
        pendingApprovals: 0,
      } satisfies ClientDirectoryRecord);
    records.set(fallbackId, fallback);
    return fallback;
  }

  data.events.forEach((event) => {
    const record = findRecord({
      clientId: event.clientId,
      email: event.clientEmail,
      name: getEventClientName(data, event),
      phone: event.clientPhone,
    });
    record.events.push(event);
    if (!record.client) {
      record.lifetimeValue = Math.max(record.lifetimeValue, 0) + event.clientPrice;
    }
    record.pendingApprovals += data.approvals.filter(
      (approval) => approval.eventId === event.id && approval.status === "Pending",
    ).length;
    record.lastActivityAt = event.createdAt;
  });

  data.leads.forEach((lead) => {
    const record = findRecord({
      clientId: lead.clientId,
      email: lead.email,
      name: getLeadClientName(data, lead),
      phone: lead.phone,
    });
    record.leads.push(lead);
    record.source = record.source ?? lead.source;
    record.notes = record.notes ?? lead.notes;
    record.lastActivityAt = record.lastActivityAt ?? lead.createdAt;
  });

  return Array.from(records.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function formatTimelineTime(value?: string) {
  if (!value) return "";
  const [hour = "0", minute = "00"] = value.split(":");
  const hourNumber = Number(hour);
  const displayHour = hourNumber % 12 || 12;
  const period = hourNumber >= 12 ? "PM" : "AM";
  return `${displayHour}:${minute} ${period}`;
}

function getEventPaymentStatus(item: BudgetItem) {
  const balance = getBudgetItemBalance(item);
  if (balance <= 0) return "Paid";
  if (item.dueDate && isOverdueDate(item.dueDate)) return "Overdue";
  return "Balance Due";
}

function getBudgetItemBillableAmount(item: BudgetItem) {
  return item.actualAmount > 0 ? item.actualAmount : item.plannedAmount;
}

function getBudgetItemBalance(item: BudgetItem) {
  return Math.max(getBudgetItemBillableAmount(item) - item.paidAmount, 0);
}

function getInvoiceBalance(invoice: InvoiceRecord) {
  return Math.max(invoice.amount - invoice.paidAmount, 0);
}

function getEffectiveInvoiceStatus(invoice: InvoiceRecord): InvoiceStatus {
  if (invoice.status === "Void") return "Void";
  if (getInvoiceBalance(invoice) <= 0) return "Paid";
  if (invoice.paidAmount > 0) return "Partially Paid";
  if (invoice.dueDate && isOverdueDate(invoice.dueDate)) return "Overdue";
  return invoice.status;
}

function getProjectProposal(data: EaseEventsData, projectId?: string) {
  if (!projectId) return undefined;
  return data.proposals
    .filter((proposal) => proposal.projectId === projectId && proposal.status !== "Cancelled")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function getProposalVersion(data: EaseEventsData, proposal?: ProposalRecord) {
  if (!proposal) return undefined;
  return (
    data.proposalVersions.find((version) => version.id === proposal.currentVersionId) ??
    data.proposalVersions
      .filter((version) => version.proposalId === proposal.id)
      .sort((a, b) => b.versionNumber - a.versionNumber)[0]
  );
}

function getProposalLineItems(data: EaseEventsData, version?: ProposalVersion) {
  if (!version) return [];
  return data.proposalLineItems
    .filter((item) => item.proposalVersionId === version.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getProposalPaymentTerms(data: EaseEventsData, version?: ProposalVersion) {
  if (!version) return [];
  return data.proposalPaymentTerms
    .filter((term) => term.proposalVersionId === version.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getProposalResponses(data: EaseEventsData, proposal?: ProposalRecord) {
  if (!proposal) return [];
  return data.proposalResponses
    .filter((response) => response.proposalId === proposal.id)
    .sort((a, b) => b.respondedAt.localeCompare(a.respondedAt));
}

function getProjectBookingSettings(data: EaseEventsData, organizationId: string) {
  return (
    data.bookingSettings.find((settings) => settings.organizationId === organizationId) ?? {
      id: "default-booking-settings",
      organizationId,
      requireProposalAcceptance: true,
      requireTermsAcceptance: true,
      requireDepositInvoiceIssued: true,
      requireDepositPaid: true,
      requireManualPlannerApproval: false,
      proposalExpirationDays: 14,
      acceptanceStatement:
        "I accept this proposal, the selected options, payment schedule, and terms for this project.",
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );
}

function getProjectInvoices(data: EaseEventsData, projectId?: string, eventId?: string) {
  return data.invoices.filter(
    (invoice) =>
      (projectId && invoice.projectId === projectId) || (eventId && invoice.eventId === eventId),
  );
}

function getBookingRequirementSummary(
  data: EaseEventsData,
  project: ProjectRecord | undefined,
  proposal: ProposalRecord | undefined,
) {
  if (!project) return { checks: [], completed: 0, total: 0, outstanding: [], nextAction: "" };
  const settings = getProjectBookingSettings(data, project.organizationId);
  const responses = getProposalResponses(data, proposal);
  const acceptedResponse = responses.find((response) => response.responseType === "Accepted");
  const invoices = getProjectInvoices(data, project.id, project.eventId).filter(
    (invoice) =>
      !proposal || invoice.proposalId === proposal.id || invoice.projectId === project.id,
  );
  const depositInvoices = invoices.filter((invoice) => invoice.invoiceType === "Deposit");
  const depositIssued = depositInvoices.length > 0;
  const depositPaid = depositInvoices.some(
    (invoice) => getEffectiveInvoiceStatus(invoice) === "Paid",
  );
  const manualApproval = data.projectBookingApprovals.some(
    (approval) => approval.projectId === project.id,
  );
  const checks = [
    {
      key: "proposal_accepted",
      label: "Proposal accepted",
      complete: proposal?.status === "Accepted",
      required: settings.requireProposalAcceptance,
      responsibleParty: "Client",
    },
    {
      key: "terms_accepted",
      label: "Terms accepted",
      complete: Boolean(acceptedResponse),
      required: settings.requireTermsAcceptance,
      responsibleParty: "Client",
    },
    {
      key: "deposit_invoice_issued",
      label: "Deposit invoice issued",
      complete: depositIssued,
      required: settings.requireDepositInvoiceIssued,
      responsibleParty: "Planner",
    },
    {
      key: "deposit_paid",
      label: "Deposit paid",
      complete: depositPaid,
      required: settings.requireDepositPaid,
      responsibleParty: "Client",
    },
    {
      key: "manual_planner_approval",
      label: "Planner approval",
      complete: manualApproval,
      required: settings.requireManualPlannerApproval,
      responsibleParty: "Planner",
    },
  ];
  const required = checks.filter((check) => check.required);
  const outstanding = required.filter((check) => !check.complete);
  return {
    checks,
    completed: required.length - outstanding.length,
    total: required.length,
    outstanding,
    nextAction:
      project.stage === "Booked" || (proposal?.status === "Accepted" && outstanding.length === 0)
        ? "Booked - event setup is ready"
        : outstanding[0]
          ? `${outstanding[0].label} required (${outstanding[0].responsibleParty})`
          : "Ready to book",
  };
}

function getProposalLifecycleCopy(
  proposal: ProposalRecord | undefined,
  version: ProposalVersion | undefined,
  booking: ReturnType<typeof getBookingRequirementSummary>,
) {
  if (!proposal) return "Create a proposal after consultation notes are complete.";
  if (proposal.status === "Draft") return "Draft proposal needs planner review before sending.";
  if (proposal.status === "Sent") return "Waiting for client to review proposal.";
  if (proposal.status === "Viewed") return "Client viewed the proposal. Follow up if needed.";
  if (proposal.status === "Changes Requested")
    return "Client requested changes. Create a revised version.";
  if (proposal.status === "Accepted" && booking.outstanding.length) {
    return `Proposal accepted - ${booking.nextAction}.`;
  }
  if (proposal.status === "Accepted") return "Proposal accepted - booking requirements complete.";
  return version ? `${proposal.status} proposal v${version.versionNumber}.` : proposal.status;
}

type LifecyclePhaseKey =
  | "inquiry"
  | "consultation"
  | "proposal"
  | "booking"
  | "planning"
  | "finalization"
  | "event-day"
  | "post-event"
  | "retention";

type LifecyclePhase = {
  key: LifecyclePhaseKey;
  label: string;
  plannerGoal: string;
  clientGoal: string;
  automation: string;
};

type LifecycleSignal = {
  phase: LifecyclePhase;
  status: "Done" | "Now" | "Blocked" | "Next" | "Later";
  progress: number;
  nextAction: string;
  blocker?: string;
  href?: string;
};

const lifecyclePhases: LifecyclePhase[] = [
  {
    key: "inquiry",
    label: "Inquiry Intake",
    plannerGoal: "Capture, qualify, assign, and follow up.",
    clientGoal: "Know the inquiry was received.",
    automation: "Confirmation email, lead source tracking, follow-up task.",
  },
  {
    key: "consultation",
    label: "Consultation",
    plannerGoal: "Schedule the call, capture notes, extract requirements.",
    clientGoal: "Share vision, budget, constraints, and must-haves.",
    automation: "Calendar invite, Meet link, Fathom recap, AI requirements extraction.",
  },
  {
    key: "proposal",
    label: "Proposal / Quote",
    plannerGoal: "Turn requirements into scope, budget, and approval.",
    clientGoal: "Review pricing and request changes or approve.",
    automation: "Template-driven proposal, approval packet, payment terms.",
  },
  {
    key: "booking",
    label: "Booking / Conversion",
    plannerGoal: "Create the operating workspace and kickoff plan.",
    clientGoal: "Approve proposal, pay deposit, enter portal.",
    automation: "Client, event, tasks, invoices, approvals, portal, kickoff meeting.",
  },
  {
    key: "planning",
    label: "Planning",
    plannerGoal: "Coordinate tasks, vendors, files, budget, meetings, and approvals.",
    clientGoal: "Approve decisions and see steady progress.",
    automation: "Reminders, overdue flags, variance explanations, meeting-to-task conversion.",
  },
  {
    key: "finalization",
    label: "Finalization",
    plannerGoal: "Lock logistics, vendors, timeline, approvals, and final payment.",
    clientGoal: "Confirm the final plan with confidence.",
    automation: "Blocker surfacing, final payment reminder, vendor confirmation reminders.",
  },
  {
    key: "event-day",
    label: "Event Day Execution",
    plannerGoal: "Run the show under pressure with contacts and live checklist.",
    clientGoal: "Feel handled without operational noise.",
    automation: "Mobile run-of-show, issue log, live status, vendor escalation path.",
  },
  {
    key: "post-event",
    label: "Post Event Wrap-up",
    plannerGoal: "Close balances, upload files, capture lessons, report margin.",
    clientGoal: "Receive final assets and closure.",
    automation: "Post-event summary, budget variance report, file delivery.",
  },
  {
    key: "retention",
    label: "Retention / Rebooking",
    plannerGoal: "Preserve history and trigger future opportunities.",
    clientGoal: "Stay connected for milestones and repeat events.",
    automation: "Anniversary reminders, rebooking campaigns, client health history.",
  },
];

function lifecyclePhaseIndex(key: LifecyclePhaseKey) {
  return lifecyclePhases.findIndex((phase) => phase.key === key);
}

function getActiveLifecyclePhaseKey(event: EventRecord, data: EaseEventsData): LifecyclePhaseKey {
  if (event.status === "Completed") return "post-event";
  if (event.status === "Cancelled") return "retention";

  const daysUntilEvent = getDaysUntil(event.eventDate);
  if (daysUntilEvent < 0) return "post-event";
  if (daysUntilEvent <= 1 || event.status === "In Progress") return "event-day";
  if (daysUntilEvent <= 14 || event.status === "Confirmed") return "finalization";

  const invoices = data.invoices.filter((invoice) => invoice.eventId === event.id);
  const hasPaidInvoice = invoices.some((invoice) => getEffectiveInvoiceStatus(invoice) === "Paid");
  if (!hasPaidInvoice && event.status === "Awaiting Client Approval") return "booking";

  return "planning";
}

function getLeadLifecyclePhaseKey(lead: Lead): LifecyclePhaseKey {
  if (lead.stage === "New Inquiry") return "inquiry";
  if (lead.stage === "Consultation Scheduled") return "consultation";
  if (lead.stage === "Proposal Sent") return "proposal";
  if (lead.stage === "Booked") return "booking";
  return "retention";
}

function getLeadLifecycleSignals(data: EaseEventsData, lead: Lead): LifecycleSignal[] {
  const activeKey = getLeadLifecyclePhaseKey(lead);
  const activeIndex = lifecyclePhaseIndex(activeKey);

  return lifecyclePhases.map((phase, index) => {
    const isCurrent = phase.key === activeKey;
    const baseStatus =
      index < activeIndex
        ? "Done"
        : isCurrent
          ? "Now"
          : index === activeIndex + 1
            ? "Next"
            : "Later";
    let progress = index < activeIndex ? 100 : isCurrent ? 45 : 0;
    let nextAction = phase.plannerGoal;
    let blocker: string | undefined;
    let href = leadHref(lead.id);

    if (phase.key === "inquiry") {
      progress = lead.clientId || lead.ownerId ? 75 : 45;
      nextAction = lead.ownerId
        ? "Confirm qualification and move to consultation."
        : "Assign an owner.";
      blocker = !lead.ownerId ? "No owner assigned." : undefined;
    }
    if (phase.key === "consultation") {
      nextAction = "Schedule consultation from Communications and capture notes.";
      href = withQuery("/ease-events/communications", { event: lead.convertedEventId });
      blocker = !lead.eventDate ? "Event date is missing." : undefined;
    }
    if (phase.key === "proposal") {
      nextAction = "Build a proposal from budget/template and send client approval.";
      blocker = !lead.budgetRange ? "Budget range is missing." : undefined;
    }
    if (phase.key === "booking") {
      nextAction = lead.convertedEventId
        ? "Open the event workspace and review generated tasks, approvals, and invoice."
        : "Convert the booked lead into an event workspace.";
      href = lead.convertedEventId ? eventHref(lead.convertedEventId) : leadHref(lead.id);
    }
    if (phase.key === "retention" && lead.stage === "Lost") {
      nextAction = "Record loss reason and preserve the contact for future outreach.";
      progress = 30;
    }

    return {
      phase,
      status: blocker && isCurrent ? "Blocked" : baseStatus,
      progress,
      nextAction,
      blocker,
      href,
    };
  });
}

function getEventLifecycleSignals(data: EaseEventsData, event: EventRecord): LifecycleSignal[] {
  const activeKey = getActiveLifecyclePhaseKey(event, data);
  const activeIndex = lifecyclePhaseIndex(activeKey);
  const projectId = getProjectIdForEvent(data, event);
  const tasks = data.tasks.filter(
    (task) => task.eventId === event.id || (projectId && task.projectId === projectId),
  );
  const approvals = data.approvals.filter((approval) => approval.eventId === event.id);
  const invoices = data.invoices.filter((invoice) => invoice.eventId === event.id);
  const budgetItems = data.budgetItems.filter((item) => item.eventId === event.id);
  const eventVendors = data.eventVendors.filter((vendor) => vendor.eventId === event.id);
  const timelineItems = data.timelineItems.filter((item) => item.eventId === event.id);
  const meetingThreads = data.communicationThreads.filter(
    (thread) => thread.eventId === event.id && thread.channel === "Meeting",
  );
  const openTasks = tasks.filter((task) => task.status !== "Done");
  const blockedTasks = tasks.filter((task) => task.status === "Blocked");
  const pendingApprovals = approvals.filter((approval) => approval.status === "Pending");
  const openInvoices = invoices.filter((invoice) => getInvoiceBalance(invoice) > 0);
  const overdueInvoices = invoices.filter(
    (invoice) => getEffectiveInvoiceStatus(invoice) === "Overdue",
  );
  const hasClientPortal = Boolean(event.clientUserId);

  return lifecyclePhases.map((phase, index) => {
    const isCurrent = phase.key === activeKey;
    const baseStatus =
      index < activeIndex
        ? "Done"
        : isCurrent
          ? "Now"
          : index === activeIndex + 1
            ? "Next"
            : "Later";
    let progress = index < activeIndex ? 100 : isCurrent ? 50 : 0;
    let nextAction = phase.plannerGoal;
    let blocker: string | undefined;
    let href = eventHref(event.id);

    if (phase.key === "consultation") {
      progress = meetingThreads.length ? 100 : isCurrent ? 45 : progress;
      nextAction = meetingThreads.length
        ? "Review meeting recaps and turn follow-ups into tasks."
        : "Schedule a consultation and capture a Fathom recap.";
      href = `${eventHref(event.id)}?tab=comms`;
    }
    if (phase.key === "proposal") {
      const proposalApproval = approvals.find((approval) => approval.type === "Proposal");
      progress = proposalApproval?.status === "Approved" ? 100 : proposalApproval ? 65 : 25;
      nextAction = proposalApproval
        ? "Track proposal approval or requested changes."
        : "Create/send a proposal approval packet.";
      blocker =
        proposalApproval?.status === "Changes Requested"
          ? "Client requested proposal changes."
          : undefined;
      href = `${eventHref(event.id)}?tab=approvals`;
    }
    if (phase.key === "booking") {
      const hasDeposit = invoices.some(
        (invoice) =>
          invoice.invoiceType === "Deposit" && getEffectiveInvoiceStatus(invoice) === "Paid",
      );
      const bookingChecks = [
        hasClientPortal,
        invoices.length > 0,
        tasks.length > 0,
        approvals.length > 0,
      ];
      progress = Math.round((bookingChecks.filter(Boolean).length / bookingChecks.length) * 100);
      nextAction = hasDeposit
        ? "Confirm kickoff and move into planning."
        : "Send portal invite and collect deposit invoice.";
      blocker = !hasClientPortal
        ? "Client portal access is not linked."
        : invoices.length === 0
          ? "No invoice ledger exists."
          : !hasDeposit
            ? "Deposit is not marked paid."
            : undefined;
      href = `${eventHref(event.id)}?tab=invoices`;
    }
    if (phase.key === "planning") {
      const planningChecks = [
        tasks.length > 0,
        budgetItems.length > 0,
        eventVendors.length > 0,
        approvals.length > 0,
      ];
      progress = Math.round((planningChecks.filter(Boolean).length / planningChecks.length) * 100);
      nextAction =
        "Work tasks, vendors, budget, approvals, meetings, and files from the event workspace.";
      blocker = blockedTasks.length
        ? `${blockedTasks.length} task${blockedTasks.length === 1 ? "" : "s"} blocked.`
        : undefined;
      href = `${eventHref(event.id)}?tab=tasks`;
    }
    if (phase.key === "finalization") {
      const finalizationChecks = [
        pendingApprovals.length === 0,
        openInvoices.length === 0,
        timelineItems.length > 0,
        eventVendors.length > 0,
        openTasks.length === 0,
      ];
      progress = Math.round(
        (finalizationChecks.filter(Boolean).length / finalizationChecks.length) * 100,
      );
      nextAction =
        "Clear approvals, final balance, vendor confirmations, run-of-show, and open tasks.";
      blocker = pendingApprovals.length
        ? `${pendingApprovals.length} approval${pendingApprovals.length === 1 ? "" : "s"} pending.`
        : overdueInvoices.length
          ? `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} overdue.`
          : openTasks.length
            ? `${openTasks.length} task${openTasks.length === 1 ? "" : "s"} still open.`
            : undefined;
      href = `${eventHref(event.id)}?tab=timeline`;
    }
    if (phase.key === "event-day") {
      progress = timelineItems.length ? 70 : 20;
      nextAction = timelineItems.length
        ? "Use the run-of-show and update item status live."
        : "Create a mobile-ready run-of-show before event day.";
      blocker = timelineItems.length === 0 ? "Run-of-show is empty." : undefined;
      href = `${eventHref(event.id)}?tab=timeline`;
    }
    if (phase.key === "post-event") {
      const completedTasks = tasks.filter((task) => task.status === "Done").length;
      progress =
        event.status === "Completed"
          ? 70
          : Math.round((completedTasks / Math.max(tasks.length, 1)) * 50);
      nextAction =
        "Close vendor/client balances, upload final files, and generate a post-event summary.";
      blocker = openInvoices.length ? "Client invoice balance remains open." : undefined;
      href = `${eventHref(event.id)}?tab=ai`;
    }
    if (phase.key === "retention") {
      progress = event.status === "Completed" ? 35 : 0;
      nextAction = "Use the client record for future milestone outreach and repeat event history.";
      href = event.clientId ? clientHref(event.clientId) : eventHref(event.id);
    }

    return {
      phase,
      status:
        blocker && (isCurrent || phase.key === "finalization" || phase.key === "booking")
          ? "Blocked"
          : baseStatus,
      progress,
      nextAction,
      blocker,
      href,
    };
  });
}

function LifecycleRail({
  title,
  description,
  signals,
  compact = false,
}: {
  title: string;
  description?: string;
  signals: LifecycleSignal[];
  compact?: boolean;
}) {
  const activeSignal =
    signals.find((signal) => signal.status === "Blocked") ??
    signals.find((signal) => signal.status === "Now") ??
    signals.find((signal) => signal.status === "Next");
  const completedCount = signals.filter((signal) => signal.status === "Done").length;

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg tracking-normal text-slate-950">{title}</CardTitle>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
          <StatusBadge value={`${completedCount}/${signals.length} phases`} />
        </div>
        {activeSignal ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Current operating focus
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-950">{activeSignal.phase.label}</p>
              <StatusBadge value={activeSignal.status} />
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{activeSignal.nextAction}</p>
            {activeSignal.blocker ? (
              <p className="mt-2 text-sm font-medium text-rose-700">{activeSignal.blocker}</p>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "grid gap-3",
            compact ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {signals.map((signal, index) => {
            const content = (
              <div
                className={cn(
                  "h-full rounded-lg border p-4 transition-colors",
                  signal.status === "Now" && "border-slate-950 bg-slate-50",
                  signal.status === "Blocked" && "border-rose-200 bg-rose-50",
                  signal.status === "Done" && "border-emerald-200 bg-emerald-50",
                  signal.status === "Next" && "border-amber-200 bg-amber-50",
                  signal.status === "Later" && "border-slate-200 bg-white",
                  signal.href && "hover:bg-slate-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      Phase {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">
                      {signal.phase.label}
                    </p>
                  </div>
                  <StatusBadge value={signal.status} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      signal.status === "Blocked"
                        ? "bg-rose-500"
                        : signal.status === "Done"
                          ? "bg-emerald-500"
                          : signal.status === "Next"
                            ? "bg-amber-500"
                            : "bg-slate-900",
                    )}
                    style={{ width: `${Math.max(0, Math.min(signal.progress, 100))}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{signal.nextAction}</p>
                {signal.blocker ? (
                  <p className="mt-2 text-xs font-semibold leading-5 text-rose-700">
                    {signal.blocker}
                  </p>
                ) : null}
              </div>
            );

            if (!signal.href) return <div key={signal.phase.key}>{content}</div>;
            return (
              <a
                key={signal.phase.key}
                href={signal.href}
                className="block focus:outline-none focus:ring-2 focus:ring-slate-950"
              >
                {content}
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function LifecycleAuditSummary() {
  const gaps = [
    {
      severity: "Critical",
      phase: "Proposal / Booking",
      gap: "Proposal generation, contract terms, and deposit collection are not yet one guided transaction.",
      improvement:
        "Add proposal template assembly, approval packet, contract signature, and invoice handoff.",
    },
    {
      severity: "Critical",
      phase: "Finalization / Event Day",
      gap: "Run-of-show exists, but there is no dedicated mobile event-day mode, issue log, or live vendor escalation flow.",
      improvement:
        "Add event-day command view with live checklist, vendor contacts, incidents, and offline-friendly layout.",
    },
    {
      severity: "High leverage",
      phase: "Inquiry / Consultation",
      gap: "Lead follow-up reminders and consultation next steps are visible but not automatically scheduled from intake.",
      improvement:
        "Auto-create reminder tasks, confirmation emails, consultation agenda, and Fathom import prompt.",
    },
    {
      severity: "High leverage",
      phase: "Planning / Finalization",
      gap: "Blockers exist across tasks, approvals, invoices, vendors, and files, but need cross-module reminders.",
      improvement: "Add notification/reminder rules and owner-based daily digest.",
    },
    {
      severity: "Nice to have",
      phase: "Retention",
      gap: "Canonical clients preserve history, but rebooking triggers and anniversaries are not automated.",
      improvement:
        "Add lifecycle milestones, client health, anniversaries, and campaign-ready follow-ups.",
    },
  ];

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Lifecycle audit summary
        </CardTitle>
        <p className="text-sm leading-6 text-slate-500">
          Remaining product gaps to make EaseEvents a true event-business operating system.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {gaps.map((gap) => (
          <div
            key={`${gap.severity}-${gap.phase}`}
            className="rounded-lg border border-slate-200 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={gap.severity} />
              <p className="text-sm font-semibold text-slate-950">{gap.phase}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{gap.gap}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{gap.improvement}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LifecyclePortfolioOverview({ data }: { data: EaseEventsData }) {
  const activeEvents = data.events.filter((event) => isActiveEventStatus(event.status));
  const phaseCounts = lifecyclePhases.map((phase) => {
    const leadCount = data.leads.filter(
      (lead) => !lead.convertedEventId && getLeadLifecyclePhaseKey(lead) === phase.key,
    ).length;
    const eventCount = activeEvents.filter(
      (event) => getActiveLifecyclePhaseKey(event, data) === phase.key,
    ).length;
    return { phase, count: leadCount + eventCount, leadCount, eventCount };
  });
  const highestPressure = phaseCounts
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)[0];

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg tracking-normal text-slate-950">Lifecycle pipeline</CardTitle>
        <p className="text-sm leading-6 text-slate-500">
          A planner-first view of where work sits from inquiry through retention.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {highestPressure ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Highest workload phase
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {highestPressure.phase.label} · {highestPressure.count} active record
              {highestPressure.count === 1 ? "" : "s"}
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
          {phaseCounts.map(({ phase, count, leadCount, eventCount }) => (
            <a
              key={phase.key}
              href={
                leadCount > eventCount
                  ? withQuery("/ease-events/leads", { lifecycle: phase.key })
                  : "/ease-events/events"
              }
              className={cn(
                "rounded-lg border p-3 transition-colors hover:bg-slate-50",
                count ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {phase.label.split(" ")[0]}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{count}</p>
              <p className="mt-1 text-xs leading-4 text-slate-500">
                {leadCount} lead{leadCount === 1 ? "" : "s"} · {eventCount} event
                {eventCount === 1 ? "" : "s"}
              </p>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LifecycleProgressStrip({ signals }: { signals: LifecycleSignal[] }) {
  const activeSignal =
    signals.find((signal) => signal.status === "Blocked") ??
    signals.find((signal) => signal.status === "Now") ??
    signals.find((signal) => signal.status === "Next");

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Project stage
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {activeSignal?.phase.label ?? "No active phase"}
            </p>
          </div>
          {activeSignal ? <StatusBadge value={activeSignal.status} /> : null}
        </div>
        <div className="grid gap-1 md:grid-cols-9">
          {signals.map((signal) => (
            <a
              key={signal.phase.key}
              href={signal.href}
              className="group min-w-0 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950"
              title={`${signal.phase.label}: ${signal.nextAction}`}
            >
              <div
                className={cn(
                  "h-2 rounded-full transition-colors",
                  signal.status === "Blocked"
                    ? "bg-rose-500"
                    : signal.status === "Done"
                      ? "bg-emerald-500"
                      : signal.status === "Now"
                        ? "bg-slate-950"
                        : signal.status === "Next"
                          ? "bg-amber-500"
                          : "bg-slate-200 group-hover:bg-slate-300",
                )}
              />
              <p className="mt-1 hidden truncate text-[11px] font-medium text-slate-500 xl:block">
                {signal.phase.label}
              </p>
            </a>
          ))}
        </div>
        {activeSignal ? (
          <p className="text-xs leading-5 text-slate-600">
            {activeSignal.nextAction}
            {activeSignal.blocker ? (
              <span className="font-semibold text-rose-700"> {activeSignal.blocker}</span>
            ) : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProjectCommunicationSnapshot({
  data,
  event,
  lead,
}: {
  data: EaseEventsData;
  event?: EventRecord;
  lead?: Lead;
}) {
  const eventId = event?.id ?? lead?.convertedEventId;
  const projectId = event
    ? getProjectIdForEvent(data, event)
    : lead
      ? getProjectIdForLead(data, lead)
      : undefined;
  const leadId = lead?.id ?? event?.leadId;
  const threads = data.communicationThreads
    .filter((thread) => {
      if (projectId && thread.projectId === projectId) return true;
      if (eventId && thread.eventId === eventId) return true;
      if (leadId && thread.leadId === leadId) return true;
      return false;
    })
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
  const threadIds = new Set(threads.map((thread) => thread.id));
  const messages = data.communicationMessages
    .filter((message) => threadIds.has(message.threadId))
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const latestThread = threads[0];
  const latestMessage = messages[0];
  const nextMeeting = data.meetings
    .filter((meeting) => {
      const matchesProject = projectId && meeting.projectId === projectId;
      const matchesEvent = eventId && meeting.eventId === eventId;
      const matchesLead = leadId && meeting.leadId === leadId;
      return (matchesProject || matchesEvent || matchesLead) && isUpcomingMeeting(meeting);
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  const needsReplyCount = threads.filter((thread) => thread.status === "Needs Reply").length;
  const openActionItems = data.meetings
    .filter((meeting) => {
      if (projectId && meeting.projectId === projectId) return true;
      if (eventId && meeting.eventId === eventId) return true;
      if (leadId && meeting.leadId === leadId) return true;
      return false;
    })
    .flatMap((meeting) => meeting.actionItems)
    .filter((item) => !item.isComplete).length;
  const projectHref = eventId
    ? `${eventHref(eventId)}?tab=comms`
    : lead
      ? leadHref(lead.id)
      : "/ease-events/communications";
  const fallbackSummary = lead
    ? lead.notes || "Inquiry captured. Schedule consultation and send the first client response."
    : "No communication captured yet. Start with a client email, call note, or meeting recap.";

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg tracking-normal text-slate-950">
            <MessageSquare className="h-4 w-4" />
            Project communication
          </CardTitle>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Recent client context, reply risk, and next meeting without leaving this project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => (window.location.href = projectHref)}>
          Open
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={latestThread?.channel ?? "Inquiry"} />
            <StatusBadge value={latestThread?.status ?? (lead ? lead.stage : "No thread")} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-950">
            {latestThread?.subject ?? (lead ? "Initial inquiry notes" : "No communication yet")}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {latestMessage?.summary ||
              latestMessage?.body ||
              latestThread?.preview ||
              fallbackSummary}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-500">
            Last contact:{" "}
            {latestMessage?.sentAt
              ? formatDateTime(latestMessage.sentAt)
              : latestThread?.lastActivityAt
                ? formatDateTime(latestThread.lastActivityAt)
                : lead?.createdAt
                  ? formatDateTime(lead.createdAt)
                  : "Not yet recorded"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          <FieldValue
            label="Reply needed"
            value={
              needsReplyCount ? (
                <span className="text-rose-700">
                  {needsReplyCount} thread{needsReplyCount === 1 ? "" : "s"}
                </span>
              ) : (
                "None"
              )
            }
          />
          <FieldValue
            label="Next meeting"
            value={
              nextMeeting ? (
                <a href={nextMeeting.link || projectHref} className="hover:underline">
                  {nextMeeting.title} · {formatDateTime(nextMeeting.startAt)}
                </a>
              ) : (
                "Not scheduled"
              )
            }
          />
          <FieldValue
            label="Open action items"
            value={openActionItems ? `${openActionItems} from meetings` : "None captured"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function getPaymentStatusFromAmounts({
  actualAmount,
  dueDate,
  paidAmount,
  plannedAmount,
}: {
  actualAmount: number;
  dueDate?: string;
  paidAmount: number;
  plannedAmount: number;
}): EventVendor["paymentStatus"] {
  const billableAmount = actualAmount > 0 ? actualAmount : plannedAmount;
  if (billableAmount > 0 && paidAmount >= billableAmount) return "Paid";
  if (paidAmount > 0) return "Partially Paid";
  if (dueDate && isOverdueDate(dueDate)) return "Overdue";
  return "Not Paid";
}

function isOverdueDate(date: string) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`).getTime() < today.getTime();
}

function isActiveEventStatus(status: EventStatus) {
  return !["Completed", "Cancelled"].includes(status);
}

function matchesClient(event: EventRecord, clientKey: string) {
  return (
    clientKey === "all" ||
    event.clientId === clientKey ||
    event.clientEmail === clientKey ||
    event.clientNameSnapshot === clientKey ||
    event.clientName === clientKey
  );
}

function getVendorForUser(data: EaseEventsData, user?: EaseEventsData["users"][number]) {
  if (!user) return undefined;
  return data.vendors.find(
    (vendor) =>
      vendor.email.toLowerCase() === user.email.toLowerCase() ||
      vendor.contactName.toLowerCase() === user.fullName.toLowerCase() ||
      vendor.phone === user.phone,
  );
}

function getVisibleEvents(data: EaseEventsData, user?: EaseEventsData["users"][number]) {
  if (!user) return data.events;
  if (user.role === "vendor") {
    const vendor = getVendorForUser(data, user);
    if (!vendor) return [];
    const eventIds = new Set(
      data.eventVendors
        .filter((assignment) => assignment.vendorId === vendor.id)
        .map((assignment) => assignment.eventId),
    );
    return data.events.filter((event) => eventIds.has(event.id));
  }
  return data.events;
}

function getUserName(users: EaseEventsData["users"], userId?: string) {
  if (!userId) return "Unassigned";
  return users.find((user) => user.id === userId)?.fullName ?? "Unknown user";
}

function getAssignableUsersForEvent(data: EaseEventsData, eventId: string) {
  const teamUserIds = data.eventTeamMembers
    .filter((member) => member.eventId === eventId)
    .map((member) => member.userId);
  const teamUsers = data.users.filter((user) => teamUserIds.includes(user.id));

  if (teamUsers.length) return teamUsers;
  return data.users.filter((user) => user.role === "admin" || user.role === "planner");
}

function getLeadConversionButtonLabel(lead: EaseEventsData["leads"][number]) {
  return lead.stage === "Accepted" || lead.stage === "Booked"
    ? "Finalize booking"
    : "Review booking requirements";
}

function getLeadConversionHelper(lead: EaseEventsData["leads"][number]) {
  if (!lead.eventDate) return "Add an event date before creating an event workspace.";
  if (lead.stage === "Proposal Sent") {
    return "Proposal is out. Booking waits on client acceptance and configured payment requirements.";
  }
  if (lead.stage === "Accepted") {
    return "Proposal is accepted. Complete any deposit or planner approval requirements.";
  }
  if (lead.stage === "Booked") return "Booking is complete. Create or open the event workspace.";
  return "Draft and send a proposal first, then booking can complete from explicit client acceptance and payment terms.";
}

function FieldValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-slate-950">{value}</div>
    </div>
  );
}

function EventAvatar({ event, clientName }: { event: EventRecord; clientName?: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
      {getInitials(clientName ?? event.clientName)}
    </div>
  );
}

function getDaysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function getEventBudgetBalance(event: EventRecord, budgetItems: BudgetItem[]) {
  return budgetItems
    .filter((item) => item.eventId === event.id)
    .reduce((sum, item) => sum + getBudgetItemBalance(item), 0);
}

function getUpcomingMeetingCount(data: EaseEventsData, eventId?: string) {
  return data.meetings.filter(
    (meeting) => isUpcomingMeeting(meeting) && (!eventId || meeting.eventId === eventId),
  ).length;
}

function getEventActionItems(
  data: EaseEventsData,
  event: EventRecord,
  currency: string,
): ActionHubItem[] {
  const tasks = data.tasks.filter((task) => task.eventId === event.id);
  const overdueTasks = tasks.filter((task) => isOverdueTask(task));
  const blockedTasks = tasks.filter((task) => task.status === "Blocked");
  const pendingApprovals = data.approvals.filter(
    (approval) => approval.eventId === event.id && approval.status === "Pending",
  );
  const budgetBalance = getEventBudgetBalance(event, data.budgetItems);
  const vendorCount = data.eventVendors.filter((vendor) => vendor.eventId === event.id).length;
  const meetingThreadCount = data.communicationThreads.filter(
    (thread) => thread.eventId === event.id && thread.channel === "Meeting",
  ).length;
  const eventSession = data.eventDaySessions.find((session) => session.eventId === event.id);
  const eventIssues = data.eventDayIssues.filter((issue) => issue.eventId === event.id);
  const openIssues = eventIssues.filter((issue) => !["Resolved", "Closed"].includes(issue.status));
  const delayedCriticalItems = data.timelineItems.filter(
    (item) =>
      item.eventId === event.id &&
      item.criticality === "Critical" &&
      ["Delayed", "Blocked"].includes(item.status),
  );
  const eventVendorAssignments = data.eventVendors.filter((vendor) => vendor.eventId === event.id);
  const vendorsNotArrived = eventVendorAssignments.filter((assignment) => {
    const status = data.eventDayVendorStatuses.find((item) => item.eventVendorId === assignment.id);
    return (
      !status || !["Arrived", "Setting Up", "Ready", "Active", "Completed"].includes(status.status)
    );
  });
  const daysUntilEvent = getDaysUntil(event.eventDate);

  return [
    daysUntilEvent <= 1 && event.status !== "Completed" && event.status !== "Cancelled"
      ? {
          title:
            eventSession?.status === "Active"
              ? "Event-Day Mode is active"
              : daysUntilEvent < 0
                ? "Event date has passed"
                : daysUntilEvent === 0
                  ? "Event is today"
                  : "Event is tomorrow",
          description:
            "Open the mobile command center for current item, next item, vendors, issues, and offline sync.",
          href: eventDayHref(event.id),
          icon: Radio,
          status: eventSession?.status ?? "Preview",
          tone: eventSession?.status === "Active" ? "danger" : "warn",
          actionLabel: "Open Event Day",
        }
      : null,
    openIssues.length
      ? {
          title: `${openIssues.length} active event-day issue${openIssues.length === 1 ? "" : "s"}`,
          description: "Resolve or assign decisions before they stall the run of show.",
          href: eventDayHref(event.id),
          icon: AlertTriangle,
          status: "Issue",
          tone: "danger",
          actionLabel: "Open command",
        }
      : null,
    delayedCriticalItems.length
      ? {
          title: `${delayedCriticalItems.length} critical run-of-show item${
            delayedCriticalItems.length === 1 ? "" : "s"
          } delayed or blocked`,
          description:
            "Review the live timeline and pin the current item if the schedule has shifted.",
          href: eventDayHref(event.id),
          icon: Clock,
          status: "Delayed",
          tone: "danger",
          actionLabel: "Open timeline",
        }
      : null,
    vendorsNotArrived.length && daysUntilEvent <= 1
      ? {
          title: `${vendorsNotArrived.length} vendor${vendorsNotArrived.length === 1 ? "" : "s"} not arrived`,
          description: "Check arrival, setup, delay, and contact status from Event-Day Mode.",
          href: eventDayHref(event.id),
          icon: Building2,
          status: "Arrival",
          tone: "warn",
          actionLabel: "Open vendors",
        }
      : null,
    pendingApprovals.length
      ? {
          title: `${pendingApprovals.length} client approval${
            pendingApprovals.length === 1 ? "" : "s"
          } pending`,
          description: "Review the client-facing decisions before production work moves forward.",
          href: `${eventHref(event.id)}?tab=approvals`,
          icon: CheckCircle2,
          status: "Pending",
          tone: "warn",
          actionLabel: "Open",
        }
      : null,
    overdueTasks.length
      ? {
          title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`,
          description: "Assign, unblock, or move these cards before the next client touchpoint.",
          href: withQuery("/ease-events/tasks", { event: event.id, due: "overdue" }),
          icon: AlertTriangle,
          status: "Overdue",
          tone: "danger",
          actionLabel: "Review",
        }
      : null,
    blockedTasks.length
      ? {
          title: `${blockedTasks.length} blocked task${blockedTasks.length === 1 ? "" : "s"}`,
          description: "Someone needs a decision, vendor answer, or client response to continue.",
          href: withQuery("/ease-events/tasks", { event: event.id, status: "Blocked" }),
          icon: CheckSquare,
          status: "Blocked",
          tone: "danger",
          actionLabel: "Unblock",
        }
      : null,
    budgetBalance > 0
      ? {
          title: `${formatCurrency(budgetBalance, currency)} open budget balance`,
          description: "Collect the next client payment or reconcile vendor paid amounts.",
          href: withQuery("/ease-events/budgets", { event: event.id, payment: "open" }),
          icon: Wallet,
          status: "Balance Due",
          tone: "warn",
          actionLabel: "Open budget",
        }
      : null,
    vendorCount === 0
      ? {
          title: "No vendors assigned",
          description: "Attach vendors to keep quotes, actuals, and payment status connected.",
          href: `${eventHref(event.id)}?tab=vendors`,
          icon: Building2,
          status: "Staffing",
          tone: "warn",
          actionLabel: "Add vendor",
        }
      : null,
    meetingThreadCount
      ? {
          title: `${meetingThreadCount} meeting note${
            meetingThreadCount === 1 ? "" : "s"
          } captured`,
          description:
            "Review call recaps and convert follow-ups into tasks while the context is fresh.",
          href: `${eventHref(event.id)}?tab=comms`,
          icon: MessageSquare,
          status: "Meeting",
          tone: "good",
          actionLabel: "Review",
        }
      : null,
  ].filter(Boolean) as ActionHubItem[];
}

export function DashboardPage() {
  const { currentUser } = useEaseEventsAuth();
  const { data } = useEaseEventsStore();
  const currency = data.organization.currency;

  if (currentUser?.role === "client") return <ClientPortalPage />;
  if (currentUser?.role === "vendor") return <VendorPortalPage />;

  const activeEvents = data.events.filter(
    (event) => !["Completed", "Cancelled"].includes(event.status),
  );
  const upcomingEvents = data.events.filter((event) => isUpcomingEvent(event));
  const overdueTasks = data.tasks.filter((task) => isOverdueTask(task));
  const pendingApprovals = data.approvals.filter((approval) => approval.status === "Pending");
  const globalFinance = getGlobalFinanceSummary(data);
  const expenseFileIds = new Set(data.expenseFiles.map((file) => file.expenseId));
  const receiptThreshold = data.financeSettings[0]?.receiptRequiredThreshold ?? 250;
  const expensesAwaitingApproval = data.expenses.filter(
    (expense) => expense.status === "Submitted",
  );
  const expensesMissingReceipts = data.expenses.filter(
    (expense) =>
      expense.totalAmount >= receiptThreshold &&
      !expenseFileIds.has(expense.id) &&
      expense.status !== "Voided",
  );
  const projectsOverBudget = globalFinance.projectSummaries.filter(
    (summary) => summary.currentCostForecast > summary.plannedCost && summary.plannedCost > 0,
  );
  const projectsBelowMargin = globalFinance.projectSummaries.filter(
    (summary) =>
      summary.contractedRevenue > 0 &&
      summary.forecastMarginPercentage <
        (data.financeSettings[0]?.defaultMarginTargetPercent ?? 30),
  );
  const openInvoiceBalance = data.invoices.reduce(
    (sum, invoice) => sum + getInvoiceBalance(invoice),
    0,
  );
  const overdueInvoices = data.invoices.filter(
    (invoice) => getEffectiveInvoiceStatus(invoice) === "Overdue",
  );
  const monthlyRevenue = data.events
    .filter((event) => event.eventDate.startsWith("2026-06"))
    .reduce(
      (sum, event) =>
        sum + getProjectFinanceSummary(data, event.projectId, event.id).contractedRevenue,
      0,
    );
  const upcomingMeetingCount = getUpcomingMeetingCount(data);
  const calendarProjection = buildCalendarProjection(data);
  const visibleCalendarConflicts = calendarProjection.conflicts.filter((conflict) =>
    conflict.entryIds.some((entryId) => {
      const entry = calendarProjection.entries.find((item) => item.id === entryId);
      return entry && new Date(entry.startAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000;
    }),
  );
  const calendarSyncActions = calendarProjection.entries.filter((entry) =>
    ["Not Synced", "Sync Failed", "Retry Required"].includes(entry.syncStatus ?? ""),
  );
  const todayEvents = data.events.filter((event) => {
    const today = new Date();
    return event.eventDate === today.toISOString().slice(0, 10);
  });
  const activeEventDaySessions = data.eventDaySessions.filter(
    (session) => session.status === "Active",
  );
  const activeEventDayIssues = data.eventDayIssues.filter(
    (issue) => !["Resolved", "Closed"].includes(issue.status),
  );
  const delayedCriticalTimelineItems = data.timelineItems.filter(
    (item) => item.criticality === "Critical" && ["Delayed", "Blocked"].includes(item.status),
  );
  const vendorArrivalActions = data.eventVendors.filter((assignment) => {
    const event = data.events.find((item) => item.id === assignment.eventId);
    if (!event || getDaysUntil(event.eventDate) > 1) return false;
    const status = data.eventDayVendorStatuses.find((item) => item.eventVendorId === assignment.id);
    return (
      !status || !["Arrived", "Setting Up", "Ready", "Active", "Completed"].includes(status.status)
    );
  });
  const nextEvents = upcomingEvents.slice(0, 5);
  const newLeads = data.leads.filter((lead) => lead.stage === "New Inquiry");
  const proposalLeads = data.leads.filter((lead) => lead.stage === "Proposal Sent");
  const draftProposals = data.proposals.filter((proposal) => proposal.status === "Draft");
  const sentNotViewedProposals = data.proposals.filter(
    (proposal) => proposal.status === "Sent" && !proposal.viewedAt,
  );
  const expiringSoonProposals = data.proposals.filter((proposal) => {
    if (!proposal.validUntil || proposal.status === "Accepted" || proposal.status === "Declined")
      return false;
    const days = getDaysUntil(proposal.validUntil);
    return days >= 0 && days <= 3;
  });
  const changeRequestedProposals = data.proposals.filter(
    (proposal) => proposal.status === "Changes Requested",
  );
  const acceptedNotBookedProposals = data.proposals.filter((proposal) => {
    if (proposal.status !== "Accepted") return false;
    const project = data.projects.find((item) => item.id === proposal.projectId);
    return project?.stage !== "Booked";
  });
  const needsReplyThreads = data.communicationThreads.filter(
    (thread) => thread.status === "Needs Reply",
  );
  const workflowApprovalQueue = data.workflowExecutions.filter(
    (execution) => execution.status === "Awaiting Approval",
  );
  const failedWorkflowRuns = data.workflowExecutions.filter(
    (execution) => execution.status === "Failed",
  );
  const unreadActionNotifications = data.notifications.filter(
    (notification) => notification.status === "Unread" && notification.actionRequired,
  );
  const closeoutNotStartedEvents = data.events.filter(
    (event) =>
      ["Event Day Completed", "Post-Event", "Completed"].includes(event.status) &&
      !data.postEventCloseouts.some((closeout) => closeout.eventId === event.id),
  );
  const openCloseouts = data.postEventCloseouts.filter(
    (closeout) => !["Closed", "Cancelled"].includes(closeout.status),
  );
  const blockedCloseouts = openCloseouts.filter((closeout) => {
    const event = data.events.find((item) => item.id === closeout.eventId);
    if (!event) return false;
    return (
      buildCloseoutReadiness(
        data,
        event,
        data.projects.find((item) => item.id === closeout.projectId),
      ).blockers.length > 0
    );
  });
  const retentionActions = getRetentionActionItems(data);
  const dashboardActions: ActionHubItem[] = [
    closeoutNotStartedEvents.length
      ? {
          title: `${closeoutNotStartedEvents.length} post-event closeout${
            closeoutNotStartedEvents.length === 1 ? "" : "s"
          } not started`,
          description:
            "Start closeout so final deliverables, feedback, financial reconciliation, and lessons learned are tracked.",
          href: `${eventHref(closeoutNotStartedEvents[0].id)}?tab=closeout`,
          icon: CheckSquare,
          status: "Closeout",
          tone: "warn",
          actionLabel: "Start",
        }
      : null,
    blockedCloseouts.length
      ? {
          title: `${blockedCloseouts.length} closeout${blockedCloseouts.length === 1 ? "" : "s"} blocked`,
          description:
            "Resolve required financial, deliverable, or event-day blockers before closure.",
          href: `${eventHref(blockedCloseouts[0].eventId)}?tab=closeout`,
          icon: AlertTriangle,
          status: "Blocked",
          tone: "danger",
          actionLabel: "Review",
        }
      : null,
    retentionActions.dueOpportunities.length
      ? {
          title: `${retentionActions.dueOpportunities.length} rebooking opportunity${
            retentionActions.dueOpportunities.length === 1 ? "" : "s"
          } need review`,
          description:
            "Past-client follow-ups require consent-aware review before outreach is sent.",
          href: withQuery("/ease-events/retention", { stage: "action" }),
          icon: CalendarClock,
          status: "Retention",
          tone: "warn",
          actionLabel: "Open retention",
        }
      : null,
    retentionActions.referralsNeedingReview.length
      ? {
          title: `${retentionActions.referralsNeedingReview.length} referral${
            retentionActions.referralsNeedingReview.length === 1 ? "" : "s"
          } need review`,
          description:
            "Confirm contact basis, introduction details, and reward eligibility before follow-up.",
          href: "/ease-events/retention",
          icon: UserPlus,
          status: "Referral",
          tone: "default",
          actionLabel: "Review",
        }
      : null,
    workflowApprovalQueue.length
      ? {
          title: `${workflowApprovalQueue.length} automation action${
            workflowApprovalQueue.length === 1 ? "" : "s"
          } awaiting approval`,
          description:
            "Review draft-sensitive automation work before it creates reminders, emails, or planner-facing actions.",
          href: "/ease-events/settings",
          icon: Sparkles,
          status: "Approval",
          tone: "warn",
          actionLabel: "Open automations",
        }
      : null,
    failedWorkflowRuns.length
      ? {
          title: `${failedWorkflowRuns.length} failed automation run${
            failedWorkflowRuns.length === 1 ? "" : "s"
          }`,
          description: "Inspect workflow execution errors and retry only after the cause is clear.",
          href: "/ease-events/settings",
          icon: AlertTriangle,
          status: "Failed",
          tone: "danger",
          actionLabel: "Inspect",
        }
      : null,
    unreadActionNotifications.length
      ? {
          title: `${unreadActionNotifications.length} automation notice${
            unreadActionNotifications.length === 1 ? "" : "s"
          } need attention`,
          description:
            "Planner notifications point to the project, event, or financial record that needs action.",
          href: unreadActionNotifications[0]?.href ?? "/ease-events",
          icon: Inbox,
          status: "Unread",
          tone: "warn",
          actionLabel: "Open",
        }
      : null,
    activeEventDaySessions.length
      ? {
          title: `${activeEventDaySessions.length} active event-day command center${
            activeEventDaySessions.length === 1 ? "" : "s"
          }`,
          description:
            "Monitor live run-of-show state, vendor arrivals, open issues, and queued sync status.",
          href: eventDayHref(activeEventDaySessions[0]?.eventId ?? ""),
          icon: Radio,
          status: "Active",
          tone: "danger",
          actionLabel: "Open",
        }
      : null,
    todayEvents.length
      ? {
          title: `${todayEvents.length} event${todayEvents.length === 1 ? "" : "s"} today`,
          description:
            "Open Event-Day Mode before arrivals start and prepare the offline run sheet.",
          href: eventDayHref(todayEvents[0].id),
          icon: CalendarClock,
          status: "Today",
          tone: "warn",
          actionLabel: "Command",
        }
      : null,
    activeEventDayIssues.length
      ? {
          title: `${activeEventDayIssues.length} active event-day issue${
            activeEventDayIssues.length === 1 ? "" : "s"
          }`,
          description:
            "Resolve timing, vendor, staffing, or client-decision issues from the command center.",
          href: eventDayHref(activeEventDayIssues[0]?.eventId ?? ""),
          icon: AlertTriangle,
          status: "Issue",
          tone: "danger",
          actionLabel: "Resolve",
        }
      : null,
    delayedCriticalTimelineItems.length
      ? {
          title: `${delayedCriticalTimelineItems.length} critical item${
            delayedCriticalTimelineItems.length === 1 ? "" : "s"
          } delayed or blocked`,
          description: "Critical run-of-show timing needs planner attention.",
          href: eventDayHref(delayedCriticalTimelineItems[0]?.eventId ?? ""),
          icon: Clock,
          status: "Delayed",
          tone: "danger",
          actionLabel: "Open timeline",
        }
      : null,
    vendorArrivalActions.length
      ? {
          title: `${vendorArrivalActions.length} vendor arrival update${
            vendorArrivalActions.length === 1 ? "" : "s"
          } needed`,
          description: "Confirm vendor arrival/setup before it becomes an event-day blocker.",
          href: eventDayHref(vendorArrivalActions[0]?.eventId ?? ""),
          icon: Building2,
          status: "Arrival",
          tone: "warn",
          actionLabel: "Check in",
        }
      : null,
    draftProposals.length
      ? {
          title: `${draftProposals.length} proposal draft${draftProposals.length === 1 ? "" : "s"} not sent`,
          description: "Finish pricing, scope, and payment terms so clients can review.",
          href: withQuery("/ease-events/leads", { stage: "Proposal Draft" }),
          icon: FileText,
          status: "Draft",
          tone: "warn",
          actionLabel: "Finish",
        }
      : null,
    sentNotViewedProposals.length
      ? {
          title: `${sentNotViewedProposals.length} proposal${sentNotViewedProposals.length === 1 ? "" : "s"} sent but not viewed`,
          description: "Follow up before momentum drops after consultation.",
          href: withQuery("/ease-events/leads", { stage: "Proposal Sent" }),
          icon: Send,
          status: "Not viewed",
          tone: "default",
          actionLabel: "Open",
        }
      : null,
    expiringSoonProposals.length
      ? {
          title: `${expiringSoonProposals.length} proposal${expiringSoonProposals.length === 1 ? "" : "s"} expiring soon`,
          description: "Extend, revise, or follow up before pricing goes stale.",
          href: withQuery("/ease-events/leads", { stage: "Proposal Sent" }),
          icon: Clock,
          status: "Expiring",
          tone: "warn",
          actionLabel: "Review",
        }
      : null,
    changeRequestedProposals.length
      ? {
          title: `${changeRequestedProposals.length} change request${changeRequestedProposals.length === 1 ? "" : "s"}`,
          description: "Client feedback is waiting for a revised proposal version.",
          href: withQuery("/ease-events/leads", { stage: "Changes Requested" }),
          icon: Pencil,
          status: "Requested",
          tone: "danger",
          actionLabel: "Revise",
        }
      : null,
    acceptedNotBookedProposals.length
      ? {
          title: `${acceptedNotBookedProposals.length} accepted proposal${acceptedNotBookedProposals.length === 1 ? "" : "s"} not booked`,
          description: "Collect deposit, issue invoices, or complete planner approval.",
          href: withQuery("/ease-events/leads", { stage: "Accepted" }),
          icon: BadgeDollarSign,
          status: "Booking",
          tone: "warn",
          actionLabel: "Complete",
        }
      : null,
    visibleCalendarConflicts.length
      ? {
          title: `${visibleCalendarConflicts.length} schedule conflict${
            visibleCalendarConflicts.length === 1 ? "" : "s"
          } need review`,
          description:
            "Planner overlaps, missing meeting links, or availability conflicts are visible on the unified calendar.",
          href: "/ease-events/calendar",
          icon: CalendarClock,
          status: "Calendar",
          tone: "warn",
          actionLabel: "Resolve",
        }
      : null,
    calendarSyncActions.length
      ? {
          title: `${calendarSyncActions.length} calendar item${
            calendarSyncActions.length === 1 ? "" : "s"
          } need sync attention`,
          description:
            "Some meetings or provider items are unsynced, failed, or marked retry required.",
          href: withQuery("/ease-events/calendar", { sync: "attention" }),
          icon: RotateCcw,
          status: "Sync",
          tone: "warn",
          actionLabel: "Open calendar",
        }
      : null,
    overdueTasks.length
      ? {
          title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`,
          description: "Clear or reassign late work before it becomes client-visible.",
          href: withQuery("/ease-events/tasks", { status: "open", due: "overdue" }),
          icon: AlertTriangle,
          status: "Overdue",
          tone: "danger",
          actionLabel: "Open tasks",
        }
      : null,
    pendingApprovals.length
      ? {
          title: `${pendingApprovals.length} client approval${
            pendingApprovals.length === 1 ? "" : "s"
          } waiting`,
          description:
            "Follow up on approvals blocking budget, proposal, moodboard, or timeline work.",
          href: withQuery("/ease-events/clients", { approvals: "pending" }),
          icon: CheckCircle2,
          status: "Pending",
          tone: "warn",
          actionLabel: "Open clients",
        }
      : null,
    newLeads.length
      ? {
          title: newLeads.length === 1 ? "1 new inquiry" : `${newLeads.length} new inquiries`,
          description: "Qualify date, budget, guest count, and consultation readiness.",
          href: withQuery("/ease-events/leads", { stage: "New Inquiry" }),
          icon: FolderOpen,
          status: "New Inquiry",
          tone: "warn",
          actionLabel: "Open leads",
        }
      : null,
    proposalLeads.length
      ? {
          title: `${proposalLeads.length} proposal follow-up${
            proposalLeads.length === 1 ? "" : "s"
          }`,
          description:
            "Move won work into event workspaces or mark lost so the pipeline stays honest.",
          href: withQuery("/ease-events/leads", { stage: "Proposal Sent" }),
          icon: ReceiptText,
          status: "Proposal Sent",
          tone: "default",
          actionLabel: "Review",
        }
      : null,
    needsReplyThreads.length
      ? {
          title: `${needsReplyThreads.length} client thread${
            needsReplyThreads.length === 1 ? "" : "s"
          } need reply`,
          description:
            "Recent email and meeting notes with pending follow-up are waiting in Meeting Notes.",
          href: withQuery("/ease-events/communications", { status: "Needs Reply" }),
          icon: MessageSquare,
          status: "Needs Reply",
          tone: "warn",
          actionLabel: "Reply",
        }
      : null,
    expensesAwaitingApproval.length
      ? {
          title: `${expensesAwaitingApproval.length} expense${expensesAwaitingApproval.length === 1 ? "" : "s"} awaiting approval`,
          description:
            "Review submitted vendor bills, receipts, or reimbursements before they affect cash plans.",
          href: withQuery("/ease-events/budgets", { view: "expenses", status: "Submitted" }),
          icon: ReceiptText,
          status: "Submitted",
          tone: "warn",
          actionLabel: "Approve",
        }
      : null,
    expensesMissingReceipts.length
      ? {
          title: `${expensesMissingReceipts.length} expense${expensesMissingReceipts.length === 1 ? "" : "s"} missing receipts`,
          description: "Attach receipt files so the bookkeeping trail is complete.",
          href: withQuery("/ease-events/budgets", { view: "expenses", receipt: "missing" }),
          icon: FileText,
          status: "Receipt",
          tone: "warn",
          actionLabel: "Attach",
        }
      : null,
    projectsOverBudget.length
      ? {
          title: `${projectsOverBudget.length} project${projectsOverBudget.length === 1 ? "" : "s"} over budget`,
          description:
            "Forecasted costs are above plan and should be explained before finalization.",
          href: withQuery("/ease-events/budgets", { view: "profitability" }),
          icon: BarChart3,
          status: "Over Budget",
          tone: "danger",
          actionLabel: "Review",
        }
      : null,
    projectsBelowMargin.length
      ? {
          title: `${projectsBelowMargin.length} project${projectsBelowMargin.length === 1 ? "" : "s"} below margin target`,
          description: "Margin risk may need pricing, cost, or scope decisions.",
          href: withQuery("/ease-events/reports", { report: "profitability" }),
          icon: AlertTriangle,
          status: "Margin",
          tone: "warn",
          actionLabel: "Review",
        }
      : null,
    globalFinance.outstandingExpenseBalance > 0
      ? {
          title: `${formatCurrency(globalFinance.outstandingExpenseBalance, currency)} vendor balance outstanding`,
          description: "Recorded incurred expenses still have unpaid vendor balances.",
          href: withQuery("/ease-events/budgets", { payment: "open" }),
          icon: Wallet,
          status: "Balance Due",
          tone: "warn",
          actionLabel: "Open finances",
        }
      : null,
    openInvoiceBalance > 0
      ? {
          title: `${formatCurrency(openInvoiceBalance, currency)} open client invoices`,
          description: overdueInvoices.length
            ? `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} are overdue.`
            : "Collect deposits, milestones, and final balances from Finances.",
          href: withQuery("/ease-events/budgets", { view: "payments", payment: "open" }),
          icon: CreditCard,
          status: overdueInvoices.length ? "Overdue" : "Balance Due",
          tone: overdueInvoices.length ? "danger" : "warn",
          actionLabel: "Collect",
        }
      : null,
  ].filter(Boolean) as ActionHubItem[];

  return (
    <div>
      <PageHeader
        eyebrow="Operations command center"
        title="Dashboard"
        description="A single view of Coco Cabana’s event workload, approvals, cash exposure, and delivery risk."
        actions={
          <Button onClick={() => (window.location.href = "/ease-events/inquiry")}>
            <Plus className="h-4 w-4" />
            New inquiry
          </Button>
        }
      />

      <div>
        <ActionHub
          title="Planner focus"
          description="The shortest path to a calmer day: resolve the items most likely to block clients, events, or cash."
          items={dashboardActions.slice(0, 5)}
          groupByTone
          emptyTitle="The operations queue is clear"
          emptyDescription="No overdue tasks, pending approvals, new inquiries, open replies, or budget balances need immediate action."
        />
      </div>

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <MetricCard
          label="Overdue tasks"
          value={`${overdueTasks.length}`}
          helper="Need attention"
          icon={CheckSquare}
          tone={overdueTasks.length > 0 ? "danger" : "good"}
          href={withQuery("/ease-events/tasks", { status: "open", due: "overdue" })}
        />
        <MetricCard
          label="Client approvals"
          value={`${pendingApprovals.length}`}
          helper="Waiting on clients"
          icon={CheckCircle2}
          tone={pendingApprovals.length > 0 ? "warn" : "good"}
          href={withQuery("/ease-events/events", { status: "Awaiting Client Approval" })}
        />
        <MetricCard
          label="New inquiries"
          value={`${newLeads.length}`}
          helper="Need response"
          icon={FolderOpen}
          tone={newLeads.length ? "warn" : "good"}
          href={withQuery("/ease-events/leads", { stage: "New Inquiry" })}
        />
        <MetricCard
          label="Upcoming events"
          value={`${upcomingEvents.length}`}
          helper="Next 45 days"
          icon={CalendarDays}
          href={withQuery("/ease-events/events", { status: "upcoming" })}
        />
        <MetricCard
          label="Open invoices"
          value={formatCurrency(openInvoiceBalance, currency)}
          helper="Client payments due"
          icon={CreditCard}
          tone={overdueInvoices.length ? "danger" : openInvoiceBalance > 0 ? "warn" : "good"}
          href={withQuery("/ease-events/budgets", { view: "payments", payment: "open" })}
        />
        <MetricCard
          label="Vendor balances"
          value={formatCurrency(globalFinance.outstandingExpenseBalance, currency)}
          helper="Incurred expenses not yet paid"
          icon={Wallet}
          tone={globalFinance.outstandingExpenseBalance > 0 ? "warn" : "good"}
          href={withQuery("/ease-events/budgets", { view: "expenses", payment: "open" })}
        />
        <MetricCard
          label="Meetings"
          value={`${upcomingMeetingCount}`}
          helper="Upcoming calls"
          icon={CalendarClock}
          href="/ease-events/calendar"
        />
        <MetricCard
          label="June revenue"
          value={formatCurrency(monthlyRevenue, currency)}
          helper="Contracted revenue"
          icon={BadgeDollarSign}
          tone="good"
          href={withQuery("/ease-events/events", { month: "2026-06" })}
        />
      </div>

      <div className="mt-6">
        <LifecyclePortfolioOverview data={data} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Upcoming events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Client price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nextEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <a
                        className="font-medium text-slate-950 hover:underline"
                        href={eventHref(event.id)}
                      >
                        {event.eventName}
                      </a>
                      <p className="text-xs text-slate-500">{event.location}</p>
                    </TableCell>
                    <TableCell>{formatDate(event.eventDate)}</TableCell>
                    <TableCell>{event.guestCount}</TableCell>
                    <TableCell>
                      <StatusBadge value={event.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(event.clientPrice, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Approval queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.length ? (
              pendingApprovals.slice(0, 5).map((approval) => {
                const event = data.events.find((item) => item.id === approval.eventId);
                return (
                  <a
                    key={approval.id}
                    href={event ? eventHref(event.id) : "/ease-events/events"}
                    className="block rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">{approval.title}</p>
                      <StatusBadge value={approval.type} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {event?.eventName} · Due {formatDate(approval.dueDate)}
                    </p>
                  </a>
                );
              })
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No pending approvals"
                description="Client-facing approvals are clear."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Overdue tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueTasks.length ? (
              overdueTasks.map((task) => {
                const event = data.events.find((item) => item.id === task.eventId);
                return (
                  <div key={task.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{event?.eventName}</p>
                      </div>
                      <StatusBadge value={task.priority} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Due {formatDate(task.dueDate)}</p>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="No overdue tasks"
                description="The execution board is clean."
              />
            )}
          </CardContent>
        </Card>

        <RevenueSnapshot events={data.events} currency={currency} />
      </div>
    </div>
  );
}

function RevenueSnapshot({ events, currency }: { events: EventRecord[]; currency: string }) {
  const months = [
    { label: "May", prefix: "2026-05" },
    { label: "Jun", prefix: "2026-06" },
    { label: "Jul", prefix: "2026-07" },
    { label: "Aug", prefix: "2026-08" },
  ];
  const values = months.map((month) => ({
    ...month,
    value: events
      .filter((event) => event.eventDate.startsWith(month.prefix))
      .reduce((sum, event) => sum + event.clientPrice, 0),
  }));
  const max = Math.max(...values.map((item) => item.value), 1);

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Monthly revenue summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {values.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="text-slate-500">{formatCurrency(item.value, currency)}</span>
            </div>
            <Progress value={(item.value / max) * 100} className="h-2 bg-slate-100" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function LoginPage() {
  const { signIn, signInAsDemoRole, currentUser } = useEaseEventsAuth();
  const [email, setEmail] = React.useState("owner@cococabana.demo");
  const [password, setPassword] = React.useState("demo123");
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (currentUser) window.location.href = "/ease-events";
  }, [currentUser]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      window.location.href = "/ease-events";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ease-events min-h-screen bg-[#f8f5ef] text-[#17130d]">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex items-center px-6 py-12 md:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-[#d4af37]/50 bg-black p-1">
                <img
                  src={easeEventsBrand.logoSrc}
                  alt={`${easeEventsBrand.organizationName} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-normal">
                  {easeEventsBrand.workspaceName}
                </p>
                <p className="text-sm text-[#6e6251]">{easeEventsBrand.workspaceLabel}</p>
              </div>
            </div>

            <h1 className="mt-10 text-4xl font-semibold tracking-normal">
              {easeEventsBrand.loginHeadline}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#6e6251]">
              {easeEventsBrand.loginDescription}
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["admin", "Admin"],
                  ["planner", "Planner"],
                  ["client", "Client"],
                  ["vendor", "Vendor"],
                ] satisfies [UserRole, string][]
              ).map(([role, label]) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signInAsDemoRole(role);
                    window.location.href =
                      role === "client" ? "/ease-events/client-portal" : "/ease-events";
                  }}
                >
                  Demo {label}
                </Button>
              ))}
            </div>
          </div>
        </section>
        <section className="hidden bg-[#17130d] p-8 text-white lg:block">
          <div className="flex h-full flex-col justify-between rounded-lg border border-[#d4af37]/25 bg-black/20 p-8">
            <div>
              <img
                src={easeEventsBrand.logoSrc}
                alt={`${easeEventsBrand.organizationName} logo`}
                className="mb-8 h-28 w-28 rounded-lg object-contain"
              />
              <p className="text-sm font-medium text-[#d8bf74]">Built for Coco Cabana</p>
              <h2 className="mt-4 text-5xl font-semibold tracking-normal">
                Leads, budgets, vendors, tasks, approvals, and files in one calm workspace.
              </h2>
            </div>
            <div className="grid gap-3">
              {[
                "Inquiry to booked event",
                "Client portal approvals",
                "Budget margin visibility",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg border border-[#d4af37]/15 bg-white/10 p-4"
                >
                  <CheckCircle2 className="h-5 w-5 text-[#d8bf74]" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

type PublicInquiryUploadItemStatus = "ready" | "uploading" | "uploaded" | "failed";

interface PublicInquiryUploadItem {
  id: string;
  file: File;
  previewUrl?: string;
  digest?: string;
  uploadId?: string;
  fileId?: string;
  status: PublicInquiryUploadItemStatus;
  progress: number;
  error?: string;
}

const publicInquiryUploadLimits = {
  maxFiles: 10,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 30 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

function bytesToLabel(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function createClientFileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function digestFile(file: File) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return undefined;
  }
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function detectFileSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  return "application/octet-stream";
}

async function validatePublicInquiryFiles(files: PublicInquiryUploadItem[]) {
  if (files.length > publicInquiryUploadLimits.maxFiles) {
    throw new Error(`Attach up to ${publicInquiryUploadLimits.maxFiles} files.`);
  }
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  if (totalSize > publicInquiryUploadLimits.maxTotalBytes) {
    throw new Error(
      `Combined uploads must stay under ${bytesToLabel(publicInquiryUploadLimits.maxTotalBytes)}.`,
    );
  }
  const names = new Set<string>();
  for (const item of files) {
    const normalizedName = item.file.name.toLowerCase();
    if (names.has(normalizedName)) {
      throw new Error(`Duplicate filename: ${item.file.name}. Rename or remove one copy.`);
    }
    names.add(normalizedName);
    if (!publicInquiryUploadLimits.allowedMimeTypes.includes(item.file.type)) {
      throw new Error(`${item.file.name} is not a supported file type.`);
    }
    if (item.file.size > publicInquiryUploadLimits.maxFileBytes) {
      throw new Error(
        `${item.file.name} is too large. Limit is ${bytesToLabel(publicInquiryUploadLimits.maxFileBytes)} per file.`,
      );
    }
    const detected = await detectFileSignature(item.file);
    if (detected !== item.file.type) {
      throw new Error(`${item.file.name} does not match its declared file type.`);
    }
  }
}

function uploadPublicInquiryFile(params: {
  uploadToken: string;
  uploadId: string;
  file: File;
  onProgress: (progress: number) => void;
}) {
  return new Promise<{ fileId: string; storagePath: string }>((resolve, reject) => {
    const formData = new FormData();
    formData.append("uploadToken", params.uploadToken);
    formData.append("uploadId", params.uploadId);
    formData.append("file", params.file);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/ease-events/public-inquiry/upload");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        params.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      const payload = JSON.parse(request.responseText || "{}");
      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
      } else {
        reject(new Error(payload.error ?? "Upload failed."));
      }
    };
    request.onerror = () => reject(new Error("Upload interrupted. Retry this file."));
    request.send(formData);
  });
}

export function InquiryPage() {
  const { createLead } = useEaseEventsStore();
  const submissionKeyRef = React.useRef(`easeevents-${createClientFileId()}`);
  const [form, setForm] = React.useState({
    clientName: "",
    email: "",
    phone: "",
    eventType: "",
    eventDate: "",
    estimatedGuestCount: 80,
    budgetRange: "$15k-$25k",
    notes: "",
    inspirationUrl1: "",
    inspirationUrl2: "",
    inspirationUrl3: "",
    source: "Website",
  });
  const [uploadItems, setUploadItems] = React.useState<PublicInquiryUploadItem[]>([]);
  const uploadItemsRef = React.useRef<PublicInquiryUploadItem[]>([]);
  const [uploadToken, setUploadToken] = React.useState("");
  const [partialLeadId, setPartialLeadId] = React.useState("");
  const [createdLeadId, setCreatedLeadId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

  React.useEffect(() => {
    return () => {
      uploadItemsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  function updateField(field: keyof typeof form, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSelectedFiles(selectedFiles: FileList | null) {
    setError("");
    if (!selectedFiles?.length) return;
    const nextItems = Array.from(selectedFiles).map((file) => ({
      id: createClientFileId(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      status: "ready" as const,
      progress: 0,
    }));

    try {
      await validatePublicInquiryFiles([...uploadItems, ...nextItems]);
      setUploadItems((current) => [...current, ...nextItems]);
    } catch (validationError) {
      nextItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setError(validationError instanceof Error ? validationError.message : "Unable to add files.");
    }
  }

  function removeUploadItem(itemId: string) {
    setUploadItems((current) => {
      const removed = current.find((item) => item.id === itemId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== itemId);
    });
  }

  async function submitSupabaseInquiry(eventDate: string, inspirationUrls: string[]) {
    await validatePublicInquiryFiles(uploadItems);
    const filesWithDigests = await Promise.all(
      uploadItems.map(async (item) => ({
        ...item,
        digest: item.digest ?? (await digestFile(item.file)),
      })),
    );
    setUploadItems(filesWithDigests);

    const response = await fetch("/api/ease-events/public-inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionKey: submissionKeyRef.current,
        clientName: form.clientName,
        email: form.email,
        phone: form.phone,
        eventType: form.eventType,
        eventDate,
        estimatedGuestCount: form.estimatedGuestCount,
        budgetRange: form.budgetRange,
        notes: form.notes,
        source: form.source,
        inspirationLinks: inspirationUrls.map((url, index) => ({
          label: index === 0 ? "Primary inspiration" : `Inspiration ${index + 1}`,
          url,
        })),
        files: filesWithDigests.map((item) => ({
          clientFileId: item.id,
          originalFilename: item.file.name,
          mimeType: item.file.type,
          sizeBytes: item.file.size,
          fileDigest: item.digest,
        })),
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? "Unable to submit inquiry.");
    setUploadToken(payload.uploadToken ?? "");

    const uploadSlots = new Map(
      (payload.uploadSlots ?? []).map(
        (slot: { clientFileId: string; id: string; status: string; fileId?: string }) => [
          slot.clientFileId,
          slot,
        ],
      ),
    );

    let failedUploadCount = 0;
    for (const item of filesWithDigests) {
      const slot = uploadSlots.get(item.id);
      if (!slot?.id) {
        failedUploadCount += 1;
        setUploadItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id
              ? { ...currentItem, status: "failed", error: "No upload slot returned." }
              : currentItem,
          ),
        );
        continue;
      }
      if (slot.status === "finalized" && slot.fileId) {
        setUploadItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  uploadId: slot.id,
                  fileId: slot.fileId,
                  status: "uploaded",
                  progress: 100,
                }
              : currentItem,
          ),
        );
        continue;
      }

      setUploadItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                uploadId: slot.id,
                status: "uploading",
                progress: 5,
                error: undefined,
              }
            : currentItem,
        ),
      );

      try {
        const upload = await uploadPublicInquiryFile({
          uploadToken: payload.uploadToken,
          uploadId: slot.id,
          file: item.file,
          onProgress: (progress) =>
            setUploadItems((current) =>
              current.map((currentItem) =>
                currentItem.id === item.id ? { ...currentItem, progress } : currentItem,
              ),
            ),
        });
        setUploadItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id
              ? { ...currentItem, fileId: upload.fileId, status: "uploaded", progress: 100 }
              : currentItem,
          ),
        );
      } catch (uploadError) {
        failedUploadCount += 1;
        setUploadItems((current) =>
          current.map((currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  uploadId: slot.id,
                  status: "failed",
                  progress: 0,
                  error: uploadError instanceof Error ? uploadError.message : "Upload failed.",
                }
              : currentItem,
          ),
        );
      }
    }

    if (payload.uploadToken) {
      await fetch("/api/ease-events/public-inquiry/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadToken: payload.uploadToken }),
      });
    }

    if (failedUploadCount) {
      setPartialLeadId(payload.lead.id);
      setError(
        `Inquiry created, but ${failedUploadCount} file${failedUploadCount === 1 ? "" : "s"} failed. Retry the failed upload from this page.`,
      );
    }

    return { lead: payload.lead as Lead, failedUploadCount };
  }

  async function retryUpload(itemId: string) {
    const item = uploadItems.find((current) => current.id === itemId);
    if (!item?.uploadId || !uploadToken) return;
    setUploadItems((current) =>
      current.map((currentItem) =>
        currentItem.id === itemId
          ? { ...currentItem, status: "uploading", progress: 5, error: undefined }
          : currentItem,
      ),
    );
    try {
      const upload = await uploadPublicInquiryFile({
        uploadToken,
        uploadId: item.uploadId,
        file: item.file,
        onProgress: (progress) =>
          setUploadItems((current) =>
            current.map((currentItem) =>
              currentItem.id === itemId ? { ...currentItem, progress } : currentItem,
            ),
          ),
      });
      setUploadItems((current) =>
        current.map((currentItem) =>
          currentItem.id === itemId
            ? { ...currentItem, fileId: upload.fileId, status: "uploaded", progress: 100 }
            : currentItem,
        ),
      );
      const hasRemainingFailures = uploadItemsRef.current.some(
        (currentItem) => currentItem.id !== itemId && currentItem.status === "failed",
      );
      if (!hasRemainingFailures) {
        setError("");
        if (uploadToken) {
          await fetch("/api/ease-events/public-inquiry/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadToken }),
          });
        }
        if (partialLeadId) setCreatedLeadId(partialLeadId);
      }
    } catch (uploadError) {
      setUploadItems((current) =>
        current.map((currentItem) =>
          currentItem.id === itemId
            ? {
                ...currentItem,
                status: "failed",
                progress: 0,
                error: uploadError instanceof Error ? uploadError.message : "Upload failed.",
              }
            : currentItem,
        ),
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const eventDate =
        event.currentTarget.querySelector<HTMLInputElement>("#eventDate")?.value ?? form.eventDate;
      const inspirationUrls = [
        form.inspirationUrl1,
        form.inspirationUrl2,
        form.inspirationUrl3,
      ].filter(Boolean);
      const result = hasSupabaseConfig()
        ? await submitSupabaseInquiry(eventDate, inspirationUrls)
        : {
            lead: await createLead({
              clientName: form.clientName,
              email: form.email,
              phone: form.phone,
              eventType: form.eventType,
              eventDate,
              estimatedGuestCount: form.estimatedGuestCount,
              budgetRange: form.budgetRange,
              notes: form.notes,
              source: form.source,
              inspirationLinks: inspirationUrls.map((url, index) => ({
                label: index === 0 ? "Primary inspiration" : `Inspiration ${index + 1}`,
                url,
              })),
            }),
            failedUploadCount: 0,
          };
      if (result.failedUploadCount) {
        setPartialLeadId(result.lead.id);
      } else {
        setCreatedLeadId(result.lead.id);
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create inquiry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ease-events min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <a href="/ease-events" className="text-sm font-medium text-slate-500 hover:text-slate-950">
          Back to EaseEvents
        </a>
        <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl tracking-normal text-slate-950">
              New event inquiry
            </CardTitle>
            <p className="text-sm text-slate-500">
              Capture the lead details Coco Cabana needs before consultation and proposal.
            </p>
          </CardHeader>
          <CardContent>
            {createdLeadId ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="font-semibold text-emerald-900">Inquiry created</h2>
                <p className="mt-1 text-sm text-emerald-700">
                  The lead is now in New Inquiry. Open it to qualify, move it through the pipeline,
                  then create the event workspace when it is booked.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => (window.location.href = leadHref(createdLeadId))}
                >
                  Open lead
                </Button>
              </div>
            ) : (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client name</Label>
                  <Input
                    id="clientName"
                    required
                    value={form.clientName}
                    onChange={(event) => updateField("clientName", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    required
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event type</Label>
                  <Input
                    id="eventType"
                    required
                    value={form.eventType}
                    onChange={(event) => updateField("eventType", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event date</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    required
                    defaultValue={form.eventDate}
                    onChange={(event) => updateField("eventDate", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestCount">Estimated guest count</Label>
                  <Input
                    id="guestCount"
                    type="number"
                    min={1}
                    required
                    value={form.estimatedGuestCount}
                    onChange={(event) =>
                      updateField("estimatedGuestCount", Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">Budget range</Label>
                  <Input
                    id="budgetRange"
                    required
                    value={form.budgetRange}
                    onChange={(event) => updateField("budgetRange", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={form.source}
                    onChange={(event) => updateField("source", event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    required
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Share Pinterest boards, inspiration links, themes, colours, special requests, or
                    anything else that helps us understand your vision.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Inspiration links</Label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {(["inspirationUrl1", "inspirationUrl2", "inspirationUrl3"] as const).map(
                      (field, index) => (
                        <Input
                          key={field}
                          type="url"
                          placeholder={`https://example.com/board-${index + 1}`}
                          value={form[field]}
                          onChange={(event) => updateField(field, event.target.value)}
                        />
                      ),
                    )}
                  </div>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <div className="space-y-1">
                    <Label htmlFor="inquiryFiles">Inspiration images and documents</Label>
                    <p className="text-xs leading-5 text-slate-500">
                      Optional. Attach up to {publicInquiryUploadLimits.maxFiles} files. JPG, PNG,
                      WEBP, and PDF are supported, up to{" "}
                      {bytesToLabel(publicInquiryUploadLimits.maxFileBytes)} each.
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Upload mood boards, reference photos, or PDFs
                          </p>
                          <p className="text-xs text-slate-500">
                            Files are uploaded only after the inquiry is created.
                          </p>
                        </div>
                      </div>
                      <Input
                        id="inquiryFiles"
                        type="file"
                        multiple
                        accept={publicInquiryUploadLimits.allowedMimeTypes.join(",")}
                        disabled={isSubmitting}
                        className="w-full cursor-pointer bg-white sm:max-w-72"
                        onChange={(event) => {
                          void handleSelectedFiles(event.target.files);
                          event.currentTarget.value = "";
                        }}
                      />
                    </div>
                  </div>
                  {uploadItems.length ? (
                    <div className="grid gap-3">
                      {uploadItems.map((item) => {
                        const statusLabel =
                          item.status === "ready"
                            ? "Ready"
                            : item.status === "uploading"
                              ? "Uploading"
                              : item.status === "uploaded"
                                ? "Uploaded"
                                : "Failed";
                        return (
                          <div
                            key={item.id}
                            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[72px_minmax(0,1fr)]"
                          >
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt=""
                                className="h-20 w-full rounded-md border border-slate-200 object-cover sm:h-16 sm:w-16"
                              />
                            ) : (
                              <div className="flex h-20 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 sm:h-16 sm:w-16">
                                <FileText className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {item.file.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.file.type || "Unknown type"} ·{" "}
                                    {bytesToLabel(item.file.size)}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                                    item.status === "uploaded" && "bg-emerald-50 text-emerald-700",
                                    item.status === "uploading" && "bg-amber-50 text-amber-700",
                                    item.status === "failed" && "bg-rose-50 text-rose-700",
                                    item.status === "ready" && "bg-slate-100 text-slate-600",
                                  )}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                              {item.status === "uploading" ? (
                                <div className="mt-3">
                                  <Progress value={item.progress} />
                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.progress}% uploaded
                                  </p>
                                </div>
                              ) : null}
                              {item.error ? (
                                <p className="mt-2 text-sm text-rose-600">{item.error}</p>
                              ) : null}
                              {item.status === "ready" || item.status === "failed" ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeUploadItem(item.id)}
                                    disabled={isSubmitting && item.status === "ready"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </Button>
                                  {item.status === "failed" && item.uploadId && uploadToken ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => void retryUpload(item.id)}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                      Retry
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={isSubmitting}>
                      <Plus className="h-4 w-4" />
                      {isSubmitting ? "Creating..." : "Create inquiry"}
                    </Button>
                    {partialLeadId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => (window.location.href = leadHref(partialLeadId))}
                      >
                        Open created lead
                      </Button>
                    ) : null}
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <LifecycleAuditSummary />
      </div>
    </div>
  );
}

export function LeadsPage() {
  const { data, updateLeadStage } = useEaseEventsStore();
  const [stageFilter, setStageFilter] = React.useState(() => readQueryParam("stage", "actionable"));
  const [clientFilter, setClientFilter] = React.useState(() => readQueryParam("client", "all"));
  const [showPipelineGuide, setShowPipelineGuide] = React.useState(false);
  const filteredLeads = data.leads.filter((lead) => {
    const stageMatches =
      stageFilter === "all" ||
      (stageFilter === "actionable" &&
        ["New Inquiry", "Consultation Scheduled", "Proposal Sent"].includes(lead.stage)) ||
      lead.stage === stageFilter;
    const clientMatches =
      clientFilter === "all" ||
      getLeadClientKey(data, lead) === clientFilter ||
      lead.email === clientFilter ||
      lead.clientNameSnapshot === clientFilter ||
      lead.clientName === clientFilter;
    return stageMatches && clientMatches;
  });

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Lead pipeline"
        description="Events start here: capture an inquiry, qualify the lead, then create the event workspace once the client books."
        actions={
          <Button onClick={() => (window.location.href = "/ease-events/inquiry")}>
            <Plus className="h-4 w-4" />
            New inquiry
          </Button>
        }
      />

      <Card className="mb-4 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setShowPipelineGuide((current) => !current)}
            aria-expanded={showPipelineGuide}
          >
            <span>
              <span className="text-sm font-semibold text-slate-950">Pipeline guide</span>
              <span className="mt-1 block text-sm text-slate-500">
                Create the inquiry, qualify the lead, then book only after proposal and payment
                checks are complete.
              </span>
            </span>
            <span className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {showPipelineGuide ? "Hide" : "Show"}
            </span>
          </button>
          {showPipelineGuide ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">
              {[
                ["1", "Create inquiry", "Capture client, date, guest count, budget, and notes."],
                [
                  "2",
                  "Work the pipeline",
                  "Move the lead through consultation and proposal stages.",
                ],
                [
                  "3",
                  "Accept + collect deposit",
                  "Only complete booking after proposal, terms, and payment requirements are satisfied.",
                ],
              ].map(([step, title, description]) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-5 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lead-stage-filter">Lead status</Label>
            <select
              id="lead-stage-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
            >
              <option value="actionable">Actionable leads</option>
              <option value="all">All lead statuses</option>
              {leadStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-client-filter">Client / lead</Label>
            <select
              id="lead-client-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="all">All clients and leads</option>
              {data.leads.map((lead) => (
                <option key={lead.id} value={getLeadClientKey(data, lead)}>
                  {getLeadClientName(data, lead)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        {leadStages.map((stage) => {
          const leads = filteredLeads.filter((lead) => lead.stage === stage);
          return (
            <section
              key={stage}
              className="min-h-80 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-950">{stage}</h2>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {leads.length}
                </span>
              </div>
              <div className="space-y-3">
                {leads.map((lead) => (
                  <article
                    key={lead.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="min-w-0">
                        <a
                          href={leadHref(lead.id)}
                          className="break-words font-semibold text-slate-950 hover:underline"
                        >
                          {getLeadClientName(data, lead)}
                        </a>
                        <p className="mt-1 text-sm text-slate-500">{lead.eventType}</p>
                      </div>
                      <StatusBadge
                        value={lead.stage}
                        className="w-fit max-w-full px-2 py-0.5 text-[11px] leading-4"
                      />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500">
                      <p>
                        {formatDate(lead.eventDate)} · {lead.estimatedGuestCount} guests
                      </p>
                      <p className="font-medium text-slate-600">{lead.budgetRange}</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      <select
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                        value={lead.stage}
                        onChange={(event) =>
                          void updateLeadStage(lead.id, event.target.value as LeadStage)
                        }
                      >
                        {leadStages.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      {lead.convertedEventId ? (
                        <Button
                          className="w-full"
                          size="sm"
                          variant="outline"
                          onClick={() => (window.location.href = eventHref(lead.convertedEventId!))}
                        >
                          Open event workspace
                        </Button>
                      ) : lead.stage !== "Lost" ? (
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => (window.location.href = leadHref(lead.id))}
                        >
                          {getLeadConversionButtonLabel(lead)}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {!leads.length ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                    No {stage.toLowerCase()} leads match the current filters.
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type ProposalStepKey = "details" | "services" | "pricing" | "payments" | "review";

const proposalStepConfig: Array<{
  key: ProposalStepKey;
  label: string;
  helper: string;
}> = [
  { key: "details", label: "Details", helper: "Intro, scope, terms" },
  { key: "services", label: "Services", helper: "Client-visible line items" },
  { key: "pricing", label: "Pricing", helper: "Discount, tax, total" },
  { key: "payments", label: "Payments", helper: "Deposit and due dates" },
  { key: "review", label: "Review", helper: "Checks before send" },
];

function ProposalWorkspacePanel({
  data,
  project,
  lead,
  event,
}: {
  data: EaseEventsData;
  project?: ProjectRecord;
  lead?: Lead;
  event?: EventRecord;
}) {
  const { saveProposalDraft, sendProposal, recordOfflinePayment, approveProjectBooking } =
    useEaseEventsStore();
  const proposal = getProjectProposal(data, project?.id);
  const version = getProposalVersion(data, proposal);
  const lineItems = getProposalLineItems(data, version);
  const paymentTerms = getProposalPaymentTerms(data, version);
  const responses = getProposalResponses(data, proposal);
  const booking = getBookingRequirementSummary(data, project, proposal);
  const projectInvoices = getProjectInvoices(data, project?.id, event?.id).filter(
    (invoice) =>
      !proposal || invoice.proposalId === proposal.id || invoice.projectId === project?.id,
  );
  const [status, setStatus] = React.useState("");
  const [isBusy, setIsBusy] = React.useState(false);
  const [activeProposalStep, setActiveProposalStep] = React.useState<ProposalStepKey>("details");
  const [draft, setDraft] = React.useState(() => ({
    title: proposal?.title ?? `${lead?.eventType ?? event?.eventType ?? "Event"} proposal`,
    introduction:
      version?.introduction ??
      `Thank you for considering ${data.organization.name}. This proposal outlines the recommended scope, pricing, and payment schedule.`,
    scope:
      version?.scope ??
      "Planning, decor coordination, vendor support, client approvals, and event execution support.",
    terms:
      version?.terms ??
      "Acceptance confirms the selected proposal version and payment schedule. Dates and pricing remain subject to vendor availability until deposit payment is received.",
    discountAmount: version?.discountAmount ?? 0,
    taxAmount: version?.taxAmount ?? 0,
    validUntil:
      proposal?.validUntil ??
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    lineItems:
      lineItems.length > 0
        ? lineItems.map((item) => ({
            category: item.category,
            name: item.name,
            description: item.description ?? "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxRate: item.taxRate,
            isOptional: item.isOptional,
            isSelected: item.isSelected,
            clientVisible: item.clientVisible,
            sortOrder: item.sortOrder,
          }))
        : [
            {
              category: "Decor",
              name: "Event planning and decor scope",
              description: "Confirmed services from consultation.",
              quantity: 1,
              unitPrice: 0,
              discountAmount: 0,
              taxRate: undefined,
              isOptional: false,
              isSelected: true,
              clientVisible: true,
              sortOrder: 0,
            },
          ],
    paymentTerms:
      paymentTerms.length > 0
        ? paymentTerms.map((term) => ({
            label: term.label,
            paymentType: term.paymentType,
            amountType: term.amountType,
            amountValue: term.amountValue,
            dueRule: term.dueRule,
            dueDate: term.dueDate,
            dueOffsetDays: term.dueOffsetDays,
            requiredForBooking: term.requiredForBooking,
            sortOrder: term.sortOrder,
          }))
        : [
            {
              label: "Deposit to book",
              paymentType: "Deposit" as const,
              amountType: "Percent" as const,
              amountValue: 50,
              dueRule: "On Acceptance" as const,
              dueDate: "",
              dueOffsetDays: undefined,
              requiredForBooking: true,
              sortOrder: 0,
            },
            {
              label: "Final balance",
              paymentType: "Final" as const,
              amountType: "Percent" as const,
              amountValue: 50,
              dueRule: "Before Event" as const,
              dueDate: event?.eventDate ?? lead?.eventDate ?? "",
              dueOffsetDays: -14,
              requiredForBooking: false,
              sortOrder: 1,
            },
          ],
  }));
  const proposalId = proposal?.id;
  const proposalCurrentVersionId = proposal?.currentVersionId;
  const proposalTitle = proposal?.title;
  const proposalValidUntil = proposal?.validUntil;
  const versionId = version?.id;
  const versionIntroduction = version?.introduction;
  const versionScope = version?.scope;
  const versionTerms = version?.terms;
  const versionDiscountAmount = version?.discountAmount;
  const versionTaxAmount = version?.taxAmount;

  React.useEffect(() => {
    if (!proposalId || !versionId) return;
    setDraft((current) => ({
      ...current,
      title: proposalTitle ?? current.title,
      introduction: versionIntroduction ?? current.introduction,
      scope: versionScope ?? current.scope,
      terms: versionTerms ?? current.terms,
      discountAmount: versionDiscountAmount ?? current.discountAmount,
      taxAmount: versionTaxAmount ?? current.taxAmount,
      validUntil: proposalValidUntil ?? current.validUntil,
    }));
  }, [
    proposalCurrentVersionId,
    proposalId,
    proposalTitle,
    proposalValidUntil,
    versionDiscountAmount,
    versionId,
    versionIntroduction,
    versionScope,
    versionTaxAmount,
    versionTerms,
  ]);

  const draftSubtotal = draft.lineItems
    .filter((item) => item.clientVisible && item.isSelected)
    .reduce(
      (sum, item) => sum + Math.max(item.quantity * item.unitPrice - item.discountAmount, 0),
      0,
    );
  const draftTotal = Math.max(draftSubtotal - draft.discountAmount + draft.taxAmount, 0);
  const depositTerm = draft.paymentTerms.find((term) => term.paymentType === "Deposit");
  const depositAmount =
    depositTerm?.amountType === "Percent"
      ? Math.round(draftTotal * (depositTerm.amountValue / 100) * 100) / 100
      : (depositTerm?.amountValue ?? 0);
  const currentProposalStepIndex = Math.max(
    proposalStepConfig.findIndex((step) => step.key === activeProposalStep),
    0,
  );
  const activeStep = proposalStepConfig[currentProposalStepIndex];
  const requiredPaymentTerms = draft.paymentTerms.filter((term) => term.requiredForBooking);
  const visibleLineItems = draft.lineItems.filter((item) => item.clientVisible);
  const proposalStatusIsError =
    status.startsWith("Unable") || status.startsWith("Save the draft") || status.startsWith("Add ");
  const proposalNextAction = proposal
    ? proposal.status === "Accepted"
      ? "Accepted. Record final payments and create the event workspace when requirements are clear."
      : booking.completed >= booking.total
        ? "Booking checks are clear. Send the proposal or create the event workspace when ready."
        : booking.nextAction || "Review booking checks before sending."
    : "Save the draft before sending it to the client.";

  async function handleSaveDraft() {
    if (!project) return;
    setIsBusy(true);
    setStatus("");
    try {
      const saved = await saveProposalDraft({
        projectId: project.id,
        proposalId: proposal?.id,
        ...draft,
      });
      setStatus(
        saved
          ? `${saved.proposalNumber} saved as draft. Review booking checks before sending.`
          : "Proposal saved. Review booking checks before sending.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save proposal.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSendProposal() {
    if (!proposal) {
      setStatus("Save the draft before sending.");
      return;
    }
    setIsBusy(true);
    setStatus("");
    try {
      const result = await sendProposal(proposal.id);
      setStatus(
        result.reviewUrl
          ? `Proposal sent (${result.deliveryStatus ?? "recorded"}). Review link: ${result.reviewUrl}`
          : `Proposal sent (${result.deliveryStatus ?? "recorded"}).`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send proposal.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRecordPayment(invoice: InvoiceRecord) {
    setIsBusy(true);
    setStatus("");
    try {
      await recordOfflinePayment({
        invoiceId: invoice.id,
        amount: getInvoiceBalance(invoice),
        paymentMethod: "Offline",
        paidAt: new Date().toISOString(),
        note: "Recorded from proposal booking panel.",
      });
      setStatus("Payment recorded and booking requirements refreshed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to record payment.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePlannerApproval() {
    if (!project) return;
    setIsBusy(true);
    setStatus("");
    try {
      await approveProjectBooking(project.id, "Approved from proposal workspace.");
      setStatus("Planner booking approval recorded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to approve booking.");
    } finally {
      setIsBusy(false);
    }
  }

  if (!project) {
    return (
      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <EmptyState
            icon={FileText}
            title="No project context"
            description="Create a project workspace before drafting proposals."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Proposal and booking</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              {getProposalLifecycleCopy(proposal, version, booking)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proposal ? <StatusBadge status={proposal.status} /> : null}
            <StatusBadge status={`${booking.completed}/${booking.total} booking checks`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={FileText}
            label="Proposal total"
            value={formatCurrency(version?.totalAmount ?? draftTotal, data.organization.currency)}
            helper={version ? `Version ${version.versionNumber}` : "Draft estimate"}
          />
          <MetricCard
            icon={Wallet}
            label="Required deposit"
            value={formatCurrency(
              paymentTerms.find((term) => term.paymentType === "Deposit")?.calculatedAmount ??
                depositAmount,
              data.organization.currency,
            )}
            helper="From payment terms"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Booking progress"
            value={`${booking.completed}/${booking.total}`}
            helper={booking.nextAction || "No blockers"}
          />
          <MetricCard
            icon={Clock}
            label="Expires"
            value={
              proposal?.validUntil ? formatDate(proposal.validUntil) : formatDate(draft.validUntil)
            }
            helper="Client review deadline"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-4">
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-5">
              {proposalStepConfig.map((step, index) => {
                const isActive = step.key === activeProposalStep;
                return (
                  <button
                    key={step.key}
                    type="button"
                    className={cn(
                      "flex min-w-0 items-start gap-2 rounded-md px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:bg-white/70",
                    )}
                    onClick={() => setActiveProposalStep(step.key)}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                        isActive ? "bg-slate-950 text-white" : "bg-white text-slate-600",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{step.label}</span>
                      <span className="block truncate text-[11px]">{step.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {activeStep.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{activeStep.helper}</p>
                </div>
                <StatusBadge
                  status={`${formatCurrency(draftTotal, data.organization.currency)} draft total`}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{proposalNextAction}</p>
            </div>

            {status ? (
              <div
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  proposalStatusIsError
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800",
                )}
              >
                {status}
              </div>
            ) : null}

            <div className={cn("space-y-4", activeProposalStep === "details" ? "block" : "hidden")}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="proposal-title">Title</Label>
                  <Input
                    id="proposal-title"
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proposal-valid-until">Valid until</Label>
                  <Input
                    id="proposal-valid-until"
                    type="date"
                    value={draft.validUntil}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, validUntil: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="proposal-intro">Introduction</Label>
                  <Textarea
                    id="proposal-intro"
                    value={draft.introduction}
                    rows={5}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, introduction: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="proposal-scope">Scope</Label>
                  <Textarea
                    id="proposal-scope"
                    value={draft.scope}
                    rows={5}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, scope: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="proposal-terms">Terms</Label>
                  <Textarea
                    id="proposal-terms"
                    value={draft.terms}
                    rows={5}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, terms: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div
              className={cn(
                "rounded-lg border border-slate-200",
                activeProposalStep === "services" ? "block" : "hidden",
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-950">Line items</p>
                  <p className="text-sm text-slate-500">Required services and optional upgrades.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      lineItems: [
                        ...current.lineItems,
                        {
                          category: "Miscellaneous",
                          name: "",
                          description: "",
                          quantity: 1,
                          unitPrice: 0,
                          discountAmount: 0,
                          taxRate: undefined,
                          isOptional: false,
                          isSelected: true,
                          clientVisible: true,
                          sortOrder: current.lineItems.length,
                        },
                      ],
                    }))
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add item
                </Button>
              </div>
              <div className="divide-y divide-slate-200">
                {draft.lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-3 p-3 lg:grid-cols-[1fr_0.9fr_0.6fr_0.6fr_auto]"
                  >
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={item.name}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            lineItems: current.lineItems.map((lineItem, itemIndex) =>
                              itemIndex === index
                                ? { ...lineItem, name: event.target.value }
                                : lineItem,
                            ),
                          }))
                        }
                      />
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            lineItems: current.lineItems.map((lineItem, itemIndex) =>
                              itemIndex === index
                                ? { ...lineItem, description: event.target.value }
                                : lineItem,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={item.category ?? "Miscellaneous"}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            lineItems: current.lineItems.map((lineItem, itemIndex) =>
                              itemIndex === index
                                ? { ...lineItem, category: event.target.value }
                                : lineItem,
                            ),
                          }))
                        }
                      >
                        {budgetCategories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={item.isOptional}
                            onCheckedChange={(checked) =>
                              setDraft((current) => ({
                                ...current,
                                lineItems: current.lineItems.map((lineItem, itemIndex) =>
                                  itemIndex === index
                                    ? { ...lineItem, isOptional: Boolean(checked) }
                                    : lineItem,
                                ),
                              }))
                            }
                          />
                          Optional
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={item.clientVisible}
                            onCheckedChange={(checked) =>
                              setDraft((current) => ({
                                ...current,
                                lineItems: current.lineItems.map((lineItem, itemIndex) =>
                                  itemIndex === index
                                    ? { ...lineItem, clientVisible: Boolean(checked) }
                                    : lineItem,
                                ),
                              }))
                            }
                          />
                          Client visible
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Qty</Label>
                      <Input
                        inputMode="decimal"
                        value={item.quantity || ""}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            lineItems: current.lineItems.map((lineItem, itemIndex) =>
                              itemIndex === index
                                ? { ...lineItem, quantity: parseDecimalInput(event.target.value) }
                                : lineItem,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit price</Label>
                      <Input
                        inputMode="decimal"
                        value={item.unitPrice || ""}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            lineItems: current.lineItems.map((lineItem, itemIndex) =>
                              itemIndex === index
                                ? { ...lineItem, unitPrice: parseDecimalInput(event.target.value) }
                                : lineItem,
                            ),
                          }))
                        }
                        placeholder="0.00"
                      />
                      <p className="text-xs font-semibold text-slate-500">
                        {formatCurrency(
                          Math.max(item.quantity * item.unitPrice - item.discountAmount, 0),
                          data.organization.currency,
                        )}
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            lineItems: current.lineItems.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                        aria-label="Remove line item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "gap-4 md:grid-cols-3",
                activeProposalStep === "pricing" ? "grid" : "hidden",
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="proposal-discount">Discount</Label>
                <Input
                  id="proposal-discount"
                  inputMode="decimal"
                  value={draft.discountAmount || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      discountAmount: parseDecimalInput(event.target.value),
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-tax">Tax</Label>
                <Input
                  id="proposal-tax"
                  inputMode="decimal"
                  value={draft.taxAmount || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      taxAmount: parseDecimalInput(event.target.value),
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Draft total
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatCurrency(draftTotal, data.organization.currency)}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "rounded-lg border border-slate-200 p-3",
                activeProposalStep === "payments" ? "block" : "hidden",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-950">Payment schedule</p>
                  <p className="text-sm text-slate-500">
                    Deposit and final terms generate invoices after acceptance.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      paymentTerms: [
                        ...current.paymentTerms,
                        {
                          label: "Custom payment",
                          paymentType: "Custom",
                          amountType: "Fixed",
                          amountValue: 0,
                          dueRule: "Fixed Date",
                          dueDate: "",
                          dueOffsetDays: undefined,
                          requiredForBooking: false,
                          sortOrder: current.paymentTerms.length,
                        },
                      ],
                    }))
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add term
                </Button>
              </div>
              <div className="mt-3 space-y-3">
                {draft.paymentTerms.map((term, index) => (
                  <div key={index} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-5">
                    <Input
                      value={term.label}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          paymentTerms: current.paymentTerms.map((paymentTerm, termIndex) =>
                            termIndex === index
                              ? { ...paymentTerm, label: event.target.value }
                              : paymentTerm,
                          ),
                        }))
                      }
                    />
                    <select
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={term.paymentType}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          paymentTerms: current.paymentTerms.map((paymentTerm, termIndex) =>
                            termIndex === index
                              ? {
                                  ...paymentTerm,
                                  paymentType: event.target.value as never,
                                }
                              : paymentTerm,
                          ),
                        }))
                      }
                    >
                      {["Deposit", "Installment", "Final", "Custom"].map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <select
                        className="h-10 w-28 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={term.amountType}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            paymentTerms: current.paymentTerms.map((paymentTerm, termIndex) =>
                              termIndex === index
                                ? {
                                    ...paymentTerm,
                                    amountType: event.target.value as never,
                                  }
                                : paymentTerm,
                            ),
                          }))
                        }
                      >
                        <option>Fixed</option>
                        <option>Percent</option>
                      </select>
                      <Input
                        inputMode="decimal"
                        value={term.amountValue || ""}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            paymentTerms: current.paymentTerms.map((paymentTerm, termIndex) =>
                              termIndex === index
                                ? {
                                    ...paymentTerm,
                                    amountValue: parseDecimalInput(event.target.value),
                                  }
                                : paymentTerm,
                            ),
                          }))
                        }
                        placeholder={term.amountType === "Percent" ? "0" : "0.00"}
                      />
                    </div>
                    <Input
                      type="date"
                      value={term.dueDate ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          paymentTerms: current.paymentTerms.map((paymentTerm, termIndex) =>
                            termIndex === index
                              ? { ...paymentTerm, dueDate: event.target.value }
                              : paymentTerm,
                          ),
                        }))
                      }
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <Checkbox
                          checked={term.requiredForBooking}
                          onCheckedChange={(checked) =>
                            setDraft((current) => ({
                              ...current,
                              paymentTerms: current.paymentTerms.map((paymentTerm, termIndex) =>
                                termIndex === index
                                  ? { ...paymentTerm, requiredForBooking: Boolean(checked) }
                                  : paymentTerm,
                              ),
                            }))
                          }
                        />
                        Required
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            paymentTerms: current.paymentTerms.filter(
                              (_, termIndex) => termIndex !== index,
                            ),
                          }))
                        }
                        aria-label="Remove payment term"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={cn("space-y-4", activeProposalStep === "review" ? "block" : "hidden")}>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Visible services
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {visibleLineItems.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {visibleLineItems.length
                      ? "These line items can appear on the client proposal."
                      : "Add at least one client-visible line item before sending."}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Required payments
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {requiredPaymentTerms.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Required terms become booking checks after acceptance.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Booking checks
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {booking.completed}/{booking.total}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {booking.nextAction || "No required booking blockers are open."}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">Client-facing draft summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{draft.introduction}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Services total
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {formatCurrency(draftTotal, data.organization.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Deposit
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {formatCurrency(depositAmount, data.organization.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-4 z-10 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">
                    Step {currentProposalStepIndex + 1} of {proposalStepConfig.length}:{" "}
                    {activeStep.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{proposalNextAction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentProposalStepIndex > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setActiveProposalStep(proposalStepConfig[currentProposalStepIndex - 1].key)
                      }
                    >
                      Back
                    </Button>
                  ) : null}
                  {currentProposalStepIndex < proposalStepConfig.length - 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setActiveProposalStep(proposalStepConfig[currentProposalStepIndex + 1].key)
                      }
                    >
                      Continue
                    </Button>
                  ) : null}
                  <Button onClick={handleSaveDraft} disabled={isBusy}>
                    <FileText className="h-4 w-4" />
                    {proposal ? "Save revised version" : "Save draft"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendProposal}
                    disabled={isBusy || !proposal || proposal.status === "Accepted"}
                  >
                    <Send className="h-4 w-4" />
                    Send proposal
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">Booking requirements</p>
              <div className="mt-3 space-y-2">
                {booking.checks
                  .filter((check) => check.required)
                  .map((check) => (
                    <div
                      key={check.key}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-slate-600">{check.label}</span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-semibold",
                          check.complete
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {check.complete ? "Done" : check.responsibleParty}
                      </span>
                    </div>
                  ))}
              </div>
              {booking.checks.some(
                (check) =>
                  check.key === "manual_planner_approval" && check.required && !check.complete,
              ) ? (
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={handlePlannerApproval}
                  disabled={isBusy}
                >
                  Approve booking
                </Button>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">Client responses</p>
              <div className="mt-3 space-y-3">
                {responses.length ? (
                  responses.map((response) => (
                    <div key={response.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge status={response.responseType} />
                        <span className="text-xs text-slate-500">
                          {formatDateTime(response.respondedAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-950">
                        {response.responderName ?? response.responderEmail ?? "Client"}
                      </p>
                      {response.comment ? (
                        <p className="mt-1 text-sm text-slate-600">{response.comment}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No client response yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">Generated invoices</p>
              <div className="mt-3 space-y-3">
                {projectInvoices.length ? (
                  projectInvoices.map((invoice) => {
                    const balance = getInvoiceBalance(invoice);
                    return (
                      <div key={invoice.id} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-slate-500">
                              {invoice.invoiceType} ·{" "}
                              {formatCurrency(invoice.amount, data.organization.currency)}
                            </p>
                          </div>
                          <StatusBadge status={getEffectiveInvoiceStatus(invoice)} />
                        </div>
                        {balance > 0 ? (
                          <Button
                            className="mt-3 w-full"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecordPayment(invoice)}
                            disabled={isBusy}
                          >
                            Record offline payment
                          </Button>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    Invoices are generated only after the client accepts confirmed payment terms.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadDetailPage({ leadId }: { leadId: string }) {
  const { data, updateLead, updateLeadStage, convertLeadToEvent } = useEaseEventsStore();
  const lead = data.leads.find((item) => item.id === leadId);
  const event = lead?.convertedEventId
    ? data.events.find((item) => item.id === lead.convertedEventId)
    : undefined;
  const project = lead ? getProjectForLead(data, lead) : undefined;
  const projectId = lead ? getProjectIdForLead(data, lead) : undefined;
  const [isConvertingLead, setIsConvertingLead] = React.useState(false);
  const [isEditingLead, setIsEditingLead] = React.useState(false);
  const [isSavingLead, setIsSavingLead] = React.useState(false);
  const [leadEditStatus, setLeadEditStatus] = React.useState("");
  const [conversionStatus, setConversionStatus] = React.useState("");
  const relatedTasks = data.tasks.filter(
    (task) =>
      (projectId && task.projectId === projectId) ||
      (event && task.eventId === event.id) ||
      (lead && task.leadId === lead.id),
  );
  const relatedBudgetItems = event
    ? data.budgetItems.filter((item) => item.eventId === event.id)
    : [];
  const relatedApprovals = event
    ? data.approvals.filter((approval) => approval.eventId === event.id)
    : [];
  const relatedInspirationLinks = data.projectInspirationLinks.filter(
    (item) => (projectId && item.projectId === projectId) || (lead && item.leadId === lead.id),
  );
  const relatedFiles = data.files.filter(
    (file) =>
      (projectId && file.projectId === projectId) ||
      (event && file.eventId === event.id) ||
      (lead && file.leadId === lead.id),
  );
  const relatedActivity = data.projectActivityEvents
    .filter((item) => projectId && item.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const relatedReminders = data.projectReminders
    .filter((item) => projectId && item.projectId === projectId && item.status === "Open")
    .sort(
      (a, b) =>
        new Date(a.dueAt ?? a.createdAt).getTime() - new Date(b.dueAt ?? b.createdAt).getTime(),
    );
  const proposal = getProjectProposal(data, projectId);
  const booking = getBookingRequirementSummary(data, project, proposal);

  if (!lead) {
    return (
      <EmptyState
        icon={Inbox}
        title="Lead not found"
        description="This lead may have been removed from the demo workspace."
      />
    );
  }

  async function handleLeadConversion() {
    if (!lead) return;
    setConversionStatus("");

    if (!lead.eventDate) {
      setConversionStatus(
        "Add an event date before creating the event workspace. This protects event schedules, approvals, and task due dates from being created as TBD.",
      );
      return;
    }

    setIsConvertingLead(true);
    try {
      const created = await convertLeadToEvent(lead.id);
      if (created) {
        window.location.href = eventHref(created.id);
        return;
      }
      setConversionStatus("Booking requirements are incomplete. Review the proposal panel below.");
    } catch (error) {
      setConversionStatus(
        error instanceof Error ? error.message : "Unable to create the event workspace.",
      );
    } finally {
      setIsConvertingLead(false);
    }
  }

  async function handleLeadUpdate(input: UpdateLeadInput) {
    if (!lead) return;

    setIsSavingLead(true);
    setLeadEditStatus("");

    try {
      await updateLead(lead.id, input);
      setIsEditingLead(false);
      setLeadEditStatus("Lead details updated.");
    } catch (error) {
      setLeadEditStatus(error instanceof Error ? error.message : "Unable to update this lead.");
    } finally {
      setIsSavingLead(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Lead detail"
        title={getLeadClientName(data, lead)}
        description={`${lead.eventType} · ${formatDate(lead.eventDate)} · ${lead.budgetRange}`}
        actions={
          <>
            {event ? (
              <Button onClick={() => (window.location.href = eventHref(event.id))}>
                Open event
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditingLead((current) => !current)}>
                <Pencil className="h-4 w-4" />
                {isEditingLead ? "Close edit" : "Edit lead"}
              </Button>
            )}
          </>
        }
      />
      <div className="mb-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <ProjectCommunicationSnapshot data={data} lead={lead} />
        <LifecycleProgressStrip signals={getLeadLifecycleSignals(data, lead)} />
      </div>
      <div className="mb-6">
        <ProposalWorkspacePanel data={data} project={project} lead={lead} event={event} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Inquiry details
            </CardTitle>
            {!event ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingLead((current) => !current)}
              >
                <Pencil className="h-4 w-4" />
                {isEditingLead ? "Cancel" : "Edit"}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {leadEditStatus ? (
              <p
                className={cn(
                  "mb-4 rounded-md border px-3 py-2 text-sm leading-6",
                  leadEditStatus === "Lead details updated."
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900",
                )}
              >
                {leadEditStatus}
              </p>
            ) : null}
            {isEditingLead && !event ? (
              <LeadEditForm
                lead={lead}
                data={data}
                isSaving={isSavingLead}
                onCancel={() => setIsEditingLead(false)}
                onSave={handleLeadUpdate}
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <FieldValue label="Email" value={lead.email} />
                <FieldValue label="Phone" value={lead.phone} />
                <FieldValue label="Event type" value={lead.eventType} />
                <FieldValue label="Event date" value={formatDate(lead.eventDate)} />
                <FieldValue label="Guest count" value={lead.estimatedGuestCount} />
                <FieldValue label="Budget range" value={lead.budgetRange} />
                <FieldValue label="Source" value={lead.source} />
                <FieldValue label="Stage" value={<StatusBadge value={lead.stage} />} />
                <FieldValue
                  label="Lead owner"
                  value={
                    data.users.find((user) => user.id === lead.ownerId)?.fullName ?? "Unassigned"
                  }
                />
                {event ? (
                  <FieldValue
                    label="Editing"
                    value="Lead details are locked after event conversion. Update live planning details in the event workspace."
                  />
                ) : null}
                <div className="md:col-span-2">
                  <FieldValue
                    label="Notes"
                    value={<p className="leading-6 text-slate-600">{lead.notes}</p>}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Sales pipeline and booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-stage">Stage</Label>
              <select
                id="lead-stage"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={lead.stage}
                onChange={(event) => void updateLeadStage(lead.id, event.target.value as LeadStage)}
              >
                {leadStages.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </div>
            {event ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-950">Event workspace created</p>
                <p className="mt-2 text-sm leading-6 text-emerald-700">
                  This lead is linked to an event workspace for planning, tasks, budget, vendors,
                  files, and approvals.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => (window.location.href = eventHref(event.id))}
                >
                  Open event workspace
                </Button>
              </div>
            ) : lead.stage === "Lost" ? (
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">No event workspace</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Lost leads stay in CRM history and do not become events.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">How this becomes booked</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {getLeadConversionHelper(lead)} The event workspace is created only after
                  configured requirements are complete.
                </p>
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Booking requirement preview
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                    {booking.checks
                      .filter((check) => check.required)
                      .map((check) => (
                        <li key={check.key}>
                          {check.complete ? "Done" : "Open"}: {check.label}
                        </li>
                      ))}
                  </ul>
                </div>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  Work proposal panel
                </Button>
                {conversionStatus || isConvertingLead ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                    {conversionStatus || "Booking is managed from the proposal panel."}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Project workspace history
            </CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              This history stays attached if the lead becomes a booked event.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FieldValue
              label="Project stage"
              value={<StatusBadge value={project?.stage ?? lead.stage} />}
            />
            <FieldValue
              label="Project owner"
              value={
                data.users.find((user) => user.id === project?.ownerId)?.fullName ?? "Unassigned"
              }
            />
            <FieldValue
              label="Open reminders"
              value={relatedReminders.length ? relatedReminders[0]?.title : "None"}
            />
            <FieldValue
              label="Project tasks"
              value={`${relatedTasks.filter((task) => task.status !== "Done").length} open of ${relatedTasks.length}`}
            />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Files and inspiration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectId ? (
              <FileUploadPanel
                projectId={projectId}
                leadId={lead.id}
                eventId={event?.id}
                frameless
              />
            ) : null}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Inspiration links
              </p>
              {relatedInspirationLinks.length ? (
                <div className="grid gap-2">
                  {relatedInspirationLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {link.label ?? link.url}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  No structured inspiration links yet. Legacy links in notes remain visible above.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Uploaded files
              </p>
              {relatedFiles.length ? (
                <div className="grid gap-2">
                  {relatedFiles.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                    >
                      <span className="font-medium text-slate-950">{file.name}</span>
                      <span className="ml-2 text-xs text-slate-500">{file.category}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-500">No files uploaded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Activity timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {relatedActivity.length ? (
              relatedActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge value={activity.activityType} />
                    <span className="text-xs text-slate-500">
                      {formatDateTime(activity.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{activity.title}</p>
                  {activity.body ? (
                    <p className="mt-1 text-sm leading-6 text-slate-600">{activity.body}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                icon={Clock}
                title="No project activity yet"
                description="System events, emails, calls, notes, files, and task changes will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>
      {event ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Created event workspace
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <FieldValue
                label="Event"
                value={
                  <a href={eventHref(event.id)} className="hover:underline">
                    {event.eventName}
                  </a>
                }
              />
              <FieldValue label="Status" value={<StatusBadge value={event.status} />} />
              <FieldValue label="Location" value={event.location} />
              <FieldValue
                label="Client price"
                value={formatCurrency(event.clientPrice, data.organization.currency)}
              />
              <FieldValue
                label="Open tasks"
                value={relatedTasks.filter((task) => task.status !== "Done").length}
              />
              <FieldValue
                label="Pending approvals"
                value={relatedApprovals.filter((approval) => approval.status === "Pending").length}
              />
            </CardContent>
          </Card>
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Lead-to-event budget snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetSummaryGrid
                event={event}
                budgetItems={relatedBudgetItems}
                currency={data.organization.currency}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function LeadEditForm({
  lead,
  data,
  isSaving,
  onCancel,
  onSave,
}: {
  lead: Lead;
  data: EaseEventsData;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: UpdateLeadInput) => Promise<void>;
}) {
  const staffUsers = data.users.filter((user) => user.role === "admin" || user.role === "planner");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const getValue = (name: string) => String(formData.get(name) ?? "").trim();

    await onSave({
      ownerId: getValue("ownerId") || undefined,
      clientName: getValue("clientName"),
      email: getValue("email").toLowerCase(),
      phone: getValue("phone"),
      eventType: getValue("eventType"),
      eventDate: getValue("eventDate"),
      estimatedGuestCount: Number(getValue("estimatedGuestCount")) || 0,
      budgetRange: getValue("budgetRange"),
      source: getValue("source"),
      notes: getValue("notes"),
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-client-name">Client name</Label>
        <Input
          id="lead-edit-client-name"
          name="clientName"
          defaultValue={lead.clientName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-email">Email</Label>
        <Input id="lead-edit-email" name="email" type="email" defaultValue={lead.email} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-phone">Phone</Label>
        <Input id="lead-edit-phone" name="phone" defaultValue={lead.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-owner">Lead owner</Label>
        <select
          id="lead-edit-owner"
          name="ownerId"
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          defaultValue={lead.ownerId ?? ""}
        >
          <option value="">Unassigned</option>
          {staffUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-event-type">Event type</Label>
        <Input id="lead-edit-event-type" name="eventType" defaultValue={lead.eventType} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-event-date">Event date</Label>
        <Input
          id="lead-edit-event-date"
          name="eventDate"
          type="date"
          defaultValue={lead.eventDate}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-guest-count">Guest count</Label>
        <Input
          id="lead-edit-guest-count"
          name="estimatedGuestCount"
          type="number"
          min="0"
          defaultValue={lead.estimatedGuestCount}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead-edit-budget">Budget range</Label>
        <Input id="lead-edit-budget" name="budgetRange" defaultValue={lead.budgetRange} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="lead-edit-source">Source</Label>
        <Input id="lead-edit-source" name="source" defaultValue={lead.source} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="lead-edit-notes">Notes</Label>
        <Textarea id="lead-edit-notes" name="notes" defaultValue={lead.notes} rows={5} />
      </div>
      <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save lead"}
        </Button>
      </div>
    </form>
  );
}

export function EventsPage() {
  const { data } = useEaseEventsStore();
  const { currentUser } = useEaseEventsAuth();
  const [statusFilter, setStatusFilter] = React.useState(() => readQueryParam("status", "active"));
  const [clientFilter, setClientFilter] = React.useState(() => readQueryParam("client", "all"));
  const [monthFilter, setMonthFilter] = React.useState(() => readQueryParam("month", "all"));
  const clientOptions = getClientOptions(data);
  const visibleEvents =
    currentUser?.role === "client"
      ? data.events.filter(
          (event) =>
            event.clientUserId === currentUser.id || event.clientEmail === currentUser.email,
        )
      : getVisibleEvents(data, currentUser);
  const events = visibleEvents.filter((event) => {
    const statusMatches =
      statusFilter === "all" ||
      (statusFilter === "active" && isActiveEventStatus(event.status)) ||
      (statusFilter === "upcoming" && isUpcomingEvent(event)) ||
      event.status === statusFilter;
    const monthMatches = monthFilter === "all" || event.eventDate.startsWith(monthFilter);
    return statusMatches && monthMatches && matchesClient(event, clientFilter);
  });

  return (
    <div>
      <PageHeader
        eyebrow="Event workspaces"
        title="Events"
        description="Events are created from booked leads so the sales history, client details, tasks, budget, vendors, files, and approvals stay connected."
        actions={
          <Button variant="outline" onClick={() => (window.location.href = "/ease-events/leads")}>
            Go to lead pipeline
          </Button>
        }
      />
      <Card className="mb-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="events-status-filter">Event status</Label>
            <select
              id="events-status-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="active">Active events</option>
              <option value="upcoming">Upcoming events</option>
              <option value="all">All statuses</option>
              {eventStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="events-client-filter">Client</Label>
            <select
              id="events-client-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="all">All clients</option>
              {clientOptions.map((client) => (
                <option key={client.key} value={client.key}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="events-month-filter">Month</Label>
            <select
              id="events-month-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="all">All months</option>
              <option value="2026-05">May 2026</option>
              <option value="2026-06">June 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-12">December 2026</option>
            </select>
          </div>
        </CardContent>
      </Card>
      {events.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
          {events.map((event) => {
            const summary = getProjectFinanceSummary(data, event.projectId, event.id);
            const tasks = data.tasks.filter((task) => task.eventId === event.id);
            const lead = getLeadForEvent(data, event);
            const client = getClientForEvent(data, event);
            const clientName = getEventClientName(data, event);
            return (
              <article
                key={event.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex min-w-0 gap-3">
                    <EventAvatar event={event} clientName={clientName} />
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold text-slate-950">
                        <a href={eventHref(event.id)} className="hover:underline">
                          {event.eventName}
                        </a>
                      </h2>
                      <p className="mt-1 break-words text-sm text-slate-500">{event.location}</p>
                      {lead ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Client:{" "}
                          {client ? (
                            <a
                              href={clientHref(client.id)}
                              className="font-medium text-slate-700 hover:underline"
                            >
                              {clientName}
                            </a>
                          ) : (
                            <span className="font-medium text-slate-700">{clientName}</span>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="pl-[3.25rem]">
                    <StatusBadge value={event.status} />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-3 text-sm">
                  <FieldValue label="Date" value={formatDate(event.eventDate)} />
                  <FieldValue label="Guests" value={event.guestCount} />
                  <FieldValue
                    label="Tasks"
                    value={`${tasks.filter((task) => task.status !== "Done").length}/${tasks.length}`}
                  />
                </div>
                <div className="mt-5 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Forecast profit</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {summary.contractedRevenueSource === "None"
                      ? "Not configured"
                      : formatCurrency(summary.forecastGrossProfit, data.organization.currency)}
                  </p>
                  {summary.contractedRevenueSource === "None" ? (
                    <p className="mt-1 text-xs text-slate-500">
                      No accepted proposal or legacy price.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No visible events"
          description="Events assigned to this role will appear here."
        />
      )}
    </div>
  );
}

function EventDetailsEditor({
  client,
  clientName,
  event,
  onSave,
  users,
}: {
  client?: ClientRecord;
  clientName: string;
  event: EventRecord;
  users: EaseEventsData["users"];
  onSave: (input: {
    event: UpdateEventDetailsInput;
    client?: UpdateClientDetailsInput;
  }) => Promise<void>;
}) {
  const [eventForm, setEventForm] = React.useState({
    eventName: event.eventName,
    eventType: event.eventType,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    guestCount: String(event.guestCount || ""),
    status: event.status,
    plannerId: event.plannerId ?? "",
    internalNotes: event.internalNotes,
    timelineNotes: event.timelineNotes,
  });
  const [clientForm, setClientForm] = React.useState({
    displayName: client?.displayName ?? clientName,
    email: client?.email ?? event.clientEmail,
    phone: client?.phone ?? event.clientPhone,
    companyName: client?.companyName ?? "",
    preferredContactChannel: client?.preferredContactChannel ?? "",
    relationshipOwnerId: client?.relationshipOwnerId ?? "",
    notes: client?.notes ?? "",
  });
  const [status, setStatus] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const isDirty =
    eventForm.eventName !== event.eventName ||
    eventForm.eventType !== event.eventType ||
    eventForm.eventDate !== event.eventDate ||
    eventForm.startTime !== event.startTime ||
    eventForm.endTime !== event.endTime ||
    eventForm.location !== event.location ||
    eventForm.guestCount !== String(event.guestCount || "") ||
    eventForm.status !== event.status ||
    eventForm.plannerId !== (event.plannerId ?? "") ||
    eventForm.internalNotes !== event.internalNotes ||
    eventForm.timelineNotes !== event.timelineNotes ||
    clientForm.displayName !== (client?.displayName ?? clientName) ||
    clientForm.email !== (client?.email ?? event.clientEmail) ||
    clientForm.phone !== (client?.phone ?? event.clientPhone) ||
    clientForm.companyName !== (client?.companyName ?? "") ||
    clientForm.preferredContactChannel !== (client?.preferredContactChannel ?? "") ||
    clientForm.relationshipOwnerId !== (client?.relationshipOwnerId ?? "") ||
    clientForm.notes !== (client?.notes ?? "");

  React.useEffect(() => {
    if (!isDirty) return undefined;
    const handleBeforeUnload = (browserEvent: BeforeUnloadEvent) => {
      browserEvent.preventDefault();
      browserEvent.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setStatus(null);
    const guestCount = Number.parseInt(eventForm.guestCount, 10);
    if (!eventForm.eventName.trim() || !eventForm.eventType.trim()) {
      setStatus({ tone: "error", message: "Event name and type are required." });
      return;
    }
    if (!clientForm.displayName.trim() || !clientForm.email.trim()) {
      setStatus({ tone: "error", message: "Client name and email are required." });
      return;
    }
    if (!Number.isFinite(guestCount) || guestCount < 0) {
      setStatus({ tone: "error", message: "Guest count must be a whole number." });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        event: {
          eventName: eventForm.eventName.trim(),
          eventType: eventForm.eventType.trim(),
          eventDate: eventForm.eventDate,
          startTime: eventForm.startTime,
          endTime: eventForm.endTime,
          location: eventForm.location.trim(),
          guestCount,
          status: eventForm.status,
          plannerId: eventForm.plannerId || undefined,
          internalNotes: eventForm.internalNotes,
          timelineNotes: eventForm.timelineNotes,
        },
        client: client
          ? {
              displayName: clientForm.displayName.trim(),
              email: clientForm.email.trim(),
              phone: clientForm.phone.trim(),
              companyName: clientForm.companyName.trim(),
              preferredContactChannel: clientForm.preferredContactChannel.trim(),
              relationshipOwnerId: clientForm.relationshipOwnerId || undefined,
              notes: clientForm.notes,
            }
          : undefined,
      });
      setStatus({ tone: "success", message: "Event and client details saved." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to save details.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="rounded-lg border-amber-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Edit event and client details
        </CardTitle>
        <p className="text-sm leading-6 text-slate-500">
          Updates use the canonical event and client records, so task cards, calendars, finances,
          communications, and portals can refresh from the same source.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {status ? (
            <div
              className={cn(
                "rounded-lg border p-3 text-sm",
                status.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              {status.message}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="event-edit-name">Event name</Label>
              <Input
                id="event-edit-name"
                value={eventForm.eventName}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({ ...current, eventName: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-edit-type">Event type</Label>
              <Input
                id="event-edit-type"
                value={eventForm.eventType}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({ ...current, eventType: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-edit-status">Event status</Label>
              <select
                id="event-edit-status"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={eventForm.status}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({
                    ...current,
                    status: inputEvent.target.value as EventStatus,
                  }))
                }
              >
                {eventStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-edit-date">Event date</Label>
              <Input
                id="event-edit-date"
                type="date"
                value={eventForm.eventDate}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({ ...current, eventDate: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-edit-start">Start time</Label>
              <Input
                id="event-edit-start"
                type="time"
                value={eventForm.startTime}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({ ...current, startTime: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-edit-end">End time</Label>
              <Input
                id="event-edit-end"
                type="time"
                value={eventForm.endTime}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({ ...current, endTime: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-edit-guests">Guest count</Label>
              <Input
                id="event-edit-guests"
                inputMode="numeric"
                pattern="[0-9]*"
                value={eventForm.guestCount}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({
                    ...current,
                    guestCount: inputEvent.target.value.replace(/[^\d]/g, ""),
                  }))
                }
              />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="event-edit-location">Location</Label>
              <Input
                id="event-edit-location"
                value={eventForm.location}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({ ...current, location: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="event-edit-planner">Planner</Label>
              <select
                id="event-edit-planner"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={eventForm.plannerId}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({ ...current, plannerId: inputEvent.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {users
                  .filter((user) => user.role === "admin" || user.role === "planner")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-edit-timeline-notes">Timeline notes</Label>
              <Textarea
                id="event-edit-timeline-notes"
                rows={4}
                value={eventForm.timelineNotes}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({
                    ...current,
                    timelineNotes: inputEvent.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-edit-internal-notes">Internal notes</Label>
              <Textarea
                id="event-edit-internal-notes"
                rows={4}
                value={eventForm.internalNotes}
                onChange={(inputEvent) =>
                  setEventForm((current) => ({
                    ...current,
                    internalNotes: inputEvent.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="client-edit-name">Client display name</Label>
              <Input
                id="client-edit-name"
                value={clientForm.displayName}
                onChange={(inputEvent) =>
                  setClientForm((current) => ({
                    ...current,
                    displayName: inputEvent.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-edit-email">Client email</Label>
              <Input
                id="client-edit-email"
                type="email"
                value={clientForm.email}
                onChange={(inputEvent) =>
                  setClientForm((current) => ({ ...current, email: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-edit-phone">Client phone</Label>
              <Input
                id="client-edit-phone"
                value={clientForm.phone}
                onChange={(inputEvent) =>
                  setClientForm((current) => ({ ...current, phone: inputEvent.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-edit-company">Company</Label>
              <Input
                id="client-edit-company"
                value={clientForm.companyName}
                onChange={(inputEvent) =>
                  setClientForm((current) => ({
                    ...current,
                    companyName: inputEvent.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-edit-channel">Preferred channel</Label>
              <Input
                id="client-edit-channel"
                value={clientForm.preferredContactChannel}
                placeholder="Email, phone, SMS..."
                onChange={(inputEvent) =>
                  setClientForm((current) => ({
                    ...current,
                    preferredContactChannel: inputEvent.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-edit-owner">Relationship owner</Label>
              <select
                id="client-edit-owner"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={clientForm.relationshipOwnerId}
                onChange={(inputEvent) =>
                  setClientForm((current) => ({
                    ...current,
                    relationshipOwnerId: inputEvent.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {users
                  .filter((user) => user.role === "admin" || user.role === "planner")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-edit-notes">Client notes</Label>
              <Textarea
                id="client-edit-notes"
                rows={3}
                value={clientForm.notes}
                onChange={(inputEvent) =>
                  setClientForm((current) => ({ ...current, notes: inputEvent.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {isDirty ? "You have unsaved changes." : "No unsaved changes."}
            </p>
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? "Saving..." : "Save details"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function EventDetailPage({ eventId }: { eventId: string }) {
  const {
    data,
    updateEventDetails,
    updateClientDetails,
    createTimelineItem,
    updateTimelineItem,
    updateBudgetItem,
    updateApprovalStatus,
    addEventTeamMember,
    removeEventTeamMember,
    provisionClientPortalAccess,
    ensurePostEventCloseout,
    updatePostEventCloseout,
    updatePostEventCloseoutItem,
    upsertFinalDeliverable,
    upsertVendorPerformanceReview,
    upsertInternalRetrospective,
    upsertClientConsent,
    createCloseoutFinancialSnapshot,
  } = useEaseEventsStore();
  const event = data.events.find((item) => item.id === eventId);
  const currency = data.organization.currency;
  const [isTimelineCreateOpen, setIsTimelineCreateOpen] = React.useState(false);
  const [isBudgetCreateOpen, setIsBudgetCreateOpen] = React.useState(false);
  const [isVendorCreateOpen, setIsVendorCreateOpen] = React.useState(false);
  const [isVendorAssignOpen, setIsVendorAssignOpen] = React.useState(false);
  const [isDetailsEditOpen, setIsDetailsEditOpen] = React.useState(false);
  const [isProvisioningClientPortal, setIsProvisioningClientPortal] = React.useState(false);
  const [clientPortalStatus, setClientPortalStatus] = React.useState("");

  if (!event) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Event not found"
        description="This event is not in the workspace."
      />
    );
  }

  const tasks = data.tasks.filter((task) => task.eventId === event.id);
  const project = getProjectForEvent(data, event);
  const projectId = getProjectIdForEvent(data, event);
  const timelineItems = data.timelineItems
    .filter((item) => item.eventId === event.id)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.sortOrder - b.sortOrder);
  const budgetItems = data.budgetItems.filter((item) => item.eventId === event.id);
  const invoices = data.invoices.filter(
    (invoice) => invoice.eventId === event.id || (projectId && invoice.projectId === projectId),
  );
  const approvals = data.approvals.filter((approval) => approval.eventId === event.id);
  const files = data.files.filter(
    (file) => file.eventId === event.id || (projectId && file.projectId === projectId),
  );
  const eventVendors = data.eventVendors.filter((item) => item.eventId === event.id);
  const comments = data.comments.filter((comment) => comment.eventId === event.id);
  const client = getClientForEvent(data, event);
  const clientName = getEventClientName(data, event);
  const clientPortalUser =
    data.users.find((user) => user.id === event.clientUserId) ??
    data.users.find(
      (user) =>
        user.role === "client" && user.email.toLowerCase() === event.clientEmail.toLowerCase(),
    );
  const aiCards: AIFeature[] = [
    "generate-event-timeline",
    "summarize-client-notes",
    "suggest-vendor-checklist",
    "budget-variance-explanation",
    "post-event-summary",
  ];
  const eventActions = getEventActionItems(data, event, currency);
  const financeSummary = getProjectFinanceSummary(data, event.projectId, event.id);

  async function handleProvisionClientPortal() {
    setIsProvisioningClientPortal(true);
    setClientPortalStatus("");

    try {
      const result = await provisionClientPortalAccess(event.id);
      if (result.inviteSent) {
        setClientPortalStatus(`Client portal invite sent to ${result.user.email}.`);
      } else if (result.inviteError) {
        setClientPortalStatus(
          `Portal linked, but invite email was not sent: ${result.inviteError}`,
        );
      } else {
        setClientPortalStatus(`Client portal access linked for ${result.user.email}.`);
      }
    } catch (error) {
      setClientPortalStatus(
        error instanceof Error ? error.message : "Unable to create client portal access.",
      );
    } finally {
      setIsProvisioningClientPortal(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Event workspace"
        title={event.eventName}
        description={`${event.eventType} · ${formatDate(event.eventDate)} · ${event.location}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsDetailsEditOpen((open) => !open)}>
              <Pencil className="h-4 w-4" />
              {isDetailsEditOpen ? "Close editor" : "Edit details"}
            </Button>
            <Button asChild>
              <a href={eventDayHref(event.id)}>
                <Radio className="h-4 w-4" />
                Open Event Day
              </a>
            </Button>
            <StatusBadge value={event.status} />
          </div>
        }
      />
      {isDetailsEditOpen ? (
        <div className="mb-6">
          <EventDetailsEditor
            event={event}
            client={client}
            clientName={clientName}
            users={data.users}
            onSave={async ({ event: eventInput, client: clientInput }) => {
              await updateEventDetails(event.id, eventInput);
              if (client && clientInput) {
                await updateClientDetails(client.id, clientInput);
              }
              setIsDetailsEditOpen(false);
            }}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Client"
              value={
                client ? (
                  <a href={clientHref(client.id)} className="hover:underline">
                    {clientName}
                  </a>
                ) : (
                  clientName
                )
              }
            />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Date and time"
              value={`${formatDate(event.eventDate)} · ${event.startTime}-${event.endTime}`}
            />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Guest count" value={event.guestCount} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Contracted revenue"
              value={
                financeSummary.contractedRevenueSource === "None"
                  ? "Not configured"
                  : formatCurrency(financeSummary.contractedRevenue, currency)
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <ProjectCommunicationSnapshot data={data} event={event} />
        <LifecycleProgressStrip signals={getEventLifecycleSignals(data, event)} />
      </div>

      <Tabs defaultValue={readQueryParam("tab", "overview")} className="mt-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          {[
            "overview",
            "proposal",
            "finances",
            "closeout",
            "timeline",
            "tasks",
            "budget",
            "invoices",
            "vendors",
            "comms",
            "files",
            "approvals",
            "ai",
          ].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600 data-[state=active]:bg-slate-950 data-[state=active]:text-white"
            >
              {tab === "comms"
                ? "Comms"
                : tab === "proposal"
                  ? "Proposal"
                  : tab === "finances"
                    ? "Finances"
                    : tab === "closeout"
                      ? "Closeout"
                      : tab === "timeline"
                        ? "Run of show"
                        : tab[0].toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="mb-6">
            <ActionHub
              title="Event command center"
              description="The work most likely to affect delivery, client confidence, or margin for this event."
              items={eventActions.slice(0, 5)}
              emptyTitle="This event is in good shape"
              emptyDescription="No overdue tasks, pending approvals, vendor gaps, or budget balances need immediate attention."
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg tracking-normal text-slate-950">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <FieldValue
                  label="Client info"
                  value={`${event.clientEmail} · ${event.clientPhone}`}
                />
                <FieldValue
                  label="Planning notes"
                  value={<p className="leading-6 text-slate-600">{event.timelineNotes}</p>}
                />
                <FieldValue
                  label="Internal notes"
                  value={<p className="leading-6 text-slate-600">{event.internalNotes}</p>}
                />
              </CardContent>
            </Card>
            <EventTeamPanel
              event={event}
              data={data}
              onAddMember={addEventTeamMember}
              onRemoveMember={removeEventTeamMember}
            />
            <ClientPortalAccessPanel
              event={event}
              clientName={clientName}
              clientUser={clientPortalUser}
              isProvisioning={isProvisioningClientPortal}
              status={clientPortalStatus}
              onProvision={() => void handleProvisionClientPortal()}
            />
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg tracking-normal text-slate-950">
                  Messages placeholder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge value={comment.visibility} />
                      <span className="text-xs text-slate-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{comment.body}</p>
                  </div>
                ))}
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                  TODO: Replace this placeholder with threaded client/vendor messaging and email
                  notifications.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proposal" className="mt-6">
          <ProposalWorkspacePanel data={data} project={project} event={event} />
        </TabsContent>

        <TabsContent value="finances" className="mt-6">
          <ProjectFinancePanel project={project} event={event} />
        </TabsContent>

        <TabsContent value="closeout" className="mt-6">
          <PostEventCloseoutPanel
            data={data}
            event={event}
            project={project}
            client={client}
            onEnsureCloseout={(input) => void ensurePostEventCloseout(input)}
            onUpdateCloseout={(closeoutId, input) =>
              void updatePostEventCloseout(closeoutId, input)
            }
            onUpdateItem={(itemId, input) => void updatePostEventCloseoutItem(itemId, input)}
            onUpsertDeliverable={(input) => void upsertFinalDeliverable(input)}
            onUpsertVendorReview={(input) => void upsertVendorPerformanceReview(input)}
            onUpsertRetrospective={(input) => void upsertInternalRetrospective(input)}
            onUpsertConsent={(input) => void upsertClientConsent(input)}
            onCreateSnapshot={(input) => void createCloseoutFinancialSnapshot(input)}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <div className="space-y-6">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => printRunOfShow(event, timelineItems, data)}>
                <FileText className="h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadRunOfShow(event, timelineItems, data)}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={() => setIsTimelineCreateOpen((current) => !current)}>
                <Plus className="h-4 w-4" />
                Add run-of-show item
              </Button>
            </div>
            {isTimelineCreateOpen ? (
              <CreateTimelineItemPanel
                event={event}
                data={data}
                existingItems={timelineItems}
                onCreate={(item) => void createTimelineItem(item)}
              />
            ) : null}
            <RunOfShowTable
              event={event}
              items={timelineItems}
              data={data}
              onUpdateItem={(itemId, item) => void updateTimelineItem(itemId, item)}
            />
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ProjectTaskWorkspace projectId={projectId} eventId={event.id} />
        </TabsContent>

        <TabsContent value="budget" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setIsBudgetCreateOpen((current) => !current)}>
              <Plus className="h-4 w-4" />
              Add budget item
            </Button>
          </div>
          {isBudgetCreateOpen ? (
            <CreateBudgetItemPanel defaultEventId={event.id} lockEvent />
          ) : null}
          <BudgetSummaryGrid event={event} budgetItems={data.budgetItems} currency={currency} />
          <BudgetItemsTable
            items={budgetItems}
            events={[event]}
            vendors={data.vendors}
            currency={currency}
            onUpdateItem={(itemId, item) => void updateBudgetItem(itemId, item)}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6 space-y-6">
          <CreateInvoicePanel defaultEventId={event.id} lockEvent />
          <InvoicesTable
            invoices={invoices}
            events={[event]}
            currency={currency}
            showEvent={false}
            returnPath={withQuery(eventHref(event.id), { tab: "invoices" })}
          />
        </TabsContent>

        <TabsContent value="vendors" className="mt-6 space-y-6">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setIsVendorCreateOpen((current) => !current)}>
              <Plus className="h-4 w-4" />
              Add vendor
            </Button>
            <Button onClick={() => setIsVendorAssignOpen((current) => !current)}>
              <Plus className="h-4 w-4" />
              Assign vendor
            </Button>
          </div>
          {isVendorCreateOpen ? <CreateVendorPanel /> : null}
          {isVendorAssignOpen ? <EventVendorAssignmentPanel event={event} /> : null}
          <VendorAssignmentTable assignments={eventVendors} />
        </TabsContent>

        <TabsContent value="comms" className="mt-6">
          <EventCommunicationsPanel eventId={event.id} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <FileUploadPanel eventId={event.id} projectId={projectId} />
            <FilesTable files={files} />
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-6">
          <ApprovalsGrid approvals={approvals} onStatusChange={updateApprovalStatus} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {aiCards.map((feature) => {
              const result = runAIPlaceholder(feature, event);
              return (
                <Card key={feature} className="rounded-lg border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base tracking-normal text-slate-950">
                      <Sparkles className="h-4 w-4" />
                      {result.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-600">{result.summary}</p>
                    <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                      {result.todo}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostEventCloseoutPanel({
  data,
  event,
  project,
  client,
  onEnsureCloseout,
  onUpdateCloseout,
  onUpdateItem,
  onUpsertDeliverable,
  onUpsertVendorReview,
  onUpsertRetrospective,
  onUpsertConsent,
  onCreateSnapshot,
}: {
  data: EaseEventsData;
  event: EventRecord;
  project?: ProjectRecord;
  client?: ClientRecord;
  onEnsureCloseout: (input: EnsurePostEventCloseoutInput) => void;
  onUpdateCloseout: (closeoutId: string, input: UpdatePostEventCloseoutInput) => void;
  onUpdateItem: (itemId: string, input: UpdatePostEventCloseoutItemInput) => void;
  onUpsertDeliverable: (input: UpsertFinalDeliverableInput) => void;
  onUpsertVendorReview: (input: UpsertVendorPerformanceReviewInput) => void;
  onUpsertRetrospective: (input: UpsertInternalRetrospectiveInput) => void;
  onUpsertConsent: (input: UpsertClientConsentInput) => void;
  onCreateSnapshot: (input: CreateCloseoutFinancialSnapshotInput) => void;
}) {
  const { currentUser } = useEaseEventsAuth();
  const closeout = getEventCloseout(data, event);
  const closeoutItems = getCloseoutItems(data, closeout);
  const readiness = buildCloseoutReadiness(data, event, project);
  const projectId = project?.id ?? event.projectId;
  const deliverables = data.finalDeliverables
    .filter((item) => item.eventId === event.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const feedback = data.clientFeedbackResponses.find((item) => item.eventId === event.id);
  const eventVendorAssignments = data.eventVendors.filter(
    (assignment) => assignment.eventId === event.id,
  );
  const vendorReviews = data.vendorPerformanceReviews.filter(
    (review) => review.eventId === event.id,
  );
  const retrospective = data.internalRetrospectives.find((item) => item.eventId === event.id);
  const snapshots = data.closeoutFinancialSnapshots
    .filter((snapshot) => snapshot.eventId === event.id)
    .sort((left, right) => right.versionNumber - left.versionNumber);
  const consentRecords = data.clientConsents.filter(
    (consent) => consent.projectId === projectId || consent.eventId === event.id,
  );
  const [deliverableTitle, setDeliverableTitle] = React.useState("Final event recap");
  const [deliverableUrl, setDeliverableUrl] = React.useState("");
  const [deliverableCategory, setDeliverableCategory] = React.useState("Event Recap");
  const [retrospectiveNotes, setRetrospectiveNotes] = React.useState(
    retrospective?.whatWentWell ?? "",
  );
  const [reopenReason, setReopenReason] = React.useState("");

  if (!projectId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Project workspace missing"
        description="Closeout requires a durable project workspace linked to this event."
      />
    );
  }

  const unresolvedIssues = data.eventDayIssues.filter(
    (issue) => issue.eventId === event.id && !["Resolved", "Closed"].includes(issue.status),
  );

  function handleStartCloseout() {
    onEnsureCloseout({
      projectId,
      eventId: event.id,
      ownerId: project?.ownerId ?? currentUser?.id,
      eventCompletedAt: new Date().toISOString(),
      metadata: { source: "event_workspace" },
    });
  }

  function handleAddDeliverable() {
    if (!closeout || !deliverableTitle.trim() || !deliverableUrl.trim()) return;
    onUpsertDeliverable({
      closeoutId: closeout.id,
      projectId,
      eventId: event.id,
      title: deliverableTitle.trim(),
      category: deliverableCategory.trim() || "Other",
      externalUrl: deliverableUrl.trim(),
      clientVisible: true,
      status: "Delivered",
      deliveredAt: new Date().toISOString(),
      deliveredById: currentUser?.id,
      idempotencyKey: `${closeout.id}:deliverable:${deliverableTitle.trim().toLowerCase()}`,
    });
    setDeliverableTitle("");
    setDeliverableUrl("");
  }

  function handleCreateSnapshot(nextStatus?: PostEventCloseout["status"]) {
    if (!closeout) return;
    const nextVersion = (snapshots[0]?.versionNumber ?? 0) + 1;
    onCreateSnapshot({
      closeoutId: closeout.id,
      projectId,
      eventId: event.id,
      versionNumber: nextVersion,
      contractedRevenue: readiness.finance.contractedRevenue,
      invoicedRevenue: readiness.finance.invoicedRevenue,
      collectedRevenue: readiness.finance.collectedRevenue,
      outstandingClientBalance: readiness.finance.outstandingClientBalance,
      plannedCost: readiness.finance.plannedCost,
      incurredCost: readiness.finance.incurredExpenses,
      paidCost: readiness.finance.paidExpenses,
      outstandingVendorBalance: readiness.finance.outstandingExpenseBalance,
      forecastProfit: readiness.finance.forecastGrossProfit,
      finalOperatingMargin: readiness.finance.forecastMarginPercentage,
      cashPosition: readiness.finance.cashPosition,
      generatedById: currentUser?.id,
      metadata: { closeout_status: nextStatus ?? closeout.status },
    });
  }

  function handleCloseProject() {
    if (!closeout) return;
    handleCreateSnapshot("Closed");
    onUpdateCloseout(closeout.id, {
      status: "Closed",
      closedAt: new Date().toISOString(),
      closedById: currentUser?.id,
      completionPercentage: 100,
      financialStatus: readiness.finance.outstandingClientBalance ? "Deferred" : "Complete",
      deliverableStatus: deliverables.some((item) => item.status === "Delivered")
        ? "Complete"
        : "Overridden",
      feedbackStatus: feedback ? "Complete" : "Deferred",
      vendorReviewStatus:
        vendorReviews.length >= eventVendorAssignments.length ? "Complete" : "Deferred",
      internalReviewStatus: retrospective ? "Complete" : "Deferred",
      retentionStatus: "Complete",
    });
  }

  function handleReopenProject() {
    if (!closeout || !reopenReason.trim()) return;
    onUpdateCloseout(closeout.id, {
      status: "Reopened",
      reopenedAt: new Date().toISOString(),
      reopenedById: currentUser?.id,
      reopenReason: reopenReason.trim(),
    });
    setReopenReason("");
  }

  return (
    <div className="space-y-6">
      {!closeout ? (
        <Card className="rounded-lg border-[#dfd2b0] bg-[#fffdf8] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Start post-event closeout
            </CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Event completion is not project closure. Start closeout to preserve event-day
              evidence, reconcile finances, deliver final files, collect feedback, and prepare the
              retention handoff.
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartCloseout}>
              <CheckSquare className="h-4 w-4" />
              Start closeout workflow
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {closeout ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-4">
            <MetricCard
              label="Closeout status"
              value={closeout.status}
              helper={readiness.nextAction}
              icon={CheckCircle2}
              tone={readiness.isReadyToClose ? "good" : "warn"}
            />
            <MetricCard
              label="Completion"
              value={`${Math.round(readiness.completionPercentage)}%`}
              helper={`${readiness.blockers.length} blockers · ${readiness.warnings.length} warnings`}
              icon={BarChart3}
              tone={readiness.blockers.length ? "danger" : "good"}
            />
            <MetricCard
              label="Client balance"
              value={formatCurrency(
                readiness.finance.outstandingClientBalance,
                data.organization.currency,
              )}
              helper="Must be reconciled or deferred"
              icon={CreditCard}
              tone={readiness.finance.outstandingClientBalance ? "warn" : "good"}
            />
            <MetricCard
              label="Vendor balance"
              value={formatCurrency(
                readiness.finance.outstandingExpenseBalance,
                data.organization.currency,
              )}
              helper="Outstanding expense balance"
              icon={Wallet}
              tone={readiness.finance.outstandingExpenseBalance ? "warn" : "good"}
            />
          </div>

          <ActionHub
            title="Closeout blockers"
            description="Required conditions and warnings that determine whether the project is ready to close."
            items={[...readiness.blockers, ...readiness.warnings].map((item) => ({
              title: item.label,
              description: item.detail,
              href: item.href,
              icon: item.status === "blocked" ? AlertTriangle : Clock,
              tone: item.status === "blocked" ? "danger" : "warn",
              status: item.requirement,
              actionLabel: item.href ? "Open" : undefined,
            }))}
            emptyTitle="Ready for closure review"
            emptyDescription="No required blockers remain. Review notes and close the project when authorized."
          />

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Closeout checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closeoutItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-950">{item.title}</TableCell>
                      <TableCell>{item.groupName}</TableCell>
                      <TableCell>
                        <StatusBadge value={item.requirementLevel} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={item.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onUpdateItem(item.id, {
                                status: "Complete",
                                completedAt: new Date().toISOString(),
                                completedById: currentUser?.id,
                              })
                            }
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              onUpdateItem(item.id, {
                                status: "Overridden",
                                completedAt: new Date().toISOString(),
                                completedById: currentUser?.id,
                                overrideReason:
                                  "Authorized closeout override recorded from workspace.",
                              })
                            }
                          >
                            Override
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg tracking-normal text-slate-950">
                  Final deliverables
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Client-visible files and links only. Internal receipts, issue evidence, and vendor
                  pricing stay internal by default.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.8fr_auto]">
                  <Input
                    value={deliverableTitle}
                    onChange={(event) => setDeliverableTitle(event.target.value)}
                    placeholder="Deliverable title"
                  />
                  <Input
                    value={deliverableUrl}
                    onChange={(event) => setDeliverableUrl(event.target.value)}
                    placeholder="https://gallery-or-document-link"
                  />
                  <Input
                    value={deliverableCategory}
                    onChange={(event) => setDeliverableCategory(event.target.value)}
                    placeholder="Category"
                  />
                  <Button onClick={handleAddDeliverable}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {deliverables.length ? (
                    deliverables.map((deliverable) => (
                      <div key={deliverable.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950">{deliverable.title}</p>
                            <p className="text-sm text-slate-500">{deliverable.category}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge value={deliverable.status} />
                            {deliverable.clientVisible ? (
                              <StatusBadge value="Client visible" />
                            ) : null}
                          </div>
                        </div>
                        {deliverable.externalUrl ? (
                          <a
                            href={deliverable.externalUrl}
                            className="mt-2 block truncate text-sm text-slate-600 hover:underline"
                          >
                            {deliverable.externalUrl}
                          </a>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                      No final deliverables yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg tracking-normal text-slate-950">
                  Client feedback and consent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldValue
                  label="Feedback status"
                  value={
                    feedback ? (
                      <div className="space-y-1">
                        <StatusBadge
                          value={feedback.concernLevel === "High" ? "Concern" : "Received"}
                        />
                        <p className="text-sm text-slate-600">
                          Overall: {feedback.overallSatisfaction ?? "Not rated"}/5
                        </p>
                      </div>
                    ) : (
                      "Not submitted"
                    )
                  }
                />
                <div className="grid gap-2">
                  {(
                    ["Testimonial", "Photo/Video Portfolio", "Marketing Communication"] as const
                  ).map((consentType) => {
                    const consent = consentRecords.find((item) => item.consentType === consentType);
                    return (
                      <div
                        key={consentType}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-950">{consentType}</p>
                          <p className="text-xs text-slate-500">
                            {consent?.status ?? "Not Requested"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpsertConsent({
                              projectId,
                              eventId: event.id,
                              clientId: client?.id,
                              consentType,
                              status: "Requested",
                              requestedAt: new Date().toISOString(),
                              source: "Planner closeout workspace",
                              capturedById: currentUser?.id,
                            })
                          }
                        >
                          Request
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg tracking-normal text-slate-950">
                  Vendor performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventVendorAssignments.length ? (
                  eventVendorAssignments.map((assignment) => {
                    const vendor = data.vendors.find((item) => item.id === assignment.vendorId);
                    const review = vendorReviews.find(
                      (item) => item.eventVendorId === assignment.id,
                    );
                    return (
                      <div key={assignment.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950">{vendor?.name ?? "Vendor"}</p>
                            <p className="text-sm text-slate-500">{assignment.serviceCategory}</p>
                          </div>
                          <StatusBadge
                            value={review ? `${review.overallRating ?? "?"}/5` : "Not reviewed"}
                          />
                        </div>
                        <Button
                          className="mt-3"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpsertVendorReview({
                              projectId,
                              eventId: event.id,
                              eventVendorId: assignment.id,
                              vendorId: assignment.vendorId,
                              reviewerId: currentUser?.id,
                              overallRating: 4,
                              communicationRating: 4,
                              punctualityRating: 4,
                              qualityRating: 4,
                              budgetAccuracyRating: 4,
                              professionalismRating: 4,
                              issueCount: unresolvedIssues.filter(
                                (issue) => issue.vendorId === assignment.vendorId,
                              ).length,
                              wouldUseAgain: true,
                              notes: "Reviewed from post-event closeout.",
                              operationalContext: {
                                quoted_amount: assignment.quotedAmount,
                                actual_amount: assignment.actualAmount,
                                payment_status: assignment.paymentStatus,
                              },
                            })
                          }
                        >
                          Record review
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    No assigned vendors to review.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg tracking-normal text-slate-950">
                  Internal retrospective
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={retrospectiveNotes}
                  onChange={(event) => setRetrospectiveNotes(event.target.value)}
                  placeholder="What went well? What should change next time?"
                  rows={5}
                />
                <Button
                  onClick={() =>
                    onUpsertRetrospective({
                      closeoutId: closeout.id,
                      projectId,
                      eventId: event.id,
                      status: "Complete",
                      facilitatorId: currentUser?.id,
                      reviewedAt: new Date().toISOString(),
                      reviewedById: currentUser?.id,
                      whatWentWell: retrospectiveNotes,
                      processImprovements: retrospectiveNotes,
                      aiSummary: `AI-generated draft placeholder: ${event.eventName} closeout should review timeline variance, issue resolution, vendor performance, feedback, and financial variance. Planner review required before finalizing.`,
                      aiSummaryGeneratedAt: new Date().toISOString(),
                    })
                  }
                >
                  Save retrospective
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Closure controls
              </CardTitle>
              <p className="text-sm leading-6 text-slate-500">
                Closing archives the project from active views but preserves project history,
                snapshots, files, finances, feedback, and audit records.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <FieldValue
                  label="Contracted revenue"
                  value={formatCurrency(
                    readiness.finance.contractedRevenue,
                    data.organization.currency,
                  )}
                />
                <FieldValue
                  label="Collected revenue"
                  value={formatCurrency(
                    readiness.finance.collectedRevenue,
                    data.organization.currency,
                  )}
                />
                <FieldValue
                  label="Paid expenses"
                  value={formatCurrency(readiness.finance.paidExpenses, data.organization.currency)}
                />
                <FieldValue
                  label="Cash position"
                  value={formatCurrency(readiness.finance.cashPosition, data.organization.currency)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleCreateSnapshot();
                  }}
                >
                  <ReceiptText className="h-4 w-4" />
                  Snapshot finances
                </Button>
                <Button
                  disabled={!readiness.isReadyToClose && closeout.status !== "Ready to Close"}
                  onClick={handleCloseProject}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Close project
                </Button>
              </div>
              {closeout.status === "Closed" ? (
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    value={reopenReason}
                    onChange={(event) => setReopenReason(event.target.value)}
                    placeholder="Reason for reopening"
                  />
                  <Button variant="outline" onClick={handleReopenProject}>
                    Reopen
                  </Button>
                </div>
              ) : null}
              {snapshots.length ? (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  Latest snapshot version {snapshots[0].versionNumber} generated{" "}
                  {new Date(snapshots[0].generatedAt).toLocaleString()}.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function printRunOfShow(event: EventRecord, items: TimelineItem[], data: EaseEventsData) {
  if (typeof window === "undefined") return;

  const rows = items
    .map((item) => {
      const owner = data.users.find((user) => user.id === item.ownerId)?.fullName ?? "Unassigned";
      const dependency = items.find((candidate) => candidate.id === item.dependsOnItemId)?.title;
      return `<tr>
        <td>${formatTimelineTime(item.startTime)}${item.endTime ? `-${formatTimelineTime(item.endTime)}` : ""}</td>
        <td>${item.title}</td>
        <td>${owner}</td>
        <td>${item.location ?? ""}</td>
        <td>${dependency ?? ""}</td>
        <td>${item.status}</td>
      </tr>`;
    })
    .join("");
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${event.eventName} run of show</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; color: #111827; padding: 32px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          p { color: #475569; margin: 0 0 24px; }
          table { border-collapse: collapse; width: 100%; font-size: 13px; }
          th, td { border: 1px solid #d8dee8; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${event.eventName}</h1>
        <p>${formatDate(event.eventDate)} · ${event.location}</p>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Item</th>
              <th>Owner</th>
              <th>Location</th>
              <th>Dependency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function downloadRunOfShow(event: EventRecord, items: TimelineItem[], data: EaseEventsData) {
  if (typeof window === "undefined") return;

  const headers = ["Start", "End", "Title", "Owner", "Location", "Dependency", "Status", "Notes"];
  const rows = items.map((item) => {
    const owner = data.users.find((user) => user.id === item.ownerId)?.fullName ?? "";
    const dependency =
      items.find((candidate) => candidate.id === item.dependsOnItemId)?.title ?? "";
    return [
      item.startTime,
      item.endTime ?? "",
      item.title,
      owner,
      item.location ?? "",
      dependency,
      item.status,
      item.description,
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-run-of-show.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function CreateTimelineItemPanel({
  event,
  data,
  existingItems,
  onCreate,
}: {
  event: EventRecord;
  data: EaseEventsData;
  existingItems: TimelineItem[];
  onCreate: (item: CreateTimelineItemInput) => void;
}) {
  const ownerOptions = getAssignableUsersForEvent(data, event.id);
  const [form, setForm] = React.useState<CreateTimelineItemInput>({
    eventId: event.id,
    title: "",
    description: "",
    startTime: event.startTime || "09:00",
    endTime: "",
    ownerId: ownerOptions[0]?.id,
    dependsOnItemId: "",
    status: "Planned",
    location: event.location,
    visibility: "Internal",
    sortOrder: existingItems.length * 10 + 10,
  });
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setIsSaving(true);
    await onCreate({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      ownerId: form.ownerId || undefined,
      dependsOnItemId: form.dependsOnItemId || undefined,
      endTime: form.endTime || undefined,
      location: form.location?.trim() || undefined,
    });
    setForm((current) => ({
      ...current,
      title: "",
      description: "",
      dependsOnItemId: "",
      sortOrder: current.sortOrder + 10,
    }));
    setIsSaving(false);
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Add run-of-show item
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="timeline-title">Title</Label>
            <Input
              id="timeline-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Client reveal"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-start">Start</Label>
            <Input
              id="timeline-start"
              type="time"
              value={form.startTime}
              onChange={(event) =>
                setForm((current) => ({ ...current, startTime: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-end">End</Label>
            <Input
              id="timeline-end"
              type="time"
              value={form.endTime ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, endTime: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-owner">Owner</Label>
            <select
              id="timeline-owner"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.ownerId ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, ownerId: event.target.value || undefined }))
              }
            >
              <option value="">Unassigned</option>
              {ownerOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-status">Status</Label>
            <select
              id="timeline-status"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as CreateTimelineItemInput["status"],
                }))
              }
            >
              {timelineItemStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-dependency">Dependency</Label>
            <select
              id="timeline-dependency"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.dependsOnItemId ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dependsOnItemId: event.target.value || undefined,
                }))
              }
            >
              <option value="">No dependency</option>
              {existingItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatTimelineTime(item.startTime)} · {item.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeline-visibility">Visibility</Label>
            <select
              id="timeline-visibility"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.visibility}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  visibility: event.target.value as CreateTimelineItemInput["visibility"],
                }))
              }
            >
              <option>Internal</option>
              <option>Client</option>
              <option>Vendor</option>
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="timeline-location">Location</Label>
            <Input
              id="timeline-location"
              value={form.location ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Main ballroom"
            />
          </div>
          <div className="space-y-2 lg:col-span-4">
            <Label htmlFor="timeline-description">Notes</Label>
            <Textarea
              id="timeline-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Who needs to be present, what has to be ready, and what could block this item."
            />
          </div>
          <div className="lg:col-span-4">
            <Button type="submit" disabled={isSaving}>
              <Plus className="h-4 w-4" />
              {isSaving ? "Adding..." : "Add item"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RunOfShowTable({
  event,
  items,
  data,
  onUpdateItem,
}: {
  event: EventRecord;
  items: TimelineItem[];
  data: EaseEventsData;
  onUpdateItem: (itemId: string, item: UpdateTimelineItemInput) => void;
}) {
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const editingItem = items.find((item) => item.id === editingItemId);
  const ownerOptions = getAssignableUsersForEvent(data, event.id);
  const [editForm, setEditForm] = React.useState<UpdateTimelineItemInput>({
    eventId: event.id,
    title: "",
    description: "",
    startTime: event.startTime || "09:00",
    endTime: "",
    ownerId: "",
    dependsOnItemId: "",
    status: "Planned",
    location: "",
    visibility: "Internal",
    sortOrder: 0,
  });

  React.useEffect(() => {
    if (!editingItem) return;
    setEditForm({
      eventId: editingItem.eventId,
      title: editingItem.title,
      description: editingItem.description,
      startTime: editingItem.startTime,
      endTime: editingItem.endTime ?? "",
      ownerId: editingItem.ownerId ?? "",
      dependsOnItemId: editingItem.dependsOnItemId ?? "",
      status: editingItem.status,
      location: editingItem.location ?? "",
      visibility: editingItem.visibility,
      sortOrder: editingItem.sortOrder,
    });
  }, [editingItem]);

  if (!items.length) {
    return (
      <EmptyState
        icon={Clock}
        title="No run-of-show items"
        description="Add event-day sequence items for load-in, setup, client reveals, programming, and strike."
      />
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Sequence</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Dependency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const owner = data.users.find((user) => user.id === item.ownerId);
              const dependency = items.find((candidate) => candidate.id === item.dependsOnItemId);
              return (
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap font-medium text-slate-950">
                      {formatTimelineTime(item.startTime)}
                      {item.endTime ? `-${formatTimelineTime(item.endTime)}` : ""}
                    </TableCell>
                    <TableCell className="min-w-72">
                      <p className="font-medium text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                      {item.location ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                          {item.location}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>{owner?.fullName ?? "Unassigned"}</TableCell>
                    <TableCell>{dependency?.title ?? "None"}</TableCell>
                    <TableCell>
                      <StatusBadge value={item.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={item.visibility} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  {editingItemId === item.id ? (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-slate-50">
                        <form
                          className="grid gap-3 lg:grid-cols-6"
                          onSubmit={(submitEvent) => {
                            submitEvent.preventDefault();
                            onUpdateItem(item.id, {
                              ...editForm,
                              ownerId: editForm.ownerId || undefined,
                              dependsOnItemId: editForm.dependsOnItemId || undefined,
                              endTime: editForm.endTime || undefined,
                              location: editForm.location || undefined,
                            });
                            setEditingItemId(null);
                          }}
                        >
                          <Input
                            className="lg:col-span-2"
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                          <Input
                            type="time"
                            value={editForm.startTime}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                startTime: event.target.value,
                              }))
                            }
                          />
                          <Input
                            type="time"
                            value={editForm.endTime ?? ""}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                endTime: event.target.value,
                              }))
                            }
                          />
                          <select
                            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={editForm.ownerId ?? ""}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                ownerId: event.target.value || undefined,
                              }))
                            }
                          >
                            <option value="">Unassigned</option>
                            {ownerOptions.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.fullName}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                            value={editForm.status}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                status: event.target.value as UpdateTimelineItemInput["status"],
                              }))
                            }
                          >
                            {timelineItemStatuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm lg:col-span-2"
                            value={editForm.dependsOnItemId ?? ""}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                dependsOnItemId: event.target.value || undefined,
                              }))
                            }
                          >
                            <option value="">No dependency</option>
                            {items
                              .filter((candidate) => candidate.id !== item.id)
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {formatTimelineTime(candidate.startTime)} · {candidate.title}
                                </option>
                              ))}
                          </select>
                          <Input
                            className="lg:col-span-2"
                            value={editForm.location ?? ""}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                location: event.target.value,
                              }))
                            }
                            placeholder="Location"
                          />
                          <Textarea
                            className="lg:col-span-6"
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                          <div className="flex gap-2 lg:col-span-6">
                            <Button type="submit" size="sm">
                              Save item
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingItemId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TaskTable({
  tasks,
  events,
  data,
  onStatusChange,
  onOwnerChange,
  onTaskUpdate,
  onChecklistToggle,
}: {
  tasks: ReturnType<typeof useEaseEventsStore>["data"]["tasks"];
  events: EventRecord[];
  data: EaseEventsData;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOwnerChange: (taskId: string, ownerId: string | undefined) => void;
  onTaskUpdate: (
    taskId: string,
    task: Omit<TaskRecord, "id" | "organizationId" | "checklist">,
  ) => void;
  onChecklistToggle: (taskId: string, checklistItemId: string) => void;
}) {
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const editingTask = tasks.find((task) => task.id === editingTaskId);
  const [editForm, setEditForm] = React.useState({
    eventId: "",
    ownerId: "",
    title: "",
    description: "",
    dueDate: "",
    status: "To Do" as TaskStatus,
    priority: "Medium" as TaskPriority,
    linkLabel: "",
    linkUrl: "",
  });

  React.useEffect(() => {
    if (!editingTask) return;
    setEditForm({
      eventId: editingTask.eventId,
      ownerId: editingTask.ownerId ?? "",
      title: editingTask.title,
      description: editingTask.description,
      dueDate: editingTask.dueDate,
      status: editingTask.status,
      priority: editingTask.priority,
      linkLabel: editingTask.links?.[0]?.label ?? "",
      linkUrl: editingTask.links?.[0]?.url ?? "",
    });
  }, [editingTask]);

  if (!tasks.length) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks"
        description="Tasks added for this scope will appear here."
      />
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const event = events.find((item) => item.id === task.eventId);
              const ownerOptions = getAssignableUsersForEvent(data, task.eventId);
              return (
                <React.Fragment key={task.id}>
                  <TableRow>
                    <TableCell className="min-w-80">
                      <p className="font-medium text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{task.description}</p>
                      {task.checklist.length ? (
                        <div className="mt-3 space-y-2">
                          {task.checklist.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 text-xs text-slate-600"
                            >
                              <Checkbox
                                checked={item.isComplete}
                                onCheckedChange={() => onChecklistToggle(task.id, item.id)}
                              />
                              {item.title}
                            </label>
                          ))}
                        </div>
                      ) : null}
                      {task.links?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {task.links.map((link) => (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {event ? (
                        <a href={eventHref(event.id)} className="hover:underline">
                          {event.eventName}
                        </a>
                      ) : (
                        "Unassigned"
                      )}
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 max-w-44 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        value={task.ownerId ?? ""}
                        onChange={(event) =>
                          onOwnerChange(task.id, event.target.value || undefined)
                        }
                      >
                        <option value="">Unassigned</option>
                        {ownerOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>{formatDate(task.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge value={task.priority} />
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        value={task.status}
                        onChange={(event) =>
                          onStatusChange(task.id, event.target.value as TaskStatus)
                        }
                      >
                        {taskStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTaskId(task.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  {editingTaskId === task.id ? (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-slate-50">
                        <form
                          className="grid gap-4 md:grid-cols-3"
                          onSubmit={(eventForm) => {
                            eventForm.preventDefault();
                            onTaskUpdate(task.id, {
                              projectId: task.projectId,
                              leadId: task.leadId,
                              eventId: editForm.eventId,
                              title: editForm.title,
                              description: editForm.description,
                              dueDate: editForm.dueDate,
                              status: editForm.status,
                              priority: editForm.priority,
                              ownerId: editForm.ownerId || undefined,
                              links: editForm.linkUrl.trim()
                                ? [
                                    {
                                      label: editForm.linkLabel.trim() || editForm.linkUrl.trim(),
                                      url: editForm.linkUrl.trim(),
                                    },
                                  ]
                                : [],
                            });
                            setEditingTaskId(null);
                          }}
                        >
                          <div className="space-y-2">
                            <Label htmlFor={`edit-task-title-${task.id}`}>Title</Label>
                            <Input
                              id={`edit-task-title-${task.id}`}
                              value={editForm.title}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-task-event-${task.id}`}>Event</Label>
                            <select
                              id={`edit-task-event-${task.id}`}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={editForm.eventId}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  eventId: event.target.value,
                                  ownerId: "",
                                }))
                              }
                            >
                              {events.map((eventItem) => (
                                <option key={eventItem.id} value={eventItem.id}>
                                  {eventItem.eventName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-task-owner-${task.id}`}>Owner</Label>
                            <select
                              id={`edit-task-owner-${task.id}`}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={editForm.ownerId}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  ownerId: event.target.value,
                                }))
                              }
                            >
                              <option value="">Unassigned</option>
                              {getAssignableUsersForEvent(data, editForm.eventId).map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-task-due-${task.id}`}>Due date</Label>
                            <Input
                              id={`edit-task-due-${task.id}`}
                              type="date"
                              value={editForm.dueDate}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  dueDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-task-priority-${task.id}`}>Priority</Label>
                            <select
                              id={`edit-task-priority-${task.id}`}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={editForm.priority}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  priority: event.target.value as TaskPriority,
                                }))
                              }
                            >
                              {taskPriorities.map((priority) => (
                                <option key={priority}>{priority}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-task-status-${task.id}`}>Status</Label>
                            <select
                              id={`edit-task-status-${task.id}`}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={editForm.status}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  status: event.target.value as TaskStatus,
                                }))
                              }
                            >
                              {taskStatuses.map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label htmlFor={`edit-task-description-${task.id}`}>Description</Label>
                            <Textarea
                              id={`edit-task-description-${task.id}`}
                              value={editForm.description}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-task-link-label-${task.id}`}>Link label</Label>
                            <Input
                              id={`edit-task-link-label-${task.id}`}
                              value={editForm.linkLabel}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  linkLabel: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`edit-task-link-url-${task.id}`}>Link URL</Label>
                            <Input
                              id={`edit-task-link-url-${task.id}`}
                              type="url"
                              value={editForm.linkUrl}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  linkUrl: event.target.value,
                                }))
                              }
                              placeholder="https://"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2 md:col-span-3">
                            <Button type="submit">Save task</Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingTaskId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TaskBoard({
  tasks,
  events,
  data,
  onStatusChange,
  onOwnerChange,
}: {
  tasks: TaskRecord[];
  events: EventRecord[];
  data: EaseEventsData;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOwnerChange: (taskId: string, ownerId: string | undefined) => void;
}) {
  if (!tasks.length) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No task cards"
        description="Create tasks to build the execution board for each event."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {taskStatuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            className="min-w-0 rounded-lg border border-slate-200 bg-slate-100/70 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-950">{status}</h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {columnTasks.length ? (
                columnTasks.map((task) => {
                  const event = events.find((item) => item.id === task.eventId);
                  const ownerOptions = getAssignableUsersForEvent(data, task.eventId);
                  return (
                    <article
                      key={task.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-semibold text-slate-950">
                            {task.title}
                          </h3>
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {event?.eventName ?? "Unassigned event"}
                          </p>
                        </div>
                        <StatusBadge value={task.priority} />
                      </div>
                      {task.description ? (
                        <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1 text-xs font-medium text-slate-500">
                          Owner
                          <select
                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-950"
                            value={task.ownerId ?? ""}
                            onChange={(event) =>
                              onOwnerChange(task.id, event.target.value || undefined)
                            }
                          >
                            <option value="">Unassigned</option>
                            {ownerOptions.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.fullName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-500">
                          Status
                          <select
                            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-950"
                            value={task.status}
                            onChange={(event) =>
                              onStatusChange(task.id, event.target.value as TaskStatus)
                            }
                          >
                            {taskStatuses.map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{formatDate(task.dueDate)}</span>
                        <span>·</span>
                        <span>{getUserName(data.users, task.ownerId)}</span>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
                  No cards in this lane.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EventTeamPanel({
  event,
  data,
  onAddMember,
  onRemoveMember,
}: {
  event: EventRecord;
  data: EaseEventsData;
  onAddMember: (member: { eventId: string; userId: string; roleLabel: string }) => Promise<unknown>;
  onRemoveMember: (memberId: string) => Promise<void>;
}) {
  const teamMembers = React.useMemo(
    () => data.eventTeamMembers.filter((member) => member.eventId === event.id),
    [data.eventTeamMembers, event.id],
  );
  const staffUsers = React.useMemo(
    () => data.users.filter((user) => user.role === "admin" || user.role === "planner"),
    [data.users],
  );
  const availableUsers = React.useMemo(
    () => staffUsers.filter((user) => !teamMembers.some((member) => member.userId === user.id)),
    [staffUsers, teamMembers],
  );
  const [selectedUserId, setSelectedUserId] = React.useState(availableUsers[0]?.id ?? "");
  const [roleLabel, setRoleLabel] = React.useState("Planner");
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setSelectedUserId((current) =>
      current && availableUsers.some((user) => user.id === current)
        ? current
        : (availableUsers[0]?.id ?? ""),
    );
  }, [availableUsers]);

  async function handleAddMember(eventForm: React.FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    if (!selectedUserId) return;

    setIsSubmitting(true);
    setStatus("");

    try {
      await onAddMember({
        eventId: event.id,
        userId: selectedUserId,
        roleLabel: roleLabel.trim() || "Planner",
      });
      setRoleLabel("Planner");
      setStatus("Team member added.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add team member.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setStatus("");
    try {
      await onRemoveMember(memberId);
      setStatus("Team member removed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to remove team member.");
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg tracking-normal text-slate-950">
          <Users className="h-4 w-4" />
          Event team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {teamMembers.map((member) => {
            const user = data.users.find((item) => item.id === member.userId);
            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {user?.fullName ?? "Unknown user"}
                  </p>
                  <p className="truncate text-xs text-slate-500">{member.roleLabel}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${user?.fullName ?? "team member"}`}
                  onClick={() => void handleRemoveMember(member.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <form className="grid gap-3" onSubmit={handleAddMember}>
          <div className="grid gap-2 sm:grid-cols-[1fr_0.8fr]">
            <div className="space-y-2">
              <Label htmlFor={`team-user-${event.id}`}>Planner</Label>
              <select
                id={`team-user-${event.id}`}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={selectedUserId}
                onChange={(formEvent) => setSelectedUserId(formEvent.target.value)}
                disabled={!availableUsers.length}
              >
                {availableUsers.length ? (
                  availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))
                ) : (
                  <option value="">All planners staffed</option>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`team-role-${event.id}`}>Role</Label>
              <Input
                id={`team-role-${event.id}`}
                value={roleLabel}
                onChange={(formEvent) => setRoleLabel(formEvent.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={!selectedUserId || isSubmitting}>
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? "Adding..." : "Add to event team"}
          </Button>
          {status ? <p className="text-sm text-slate-500">{status}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function ClientPortalAccessPanel({
  event,
  clientName,
  clientUser,
  isProvisioning,
  status,
  onProvision,
}: {
  event: EventRecord;
  clientName?: string;
  clientUser?: EaseEventsData["users"][number];
  isProvisioning: boolean;
  status: string;
  onProvision: () => void;
}) {
  const isLinked = Boolean(event.clientUserId);

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg tracking-normal text-slate-950">
          <UserPlus className="h-4 w-4" />
          Client portal access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldValue label="Client" value={clientName ?? event.clientName} />
          <FieldValue label="Email" value={event.clientEmail} />
          <FieldValue
            label="Portal status"
            value={isLinked ? "Linked to event" : clientUser ? "Profile found" : "Not created"}
          />
          <FieldValue
            label="Portal URL"
            value={<span className="text-slate-600">/ease-events/client-portal</span>}
          />
        </div>

        {clientUser ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
            {isLinked
              ? `${clientUser.fullName} can use the client portal once their Supabase Auth login is active.`
              : `${clientUser.fullName} already has a client profile. Link it to this event to show this workspace in their portal.`}
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Create portal access after confirming the client email. Supabase will create or reuse
            the client login profile and link this event to that profile.
          </div>
        )}

        <Button
          type="button"
          variant={isLinked ? "outline" : "default"}
          disabled={isProvisioning}
          onClick={onProvision}
        >
          <UserPlus className="h-4 w-4" />
          {isProvisioning
            ? "Working..."
            : isLinked
              ? "Resend or relink access"
              : clientUser
                ? "Link client portal"
                : "Create client portal access"}
        </Button>

        {status ? <p className="text-sm leading-6 text-slate-600">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

function BudgetItemsTable({
  items,
  events,
  vendors,
  currency,
  onUpdateItem,
}: {
  items: ReturnType<typeof useEaseEventsStore>["data"]["budgetItems"];
  events: EventRecord[];
  vendors: EaseEventsData["vendors"];
  currency: string;
  onUpdateItem: (itemId: string, item: Omit<BudgetItem, "id" | "organizationId">) => void;
}) {
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const editingItem = items.find((item) => item.id === editingItemId);
  const [editForm, setEditForm] = React.useState({
    eventId: "",
    vendorId: "",
    category: "Decor" as BudgetCategory,
    description: "",
    plannedAmount: "",
    actualAmount: "",
    paidAmount: "",
    dueDate: "",
    marginEstimate: "",
  });

  React.useEffect(() => {
    if (!editingItem) return;
    setEditForm({
      eventId: editingItem.eventId,
      vendorId: editingItem.vendorId ?? "",
      category: editingItem.category,
      description: editingItem.description,
      plannedAmount: String(editingItem.plannedAmount || ""),
      actualAmount: String(editingItem.actualAmount || ""),
      paidAmount: String(editingItem.paidAmount || ""),
      dueDate: editingItem.dueDate,
      marginEstimate: String(editingItem.marginEstimate || ""),
    });
  }, [editingItem]);

  function updateMoneyField(
    field: "plannedAmount" | "actualAmount" | "paidAmount" | "marginEstimate",
  ) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setEditForm((current) => ({
        ...current,
        [field]: normalizeDecimalInput(event.target.value),
      }));
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={Wallet}
        title="No budget items"
        description="Budget items for this event will appear here."
      />
    );
  }
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const event = events.find((eventItem) => eventItem.id === item.eventId);
              const vendor = vendors.find((vendorItem) => vendorItem.id === item.vendorId);
              const balance = getBudgetItemBalance(item);
              return (
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell>
                      <StatusBadge value={item.category} />
                    </TableCell>
                    <TableCell>
                      {event ? (
                        <a href={eventHref(event.id)} className="font-medium hover:underline">
                          {event.eventName}
                        </a>
                      ) : (
                        "Unassigned"
                      )}
                    </TableCell>
                    <TableCell className="min-w-72">{item.description}</TableCell>
                    <TableCell>
                      {vendor ? (
                        <a href={vendorHref(vendor.id)} className="hover:underline">
                          {vendor.name}
                        </a>
                      ) : (
                        "No vendor"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.plannedAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.actualAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.paidAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balance, currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={getEventPaymentStatus(item)} />
                    </TableCell>
                    <TableCell>{formatDate(item.dueDate)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingItemId(item.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  {editingItemId === item.id ? (
                    <TableRow>
                      <TableCell colSpan={11} className="bg-slate-50">
                        <form
                          className="grid gap-4 md:grid-cols-4"
                          onSubmit={(eventForm) => {
                            eventForm.preventDefault();
                            onUpdateItem(item.id, {
                              ...editForm,
                              vendorId: editForm.vendorId || undefined,
                              plannedAmount: parseDecimalInput(editForm.plannedAmount),
                              actualAmount: parseDecimalInput(editForm.actualAmount),
                              paidAmount: parseDecimalInput(editForm.paidAmount),
                              marginEstimate: parseDecimalInput(editForm.marginEstimate),
                            });
                            setEditingItemId(null);
                          }}
                        >
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-event-${item.id}`}>Event</Label>
                            <select
                              id={`edit-budget-event-${item.id}`}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={editForm.eventId}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  eventId: event.target.value,
                                }))
                              }
                            >
                              {events.map((eventItem) => (
                                <option key={eventItem.id} value={eventItem.id}>
                                  {eventItem.eventName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-category-${item.id}`}>Category</Label>
                            <select
                              id={`edit-budget-category-${item.id}`}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={editForm.category}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  category: event.target.value as BudgetCategory,
                                }))
                              }
                            >
                              {budgetCategories.map((category) => (
                                <option key={category}>{category}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-vendor-${item.id}`}>Vendor</Label>
                            <select
                              id={`edit-budget-vendor-${item.id}`}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                              value={editForm.vendorId}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  vendorId: event.target.value,
                                }))
                              }
                            >
                              <option value="">No vendor</option>
                              {vendors.map((vendorItem) => (
                                <option key={vendorItem.id} value={vendorItem.id}>
                                  {vendorItem.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-due-${item.id}`}>Due date</Label>
                            <Input
                              id={`edit-budget-due-${item.id}`}
                              type="date"
                              value={editForm.dueDate}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  dueDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2 md:col-span-4">
                            <Label htmlFor={`edit-budget-description-${item.id}`}>
                              Description
                            </Label>
                            <Input
                              id={`edit-budget-description-${item.id}`}
                              value={editForm.description}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-planned-${item.id}`}>Planned</Label>
                            <Input
                              id={`edit-budget-planned-${item.id}`}
                              value={editForm.plannedAmount}
                              inputMode="decimal"
                              placeholder="0.00"
                              onChange={updateMoneyField("plannedAmount")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-actual-${item.id}`}>Actual</Label>
                            <Input
                              id={`edit-budget-actual-${item.id}`}
                              value={editForm.actualAmount}
                              inputMode="decimal"
                              placeholder="0.00"
                              onChange={updateMoneyField("actualAmount")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-paid-${item.id}`}>Paid</Label>
                            <Input
                              id={`edit-budget-paid-${item.id}`}
                              value={editForm.paidAmount}
                              inputMode="decimal"
                              placeholder="0.00"
                              onChange={updateMoneyField("paidAmount")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit-budget-margin-${item.id}`}>Margin estimate</Label>
                            <Input
                              id={`edit-budget-margin-${item.id}`}
                              value={editForm.marginEstimate}
                              inputMode="decimal"
                              placeholder="0.00"
                              onChange={updateMoneyField("marginEstimate")}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2 md:col-span-4">
                            <Button type="submit">Save budget item</Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingItemId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ClientBudgetPanel({
  event,
  items,
  vendors,
  currency,
}: {
  event: EventRecord;
  items: BudgetItem[];
  vendors: EaseEventsData["vendors"];
  currency: string;
}) {
  const estimatedTotal = items.reduce((sum, item) => sum + item.plannedAmount, 0);
  const finalTotal = items.reduce((sum, item) => sum + getBudgetItemBillableAmount(item), 0);
  const paidTotal = items.reduce((sum, item) => sum + item.paidAmount, 0);
  const balanceTotal = items.reduce((sum, item) => sum + getBudgetItemBalance(item), 0);

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <FieldValue label="Estimated total" value={formatCurrency(estimatedTotal, currency)} />
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <FieldValue label="Finalized total" value={formatCurrency(finalTotal, currency)} />
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <FieldValue label="Paid" value={formatCurrency(paidTotal, currency)} />
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <FieldValue label="Balance due" value={formatCurrency(balanceTotal, currency)} />
          </div>
        </div>

        {items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Estimate</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const vendor = vendors.find((vendorItem) => vendorItem.id === item.vendorId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <StatusBadge value={item.category} />
                    </TableCell>
                    <TableCell className="min-w-64">
                      <p className="font-medium text-slate-950">{item.description}</p>
                      <p className="text-xs text-slate-500">{event.eventName}</p>
                    </TableCell>
                    <TableCell>{vendor?.name ?? "TBD"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.plannedAmount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(getBudgetItemBillableAmount(item), currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(getBudgetItemBalance(item), currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={getEventPaymentStatus(item)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Wallet}
            title="No budget line items yet"
            description="Approved budget details will appear here once the planning team adds them."
          />
        )}
      </CardContent>
    </Card>
  );
}

function PaymentCollectionPanel({
  event,
  invoice,
  clientName,
  returnPath,
  currency,
  compact = false,
}: {
  event: EventRecord;
  invoice?: InvoiceRecord;
  clientName?: string;
  returnPath: string;
  currency: string;
  compact?: boolean;
}) {
  const { authMode } = useEaseEventsAuth();
  const [amountType, setAmountType] = React.useState<CheckoutAmountType>("deposit");
  const [customAmount, setCustomAmount] = React.useState(
    invoice ? String(getInvoiceBalance(invoice)) : "",
  );
  const [description, setDescription] = React.useState(
    invoice ? `${invoice.invoiceNumber} payment` : `${event.eventName} deposit`,
  );
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const legacyEventPrice = event.clientPrice > 0 ? event.clientPrice : 0;
  const suggestedAmount =
    amountType === "deposit"
      ? invoice
        ? getInvoiceBalance(invoice)
        : Math.round(legacyEventPrice * 0.5)
      : amountType === "full"
        ? invoice
          ? getInvoiceBalance(invoice)
          : legacyEventPrice
        : parseDecimalInput(customAmount);
  const amountCents = dollarsToCents(suggestedAmount);
  const canCollect = authMode === "supabase";

  React.useEffect(() => {
    if (amountType === "deposit") {
      setDescription(invoice ? `${invoice.invoiceNumber} payment` : `${event.eventName} deposit`);
    } else if (amountType === "full") {
      setDescription(
        invoice ? `${invoice.invoiceNumber} balance` : `${event.eventName} full payment`,
      );
    } else {
      setDescription(
        invoice ? `${invoice.invoiceNumber} custom payment` : `${event.eventName} payment`,
      );
    }
  }, [amountType, event.eventName, invoice]);

  async function handleCheckout() {
    setIsSubmitting(true);
    setStatus("");

    try {
      const result = await createCheckoutSession({
        eventId: event.id,
        invoiceId: invoice?.id,
        amountCents,
        description,
        returnPath,
      });

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      setStatus(
        result.error ??
          "Stripe checkout is not available yet. Confirm Stripe keys are configured server-side.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg tracking-normal text-slate-950">
          <CreditCard className="h-4 w-4" />
          Collect client payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("grid gap-4", compact ? "md:grid-cols-1" : "md:grid-cols-3")}>
          <div className="space-y-2">
            <Label htmlFor={`payment-type-${event.id}`}>Payment type</Label>
            <select
              id={`payment-type-${event.id}`}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={amountType}
              onChange={(formEvent) => setAmountType(formEvent.target.value as CheckoutAmountType)}
            >
              <option value="deposit">Deposit - 50%</option>
              <option value="full">{invoice ? "Invoice balance" : "Configured event price"}</option>
              <option value="custom">Custom amount</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`payment-amount-${event.id}`}>Amount</Label>
            <Input
              id={`payment-amount-${event.id}`}
              inputMode="decimal"
              value={amountType === "custom" ? customAmount : String(suggestedAmount || "")}
              disabled={amountType !== "custom"}
              onChange={(formEvent) =>
                setCustomAmount(normalizeDecimalInput(formEvent.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`payment-description-${event.id}`}>Description</Label>
            <Input
              id={`payment-description-${event.id}`}
              value={description}
              onChange={(formEvent) => setDescription(formEvent.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            Client:{" "}
            <span className="font-medium text-slate-950">{clientName ?? event.clientName}</span>
          </p>
          {invoice ? (
            <p className="mt-1">
              Invoice: <span className="font-semibold text-slate-950">{invoice.invoiceNumber}</span>
            </p>
          ) : null}
          <p className="mt-1">
            Checkout amount:{" "}
            <span className="font-semibold text-slate-950">
              {formatCurrency(suggestedAmount, currency)}
            </span>
          </p>
        </div>

        {!canCollect ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Live payment collection requires signing in with a Supabase account. Demo mode does not
            create Stripe checkout sessions.
          </p>
        ) : null}

        {status ? <p className="text-sm leading-6 text-slate-600">{status}</p> : null}

        <Button
          type="button"
          disabled={!canCollect || isSubmitting || amountCents < 100 || !description.trim()}
          onClick={() => void handleCheckout()}
        >
          <CreditCard className="h-4 w-4" />
          {isSubmitting ? "Opening checkout..." : "Collect payment"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateInvoicePanel({
  defaultEventId,
  lockEvent = false,
}: {
  defaultEventId?: string;
  lockEvent?: boolean;
}) {
  const { data, createInvoice } = useEaseEventsStore();
  const event = data.events.find((item) => item.id === defaultEventId) ?? data.events[0];
  const [form, setForm] = React.useState({
    eventId: defaultEventId ?? event?.id ?? "",
    invoiceType: "Deposit" as InvoiceType,
    amount: "",
    paidAmount: "",
    dueDate: event?.eventDate ?? new Date().toISOString().slice(0, 10),
    status: "Draft" as InvoiceStatus,
    notes: "",
  });
  const [status, setStatus] = React.useState("");

  const selectedEvent = data.events.find((item) => item.id === form.eventId);

  async function handleSubmit(eventForm: React.FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    if (!selectedEvent) return;
    const amount = parseDecimalInput(form.amount);
    const paidAmount = parseDecimalInput(form.paidAmount);
    if (amount <= 0) {
      setStatus("Enter a valid invoice amount before creating an invoice.");
      return;
    }

    await createInvoice({
      eventId: selectedEvent.id,
      clientId: selectedEvent.clientId,
      invoiceType: form.invoiceType,
      amount,
      paidAmount,
      dueDate: form.dueDate,
      status: form.status,
      notes: form.notes,
      metadata: { source: "manual" },
    });
    setStatus("Invoice created.");
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg tracking-normal text-slate-950">
          <ReceiptText className="h-4 w-4" />
          Create invoice
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(eventForm) => void handleSubmit(eventForm)}
        >
          <div className="space-y-2">
            <Label htmlFor="invoice-event">Event</Label>
            <select
              id="invoice-event"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.eventId}
              disabled={lockEvent}
              onChange={(changeEvent) => {
                const nextEvent = data.events.find((item) => item.id === changeEvent.target.value);
                setForm((current) => ({
                  ...current,
                  eventId: changeEvent.target.value,
                  dueDate: nextEvent?.eventDate ?? current.dueDate,
                }));
              }}
            >
              {data.events.map((eventItem) => (
                <option key={eventItem.id} value={eventItem.id}>
                  {eventItem.eventName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-type">Type</Label>
            <select
              id="invoice-type"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.invoiceType}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  invoiceType: changeEvent.target.value as InvoiceType,
                }))
              }
            >
              {invoiceTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-status">Status</Label>
            <select
              id="invoice-status"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.status}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  status: changeEvent.target.value as InvoiceStatus,
                }))
              }
            >
              {invoiceStatuses.map((invoiceStatus) => (
                <option key={invoiceStatus}>{invoiceStatus}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-amount">Amount</Label>
            <Input
              id="invoice-amount"
              value={form.amount}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  amount: normalizeDecimalInput(changeEvent.target.value),
                }))
              }
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-paid">Paid</Label>
            <Input
              id="invoice-paid"
              value={form.paidAmount}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  paidAmount: normalizeDecimalInput(changeEvent.target.value),
                }))
              }
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-due">Due date</Label>
            <Input
              id="invoice-due"
              type="date"
              value={form.dueDate}
              onChange={(changeEvent) =>
                setForm((current) => ({ ...current, dueDate: changeEvent.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea
              id="invoice-notes"
              value={form.notes}
              onChange={(changeEvent) =>
                setForm((current) => ({ ...current, notes: changeEvent.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-3 md:col-span-3">
            <Button
              type="submit"
              disabled={!form.amount.trim() || parseDecimalInput(form.amount) <= 0}
            >
              <ReceiptText className="h-4 w-4" />
              Create invoice
            </Button>
            {status ? <p className="text-sm text-slate-500">{status}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function InvoicesTable({
  invoices,
  events,
  currency,
  showEvent = true,
  returnPath,
  allowManage = true,
}: {
  invoices: InvoiceRecord[];
  events: EventRecord[];
  currency: string;
  showEvent?: boolean;
  returnPath: string;
  allowManage?: boolean;
}) {
  const { updateInvoice } = useEaseEventsStore();
  const openInvoices = invoices.filter((invoice) => getEffectiveInvoiceStatus(invoice) !== "Void");

  if (!openInvoices.length) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No invoices yet"
        description="Create an invoice to collect deposits, milestones, or final balances."
      />
    );
  }

  function handleMarkPaid(invoice: InvoiceRecord) {
    void updateInvoice(invoice.id, {
      eventId: invoice.eventId,
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      amount: invoice.amount,
      paidAmount: invoice.amount,
      dueDate: invoice.dueDate,
      status: "Paid",
      stripeInvoiceId: invoice.stripeInvoiceId,
      stripePaymentIntentId: invoice.stripePaymentIntentId,
      stripeCheckoutSessionId: invoice.stripeCheckoutSessionId,
      notes: invoice.notes,
      metadata: { ...invoice.metadata, marked_paid_manually: true },
    });
  }

  function handleSend(invoice: InvoiceRecord) {
    void updateInvoice(invoice.id, {
      eventId: invoice.eventId,
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount,
      dueDate: invoice.dueDate,
      status: getInvoiceBalance(invoice) <= 0 ? "Paid" : "Sent",
      stripeInvoiceId: invoice.stripeInvoiceId,
      stripePaymentIntentId: invoice.stripePaymentIntentId,
      stripeCheckoutSessionId: invoice.stripeCheckoutSessionId,
      notes: invoice.notes,
      metadata: { ...invoice.metadata, sent_at: new Date().toISOString() },
    });
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              {showEvent ? <TableHead>Event</TableHead> : null}
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">{allowManage ? "Actions" : "Payment"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openInvoices.map((invoice) => {
              const event = events.find((item) => item.id === invoice.eventId);
              const balance = getInvoiceBalance(invoice);
              const effectiveStatus = getEffectiveInvoiceStatus(invoice);
              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <p className="font-medium text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{invoice.invoiceType}</p>
                  </TableCell>
                  {showEvent ? (
                    <TableCell>
                      {event ? (
                        <a href={eventHref(event.id)} className="hover:underline">
                          {event.eventName}
                        </a>
                      ) : (
                        "Unknown event"
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <StatusBadge value={effectiveStatus} />
                  </TableCell>
                  <TableCell>
                    {invoice.dueDate ? formatDate(invoice.dueDate) : "No due date"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.amount, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.paidAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-950">
                    {formatCurrency(balance, currency)}
                  </TableCell>
                  <TableCell>
                    {allowManage ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleSend(invoice)}>
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={balance <= 0}
                          onClick={() => handleMarkPaid(invoice)}
                        >
                          Mark paid
                        </Button>
                      </div>
                    ) : null}
                    {event && balance > 0 ? (
                      <div className="mt-2">
                        <PaymentCollectionPanel
                          event={event}
                          invoice={invoice}
                          currency={currency}
                          returnPath={returnPath}
                          compact
                        />
                      </div>
                    ) : null}
                    {!allowManage && balance <= 0 ? (
                      <p className="text-right text-sm text-slate-500">Paid</p>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function VendorAssignmentTable({
  assignments,
}: {
  assignments: ReturnType<typeof useEaseEventsStore>["data"]["eventVendors"];
}) {
  const { data } = useEaseEventsStore();
  if (!assignments.length) {
    return (
      <EmptyState
        icon={Building2}
        title="No assigned vendors"
        description="Assigned vendors will appear here."
      />
    );
  }
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Quoted</TableHead>
              <TableHead className="text-right">Commitment</TableHead>
              <TableHead>Expenses</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => {
              const vendor = data.vendors.find((item) => item.id === assignment.vendorId);
              const event = data.events.find((item) => item.id === assignment.eventId);
              return (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <a
                      className="font-medium text-slate-950 hover:underline"
                      href={vendor ? vendorHref(vendor.id) : "/ease-events/vendors"}
                    >
                      {vendor?.name ?? "Vendor"}
                    </a>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={assignment.serviceCategory} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(assignment.quotedAmount, data.organization.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(assignment.actualAmount, data.organization.currency)}
                  </TableCell>
                  <TableCell>
                    {event ? (
                      <VendorFinancialSummary
                        event={event}
                        assignmentVendorId={assignment.vendorId}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={assignment.paymentStatus} />
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-slate-500">
                    {assignment.notes}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FilesTable({ files }: { files: ReturnType<typeof useEaseEventsStore>["data"]["files"] }) {
  if (!files.length) {
    return (
      <EmptyState
        icon={UploadCloud}
        title="No files yet"
        description="Contracts, quotes, receipts, and event files will appear here."
      />
    );
  }
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium text-slate-950">{file.name}</TableCell>
                <TableCell>
                  <StatusBadge value={file.category} />
                </TableCell>
                <TableCell>{file.mimeType}</TableCell>
                <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ApprovalsGrid({
  approvals,
  onStatusChange,
}: {
  approvals: ReturnType<typeof useEaseEventsStore>["data"]["approvals"];
  onStatusChange: (approvalId: string, status: ApprovalStatus) => void;
}) {
  if (!approvals.length) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No approvals"
        description="Client approvals will appear here."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {approvals.map((approval) => (
        <Card key={approval.id} className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base tracking-normal text-slate-950">
                {approval.title}
              </CardTitle>
              <StatusBadge value={approval.status} />
            </div>
          </CardHeader>
          <CardContent>
            <StatusBadge value={approval.type} />
            <p className="mt-3 text-sm leading-6 text-slate-600">{approval.description}</p>
            <p className="mt-3 text-xs text-slate-500">Due {formatDate(approval.dueDate)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onStatusChange(approval.id, "Approved")}>
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(approval.id, "Changes Requested")}
              >
                Request changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateTaskPanel({
  defaultEventId,
  defaultProjectId,
  lockEvent = false,
}: {
  defaultEventId?: string;
  defaultProjectId?: string;
  lockEvent?: boolean;
} = {}) {
  const { data, createTask } = useEaseEventsStore();
  const initialEventId = defaultEventId ?? data.events[0]?.id ?? "";
  const [form, setForm] = React.useState({
    eventId: initialEventId,
    ownerId: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium" as TaskRecord["priority"],
    linkLabel: "",
    linkUrl: "",
  });
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const ownerOptions = React.useMemo(
    () => getAssignableUsersForEvent(data, form.eventId),
    [data, form.eventId],
  );
  const selectedEvent = data.events.find((event) => event.id === form.eventId);

  React.useEffect(() => {
    if (defaultEventId) {
      setForm((current) => ({ ...current, eventId: defaultEventId }));
    }
  }, [defaultEventId]);

  React.useEffect(() => {
    setForm((current) => {
      if (!current.ownerId || ownerOptions.some((user) => user.id === current.ownerId)) {
        return current;
      }

      return { ...current, ownerId: "" };
    });
  }, [ownerOptions]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      const dueDateInput = event.currentTarget.querySelector<HTMLInputElement>("#task-due");
      const dueDate = dueDateInput?.value ?? form.dueDate;
      await createTask({
        eventId: form.eventId,
        projectId: defaultProjectId,
        ownerId: form.ownerId || undefined,
        title: form.title,
        description: form.description,
        dueDate,
        priority: form.priority,
        links: form.linkUrl.trim()
          ? [{ label: form.linkLabel.trim() || form.linkUrl.trim(), url: form.linkUrl.trim() }]
          : [],
      });
      setForm((current) => ({
        ...current,
        title: "",
        description: "",
        dueDate: "",
        priority: "Medium",
        linkLabel: "",
        linkUrl: "",
      }));
      if (dueDateInput) dueDateInput.value = "";
      setStatus("Task created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Create task</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          {lockEvent ? (
            <div className="space-y-2">
              <Label>Event</Label>
              <Input value={selectedEvent?.eventName ?? "Selected event"} disabled />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="task-event">Event</Label>
              <select
                id="task-event"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.eventId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventId: event.target.value }))
                }
                required
              >
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="task-owner">Owner</Label>
            <select
              id="task-owner"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.ownerId}
              onChange={(event) =>
                setForm((current) => ({ ...current, ownerId: event.target.value }))
              }
            >
              <option value="">Unassigned</option>
              {ownerOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              defaultValue={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority</Label>
            <select
              id="task-priority"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as TaskRecord["priority"],
                }))
              }
            >
              {taskPriorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-link-label">Link label</Label>
            <Input
              id="task-link-label"
              value={form.linkLabel}
              onChange={(event) =>
                setForm((current) => ({ ...current, linkLabel: event.target.value }))
              }
              placeholder="Quote, moodboard, floor plan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-link-url">Link URL</Label>
            <Input
              id="task-link-url"
              type="url"
              value={form.linkUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, linkUrl: event.target.value }))
              }
              placeholder="https://"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitting || !form.eventId}>
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create task"}
            </Button>
            {status ? <p className="mt-3 text-sm text-slate-500">{status}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateBudgetItemPanel({
  defaultEventId,
  lockEvent = false,
}: {
  defaultEventId?: string;
  lockEvent?: boolean;
} = {}) {
  const { data, createBudgetItem, createEventVendor } = useEaseEventsStore();
  const initialEventId = defaultEventId ?? data.events[0]?.id ?? "";
  const [form, setForm] = React.useState({
    eventId: initialEventId,
    vendorId: "",
    category: "Decor" as BudgetCategory,
    description: "",
    plannedAmount: "",
    actualAmount: "",
    paidAmount: "",
    dueDate: "",
    marginEstimate: "",
  });
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const selectedEvent = data.events.find((event) => event.id === form.eventId);

  React.useEffect(() => {
    if (defaultEventId) {
      setForm((current) => ({ ...current, eventId: defaultEventId }));
    }
  }, [defaultEventId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      const dueDateInput = event.currentTarget.querySelector<HTMLInputElement>("#budget-due");
      const dueDate = dueDateInput?.value ?? form.dueDate;
      const plannedAmount = parseDecimalInput(form.plannedAmount);
      const actualAmount = parseDecimalInput(form.actualAmount);
      const paidAmount = parseDecimalInput(form.paidAmount);
      const marginEstimate = parseDecimalInput(form.marginEstimate);
      const budgetItemInput = {
        ...form,
        dueDate,
        vendorId: form.vendorId || undefined,
        plannedAmount,
        actualAmount,
        paidAmount,
        marginEstimate,
      };
      await createBudgetItem(budgetItemInput);

      if (
        form.vendorId &&
        form.eventId &&
        !data.eventVendors.some(
          (assignment) =>
            assignment.eventId === form.eventId && assignment.vendorId === form.vendorId,
        )
      ) {
        await createEventVendor({
          eventId: form.eventId,
          vendorId: form.vendorId,
          serviceCategory: form.category,
          quotedAmount: plannedAmount,
          actualAmount,
          paymentStatus: getPaymentStatusFromAmounts({
            actualAmount,
            dueDate,
            paidAmount,
            plannedAmount,
          }),
          notes: `Created from budget item: ${form.description}`,
        });
      }
      setForm((current) => ({
        ...current,
        description: "",
        plannedAmount: "",
        actualAmount: "",
        paidAmount: "",
        marginEstimate: "",
      }));
      if (dueDateInput) dueDateInput.value = "";
      setStatus("Budget item created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create budget item.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function moneyField(field: "plannedAmount" | "actualAmount" | "paidAmount" | "marginEstimate") {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: normalizeDecimalInput(event.target.value) }));
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Add budget item</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          {lockEvent ? (
            <div className="space-y-2">
              <Label>Event</Label>
              <Input value={selectedEvent?.eventName ?? "Selected event"} disabled />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="budget-event">Event</Label>
              <select
                id="budget-event"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.eventId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventId: event.target.value }))
                }
                required
              >
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="budget-category">Category</Label>
            <select
              id="budget-category"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as BudgetCategory,
                }))
              }
            >
              {budgetCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-vendor">Vendor</Label>
            <select
              id="budget-vendor"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.vendorId}
              onChange={(event) =>
                setForm((current) => ({ ...current, vendorId: event.target.value }))
              }
            >
              <option value="">No vendor</option>
              {data.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="budget-description">Description</Label>
            <Input
              id="budget-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-planned">Planned amount</Label>
            <Input
              id="budget-planned"
              value={form.plannedAmount}
              inputMode="decimal"
              placeholder="0.00"
              onChange={moneyField("plannedAmount")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-actual">Actual amount</Label>
            <Input
              id="budget-actual"
              value={form.actualAmount}
              inputMode="decimal"
              placeholder="0.00"
              onChange={moneyField("actualAmount")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-paid">Paid amount</Label>
            <Input
              id="budget-paid"
              value={form.paidAmount}
              inputMode="decimal"
              placeholder="0.00"
              onChange={moneyField("paidAmount")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-margin">Margin estimate</Label>
            <Input
              id="budget-margin"
              value={form.marginEstimate}
              inputMode="decimal"
              placeholder="0.00"
              onChange={moneyField("marginEstimate")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-due">Due date</Label>
            <Input
              id="budget-due"
              type="date"
              defaultValue={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting || !form.eventId}>
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add item"}
            </Button>
          </div>
          {status ? <p className="text-sm text-slate-500 md:col-span-3">{status}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function CreateVendorPanel() {
  const { createVendor } = useEaseEventsStore();
  const [form, setForm] = React.useState({
    name: "",
    serviceCategory: "Decor" as BudgetCategory,
    contactName: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
    rating: 4,
  });
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      await createVendor({
        ...form,
        website: form.website || undefined,
      });
      setForm((current) => ({
        ...current,
        name: "",
        contactName: "",
        email: "",
        phone: "",
        website: "",
        notes: "",
      }));
      setStatus("Vendor created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create vendor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mb-6 rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Add vendor</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Vendor name</Label>
            <Input
              id="vendor-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-category">Category</Label>
            <select
              id="vendor-category"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.serviceCategory}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  serviceCategory: event.target.value as BudgetCategory,
                }))
              }
            >
              {budgetCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-contact">Contact name</Label>
            <Input
              id="vendor-contact"
              value={form.contactName}
              onChange={(event) =>
                setForm((current) => ({ ...current, contactName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-email">Email</Label>
            <Input
              id="vendor-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-phone">Phone</Label>
            <Input
              id="vendor-phone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-rating">Rating</Label>
            <Input
              id="vendor-rating"
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(event) =>
                setForm((current) => ({ ...current, rating: Number(event.target.value) }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="vendor-notes">Notes</Label>
            <Textarea
              id="vendor-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add vendor"}
            </Button>
            {status ? <p className="mt-3 text-sm text-slate-500">{status}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const vendorPaymentStatuses: EventVendor["paymentStatus"][] = [
  "Not Paid",
  "Deposit Paid",
  "Partially Paid",
  "Paid",
  "Overdue",
];

function EventVendorAssignmentPanel({ event }: { event: EventRecord }) {
  const { data, createEventVendor } = useEaseEventsStore();
  const firstVendor = data.vendors[0];
  const [form, setForm] = React.useState({
    vendorId: firstVendor?.id ?? "",
    serviceCategory: firstVendor?.serviceCategory ?? ("Decor" as BudgetCategory),
    quotedAmount: "",
    actualAmount: "",
    paymentStatus: "Not Paid" as EventVendor["paymentStatus"],
    notes: "",
  });
  const [status, setStatus] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (form.vendorId || !firstVendor) return;
    setForm((current) => ({
      ...current,
      vendorId: firstVendor.id,
      serviceCategory: firstVendor.serviceCategory,
    }));
  }, [firstVendor, form.vendorId]);

  async function handleSubmit(eventForm: React.FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      await createEventVendor({
        eventId: event.id,
        ...form,
        quotedAmount: parseDecimalInput(form.quotedAmount),
        actualAmount: parseDecimalInput(form.actualAmount),
      });
      setForm((current) => ({
        ...current,
        quotedAmount: "",
        actualAmount: "",
        paymentStatus: "Not Paid",
        notes: "",
      }));
      setStatus("Vendor assigned to event.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to assign vendor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!data.vendors.length) {
    return (
      <EmptyState
        icon={Building2}
        title="No vendors yet"
        description="Add a general vendor first, then assign them to this event."
      />
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Assign vendor</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`event-vendor-${event.id}`}>Vendor</Label>
            <select
              id={`event-vendor-${event.id}`}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.vendorId}
              onChange={(changeEvent) => {
                const vendor = data.vendors.find((item) => item.id === changeEvent.target.value);
                setForm((current) => ({
                  ...current,
                  vendorId: changeEvent.target.value,
                  serviceCategory: vendor?.serviceCategory ?? current.serviceCategory,
                }));
              }}
              required
            >
              {data.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`event-vendor-category-${event.id}`}>Service category</Label>
            <select
              id={`event-vendor-category-${event.id}`}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.serviceCategory}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  serviceCategory: changeEvent.target.value as BudgetCategory,
                }))
              }
            >
              {budgetCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`event-vendor-payment-${event.id}`}>Payment status</Label>
            <select
              id={`event-vendor-payment-${event.id}`}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.paymentStatus}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  paymentStatus: changeEvent.target.value as EventVendor["paymentStatus"],
                }))
              }
            >
              {vendorPaymentStatuses.map((paymentStatus) => (
                <option key={paymentStatus}>{paymentStatus}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`event-vendor-quoted-${event.id}`}>Quoted amount</Label>
            <Input
              id={`event-vendor-quoted-${event.id}`}
              inputMode="decimal"
              value={form.quotedAmount}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  quotedAmount: normalizeDecimalInput(changeEvent.target.value),
                }))
              }
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`event-vendor-actual-${event.id}`}>Actual amount</Label>
            <Input
              id={`event-vendor-actual-${event.id}`}
              inputMode="decimal"
              value={form.actualAmount}
              onChange={(changeEvent) =>
                setForm((current) => ({
                  ...current,
                  actualAmount: normalizeDecimalInput(changeEvent.target.value),
                }))
              }
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor={`event-vendor-notes-${event.id}`}>Notes</Label>
            <Textarea
              id={`event-vendor-notes-${event.id}`}
              value={form.notes}
              onChange={(changeEvent) =>
                setForm((current) => ({ ...current, notes: changeEvent.target.value }))
              }
            />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting || !form.vendorId}>
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Assigning..." : "Assign vendor"}
            </Button>
            {status ? <p className="mt-3 text-sm text-slate-500">{status}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TasksPage() {
  const { data, updateTaskStatus, updateTaskOwner, updateTask, toggleChecklistItem } =
    useEaseEventsStore();
  const { currentUser } = useEaseEventsAuth();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [eventFilter, setEventFilter] = React.useState(() => readQueryParam("event", "all"));
  const [ownerFilter, setOwnerFilter] = React.useState(() => readQueryParam("owner", "all"));
  const [statusFilter, setStatusFilter] = React.useState(() => readQueryParam("status", "open"));
  const [priorityFilter, setPriorityFilter] = React.useState(() =>
    readQueryParam("priority", "all"),
  );
  const [dueFilter, setDueFilter] = React.useState(() => readQueryParam("due", "all"));
  const visibleEvents = getVisibleEvents(data, currentUser);
  const visibleEventIds = new Set(visibleEvents.map((event) => event.id));
  const filteredTasks = data.tasks.filter((task) => {
    const statusMatches =
      statusFilter === "all" ||
      (statusFilter === "open" && task.status !== "Done") ||
      task.status === statusFilter;
    const dueMatches = dueFilter === "all" || (dueFilter === "overdue" && isOverdueTask(task));
    return (
      visibleEventIds.has(task.eventId) &&
      (eventFilter === "all" || task.eventId === eventFilter) &&
      (ownerFilter === "all" || task.ownerId === ownerFilter) &&
      (priorityFilter === "all" || task.priority === priorityFilter) &&
      statusMatches &&
      dueMatches
    );
  });

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Tasks"
        description="Track per-event task ownership, due dates, priority, blockers, and checklist completion."
        actions={
          <Button onClick={() => setIsCreateOpen((current) => !current)}>
            <Plus className="h-4 w-4" />
            Create task
          </Button>
        }
      />
      {isCreateOpen ? (
        <div className="mb-6">
          <CreateTaskPanel />
        </div>
      ) : null}
      <Card className="mb-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="task-event-filter">Event</Label>
            <select
              id="task-event-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option value="all">All events</option>
              {visibleEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-owner-filter">Owner</Label>
            <select
              id="task-owner-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
            >
              <option value="all">All owners</option>
              {data.users
                .filter((user) => user.role === "admin" || user.role === "planner")
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-status-filter">Status</Label>
            <select
              id="task-status-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="open">Open tasks</option>
              <option value="all">All statuses</option>
              {taskStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-priority-filter">Priority</Label>
            <select
              id="task-priority-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="all">All priorities</option>
              {taskPriorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due-filter">Due</Label>
            <select
              id="task-due-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={dueFilter}
              onChange={(event) => setDueFilter(event.target.value)}
            >
              <option value="all">Any due date</option>
              <option value="overdue">Overdue only</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <TaskBoard
          tasks={filteredTasks}
          events={visibleEvents}
          data={data}
          onStatusChange={updateTaskStatus}
          onOwnerChange={updateTaskOwner}
        />
        <TaskTable
          tasks={filteredTasks}
          events={visibleEvents}
          data={data}
          onStatusChange={updateTaskStatus}
          onOwnerChange={updateTaskOwner}
          onTaskUpdate={(taskId, task) => void updateTask(taskId, task)}
          onChecklistToggle={toggleChecklistItem}
        />
      </div>
    </div>
  );
}

export function BudgetsPage() {
  const { data, updateBudgetItem } = useEaseEventsStore();
  const currency = data.organization.currency;
  const paymentReturnState = getPaymentReturnState();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isInvoiceCreateOpen, setIsInvoiceCreateOpen] = React.useState(false);
  const [financeTab, setFinanceTab] = React.useState(() => readQueryParam("view", "budget"));
  const [eventFilter, setEventFilter] = React.useState(() => readQueryParam("event", "all"));
  const [clientFilter, setClientFilter] = React.useState(() => readQueryParam("client", "all"));
  const [eventStatusFilter, setEventStatusFilter] = React.useState(() =>
    readQueryParam("status", "active"),
  );
  const [categoryFilter, setCategoryFilter] = React.useState(() =>
    readQueryParam("category", "all"),
  );
  const [paymentFilter, setPaymentFilter] = React.useState(() => readQueryParam("payment", "open"));
  const clientOptions = getClientOptions(data);
  const filteredEvents = data.events.filter((event) => {
    const statusMatches =
      eventStatusFilter === "all" ||
      (eventStatusFilter === "active" && isActiveEventStatus(event.status)) ||
      event.status === eventStatusFilter;
    return (
      (eventFilter === "all" || event.id === eventFilter) &&
      matchesClient(event, clientFilter) &&
      statusMatches
    );
  });
  const filteredEventIds = new Set(filteredEvents.map((event) => event.id));
  const filteredBudgetItems = data.budgetItems.filter((item) => {
    const paymentStatus = getEventPaymentStatus(item);
    const paymentMatches =
      paymentFilter === "all" ||
      (paymentFilter === "open" && paymentStatus !== "Paid") ||
      paymentStatus === paymentFilter;
    return (
      filteredEventIds.has(item.eventId) &&
      (categoryFilter === "all" || item.category === categoryFilter) &&
      paymentMatches
    );
  });
  const filteredInvoices = data.invoices.filter((invoice) => {
    const invoiceStatus = getEffectiveInvoiceStatus(invoice);
    const balance = getInvoiceBalance(invoice);
    const paymentMatches =
      paymentFilter === "all" ||
      (paymentFilter === "open" && balance > 0 && invoiceStatus !== "Void") ||
      (paymentFilter === "Balance Due" && balance > 0 && invoiceStatus !== "Void") ||
      invoiceStatus === paymentFilter;
    return filteredEventIds.has(invoice.eventId) && paymentMatches;
  });
  const openInvoiceBalance = filteredInvoices.reduce(
    (sum, invoice) => sum + getInvoiceBalance(invoice),
    0,
  );
  const overdueInvoices = filteredInvoices.filter(
    (invoice) => getEffectiveInvoiceStatus(invoice) === "Overdue",
  );
  const collectedInvoiceRevenue = filteredInvoices.reduce(
    (sum, invoice) => sum + invoice.paidAmount,
    0,
  );
  const categoryTotals = budgetCategories.map((category) => ({
    category,
    planned: filteredBudgetItems
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + item.plannedAmount, 0),
    actual: filteredBudgetItems
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + item.actualAmount, 0),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Finance command center"
        title="Finances"
        description="Manage event budgets, client invoices, payment collection, and open balances from one place."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsInvoiceCreateOpen((current) => !current)}>
              <ReceiptText className="h-4 w-4" />
              Create invoice
            </Button>
            <Button onClick={() => setIsCreateOpen((current) => !current)}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>
        }
      />
      {paymentReturnState ? (
        <div
          className={cn(
            "mb-6 rounded-lg border px-4 py-3 text-sm",
            paymentReturnState === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          {paymentReturnState === "success"
            ? "Stripe checkout completed. Webhook reconciliation can now mark this payment as received."
            : "Stripe checkout was cancelled. No payment was collected."}
        </div>
      ) : null}
      {isInvoiceCreateOpen ? (
        <div className="mb-6">
          <CreateInvoicePanel
            defaultEventId={eventFilter === "all" ? undefined : eventFilter}
            lockEvent={eventFilter !== "all"}
          />
        </div>
      ) : null}
      {isCreateOpen ? (
        <div className="mb-6">
          <CreateBudgetItemPanel />
        </div>
      ) : null}
      <div className="mb-6">
        <GlobalFinancePanel />
      </div>
      <Card className="mb-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="budget-event-filter">Event</Label>
            <select
              id="budget-event-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option value="all">All events</option>
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-client-filter">Client</Label>
            <select
              id="budget-client-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="all">All clients</option>
              {clientOptions.map((client) => (
                <option key={client.key} value={client.key}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-event-status-filter">Event status</Label>
            <select
              id="budget-event-status-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={eventStatusFilter}
              onChange={(event) => setEventStatusFilter(event.target.value)}
            >
              <option value="active">Active events</option>
              <option value="all">All statuses</option>
              {eventStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-category-filter">Category</Label>
            <select
              id="budget-category-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {budgetCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-payment-filter">Payment status</Label>
            <select
              id="budget-payment-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
            >
              <option value="open">Open balances</option>
              <option value="all">All payment statuses</option>
              <option value="Balance Due">Balance due</option>
              <option value="Overdue">Overdue</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <Tabs value={financeTab} onValueChange={setFinanceTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-6">
          {filteredEvents.map((event) => {
            const eventItems = filteredBudgetItems.filter((item) => item.eventId === event.id);
            if (!eventItems.length && paymentFilter !== "all") return null;
            const clientName = getEventClientName(data, event);
            return (
              <section key={event.id} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <a
                      href={eventHref(event.id)}
                      className="text-lg font-semibold text-slate-950 hover:underline"
                    >
                      {event.eventName}
                    </a>
                    <p className="text-sm text-slate-500">
                      {clientName} · {formatDate(event.eventDate)}
                    </p>
                  </div>
                  <StatusBadge value={event.status} />
                </div>
                <BudgetSummaryGrid event={event} budgetItems={eventItems} currency={currency} />
                <BudgetItemsTable
                  items={eventItems}
                  events={filteredEvents}
                  vendors={data.vendors}
                  currency={currency}
                  onUpdateItem={(itemId, item) => void updateBudgetItem(itemId, item)}
                />
              </section>
            );
          })}

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Category rollup
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryTotals.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell>
                        <StatusBadge value={item.category} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.planned, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.actual, currency)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right",
                          item.actual > item.planned ? "text-rose-600" : "text-emerald-600",
                        )}
                      >
                        {formatCurrency(item.planned - item.actual, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
            <MetricCard
              label="Open invoices"
              value={`${filteredInvoices.filter((invoice) => getInvoiceBalance(invoice) > 0).length}`}
              helper="Require payment or follow-up"
              icon={ReceiptText}
              tone={openInvoiceBalance > 0 ? "warn" : "good"}
            />
            <MetricCard
              label="Outstanding"
              value={formatCurrency(openInvoiceBalance, currency)}
              helper="Client balance due"
              icon={CreditCard}
              tone={openInvoiceBalance > 0 ? "warn" : "good"}
            />
            <MetricCard
              label="Overdue"
              value={`${overdueInvoices.length}`}
              helper="Past due invoices"
              icon={AlertTriangle}
              tone={overdueInvoices.length ? "danger" : "good"}
            />
            <MetricCard
              label="Collected"
              value={formatCurrency(collectedInvoiceRevenue, currency)}
              helper="Paid on filtered invoices"
              icon={BadgeDollarSign}
              tone="good"
            />
          </div>
          <InvoicesTable
            invoices={filteredInvoices}
            events={data.events}
            currency={currency}
            returnPath={withQuery("/ease-events/budgets", {
              view: "invoices",
              event: eventFilter === "all" ? undefined : eventFilter,
              payment: paymentFilter,
            })}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <ActionHub
            title="Payment follow-up"
            description="Invoices with an open balance are ready for checkout or client follow-up."
            items={filteredInvoices
              .filter((invoice) => getInvoiceBalance(invoice) > 0)
              .slice(0, 5)
              .map((invoice) => {
                const event = data.events.find((item) => item.id === invoice.eventId);
                return {
                  title: `${invoice.invoiceNumber} · ${formatCurrency(
                    getInvoiceBalance(invoice),
                    currency,
                  )} due`,
                  description: event
                    ? `${event.eventName} for ${getEventClientName(data, event)}`
                    : "Unmatched event invoice",
                  href: event ? eventHref(event.id) : "/ease-events/budgets",
                  icon: CreditCard,
                  status: getEffectiveInvoiceStatus(invoice),
                  tone: getEffectiveInvoiceStatus(invoice) === "Overdue" ? "danger" : "warn",
                  actionLabel: "Open event",
                };
              })}
            emptyTitle="No open payments"
            emptyDescription="Filtered invoices are paid, void, or not yet created."
          />
          <InvoicesTable
            invoices={filteredInvoices.filter((invoice) => getInvoiceBalance(invoice) > 0)}
            events={data.events}
            currency={currency}
            returnPath={withQuery("/ease-events/budgets", {
              view: "payments",
              event: eventFilter === "all" ? undefined : eventFilter,
              payment: paymentFilter,
            })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function CalendarPage() {
  return <CalendarWorkspace />;
}

export function ReportsPage() {
  const { data } = useEaseEventsStore();
  const currency = data.organization.currency;
  const activeEvents = data.events.filter((event) => isActiveEventStatus(event.status));
  const completedEvents = data.events.filter((event) => event.status === "Completed");
  const globalFinance = getGlobalFinanceSummary(data);
  const totalRevenue = globalFinance.contractedRevenue;
  const totalActualCost = globalFinance.currentCostForecast;
  const totalProfit = globalFinance.forecastGrossProfit;
  const margin = totalRevenue ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;
  const openBalances =
    globalFinance.outstandingClientBalance + globalFinance.outstandingExpenseBalance;
  const overdueTasks = data.tasks.filter((task) => isOverdueTask(task));
  const pendingApprovals = data.approvals.filter((approval) => approval.status === "Pending");
  const needsReplyThreads = data.communicationThreads.filter(
    (thread) => thread.status === "Needs Reply",
  );
  const riskActions: ActionHubItem[] = [
    openBalances > 0
      ? {
          title: `${formatCurrency(openBalances, currency)} open balance`,
          description:
            "Cash collection and vendor reconciliation should be reviewed before month end.",
          href: withQuery("/ease-events/budgets", { payment: "open" }),
          icon: Wallet,
          status: "Balance Due",
          tone: "warn",
          actionLabel: "Open",
        }
      : null,
    overdueTasks.length
      ? {
          title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`,
          description: "Execution risk is concentrated in late task cards.",
          href: withQuery("/ease-events/tasks", { status: "open", due: "overdue" }),
          icon: AlertTriangle,
          status: "Overdue",
          tone: "danger",
          actionLabel: "Review",
        }
      : null,
    pendingApprovals.length
      ? {
          title: `${pendingApprovals.length} pending approval${
            pendingApprovals.length === 1 ? "" : "s"
          }`,
          description: "Client approval delays can block production, purchases, and staffing.",
          href: withQuery("/ease-events/clients", { approvals: "pending" }),
          icon: CheckCircle2,
          status: "Pending",
          tone: "warn",
          actionLabel: "Open clients",
        }
      : null,
    needsReplyThreads.length
      ? {
          title: `${needsReplyThreads.length} open communication thread${
            needsReplyThreads.length === 1 ? "" : "s"
          }`,
          description: "Email and meeting-note follow-up is waiting for the team.",
          href: withQuery("/ease-events/communications", { status: "Needs Reply" }),
          icon: MessageSquare,
          status: "Needs Reply",
          tone: "warn",
          actionLabel: "Reply",
        }
      : null,
  ].filter(Boolean) as ActionHubItem[];
  const eventFinancials = globalFinance.projectSummaries
    .map((summary) => {
      const event = data.events.find(
        (item) => item.id === summary.eventId || item.projectId === summary.projectId,
      );
      return { event, summary };
    })
    .filter((item): item is { event: EventRecord; summary: typeof item.summary } =>
      Boolean(item.event),
    )
    .sort((a, b) => b.summary.forecastGrossProfit - a.summary.forecastGrossProfit);
  const months = [
    { label: "May", prefix: "2026-05" },
    { label: "Jun", prefix: "2026-06" },
    { label: "Jul", prefix: "2026-07" },
    { label: "Aug", prefix: "2026-08" },
    { label: "Sep", prefix: "2026-09" },
    { label: "Oct", prefix: "2026-10" },
  ];
  const monthValues = months.map((month) => ({
    ...month,
    value: data.events
      .filter((event) => event.eventDate.startsWith(month.prefix))
      .reduce((sum, event) => sum + event.clientPrice, 0),
  }));
  const maxRevenue = Math.max(...monthValues.map((month) => month.value), 1);
  const busiestMonth = monthValues.reduce((best, month) =>
    month.value > best.value ? month : best,
  );
  const reportingWindowRevenue = monthValues.reduce((sum, month) => sum + month.value, 0);
  const openBalanceRatio = totalRevenue ? Math.round((openBalances / totalRevenue) * 1000) / 10 : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="Reports"
        description="Financial and operational reporting for owner review, team planning, and demo conversations."
      />

      <div className="mb-6">
        <FinanceReportPanel />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <MetricCard
          label="Contracted revenue"
          value={formatCurrency(totalRevenue, currency)}
          helper={`${activeEvents.length} active, ${completedEvents.length} completed`}
          icon={BadgeDollarSign}
          tone="good"
          href="/ease-events/events"
        />
        <MetricCard
          label="Forecast cost"
          value={formatCurrency(totalActualCost, currency)}
          helper="Budget forecast plus incurred expenses"
          icon={ReceiptText}
          href="/ease-events/budgets"
        />
        <MetricCard
          label="Forecast profit"
          value={formatCurrency(totalProfit, currency)}
          helper={`${margin}% portfolio margin`}
          icon={BarChart3}
          tone={margin >= 25 ? "good" : "warn"}
          href="/ease-events/budgets"
        />
        <MetricCard
          label="Open balances"
          value={formatCurrency(openBalances, currency)}
          helper="Client balances plus vendor balances"
          icon={Wallet}
          tone={openBalances > 0 ? "warn" : "good"}
          href={withQuery("/ease-events/budgets", { payment: "open" })}
        />
      </div>

      <div className="mt-6">
        <ActionHub
          title="Owner risk review"
          description="The few items most likely to affect cash, client confidence, or delivery quality."
          items={riskActions}
          emptyTitle="No reporting risks detected"
          emptyDescription="Balances, overdue work, approval queues, and reply queues are clear."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Revenue by month
            </CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              {formatCurrency(reportingWindowRevenue, currency)} scheduled in this window.{" "}
              {busiestMonth.label} is the highest revenue month.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthValues.map((month) => (
              <div key={month.prefix}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{month.label}</span>
                  <span className="text-slate-500">{formatCurrency(month.value, currency)}</span>
                </div>
                <Progress value={(month.value / maxRevenue) * 100} className="h-2 bg-slate-100" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Event profitability
            </CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Forecast margin is {margin}%. Open balances represent {openBalanceRatio}% of
              contracted revenue.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Contracted</TableHead>
                  <TableHead className="text-right">Forecast cost</TableHead>
                  <TableHead className="text-right">Forecast profit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventFinancials.map(({ event, summary }) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <a href={eventHref(event.id)} className="font-medium hover:underline">
                        {event.eventName}
                      </a>
                      <p className="text-xs text-slate-500">{getEventClientName(data, event)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.contractedRevenue, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.currentCostForecast, currency)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        summary.forecastGrossProfit >= 0 ? "text-emerald-700" : "text-rose-700",
                      )}
                    >
                      {formatCurrency(summary.forecastGrossProfit, currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={event.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function VendorsPage() {
  const { data } = useEaseEventsStore();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  return (
    <div>
      <PageHeader
        eyebrow="Vendor CRM"
        title="Vendors"
        description="Manage vendor categories, contact details, event assignments, amounts, payment status, and notes."
        actions={
          <Button onClick={() => setIsCreateOpen((current) => !current)}>
            <Plus className="h-4 w-4" />
            Add vendor
          </Button>
        }
      />
      {isCreateOpen ? <CreateVendorPanel /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.vendors.map((vendor) => {
          const assignments = data.eventVendors.filter(
            (assignment) => assignment.vendorId === vendor.id,
          );
          return (
            <a
              key={vendor.id}
              href={vendorHref(vendor.id)}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{vendor.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{vendor.contactName}</p>
                </div>
                <StatusBadge value={vendor.serviceCategory} />
              </div>
              <p className="mt-4 text-sm text-slate-600">{vendor.email}</p>
              <p className="mt-1 text-sm text-slate-600">{vendor.phone}</p>
              <p className="mt-4 text-xs text-slate-500">{assignments.length} event assignments</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function VendorDetailPage({ vendorId }: { vendorId: string }) {
  const { data } = useEaseEventsStore();
  const vendor = data.vendors.find((item) => item.id === vendorId);

  if (!vendor) {
    return (
      <EmptyState
        icon={Building2}
        title="Vendor not found"
        description="This vendor is not in the database."
      />
    );
  }

  const assignments = data.eventVendors.filter((assignment) => assignment.vendorId === vendor.id);

  return (
    <div>
      <PageHeader
        eyebrow="Vendor profile"
        title={vendor.name}
        description={`${vendor.serviceCategory} · ${vendor.contactName}`}
        actions={<StatusBadge value={`${vendor.rating}/5 rating`} />}
      />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Contact info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FieldValue label="Contact" value={vendor.contactName} />
            <FieldValue label="Email" value={vendor.email} />
            <FieldValue label="Phone" value={vendor.phone} />
            <FieldValue label="Website" value={vendor.website ?? "Not provided"} />
            <FieldValue
              label="Notes"
              value={<p className="leading-6 text-slate-600">{vendor.notes}</p>}
            />
          </CardContent>
        </Card>
        <VendorAssignmentTable assignments={assignments} />
      </div>
    </div>
  );
}

export function VendorPortalPage() {
  const { currentUser } = useEaseEventsAuth();
  const { data } = useEaseEventsStore();
  const vendor = getVendorForUser(data, currentUser);

  if (!vendor) {
    return (
      <EmptyState
        icon={Building2}
        title="Vendor profile not linked"
        description="This account is not matched to a vendor profile yet. Ask the planning team to connect your login to your vendor record."
      />
    );
  }

  const assignments = data.eventVendors.filter((assignment) => assignment.vendorId === vendor.id);
  const eventIds = new Set(assignments.map((assignment) => assignment.eventId));
  const events = data.events.filter((event) => eventIds.has(event.id));
  const files = data.files.filter((file) => eventIds.has(file.eventId));
  const openTasks = data.tasks.filter(
    (task) => eventIds.has(task.eventId) && task.status !== "Done",
  );
  const upcomingEvents = events.filter((event) => isUpcomingEvent(event));
  const openPayments = assignments.filter((assignment) => assignment.paymentStatus !== "Paid");
  const vendorActions: ActionHubItem[] = [
    upcomingEvents.length
      ? {
          title: `${upcomingEvents.length} upcoming event${upcomingEvents.length === 1 ? "" : "s"}`,
          description: "Review dates, locations, scope, and notes before production week.",
          href: "/ease-events/events",
          icon: CalendarDays,
          status: "Upcoming",
          tone: "warn",
          actionLabel: "Open",
        }
      : null,
    openTasks.length
      ? {
          title: `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}`,
          description: "Check current event tasks and mark progress as soon as your scope moves.",
          href: "/ease-events/tasks",
          icon: CheckSquare,
          status: "Open",
          tone: "default",
          actionLabel: "Open tasks",
        }
      : null,
    openPayments.length
      ? {
          title: `${openPayments.length} payment status item${
            openPayments.length === 1 ? "" : "s"
          }`,
          description:
            "Review quoted and actual amounts so the planning team can reconcile balances.",
          href: "/ease-events/events",
          icon: Wallet,
          status: "Payment",
          tone: "warn",
          actionLabel: "Review",
        }
      : null,
    files.length
      ? {
          title: `${files.length} shared file${files.length === 1 ? "" : "s"}`,
          description:
            "Contracts, quotes, inspiration, receipts, and event documents are available from Files.",
          href: "/ease-events/files",
          icon: FileText,
          status: "Files",
          tone: "good",
          actionLabel: "Open files",
        }
      : null,
  ].filter(Boolean) as ActionHubItem[];

  return (
    <div>
      <PageHeader
        eyebrow="Vendor portal"
        title={vendor.name}
        description={`${vendor.serviceCategory} · ${vendor.contactName}`}
        actions={<StatusBadge value={`${vendor.rating}/5 rating`} />}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <MetricCard
          label="Assigned events"
          value={`${events.length}`}
          helper="Visible to this vendor account"
          icon={CalendarDays}
          href="/ease-events/events"
        />
        <MetricCard
          label="Upcoming"
          value={`${upcomingEvents.length}`}
          helper="Next 45 days"
          icon={CalendarClock}
          href={withQuery("/ease-events/events", { status: "upcoming" })}
        />
        <MetricCard
          label="Open tasks"
          value={`${openTasks.length}`}
          helper="Across assigned events"
          icon={CheckSquare}
          tone={openTasks.length ? "warn" : "good"}
          href="/ease-events/tasks"
        />
        <MetricCard
          label="Payment items"
          value={`${openPayments.length}`}
          helper="Not fully paid"
          icon={Wallet}
          tone={openPayments.length ? "warn" : "good"}
        />
      </div>

      <div className="mt-6">
        <ActionHub
          title="Vendor focus"
          description="The fastest path to completing your scope for Coco Cabana events."
          items={vendorActions}
          emptyTitle="No vendor action needed"
          emptyDescription="There are no upcoming assignments, open tasks, payment items, or files needing attention."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <VendorAssignmentTable assignments={assignments} />
        <FilesTable files={files} />
      </div>
    </div>
  );
}

export function RetentionPage() {
  const { currentUser } = useEaseEventsAuth();
  const {
    data,
    createRebookingOpportunity,
    updateRebookingOpportunity,
    createClientMilestone,
    createClientReferralLink,
    createCommunicationEligibilityLog,
    convertRebookingOpportunity,
    createCommunicationThread,
    addCommunicationMessage,
  } = useEaseEventsStore();
  const [stageFilter, setStageFilter] = React.useState(() => readQueryParam("stage", "action"));
  const [selectedClientId, setSelectedClientId] = React.useState(data.clients[0]?.id ?? "");
  const [opportunityType, setOpportunityType] = React.useState("Repeat Event");
  const [opportunityTitle, setOpportunityTitle] = React.useState("");
  const [targetContactDate, setTargetContactDate] = React.useState("");
  const [milestoneTitle, setMilestoneTitle] = React.useState("");
  const [milestoneDate, setMilestoneDate] = React.useState("");
  const [milestoneType, setMilestoneType] = React.useState("Event Anniversary");
  const [notice, setNotice] = React.useState<string | null>(null);
  const { dueOpportunities, upcomingMilestones, referralsNeedingReview } =
    getRetentionActionItems(data);
  const openStages = new Set([
    "Identified",
    "Review Required",
    "Planned Follow-Up",
    "Ready to Contact",
    "Contacted",
    "Engaged",
    "Consultation Scheduled",
    "Qualified",
  ]);
  const opportunities = data.rebookingOpportunities
    .filter((opportunity) => {
      if (stageFilter === "all") return true;
      if (stageFilter === "action")
        return dueOpportunities.some((item) => item.id === opportunity.id);
      if (stageFilter === "converted") return opportunity.stage === "Converted";
      return opportunity.stage === stageFilter;
    })
    .sort(
      (left, right) =>
        new Date(left.nextActionAt ?? left.targetContactDate ?? left.createdAt).getTime() -
        new Date(right.nextActionAt ?? right.targetContactDate ?? right.createdAt).getTime(),
    );
  const relationshipRevenue = data.clients.reduce(
    (sum, client) => sum + getClientRelationshipMetrics(data, client.id).contractedRevenue,
    0,
  );

  async function handleCreateOpportunity(event: React.FormEvent) {
    event.preventDefault();
    const client = data.clients.find((item) => item.id === selectedClientId);
    if (!client) return;
    const eligibility = getCommunicationEligibility(data, client, "retention");
    const opportunity = await createRebookingOpportunity({
      clientId: client.id,
      assignedToId: currentUser?.id,
      opportunityType: opportunityType as RebookingOpportunity["opportunityType"],
      title: opportunityTitle || `${client.displayName} future event follow-up`,
      stage: eligibility.allowed ? "Ready to Contact" : "Review Required",
      targetContactDate,
      estimatedValue: 0,
      eventType: "Future event",
      preferredContactChannel: client.preferredContactChannel ?? "Email",
      consentStatusSnapshot: eligibility.consentStatus,
      nextAction: eligibility.allowed
        ? "Prepare a personal follow-up draft."
        : "Review consent and purpose before outreach.",
      nextActionAt: targetContactDate ? `${targetContactDate}T14:00:00Z` : new Date().toISOString(),
      aiSummary:
        "Draft prompt placeholder: summarize prior event preferences, closed-project lessons, consent basis, and a gentle future-event angle.",
      aiSummaryGeneratedAt: new Date().toISOString(),
      idempotencyKey: `manual:${client.id}:${opportunityTitle || targetContactDate || Date.now()}`,
      metadata: { created_from: "retention_workspace" },
      createdById: currentUser?.id,
    });
    await createCommunicationEligibilityLog(
      buildEligibilityLogInput({
        client,
        opportunity,
        result: eligibility,
        checkedById: currentUser?.id,
        idempotencyKey: `eligibility:${opportunity.id}:created`,
      }),
    );
    setOpportunityTitle("");
    setNotice(`Created retention opportunity for ${client.displayName}.`);
  }

  async function handleCreateMilestone(event: React.FormEvent) {
    event.preventDefault();
    const client = data.clients.find((item) => item.id === selectedClientId);
    if (!client || !milestoneDate) return;
    const parsed = new Date(`${milestoneDate}T00:00:00Z`);
    const milestone = await createClientMilestone({
      clientId: client.id,
      milestoneType: milestoneType as Parameters<typeof createClientMilestone>[0]["milestoneType"],
      title: milestoneTitle || `${client.displayName} milestone`,
      milestoneDate,
      month: parsed.getUTCMonth() + 1,
      day: parsed.getUTCDate(),
      recurrenceRule: "FREQ=YEARLY",
      reminderOffsetDays: 60,
      nextOccurrenceDate: milestoneDate,
      sensitivity: "Standard",
      source: "Planner confirmed",
      notes: "Created from the retention workspace.",
      idempotencyKey: `manual:${client.id}:${milestoneDate}:${milestoneTitle || "milestone"}`,
      createdById: currentUser?.id,
    });
    setMilestoneTitle("");
    setMilestoneDate("");
    setNotice(`Added ${milestone.title}.`);
  }

  async function handleDraftOutreach(opportunity: RebookingOpportunity) {
    const client = data.clients.find((item) => item.id === opportunity.clientId);
    if (!client) return;
    const eligibility = getCommunicationEligibility(data, client, "retention");
    await createCommunicationEligibilityLog(
      buildEligibilityLogInput({
        client,
        opportunity,
        result: eligibility,
        checkedById: currentUser?.id,
        idempotencyKey: `eligibility:${opportunity.id}:draft`,
      }),
    );
    if (opportunity.sourceProjectId) {
      const now = new Date().toISOString();
      const thread = await createCommunicationThread({
        projectId: opportunity.sourceProjectId,
        eventId: opportunity.sourceEventId ?? "",
        assignedToId: currentUser?.id,
        subject: `${opportunity.title} outreach draft`,
        clientName: client.displayName,
        participants: [client.email],
        channel: "Email",
        status: "Scheduled",
        integrationSource: "retention",
        preview: eligibility.explanation,
        unreadCount: 0,
        lastActivityAt: now,
      });
      await addCommunicationMessage({
        projectId: opportunity.sourceProjectId,
        threadId: thread.id,
        eventId: opportunity.sourceEventId ?? "",
        authorId: currentUser?.id,
        direction: "Internal",
        visibility: "Internal",
        sentAt: now,
        summary: "Retention outreach draft",
        body: [
          `Draft only. ${eligibility.allowed ? "Eligible for staff-reviewed sending." : "Do not send until reviewed."}`,
          "",
          `Client: ${client.displayName}`,
          `Opportunity: ${opportunity.title}`,
          `Eligibility: ${eligibility.explanation}`,
          "",
          "Suggested angle: thank them for the previous event, mention one specific remembered detail, and ask whether a future celebration or referral conversation would be helpful.",
        ].join("\n"),
      });
    }
    await updateRebookingOpportunity(opportunity.id, {
      ...opportunity,
      stage: eligibility.allowed ? "Ready to Contact" : "Review Required",
      nextAction: eligibility.allowed
        ? "Review and send outreach draft."
        : "Resolve consent review before outreach.",
      nextActionAt: new Date().toISOString(),
    });
    setNotice(
      eligibility.allowed
        ? "Created a staff-reviewed outreach draft."
        : "Logged eligibility review and kept outreach as internal draft only.",
    );
  }

  async function handleConvertOpportunity(opportunity: RebookingOpportunity) {
    const result = await convertRebookingOpportunity(opportunity.id, {
      ownerId: currentUser?.id,
      eventDate: opportunity.estimatedEventDate,
      eventType: opportunity.eventType,
      source: "Rebooking opportunity",
    });
    setNotice(`Converted to repeat-client inquiry: ${result.project.name}.`);
  }

  async function handleCreateReferralLink(client: ClientRecord) {
    const existing = data.clientReferralLinks.find(
      (link) => link.clientId === client.id && link.isActive,
    );
    if (existing) {
      setNotice(`${client.displayName} already has referral code ${existing.referralCode}.`);
      return;
    }
    const code = `${client.displayName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const link = await createClientReferralLink({
      clientId: client.id,
      referralCode: code,
      sourceCampaign: "Relationship workspace",
      isActive: true,
      createdById: currentUser?.id,
      metadata: { created_from: "retention_workspace" },
    });
    setNotice(`Created referral code ${link.referralCode} for ${client.displayName}.`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contacts"
        title="Retention"
        description="Relationship command center for rebooking, milestones, referrals, consent-safe outreach, and repeat business."
      />
      {notice ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Action due"
          value={dueOpportunities.length}
          description="Rebooking opportunities needing review or contact."
          icon={Clock}
        />
        <MetricCard
          title="Milestones"
          value={upcomingMilestones.length}
          description="Upcoming relationship dates inside 90 days."
          icon={CalendarDays}
        />
        <MetricCard
          title="Referrals"
          value={referralsNeedingReview.length}
          description="Introductions or referral rewards needing staff review."
          icon={UserPlus}
        />
        <MetricCard
          title="Relationship value"
          value={formatCurrency(relationshipRevenue, data.organization.currency)}
          description="Accepted proposal value with event-price fallback."
          icon={Wallet}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <div className="space-y-6">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Create opportunity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateOpportunity}>
                <div className="space-y-2">
                  <Label htmlFor="retention-client">Client</Label>
                  <select
                    id="retention-client"
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={selectedClientId}
                    onChange={(event) => setSelectedClientId(event.target.value)}
                  >
                    {data.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="opportunity-type">Type</Label>
                    <select
                      id="opportunity-type"
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={opportunityType}
                      onChange={(event) => setOpportunityType(event.target.value)}
                    >
                      {rebookingOpportunityTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-contact">Target contact date</Label>
                    <Input
                      id="target-contact"
                      type="date"
                      value={targetContactDate}
                      onChange={(event) => setTargetContactDate(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opportunity-title">Opportunity title</Label>
                  <Input
                    id="opportunity-title"
                    value={opportunityTitle}
                    onChange={(event) => setOpportunityTitle(event.target.value)}
                    placeholder="Annual gala follow-up"
                  />
                </div>
                <Button type="submit" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add opportunity
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Add milestone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateMilestone}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="milestone-type">Type</Label>
                    <select
                      id="milestone-type"
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={milestoneType}
                      onChange={(event) => setMilestoneType(event.target.value)}
                    >
                      {clientMilestoneTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="milestone-date">Date</Label>
                    <Input
                      id="milestone-date"
                      type="date"
                      value={milestoneDate}
                      onChange={(event) => setMilestoneDate(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="milestone-title">Milestone title</Label>
                  <Input
                    id="milestone-title"
                    value={milestoneTitle}
                    onChange={(event) => setMilestoneTitle(event.target.value)}
                    placeholder="Wedding anniversary"
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Save milestone
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="retention-stage-filter">Opportunity status</Label>
                <select
                  id="retention-stage-filter"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                >
                  <option value="action">Needs action</option>
                  <option value="all">All opportunities</option>
                  <option value="converted">Converted</option>
                  {rebookingOpportunityStages.map((stage) => (
                    <option key={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <FieldValue
                label="Safe outreach rule"
                value="Promotional outreach stays draft-only unless consent and org settings allow it."
              />
            </CardContent>
          </Card>

          {opportunities.length ? (
            opportunities.map((opportunity) => {
              const client = data.clients.find((item) => item.id === opportunity.clientId);
              const eligibility = getCommunicationEligibility(data, client, "retention");
              const sourceEvent = data.events.find(
                (event) => event.id === opportunity.sourceEventId,
              );
              return (
                <Card
                  key={opportunity.id}
                  className="rounded-lg border-slate-200 bg-white shadow-sm"
                >
                  <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="text-lg tracking-normal text-slate-950">
                        {opportunity.title}
                      </CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        {client ? (
                          <a
                            href={clientHref(client.id)}
                            className="font-medium text-slate-950 hover:underline"
                          >
                            {client.displayName}
                          </a>
                        ) : (
                          "Unknown client"
                        )}
                        {sourceEvent ? ` · from ${sourceEvent.eventName}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={opportunity.stage} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <FieldValue
                        label="Target contact"
                        value={
                          opportunity.targetContactDate
                            ? formatDate(opportunity.targetContactDate)
                            : "Review needed"
                        }
                      />
                      <FieldValue
                        label="Expected value"
                        value={formatCurrency(
                          opportunity.estimatedValue ?? 0,
                          data.organization.currency,
                        )}
                      />
                      <FieldValue
                        label="Eligibility"
                        value={
                          <span
                            className={eligibility.allowed ? "text-emerald-700" : "text-amber-700"}
                          >
                            {eligibility.consentStatus}
                          </span>
                        }
                      />
                    </div>
                    <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      {opportunity.description ?? opportunity.aiSummary ?? eligibility.explanation}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleDraftOutreach(opportunity)}
                      >
                        <Mail className="h-4 w-4" />
                        Draft outreach
                      </Button>
                      {openStages.has(opportunity.stage) ? (
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleConvertOpportunity(opportunity)}
                        >
                          <FolderOpen className="h-4 w-4" />
                          Convert to inquiry
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateRebookingOpportunity(opportunity.id, {
                            ...opportunity,
                            stage: "Snoozed",
                            snoozedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              .toISOString()
                              .slice(0, 10),
                            nextAction: "Revisit after snooze.",
                          })
                        }
                      >
                        Snooze
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon={Users}
              title="No retention actions in this view"
              description="Create an opportunity, add a milestone, or switch the filter to see completed relationship history."
            />
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Upcoming milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMilestones.length ? (
              upcomingMilestones.map((milestone) => {
                const client = data.clients.find((item) => item.id === milestone.clientId);
                return (
                  <div key={milestone.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{milestone.title}</p>
                      <StatusBadge value={milestone.milestoneType} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {client?.displayName ?? "Unknown client"} ·{" "}
                      {formatDate(milestone.nextOccurrenceDate ?? milestone.milestoneDate ?? "")}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No milestones are inside the current review window.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Referral readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.clients
              .filter(
                (client) => getClientRelationshipMetrics(data, client.id).closedEventCount > 0,
              )
              .slice(0, 5)
              .map((client) => {
                const link = data.clientReferralLinks.find(
                  (item) => item.clientId === client.id && item.isActive,
                );
                return (
                  <div key={client.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <a
                          href={clientHref(client.id)}
                          className="font-medium text-slate-950 hover:underline"
                        >
                          {client.displayName}
                        </a>
                        <p className="text-sm text-slate-500">
                          {link ? `Referral code ${link.referralCode}` : "No active referral code"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateReferralLink(client)}
                      >
                        {link ? "View code" : "Create code"}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const { data } = useEaseEventsStore();
  const [statusFilter, setStatusFilter] = React.useState(() => readQueryParam("status", "active"));
  const [approvalFilter, setApprovalFilter] = React.useState(() =>
    readQueryParam("approvals", "pending"),
  );
  const clients = getClientDirectoryRecords(data).filter((client) => {
    const statusMatches =
      statusFilter === "all" ||
      (statusFilter === "active" &&
        (client.status === "Active" ||
          client.events.some((event) => isActiveEventStatus(event.status)))) ||
      client.status === statusFilter;
    const approvalMatches =
      approvalFilter === "all" ||
      (approvalFilter === "pending" && client.pendingApprovals > 0) ||
      (approvalFilter === "clear" && client.pendingApprovals === 0);
    return statusMatches && approvalMatches;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Contacts"
        title="Clients"
        description="A reusable client history layer across inquiries, booked events, approvals, payments, and communication."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Client records" value={clients.length} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Open client approvals"
              value={clients.reduce((sum, client) => sum + client.pendingApprovals, 0)}
            />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Vendor directory"
              value={
                <a
                  href="/ease-events/vendors"
                  className="font-semibold text-slate-950 hover:underline"
                >
                  {data.vendors.length} vendors
                </a>
              }
            />
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-status-filter">Client status</Label>
            <select
              id="client-status-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="active">Needs active attention</option>
              <option value="all">All clients</option>
              {clientStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-approval-filter">Client approvals</Label>
            <select
              id="client-approval-filter"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={approvalFilter}
              onChange={(event) => setApprovalFilter(event.target.value)}
            >
              <option value="pending">Pending approvals</option>
              <option value="all">All approval states</option>
              <option value="clear">No pending approvals</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>History</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Pending approvals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const primaryLead = client.leads[0];
                const href = client.client
                  ? clientHref(client.client.id)
                  : primaryLead
                    ? leadHref(primaryLead.id)
                    : undefined;
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium text-slate-950">
                      {href ? (
                        <a href={href} className="hover:underline">
                          {client.name}
                        </a>
                      ) : (
                        client.name
                      )}
                      {client.source ? (
                        <p className="mt-1 text-xs text-slate-500">Source: {client.source}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.events.slice(0, 2).map((event) => (
                          <a
                            key={event.id}
                            className="block text-slate-950 hover:underline"
                            href={eventHref(event.id)}
                          >
                            {event.eventName}
                          </a>
                        ))}
                        {client.leads.length ? (
                          <p className="text-xs text-slate-500">
                            {client.leads.length} lead{client.leads.length === 1 ? "" : "s"} in
                            history
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>{client.email}</p>
                      <p className="text-xs text-slate-500">{client.phone}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={client.status} />
                    </TableCell>
                    <TableCell>
                      {client.client?.relationshipStatus ? (
                        <div className="space-y-1">
                          <StatusBadge value={client.client.relationshipStatus} />
                          {client.client.nextRelationshipAction ? (
                            <p className="max-w-[16rem] text-xs text-slate-500">
                              {client.client.nextRelationshipAction}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Not classified</span>
                      )}
                    </TableCell>
                    <TableCell>{client.pendingApprovals}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const { data } = useEaseEventsStore();
  const client = data.clients.find((item) => item.id === clientId);

  if (!client) {
    return (
      <EmptyState
        icon={Users}
        title="Client not found"
        description="This client record is not available in the workspace."
      />
    );
  }

  const events = data.events
    .filter(
      (event) =>
        event.clientId === client.id ||
        event.clientEmail.toLowerCase() === client.email.toLowerCase(),
    )
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  const leads = data.leads
    .filter(
      (lead) =>
        lead.clientId === client.id || lead.email.toLowerCase() === client.email.toLowerCase(),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const eventIds = new Set(events.map((event) => event.id));
  const approvals = data.approvals.filter((approval) => eventIds.has(approval.eventId));
  const budgetItems = data.budgetItems.filter((item) => eventIds.has(item.eventId));
  const files = data.files.filter((file) => eventIds.has(file.eventId));
  const meetings = data.meetings.filter((meeting) => eventIds.has(meeting.eventId));
  const threads = data.communicationThreads.filter((thread) => eventIds.has(thread.eventId));
  const displayName = client.displayName;
  const clientValue =
    client.lifetimeValue || events.reduce((sum, event) => sum + event.clientPrice, 0);
  const openApprovals = approvals.filter((approval) => approval.status === "Pending");
  const openBalance = budgetItems.reduce((sum, item) => sum + getBudgetItemBalance(item), 0);
  const relationshipMetrics = getClientRelationshipMetrics(data, client.id);
  const relationshipEligibility = getCommunicationEligibility(data, client, "retention");
  const clientOpportunities = data.rebookingOpportunities
    .filter((opportunity) => opportunity.clientId === client.id)
    .sort(
      (left, right) =>
        new Date(right.updatedAt ?? right.createdAt).getTime() -
        new Date(left.updatedAt ?? left.createdAt).getTime(),
    );
  const clientMilestones = data.clientMilestones
    .filter((milestone) => milestone.clientId === client.id)
    .sort(
      (left, right) =>
        new Date(left.nextOccurrenceDate ?? left.milestoneDate ?? "9999-12-31").getTime() -
        new Date(right.nextOccurrenceDate ?? right.milestoneDate ?? "9999-12-31").getTime(),
    );
  const referralLinks = data.clientReferralLinks.filter((link) => link.clientId === client.id);

  return (
    <div>
      <PageHeader
        eyebrow="Client profile"
        title={displayName}
        description={`${client.email}${client.phone ? ` · ${client.phone}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={client.status} />
            {client.relationshipStatus ? <StatusBadge value={client.relationshipStatus} /> : null}
          </div>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Lifetime value"
              value={formatCurrency(clientValue, data.organization.currency)}
            />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Events" value={events.length} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Open approvals" value={openApprovals.length} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Open balance"
              value={formatCurrency(openBalance, data.organization.currency)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Contracted history"
              value={formatCurrency(
                relationshipMetrics.contractedRevenue,
                data.organization.currency,
              )}
            />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Rebooking opportunities" value={clientOpportunities.length} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Next milestone"
              value={
                relationshipMetrics.nextMilestoneDate
                  ? formatDate(relationshipMetrics.nextMilestoneDate)
                  : "Not set"
              }
            />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue
              label="Outreach eligibility"
              value={
                <span
                  className={
                    relationshipEligibility.allowed ? "text-emerald-700" : "text-amber-700"
                  }
                >
                  {relationshipEligibility.consentStatus}
                </span>
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Client history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldValue label="Source" value={client.source ?? "Unknown"} />
            <FieldValue label="Company" value={client.companyName ?? "Not set"} />
            <FieldValue
              label="Last contacted"
              value={
                client.lastContactedAt ? formatDateTime(client.lastContactedAt) : "Not tracked"
              }
            />
            <FieldValue
              label="Preferred relationship channel"
              value={client.preferredContactChannel ?? "Not set"}
            />
            <FieldValue
              label="Future-event preference"
              value={client.futureEventCommunicationPreference ?? "Manual Review"}
            />
            <FieldValue
              label="Notes"
              value={
                <div className="space-y-2 leading-6 text-slate-600">
                  <p>{client.notes ?? "No client notes yet."}</p>
                  {client.relationshipNotes ? <p>{client.relationshipNotes}</p> : null}
                </div>
              }
            />
          </CardContent>
        </Card>

        <ActionHub
          title="Client focus"
          description="The work most likely to affect this client's confidence, payment status, or next decision."
          items={
            [
              openApprovals.length
                ? {
                    title: `${openApprovals.length} approval${openApprovals.length === 1 ? "" : "s"} waiting`,
                    description:
                      "Follow up on pending client decisions before production work stalls.",
                    href: withQuery("/ease-events/clients", { approvals: "pending" }),
                    icon: CheckCircle2,
                    status: "Pending",
                    tone: "warn",
                    actionLabel: "Review",
                  }
                : null,
              openBalance > 0
                ? {
                    title: `${formatCurrency(openBalance, data.organization.currency)} open balance`,
                    description: "Collect or reconcile the remaining client/vendor balance.",
                    href: withQuery("/ease-events/budgets", { client: client.id, payment: "open" }),
                    icon: Wallet,
                    status: "Balance Due",
                    tone: "warn",
                    actionLabel: "Open budget",
                  }
                : null,
              threads.length
                ? {
                    title: `${threads.length} communication thread${threads.length === 1 ? "" : "s"}`,
                    description:
                      "Review the latest client emails, calls, meeting recaps, and follow-ups.",
                    href: "/ease-events/communications",
                    icon: MessageSquare,
                    status: "Comms",
                    tone: "good",
                    actionLabel: "Open",
                  }
                : null,
              clientOpportunities.length
                ? {
                    title: `${clientOpportunities.length} rebooking opportunity${clientOpportunities.length === 1 ? "" : "s"}`,
                    description: relationshipEligibility.explanation,
                    href: withQuery("/ease-events/retention", { stage: "all" }),
                    icon: CalendarClock,
                    status: "Retention",
                    tone: relationshipEligibility.allowed ? "good" : "warn",
                    actionLabel: "Open retention",
                  }
                : null,
            ].filter(Boolean) as ActionHubItem[]
          }
          emptyTitle="No client action needed"
          emptyDescription="There are no pending approvals, open balances, or communication items for this client."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal text-slate-950">Rebooking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientOpportunities.length ? (
              clientOpportunities.map((opportunity) => (
                <a
                  key={opportunity.id}
                  href={withQuery("/ease-events/retention", { stage: opportunity.stage })}
                  className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{opportunity.title}</p>
                    <StatusBadge value={opportunity.stage} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {opportunity.targetContactDate
                      ? formatDate(opportunity.targetContactDate)
                      : "No contact date"}
                  </p>
                </a>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No repeat-event opportunity has been identified yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal text-slate-950">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientMilestones.length ? (
              clientMilestones.map((milestone) => (
                <div key={milestone.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-950">{milestone.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {milestone.milestoneType} ·{" "}
                    {formatDate(milestone.nextOccurrenceDate ?? milestone.milestoneDate)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No anniversaries or recurring dates are tracked yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal text-slate-950">
              Referral links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {referralLinks.length ? (
              referralLinks.map((link) => (
                <div key={link.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{link.referralCode}</p>
                    <StatusBadge value={link.isActive ? "Active" : "Inactive"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {link.sourceCampaign ?? "Relationship referral"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No referral link has been created for this client.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <a
                        href={eventHref(event.id)}
                        className="font-medium text-slate-950 hover:underline"
                      >
                        {event.eventName}
                      </a>
                    </TableCell>
                    <TableCell>{formatDate(event.eventDate)}</TableCell>
                    <TableCell>
                      <StatusBadge value={event.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(event.clientPrice, data.organization.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Pipeline history
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.length ? (
              leads.map((lead) => (
                <a
                  key={lead.id}
                  href={leadHref(lead.id)}
                  className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{lead.eventType}</p>
                    <StatusBadge value={lead.stage} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(lead.eventDate)} · {lead.budgetRange || "No budget range"}
                  </p>
                </a>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No lead history is linked to this client yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal text-slate-950">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldValue label="Shared files" value={files.length} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal text-slate-950">Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldValue label="Meeting records" value={meetings.length} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base tracking-normal text-slate-950">Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldValue label="All approvals" value={approvals.length} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ClientPortalPage() {
  const { currentUser } = useEaseEventsAuth();
  const { data, updateApprovalStatus, submitClientFeedback, upsertClientConsent } =
    useEaseEventsStore();
  const [feedbackRating, setFeedbackRating] = React.useState("5");
  const [feedbackComment, setFeedbackComment] = React.useState("");
  const paymentReturnState = getPaymentReturnState();
  const event =
    data.events.find(
      (item) => item.clientUserId === currentUser?.id || item.clientEmail === currentUser?.email,
    ) ?? data.events.find((item) => item.clientUserId);

  if (!event) {
    return (
      <EmptyState
        icon={Users}
        title="No client event"
        description="This client account does not have an assigned event yet."
      />
    );
  }

  const approvals = data.approvals.filter((approval) => approval.eventId === event.id);
  const projectId = getProjectIdForEvent(data, event);
  const proposal = getProjectProposal(data, projectId);
  const proposalVersion = getProposalVersion(data, proposal);
  const proposalLineItems = getProposalLineItems(data, proposalVersion).filter(
    (item) => item.clientVisible,
  );
  const proposalPaymentTerms = getProposalPaymentTerms(data, proposalVersion);
  const files = data.files.filter((file) => file.eventId === event.id);
  const finalDeliverables = data.finalDeliverables.filter(
    (deliverable) =>
      deliverable.eventId === event.id &&
      deliverable.clientVisible &&
      ["Ready", "Delivered", "Viewed", "Acknowledged"].includes(deliverable.status),
  );
  const client = getClientForEvent(data, event);
  const feedback = data.clientFeedbackResponses.find(
    (response) => response.eventId === event.id && response.clientId === client?.id,
  );
  const clientConsents = data.clientConsents.filter(
    (consent) =>
      consent.eventId === event.id ||
      consent.projectId === projectId ||
      consent.clientId === client?.id,
  );
  const clientMilestones = data.clientMilestones.filter(
    (milestone) => milestone.clientId === client?.id && milestone.isActive,
  );
  const clientReferralLink = data.clientReferralLinks.find(
    (link) => link.clientId === client?.id && link.isActive,
  );
  const budgetItems = data.budgetItems.filter((item) => item.eventId === event.id);
  const invoices = data.invoices.filter((invoice) => invoice.eventId === event.id);
  const pendingApprovals = approvals.filter((approval) => approval.status === "Pending");
  const upcomingMeetings = data.meetings.filter(
    (meeting) => meeting.eventId === event.id && isUpcomingMeeting(meeting),
  );
  const invoiceBalanceDue = invoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0);
  const budgetBalanceDue = budgetItems.reduce((sum, item) => sum + getBudgetItemBalance(item), 0);
  const balanceDue = invoices.length ? invoiceBalanceDue : budgetBalanceDue;
  const clientActions: ActionHubItem[] = [
    pendingApprovals.length
      ? {
          title: `${pendingApprovals.length} approval${
            pendingApprovals.length === 1 ? "" : "s"
          } waiting for you`,
          description:
            "Review the latest proposal, timeline, budget, or design approval so planning can continue.",
          href: "#approvals",
          icon: CheckCircle2,
          status: "Pending",
          tone: "warn",
          actionLabel: "Review",
        }
      : null,
    balanceDue > 0
      ? {
          title: `${formatCurrency(balanceDue, data.organization.currency)} balance due`,
          description: "Use checkout to keep your booking and vendor commitments moving.",
          href: "#payment",
          icon: CreditCard,
          status: "Balance Due",
          tone: "warn",
          actionLabel: "Pay",
        }
      : null,
    upcomingMeetings.length
      ? {
          title: `${upcomingMeetings.length} upcoming meeting${
            upcomingMeetings.length === 1 ? "" : "s"
          }`,
          description:
            "Your scheduled planning calls and design reviews are listed with links and recaps.",
          href: "#meetings",
          icon: CalendarClock,
          status: "Scheduled",
          tone: "good",
          actionLabel: "View",
        }
      : null,
    files.length
      ? {
          title: `${files.length} file${files.length === 1 ? "" : "s"} available`,
          description:
            "Contracts, documents, receipts, and inspiration files are organized for this event.",
          href: "#files",
          icon: FileText,
          status: "Files",
          tone: "default",
          actionLabel: "Open",
        }
      : null,
    finalDeliverables.length
      ? {
          title: `${finalDeliverables.length} final deliverable${
            finalDeliverables.length === 1 ? "" : "s"
          } available`,
          description: "Post-event files, galleries, or recap links are ready for you.",
          href: "#final-deliverables",
          icon: Download,
          status: "Delivered",
          tone: "good",
          actionLabel: "Open",
        }
      : null,
  ].filter(Boolean) as ActionHubItem[];

  function handleSubmitFeedback() {
    if (!projectId || feedback) return;
    const rating = Number(feedbackRating);
    submitClientFeedback({
      projectId,
      eventId: event.id,
      clientId: client?.id,
      submittedById: currentUser?.id,
      responderName: currentUser?.fullName ?? getEventClientName(data, event),
      responderEmail: currentUser?.email ?? event.clientEmail,
      overallSatisfaction: rating,
      communicationRating: rating,
      planningProcessRating: rating,
      executionRating: rating,
      valueRating: rating,
      likelihoodToRecommend: rating,
      whatWentWell: feedbackComment,
      additionalComments: feedbackComment,
      permissionToContact: true,
      concernLevel: rating <= 2 ? "High" : rating === 3 ? "Medium" : "None",
      serviceRecoveryStatus: rating <= 3 ? "Open" : "Not Required",
      metadata: { source: "client_portal" },
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Client portal"
        title={event.eventName}
        description="Client-facing event overview, timeline, approvals, invoices, files, and messages."
      />
      {paymentReturnState ? (
        <div
          className={cn(
            "mb-6 rounded-lg border px-4 py-3 text-sm",
            paymentReturnState === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          {paymentReturnState === "success"
            ? "Payment completed. A receipt will be sent by Stripe."
            : "Payment was cancelled. You can restart checkout anytime."}
        </div>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Event date" value={formatDate(event.eventDate)} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Location" value={event.location} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Guests" value={event.guestCount} />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <FieldValue label="Status" value={<StatusBadge value={event.status} />} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <ActionHub
          title="What needs your attention"
          description="A quick view of the client decisions and next steps that keep your event moving."
          items={clientActions}
          emptyTitle="No action needed from you"
          emptyDescription="The Coco Cabana team will update this portal when a decision, payment, or meeting needs your attention."
        />
      </div>

      {proposal && proposalVersion ? (
        <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-lg tracking-normal text-slate-950">Proposal</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {proposal.proposalNumber} · version {proposalVersion.versionNumber}
                </p>
              </div>
              <StatusBadge status={proposal.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FieldValue
                label="Total"
                value={formatCurrency(proposalVersion.totalAmount, data.organization.currency)}
              />
              <FieldValue
                label="Valid until"
                value={proposal.validUntil ? formatDate(proposal.validUntil) : "No expiration"}
              />
              <FieldValue
                label="Next payment"
                value={
                  proposalPaymentTerms[0]
                    ? `${proposalPaymentTerms[0].label}: ${formatCurrency(
                        proposalPaymentTerms[0].calculatedAmount,
                        data.organization.currency,
                      )}`
                    : "No payment terms"
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {proposalLineItems.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-500">
                        {item.isOptional ? "Optional" : "Included"}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-950">
                      {formatCurrency(item.totalAmount, data.organization.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-slate-600">{event.timelineNotes}</p>
          </CardContent>
        </Card>
        <div id="payment">
          {invoices.length ? (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-normal text-slate-950">
                <ReceiptText className="h-4 w-4" />
                Invoices
              </h2>
              <InvoicesTable
                invoices={invoices}
                events={[event]}
                currency={data.organization.currency}
                showEvent={false}
                returnPath="/ease-events/client-portal"
                allowManage={false}
              />
            </div>
          ) : (
            <PaymentCollectionPanel
              event={event}
              clientName={getEventClientName(data, event)}
              currency={data.organization.currency}
              returnPath="/ease-events/client-portal"
              compact
            />
          )}
        </div>
      </div>

      <div className="mt-6">
        <ClientBudgetPanel
          event={event}
          items={budgetItems}
          vendors={data.vendors}
          currency={data.organization.currency}
        />
      </div>

      <div id="meetings" className="mt-6 scroll-mt-24">
        <ClientMeetingsPanel eventId={event.id} />
      </div>

      <div id="final-deliverables" className="mt-6 scroll-mt-24">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Final deliverables
            </CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Post-event files and links selected by your planning team. Internal planning notes,
              vendor records, and cost details are not shown here.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {finalDeliverables.length ? (
              finalDeliverables.map((deliverable) => (
                <div key={deliverable.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{deliverable.title}</p>
                      <p className="text-sm text-slate-500">{deliverable.category}</p>
                    </div>
                    <StatusBadge value={deliverable.status} />
                  </div>
                  {deliverable.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {deliverable.description}
                    </p>
                  ) : null}
                  {deliverable.externalUrl ? (
                    <Button className="mt-3" variant="outline" asChild>
                      <a href={deliverable.externalUrl}>
                        <Download className="h-4 w-4" />
                        Open deliverable
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Final deliverables will appear here when the Coco Cabana team marks them ready.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Share feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Thank you. Your feedback was submitted privately to the Coco Cabana team.
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="feedbackRating">Overall experience</Label>
                  <select
                    id="feedbackRating"
                    value={feedbackRating}
                    onChange={(event) => setFeedbackRating(event.target.value)}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} out of 5
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feedbackComment">Comments</Label>
                  <Textarea
                    id="feedbackComment"
                    value={feedbackComment}
                    onChange={(event) => setFeedbackComment(event.target.value)}
                    rows={4}
                    placeholder="What went well? What could we improve?"
                  />
                </div>
                <Button onClick={handleSubmitFeedback}>Submit feedback</Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Consent preferences
            </CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Feedback, reviews, testimonials, media permission, and marketing consent are separate.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              <p>
                Future-event communication preference:{" "}
                <span className="font-medium text-slate-950">
                  {client?.futureEventCommunicationPreference ?? "Manual Review"}
                </span>
                .
              </p>
              {clientMilestones.length ? (
                <p className="mt-1">
                  {clientMilestones.length} anniversary or milestone date
                  {clientMilestones.length === 1 ? "" : "s"} are on file for future planning
                  reminders.
                </p>
              ) : null}
              {clientReferralLink ? (
                <p className="mt-1">Referral code on file: {clientReferralLink.referralCode}</p>
              ) : null}
            </div>
            {(["Testimonial", "Photo/Video Portfolio", "Marketing Communication"] as const).map(
              (consentType) => {
                const consent = clientConsents.find((item) => item.consentType === consentType);
                return (
                  <div
                    key={consentType}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-950">{consentType}</p>
                      <p className="text-xs text-slate-500">{consent?.status ?? "Not Requested"}</p>
                    </div>
                    {projectId ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            upsertClientConsent({
                              projectId,
                              eventId: event.id,
                              clientId: client?.id,
                              consentType,
                              status: "Granted",
                              grantedAt: new Date().toISOString(),
                              source: "Client portal",
                              capturedById: currentUser?.id,
                            })
                          }
                        >
                          Grant
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            upsertClientConsent({
                              projectId,
                              eventId: event.id,
                              clientId: client?.id,
                              consentType,
                              status: "Revoked",
                              revokedAt: new Date().toISOString(),
                              source: "Client portal",
                              capturedById: currentUser?.id,
                            })
                          }
                        >
                          Revoke
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              },
            )}
          </CardContent>
        </Card>
      </div>

      <div id="approvals" className="mt-6 scroll-mt-24">
        <h2 className="mb-4 text-xl font-semibold tracking-normal text-slate-950">
          Pending approvals
        </h2>
        <ApprovalsGrid approvals={approvals} onStatusChange={updateApprovalStatus} />
      </div>

      <div id="files" className="mt-6 grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_0.8fr]">
        <FilesTable files={files} />
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg tracking-normal text-slate-950">
              <MessageSquare className="h-4 w-4" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              TODO: Add secure client messaging, email notifications, and upload notifications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type ProposalReviewPayload = {
  token: string;
  organization: { name: string; logoUrl?: string; currency: string };
  project: {
    id: string;
    name: string;
    eventType: string;
    eventDate: string;
    clientName: string;
    clientEmail: string;
  };
  proposal: {
    id: string;
    proposalNumber: string;
    title: string;
    status: string;
    validUntil?: string;
    currentVersionId: string;
    currentVersionNumber: number;
    sentAt?: string;
    viewedAt?: string;
    acceptedAt?: string;
  };
  version: {
    id: string;
    versionNumber: number;
    introduction?: string;
    scope?: string;
    terms?: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    documentHash?: string;
  };
  lineItems: Array<{
    id: string;
    category?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxRate?: number;
    totalAmount: number;
    isOptional: boolean;
    isSelected: boolean;
    sortOrder: number;
  }>;
  paymentTerms: Array<{
    id: string;
    label: string;
    paymentType: string;
    amountType: string;
    amountValue: number;
    calculatedAmount: number;
    dueRule: string;
    dueDate?: string;
    requiredForBooking: boolean;
  }>;
  responses: Array<{
    id: string;
    responseType: string;
    comment?: string;
    responderName?: string;
    responderEmail?: string;
    respondedAt: string;
  }>;
};

async function readApiJson<T>(response: Response): Promise<T & { error?: string }> {
  const text = await response.text();
  if (!text) return {} as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text } as T & { error?: string };
  }
}

export function ProposalReviewPage({ token }: { token: string }) {
  const [payload, setPayload] = React.useState<ProposalReviewPayload | null>(null);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [responseType, setResponseType] = React.useState<
    "Accepted" | "Changes Requested" | "Declined"
  >("Accepted");
  const [comment, setComment] = React.useState("");
  const [responderName, setResponderName] = React.useState("");
  const [responderEmail, setResponderEmail] = React.useState("");
  const [selectedOptionalIds, setSelectedOptionalIds] = React.useState<string[]>([]);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;
    async function loadProposal() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/ease-events/proposals/review/${encodeURIComponent(token)}`,
        );
        const result = await readApiJson<ProposalReviewPayload>(response);
        if (!response.ok) throw new Error(result.error ?? "Unable to load proposal.");
        if (!isMounted) return;
        setPayload(result);
        setResponderName(result.project.clientName);
        setResponderEmail(result.project.clientEmail);
        setSelectedOptionalIds(
          result.lineItems
            .filter((item) => item.isOptional && item.isSelected)
            .map((item) => item.id),
        );
      } catch (loadError) {
        if (isMounted)
          setError(loadError instanceof Error ? loadError.message : "Unable to load proposal.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void loadProposal();
    return () => {
      isMounted = false;
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <EmptyState
            icon={AlertTriangle}
            title="Proposal unavailable"
            description={error || "This proposal link could not be loaded."}
          />
        </div>
      </div>
    );
  }

  const currency = payload.organization.currency;
  const requiredItems = payload.lineItems.filter((item) => !item.isOptional);
  const optionalItems = payload.lineItems.filter((item) => item.isOptional);
  const selectedOptionalTotal = optionalItems
    .filter((item) => selectedOptionalIds.includes(item.id))
    .reduce((sum, item) => sum + item.totalAmount, 0);
  const requiredTotal = requiredItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const selectedTotal = requiredTotal + selectedOptionalTotal;
  const deposit = payload.paymentTerms.find((term) => term.paymentType === "Deposit");
  const depositDue =
    deposit?.amountType === "Percent"
      ? Math.round(selectedTotal * (deposit.amountValue / 100) * 100) / 100
      : (deposit?.calculatedAmount ?? 0);
  const hasAccepted = payload.proposal.status === "Accepted" || confirmation.includes("accepted");

  async function submitResponse() {
    if (!payload) return;
    setIsSubmitting(true);
    setError("");
    setConfirmation("");
    try {
      if (responseType === "Accepted" && !acceptedTerms) {
        throw new Error("Please accept the proposal terms before continuing.");
      }
      const response = await fetch(
        `/api/ease-events/proposals/review/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responseType,
            responderName,
            responderEmail,
            comment,
            selectedLineItemIds: [...requiredItems.map((item) => item.id), ...selectedOptionalIds],
            acceptanceStatement:
              responseType === "Accepted"
                ? "I accept this proposal, selected options, payment schedule, and terms."
                : "",
            idempotencyKey:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `client-response-${crypto.randomUUID()}`
                : `client-response-${Date.now()}`,
          }),
        },
      );
      const result = await readApiJson<{ proposal?: ProposalReviewPayload }>(response);
      if (!response.ok) throw new Error(result.error ?? "Unable to submit response.");
      if (result.proposal) setPayload(result.proposal);
      setConfirmation(
        responseType === "Accepted"
          ? "Proposal accepted. The team will confirm the deposit or next booking step."
          : responseType === "Changes Requested"
            ? "Change request sent. The planner will revise the proposal."
            : "Proposal declined. The planner has been notified.",
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <main className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {payload.organization.name}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
                {payload.proposal.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {payload.project.name} · version {payload.proposal.currentVersionNumber}
              </p>
            </div>
            <div className="rounded-lg bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Proposal total</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(selectedTotal, currency)}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {deposit
                  ? `${formatCurrency(depositDue, currency)} due to book`
                  : "Payment terms below"}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FieldValue label="Client" value={payload.project.clientName} />
            <FieldValue label="Event date" value={formatDate(payload.project.eventDate)} />
            <FieldValue
              label="Valid until"
              value={
                payload.proposal.validUntil
                  ? formatDate(payload.proposal.validUntil)
                  : "No expiration"
              }
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.8fr]">
          <div className="space-y-6">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm leading-6 text-slate-600">
                {payload.version.introduction ? <p>{payload.version.introduction}</p> : null}
                {payload.version.scope ? <p>{payload.version.scope}</p> : null}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Included services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requiredItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                        ) : null}
                      </div>
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(item.totalAmount, currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {optionalItems.length ? (
              <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Optional add-ons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {optionalItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4"
                    >
                      <Checkbox
                        checked={selectedOptionalIds.includes(item.id)}
                        onCheckedChange={(checked) =>
                          setSelectedOptionalIds((current) =>
                            checked
                              ? [...new Set([...current, item.id])]
                              : current.filter((id) => id !== item.id),
                          )
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-950">{item.name}</p>
                            {item.description ? (
                              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                            ) : null}
                          </div>
                          <p className="font-semibold text-slate-950">
                            {formatCurrency(item.totalAmount, currency)}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {payload.version.terms || "No additional terms were added."}
                </p>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Payment schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payload.paymentTerms.map((term) => (
                  <div key={term.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{term.label}</p>
                        <p className="text-sm text-slate-500">{term.paymentType}</p>
                      </div>
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(
                          term.paymentType === "Deposit" ? depositDue : term.calculatedAmount,
                          currency,
                        )}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {term.dueDate ? `Due ${formatDate(term.dueDate)}` : term.dueRule}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Respond</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasAccepted ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    This proposal has been accepted. The planning team will guide the next step.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Accepted", "Changes Requested", "Declined"] as const).map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={responseType === type ? "default" : "outline"}
                          onClick={() => setResponseType(type)}
                        >
                          {type === "Accepted"
                            ? "Accept"
                            : type === "Declined"
                              ? "Decline"
                              : "Request"}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposal-responder-name">Name</Label>
                      <Input
                        id="proposal-responder-name"
                        value={responderName}
                        onChange={(event) => setResponderName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposal-responder-email">Email</Label>
                      <Input
                        id="proposal-responder-email"
                        type="email"
                        value={responderEmail}
                        onChange={(event) => setResponderEmail(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposal-response-comment">Comment</Label>
                      <Textarea
                        id="proposal-response-comment"
                        value={comment}
                        rows={4}
                        onChange={(event) => setComment(event.target.value)}
                      />
                    </div>
                    {responseType === "Accepted" ? (
                      <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                        <Checkbox
                          checked={acceptedTerms}
                          onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
                        />
                        <span>
                          I accept this proposal, selected options, payment schedule, and terms.
                        </span>
                      </label>
                    ) : null}
                    <Button
                      className="w-full"
                      onClick={() => void submitResponse()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit response"}
                    </Button>
                  </>
                )}
                {confirmation ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {confirmation}
                  </p>
                ) : null}
                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </div>
  );
}

export function FilesPage() {
  const { data } = useEaseEventsStore();
  const { currentUser } = useEaseEventsAuth();
  const files =
    currentUser?.role === "client"
      ? data.files.filter((file) =>
          data.events.some(
            (event) =>
              event.id === file.eventId &&
              (event.clientUserId === currentUser.id || event.clientEmail === currentUser.email),
          ),
        )
      : currentUser?.role === "vendor"
        ? data.files.filter((file) =>
            getVisibleEvents(data, currentUser).some((event) => event.id === file.eventId),
          )
        : data.files;

  return (
    <div>
      <PageHeader
        eyebrow="Supabase Storage"
        title="Files"
        description="Upload and organize contracts, inspiration images, receipts, vendor quotes, and event documents."
      />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {currentUser?.role !== "client" ? <FileUploadPanel /> : null}
        <FilesTable files={files} />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { data, resetDemoData, updateOrganizationEmailIdentity, updateWorkflowAutomation } =
    useEaseEventsStore();
  const { currentUser } = useEaseEventsAuth();
  const [emailSenderName, setEmailSenderName] = React.useState(
    data.organization.emailSenderName ?? "Ugo @ EaseOps",
  );
  const [emailSignature, setEmailSignature] = React.useState(
    data.organization.emailSignature ??
      "Best,\nUgo @ EaseOps\nFounder & Chief Consultant\n[EaseOps](https://easeops.ca/)",
  );
  const [emailIdentityStatus, setEmailIdentityStatus] = React.useState("");
  const [isSavingEmailIdentity, setIsSavingEmailIdentity] = React.useState(false);
  const googleAccounts = data.connectedAccounts.filter((account) => account.provider === "google");
  const microsoftAccounts = data.connectedAccounts.filter(
    (account) => account.provider === "microsoft",
  );
  const bookingSettings = getProjectBookingSettings(data, data.organization.id);
  const financeSettings =
    data.financeSettings.find((settings) => settings.organizationId === data.organization.id) ??
    data.financeSettings[0];
  const automationStats = {
    active: data.workflowAutomations.filter((automation) => automation.status === "Active").length,
    awaitingApproval: data.workflowExecutions.filter(
      (execution) => execution.status === "Awaiting Approval",
    ).length,
    failedRuns:
      data.workflowExecutions.filter((execution) => execution.status === "Failed").length +
      data.workflowActionRuns.filter((run) => run.status === "Failed").length,
    unreadNotifications: data.notifications.filter(
      (notification) => notification.status === "Unread",
    ).length,
  };
  const integrations = [
    {
      name: "Supabase Auth, Database, Storage",
      status: hasSupabaseConfig() ? "Connected" : "Not connected",
      description: "Email/password auth, multi-tenant tables, RLS, and event-files bucket.",
    },
    {
      name: "Stripe Checkout",
      status: hasStripeConfig() ? "Client key set" : "Needs live keys",
      description:
        "Checkout UI and routing are implemented. Add STRIPE_SECRET_KEY server-side to create live payment sessions.",
    },
    {
      name: "OpenAI architecture",
      status: hasOpenAIConfig() ? "Ready" : "Placeholder",
      description: "AI cards are stubbed until a server route and OPENAI_API_KEY are present.",
    },
    {
      name: "Google Workspace sync",
      status: googleAccounts.length
        ? `${googleAccounts.length} connected`
        : hasGoogleWorkspaceConfig()
          ? "Ready to connect"
          : "Needs OAuth setup",
      description:
        "Prepare Gmail and Calendar sync for inquiry follow-up, meeting scheduling, and timeline visibility.",
    },
    {
      name: "Google Meet scheduling",
      status: hasGoogleMeetConfig() ? "Meet-ready" : "Using manual links",
      description:
        "The communications workspace supports Meet links today and can be upgraded to auto-create meetings once OAuth is configured.",
    },
    {
      name: "Microsoft 365 sync",
      status: microsoftAccounts.length
        ? `${microsoftAccounts.length} connected`
        : hasMicrosoft365Config()
          ? "Ready to connect"
          : "Needs OAuth setup",
      description:
        "Connect Outlook and Microsoft Calendar to sync inbox activity, external meetings, and Teams-capable event scheduling.",
    },
  ];

  React.useEffect(() => {
    setEmailSenderName(data.organization.emailSenderName ?? "Ugo @ EaseOps");
    setEmailSignature(
      data.organization.emailSignature ??
        "Best,\nUgo @ EaseOps\nFounder & Chief Consultant\n[EaseOps](https://easeops.ca/)",
    );
  }, [data.organization.emailSenderName, data.organization.emailSignature]);

  async function handleEmailIdentitySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailIdentityStatus("");
    setIsSavingEmailIdentity(true);
    try {
      await updateOrganizationEmailIdentity({ emailSenderName, emailSignature });
      setEmailIdentityStatus("Email identity saved.");
    } catch (error) {
      setEmailIdentityStatus(
        error instanceof Error ? error.message : "Unable to save email identity.",
      );
    } finally {
      setIsSavingEmailIdentity(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Organization, roles, integrations, and next-phase implementation notes."
      />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FieldValue label="Name" value={data.organization.name} />
            <FieldValue label="Slug" value={data.organization.slug} />
            <FieldValue label="Timezone" value={data.organization.timezone} />
            <FieldValue label="Currency" value={data.organization.currency} />
            <FieldValue
              label="Current role"
              value={<StatusBadge value={currentUser?.role ?? "guest"} />}
            />
            <Button variant="outline" onClick={resetDemoData}>
              <RotateCcw className="h-4 w-4" />
              Reset demo data
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">Roles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-slate-950">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <StatusBadge value={user.role} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Client email identity
          </CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Controls the display name and signature for client-facing emails sent from connected
            Gmail or Microsoft mailboxes. Simple Markdown links are converted to plain-text links
            for email delivery.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]"
            onSubmit={handleEmailIdentitySubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="organization-email-sender-name">Sender display name</Label>
              <Input
                id="organization-email-sender-name"
                value={emailSenderName}
                onChange={(event) => setEmailSenderName(event.target.value)}
                disabled={currentUser?.role !== "admin" || isSavingEmailIdentity}
                placeholder="Ugo @ EaseOps"
              />
              <Label htmlFor="organization-email-signature">Signature</Label>
              <Textarea
                id="organization-email-signature"
                className="min-h-36"
                value={emailSignature}
                onChange={(event) => setEmailSignature(event.target.value)}
                disabled={currentUser?.role !== "admin" || isSavingEmailIdentity}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={currentUser?.role !== "admin" || isSavingEmailIdentity}
                >
                  {isSavingEmailIdentity ? "Saving..." : "Save email identity"}
                </Button>
                {currentUser?.role !== "admin" ? (
                  <p className="text-sm text-slate-500">
                    Only admins can edit this email identity.
                  </p>
                ) : null}
                {emailIdentityStatus ? (
                  <p className="text-sm text-slate-600">{emailIdentityStatus}</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Preview
              </p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                <span className="font-medium text-slate-950">
                  {emailSenderName || "Sender name"}
                </span>{" "}
                &lt;connected mailbox&gt;
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                {emailSignature || "No signature configured."}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {integrations.map((integration) => (
          <Card key={integration.name} className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base tracking-normal text-slate-950">
                {integration.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge value={integration.status} />
              <p className="mt-3 text-sm leading-6 text-slate-600">{integration.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Booking requirements
          </CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            These settings control when an accepted proposal can become a booked event.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {[
            { label: "Proposal accepted", enabled: bookingSettings.requireProposalAcceptance },
            { label: "Terms accepted", enabled: bookingSettings.requireTermsAcceptance },
            {
              label: "Deposit invoice issued",
              enabled: bookingSettings.requireDepositInvoiceIssued,
            },
            { label: "Deposit paid", enabled: bookingSettings.requireDepositPaid },
            { label: "Planner approval", enabled: bookingSettings.requireManualPlannerApproval },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-950">{item.label}</p>
              <StatusBadge value={item.enabled ? "Required" : "Optional"} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Financial settings
          </CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Operating defaults for expense approvals, receipt requirements, margin alerts, and
            reporting. This is not tax or accounting advice.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <FieldValue
            label="Default currency"
            value={financeSettings?.defaultCurrency ?? data.organization.currency}
          />
          <FieldValue
            label="Fiscal year starts"
            value={`Month ${financeSettings?.fiscalYearStartMonth ?? 1}`}
          />
          <FieldValue
            label="Approval requirement"
            value={
              financeSettings?.requireExpenseApproval
                ? "Expenses require approval"
                : "Approval optional"
            }
          />
          <FieldValue
            label="Margin target"
            value={`${financeSettings?.defaultMarginTargetPercent ?? 30}%`}
          />
          <FieldValue
            label="Receipt threshold"
            value={formatCurrency(
              financeSettings?.receiptRequiredThreshold ?? 250,
              financeSettings?.defaultCurrency ?? data.organization.currency,
            )}
          />
          <FieldValue
            label="Payment methods"
            value={(
              financeSettings?.enabledPaymentMethods ?? ["Card", "Bank Transfer", "Cash"]
            ).join(", ")}
          />
          <FieldValue
            label="Client visibility"
            value={financeSettings?.clientFinancialVisibility ?? "Invoices Only"}
          />
          <FieldValue
            label="Report date basis"
            value={financeSettings?.defaultReportDateBasis ?? "Accrual"}
          />
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">Email templates</CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Organization-scoped templates used for inquiry acknowledgments, proposal follow-up,
            booking confirmations, and payment reminders.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            Supported merge variables:{" "}
            <span className="font-medium text-slate-950">
              {
                "{{client_name}}, {{event_type}}, {{event_date}}, {{planner_name}}, {{organization_name}}, {{consultation_link}}"
              }
            </span>
          </div>
          {data.emailTemplates.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.emailTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium text-slate-950">{template.name}</TableCell>
                    <TableCell>
                      <StatusBadge value={template.templateType.replace(/_/g, " ")} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={template.isActive ? "Active" : "Inactive"} />
                        {template.isDefault ? <StatusBadge value="Default" /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate text-sm text-slate-600">{template.subject}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Mail}
              title="No email templates"
              description="Apply the Phase 2 migration to seed the default inquiry acknowledgment template."
            />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Lifecycle automations
          </CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Durable, idempotent rules for reminders, notifications, notes, and safe follow-up
            drafts. Presets are inactive until your team enables them.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <FieldValue label="Active rules" value={automationStats.active} />
            <FieldValue label="Approval queue" value={automationStats.awaitingApproval} />
            <FieldValue label="Failed runs" value={automationStats.failedRuns} />
            <FieldValue label="Unread notices" value={automationStats.unreadNotifications} />
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Automations never record payments, accept proposals, approve client work, or change
            booking status. Sensitive follow-up actions can be kept as drafts or approval-required
            runs.
          </div>
          {data.workflowAutomations.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.workflowAutomations.map((automation) => {
                const actions = data.workflowAutomationActions
                  .filter((action) => action.automationId === automation.id)
                  .sort((left, right) => left.sortOrder - right.sortOrder);
                const recentExecutions = data.workflowExecutions
                  .filter((execution) => execution.automationId === automation.id)
                  .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                  .slice(0, 3);

                return (
                  <div
                    key={automation.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-950">
                            {automation.name}
                          </p>
                          <StatusBadge value={automation.status} />
                          <StatusBadge value={getWorkflowTriggerLabel(automation.triggerType)} />
                        </div>
                        {automation.description ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {automation.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={automation.status === "Active" ? "default" : "outline"}
                          onClick={() =>
                            updateWorkflowAutomation(automation.id, {
                              status: automation.status === "Active" ? "Paused" : "Active",
                            })
                          }
                        >
                          {automation.status === "Active" ? "Pause" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateWorkflowAutomation(automation.id, { status: "Inactive" })
                          }
                        >
                          Disable
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Actions
                        </p>
                        <div className="mt-2 space-y-2">
                          {actions.length ? (
                            actions.map((action) => (
                              <div
                                key={action.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-950">
                                    {action.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {action.actionType.replace(/_/g, " ")}
                                  </p>
                                </div>
                                {action.requiresApproval ? <StatusBadge value="Approval" /> : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No actions configured.</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Recent runs
                        </p>
                        <div className="mt-2 space-y-2">
                          {recentExecutions.length ? (
                            recentExecutions.map((execution) => (
                              <div
                                key={execution.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <p className="truncate text-sm text-slate-600">
                                  {new Date(execution.scheduledFor).toLocaleString()}
                                </p>
                                <StatusBadge value={execution.status} />
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No executions yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No automation presets"
              description="Apply the Phase 7 migration to seed lifecycle automation presets."
            />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Reusable templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <FieldValue label="Event templates" value={data.eventTemplates.length} />
            <FieldValue label="Task templates" value={data.taskTemplates.length} />
            <FieldValue label="Budget templates" value={data.budgetTemplates.length} />
            <FieldValue label="Approval templates" value={data.approvalTemplates.length} />
            <FieldValue label="Vendor templates" value={data.vendorTemplates.length} />
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Templates now have a Supabase-backed data model. Next step is applying an event template
            during lead conversion so tasks, budget lines, approvals, vendors, and run-of-show rows
            are created automatically.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">Next phase TODO</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <li>Wire all CRUD screens to Supabase queries and mutations.</li>
            <li>Add server-side route guards and invitation flow for clients/vendors.</li>
            <li>
              Add Stripe webhook reconciliation to mark client payments received automatically.
            </li>
            <li>Implement threaded messages with email notifications.</li>
            <li>Add audit logs for budget and approval history.</li>
            <li>Replace AI placeholders with reviewed server-side OpenAI calls.</li>
            <li>Add reporting exports for profitability, lead source, and vendor performance.</li>
            <li>Add production tests for RLS policies, auth roles, and lead conversion.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
