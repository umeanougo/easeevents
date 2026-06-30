import { getEffectiveMeetingStatus } from "./calculations";
import type {
  CalendarEntry,
  CalendarEntryCategory,
  CalendarEntrySourceType,
  CalendarEntryVisibility,
  EaseEventsData,
  SchedulingPreference,
} from "./types";

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export interface CalendarFilters {
  query?: string;
  ownerIds?: string[];
  projectIds?: string[];
  clientIds?: string[];
  eventIds?: string[];
  categories?: CalendarEntryCategory[];
  statuses?: string[];
  visibility?: CalendarEntryVisibility[];
  providers?: Array<"easeevents" | "google" | "microsoft">;
  syncStates?: Array<"synced" | "unsynced" | "failed">;
}

export interface CalendarConflictView {
  id: string;
  severity: "Hard Conflict" | "Warning" | "Info";
  title: string;
  description: string;
  entryIds: string[];
  ownerId?: string;
}

export interface CalendarProjection {
  entries: CalendarEntry[];
  conflicts: CalendarConflictView[];
}

function isoFromDateAndTime(date: string, time = "09:00") {
  return `${date}T${time.slice(0, 5)}:00`;
}

function addMinutes(iso: string, minutes: number) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function toAllDayEnd(date: string) {
  return `${date}T23:59:59`;
}

function normalizeText(value: string | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function includesDateRange(entry: CalendarEntry, startAt?: Date, endAt?: Date) {
  const start = new Date(entry.startAt).getTime();
  const end = new Date(entry.endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  if (startAt && end < startAt.getTime()) return false;
  if (endAt && start > endAt.getTime()) return false;
  return true;
}

function getEventClient(data: EaseEventsData, eventId?: string, clientId?: string) {
  const event = eventId ? data.events.find((item) => item.id === eventId) : undefined;
  return clientId
    ? data.clients.find((client) => client.id === clientId)
    : event?.clientId
      ? data.clients.find((client) => client.id === event.clientId)
      : undefined;
}

function getProject(data: EaseEventsData, projectId?: string, eventId?: string, leadId?: string) {
  return (
    (projectId ? data.projects.find((project) => project.id === projectId) : undefined) ??
    (eventId ? data.projects.find((project) => project.eventId === eventId) : undefined) ??
    (leadId ? data.projects.find((project) => project.leadId === leadId) : undefined)
  );
}

function getProposalTotal(data: EaseEventsData, proposalId: string) {
  const proposal = data.proposals.find((item) => item.id === proposalId);
  const version = proposal?.currentVersionId
    ? data.proposalVersions.find((item) => item.id === proposal.currentVersionId)
    : undefined;
  return version?.totalAmount ?? 0;
}

function createEntry(input: CalendarEntry): CalendarEntry {
  return {
    ...input,
    metadata: input.metadata ?? {},
  };
}

export function buildCalendarEntries(data: EaseEventsData): CalendarEntry[] {
  const timezone = data.organization.timezone || "America/Toronto";
  const eventEntries = data.events.map((event) =>
    createEntry({
      id: `event:${event.id}`,
      organizationId: event.organizationId,
      sourceType: "event",
      sourceId: event.id,
      projectId: event.projectId,
      leadId: event.leadId,
      eventId: event.id,
      clientId: event.clientId,
      ownerId: event.plannerId,
      title: event.eventName,
      description: `${event.eventType} for ${event.guestCount} guests`,
      startAt: isoFromDateAndTime(event.eventDate, event.startTime || "09:00"),
      endAt: isoFromDateAndTime(event.eventDate, event.endTime || event.startTime || "10:00"),
      allDay: false,
      timezone,
      status: event.status,
      category: "Event",
      visibility: "Client",
      location: event.location,
      isEditable: true,
      isRecurring: false,
      href: `/ease-events/events/${event.id}`,
      metadata: { guestCount: event.guestCount },
    }),
  );

  const meetingEntries = data.meetings.map((meeting) => {
    const category: CalendarEntryCategory = meeting.title.toLowerCase().includes("consult")
      ? "Consultation"
      : meeting.attendees.length > 1
        ? "Client meeting"
        : "Internal meeting";
    return createEntry({
      id: `meeting:${meeting.id}`,
      organizationId: meeting.organizationId,
      sourceType: "meeting",
      sourceId: meeting.id,
      projectId: meeting.projectId,
      leadId: meeting.leadId,
      eventId: meeting.eventId,
      ownerId: meeting.organizerId,
      title: meeting.title,
      description: meeting.agenda || meeting.notes,
      startAt: meeting.startAt,
      endAt: meeting.endAt,
      allDay: false,
      timezone: meeting.timezone || timezone,
      status: getEffectiveMeetingStatus(meeting),
      category,
      visibility: category === "Internal meeting" ? "Internal" : "Client",
      meetingUrl: meeting.externalConferenceUrl || meeting.link,
      externalProvider: meeting.externalProvider,
      externalEventId: meeting.externalEventId,
      syncStatus: meeting.syncStatus ?? (meeting.syncedAt ? "Synced" : "Not Synced"),
      isEditable: true,
      isRecurring: false,
      href: meeting.link || `/ease-events/communications?event=${meeting.eventId}`,
      metadata: {
        attendees: meeting.attendees,
        meetingType: meeting.meetingType,
        fathomExpected: meeting.fathomExpected,
      },
    });
  });

  const timelineEntries = data.timelineItems.flatMap((item) => {
    const event = data.events.find((candidate) => candidate.id === item.eventId);
    if (!event) return [];
    return [
      createEntry({
        id: `timeline:${item.id}`,
        organizationId: item.organizationId,
        sourceType: "timeline",
        sourceId: item.id,
        projectId: event.projectId,
        leadId: event.leadId,
        eventId: item.eventId,
        clientId: event.clientId,
        ownerId: item.ownerId,
        title: item.title,
        description: item.description,
        startAt: isoFromDateAndTime(event.eventDate, item.startTime || "09:00"),
        endAt: isoFromDateAndTime(event.eventDate, item.endTime || item.startTime || "09:30"),
        allDay: false,
        timezone,
        status: item.status,
        category: "Run of show",
        visibility: item.visibility,
        location: item.location,
        isEditable: true,
        isRecurring: false,
        href: `/ease-events/events/${item.eventId}?tab=timeline`,
        metadata: { dependsOnItemId: item.dependsOnItemId },
      }),
    ];
  });

  const taskEntries = data.tasks
    .filter((task) => Boolean(task.dueDate))
    .map((task) =>
      createEntry({
        id: `task:${task.id}`,
        organizationId: task.organizationId,
        sourceType: "task",
        sourceId: task.id,
        projectId: task.projectId,
        leadId: task.leadId,
        eventId: task.eventId,
        ownerId: task.ownerId,
        title: task.title,
        description: task.description,
        startAt: isoFromDateAndTime(task.dueDate, "09:00"),
        endAt: toAllDayEnd(task.dueDate),
        allDay: true,
        timezone,
        status: task.status,
        category: "Task deadline",
        visibility: "Internal",
        isEditable: true,
        isRecurring: false,
        href: `/ease-events/tasks?task=${task.id}`,
        metadata: { priority: task.priority },
      }),
    );

  const approvalEntries = data.approvals.map((approval) => {
    const event = data.events.find((item) => item.id === approval.eventId);
    return createEntry({
      id: `approval:${approval.id}`,
      organizationId: approval.organizationId,
      sourceType: "approval",
      sourceId: approval.id,
      projectId: event?.projectId,
      eventId: approval.eventId,
      clientId: event?.clientId,
      title: approval.title,
      description: approval.description,
      startAt: isoFromDateAndTime(approval.dueDate, "09:00"),
      endAt: toAllDayEnd(approval.dueDate),
      allDay: true,
      timezone,
      status: approval.status,
      category: "Approval deadline",
      visibility: "Client",
      isEditable: false,
      isRecurring: false,
      href: `/ease-events/events/${approval.eventId}?tab=approvals`,
      metadata: { type: approval.type },
    });
  });

  const proposalEntries = data.proposals
    .filter((proposal) => Boolean(proposal.validUntil))
    .map((proposal) =>
      createEntry({
        id: `proposal:${proposal.id}`,
        organizationId: proposal.organizationId,
        sourceType: "proposal",
        sourceId: proposal.id,
        projectId: proposal.projectId,
        leadId: proposal.leadId,
        eventId: proposal.eventId,
        clientId: proposal.clientId,
        title: `${proposal.title} expires`,
        description: `Proposal ${proposal.proposalNumber}`,
        startAt: isoFromDateAndTime(proposal.validUntil ?? "", "09:00"),
        endAt: toAllDayEnd(proposal.validUntil ?? ""),
        allDay: true,
        timezone,
        status: proposal.status,
        category: "Proposal expiration",
        visibility: "Client",
        isEditable: false,
        isRecurring: false,
        href: proposal.eventId
          ? `/ease-events/events/${proposal.eventId}?tab=proposal`
          : `/ease-events/leads/${proposal.leadId}`,
        metadata: { totalAmount: getProposalTotal(data, proposal.id) },
      }),
    );

  const invoiceEntries = data.invoices.map((invoice) =>
    createEntry({
      id: `invoice:${invoice.id}`,
      organizationId: invoice.organizationId,
      sourceType: "invoice",
      sourceId: invoice.id,
      projectId: invoice.projectId,
      eventId: invoice.eventId,
      clientId: invoice.clientId,
      title: `${invoice.invoiceNumber} due`,
      description: `${invoice.invoiceType} invoice`,
      startAt: isoFromDateAndTime(invoice.dueDate, "09:00"),
      endAt: toAllDayEnd(invoice.dueDate),
      allDay: true,
      timezone,
      status: invoice.status,
      category: "Invoice deadline",
      visibility: "Client",
      isEditable: false,
      isRecurring: false,
      href: invoice.eventId
        ? `/ease-events/events/${invoice.eventId}?tab=finances`
        : "/ease-events/finances",
      metadata: { amount: invoice.amount, balanceDue: invoice.balanceDue },
    }),
  );

  const expenseEntries = data.expenses
    .filter((expense) => Boolean(expense.dueDate))
    .map((expense) =>
      createEntry({
        id: `expense:${expense.id}`,
        organizationId: expense.organizationId,
        sourceType: "expense",
        sourceId: expense.id,
        projectId: expense.projectId,
        eventId: expense.eventId,
        ownerId: expense.createdById,
        title: `${expense.description} due`,
        description: expense.notes,
        startAt: isoFromDateAndTime(expense.dueDate ?? expense.expenseDate, "09:00"),
        endAt: toAllDayEnd(expense.dueDate ?? expense.expenseDate),
        allDay: true,
        timezone,
        status: expense.status,
        category: "Expense deadline",
        visibility: "Internal",
        isEditable: false,
        isRecurring: false,
        href: expense.eventId
          ? `/ease-events/events/${expense.eventId}?tab=finances`
          : "/ease-events/finances?view=expenses",
        metadata: { totalAmount: expense.totalAmount, vendorId: expense.vendorId },
      }),
    );

  const reminderEntries = data.projectReminders
    .filter((reminder) => Boolean(reminder.dueAt))
    .map((reminder) => {
      const project = data.projects.find((item) => item.id === reminder.projectId);
      return createEntry({
        id: `reminder:${reminder.id}`,
        organizationId: reminder.organizationId,
        sourceType: "reminder",
        sourceId: reminder.id,
        projectId: reminder.projectId,
        leadId: project?.leadId,
        eventId: project?.eventId,
        clientId: project?.clientId,
        ownerId: reminder.assignedToId,
        title: reminder.title,
        startAt: reminder.dueAt ?? "",
        endAt: addMinutes(reminder.dueAt ?? "", 30),
        allDay: false,
        timezone,
        status: reminder.status,
        category: "Reminder",
        visibility: "Internal",
        isEditable: true,
        isRecurring: false,
        href: project?.eventId
          ? `/ease-events/events/${project.eventId}`
          : project?.leadId
            ? `/ease-events/leads/${project.leadId}`
            : "/ease-events",
        metadata: { automationSource: reminder.automationSource },
      });
    });

  const externalEntries = data.externalCalendarEvents
    .filter((event) => !event.deletedAt)
    .map((event) =>
      createEntry({
        id: `external:${event.id}`,
        organizationId: event.organizationId,
        sourceType: "external",
        sourceId: event.id,
        title: event.title,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        timezone: event.timezone || timezone,
        status: event.status,
        category: "External-only",
        visibility: "Internal",
        location: event.location,
        meetingUrl: event.meetingUrl,
        externalProvider: event.provider,
        externalEventId: event.externalEventId,
        syncStatus: event.syncStatus,
        isEditable: false,
        isRecurring: Object.keys(event.recurrence).length > 0,
        href: event.meetingUrl,
        metadata: { attendees: event.attendees, conflictStatus: event.conflictStatus },
      }),
    );

  return [
    ...eventEntries,
    ...meetingEntries,
    ...timelineEntries,
    ...taskEntries,
    ...approvalEntries,
    ...proposalEntries,
    ...invoiceEntries,
    ...expenseEntries,
    ...reminderEntries,
    ...externalEntries,
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function filterCalendarEntries(
  entries: CalendarEntry[],
  filters: CalendarFilters,
  startAt?: Date,
  endAt?: Date,
) {
  const query = normalizeText(filters.query);
  return entries
    .filter((entry) => includesDateRange(entry, startAt, endAt))
    .filter((entry) => {
      if (!query) return true;
      return [entry.title, entry.description, entry.location, entry.status, entry.category]
        .map(normalizeText)
        .some((value) => value.includes(query));
    })
    .filter((entry) => !filters.ownerIds?.length || filters.ownerIds.includes(entry.ownerId ?? ""))
    .filter(
      (entry) => !filters.projectIds?.length || filters.projectIds.includes(entry.projectId ?? ""),
    )
    .filter(
      (entry) => !filters.clientIds?.length || filters.clientIds.includes(entry.clientId ?? ""),
    )
    .filter((entry) => !filters.eventIds?.length || filters.eventIds.includes(entry.eventId ?? ""))
    .filter((entry) => !filters.categories?.length || filters.categories.includes(entry.category))
    .filter((entry) => !filters.statuses?.length || filters.statuses.includes(entry.status))
    .filter((entry) => !filters.visibility?.length || filters.visibility.includes(entry.visibility))
    .filter((entry) => {
      if (!filters.providers?.length) return true;
      const provider = entry.externalProvider ?? "easeevents";
      return filters.providers.includes(provider);
    })
    .filter((entry) => {
      if (!filters.syncStates?.length) return true;
      const status = normalizeText(entry.syncStatus);
      if (filters.syncStates.includes("synced") && status.includes("synced")) return true;
      if (
        filters.syncStates.includes("unsynced") &&
        (!entry.syncStatus || status.includes("not synced"))
      ) {
        return true;
      }
      if (
        filters.syncStates.includes("failed") &&
        (status.includes("fail") || status.includes("error") || status.includes("retry"))
      ) {
        return true;
      }
      return false;
    });
}

export function getCalendarRange(view: CalendarViewMode, anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);

  if (view === "day") {
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (view === "week") {
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (view === "month") {
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getCalendarGridDays(anchor: Date) {
  const monthStart = new Date(anchor);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isActionableStatus(entry: CalendarEntry) {
  return !["Done", "Complete", "Completed", "Cancelled", "Paid", "Void", "Voided"].includes(
    entry.status,
  );
}

function getPreferenceForOwner(
  preferences: SchedulingPreference[],
  organizationTimezone: string,
  ownerId?: string,
) {
  return (
    (ownerId ? preferences.find((preference) => preference.userId === ownerId) : undefined) ??
    preferences.find((preference) => !preference.userId) ?? {
      timezone: organizationTimezone,
      workingDays: [1, 2, 3, 4, 5],
      workdayStart: "09:00",
      workdayEnd: "17:00",
    }
  );
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function detectCalendarConflicts(
  entries: CalendarEntry[],
  data: EaseEventsData,
): CalendarConflictView[] {
  const conflicts: CalendarConflictView[] = [];
  const timed = entries
    .filter((entry) => !entry.allDay && isActionableStatus(entry))
    .filter((entry) => new Date(entry.endAt).getTime() > new Date(entry.startAt).getTime());

  timed.forEach((entry) => {
    const preference = getPreferenceForOwner(
      data.schedulingPreferences,
      data.organization.timezone,
      entry.ownerId,
    );
    const start = new Date(entry.startAt);
    const day = start.getDay();
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const end = new Date(entry.endAt);
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const outsideDay = !preference.workingDays.includes(day);
    const outsideHours =
      startMinutes < timeToMinutes(preference.workdayStart) ||
      endMinutes > timeToMinutes(preference.workdayEnd);

    if (outsideDay || outsideHours) {
      conflicts.push({
        id: `availability:${entry.id}`,
        severity: "Info",
        title: "Outside working hours",
        description: `${entry.title} is scheduled outside the configured availability window.`,
        entryIds: [entry.id],
        ownerId: entry.ownerId,
      });
    }
  });

  for (let index = 0; index < timed.length; index += 1) {
    const first = timed[index];
    if (!first.ownerId) continue;
    for (let nextIndex = index + 1; nextIndex < timed.length; nextIndex += 1) {
      const second = timed[nextIndex];
      if (first.ownerId !== second.ownerId) continue;
      const firstStart = new Date(first.startAt).getTime();
      const firstEnd = new Date(first.endAt).getTime();
      const secondStart = new Date(second.startAt).getTime();
      const secondEnd = new Date(second.endAt).getTime();
      if (firstStart < secondEnd && secondStart < firstEnd) {
        conflicts.push({
          id: `overlap:${first.id}:${second.id}`,
          severity: "Hard Conflict",
          title: "Planner double-booked",
          description: `${first.title} overlaps ${second.title}.`,
          entryIds: [first.id, second.id],
          ownerId: first.ownerId,
        });
      }
    }
  }

  data.availabilityBlocks.forEach((block) => {
    const blockStart = new Date(block.startAt).getTime();
    const blockEnd = new Date(block.endAt).getTime();
    timed
      .filter((entry) => !block.userId || entry.ownerId === block.userId)
      .forEach((entry) => {
        const entryStart = new Date(entry.startAt).getTime();
        const entryEnd = new Date(entry.endAt).getTime();
        if (entryStart < blockEnd && blockStart < entryEnd) {
          conflicts.push({
            id: `block:${block.id}:${entry.id}`,
            severity: "Warning",
            title: "Availability block conflict",
            description: `${entry.title} overlaps ${block.title}.`,
            entryIds: [entry.id],
            ownerId: entry.ownerId,
          });
        }
      });
  });

  entries
    .filter((entry) => entry.category === "Client meeting" || entry.category === "Consultation")
    .filter((entry) => !entry.meetingUrl && entry.status === "Scheduled")
    .forEach((entry) => {
      conflicts.push({
        id: `link:${entry.id}`,
        severity: "Warning",
        title: "Meeting link missing",
        description: `${entry.title} is client-facing but has no join link.`,
        entryIds: [entry.id],
        ownerId: entry.ownerId,
      });
    });

  return conflicts;
}

export function buildCalendarProjection(data: EaseEventsData): CalendarProjection {
  const entries = buildCalendarEntries(data);
  return {
    entries,
    conflicts: detectCalendarConflicts(entries, data),
  };
}

export function getCalendarEntryContext(data: EaseEventsData, entry: CalendarEntry) {
  const project = getProject(data, entry.projectId, entry.eventId, entry.leadId);
  const event = entry.eventId ? data.events.find((item) => item.id === entry.eventId) : undefined;
  const lead = entry.leadId ? data.leads.find((item) => item.id === entry.leadId) : undefined;
  const client = getEventClient(data, entry.eventId, entry.clientId ?? project?.clientId);
  const owner = entry.ownerId ? data.users.find((user) => user.id === entry.ownerId) : undefined;
  return { project, event, lead, client, owner };
}

export function getProjectHref(project?: { eventId?: string; leadId?: string }) {
  if (project?.eventId) return `/ease-events/events/${project.eventId}`;
  if (project?.leadId) return `/ease-events/leads/${project.leadId}`;
  return "/ease-events";
}
