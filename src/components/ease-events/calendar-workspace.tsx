import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  UserRound,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCalendarProjection,
  filterCalendarEntries,
  getCalendarEntryContext,
  getCalendarGridDays,
  getCalendarRange,
  getProjectHref,
  isSameDate,
  type CalendarFilters,
  type CalendarViewMode,
} from "@/lib/ease-events/calendar";
import { formatDate, formatDateTime } from "@/lib/ease-events/calculations";
import { syncCalendar } from "@/lib/ease-events/integrations";
import { useEaseEventsStore } from "@/lib/ease-events/store";
import type {
  CalendarEntry,
  CalendarEntryCategory,
  CalendarEntryVisibility,
  ConnectedAccount,
  MeetingRecord,
  MeetingType,
  TaskPriority,
  TimelineItemStatus,
} from "@/lib/ease-events/types";
import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./app-shell";
import { StatusBadge } from "./status-badge";

const calendarViewStorageKey = "ease-events-calendar-view";
const calendarFiltersStorageKey = "ease-events-calendar-filters";

const viewLabels: Record<CalendarViewMode, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
  agenda: "Agenda",
};

const categoryOptions: CalendarEntryCategory[] = [
  "Event",
  "Consultation",
  "Client meeting",
  "Internal meeting",
  "Task deadline",
  "Approval deadline",
  "Proposal expiration",
  "Invoice deadline",
  "Expense deadline",
  "Run of show",
  "Reminder",
  "External-only",
];

const visibilityOptions: CalendarEntryVisibility[] = ["Internal", "Client", "Vendor", "Public"];

const categoryStyles: Record<CalendarEntryCategory, string> = {
  Event: "border-emerald-200 bg-emerald-50 text-emerald-950",
  Consultation: "border-sky-200 bg-sky-50 text-sky-950",
  "Client meeting": "border-blue-200 bg-blue-50 text-blue-950",
  "Internal meeting": "border-slate-200 bg-slate-50 text-slate-950",
  "Task deadline": "border-amber-200 bg-amber-50 text-amber-950",
  "Approval deadline": "border-violet-200 bg-violet-50 text-violet-950",
  "Proposal expiration": "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950",
  "Invoice deadline": "border-rose-200 bg-rose-50 text-rose-950",
  "Expense deadline": "border-orange-200 bg-orange-50 text-orange-950",
  "Run of show": "border-cyan-200 bg-cyan-50 text-cyan-950",
  Reminder: "border-yellow-200 bg-yellow-50 text-yellow-950",
  "External-only": "border-slate-300 bg-white text-slate-950",
};

const categoryIcons: Record<CalendarEntryCategory, React.ElementType> = {
  Event: CalendarDays,
  Consultation: Video,
  "Client meeting": Video,
  "Internal meeting": UserRound,
  "Task deadline": ListChecks,
  "Approval deadline": CheckCircle2,
  "Proposal expiration": CalendarClock,
  "Invoice deadline": CalendarClock,
  "Expense deadline": CalendarClock,
  "Run of show": Clock,
  Reminder: AlertTriangle,
  "External-only": ExternalLink,
};

function readStoredView(): CalendarViewMode {
  if (typeof window === "undefined") return "month";
  const stored = window.localStorage.getItem(calendarViewStorageKey);
  return stored === "month" || stored === "week" || stored === "day" || stored === "agenda"
    ? stored
    : "month";
}

function readStoredFilters(): CalendarFilters {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(calendarFiltersStorageKey) ?? "{}");
  } catch {
    return {};
  }
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTimeLabel(value: string) {
  if (!value) return "Anytime";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRangeLabel(start: Date, end: Date, view: CalendarViewMode) {
  if (view === "day") return formatDate(toDateInputValue(start));
  if (view === "month") {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(start);
  }
  return `${formatDate(toDateInputValue(start))} - ${formatDate(toDateInputValue(end))}`;
}

function sameDayEntries(entries: CalendarEntry[], day: Date) {
  return entries.filter((entry) => isSameDate(new Date(entry.startAt), day));
}

function shiftAnchor(anchor: Date, view: CalendarViewMode, direction: number) {
  const next = new Date(anchor);
  if (view === "month") next.setMonth(next.getMonth() + direction);
  else if (view === "week") next.setDate(next.getDate() + direction * 7);
  else next.setDate(next.getDate() + direction);
  return next;
}

function combineDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function splitDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  return {
    date: toDateInputValue(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
      2,
      "0",
    )}`,
  };
}

function toggleArrayValue<T>(values: T[] | undefined, value: T) {
  const current = values ?? [];
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function activeFilterCount(filters: CalendarFilters) {
  return [
    filters.query,
    filters.ownerIds,
    filters.projectIds,
    filters.clientIds,
    filters.eventIds,
    filters.categories,
    filters.statuses,
    filters.visibility,
    filters.providers,
    filters.syncStates,
  ].reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length;
    return count + (value ? 1 : 0);
  }, 0);
}

function sourceStatus(entry: CalendarEntry) {
  if (entry.externalProvider) return `${entry.externalProvider} · ${entry.syncStatus ?? "Synced"}`;
  return entry.syncStatus ?? "EaseEvents";
}

function eventDayHref(eventId: string) {
  return `/ease-events/events/${eventId}/event-day`;
}

function CalendarEntryPill({
  entry,
  onClick,
  compact = false,
}: {
  entry: CalendarEntry;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = categoryIcons[entry.category];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border px-2 py-1.5 text-left text-xs shadow-sm transition hover:-translate-y-px hover:shadow",
        categoryStyles[entry.category],
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
        <span className="truncate font-semibold">{entry.title}</span>
      </span>
      {!compact ? (
        <span className="mt-1 block truncate text-[11px] opacity-75">
          {entry.allDay ? "All day" : getTimeLabel(entry.startAt)} · {entry.category}
        </span>
      ) : null}
    </button>
  );
}

function FilterCheckbox<T extends string>({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function SyncHealthCard({
  accounts,
  onSync,
  busy,
}: {
  accounts: ConnectedAccount[];
  onSync: () => void;
  busy: boolean;
}) {
  const errorAccounts = accounts.filter((account) => account.status === "Error");
  const staleAccounts = accounts.filter((account) => !account.lastCalendarSyncedAt);
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base tracking-normal text-slate-950">Sync health</CardTitle>
          <Button variant="outline" size="sm" onClick={onSync} disabled={busy || !accounts.length}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {accounts.length ? (
          accounts.map((account) => (
            <div key={account.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-950">
                  {account.provider === "google" ? "Google Calendar" : "Microsoft Calendar"}
                </p>
                <StatusBadge value={account.status} />
              </div>
              <p className="mt-1 text-slate-500">{account.providerAccountEmail}</p>
              <p className="mt-1 text-xs text-slate-500">
                Last synced:{" "}
                {account.lastCalendarSyncedAt
                  ? formatDateTime(account.lastCalendarSyncedAt)
                  : "Never"}
              </p>
              {account.lastError ? (
                <p className="mt-2 text-xs text-rose-700">{account.lastError}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-slate-500">
            Connect Google or Microsoft under Communications to sync.
          </p>
        )}
        {errorAccounts.length || staleAccounts.length ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {errorAccounts.length} account error(s), {staleAccounts.length} account(s) not synced
            yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CalendarFiltersPanel({
  filters,
  setFilters,
  ownerOptions,
  projectOptions,
  clientOptions,
  eventOptions,
  statusOptions,
}: {
  filters: CalendarFilters;
  setFilters: React.Dispatch<React.SetStateAction<CalendarFilters>>;
  ownerOptions: Array<{ id: string; label: string }>;
  projectOptions: Array<{ id: string; label: string }>;
  clientOptions: Array<{ id: string; label: string }>;
  eventOptions: Array<{ id: string; label: string }>;
  statusOptions: string[];
}) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base tracking-normal text-slate-950">Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="calendar-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="calendar-search"
              value={filters.query ?? ""}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value || undefined }))
              }
              className="pl-9"
              placeholder="Client, project, task, invoice..."
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Entry type
          </p>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {categoryOptions.map((category) => (
              <FilterCheckbox
                key={category}
                id={`category-${category}`}
                label={category}
                checked={Boolean(filters.categories?.includes(category))}
                onChange={() =>
                  setFilters((current) => ({
                    ...current,
                    categories: toggleArrayValue(current.categories, category),
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Planner
            </p>
            {ownerOptions.map((owner) => (
              <FilterCheckbox
                key={owner.id}
                id={`owner-${owner.id}`}
                label={owner.label}
                checked={Boolean(filters.ownerIds?.includes(owner.id))}
                onChange={() =>
                  setFilters((current) => ({
                    ...current,
                    ownerIds: toggleArrayValue(current.ownerIds, owner.id),
                  }))
                }
              />
            ))}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Visibility
            </p>
            {visibilityOptions.map((visibility) => (
              <FilterCheckbox
                key={visibility}
                id={`visibility-${visibility}`}
                label={visibility}
                checked={Boolean(filters.visibility?.includes(visibility))}
                onChange={() =>
                  setFilters((current) => ({
                    ...current,
                    visibility: toggleArrayValue(current.visibility, visibility),
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="project-filter">Project</Label>
            <select
              id="project-filter"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.projectIds?.[0] ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  projectIds: event.target.value ? [event.target.value] : undefined,
                }))
              }
            >
              <option value="">All projects</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-filter">Client</Label>
            <select
              id="client-filter"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.clientIds?.[0] ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  clientIds: event.target.value ? [event.target.value] : undefined,
                }))
              }
            >
              <option value="">All clients</option>
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-filter">Event</Label>
            <select
              id="event-filter"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.eventIds?.[0] ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  eventIds: event.target.value ? [event.target.value] : undefined,
                }))
              }
            >
              <option value="">All events</option>
              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Source
            </p>
            {[
              { id: "easeevents", label: "EaseEvents" },
              { id: "google", label: "Google" },
              { id: "microsoft", label: "Microsoft" },
            ].map((provider) => (
              <FilterCheckbox
                key={provider.id}
                id={`provider-${provider.id}`}
                label={provider.label}
                checked={Boolean(filters.providers?.includes(provider.id as "easeevents"))}
                onChange={() =>
                  setFilters((current) => ({
                    ...current,
                    providers: toggleArrayValue(
                      current.providers,
                      provider.id as "easeevents" | "google" | "microsoft",
                    ),
                  }))
                }
              />
            ))}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sync state
            </p>
            {[
              { id: "synced", label: "Synced" },
              { id: "unsynced", label: "Unsynced" },
              { id: "failed", label: "Failed/retry" },
            ].map((syncState) => (
              <FilterCheckbox
                key={syncState.id}
                id={`sync-${syncState.id}`}
                label={syncState.label}
                checked={Boolean(filters.syncStates?.includes(syncState.id as "synced"))}
                onChange={() =>
                  setFilters((current) => ({
                    ...current,
                    syncStates: toggleArrayValue(
                      current.syncStates,
                      syncState.id as "synced" | "unsynced" | "failed",
                    ),
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <select
            id="status-filter"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.statuses?.[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                statuses: event.target.value ? [event.target.value] : undefined,
              }))
            }
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarMonthView({
  anchor,
  entries,
  onSelectEntry,
}: {
  anchor: Date;
  entries: CalendarEntry[];
  onSelectEntry: (entry: CalendarEntry) => void;
}) {
  const days = getCalendarGridDays(anchor);
  const today = new Date();
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="px-2 py-3">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7">
          {days.map((day) => {
            const dayEntries = sameDayEntries(entries, day);
            const isCurrentMonth = day.getMonth() === anchor.getMonth();
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[9rem] border-b border-slate-100 p-3 md:border-r",
                  !isCurrentMonth && "bg-slate-50 text-slate-400",
                  isSameDate(day, today) && "bg-amber-50/60",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{day.getDate()}</span>
                  {dayEntries.length ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {dayEntries.length}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  {dayEntries.slice(0, 4).map((entry) => (
                    <CalendarEntryPill
                      key={entry.id}
                      entry={entry}
                      onClick={() => onSelectEntry(entry)}
                      compact
                    />
                  ))}
                  {dayEntries.length > 4 ? (
                    <p className="text-xs text-slate-500">+{dayEntries.length - 4} more</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarColumnView({
  days,
  entries,
  onSelectEntry,
}: {
  days: Date[];
  entries: CalendarEntry[];
  onSelectEntry: (entry: CalendarEntry) => void;
}) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-0 p-0 md:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
        {days.map((day) => {
          const dayEntries = sameDayEntries(entries, day);
          return (
            <section key={day.toISOString()} className="border-b border-slate-100 p-4 md:border-r">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day)}
                </p>
                <p className="text-lg font-semibold text-slate-950">
                  {formatDate(toDateInputValue(day))}
                </p>
              </div>
              <div className="space-y-2">
                {dayEntries.length ? (
                  dayEntries.map((entry) => (
                    <CalendarEntryPill
                      key={entry.id}
                      entry={entry}
                      onClick={() => onSelectEntry(entry)}
                    />
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                    No scheduled items
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CalendarAgendaView({
  entries,
  onSelectEntry,
}: {
  entries: CalendarEntry[];
  onSelectEntry: (entry: CalendarEntry) => void;
}) {
  if (!entries.length) {
    return (
      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <EmptyState
            icon={CalendarDays}
            title="No calendar items"
            description="Adjust filters, change date range, or sync a connected calendar."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="divide-y divide-slate-100 p-0">
        {entries.map((entry) => {
          const Icon = categoryIcons[entry.category];
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelectEntry(entry)}
              className="grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 md:grid-cols-[10rem_1fr_auto]"
            >
              <div>
                <p className="font-semibold text-slate-950">
                  {formatDate(entry.startAt.slice(0, 10))}
                </p>
                <p className="text-sm text-slate-500">
                  {entry.allDay
                    ? "All day"
                    : `${getTimeLabel(entry.startAt)} - ${getTimeLabel(entry.endAt)}`}
                </p>
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 flex-none text-slate-500" />
                  <p className="truncate font-semibold text-slate-950">{entry.title}</p>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {entry.description || entry.category}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-xs",
                    categoryStyles[entry.category],
                  )}
                >
                  {entry.category}
                </span>
                <StatusBadge value={entry.status} />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface CreateFormState {
  kind:
    | "Consultation"
    | "Client meeting"
    | "Internal meeting"
    | "Reminder"
    | "Task"
    | "Run of show";
  title: string;
  projectId: string;
  eventId: string;
  ownerId: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingType: MeetingType;
  connectedAccountId: string;
  attendees: string;
  description: string;
  status: TimelineItemStatus;
  priority: TaskPriority;
  visibility: CalendarEntryVisibility;
  fathomExpected: boolean;
}

function createInitialForm(date = new Date()): CreateFormState {
  return {
    kind: "Consultation",
    title: "",
    projectId: "",
    eventId: "",
    ownerId: "",
    date: toDateInputValue(date),
    startTime: "10:00",
    endTime: "10:30",
    meetingType: "Google Meet",
    connectedAccountId: "",
    attendees: "",
    description: "",
    status: "Planned",
    priority: "Medium",
    visibility: "Internal",
    fathomExpected: true,
  };
}

function CreateCalendarItemPanel({
  initialDate,
  onClose,
}: {
  initialDate: Date;
  onClose: () => void;
}) {
  const {
    data,
    createMeeting,
    createProjectReminder,
    createTask,
    createTimelineItem,
    refreshData,
  } = useEaseEventsStore();
  const [form, setForm] = React.useState(() => createInitialForm(initialDate));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const selectedEvent = data.events.find((event) => event.id === form.eventId);
  const selectedProject =
    data.projects.find((project) => project.id === form.projectId) ??
    data.projects.find((project) => project.eventId === form.eventId);
  const selectedClient = selectedEvent?.clientId
    ? data.clients.find((client) => client.id === selectedEvent.clientId)
    : selectedProject?.clientId
      ? data.clients.find((client) => client.id === selectedProject.clientId)
      : undefined;

  const connectedAccounts = data.connectedAccounts.filter((account) =>
    form.meetingType === "Google Meet"
      ? account.provider === "google"
      : form.meetingType === "Microsoft Teams"
        ? account.provider === "microsoft"
        : true,
  );

  React.useEffect(() => {
    if (!form.eventId || form.projectId) return;
    const event = data.events.find((item) => item.id === form.eventId);
    if (event?.projectId) setForm((current) => ({ ...current, projectId: event.projectId ?? "" }));
  }, [data.events, form.eventId, form.projectId]);

  React.useEffect(() => {
    if (!selectedClient?.email || form.attendees.trim()) return;
    setForm((current) => ({ ...current, attendees: selectedClient.email }));
  }, [form.attendees, selectedClient?.email]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!form.title.trim()) throw new Error("Add a title.");
      const startAt = combineDateTime(form.date, form.startTime);
      const endAt = combineDateTime(form.date, form.endTime);

      if (form.kind === "Reminder") {
        if (!form.projectId) throw new Error("Choose a project for the reminder.");
        await createProjectReminder({
          projectId: form.projectId,
          assignedToId: form.ownerId || undefined,
          title: form.title,
          dueAt: startAt,
          status: "Open",
          automationSource: "manual",
          metadata: { source: "calendar" },
        });
      } else if (form.kind === "Task") {
        if (!form.eventId) throw new Error("Choose an event for the task.");
        await createTask({
          projectId: selectedProject?.id,
          leadId: selectedProject?.leadId,
          eventId: form.eventId,
          ownerId: form.ownerId || undefined,
          title: form.title,
          description: form.description,
          dueDate: form.date,
          priority: form.priority,
        });
      } else if (form.kind === "Run of show") {
        if (!form.eventId) throw new Error("Choose an event for the run-of-show item.");
        await createTimelineItem({
          eventId: form.eventId,
          title: form.title,
          description: form.description,
          startTime: form.startTime,
          endTime: form.endTime,
          ownerId: form.ownerId || undefined,
          status: form.status,
          visibility: form.visibility === "Client" ? "Client" : "Internal",
          sortOrder: data.timelineItems.length + 1,
        });
      } else {
        if (!form.eventId) throw new Error("Choose an event for the meeting.");
        await createMeeting({
          projectId: selectedProject?.id,
          leadId: selectedProject?.leadId,
          eventId: form.eventId,
          title: form.title,
          meetingType: form.meetingType,
          status: "Scheduled",
          startAt,
          endAt,
          organizerId: form.ownerId || undefined,
          connectedAccountId: form.connectedAccountId || undefined,
          attendees: form.attendees
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          agenda: form.description,
          link: "",
          transcript: "",
          internalSummary: "",
          clientSummary: "",
          notes: "",
          actionItems: [],
          timezone: data.organization.timezone,
          syncStatus: form.connectedAccountId ? "Synced" : "Not Synced",
          fathomExpected: form.fathomExpected,
        });
      }

      await refreshData();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create calendar item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Create calendar item
          </CardTitle>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="calendar-create-kind">Type</Label>
              <select
                id="calendar-create-kind"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.kind}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kind: event.target.value as CreateFormState["kind"],
                  }))
                }
              >
                {[
                  "Consultation",
                  "Client meeting",
                  "Internal meeting",
                  "Reminder",
                  "Task",
                  "Run of show",
                ].map((kind) => (
                  <option key={kind}>{kind}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-create-title">Title</Label>
              <Input
                id="calendar-create-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Client consultation, final vendor check..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="calendar-create-event">Event</Label>
              <select
                id="calendar-create-event"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.eventId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventId: event.target.value }))
                }
              >
                <option value="">Select event</option>
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-create-project">Project</Label>
              <select
                id="calendar-create-project"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.projectId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, projectId: event.target.value }))
                }
              >
                <option value="">Select project</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="calendar-create-date">Date</Label>
              <Input
                id="calendar-create-date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-create-start">Start</Label>
              <Input
                id="calendar-create-start"
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startTime: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-create-end">End</Label>
              <Input
                id="calendar-create-end"
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endTime: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="calendar-create-owner">Owner</Label>
              <select
                id="calendar-create-owner"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.ownerId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ownerId: event.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {data.users
                  .filter((user) => user.role === "admin" || user.role === "planner")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
              </select>
            </div>
            {form.kind === "Task" ? (
              <div className="space-y-2">
                <Label htmlFor="calendar-create-priority">Priority</Label>
                <select
                  id="calendar-create-priority"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value as TaskPriority,
                    }))
                  }
                >
                  {["Low", "Medium", "High", "Urgent"].map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {form.kind === "Run of show" ? (
              <div className="space-y-2">
                <Label htmlFor="calendar-create-status">Status</Label>
                <select
                  id="calendar-create-status"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as TimelineItemStatus,
                    }))
                  }
                >
                  {["Planned", "Ready", "In Progress", "Complete", "Blocked"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {["Consultation", "Client meeting", "Internal meeting"].includes(form.kind) ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calendar-create-meeting-type">Meeting provider</Label>
                <select
                  id="calendar-create-meeting-type"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={form.meetingType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      meetingType: event.target.value as MeetingType,
                      connectedAccountId: "",
                    }))
                  }
                >
                  {["Google Meet", "Microsoft Teams", "Phone", "In Person"].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-create-account">Calendar account</Label>
                <select
                  id="calendar-create-account"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={form.connectedAccountId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, connectedAccountId: event.target.value }))
                  }
                >
                  <option value="">Save in EaseEvents only</option>
                  {connectedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.providerAccountEmail}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="calendar-create-attendees">Attendees</Label>
                <Input
                  id="calendar-create-attendees"
                  value={form.attendees}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, attendees: event.target.value }))
                  }
                  placeholder="client@example.com, planner@example.com"
                />
                {selectedClient?.email ? (
                  <p className="text-xs text-slate-500">Suggested client: {selectedClient.email}</p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm">
                <Checkbox
                  checked={form.fathomExpected}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, fathomExpected: Boolean(checked) }))
                  }
                />
                Fathom transcript expected
              </label>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="calendar-create-description">Agenda / details</Label>
            <Textarea
              id="calendar-create-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={4}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CalendarEntryDetails({ entry, onClose }: { entry: CalendarEntry; onClose: () => void }) {
  const {
    data,
    updateMeeting,
    updateTask,
    updateTimelineItem,
    updateProjectReminder,
    refreshData,
  } = useEaseEventsStore();
  const context = getCalendarEntryContext(data, entry);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editState, setEditState] = React.useState(() => {
    const start = splitDateTime(entry.startAt);
    const end = splitDateTime(entry.endAt);
    return {
      date: start.date,
      startTime: start.time,
      endTime: end.time,
    };
  });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const sourceRecord = React.useMemo(() => {
    if (entry.sourceType === "meeting")
      return data.meetings.find((item) => item.id === entry.sourceId);
    if (entry.sourceType === "task") return data.tasks.find((item) => item.id === entry.sourceId);
    if (entry.sourceType === "timeline")
      return data.timelineItems.find((item) => item.id === entry.sourceId);
    if (entry.sourceType === "reminder") {
      return data.projectReminders.find((item) => item.id === entry.sourceId);
    }
    return undefined;
  }, [data, entry.sourceId, entry.sourceType]);

  async function updateStatus(status: string) {
    setError(null);
    setBusy(status);
    try {
      if (entry.sourceType === "meeting" && sourceRecord) {
        const meeting = sourceRecord as MeetingRecord;
        await updateMeeting(meeting.id, {
          ...meeting,
          status: status as MeetingRecord["status"],
          syncStatus:
            meeting.externalEventId && status !== meeting.status
              ? "Retry Required"
              : meeting.syncStatus,
        });
      } else if (entry.sourceType === "task" && sourceRecord) {
        const task = sourceRecord as Exclude<typeof sourceRecord, undefined> & {
          status: "Done";
          priority: TaskPriority;
        };
        await updateTask(task.id, {
          projectId: task.projectId,
          leadId: task.leadId,
          eventId: task.eventId,
          ownerId: task.ownerId,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          status: "Done",
        });
      } else if (entry.sourceType === "timeline" && sourceRecord) {
        const item = sourceRecord as Exclude<typeof sourceRecord, undefined> & {
          status: TimelineItemStatus;
          eventId: string;
        };
        await updateTimelineItem(item.id, {
          eventId: item.eventId,
          title: item.title,
          description: item.description,
          startTime: item.startTime,
          endTime: item.endTime,
          ownerId: item.ownerId,
          dependsOnItemId: item.dependsOnItemId,
          status: "Complete",
          location: item.location,
          visibility: item.visibility,
          sortOrder: item.sortOrder,
        });
      } else if (entry.sourceType === "reminder" && sourceRecord) {
        const reminder = sourceRecord as Exclude<typeof sourceRecord, undefined> & {
          projectId: string;
        };
        await updateProjectReminder(reminder.id, {
          projectId: reminder.projectId,
          assignedToId: reminder.assignedToId,
          title: reminder.title,
          dueAt: reminder.dueAt,
          status: "Done",
          automationSource: reminder.automationSource,
          metadata: reminder.metadata,
        });
      }
      await refreshData();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update calendar item.");
    } finally {
      setBusy(null);
    }
  }

  async function reschedule() {
    setError(null);
    setBusy("reschedule");
    try {
      if (entry.sourceType === "meeting" && sourceRecord) {
        const meeting = sourceRecord as MeetingRecord;
        await updateMeeting(meeting.id, {
          ...meeting,
          startAt: combineDateTime(editState.date, editState.startTime),
          endAt: combineDateTime(editState.date, editState.endTime),
          syncStatus: meeting.externalEventId ? "Retry Required" : meeting.syncStatus,
        });
      } else if (entry.sourceType === "task" && sourceRecord) {
        const task = sourceRecord as Exclude<typeof sourceRecord, undefined> & {
          priority: TaskPriority;
          eventId: string;
        };
        await updateTask(task.id, {
          projectId: task.projectId,
          leadId: task.leadId,
          eventId: task.eventId,
          ownerId: task.ownerId,
          title: task.title,
          description: task.description,
          dueDate: editState.date,
          priority: task.priority,
          status: task.status,
        });
      } else if (entry.sourceType === "timeline" && sourceRecord) {
        const item = sourceRecord as Exclude<typeof sourceRecord, undefined> & {
          status: TimelineItemStatus;
          eventId: string;
        };
        await updateTimelineItem(item.id, {
          eventId: item.eventId,
          title: item.title,
          description: item.description,
          startTime: editState.startTime,
          endTime: editState.endTime,
          ownerId: item.ownerId,
          dependsOnItemId: item.dependsOnItemId,
          status: item.status,
          location: item.location,
          visibility: item.visibility,
          sortOrder: item.sortOrder,
        });
      } else if (entry.sourceType === "reminder" && sourceRecord) {
        const reminder = sourceRecord as Exclude<typeof sourceRecord, undefined> & {
          projectId: string;
        };
        await updateProjectReminder(reminder.id, {
          projectId: reminder.projectId,
          assignedToId: reminder.assignedToId,
          title: reminder.title,
          dueAt: combineDateTime(editState.date, editState.startTime),
          status: reminder.status,
          automationSource: reminder.automationSource,
          metadata: reminder.metadata,
        });
      }
      await refreshData();
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to reschedule calendar item.");
    } finally {
      setBusy(null);
    }
  }

  const Icon = categoryIcons[entry.category];
  const projectHref = getProjectHref(context.project);
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs",
                categoryStyles[entry.category],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {entry.category}
            </span>
            <CardTitle className="mt-3 text-xl tracking-normal text-slate-950">
              {entry.title}
            </CardTitle>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">When</p>
            <p className="mt-1 text-slate-950">
              {entry.allDay
                ? formatDate(entry.startAt.slice(0, 10))
                : `${formatDateTime(entry.startAt)} - ${getTimeLabel(entry.endAt)}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">{entry.timezone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Status
            </p>
            <div className="mt-1">
              <StatusBadge value={entry.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{sourceStatus(entry)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Project
            </p>
            <a href={projectHref} className="mt-1 block font-medium text-slate-950 hover:underline">
              {context.project?.name ?? context.event?.eventName ?? "Unassigned project"}
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Owner
            </p>
            <p className="mt-1 text-slate-950">{context.owner?.fullName ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Client
            </p>
            <p className="mt-1 text-slate-950">
              {context.client?.displayName ?? "No client linked"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Source
            </p>
            <p className="mt-1 text-slate-950">{entry.sourceType}</p>
          </div>
        </div>

        {entry.location ? (
          <p className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <MapPin className="h-4 w-4" />
            {entry.location}
          </p>
        ) : null}
        {entry.description ? (
          <p className="text-sm leading-6 text-slate-600">{entry.description}</p>
        ) : null}

        {isEditing ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="mb-3 font-semibold text-slate-950">Reschedule</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="reschedule-date">Date</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={editState.date}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-start">Start</Label>
                <Input
                  id="reschedule-start"
                  type="time"
                  value={editState.startTime}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-end">End</Label>
                <Input
                  id="reschedule-end"
                  type="time"
                  value={editState.endTime}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, endTime: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={reschedule} disabled={busy === "reschedule" || !entry.isEditable}>
                {busy === "reschedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={projectHref}>Open project</a>
          </Button>
          {context.event ? (
            <Button asChild>
              <a href={eventDayHref(context.event.id)}>
                <Radio className="h-4 w-4" />
                Open Event Day
              </a>
            </Button>
          ) : null}
          {entry.href ? (
            <Button asChild variant="outline">
              <a
                href={entry.href}
                target={entry.meetingUrl ? "_blank" : undefined}
                rel="noreferrer"
              >
                {entry.meetingUrl ? "Join meeting" : "Open source"}
              </a>
            </Button>
          ) : null}
          {entry.isEditable ? (
            <Button variant="outline" onClick={() => setIsEditing((current) => !current)}>
              Reschedule
            </Button>
          ) : null}
          {["meeting", "task", "timeline", "reminder"].includes(entry.sourceType) &&
          !["Done", "Complete", "Completed"].includes(entry.status) ? (
            <Button
              onClick={() => updateStatus(entry.sourceType === "meeting" ? "Completed" : "Done")}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Mark complete
            </Button>
          ) : null}
          {entry.sourceType === "meeting" && entry.status !== "Cancelled" ? (
            <Button variant="outline" onClick={() => updateStatus("Cancelled")}>
              Cancel meeting
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function CalendarWorkspace() {
  const { data, refreshData } = useEaseEventsStore();
  const [view, setView] = React.useState<CalendarViewMode>(() => readStoredView());
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [filters, setFilters] = React.useState<CalendarFilters>(() => readStoredFilters());
  const [showFilters, setShowFilters] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState<CalendarEntry | null>(null);
  const [syncBusy, setSyncBusy] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    window.localStorage.setItem(calendarViewStorageKey, view);
  }, [view]);

  React.useEffect(() => {
    window.localStorage.setItem(calendarFiltersStorageKey, JSON.stringify(filters));
  }, [filters]);

  const projection = React.useMemo(() => buildCalendarProjection(data), [data]);
  const range = React.useMemo(() => getCalendarRange(view, anchor), [anchor, view]);
  const visibleEntries = React.useMemo(
    () => filterCalendarEntries(projection.entries, filters, range.start, range.end),
    [filters, projection.entries, range.end, range.start],
  );
  const conflicts = React.useMemo(
    () =>
      projection.conflicts.filter((conflict) =>
        conflict.entryIds.some((id) => visibleEntries.some((entry) => entry.id === id)),
      ),
    [projection.conflicts, visibleEntries],
  );

  const todayEntries = React.useMemo(
    () => projection.entries.filter((entry) => isSameDate(new Date(entry.startAt), new Date())),
    [projection.entries],
  );
  const upcomingMeetings = projection.entries.filter(
    (entry) =>
      ["Consultation", "Client meeting", "Internal meeting"].includes(entry.category) &&
      new Date(entry.startAt).getTime() >= Date.now(),
  );
  const unsyncedEntries = projection.entries.filter((entry) =>
    ["Not Synced", "Sync Failed", "Retry Required"].includes(entry.syncStatus ?? ""),
  );
  const filterCount = activeFilterCount(filters);

  const ownerOptions = data.users
    .filter((user) => user.role === "admin" || user.role === "planner")
    .map((user) => ({ id: user.id, label: user.fullName }));
  const projectOptions = data.projects.map((project) => ({ id: project.id, label: project.name }));
  const clientOptions = data.clients.map((client) => ({
    id: client.id,
    label: client.displayName,
  }));
  const eventOptions = data.events.map((event) => ({ id: event.id, label: event.eventName }));
  const statusOptions = Array.from(new Set(projection.entries.map((entry) => entry.status))).sort();

  async function refreshAndSync() {
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const accounts = data.connectedAccounts.filter(
        (account) => account.provider === "google" || account.provider === "microsoft",
      );
      let created = 0;
      let updated = 0;
      for (const account of accounts) {
        const result = await syncCalendar(account.id);
        created += Number(result.createdMeetings ?? 0);
        updated += Number(result.updatedMeetings ?? 0);
      }
      await refreshData();
      setSyncMessage(
        accounts.length
          ? `Calendar sync complete: ${created} created, ${updated} refreshed.`
          : "No connected calendar accounts yet.",
      );
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Calendar sync failed.");
    } finally {
      setSyncBusy(false);
    }
  }

  const weekDays = React.useMemo(() => {
    const start = getCalendarRange("week", anchor).start;
    return Array.from({ length: view === "day" ? 1 : 7 }, (_, index) => {
      const day = new Date(view === "day" ? anchor : start);
      day.setDate(day.getDate() + index);
      return day;
    });
  }, [anchor, view]);

  return (
    <div>
      <PageHeader
        eyebrow="Unified Calendar"
        title="Calendar"
        description="One operational schedule for events, meetings, deadlines, run-of-show, reminders, and external sync."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowFilters((current) => !current)}>
              <Filter className="h-4 w-4" />
              Filters {filterCount ? `(${filterCount})` : ""}
            </Button>
            <Button variant="outline" onClick={refreshAndSync} disabled={syncBusy}>
              {syncBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh sync
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <MetricCard
          label="Today"
          value={`${todayEntries.length}`}
          helper="Items requiring attention"
          icon={CalendarClock}
        />
        <MetricCard
          label="Upcoming meetings"
          value={`${upcomingMeetings.length}`}
          helper="Consultations and calls"
          icon={Video}
        />
        <MetricCard
          label="Conflicts"
          value={`${conflicts.length}`}
          helper="Overlap, missing links, availability"
          icon={AlertTriangle}
          tone={conflicts.length ? "warn" : "good"}
        />
        <MetricCard
          label="Sync action"
          value={`${unsyncedEntries.length}`}
          helper="Unsynced or retry-required entries"
          icon={RefreshCw}
          tone={unsyncedEntries.length ? "warn" : "good"}
        />
      </div>

      <Card className="mt-6 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor(shiftAnchor(anchor, view, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnchor(shiftAnchor(anchor, view, 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={toDateInputValue(anchor)}
              onChange={(event) => setAnchor(new Date(`${event.target.value}T12:00:00`))}
              className="w-40"
              aria-label="Choose calendar date"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Visible range
            </p>
            <h2 className="truncate text-xl font-semibold text-slate-950">
              {formatRangeLabel(range.start, range.end, view)}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {(Object.keys(viewLabels) as CalendarViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={view === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setView(mode)}
              >
                {viewLabels[mode]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {syncMessage ? (
        <div
          className={cn(
            "mt-4 rounded-lg border p-3 text-sm",
            syncMessage.includes("failed")
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900",
          )}
        >
          {syncMessage}
        </div>
      ) : null}

      {conflicts.length ? (
        <Card className="mt-6 rounded-lg border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <p className="font-semibold text-amber-950">Schedule attention needed</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {conflicts.slice(0, 4).map((conflict) => (
                <button
                  key={conflict.id}
                  type="button"
                  onClick={() => {
                    const entry = visibleEntries.find((item) =>
                      conflict.entryIds.includes(item.id),
                    );
                    if (entry) setSelectedEntry(entry);
                  }}
                  className="rounded-md border border-amber-200 bg-white p-3 text-left text-sm"
                >
                  <p className="font-medium text-amber-950">{conflict.title}</p>
                  <p className="mt-1 text-amber-800">{conflict.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {showCreate ? (
            <CreateCalendarItemPanel initialDate={anchor} onClose={() => setShowCreate(false)} />
          ) : null}
          {selectedEntry ? (
            <CalendarEntryDetails entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
          ) : null}
          {view === "month" ? (
            <CalendarMonthView
              anchor={anchor}
              entries={visibleEntries}
              onSelectEntry={setSelectedEntry}
            />
          ) : view === "week" || view === "day" ? (
            <CalendarColumnView
              days={weekDays}
              entries={visibleEntries}
              onSelectEntry={setSelectedEntry}
            />
          ) : (
            <CalendarAgendaView entries={visibleEntries} onSelectEntry={setSelectedEntry} />
          )}
        </div>
        <aside className={cn("space-y-6", !showFilters && "hidden xl:block")}>
          <CalendarFiltersPanel
            filters={filters}
            setFilters={setFilters}
            ownerOptions={ownerOptions}
            projectOptions={projectOptions}
            clientOptions={clientOptions}
            eventOptions={eventOptions}
            statusOptions={statusOptions}
          />
          <SyncHealthCard
            accounts={data.connectedAccounts}
            onSync={refreshAndSync}
            busy={syncBusy}
          />
        </aside>
      </div>
    </div>
  );
}
