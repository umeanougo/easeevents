import type {
  EaseEventsData,
  EventDayIssue,
  EventDaySession,
  EventDayVendorStatusRecord,
  EventRecord,
  EventTeamMember,
  EventVendor,
  TimelineItem,
} from "./types";

export type EventDayReadinessLevel = "Required" | "Recommended" | "Informational";
export type EventDayReadinessStatus = "complete" | "warning" | "blocked";
export type EventDayOfflineStatus =
  | "online"
  | "offline"
  | "queued"
  | "syncing"
  | "failed"
  | "synced";

export interface EventDayReadinessCheck {
  id: string;
  label: string;
  description: string;
  level: EventDayReadinessLevel;
  status: EventDayReadinessStatus;
  actionHref?: string;
}

export interface EventDayMutation {
  localOperationId: string;
  organizationId: string;
  eventId: string;
  entityType: "timeline" | "vendor" | "issue" | "note" | "session";
  entityId?: string;
  operationType: string;
  payload: Record<string, unknown>;
  expectedVersion?: number;
  createdAt: string;
  retryCount: number;
  syncStatus: "Saved on this device" | "Waiting to sync" | "Syncing" | "Synced" | "Sync failed";
  lastError?: string;
}

export interface EventDayOfflineCache {
  organizationId: string;
  eventId: string;
  downloadedAt: string;
  updatedAt: string;
  event: Pick<EventRecord, "id" | "eventName" | "eventDate" | "startTime" | "endTime" | "location">;
  timelineItems: TimelineItem[];
  teamMembers: EventTeamMember[];
  eventVendors: EventVendor[];
  vendorStatuses: EventDayVendorStatusRecord[];
  issues: EventDayIssue[];
}

export interface EventDayCommandState {
  session?: EventDaySession;
  timelineItems: TimelineItem[];
  currentItem?: TimelineItem;
  nextItem?: TimelineItem;
  lateItems: TimelineItem[];
  blockedItems: TimelineItem[];
  delayedItems: TimelineItem[];
  recentlyCompletedItems: TimelineItem[];
  readinessChecks: EventDayReadinessCheck[];
  requiredBlockers: EventDayReadinessCheck[];
}

function eventDayStoragePrefix(eventId: string) {
  return `ease-events-event-day:${eventId}`;
}

export function eventDayCacheKey(eventId: string) {
  return `${eventDayStoragePrefix(eventId)}:cache`;
}

export function eventDayQueueKey(eventId: string) {
  return `${eventDayStoragePrefix(eventId)}:queue`;
}

export function combineEventDateAndTime(event: EventRecord, time?: string) {
  return `${event.eventDate}T${(time || event.startTime || "09:00").slice(0, 5)}:00`;
}

export function getTimelinePlannedStart(event: EventRecord, item: TimelineItem) {
  return item.plannedStartAt ?? combineEventDateAndTime(event, item.startTime);
}

export function getTimelinePlannedEnd(event: EventRecord, item: TimelineItem) {
  return item.plannedEndAt ?? combineEventDateAndTime(event, item.endTime || item.startTime);
}

function isTerminalTimelineStatus(status: TimelineItem["status"]) {
  return ["Complete", "Completed", "Skipped", "Cancelled"].includes(status);
}

function isLate(event: EventRecord, item: TimelineItem, now: Date) {
  if (isTerminalTimelineStatus(item.status)) return false;
  const plannedEnd = new Date(getTimelinePlannedEnd(event, item)).getTime();
  return plannedEnd < now.getTime();
}

function dependencyComplete(items: TimelineItem[], item: TimelineItem) {
  if (!item.dependsOnItemId) return true;
  const dependency = items.find((candidate) => candidate.id === item.dependsOnItemId);
  return dependency ? isTerminalTimelineStatus(dependency.status) : true;
}

export function getCurrentAndNextTimelineItems(
  event: EventRecord,
  items: TimelineItem[],
  now = new Date(),
) {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(getTimelinePlannedStart(event, a)).getTime() -
        new Date(getTimelinePlannedStart(event, b)).getTime() || a.sortOrder - b.sortOrder,
  );
  const pinned = sorted.find(
    (item) => item.pinnedCurrentAt && !isTerminalTimelineStatus(item.status),
  );
  const inProgress = sorted.find((item) => item.status === "In Progress");
  const ready = sorted.find(
    (item) =>
      item.status === "Ready" &&
      dependencyComplete(sorted, item) &&
      !isTerminalTimelineStatus(item.status),
  );
  const byTime =
    sorted.find((item) => {
      if (isTerminalTimelineStatus(item.status)) return false;
      const start = new Date(getTimelinePlannedStart(event, item)).getTime();
      const end = new Date(getTimelinePlannedEnd(event, item)).getTime();
      return start <= now.getTime() && now.getTime() <= end && dependencyComplete(sorted, item);
    }) ??
    sorted.find(
      (item) => !isTerminalTimelineStatus(item.status) && dependencyComplete(sorted, item),
    );

  const currentItem = pinned ?? inProgress ?? ready ?? byTime;
  const nextItem = sorted.find(
    (item) =>
      item.id !== currentItem?.id &&
      !isTerminalTimelineStatus(item.status) &&
      dependencyComplete(sorted, item),
  );

  return { currentItem, nextItem };
}

export function buildEventDayReadinessChecks(
  data: EaseEventsData,
  event: EventRecord,
): EventDayReadinessCheck[] {
  const timelineItems = data.timelineItems.filter((item) => item.eventId === event.id);
  const eventTeam = data.eventTeamMembers.filter((member) => member.eventId === event.id);
  const eventVendors = data.eventVendors.filter((assignment) => assignment.eventId === event.id);
  const vendorStatuses = data.eventDayVendorStatuses.filter(
    (status) => status.eventId === event.id,
  );
  const approvals = data.approvals.filter((approval) => approval.eventId === event.id);
  const openTasks = data.tasks.filter(
    (task) => task.eventId === event.id && task.status !== "Done",
  );
  const keyFiles = data.files.filter(
    (file) => file.eventId === event.id && file.visibility !== "Client",
  );
  const openClientApprovals = approvals.filter((approval) => approval.status === "Pending");
  const criticalTimeline = timelineItems.filter((item) => item.criticality === "Critical");
  const vendorsConfirmed =
    eventVendors.length > 0 &&
    eventVendors.every((assignment) => {
      const status = vendorStatuses.find((item) => item.eventVendorId === assignment.id);
      return status && status.status !== "Not Confirmed";
    });

  return [
    {
      id: "timeline",
      label: "Run of show exists",
      description: "At least one sequence item is needed for command mode.",
      level: "Required",
      status: timelineItems.length ? "complete" : "blocked",
      actionHref: `/ease-events/events/${event.id}?tab=timeline`,
    },
    {
      id: "timezone",
      label: "Date, time, and location confirmed",
      description: "Event-day timing depends on confirmed event details.",
      level: "Required",
      status: event.eventDate && event.location ? "complete" : "blocked",
      actionHref: `/ease-events/events/${event.id}`,
    },
    {
      id: "lead",
      label: "Event-day lead assigned",
      description: "A lead owner should be accountable for live decisions.",
      level: "Required",
      status: eventTeam.some((member) => member.eventDayRole === "Event-Day Lead")
        ? "complete"
        : "warning",
      actionHref: `/ease-events/events/${event.id}?tab=overview`,
    },
    {
      id: "team",
      label: "Team assignments confirmed",
      description: "Assigned staff should be visible with contact paths.",
      level: "Recommended",
      status: eventTeam.length ? "complete" : "warning",
    },
    {
      id: "vendors",
      label: "Vendors confirmed",
      description: "Vendor arrivals and setup expectations should be ready.",
      level: "Recommended",
      status: vendorsConfirmed ? "complete" : eventVendors.length ? "warning" : "blocked",
      actionHref: `/ease-events/events/${event.id}?tab=vendors`,
    },
    {
      id: "approvals",
      label: "Client approvals resolved",
      description: "Pending approvals can turn into event-day confusion.",
      level: "Recommended",
      status: openClientApprovals.length ? "warning" : "complete",
      actionHref: `/ease-events/events/${event.id}?tab=approvals`,
    },
    {
      id: "tasks",
      label: "Critical tasks complete",
      description: "Open tasks are surfaced as blockers before activation.",
      level: "Recommended",
      status: openTasks.length ? "warning" : "complete",
      actionHref: `/ease-events/events/${event.id}?tab=tasks`,
    },
    {
      id: "criticality",
      label: "Critical timeline items marked",
      description: "Marking critical items helps the command view prioritize pressure points.",
      level: "Informational",
      status: criticalTimeline.length ? "complete" : "warning",
    },
    {
      id: "files",
      label: "Key files available",
      description: "Run sheet, floor plan, contact sheet, and maps can be marked for offline use.",
      level: "Informational",
      status: keyFiles.length ? "complete" : "warning",
      actionHref: `/ease-events/events/${event.id}?tab=files`,
    },
  ];
}

export function buildEventDayCommandState(
  data: EaseEventsData,
  event: EventRecord,
  now = new Date(),
): EventDayCommandState {
  const timelineItems = data.timelineItems
    .filter((item) => item.eventId === event.id)
    .sort(
      (a, b) =>
        new Date(getTimelinePlannedStart(event, a)).getTime() -
          new Date(getTimelinePlannedStart(event, b)).getTime() || a.sortOrder - b.sortOrder,
    );
  const { currentItem, nextItem } = getCurrentAndNextTimelineItems(event, timelineItems, now);
  const readinessChecks = buildEventDayReadinessChecks(data, event);

  return {
    session: data.eventDaySessions.find((session) => session.eventId === event.id),
    timelineItems,
    currentItem,
    nextItem,
    lateItems: timelineItems.filter((item) => isLate(event, item, now)),
    blockedItems: timelineItems.filter((item) => item.status === "Blocked"),
    delayedItems: timelineItems.filter((item) => item.status === "Delayed"),
    recentlyCompletedItems: timelineItems
      .filter((item) => item.completedAt)
      .filter(
        (item) => now.getTime() - new Date(item.completedAt ?? "").getTime() <= 60 * 60 * 1000,
      ),
    readinessChecks,
    requiredBlockers: readinessChecks.filter(
      (check) => check.level === "Required" && check.status === "blocked",
    ),
  };
}

export function buildTimelineSnapshot(items: TimelineItem[]) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    startTime: item.startTime,
    endTime: item.endTime,
    ownerId: item.ownerId,
    dependsOnItemId: item.dependsOnItemId,
    status: item.status,
    location: item.location,
    visibility: item.visibility,
    sortOrder: item.sortOrder,
    criticality: item.criticality ?? "Normal",
    versionNumber: item.versionNumber ?? 1,
  }));
}

export function loadEventDayOfflineCache(eventId: string): EventDayOfflineCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(eventDayCacheKey(eventId));
    return raw ? (JSON.parse(raw) as EventDayOfflineCache) : null;
  } catch {
    return null;
  }
}

export function saveEventDayOfflineCache(cache: EventDayOfflineCache) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(eventDayCacheKey(cache.eventId), JSON.stringify(cache));
}

export function clearEventDayOfflineCache(eventId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(eventDayCacheKey(eventId));
  window.localStorage.removeItem(eventDayQueueKey(eventId));
}

export function loadEventDayMutationQueue(eventId: string): EventDayMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(eventDayQueueKey(eventId));
    return raw ? (JSON.parse(raw) as EventDayMutation[]) : [];
  } catch {
    return [];
  }
}

export function saveEventDayMutationQueue(eventId: string, queue: EventDayMutation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(eventDayQueueKey(eventId), JSON.stringify(queue));
}

export function queueEventDayMutation(
  mutation: Omit<EventDayMutation, "localOperationId" | "createdAt" | "retryCount" | "syncStatus">,
) {
  const localOperationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `event-day-${crypto.randomUUID()}`
      : `event-day-${Date.now()}`;
  const queued: EventDayMutation = {
    ...mutation,
    localOperationId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    syncStatus: "Saved on this device",
  };
  saveEventDayMutationQueue(mutation.eventId, [
    ...loadEventDayMutationQueue(mutation.eventId),
    queued,
  ]);
  return queued;
}
