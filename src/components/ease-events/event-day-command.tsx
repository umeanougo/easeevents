import * as React from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Play,
  Printer,
  Radio,
  RefreshCw,
  ShieldAlert,
  SkipForward,
  UserRoundCheck,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEaseEventsAuth } from "@/lib/ease-events/auth";
import {
  buildEventDayCommandState,
  buildTimelineSnapshot,
  clearEventDayOfflineCache,
  getTimelinePlannedEnd,
  getTimelinePlannedStart,
  loadEventDayMutationQueue,
  queueEventDayMutation,
  saveEventDayMutationQueue,
  saveEventDayOfflineCache,
  type EventDayMutation,
} from "@/lib/ease-events/event-day";
import { formatDate, formatDateTime } from "@/lib/ease-events/calculations";
import { useEaseEventsStore } from "@/lib/ease-events/store";
import type {
  CommunicationThread,
  EventDayIssue,
  EventDayIssueSeverity,
  EventDayIssueType,
  EventDayVendorStatus,
  EventDayVendorStatusRecord,
  EventRecord,
  EventTeamMember,
  EventVendor,
  TimelineItem,
  UpdateTimelineItemInput,
  Vendor,
} from "@/lib/ease-events/types";
import {
  eventDayIssueSeverities,
  eventDayIssueTypes,
  eventDayVendorStatuses,
} from "@/lib/ease-events/types";
import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { PageHeader } from "./app-shell";
import { StatusBadge } from "./status-badge";

function eventHref(eventId: string) {
  return `/ease-events/events/${eventId}`;
}

function formatTime(value?: string) {
  if (!value) return "Not set";
  if (/^\d\d?:\d\d/.test(value)) {
    const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function getDurationLabel(startAt?: string, endAt?: string) {
  if (!startAt || !endAt) return "";
  const diff = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  return diff > 0 ? `${diff} min` : "";
}

function timelineInputFromItem(item: TimelineItem): UpdateTimelineItemInput {
  return {
    eventId: item.eventId,
    title: item.title,
    description: item.description,
    startTime: item.startTime,
    endTime: item.endTime,
    ownerId: item.ownerId,
    dependsOnItemId: item.dependsOnItemId,
    status: item.status,
    location: item.location,
    visibility: item.visibility,
    sortOrder: item.sortOrder,
    plannedStartAt: item.plannedStartAt,
    plannedEndAt: item.plannedEndAt,
    actualStartAt: item.actualStartAt,
    actualEndAt: item.actualEndAt,
    checkedInAt: item.checkedInAt,
    completedAt: item.completedAt,
    completedById: item.completedById,
    criticality: item.criticality ?? "Normal",
    delayMinutes: item.delayMinutes ?? 0,
    statusReason: item.statusReason,
    contingencyNotes: item.contingencyNotes,
    eventDayNotes: item.eventDayNotes,
    vendorAssignmentId: item.vendorAssignmentId,
    teamAssignmentId: item.teamAssignmentId,
    versionNumber: item.versionNumber ?? 1,
    lockedAt: item.lockedAt,
    pinnedCurrentAt: item.pinnedCurrentAt,
    pinnedCurrentById: item.pinnedCurrentById,
    updatedById: item.updatedById,
  };
}

function isOpenIssue(issue: EventDayIssue) {
  return !["Resolved", "Closed"].includes(issue.status);
}

function getVendorStatus(
  statuses: EventDayVendorStatusRecord[],
  assignment: EventVendor,
): EventDayVendorStatusRecord | undefined {
  return statuses.find((status) => status.eventVendorId === assignment.id);
}

function getVendorName(vendors: Vendor[], vendorId: string) {
  return vendors.find((vendor) => vendor.id === vendorId)?.name ?? "Vendor";
}

function ConnectionBadge({
  isOnline,
  queueCount,
  isSyncing,
}: {
  isOnline: boolean;
  queueCount: number;
  isSyncing: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium",
        isOnline
          ? queueCount
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-300 bg-slate-100 text-slate-800",
      )}
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isOnline ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      {isSyncing
        ? "Syncing"
        : isOnline
          ? queueCount
            ? `${queueCount} waiting to sync`
            : "Fully synchronized"
          : queueCount
            ? `${queueCount} saved on this device`
            : "Offline"}
    </div>
  );
}

function TimelineCard({
  event,
  item,
  ownerName,
  vendorName,
  isCompact,
  onStatus,
  onPin,
}: {
  event: EventRecord;
  item?: TimelineItem;
  ownerName?: string;
  vendorName?: string;
  isCompact?: boolean;
  onStatus: (item: TimelineItem, status: TimelineItem["status"]) => void;
  onPin?: (item: TimelineItem) => void;
}) {
  if (!item) {
    return (
      <Card className="rounded-lg border-dashed border-slate-300 bg-white">
        <CardContent className="p-5 text-sm text-slate-500">No item in this slot.</CardContent>
      </Card>
    );
  }

  const plannedStart = getTimelinePlannedStart(event, item);
  const plannedEnd = getTimelinePlannedEnd(event, item);
  return (
    <Card
      className={cn(
        "rounded-lg border-slate-200 bg-white shadow-sm",
        item.criticality === "Critical" && "border-rose-300",
      )}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {formatTime(plannedStart)} {plannedEnd ? `- ${formatTime(plannedEnd)}` : ""}
            </p>
            <h3
              className={cn(
                "mt-1 font-semibold text-slate-950",
                isCompact ? "text-base" : "text-xl",
              )}
            >
              {item.title}
            </h3>
          </div>
          <StatusBadge value={item.status} />
        </div>
        <p className="text-sm leading-6 text-slate-600">{item.description || "No notes added."}</p>
        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            {ownerName ?? "Unassigned"}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {item.location ?? "Location not set"}
          </span>
          {vendorName ? (
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {vendorName}
            </span>
          ) : null}
          {item.actualStartAt ? (
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Actual: {formatTime(item.actualStartAt)}
              {item.actualEndAt ? `-${formatTime(item.actualEndAt)}` : ""}
            </span>
          ) : null}
        </div>
        {item.delayMinutes ? (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Delayed {item.delayMinutes} minutes{item.statusReason ? `: ${item.statusReason}` : ""}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button size="sm" onClick={() => onStatus(item, "In Progress")}>
            <Play className="h-4 w-4" />
            Start
          </Button>
          <Button size="sm" variant="outline" onClick={() => onStatus(item, "Completed")}>
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </Button>
          <Button size="sm" variant="outline" onClick={() => onStatus(item, "Delayed")}>
            <Clock className="h-4 w-4" />
            Delay
          </Button>
          <Button size="sm" variant="outline" onClick={() => onStatus(item, "Blocked")}>
            <ShieldAlert className="h-4 w-4" />
            Block
          </Button>
          <Button size="sm" variant="outline" onClick={() => onStatus(item, "Skipped")}>
            <SkipForward className="h-4 w-4" />
            Skip
          </Button>
          {onPin ? (
            <Button size="sm" variant="outline" onClick={() => onPin(item)}>
              Pin current
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessChecklist({
  checks,
  onActivate,
  onReady,
  isBusy,
}: {
  checks: ReturnType<typeof buildEventDayCommandState>["readinessChecks"];
  onActivate: () => void;
  onReady: () => void;
  isBusy: boolean;
}) {
  const requiredBlockers = checks.filter(
    (check) => check.level === "Required" && check.status === "blocked",
  );
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Readiness checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
          >
            {check.status === "complete" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            ) : check.status === "blocked" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-950">{check.label}</p>
                <StatusBadge value={check.level} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{check.description}</p>
            </div>
          </div>
        ))}
        {requiredBlockers.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {requiredBlockers.length} required item{requiredBlockers.length === 1 ? "" : "s"} need
            acknowledgement before activation.
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={onReady} disabled={isBusy}>
            Mark ready
          </Button>
          <Button onClick={onActivate} disabled={isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            Activate Event-Day Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VendorCommandPanel({
  eventVendors,
  vendors,
  statuses,
  onStatus,
}: {
  eventVendors: EventVendor[];
  vendors: Vendor[];
  statuses: EventDayVendorStatusRecord[];
  onStatus: (assignment: EventVendor, status: EventDayVendorStatus) => void;
}) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Vendor arrivals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {eventVendors.length ? (
          eventVendors.map((assignment) => {
            const vendor = vendors.find((item) => item.id === assignment.vendorId);
            const status = getVendorStatus(statuses, assignment);
            return (
              <div key={assignment.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{vendor?.name ?? "Vendor"}</p>
                    <p className="text-sm text-slate-500">
                      {assignment.serviceCategory} · {vendor?.contactName || "No contact"}
                    </p>
                  </div>
                  <StatusBadge value={status?.status ?? "Not Confirmed"} />
                </div>
                {vendor?.phone || vendor?.email ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {vendor.phone ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${vendor.phone}`}>
                          <Phone className="h-4 w-4" />
                          Call
                        </a>
                      </Button>
                    ) : null}
                    {vendor.email ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${vendor.email}`}>Email</a>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {(
                    [
                      "Confirmed",
                      "En Route",
                      "Arrived",
                      "Ready",
                      "Delayed",
                      "Issue",
                    ] as EventDayVendorStatus[]
                  ).map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      size="sm"
                      variant={status?.status === nextStatus ? "default" : "outline"}
                      onClick={() => onStatus(assignment, nextStatus)}
                    >
                      {nextStatus}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            No vendors assigned to this event yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TeamCommandPanel({
  team,
  users,
  timelineItems,
}: {
  team: EventTeamMember[];
  users: Array<{ id: string; fullName: string; email: string; phone?: string }>;
  timelineItems: TimelineItem[];
}) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Team command</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {team.length ? (
          team.map((member) => {
            const user = users.find((item) => item.id === member.userId);
            const assigned = timelineItems.filter((item) => item.ownerId === member.userId);
            return (
              <div key={member.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {user?.fullName ?? "Team member"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {member.eventDayRole || member.roleLabel} · {assigned.length} assignment
                      {assigned.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusBadge value={member.eventDayStatus ?? "Unconfirmed"} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user?.phone ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={`tel:${user.phone}`}>
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    </Button>
                  ) : null}
                  {user?.email ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${user.email}`}>Email</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            No event-day team members assigned.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function IssuePanel({
  issues,
  timelineItems,
  vendors,
  onCreate,
  onResolve,
}: {
  issues: EventDayIssue[];
  timelineItems: TimelineItem[];
  vendors: Vendor[];
  onCreate: (input: {
    title: string;
    type: EventDayIssueType;
    severity: EventDayIssueSeverity;
    timelineItemId?: string;
    vendorId?: string;
    description?: string;
  }) => void;
  onResolve: (issue: EventDayIssue) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<EventDayIssueType>("Logistics");
  const [severity, setSeverity] = React.useState<EventDayIssueSeverity>("Attention Needed");
  const [timelineItemId, setTimelineItemId] = React.useState("");
  const [vendorId, setVendorId] = React.useState("");
  const [description, setDescription] = React.useState("");

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Issues and decisions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-3 rounded-lg border border-slate-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            onCreate({
              title: title.trim(),
              type,
              severity,
              timelineItemId: timelineItemId || undefined,
              vendorId: vendorId || undefined,
              description: description.trim() || undefined,
            });
            setTitle("");
            setDescription("");
            setTimelineItemId("");
            setVendorId("");
          }}
        >
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs attention?"
            aria-label="Issue title"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as EventDayIssueType)}
              aria-label="Issue type"
            >
              {eventDayIssueTypes.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={severity}
              onChange={(event) => setSeverity(event.target.value as EventDayIssueSeverity)}
              aria-label="Issue severity"
            >
              {eventDayIssueSeverities.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={timelineItemId}
              onChange={(event) => setTimelineItemId(event.target.value)}
              aria-label="Linked run of show item"
            >
              <option value="">No timeline item</option>
              {timelineItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.startTime} · {item.title}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              aria-label="Linked vendor"
            >
              <option value="">No vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short note, decision, or resolution context"
            rows={3}
          />
          <Button type="submit" className="w-full sm:w-auto">
            <ShieldAlert className="h-4 w-4" />
            Add issue
          </Button>
        </form>

        {issues.length ? (
          issues.map((issue) => (
            <div key={issue.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{issue.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {issue.type} · {issue.severity} · {formatDateTime(issue.openedAt)}
                  </p>
                </div>
                <StatusBadge value={issue.status} />
              </div>
              {issue.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">{issue.description}</p>
              ) : null}
              {isOpenIssue(issue) ? (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(issue)}
                >
                  Resolve
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            No event-day issues logged.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function printRunSheet(args: {
  event: EventRecord;
  timelineItems: TimelineItem[];
  team: EventTeamMember[];
  vendors: Vendor[];
  eventVendors: EventVendor[];
  vendorStatuses: EventDayVendorStatusRecord[];
  users: Array<{ id: string; fullName: string; phone?: string; email: string }>;
}) {
  if (typeof window === "undefined") return;
  const rows = args.timelineItems
    .map((item) => {
      const owner = args.users.find((user) => user.id === item.ownerId)?.fullName ?? "Unassigned";
      return `<tr><td>${item.startTime}${item.endTime ? `-${item.endTime}` : ""}</td><td>${item.title}</td><td>${owner}</td><td>${item.location ?? ""}</td><td>${item.status}</td></tr>`;
    })
    .join("");
  const vendorRows = args.eventVendors
    .map((assignment) => {
      const vendor = args.vendors.find((item) => item.id === assignment.vendorId);
      const status = getVendorStatus(args.vendorStatuses, assignment);
      return `<tr><td>${vendor?.name ?? "Vendor"}</td><td>${assignment.serviceCategory}</td><td>${vendor?.contactName ?? ""}</td><td>${vendor?.phone ?? ""}</td><td>${status?.status ?? "Not Confirmed"}</td></tr>`;
    })
    .join("");
  const teamRows = args.team
    .map((member) => {
      const user = args.users.find((item) => item.id === member.userId);
      return `<tr><td>${user?.fullName ?? "Team member"}</td><td>${member.eventDayRole || member.roleLabel}</td><td>${user?.phone ?? ""}</td><td>${member.eventDayStatus ?? ""}</td></tr>`;
    })
    .join("");
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${args.event.eventName} event-day run sheet</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; color: #111827; padding: 28px; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          h2 { margin-top: 28px; font-size: 18px; }
          p { color: #475569; margin: 0 0 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #d8dee8; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${args.event.eventName}</h1>
        <p>${formatDate(args.event.eventDate)} · ${args.event.startTime}-${args.event.endTime} · ${args.event.location}</p>
        <p>Generated ${new Date().toLocaleString()}</p>
        <h2>Run of show</h2>
        <table><thead><tr><th>Time</th><th>Item</th><th>Owner</th><th>Location</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
        <h2>Vendor arrivals</h2>
        <table><thead><tr><th>Vendor</th><th>Category</th><th>Contact</th><th>Phone</th><th>Status</th></tr></thead><tbody>${vendorRows}</tbody></table>
        <h2>Team contacts</h2>
        <table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Status</th></tr></thead><tbody>${teamRows}</tbody></table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

export function EventDayCommandPage({ eventId }: { eventId: string }) {
  const { currentUser } = useEaseEventsAuth();
  const {
    data,
    persistenceMode,
    refreshData,
    updateTimelineItem,
    upsertEventDaySession,
    createTimelineVersion,
    upsertEventDayVendorStatus,
    createEventDayIssue,
    updateEventDayIssue,
    createCommunicationThread,
    addCommunicationMessage,
    ensurePostEventCloseout,
  } = useEaseEventsStore();
  const event = data.events.find((item) => item.id === eventId);
  const [now, setNow] = React.useState(() => new Date());
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [queue, setQueue] = React.useState<EventDayMutation[]>(() =>
    event ? loadEventDayMutationQueue(event.id) : [],
  );
  const [timelineOverrides, setTimelineOverrides] = React.useState<
    Record<string, Partial<TimelineItem>>
  >({});
  const [vendorOverrides, setVendorOverrides] = React.useState<
    Record<string, Partial<EventDayVendorStatusRecord>>
  >({});
  const [localIssues, setLocalIssues] = React.useState<EventDayIssue[]>([]);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);
  const [quickNote, setQuickNote] = React.useState("");

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    function updateOnlineState() {
      setIsOnline(navigator.onLine);
    }
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  React.useEffect(() => {
    if (!event || !isOnline) return;
    const interval = window.setInterval(() => void refreshData(), 30_000);
    return () => window.clearInterval(interval);
  }, [event, isOnline, refreshData]);

  if (!event) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Event not found"
        description="This event-day command center cannot be loaded."
      />
    );
  }

  const project = data.projects.find(
    (item) => item.eventId === event.id || item.id === event.projectId,
  );
  const eventTeam = data.eventTeamMembers.filter((member) => member.eventId === event.id);
  const eventVendors = data.eventVendors.filter((assignment) => assignment.eventId === event.id);
  const timelineItems = data.timelineItems
    .filter((item) => item.eventId === event.id)
    .map((item) => ({ ...item, ...timelineOverrides[item.id] }));
  const vendorStatuses = data.eventDayVendorStatuses
    .filter((status) => status.eventId === event.id)
    .map((status) => ({ ...status, ...vendorOverrides[status.eventVendorId] }));
  const issues = [
    ...localIssues,
    ...data.eventDayIssues.filter((issue) => issue.eventId === event.id),
  ].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  const commandData = {
    ...data,
    timelineItems: data.timelineItems.map((item) =>
      item.eventId === event.id ? { ...item, ...timelineOverrides[item.id] } : item,
    ),
    eventDayVendorStatuses: [
      ...vendorStatuses,
      ...data.eventDayVendorStatuses.filter((status) => status.eventId !== event.id),
    ],
    eventDayIssues: issues,
  };
  const command = buildEventDayCommandState(commandData, event, now);
  const openIssues = issues.filter(isOpenIssue);
  const vendorsNotArrived = eventVendors.filter((assignment) => {
    const status = getVendorStatus(vendorStatuses, assignment);
    return (
      !status || !["Arrived", "Setting Up", "Ready", "Active", "Completed"].includes(status.status)
    );
  });
  const keyFiles = data.files.filter(
    (file) =>
      (file.eventId === event.id || (project?.id && file.projectId === project.id)) &&
      file.visibility !== "Client",
  );

  function syncQueueState(nextQueue: EventDayMutation[]) {
    saveEventDayMutationQueue(event.id, nextQueue);
    setQueue(nextQueue);
  }

  function queueLocalMutation(
    mutation: Omit<
      EventDayMutation,
      "organizationId" | "eventId" | "localOperationId" | "createdAt" | "retryCount" | "syncStatus"
    >,
  ) {
    const queued = queueEventDayMutation({
      organizationId: event.organizationId,
      eventId: event.id,
      ...mutation,
    });
    setQueue(loadEventDayMutationQueue(event.id));
    return queued;
  }

  async function updateTimelineStatus(item: TimelineItem, status: TimelineItem["status"]) {
    const timestamp = new Date().toISOString();
    const patch: Partial<TimelineItem> = {
      status,
      updatedById: currentUser?.id,
      actualStartAt:
        status === "In Progress" ? (item.actualStartAt ?? timestamp) : item.actualStartAt,
      actualEndAt: ["Completed", "Complete", "Skipped", "Cancelled"].includes(status)
        ? timestamp
        : item.actualEndAt,
      completedAt: ["Completed", "Complete"].includes(status) ? timestamp : item.completedAt,
      completedById: ["Completed", "Complete"].includes(status)
        ? currentUser?.id
        : item.completedById,
      delayMinutes: status === "Delayed" ? Math.max(item.delayMinutes ?? 0, 10) : item.delayMinutes,
      statusReason:
        status === "Delayed"
          ? (item.statusReason ?? "Marked delayed from Event-Day Command Mode")
          : status === "Blocked"
            ? (item.statusReason ?? "Marked blocked from Event-Day Command Mode")
            : item.statusReason,
    };
    setTimelineOverrides((current) => ({
      ...current,
      [item.id]: { ...current[item.id], ...patch },
    }));

    if (!isOnline || persistenceMode !== "supabase") {
      queueLocalMutation({
        entityType: "timeline",
        entityId: item.id,
        operationType: "update-status",
        payload: patch as Record<string, unknown>,
        expectedVersion: item.versionNumber,
      });
      return;
    }

    await updateTimelineItem(item.id, { ...timelineInputFromItem(item), ...patch });
  }

  async function pinCurrent(item: TimelineItem) {
    const patch = {
      pinnedCurrentAt: new Date().toISOString(),
      pinnedCurrentById: currentUser?.id,
    };
    setTimelineOverrides((current) => ({
      ...current,
      [item.id]: { ...current[item.id], ...patch },
    }));
    if (!isOnline || persistenceMode !== "supabase") {
      queueLocalMutation({
        entityType: "timeline",
        entityId: item.id,
        operationType: "pin-current",
        payload: patch,
        expectedVersion: item.versionNumber,
      });
      return;
    }
    await updateTimelineItem(item.id, { ...timelineInputFromItem(item), ...patch });
  }

  async function upsertVendorStatus(assignment: EventVendor, status: EventDayVendorStatus) {
    const existing = getVendorStatus(vendorStatuses, assignment);
    const payload = {
      projectId: project?.id,
      eventId: event.id,
      eventVendorId: assignment.id,
      vendorId: assignment.vendorId,
      status,
      checkedInById: ["Arrived", "Setting Up", "Ready"].includes(status)
        ? currentUser?.id
        : existing?.checkedInById,
      checkedInAt: status === "Arrived" ? new Date().toISOString() : existing?.checkedInAt,
      delayMinutes:
        status === "Delayed"
          ? Math.max(existing?.delayMinutes ?? 0, 10)
          : (existing?.delayMinutes ?? 0),
      notes: existing?.notes,
      metadata: { source: "event-day-command" },
    };
    setVendorOverrides((current) => ({
      ...current,
      [assignment.id]: {
        id: existing?.id ?? `local-${assignment.id}`,
        organizationId: event.organizationId,
        ...payload,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));

    if (!isOnline || persistenceMode !== "supabase") {
      queueLocalMutation({
        entityType: "vendor",
        entityId: assignment.id,
        operationType: "vendor-status",
        payload,
      });
      return;
    }
    await upsertEventDayVendorStatus(payload);
  }

  async function createIssue(input: {
    title: string;
    type: EventDayIssueType;
    severity: EventDayIssueSeverity;
    timelineItemId?: string;
    vendorId?: string;
    description?: string;
  }) {
    const payload = {
      projectId: project?.id,
      eventId: event.id,
      reportedById: currentUser?.id,
      status: "Open" as const,
      openedAt: new Date().toISOString(),
      idempotencyKey:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `event-day-issue-${crypto.randomUUID()}`
          : `event-day-issue-${Date.now()}`,
      metadata: { source: "event-day-command" },
      ...input,
    };

    if (!isOnline || persistenceMode !== "supabase") {
      const localIssue: EventDayIssue = {
        id: payload.idempotencyKey,
        organizationId: event.organizationId,
        ...payload,
        createdAt: payload.openedAt,
        updatedAt: payload.openedAt,
      };
      setLocalIssues((current) => [localIssue, ...current]);
      queueLocalMutation({
        entityType: "issue",
        entityId: localIssue.id,
        operationType: "create-issue",
        payload,
      });
      return;
    }

    await createEventDayIssue(payload);
  }

  async function resolveIssue(issue: EventDayIssue) {
    const payload = {
      projectId: issue.projectId,
      eventId: issue.eventId,
      timelineItemId: issue.timelineItemId,
      vendorId: issue.vendorId,
      reportedById: issue.reportedById,
      assignedToId: issue.assignedToId,
      type: issue.type,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      status: "Resolved" as const,
      resolution: issue.resolution ?? "Resolved from Event-Day Command Mode",
      openedAt: issue.openedAt,
      resolvedAt: new Date().toISOString(),
      metadata: issue.metadata,
      idempotencyKey: issue.idempotencyKey,
    };

    if (!isOnline || persistenceMode !== "supabase") {
      setLocalIssues((current) =>
        current.map((item) => (item.id === issue.id ? { ...item, ...payload } : item)),
      );
      queueLocalMutation({
        entityType: "issue",
        entityId: issue.id,
        operationType: "resolve-issue",
        payload,
      });
      return;
    }
    await updateEventDayIssue(issue.id, payload);
  }

  async function markReadyOrActivate(status: "Ready" | "Active" | "Paused" | "Completed") {
    setIsBusy(true);
    try {
      let activeTimelineVersionId = command.session?.activeTimelineVersionId;
      if (
        status === "Active" &&
        !activeTimelineVersionId &&
        isOnline &&
        persistenceMode === "supabase"
      ) {
        const versionNumber =
          Math.max(
            0,
            ...data.timelineVersions
              .filter((version) => version.eventId === event.id)
              .map((version) => version.versionNumber),
          ) + 1;
        const version = await createTimelineVersion({
          projectId: project?.id,
          eventId: event.id,
          versionNumber,
          status: "Finalized",
          finalizedById: currentUser?.id,
          finalizedAt: new Date().toISOString(),
          changeReason: "Activated Event-Day Command Mode",
          snapshot: buildTimelineSnapshot(timelineItems),
          metadata: { source: "event-day-command" },
        });
        activeTimelineVersionId = version.id;
      }

      const payload = {
        projectId: project?.id,
        eventId: event.id,
        status,
        eventDayLeadId: command.session?.eventDayLeadId ?? currentUser?.id,
        activeTimelineVersionId,
        activatedById: status === "Active" ? currentUser?.id : command.session?.activatedById,
        activatedAt:
          status === "Active"
            ? (command.session?.activatedAt ?? new Date().toISOString())
            : command.session?.activatedAt,
        pausedAt: status === "Paused" ? new Date().toISOString() : command.session?.pausedAt,
        completedById: status === "Completed" ? currentUser?.id : command.session?.completedById,
        completedAt:
          status === "Completed" ? new Date().toISOString() : command.session?.completedAt,
        unresolvedWarnings: command.readinessChecks.filter((check) => check.status !== "complete"),
        readinessOverrides:
          command.requiredBlockers.length && status === "Active"
            ? [
                {
                  by: currentUser?.id,
                  at: new Date().toISOString(),
                  reason: "Planner acknowledged blockers during activation.",
                  blockers: command.requiredBlockers.map((check) => check.id),
                },
              ]
            : (command.session?.readinessOverrides ?? []),
        offlineManifest: command.session?.offlineManifest ?? {},
        metadata: { source: "event-day-command" },
      };

      if (!isOnline || persistenceMode !== "supabase") {
        queueLocalMutation({
          entityType: "session",
          entityId: command.session?.id,
          operationType: "session-status",
          payload,
        });
      } else {
        await upsertEventDaySession(payload);
      }

      if (status === "Completed" && project?.id) {
        await ensurePostEventCloseout({
          projectId: project.id,
          eventId: event.id,
          ownerId: project.ownerId ?? currentUser?.id,
          eventCompletedAt: payload.completedAt,
          metadata: { source: "event_day_completion" },
        });
      }
      await refreshData();
    } finally {
      setIsBusy(false);
    }
  }

  function prepareOffline() {
    saveEventDayOfflineCache({
      organizationId: event.organizationId,
      eventId: event.id,
      downloadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      event: {
        id: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
      },
      timelineItems,
      teamMembers: eventTeam,
      eventVendors,
      vendorStatuses,
      issues,
    });
  }

  async function syncQueuedChanges() {
    if (!isOnline || !queue.length) return;
    setIsSyncing(true);
    const remaining: EventDayMutation[] = [];
    for (const mutation of queue) {
      try {
        if (mutation.entityType === "timeline" && mutation.entityId) {
          const item = timelineItems.find((candidate) => candidate.id === mutation.entityId);
          if (item)
            await updateTimelineItem(item.id, {
              ...timelineInputFromItem(item),
              ...mutation.payload,
            });
        } else if (mutation.entityType === "vendor") {
          await upsertEventDayVendorStatus(
            mutation.payload as Parameters<typeof upsertEventDayVendorStatus>[0],
          );
        } else if (mutation.entityType === "issue" && mutation.operationType === "create-issue") {
          await createEventDayIssue(mutation.payload as Parameters<typeof createEventDayIssue>[0]);
        } else if (mutation.entityType === "issue" && mutation.entityId) {
          await updateEventDayIssue(
            mutation.entityId,
            mutation.payload as Parameters<typeof updateEventDayIssue>[1],
          );
        } else if (mutation.entityType === "session") {
          await upsertEventDaySession(
            mutation.payload as Parameters<typeof upsertEventDaySession>[0],
          );
        }
      } catch (error) {
        remaining.push({
          ...mutation,
          retryCount: mutation.retryCount + 1,
          syncStatus: "Sync failed",
          lastError: error instanceof Error ? error.message : "Unable to sync change.",
        });
      }
    }
    syncQueueState(remaining);
    if (!remaining.length) {
      setTimelineOverrides({});
      setVendorOverrides({});
      setLocalIssues([]);
    }
    await refreshData();
    setIsSyncing(false);
  }

  async function addInternalNote() {
    if (!quickNote.trim()) return;
    const threadInput: Omit<CommunicationThread, "id" | "organizationId"> = {
      projectId: project?.id,
      leadId: event.leadId,
      eventId: event.id,
      assignedToId: currentUser?.id,
      subject: `${event.eventName} event-day notes`,
      clientName: event.clientName,
      participants: [currentUser?.email ?? ""].filter(Boolean),
      channel: "Meeting",
      status: "Closed",
      integrationSource: "event-day-command",
      preview: quickNote,
      unreadCount: 0,
      lastActivityAt: new Date().toISOString(),
    };
    const thread = await createCommunicationThread(threadInput);
    await addCommunicationMessage({
      projectId: project?.id,
      leadId: event.leadId,
      threadId: thread.id,
      eventId: event.id,
      authorId: currentUser?.id,
      direction: "Internal",
      body: quickNote,
      summary: "Event-day internal note",
      visibility: "Internal",
      sentAt: new Date().toISOString(),
    });
    setQuickNote("");
  }

  const lead = eventTeam.find((member) => member.userId === command.session?.eventDayLeadId);
  const leadUser = data.users.find(
    (user) => user.id === lead?.userId || user.id === command.session?.eventDayLeadId,
  );

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Event-Day Command Mode"
        title={event.eventName}
        description={`${formatDate(event.eventDate)} · ${event.startTime}-${event.endTime} · ${event.location}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ConnectionBadge isOnline={isOnline} queueCount={queue.length} isSyncing={isSyncing} />
            <Button
              variant="outline"
              onClick={() =>
                printRunSheet({
                  event,
                  timelineItems,
                  team: eventTeam,
                  vendors: data.vendors,
                  eventVendors,
                  vendorStatuses,
                  users: data.users,
                })
              }
            >
              <Printer className="h-4 w-4" />
              Print run sheet
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mode</p>
            <div className="mt-2">
              <StatusBadge value={command.session?.status ?? "Preview"} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lead</p>
            <p className="mt-2 font-semibold text-slate-950">
              {leadUser?.fullName ?? currentUser?.fullName ?? "Unassigned"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Open issues
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{openIssues.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Vendors not arrived
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{vendorsNotArrived.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-0 z-20 mt-4 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-2">
          <TimelineCard
            event={event}
            item={command.currentItem}
            ownerName={
              data.users.find((user) => user.id === command.currentItem?.ownerId)?.fullName
            }
            vendorName={
              command.currentItem?.vendorAssignmentId
                ? getVendorName(
                    data.vendors,
                    eventVendors.find(
                      (assignment) => assignment.id === command.currentItem?.vendorAssignmentId,
                    )?.vendorId ?? "",
                  )
                : undefined
            }
            onStatus={(item, status) => void updateTimelineStatus(item, status)}
            onPin={(item) => void pinCurrent(item)}
          />
          <TimelineCard
            event={event}
            item={command.nextItem}
            ownerName={data.users.find((user) => user.id === command.nextItem?.ownerId)?.fullName}
            isCompact
            onStatus={(item, status) => void updateTimelineStatus(item, status)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <main className="space-y-6">
          {command.lateItems.length ||
          command.blockedItems.length ||
          command.delayedItems.length ? (
            <Card className="rounded-lg border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-amber-950">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-semibold">Needs attention</p>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <StatusBadge value={`${command.lateItems.length} late`} />
                  <StatusBadge value={`${command.blockedItems.length} blocked`} />
                  <StatusBadge value={`${command.delayedItems.length} delayed`} />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Live run of show
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelineItems.length ? (
                timelineItems.map((item) => (
                  <TimelineCard
                    key={item.id}
                    event={event}
                    item={item}
                    ownerName={data.users.find((user) => user.id === item.ownerId)?.fullName}
                    vendorName={
                      item.vendorAssignmentId
                        ? getVendorName(
                            data.vendors,
                            eventVendors.find(
                              (assignment) => assignment.id === item.vendorAssignmentId,
                            )?.vendorId ?? "",
                          )
                        : undefined
                    }
                    isCompact
                    onStatus={(timelineItem, status) =>
                      void updateTimelineStatus(timelineItem, status)
                    }
                    onPin={(timelineItem) => void pinCurrent(timelineItem)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Clock}
                  title="No run of show"
                  description="Add timeline items in the event workspace before event day."
                />
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-6">
          <ReadinessChecklist
            checks={command.readinessChecks}
            isBusy={isBusy}
            onReady={() => void markReadyOrActivate("Ready")}
            onActivate={() => void markReadyOrActivate("Active")}
          />

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg tracking-normal text-slate-950">
                Offline package
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-slate-600">
                Cache this event’s run of show, team, vendor contacts, issues, and selected file
                metadata on this device.
              </p>
              <div className="grid gap-2">
                <Button variant="outline" onClick={prepareOffline}>
                  <Download className="h-4 w-4" />
                  Prepare for offline
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    clearEventDayOfflineCache(event.id);
                    syncQueueState([]);
                  }}
                >
                  <Archive className="h-4 w-4" />
                  Remove local event data
                </Button>
                <Button
                  onClick={() => void syncQueuedChanges()}
                  disabled={!isOnline || !queue.length || isSyncing}
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry queued changes
                </Button>
              </div>
              {queue.length ? (
                <div className="space-y-2">
                  {queue.slice(0, 4).map((item) => (
                    <div
                      key={item.localOperationId}
                      className="rounded-md bg-slate-50 p-2 text-xs text-slate-600"
                    >
                      {item.operationType} · {item.syncStatus}
                      {item.lastError ? (
                        <span className="block text-rose-700">{item.lastError}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <VendorCommandPanel
            eventVendors={eventVendors}
            vendors={data.vendors}
            statuses={vendorStatuses}
            onStatus={(assignment, status) => void upsertVendorStatus(assignment, status)}
          />

          <TeamCommandPanel team={eventTeam} users={data.users} timelineItems={timelineItems} />
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <IssuePanel
          issues={issues}
          timelineItems={timelineItems}
          vendors={data.vendors}
          onCreate={(input) => void createIssue(input)}
          onResolve={(issue) => void resolveIssue(issue)}
        />
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Quick notes and files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-day-note">Internal note</Label>
              <Textarea
                id="event-day-note"
                value={quickNote}
                onChange={(event) => setQuickNote(event.target.value)}
                placeholder="Decision, client request, vendor update, or post-event follow-up..."
                rows={4}
              />
              <Button onClick={() => void addInternalNote()} disabled={!quickNote.trim()}>
                <MessageSquare className="h-4 w-4" />
                Save to communications
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Event-day files
              </p>
              {keyFiles.length ? (
                keyFiles.slice(0, 6).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <StatusBadge value="Online only" />
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">
                  No internal event-day files yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Button asChild variant="outline">
          <a href={eventHref(event.id)}>
            <ExternalLink className="h-4 w-4" />
            Back to event workspace
          </a>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void markReadyOrActivate("Paused")}>
            Pause mode
          </Button>
          <Button onClick={() => void markReadyOrActivate("Completed")}>
            <CheckCircle2 className="h-4 w-4" />
            Complete Event-Day Mode
          </Button>
        </div>
      </div>
    </div>
  );
}
