import * as React from "react";
import { toast } from "sonner";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Inbox,
  LinkIcon,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { formatDate, getInitials, isOverdueTask } from "@/lib/ease-events/calculations";
import { useEaseEventsStore } from "@/lib/ease-events/store";
import {
  taskPriorities,
  taskStatuses,
  taskVisibilities,
  type AppUser,
  type EaseEventsData,
  type EventFile,
  type TaskChecklist,
  type TaskChecklistItem,
  type TaskLabel,
  type TaskRecord,
  type TaskStatus,
  type TaskWorkflowColumn,
} from "@/lib/ease-events/types";
import { cn } from "@/lib/utils";

import { FileUploadPanel } from "./file-upload-panel";
import { PageHeader } from "./app-shell";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";

type WorkSection = "my" | "inbox" | "all" | "templates" | "archived";
type WorkView = "board" | "table";
type TaskDetailTab = "overview" | "checklist" | "files" | "links" | "comments" | "activity";

interface LocalSavedTaskView {
  id: string;
  name: string;
  scope: "private";
  viewType: WorkView;
  filters: Partial<TaskFilters>;
  createdAt: string;
}

interface TaskFilters {
  search: string;
  projectId: string;
  eventId: string;
  clientId: string;
  ownerId: string;
  assigneeId: string;
  status: string;
  priority: string;
  labelId: string;
  dueState: string;
  visibility: string;
  archivedState: string;
}

const emptyFilters: TaskFilters = {
  search: "",
  projectId: "",
  eventId: "",
  clientId: "",
  ownerId: "",
  assigneeId: "",
  status: "",
  priority: "",
  labelId: "",
  dueState: "",
  visibility: "",
  archivedState: "",
};

const taskDetailTabs: Array<{ id: TaskDetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "files", label: "Files" },
  { id: "links", label: "Links" },
  { id: "comments", label: "Comments" },
  { id: "activity", label: "Activity" },
];

const fallbackColumns: TaskWorkflowColumn[] = [
  {
    id: "fallback-backlog",
    organizationId: "demo",
    name: "Backlog",
    normalizedStatus: "Not Started",
    mappedTaskStatus: "To Do",
    sortOrder: 10,
    isDefault: true,
    isArchived: false,
    metadata: {},
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-todo",
    organizationId: "demo",
    name: "To Do",
    normalizedStatus: "Not Started",
    mappedTaskStatus: "To Do",
    sortOrder: 20,
    isDefault: true,
    isArchived: false,
    metadata: {},
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-progress",
    organizationId: "demo",
    name: "In Progress",
    normalizedStatus: "Active",
    mappedTaskStatus: "In Progress",
    sortOrder: 30,
    isDefault: true,
    isArchived: false,
    metadata: {},
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-waiting-client",
    organizationId: "demo",
    name: "Waiting on Client",
    normalizedStatus: "Waiting",
    mappedTaskStatus: "To Do",
    sortOrder: 40,
    isDefault: true,
    isArchived: false,
    metadata: { waitingKind: "client" },
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-waiting-vendor",
    organizationId: "demo",
    name: "Waiting on Vendor",
    normalizedStatus: "Waiting",
    mappedTaskStatus: "To Do",
    sortOrder: 45,
    isDefault: true,
    isArchived: false,
    metadata: { waitingKind: "vendor" },
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-blocked",
    organizationId: "demo",
    name: "Blocked",
    normalizedStatus: "Blocked",
    mappedTaskStatus: "Blocked",
    sortOrder: 60,
    isDefault: true,
    isArchived: false,
    metadata: {},
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-done",
    organizationId: "demo",
    name: "Done",
    normalizedStatus: "Completed",
    mappedTaskStatus: "Done",
    sortOrder: 70,
    isDefault: true,
    isArchived: false,
    metadata: {},
    createdAt: "",
    updatedAt: "",
  },
];

function getProjectName(data: EaseEventsData, task: TaskRecord) {
  const project = data.projects.find((item) => item.id === task.projectId);
  if (project) return project.name;
  const event = task.eventId ? data.events.find((item) => item.id === task.eventId) : undefined;
  return event?.eventName ?? "Internal work";
}

function getClientName(data: EaseEventsData, task: TaskRecord) {
  const event = task.eventId ? data.events.find((item) => item.id === task.eventId) : undefined;
  if (event?.clientId) {
    return (
      data.clients.find((client) => client.id === event.clientId)?.displayName ?? event.clientName
    );
  }
  const project = data.projects.find((item) => item.id === task.projectId);
  if (project?.clientId)
    return data.clients.find((client) => client.id === project.clientId)?.displayName;
  return event?.clientName;
}

function projectHref(task: TaskRecord) {
  if (task.eventId) return `/ease-events/events/${task.eventId}`;
  if (task.leadId) return `/ease-events/leads/${task.leadId}`;
  return "/ease-events/work";
}

function columnWaitingKind(column?: TaskWorkflowColumn) {
  const metadataKind = column?.metadata?.waitingKind;
  if (metadataKind === "client" || metadataKind === "vendor") return metadataKind;
  const name = column?.name.toLowerCase() ?? "";
  if (name.includes("client")) return "client";
  if (name.includes("vendor")) return "vendor";
  return undefined;
}

function persistableColumnId(column: TaskWorkflowColumn) {
  const sourceColumnId = column.metadata?.sourceColumnId;
  if (typeof sourceColumnId === "string" && !sourceColumnId.startsWith("fallback-")) {
    return sourceColumnId;
  }
  return column.id.startsWith("fallback-") ? undefined : column.id;
}

function enhanceWorkflowColumns(columns: TaskWorkflowColumn[]) {
  const hasClientWaiting = columns.some((column) => columnWaitingKind(column) === "client");
  const hasVendorWaiting = columns.some((column) => columnWaitingKind(column) === "vendor");
  const genericWaiting = columns.find(
    (column) =>
      column.normalizedStatus === "Waiting" &&
      !columnWaitingKind(column) &&
      column.name.toLowerCase() === "waiting",
  );

  if (!genericWaiting || (hasClientWaiting && hasVendorWaiting)) return columns;

  const splitColumns: TaskWorkflowColumn[] = [
    {
      ...genericWaiting,
      id: `${genericWaiting.id}-client`,
      name: "Waiting on Client",
      sortOrder: genericWaiting.sortOrder,
      metadata: {
        ...genericWaiting.metadata,
        waitingKind: "client",
        sourceColumnId: genericWaiting.id,
      },
    },
    {
      ...genericWaiting,
      id: `${genericWaiting.id}-vendor`,
      name: "Waiting on Vendor",
      sortOrder: genericWaiting.sortOrder + 1,
      metadata: {
        ...genericWaiting.metadata,
        waitingKind: "vendor",
        sourceColumnId: genericWaiting.id,
      },
    },
  ];

  return columns
    .flatMap((column) => (column.id === genericWaiting.id ? splitColumns : [column]))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getTaskColumns(data: EaseEventsData, projectId?: string) {
  const scoped = data.taskWorkflowColumns
    .filter(
      (column) =>
        !column.isArchived && (!column.projectId || (projectId && column.projectId === projectId)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return enhanceWorkflowColumns(scoped.length ? scoped : fallbackColumns);
}

function columnForTask(task: TaskRecord, columns: TaskWorkflowColumn[]) {
  if (task.normalizedStatus === "Waiting") {
    const exactColumn = columns.find((column) => column.id === task.workflowColumnId);
    const exactWaitingKind = columnWaitingKind(exactColumn);
    const inferredKind =
      exactWaitingKind ??
      ((task.labels ?? []).some((label) => label.name.toLowerCase() === "vendor")
        ? "vendor"
        : (task.labels ?? []).some((label) => label.name.toLowerCase() === "client")
          ? "client"
          : undefined);
    const waitingColumn = columns.find((column) => columnWaitingKind(column) === inferredKind);
    if (waitingColumn) return waitingColumn;
    const anyWaitingColumn = columns.find((column) => column.normalizedStatus === "Waiting");
    if (anyWaitingColumn) return anyWaitingColumn;
  }

  return (
    columns.find((column) => column.id === task.workflowColumnId) ??
    columns.find(
      (column) =>
        column.mappedTaskStatus === task.status &&
        (task.normalizedStatus ? column.normalizedStatus === task.normalizedStatus : true),
    ) ??
    columns.find((column) => column.mappedTaskStatus === task.status) ??
    columns[0]
  );
}

function sortTasks(tasks: TaskRecord[]) {
  return [...tasks].sort((a, b) => {
    const positionDiff = (a.position ?? 1000) - (b.position ?? 1000);
    if (positionDiff !== 0) return positionDiff;
    return (a.dueAt ?? a.dueDate ?? "").localeCompare(b.dueAt ?? b.dueDate ?? "");
  });
}

function getDatePart(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function getTimePart(value?: string, fallback = "17:00") {
  return value?.slice(11, 16) || fallback;
}

function composeDateTime(date: string, time: string) {
  if (!date) return undefined;
  return `${date}T${time || "17:00"}:00`;
}

function userFacingErrorMessage(error: unknown, fallback = "Please try again.") {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
    return (
      [candidate.message, candidate.details, candidate.hint]
        .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
        .join(" ")
        .trim() || fallback
    );
  }
  return fallback;
}

function buildTaskUpdateInput(
  task: TaskRecord,
  patch: Partial<{
    title: string;
    description: string;
    ownerId: string;
    dueDate: string;
    dueAt: string;
    startAt: string;
    status: TaskRecord["status"];
    priority: TaskRecord["priority"];
    workflowColumnId: string;
    normalizedStatus: TaskRecord["normalizedStatus"];
    position: number;
    visibility: TaskRecord["visibility"];
    labelIds: string[];
    assigneeIds: string[];
    watcherIds: string[];
    links: Array<{ label?: string; url: string }>;
    archivedAt: string;
    archivedById: string;
  }>,
) {
  return {
    projectId: task.projectId,
    leadId: task.leadId,
    eventId: task.eventId,
    ownerId: patch.ownerId ?? task.ownerId,
    title: patch.title ?? task.title,
    description: patch.description ?? task.description,
    dueDate: patch.dueDate ?? task.dueDate,
    dueAt: patch.dueAt ?? task.dueAt,
    startAt: patch.startAt ?? task.startAt,
    status: patch.status ?? task.status,
    priority: patch.priority ?? task.priority,
    workflowColumnId: patch.workflowColumnId ?? task.workflowColumnId,
    normalizedStatus: patch.normalizedStatus ?? task.normalizedStatus,
    position: patch.position ?? task.position,
    visibility: patch.visibility ?? task.visibility,
    workType: task.workType,
    links: patch.links ?? (task.links ?? []).map((link) => ({ label: link.label, url: link.url })),
    labelIds: patch.labelIds ?? (task.labels ?? []).map((label) => label.id),
    assigneeIds:
      patch.assigneeIds ??
      (task.participants ?? [])
        .filter((participant) => participant.participantRole === "Assignee")
        .map((participant) => participant.userId),
    watcherIds:
      patch.watcherIds ??
      (task.participants ?? [])
        .filter((participant) => participant.participantRole === "Watcher")
        .map((participant) => participant.userId),
    archivedAt: patch.archivedAt ?? task.archivedAt,
    archivedById: patch.archivedById ?? task.archivedById,
  };
}

function checklistProgress(task: TaskRecord) {
  const total = task.checklist.length;
  const done = task.checklist.filter((item) => item.isComplete).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function taskDueDateValue(task: TaskRecord) {
  return task.dueDate || getDatePart(task.dueAt);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isTaskDueToday(task: TaskRecord) {
  return taskDueDateValue(task) === todayDateString() && task.status !== "Done";
}

function getLabelTint(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}18` : "rgba(15, 23, 42, 0.06)";
}

function getLabelTextColor(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return "#334155";
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  if (luminance < 0.38) return color;
  return `rgb(${Math.round(red * 0.58)}, ${Math.round(green * 0.58)}, ${Math.round(blue * 0.58)})`;
}

function TaskLabelPill({ label, compact = false }: { label: TaskLabel; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold shadow-sm",
        compact ? "text-[11px]" : "text-xs",
      )}
      style={{
        borderColor: label.color,
        backgroundColor: getLabelTint(label.color),
        color: getLabelTextColor(label.color),
      }}
      title={label.description || label.name}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      <span className="truncate">{label.name}</span>
    </span>
  );
}

function TaskLabelList({
  labels,
  limit = 5,
  compact = false,
}: {
  labels?: TaskLabel[];
  limit?: number;
  compact?: boolean;
}) {
  const visibleLabels = (labels ?? []).slice(0, limit);
  const hiddenCount = Math.max(0, (labels?.length ?? 0) - visibleLabels.length);
  if (!visibleLabels.length) return null;
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {visibleLabels.map((label) => (
        <TaskLabelPill key={label.id} label={label} compact={compact} />
      ))}
      {hiddenCount ? (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function isTaskRecentlyCompleted(task: TaskRecord) {
  if (task.status !== "Done") return false;
  const updated = new Date(task.updatedAt || task.createdAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated <= 7 * 24 * 60 * 60 * 1000;
}

function hasTaskLabel(task: TaskRecord, name: string) {
  return (task.labels ?? []).some((label) => label.name.toLowerCase() === name.toLowerCase());
}

function isWaitingOnClient(task: TaskRecord, columns: TaskWorkflowColumn[]) {
  return (
    task.normalizedStatus === "Waiting" &&
    (hasTaskLabel(task, "Client") || columnWaitingKind(columnForTask(task, columns)) === "client")
  );
}

function isWaitingOnVendor(task: TaskRecord, columns: TaskWorkflowColumn[]) {
  return (
    task.normalizedStatus === "Waiting" &&
    (hasTaskLabel(task, "Vendor") || columnWaitingKind(columnForTask(task, columns)) === "vendor")
  );
}

function taskPeople(task: TaskRecord, data: EaseEventsData) {
  const userIds = [
    task.ownerId,
    ...(task.participants ?? [])
      .filter((participant) => participant.participantRole === "Assignee")
      .map((participant) => participant.userId),
  ].filter(Boolean) as string[];
  return Array.from(new Set(userIds))
    .map((id) => data.users.find((user) => user.id === id))
    .filter(Boolean) as AppUser[];
}

function taskMatchesFilters(
  task: TaskRecord,
  data: EaseEventsData,
  currentUserId: string | undefined,
  filters: TaskFilters,
) {
  const haystack = [
    task.title,
    task.description,
    getProjectName(data, task),
    getClientName(data, task),
    ...(task.labels ?? []).map((label) => label.name),
    ...task.checklist.map((item) => item.title),
    ...(task.links ?? []).flatMap((link) => [link.label, link.url]),
  ]
    .join(" ")
    .toLowerCase();
  if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
  if (filters.projectId && task.projectId !== filters.projectId) return false;
  if (filters.eventId && task.eventId !== filters.eventId) return false;
  if (filters.clientId) {
    const event = task.eventId ? data.events.find((item) => item.id === task.eventId) : undefined;
    const project = task.projectId
      ? data.projects.find((item) => item.id === task.projectId)
      : undefined;
    if (event?.clientId !== filters.clientId && project?.clientId !== filters.clientId)
      return false;
  }
  if (filters.ownerId) {
    if (filters.ownerId === "unassigned" && task.ownerId) return false;
    if (filters.ownerId === "me" && task.ownerId !== currentUserId) return false;
    if (
      filters.ownerId !== "me" &&
      filters.ownerId !== "unassigned" &&
      task.ownerId !== filters.ownerId
    ) {
      return false;
    }
  }
  if (filters.assigneeId) {
    const participantIds = (task.participants ?? [])
      .filter((item) => item.participantRole === "Assignee")
      .map((item) => item.userId);
    if (filters.assigneeId === "me" && !participantIds.includes(currentUserId ?? "")) return false;
    if (filters.assigneeId === "unassigned" && participantIds.length) return false;
    if (
      filters.assigneeId !== "me" &&
      filters.assigneeId !== "unassigned" &&
      !participantIds.includes(filters.assigneeId)
    ) {
      return false;
    }
  }
  if (filters.status && task.status !== filters.status) return false;
  if (filters.priority && task.priority !== filters.priority) return false;
  if (filters.visibility && task.visibility !== filters.visibility) return false;
  if (filters.labelId && !(task.labels ?? []).some((label) => label.id === filters.labelId)) {
    return false;
  }
  if (filters.archivedState === "archived" && !task.archivedAt) return false;
  if (filters.archivedState === "active" && task.archivedAt) return false;
  if (filters.dueState === "overdue" && !isOverdueTask(task)) return false;
  if (filters.dueState === "blocked" && task.status !== "Blocked") return false;
  if (filters.dueState === "no-due-date" && (task.dueAt || task.dueDate)) return false;
  if (filters.dueState === "this-week") {
    const due = taskDueDateValue(task);
    if (!due) return false;
    const dueTime = new Date(`${due}T12:00:00`).getTime();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = start + 7 * 24 * 60 * 60 * 1000;
    if (dueTime < start || dueTime > end) return false;
  }
  return true;
}

function useLastWorkView(key: string, initial: WorkView) {
  const [view, setView] = React.useState<WorkView>(() => {
    if (typeof window === "undefined") return initial;
    return (window.localStorage.getItem(key) as WorkView | null) ?? initial;
  });
  React.useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, view);
  }, [key, view]);
  return [view, setView] as const;
}

function useLocalSavedTaskViews(key: string) {
  const [views, setViews] = React.useState<LocalSavedTaskView[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(views.slice(0, 12)));
    }
  }, [key, views]);

  return [views, setViews] as const;
}

export function WorkPage() {
  return (
    <TaskWorkspace
      title="Work"
      description="Daily task command center for project boards, internal work, inbox triage, and archived tasks."
      mode="work"
    />
  );
}

export function ProjectTaskWorkspace({
  projectId,
  eventId,
}: {
  projectId?: string;
  eventId?: string;
}) {
  return (
    <TaskWorkspace
      title="Project Tasks"
      description="Board and table views for the same task records shown in Work."
      mode="project"
      projectId={projectId}
      eventId={eventId}
    />
  );
}

function TaskWorkspace({
  title,
  description,
  mode,
  projectId,
  eventId,
}: {
  title: string;
  description: string;
  mode: "work" | "project";
  projectId?: string;
  eventId?: string;
}) {
  const { currentUser } = useEaseEventsAuth();
  const {
    data,
    createTask,
    updateTask,
    updateTaskWorkState,
    createTaskChecklist,
    createTaskChecklistItem,
    updateTaskChecklistItem,
    createTaskComment,
    attachTaskFile,
    updateTaskInboxItem,
  } = useEaseEventsStore();
  const [section, setSection] = React.useState<WorkSection>("my");
  const [view, setView] = useLastWorkView(
    mode === "project"
      ? `ease-events-project-task-view-${projectId ?? eventId ?? "all"}`
      : "ease-events-work-view",
    "board",
  );
  const [localSavedViews, setLocalSavedViews] = useLocalSavedTaskViews(
    "ease-events-work-local-saved-views",
  );
  const [filters, setFilters] = React.useState<TaskFilters>(emptyFilters);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);

  const columns = React.useMemo(() => getTaskColumns(data, projectId), [data, projectId]);
  const activeTask = data.tasks.find((task) => task.id === selectedTaskId);

  const scopeTasks = React.useMemo(() => {
    const scoped =
      mode === "project"
        ? data.tasks.filter(
            (task) =>
              (projectId && task.projectId === projectId) || (eventId && task.eventId === eventId),
          )
        : data.tasks;

    return scoped.filter((task) => {
      if (section === "archived") return Boolean(task.archivedAt);
      if (task.archivedAt) return false;
      if (section === "my") {
        const assignedChecklist = task.checklist.some(
          (item) => item.assigneeId === currentUser?.id,
        );
        const participant = task.participants?.some(
          (item) => item.userId === currentUser?.id && item.participantRole === "Assignee",
        );
        return task.ownerId === currentUser?.id || participant || assignedChecklist;
      }
      return true;
    });
  }, [currentUser?.id, data.tasks, eventId, mode, projectId, section]);

  const filteredTasks = React.useMemo(
    () =>
      sortTasks(
        scopeTasks.filter((task) => taskMatchesFilters(task, data, currentUser?.id, filters)),
      ),
    [currentUser?.id, data, filters, scopeTasks],
  );

  const inboxItems = data.taskInboxItems.filter((item) => item.status === "New");

  async function moveTask(task: TaskRecord, column: TaskWorkflowColumn, position?: number) {
    try {
      await updateTaskWorkState(task.id, {
        workflowColumnId: persistableColumnId(column),
        normalizedStatus: column.normalizedStatus,
        status: column.mappedTaskStatus,
        position: position ?? Date.now(),
      });

      const waitingKind = columnWaitingKind(column);
      if (waitingKind) {
        const labelName = waitingKind === "client" ? "Client" : "Vendor";
        const oppositeLabelName = waitingKind === "client" ? "Vendor" : "Client";
        const targetLabel = data.taskLabels.find(
          (label) => label.name.toLowerCase() === labelName.toLowerCase(),
        );
        if (targetLabel) {
          const nextLabelIds = (task.labels ?? [])
            .filter((label) => label.name.toLowerCase() !== oppositeLabelName.toLowerCase())
            .map((label) => label.id);
          if (!nextLabelIds.includes(targetLabel.id)) nextLabelIds.push(targetLabel.id);
          await updateTask(task.id, buildTaskUpdateInput(task, { labelIds: nextLabelIds }));
        }
      }
    } catch (error) {
      toast.error("Unable to move task", { description: userFacingErrorMessage(error) });
    }
  }

  function saveCurrentView(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const savedView: LocalSavedTaskView = {
      id: `local-view-${Date.now()}`,
      name: trimmed,
      scope: "private",
      viewType: view,
      filters,
      createdAt: new Date().toISOString(),
    };
    setLocalSavedViews((current) => [
      savedView,
      ...current.filter((item) => item.name !== trimmed),
    ]);
  }

  async function createTaskFromInbox(itemId: string) {
    const item = data.taskInboxItems.find((entry) => entry.id === itemId);
    if (!item) return;
    try {
      const project = item.suggestedProjectId
        ? data.projects.find((entry) => entry.id === item.suggestedProjectId)
        : undefined;
      const event = project?.eventId
        ? data.events.find((entry) => entry.id === project.eventId)
        : undefined;
      const task = await createTask({
        projectId: project?.id ?? item.projectId,
        eventId: event?.id ?? item.eventId,
        title: item.suggestedTitle ?? item.summary ?? item.rawContent ?? "Review inbox item",
        description: item.rawContent ?? item.summary ?? "",
        dueDate: item.suggestedDueAt?.slice(0, 10) ?? "",
        dueAt: item.suggestedDueAt,
        ownerId: item.suggestedOwnerId ?? currentUser?.id,
        priority: "Medium",
        status: item.suggestedStatus,
        sourceType: item.sourceType,
        workType: project || item.eventId ? "project" : "internal",
      });
      await updateTaskInboxItem(item.id, { status: "Converted", convertedTaskId: task.id });
      setSelectedTaskId(task.id);
      toast.success("Inbox item converted to task");
    } catch (error) {
      toast.error("Unable to convert inbox item", { description: userFacingErrorMessage(error) });
    }
  }

  async function dismissInboxItem(itemId: string) {
    try {
      await updateTaskInboxItem(itemId, {
        status: "Dismissed",
        dismissedAt: new Date().toISOString(),
      });
      toast.success("Inbox item dismissed");
    } catch (error) {
      toast.error("Unable to dismiss inbox item", { description: userFacingErrorMessage(error) });
    }
  }

  async function createTaskWithFeedback(input: Parameters<typeof createTask>[0]) {
    try {
      const task = await createTask(input);
      setSelectedTaskId(task.id);
      toast.success("Task created");
      return task;
    } catch (error) {
      toast.error("Unable to create task", { description: userFacingErrorMessage(error) });
      throw error;
    }
  }

  async function archiveTask(task: TaskRecord) {
    try {
      await updateTaskWorkState(task.id, {
        archivedAt: new Date().toISOString(),
        archivedById: currentUser?.id ?? null,
      });
      toast.success("Task archived");
    } catch (error) {
      toast.error("Unable to archive task", { description: userFacingErrorMessage(error) });
    }
  }

  async function restoreTask(task: TaskRecord) {
    try {
      await updateTaskWorkState(task.id, { archivedAt: null, archivedById: null });
      toast.success("Task restored");
    } catch (error) {
      toast.error("Unable to restore task", { description: userFacingErrorMessage(error) });
    }
  }

  const headerActions =
    mode === "work" ? (
      <div className="flex flex-wrap gap-2">
        {(["my", "inbox", "all", "templates", "archived"] as WorkSection[]).map((item) => (
          <Button
            key={item}
            variant={section === item ? "default" : "outline"}
            onClick={() => setSection(item)}
          >
            {item === "my"
              ? "My Work"
              : item === "all"
                ? "All Tasks"
                : item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {mode === "work" ? (
        <PageHeader eyebrow="Trello replacement" title={title} description={description} />
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
      )}

      {headerActions}

      <WorkSummary tasks={scopeTasks} data={data} currentUserId={currentUser?.id} />

      {mode === "work" && section === "my" ? (
        <MyWorkCommandCenter
          tasks={filteredTasks}
          data={data}
          columns={columns}
          onOpen={(task) => setSelectedTaskId(task.id)}
          onComplete={(task) => {
            const doneColumn =
              columns.find((column) => column.normalizedStatus === "Completed") ??
              columns.find((column) => column.mappedTaskStatus === "Done");
            if (doneColumn) void moveTask(task, doneColumn);
          }}
        />
      ) : null}

      {section === "inbox" && mode === "work" ? (
        <TaskInboxPanel
          items={inboxItems}
          data={data}
          onConvert={createTaskFromInbox}
          onDismiss={(id) => void dismissInboxItem(id)}
        />
      ) : section === "templates" && mode === "work" ? (
        <TaskTemplatesPanel data={data} />
      ) : (
        <>
          <TaskFiltersPanel
            data={data}
            filters={filters}
            view={view}
            localSavedViews={localSavedViews}
            onChange={setFilters}
            onApplySaved={(nextFilters, nextView) => {
              setFilters({ ...emptyFilters, ...nextFilters });
              if (nextView === "board" || nextView === "table") setView(nextView);
            }}
            onSaveCurrent={saveCurrentView}
          />
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <QuickAddTask
              data={data}
              columns={columns}
              projectId={projectId}
              eventId={eventId}
              onCreate={createTaskWithFeedback}
            />
            <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
              {(["board", "table"] as WorkView[]).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={view === item ? "default" : "ghost"}
                  onClick={() => setView(item)}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {mode === "work" && section === "my" ? null : view === "board" ? (
            <TaskBoardView
              tasks={filteredTasks}
              columns={columns}
              data={data}
              onOpen={(task) => setSelectedTaskId(task.id)}
              onMove={moveTask}
              onArchive={(task) => void archiveTask(task)}
              onRestore={(task) => void restoreTask(task)}
              onCreate={(column, title) =>
                createTaskWithFeedback({
                  title,
                  description: "",
                  dueDate: "",
                  priority: "Medium",
                  status: column.mappedTaskStatus,
                  normalizedStatus: column.normalizedStatus,
                  workflowColumnId: persistableColumnId(column),
                  projectId,
                  eventId,
                  ownerId: currentUser?.id,
                  workType: projectId || eventId ? "project" : "internal",
                })
              }
            />
          ) : (
            <TaskTableView
              tasks={filteredTasks}
              columns={columns}
              data={data}
              onOpen={(task) => setSelectedTaskId(task.id)}
              onMove={moveTask}
              onUpdate={(task, patch) => void updateTaskWorkState(task.id, patch)}
            />
          )}
        </>
      )}

      {activeTask ? (
        <TaskDetailDrawer
          task={activeTask}
          data={data}
          columns={columns}
          onClose={() => setSelectedTaskId(null)}
          onSave={(input) => updateTask(activeTask.id, input)}
          onMove={(column) => void moveTask(activeTask, column)}
          onUpdateState={(patch) => updateTaskWorkState(activeTask.id, patch)}
          onCreateChecklist={(input) => createTaskChecklist(input)}
          onCreateChecklistItem={(input) => createTaskChecklistItem(input)}
          onUpdateChecklistItem={(itemId, input) => void updateTaskChecklistItem(itemId, input)}
          onCreateComment={(input) => createTaskComment(input)}
          onAttachFile={(input) => attachTaskFile(input)}
        />
      ) : null}
    </div>
  );
}

function WorkSummary({
  tasks,
  data,
  currentUserId,
}: {
  tasks: TaskRecord[];
  data: EaseEventsData;
  currentUserId?: string;
}) {
  const overdue = tasks.filter((task) => !task.archivedAt && isOverdueTask(task)).length;
  const blocked = tasks.filter((task) => !task.archivedAt && task.status === "Blocked").length;
  const mine = tasks.filter(
    (task) =>
      !task.archivedAt &&
      (task.ownerId === currentUserId ||
        task.participants?.some(
          (participant) =>
            participant.userId === currentUserId && participant.participantRole === "Assignee",
        )),
  ).length;
  const waiting = tasks.filter(
    (task) => !task.archivedAt && task.normalizedStatus === "Waiting",
  ).length;

  const cards = [
    { label: "My open work", value: mine, tone: "default", icon: CheckCircle2 },
    { label: "Overdue", value: overdue, tone: overdue ? "danger" : "good", icon: Clock },
    { label: "Blocked", value: blocked, tone: blocked ? "danger" : "good", icon: MoreHorizontal },
    { label: "Waiting", value: waiting, tone: waiting ? "warn" : "good", icon: Users },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="rounded-lg border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md",
                  card.tone === "danger"
                    ? "bg-rose-50 text-rose-700"
                    : card.tone === "warn"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-700",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className="text-2xl font-semibold text-slate-950">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <span className="sr-only">{data.organization.name} work summary</span>
    </div>
  );
}

function MyWorkCommandCenter({
  tasks,
  data,
  columns,
  onOpen,
  onComplete,
}: {
  tasks: TaskRecord[];
  data: EaseEventsData;
  columns: TaskWorkflowColumn[];
  onOpen: (task: TaskRecord) => void;
  onComplete: (task: TaskRecord) => void;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const activeTasks = tasks.filter((task) => !task.archivedAt);
  const groups = [
    {
      key: "overdue",
      title: "Overdue",
      hint: "Handle these first or reschedule them intentionally.",
      tasks: activeTasks.filter((task) => isOverdueTask(task)),
      tone: "danger",
    },
    {
      key: "today",
      title: "Due Today",
      hint: "The planner's immediate execution list.",
      tasks: activeTasks.filter((task) => isTaskDueToday(task)),
      tone: "default",
    },
    {
      key: "client",
      title: "Waiting on Client",
      hint: "Follow-ups where the next move is with the client.",
      tasks: activeTasks.filter((task) => isWaitingOnClient(task, columns)),
      tone: "warn",
    },
    {
      key: "vendor",
      title: "Waiting on Vendor",
      hint: "Vendor confirmations, deliverables, and blockers.",
      tasks: activeTasks.filter((task) => isWaitingOnVendor(task, columns)),
      tone: "warn",
    },
    {
      key: "blocked",
      title: "Blocked",
      hint: "Tasks that need an unblock decision.",
      tasks: activeTasks.filter((task) => task.status === "Blocked"),
      tone: "danger",
    },
    {
      key: "done",
      title: "Recently Completed",
      hint: "Momentum from the last few days.",
      tasks: activeTasks.filter((task) => isTaskRecentlyCompleted(task)),
      tone: "good",
    },
  ];

  return (
    <div className="grid gap-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key];
        return (
          <Card key={group.key} className="rounded-lg border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {group.title}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      group.tone === "danger"
                        ? "bg-rose-50 text-rose-700"
                        : group.tone === "warn"
                          ? "bg-amber-50 text-amber-700"
                          : group.tone === "good"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {group.tasks.length}
                  </span>
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">{group.hint}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setCollapsed((current) => ({ ...current, [group.key]: !isCollapsed }))
                }
              >
                <ChevronDown className={cn("h-4 w-4 transition", isCollapsed && "-rotate-90")} />
                <span className="sr-only">
                  {isCollapsed ? "Expand" : "Collapse"} {group.title}
                </span>
              </Button>
            </CardHeader>
            {!isCollapsed ? (
              <CardContent className="space-y-2 px-4 pb-4 pt-0">
                {group.tasks.length ? (
                  group.tasks
                    .slice(0, 8)
                    .map((task) => (
                      <MyWorkRow
                        key={task.id}
                        task={task}
                        data={data}
                        columns={columns}
                        onOpen={() => onOpen(task)}
                        onComplete={() => onComplete(task)}
                      />
                    ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {group.key === "overdue"
                      ? "Clear. No overdue work is dragging the day backward."
                      : group.key === "today"
                        ? "Nothing due today. Use quick add when a new action comes up."
                        : group.key === "done"
                          ? "Completed work will appear here after the team closes tasks."
                          : "No tasks in this lane right now."}
                  </div>
                )}
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function MyWorkRow({
  task,
  data,
  columns,
  onOpen,
  onComplete,
}: {
  task: TaskRecord;
  data: EaseEventsData;
  columns: TaskWorkflowColumn[];
  onOpen: () => void;
  onComplete: () => void;
}) {
  const owner = data.users.find((user) => user.id === task.ownerId);
  const progress = checklistProgress(task);
  const column = columnForTask(task, columns);
  const dueValue = taskDueDateValue(task);
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <a
          href={projectHref(task)}
          className="inline-flex max-w-full items-center rounded-full bg-[#f6edd8] px-2.5 py-1 text-xs font-semibold text-[#76591b] hover:bg-[#ecd69c]"
          title={getProjectName(data, task)}
        >
          <span className="truncate">{getProjectName(data, task)}</span>
        </a>
        <button
          className="mt-2 block max-w-full text-left text-sm font-semibold text-slate-950 hover:text-[#9b741f]"
          onClick={onOpen}
        >
          <span className="line-clamp-2">{task.title}</span>
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{column?.name ?? task.status}</span>
          {dueValue ? (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                isOverdueTask(task) && "text-rose-700",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(dueValue)}
            </span>
          ) : null}
          {owner ? <span>Owner: {owner.fullName}</span> : <span>Unassigned</span>}
          {progress.total ? (
            <span>
              {progress.done}/{progress.total} checklist
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button size="sm" variant="outline" onClick={onOpen}>
          Comment
        </Button>
        <Button size="sm" variant="outline" onClick={onOpen}>
          Open
        </Button>
        {task.status !== "Done" ? (
          <Button size="sm" onClick={onComplete}>
            Complete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TaskFiltersPanel({
  data,
  filters,
  view,
  localSavedViews,
  onChange,
  onApplySaved,
  onSaveCurrent,
}: {
  data: EaseEventsData;
  filters: TaskFilters;
  view: WorkView;
  localSavedViews: LocalSavedTaskView[];
  onChange: (filters: TaskFilters) => void;
  onApplySaved: (filters: Partial<TaskFilters>, view?: WorkView) => void;
  onSaveCurrent: (name: string) => void;
}) {
  const staff = staffUsers(data);
  const [saveName, setSaveName] = React.useState("");
  const [saveOpen, setSaveOpen] = React.useState(false);
  const saved = [
    { name: "My Overdue Work", filters: { ownerId: "me", dueState: "overdue" } },
    {
      name: "Waiting on Client",
      filters: { labelId: data.taskLabels.find((label) => label.name === "Client")?.id ?? "" },
    },
    {
      name: "Waiting on Vendors",
      filters: { labelId: data.taskLabels.find((label) => label.name === "Vendor")?.id ?? "" },
    },
    { name: "This Week", filters: { dueState: "this-week" } },
    { name: "Unassigned Tasks", filters: { ownerId: "unassigned" } },
  ];

  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {data.taskSavedViews.slice(0, 4).map((view) => (
            <Button
              key={view.id}
              size="sm"
              variant="outline"
              onClick={() =>
                onApplySaved(
                  view.filters as Partial<TaskFilters>,
                  view.viewType === "table" ? "table" : "board",
                )
              }
            >
              {view.name}
            </Button>
          ))}
          {localSavedViews.slice(0, 4).map((savedView) => (
            <Button
              key={savedView.id}
              size="sm"
              variant="outline"
              onClick={() => onApplySaved(savedView.filters, savedView.viewType)}
              title="Private saved view on this device"
            >
              {savedView.name}
            </Button>
          ))}
          {saved.map((view) => (
            <Button
              key={view.name}
              size="sm"
              variant="outline"
              onClick={() => onApplySaved(view.filters)}
            >
              {view.name}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => onChange(emptyFilters)}>
            Clear filters
          </Button>
          {saveOpen ? (
            <div className="flex min-w-0 flex-1 gap-2 sm:flex-none">
              <Input
                className="h-9 min-w-[180px]"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder={`${view === "table" ? "Table" : "Board"} view name`}
              />
              <Button
                size="sm"
                onClick={() => {
                  onSaveCurrent(saveName);
                  setSaveName("");
                  setSaveOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setSaveOpen(true)}>
              Save current view
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-6 xl:grid-cols-12">
          <label className="relative md:col-span-2">
            <span className="sr-only">Search tasks</span>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="Search tasks, projects, links..."
            />
          </label>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.projectId}
            onChange={(event) => onChange({ ...filters, projectId: event.target.value })}
            aria-label="Filter by project"
          >
            <option value="">Any project</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.eventId}
            onChange={(event) => onChange({ ...filters, eventId: event.target.value })}
            aria-label="Filter by event"
          >
            <option value="">Any event</option>
            {data.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.eventName}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.clientId}
            onChange={(event) => onChange({ ...filters, clientId: event.target.value })}
            aria-label="Filter by client"
          >
            <option value="">Any client</option>
            {data.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.displayName}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.ownerId}
            onChange={(event) => onChange({ ...filters, ownerId: event.target.value })}
            aria-label="Filter by owner"
          >
            <option value="">Any owner</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {staff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.assigneeId}
            onChange={(event) => onChange({ ...filters, assigneeId: event.target.value })}
            aria-label="Filter by collaborator"
          >
            <option value="">Any collaborator</option>
            <option value="me">Includes me</option>
            <option value="unassigned">No collaborators</option>
            {staff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value })}
            aria-label="Filter by status"
          >
            <option value="">Any status</option>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.priority}
            onChange={(event) => onChange({ ...filters, priority: event.target.value })}
            aria-label="Filter by priority"
          >
            <option value="">Any priority</option>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.labelId}
            onChange={(event) => onChange({ ...filters, labelId: event.target.value })}
            aria-label="Filter by label"
          >
            <option value="">Any label</option>
            {data.taskLabels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.dueState}
            onChange={(event) => onChange({ ...filters, dueState: event.target.value })}
            aria-label="Filter by state"
          >
            <option value="">Any state</option>
            <option value="overdue">Overdue</option>
            <option value="this-week">Due this week</option>
            <option value="blocked">Blocked</option>
            <option value="no-due-date">No due date</option>
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.visibility}
            onChange={(event) => onChange({ ...filters, visibility: event.target.value })}
            aria-label="Filter by visibility"
          >
            <option value="">Any visibility</option>
            {taskVisibilities.map((visibility) => (
              <option key={visibility} value={visibility}>
                {visibility}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={filters.archivedState}
            onChange={(event) => onChange({ ...filters, archivedState: event.target.value })}
            aria-label="Filter by archive state"
          >
            <option value="">Archive state</option>
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAddTask({
  data,
  columns,
  projectId,
  eventId,
  onCreate,
}: {
  data: EaseEventsData;
  columns: TaskWorkflowColumn[];
  projectId?: string;
  eventId?: string;
  onCreate: (
    input: Parameters<ReturnType<typeof useEaseEventsStore>["createTask"]>[0],
  ) => Promise<unknown>;
}) {
  const { currentUser } = useEaseEventsAuth();
  const [title, setTitle] = React.useState("");
  const [ownerId, setOwnerId] = React.useState(currentUser?.id ?? "");
  const [dueDate, setDueDate] = React.useState("");
  const [priority, setPriority] = React.useState<TaskRecord["priority"]>("Medium");
  const [columnId, setColumnId] = React.useState(columns[0]?.id ?? "");
  const [isCreating, setIsCreating] = React.useState(false);

  const selectedColumn = columns.find((column) => column.id === columnId) ?? columns[0];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !selectedColumn) return;
    setIsCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        description: "",
        projectId,
        eventId,
        ownerId: ownerId || undefined,
        dueDate,
        dueAt: dueDate ? `${dueDate}T17:00:00` : undefined,
        priority,
        status: selectedColumn.mappedTaskStatus,
        normalizedStatus: selectedColumn.normalizedStatus,
        workflowColumnId: persistableColumnId(selectedColumn),
        workType: projectId || eventId ? "project" : "internal",
      });
      setTitle("");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form
      className="grid flex-1 gap-2 md:grid-cols-[minmax(220px,1fr)_160px_150px_130px_130px_auto]"
      onSubmit={submit}
    >
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Quick add task"
      />
      <select
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
        value={ownerId}
        onChange={(event) => setOwnerId(event.target.value)}
        aria-label="Quick assign owner"
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
      <Input
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        aria-label="Quick due date"
      />
      <select
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
        value={priority}
        onChange={(event) => setPriority(event.target.value as TaskRecord["priority"])}
        aria-label="Quick priority"
      >
        {taskPriorities.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
        value={columnId}
        onChange={(event) => setColumnId(event.target.value)}
        aria-label="Quick workflow stage"
      >
        {columns.map((column) => (
          <option key={column.id} value={column.id}>
            {column.name}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={isCreating || !title.trim()}>
        <Plus className="h-4 w-4" />
        {isCreating ? "Adding..." : "Add"}
      </Button>
    </form>
  );
}

function TaskBoardView({
  tasks,
  columns,
  data,
  onOpen,
  onMove,
  onArchive,
  onRestore,
  onCreate,
}: {
  tasks: TaskRecord[];
  columns: TaskWorkflowColumn[];
  data: EaseEventsData;
  onOpen: (task: TaskRecord) => void;
  onMove: (task: TaskRecord, column: TaskWorkflowColumn, position?: number) => void;
  onArchive: (task: TaskRecord) => void;
  onRestore: (task: TaskRecord) => void;
  onCreate: (column: TaskWorkflowColumn, title: string) => Promise<unknown>;
}) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [quickAddColumnId, setQuickAddColumnId] = React.useState<string | null>(null);
  const [quickTitle, setQuickTitle] = React.useState("");
  const [quickAddSavingColumnId, setQuickAddSavingColumnId] = React.useState<string | null>(null);

  async function submitQuickAdd(column: TaskWorkflowColumn) {
    if (!quickTitle.trim()) return;
    setQuickAddSavingColumnId(column.id);
    try {
      await onCreate(column, quickTitle.trim());
      setQuickTitle("");
      setQuickAddColumnId(null);
    } finally {
      setQuickAddSavingColumnId(null);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="space-y-3 md:hidden">
        {!tasks.length ? (
          <EmptyState
            icon={CheckCircle2}
            title="No tasks in this view"
            description="Try a different saved view or add a task when new work appears."
          />
        ) : null}
        {sortTasks(tasks).map((task, index) => {
          const taskColumn = columnForTask(task, columns) ?? columns[0];
          const columnTasks = sortTasks(
            tasks.filter((item) => columnForTask(item, columns)?.id === taskColumn?.id),
          );
          return (
            <TaskCard
              key={task.id}
              task={task}
              data={data}
              columns={columns}
              columnIndex={columns.findIndex((column) => column.id === taskColumn?.id)}
              columnTasks={columnTasks}
              taskIndex={columnTasks.findIndex((item) => item.id === task.id)}
              onOpen={() => onOpen(task)}
              onDragStart={() => undefined}
              onMove={(targetColumn, position) => onMove(task, targetColumn, position)}
              onArchive={() => onArchive(task)}
              onRestore={() => onRestore(task)}
            />
          );
        })}
      </div>
      <div
        className="hidden w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white/60 p-3 pb-4 md:block"
        style={{ contain: "paint" }}
      >
        <div className="flex min-w-max gap-4 pr-3">
          {columns.map((column, columnIndex) => {
            const columnTasks = sortTasks(
              tasks.filter((task) => columnForTask(task, columns)?.id === column.id),
            );
            return (
              <section
                key={column.id}
                className="flex min-h-[360px] w-[18rem] shrink-0 snap-start flex-col rounded-lg border border-slate-200 bg-slate-50 xl:w-[19rem]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const task = tasks.find((item) => item.id === draggedId);
                  if (task) onMove(task, column);
                  setDraggedId(null);
                }}
                aria-label={`${column.name} column`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 p-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{column.name}</h3>
                    <p className="text-xs text-slate-500">
                      {columnTasks.length} task{columnTasks.length === 1 ? "" : "s"}
                      {column.wipLimit ? ` · limit ${column.wipLimit}` : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setQuickAddColumnId(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add task to {column.name}</span>
                  </Button>
                </div>
                <div className="flex-1 space-y-3 p-3">
                  {quickAddColumnId === column.id ? (
                    <div className="rounded-md border border-slate-200 bg-white p-2">
                      <Input
                        value={quickTitle}
                        onChange={(event) => setQuickTitle(event.target.value)}
                        placeholder="Task title"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void submitQuickAdd(column);
                          if (event.key === "Escape") setQuickAddColumnId(null);
                        }}
                        autoFocus
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void submitQuickAdd(column)}
                          disabled={quickAddSavingColumnId === column.id || !quickTitle.trim()}
                        >
                          {quickAddSavingColumnId === column.id ? "Adding..." : "Add"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setQuickAddColumnId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {columnTasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      data={data}
                      columns={columns}
                      columnIndex={columnIndex}
                      columnTasks={columnTasks}
                      taskIndex={index}
                      onOpen={() => onOpen(task)}
                      onDragStart={() => setDraggedId(task.id)}
                      onMove={(targetColumn, position) => onMove(task, targetColumn, position)}
                      onArchive={() => onArchive(task)}
                      onRestore={() => onRestore(task)}
                    />
                  ))}
                  {!columnTasks.length && quickAddColumnId !== column.id ? (
                    <div className="rounded-md border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-500">
                      <p className="font-medium text-slate-700">Nothing in {column.name}</p>
                      <p className="mt-1 text-xs">
                        Quick-add a task here when this stage needs work.
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  data,
  columns,
  columnIndex,
  columnTasks,
  taskIndex,
  onOpen,
  onDragStart,
  onMove,
  onArchive,
  onRestore,
}: {
  task: TaskRecord;
  data: EaseEventsData;
  columns: TaskWorkflowColumn[];
  columnIndex: number;
  columnTasks: TaskRecord[];
  taskIndex: number;
  onOpen: () => void;
  onDragStart: () => void;
  onMove: (column: TaskWorkflowColumn, position?: number) => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const owner = data.users.find((user) => user.id === task.ownerId);
  const progress = checklistProgress(task);
  const cover = getTaskCover(data, task);
  const currentColumnTasks = columnTasks;
  const people = taskPeople(task, data);
  const dueValue = taskDueDateValue(task);
  const commentCount = data.comments.filter(
    (comment) => comment.taskId === task.id && !comment.isDeleted,
  ).length;
  const attachmentCount = task.attachments?.length ?? 0;
  const isBlocked = task.status === "Blocked";
  const waitingKind = columnWaitingKind(columnForTask(task, columns));

  function moveWithin(direction: -1 | 1) {
    const targetIndex = taskIndex + direction;
    const neighbor = currentColumnTasks[targetIndex];
    if (!neighbor) return;
    const currentPosition = task.position ?? 1000;
    const neighborPosition = neighbor.position ?? (targetIndex + 1) * 1000;
    onMove(columnForTask(task, columns), (currentPosition + neighborPosition) / 2);
  }

  return (
    <article
      className={cn(
        "rounded-lg border bg-white shadow-sm transition hover:border-[#c9972b] hover:shadow-md",
        task.status === "Blocked" ? "border-rose-200" : "border-slate-200",
      )}
      draggable
      onDragStart={onDragStart}
    >
      {cover ? (
        <button
          className="block w-full overflow-hidden rounded-t-lg"
          onClick={onOpen}
          aria-label={`Open ${task.title}`}
        >
          <img src={cover.storagePath} alt="" className="h-32 w-full object-cover" />
        </button>
      ) : null}
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <a
            href={projectHref(task)}
            className="inline-flex min-w-0 max-w-[70%] items-center rounded-full bg-[#f6edd8] px-2.5 py-1 text-[11px] font-semibold text-[#76591b] hover:bg-[#ecd69c]"
            title={getProjectName(data, task)}
          >
            <span className="truncate">{getProjectName(data, task)}</span>
          </a>
          <StatusBadge
            label={task.priority}
            tone={
              task.priority === "Urgent" ? "danger" : task.priority === "High" ? "warn" : "neutral"
            }
          />
        </div>
        <button className="w-full text-left" onClick={onOpen}>
          <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
            {task.title}
          </h4>
          {getClientName(data, task) ? (
            <p className="mt-1 truncate text-xs text-slate-500" title={getClientName(data, task)}>
              {getClientName(data, task)}
            </p>
          ) : null}
        </button>
        {task.labels.length || isBlocked || waitingKind ? (
          <div className="flex flex-wrap gap-1">
            <TaskLabelList labels={task.labels} compact />
            {isBlocked ? <StatusBadge label="Blocked" tone="danger" /> : null}
            {waitingKind === "client" ? (
              <StatusBadge label="Waiting on Client" tone="warn" />
            ) : null}
            {waitingKind === "vendor" ? (
              <StatusBadge label="Waiting on Vendor" tone="warn" />
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {dueValue ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1",
                isOverdueTask(task)
                  ? "bg-rose-50 text-rose-700"
                  : isTaskDueToday(task)
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(dueValue)}
            </span>
          ) : null}
          <div
            className="ml-auto flex -space-x-2"
            title={owner ? `Owner: ${owner.fullName}` : "Unassigned"}
          >
            {people.slice(0, 3).map((person) => (
              <span
                key={person.id}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[10px] font-semibold text-white"
                title={person.fullName}
              >
                {getInitials(person.fullName)}
              </span>
            ))}
            {people.length > 3 ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-700">
                +{people.length - 3}
              </span>
            ) : null}
          </div>
        </div>
        {progress.total ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Checklist</span>
              <span>
                {progress.done}/{progress.total}
              </span>
            </div>
            <Progress value={progress.pct} className="h-1.5" />
          </div>
        ) : null}
        <div className="space-y-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1" title="Comments">
              <MessageSquare className="h-3.5 w-3.5" />
              {commentCount}
            </span>
            <span className="inline-flex items-center gap-1" title="Attachments">
              <Paperclip className="h-3.5 w-3.5" />
              {attachmentCount}
            </span>
            {task.links?.length ? (
              <span className="inline-flex items-center gap-1" title="Links">
                <LinkIcon className="h-3.5 w-3.5" />
                {task.links.length}
              </span>
            ) : null}
          </div>
          <details className="rounded-md border border-slate-100 bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-1.5 text-xs font-medium text-slate-600">
              Actions
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="grid grid-cols-5 gap-1 border-t border-slate-100 p-1">
              <Button
                className="h-8 w-full"
                size="icon"
                variant="ghost"
                title="Move to previous column"
                onClick={() => columns[columnIndex - 1] && onMove(columns[columnIndex - 1])}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="sr-only">Move to previous column</span>
              </Button>
              <Button
                className="h-8 w-full"
                size="icon"
                variant="ghost"
                title="Move to next column"
                onClick={() => columns[columnIndex + 1] && onMove(columns[columnIndex + 1])}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="sr-only">Move to next column</span>
              </Button>
              <Button
                className="h-8 w-full"
                size="icon"
                variant="ghost"
                title="Move up"
                onClick={() => moveWithin(-1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span className="sr-only">Move up</span>
              </Button>
              <Button
                className="h-8 w-full"
                size="icon"
                variant="ghost"
                title="Move down"
                onClick={() => moveWithin(1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
                <span className="sr-only">Move down</span>
              </Button>
              <Button
                className="h-8 w-full"
                size="icon"
                variant="ghost"
                title={task.archivedAt ? "Restore task" : "Archive task"}
                onClick={task.archivedAt ? onRestore : onArchive}
              >
                {task.archivedAt ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                <span className="sr-only">{task.archivedAt ? "Restore" : "Archive"}</span>
              </Button>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function TaskTableView({
  tasks,
  columns,
  data,
  onOpen,
  onMove,
  onUpdate,
}: {
  tasks: TaskRecord[];
  columns: TaskWorkflowColumn[];
  data: EaseEventsData;
  onOpen: (task: TaskRecord) => void;
  onMove: (task: TaskRecord, column: TaskWorkflowColumn) => void;
  onUpdate: (
    task: TaskRecord,
    patch: Parameters<ReturnType<typeof useEaseEventsStore>["updateTaskWorkState"]>[1],
  ) => void;
}) {
  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const owner = data.users.find((user) => user.id === task.ownerId);
              const progress = checklistProgress(task);
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <button
                      className="text-left font-medium text-slate-950 hover:text-[#9b741f]"
                      onClick={() => onOpen(task)}
                    >
                      {task.title}
                    </button>
                    <p className="line-clamp-1 text-xs text-slate-500">{task.description}</p>
                  </TableCell>
                  <TableCell>
                    <a
                      href={projectHref(task)}
                      className="text-sm font-medium text-slate-700 hover:text-[#9b741f]"
                    >
                      {getProjectName(data, task)}
                    </a>
                    {getClientName(data, task) ? (
                      <p className="text-xs text-slate-500">{getClientName(data, task)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      value={columnForTask(task, columns)?.id}
                      onChange={(event) => {
                        const column = columns.find((item) => item.id === event.target.value);
                        if (column) onMove(task, column);
                      }}
                    >
                      {columns.map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      value={task.priority}
                      onChange={(event) =>
                        onUpdate(task, { priority: event.target.value as TaskRecord["priority"] })
                      }
                    >
                      {taskPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      value={owner?.id ?? ""}
                      onChange={(event) =>
                        onUpdate(task, { ownerId: event.target.value || undefined })
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
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      className="h-9 min-w-36"
                      value={task.dueDate ?? ""}
                      onChange={(event) => onUpdate(task, { dueDate: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <TaskLabelList labels={task.labels} limit={4} compact />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {progress.done}/{progress.total}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!tasks.length ? (
          <EmptyState
            icon={CheckCircle2}
            title="No tasks match this view"
            description="Change filters or add a task to start building the board."
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function TaskInboxPanel({
  items,
  data,
  onConvert,
  onDismiss,
}: {
  items: EaseEventsData["taskInboxItems"];
  data: EaseEventsData;
  onConvert: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Inbox}
        title="Inbox is clear"
        description="Captured Fathom action items, communication follow-ups, event-day issues, and reminders land here for triage."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const project = data.projects.find(
          (entry) => entry.id === item.suggestedProjectId || entry.id === item.projectId,
        );
        return (
          <Card key={item.id} className="rounded-lg border-slate-200 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {item.sourceType}
                </p>
                <h3 className="text-base font-semibold text-slate-950">
                  {item.suggestedTitle ?? item.summary ?? "Review captured work"}
                </h3>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  {item.summary ?? item.rawContent}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Suggested project: {project?.name ?? "Internal work"} · captured{" "}
                  {formatDate(item.capturedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onConvert(item.id)}>Convert to task</Button>
                <Button variant="outline" onClick={() => onDismiss(item.id)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TaskTemplatesPanel({ data }: { data: EaseEventsData }) {
  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Task Templates</CardTitle>
      </CardHeader>
      <CardContent>
        {data.taskTemplates.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.taskTemplates.map((template) => (
              <div key={template.id} className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-950">{template.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{template.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {template.priority} · due {template.relativeDueDays ?? 0} days from anchor
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No task templates yet"
            description="Templates are ready for task sets in Increment 10A.2; daily task management is available now."
          />
        )}
      </CardContent>
    </Card>
  );
}

function TaskDetailDrawer({
  task,
  data,
  columns,
  onClose,
  onSave,
  onMove,
  onUpdateState,
  onCreateChecklist,
  onCreateChecklistItem,
  onUpdateChecklistItem,
  onCreateComment,
  onAttachFile,
}: {
  task: TaskRecord;
  data: EaseEventsData;
  columns: TaskWorkflowColumn[];
  onClose: () => void;
  onSave: (
    input: Parameters<ReturnType<typeof useEaseEventsStore>["updateTask"]>[1],
  ) => Promise<unknown>;
  onMove: (column: TaskWorkflowColumn) => void;
  onUpdateState: (
    patch: Parameters<ReturnType<typeof useEaseEventsStore>["updateTaskWorkState"]>[1],
  ) => Promise<unknown>;
  onCreateChecklist: (
    input: Parameters<ReturnType<typeof useEaseEventsStore>["createTaskChecklist"]>[0],
  ) => Promise<unknown>;
  onCreateChecklistItem: (
    input: Parameters<ReturnType<typeof useEaseEventsStore>["createTaskChecklistItem"]>[0],
  ) => Promise<unknown>;
  onUpdateChecklistItem: (
    itemId: string,
    input: Parameters<ReturnType<typeof useEaseEventsStore>["updateTaskChecklistItem"]>[1],
  ) => void;
  onCreateComment: (
    input: Parameters<ReturnType<typeof useEaseEventsStore>["createTaskComment"]>[0],
  ) => Promise<unknown>;
  onAttachFile: (
    input: Parameters<ReturnType<typeof useEaseEventsStore>["attachTaskFile"]>[0],
  ) => Promise<unknown>;
}) {
  const { currentUser } = useEaseEventsAuth();
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description);
  const [ownerId, setOwnerId] = React.useState(task.ownerId ?? "");
  const [priority, setPriority] = React.useState(task.priority);
  const [startDate, setStartDate] = React.useState(getDatePart(task.startAt));
  const [startTime, setStartTime] = React.useState(getTimePart(task.startAt, "09:00"));
  const [dueDate, setDueDate] = React.useState(task.dueDate || getDatePart(task.dueAt));
  const [dueTime, setDueTime] = React.useState(getTimePart(task.dueAt));
  const [visibility, setVisibility] = React.useState(task.visibility ?? "Internal");
  const [selectedLabelIds, setSelectedLabelIds] = React.useState(
    (task.labels ?? []).map((label) => label.id),
  );
  const [assigneeIds, setAssigneeIds] = React.useState(
    task.participants
      ?.filter((item) => item.participantRole === "Assignee")
      .map((item) => item.userId) ?? [],
  );
  const [watcherIds, setWatcherIds] = React.useState(
    task.participants
      ?.filter((item) => item.participantRole === "Watcher")
      .map((item) => item.userId) ?? [],
  );
  const [links, setLinks] = React.useState(task.links ?? []);
  const [newLinkLabel, setNewLinkLabel] = React.useState("");
  const [newLinkUrl, setNewLinkUrl] = React.useState("");
  const [newChecklistTitle, setNewChecklistTitle] = React.useState("");
  const [newChecklistItem, setNewChecklistItem] = React.useState("");
  const [targetChecklistId, setTargetChecklistId] = React.useState("");
  const [commentBody, setCommentBody] = React.useState("");
  const [attachFileId, setAttachFileId] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TaskDetailTab>("overview");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setOwnerId(task.ownerId ?? "");
    setPriority(task.priority);
    setStartDate(getDatePart(task.startAt));
    setStartTime(getTimePart(task.startAt, "09:00"));
    setDueDate(task.dueDate || getDatePart(task.dueAt));
    setDueTime(getTimePart(task.dueAt));
    setVisibility(task.visibility ?? "Internal");
    setSelectedLabelIds((task.labels ?? []).map((label) => label.id));
    setAssigneeIds(
      task.participants
        ?.filter((item) => item.participantRole === "Assignee")
        .map((item) => item.userId) ?? [],
    );
    setWatcherIds(
      task.participants
        ?.filter((item) => item.participantRole === "Watcher")
        .map((item) => item.userId) ?? [],
    );
    setLinks(task.links ?? []);
    setActiveTab("overview");
  }, [task]);

  const taskComments = data.comments
    .filter((comment) => comment.taskId === task.id && !comment.isDeleted)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const taskFiles = (task.attachments ?? [])
    .map((attachment) => data.files.find((file) => file.id === attachment.fileId))
    .filter(Boolean)
    .filter((file) =>
      canCurrentUserReadFile(file as EventFile, task, data, currentUser),
    ) as EventFile[];
  const projectFiles = data.files.filter(
    (file) =>
      (task.projectId && file.projectId === task.projectId) ||
      (task.eventId && file.eventId === task.eventId),
  );
  const checklists = getTaskChecklistGroups(task, data);
  const currentColumn = columnForTask(task, columns);
  const hasUnsavedChanges =
    title !== task.title ||
    description !== task.description ||
    ownerId !== (task.ownerId ?? "") ||
    priority !== task.priority ||
    startDate !== getDatePart(task.startAt) ||
    startTime !== getTimePart(task.startAt, "09:00") ||
    dueDate !== (task.dueDate || getDatePart(task.dueAt)) ||
    dueTime !== getTimePart(task.dueAt) ||
    visibility !== (task.visibility ?? "Internal") ||
    JSON.stringify([...selectedLabelIds].sort()) !==
      JSON.stringify((task.labels ?? []).map((label) => label.id).sort()) ||
    JSON.stringify([...assigneeIds].sort()) !==
      JSON.stringify(
        (task.participants ?? [])
          .filter((item) => item.participantRole === "Assignee")
          .map((item) => item.userId)
          .sort(),
      ) ||
    JSON.stringify([...watcherIds].sort()) !==
      JSON.stringify(
        (task.participants ?? [])
          .filter((item) => item.participantRole === "Watcher")
          .map((item) => item.userId)
          .sort(),
      ) ||
    JSON.stringify(links.map((link) => ({ label: link.label, url: link.url }))) !==
      JSON.stringify((task.links ?? []).map((link) => ({ label: link.label, url: link.url })));

  function toggleSelected(value: string, values: string[], setValues: (values: string[]) => void) {
    setValues(
      values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
    );
  }

  function buildSaveInput() {
    return {
      projectId: task.projectId,
      leadId: task.leadId,
      eventId: task.eventId,
      ownerId: ownerId || undefined,
      title,
      description,
      dueDate,
      startAt: startDate ? composeDateTime(startDate, startTime) : undefined,
      dueAt: dueDate ? composeDateTime(dueDate, dueTime) : undefined,
      status: task.status,
      priority,
      workflowColumnId: task.workflowColumnId,
      normalizedStatus: task.normalizedStatus,
      position: task.position,
      visibility,
      workType: task.workType,
      links: links.map((link) => ({ label: link.label, url: link.url })),
      labelIds: selectedLabelIds,
      assigneeIds,
      watcherIds,
    };
  }

  async function save(closeAfterSave: boolean) {
    setIsSaving(true);
    try {
      await onSave(buildSaveInput());
      toast.success("Task updated");
      if (closeAfterSave) onClose();
    } catch (error) {
      toast.error("Unable to save task", {
        description: userFacingErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function cancel() {
    if (hasUnsavedChanges && typeof window !== "undefined") {
      const shouldDiscard = window.confirm("Discard unsaved task changes?");
      if (!shouldDiscard) return;
    }
    onClose();
  }

  function addLink() {
    if (!newLinkUrl.trim()) return;
    setLinks([
      ...links,
      {
        id: `draft-link-${Date.now()}`,
        organizationId: task.organizationId,
        taskId: task.id,
        label: newLinkLabel.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim(),
        createdById: currentUser?.id,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  }

  async function addChecklist() {
    if (!newChecklistTitle.trim()) return;
    try {
      await onCreateChecklist({
        taskId: task.id,
        title: newChecklistTitle.trim(),
        sortOrder: checklists.length * 10,
      });
      setNewChecklistTitle("");
      toast.success("Checklist added");
    } catch (error) {
      toast.error("Unable to add checklist", { description: userFacingErrorMessage(error) });
    }
  }

  async function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    const checklistId = targetChecklistId || checklists[0]?.id;
    try {
      await onCreateChecklistItem({
        taskId: task.id,
        checklistId,
        title: newChecklistItem.trim(),
        sortOrder: task.checklist.length * 10,
      });
      setNewChecklistItem("");
      toast.success("Checklist item added");
    } catch (error) {
      toast.error("Unable to add checklist item", { description: userFacingErrorMessage(error) });
    }
  }

  async function addComment() {
    if (!commentBody.trim()) return;
    const mentions = data.users
      .filter((user) =>
        commentBody.toLowerCase().includes(`@${user.fullName.toLowerCase().split(" ")[0]}`),
      )
      .map((user) => user.id);
    try {
      await onCreateComment({
        taskId: task.id,
        body: commentBody.trim(),
        visibility: "Internal",
        mentions,
      });
      setCommentBody("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Unable to add comment", { description: userFacingErrorMessage(error) });
    }
  }

  async function updateStateWithFeedback(
    patch: Parameters<ReturnType<typeof useEaseEventsStore>["updateTaskWorkState"]>[1],
    successMessage: string,
  ) {
    setIsSaving(true);
    try {
      await onUpdateState(patch);
      toast.success(successMessage);
    } catch (error) {
      toast.error("Unable to update task", { description: userFacingErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }

  async function attachFileWithFeedback(
    input: Parameters<ReturnType<typeof useEaseEventsStore>["attachTaskFile"]>[0],
  ) {
    try {
      await onAttachFile(input);
      toast.success("File attached to task");
    } catch (error) {
      toast.error("Unable to attach file", { description: userFacingErrorMessage(error) });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
      role="dialog"
      aria-modal="true"
      aria-label="Task detail drawer"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close task detail drawer"
        onClick={cancel}
      />
      <aside className="relative z-10 flex h-dvh w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                {getProjectName(data, task)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-950">Task details</h2>
                {hasUnsavedChanges ? <StatusBadge label="Unsaved" tone="warn" /> : null}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={cancel}
              disabled={isSaving}
              aria-label="Close task details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button onClick={() => void save(true)} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save and close"}
            </Button>
            <Button variant="outline" onClick={() => void save(false)} disabled={isSaving}>
              Save
            </Button>
            <Button variant="ghost" onClick={cancel} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
          <div
            className="flex gap-2 overflow-x-auto"
            role="tablist"
            aria-label="Task detail sections"
          >
            {taskDetailTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-w-0 gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-6">
              <section
                className={cn("space-y-3", activeTab !== "overview" && "hidden")}
                role="tabpanel"
              >
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 text-lg font-semibold"
                />
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={7}
                  placeholder="Add formatted notes, pasted links, instructions, and context."
                />
                <p className="text-xs text-slate-500">
                  Line breaks and pasted URLs are preserved. Rich text editor controls are planned
                  for the advanced increment.
                </p>
              </section>

              <section
                className={cn("space-y-3", activeTab !== "links" && "hidden")}
                role="tabpanel"
              >
                <h3 className="text-sm font-semibold text-slate-950">Links</h3>
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div key={link.id} className="grid gap-2 md:grid-cols-[1fr_1.6fr_auto]">
                      <Input
                        value={link.label}
                        onChange={(event) =>
                          setLinks(
                            links.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: event.target.value } : item,
                            ),
                          )
                        }
                        aria-label="Link label"
                      />
                      <Input
                        value={link.url}
                        onChange={(event) =>
                          setLinks(
                            links.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, url: event.target.value } : item,
                            ),
                          )
                        }
                        aria-label="Link URL"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          setLinks(links.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_1.6fr_auto]">
                  <Input
                    value={newLinkLabel}
                    onChange={(event) => setNewLinkLabel(event.target.value)}
                    placeholder="Label"
                  />
                  <Input
                    value={newLinkUrl}
                    onChange={(event) => setNewLinkUrl(event.target.value)}
                    placeholder="https://..."
                  />
                  <Button variant="outline" onClick={addLink}>
                    <LinkIcon className="h-4 w-4" />
                    Add link
                  </Button>
                </div>
              </section>

              <section
                className={cn("space-y-3", activeTab !== "checklist" && "hidden")}
                role="tabpanel"
              >
                <h3 className="text-sm font-semibold text-slate-950">Checklists</h3>
                {checklists.map((checklist) => (
                  <div key={checklist.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-slate-950">{checklist.title}</h4>
                      <span className="text-xs text-slate-500">
                        {checklist.items.filter((item) => item.isComplete).length}/
                        {checklist.items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {checklist.items.map((item) => (
                        <ChecklistItemRow
                          key={item.id}
                          item={item}
                          users={data.users}
                          onUpdate={(input) => onUpdateChecklistItem(item.id, input)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    value={newChecklistTitle}
                    onChange={(event) => setNewChecklistTitle(event.target.value)}
                    placeholder="New checklist title"
                  />
                  <Button variant="outline" onClick={() => void addChecklist()}>
                    Add checklist
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
                  <Input
                    value={newChecklistItem}
                    onChange={(event) => setNewChecklistItem(event.target.value)}
                    placeholder="New checklist item"
                  />
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={targetChecklistId}
                    onChange={(event) => setTargetChecklistId(event.target.value)}
                    aria-label="Checklist for new item"
                  >
                    {checklists.map((checklist) => (
                      <option key={checklist.id} value={checklist.id}>
                        {checklist.title}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" onClick={() => void addChecklistItem()}>
                    Add item
                  </Button>
                </div>
              </section>

              <section
                className={cn("space-y-3", activeTab !== "files" && "hidden")}
                role="tabpanel"
              >
                <h3 className="text-sm font-semibold text-slate-950">Files</h3>
                {taskFiles.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {taskFiles.map((file) => (
                      <div key={file.id} className="rounded-lg border border-slate-200 p-3">
                        {file.mimeType.startsWith("image/") ? (
                          <img
                            src={file.storagePath}
                            alt=""
                            className="mb-3 h-32 w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-slate-100">
                            <FileText className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                        <p className="truncate text-sm font-medium text-slate-950">
                          {file.originalFilename ?? file.name}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2"
                          onClick={() =>
                            void updateStateWithFeedback(
                              { cardCoverFileId: file.id },
                              "Card cover updated",
                            )
                          }
                        >
                          Use as card cover
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Attach project files, receipts, images, PDFs, or inspiration docs to keep the
                    task card complete.
                  </p>
                )}
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={attachFileId}
                    onChange={(event) => setAttachFileId(event.target.value)}
                    aria-label="Attach existing project file"
                  >
                    <option value="">Choose an existing project file</option>
                    {projectFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.originalFilename ?? file.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={!attachFileId}
                    onClick={() => {
                      void attachFileWithFeedback({ taskId: task.id, fileId: attachFileId });
                      setAttachFileId("");
                    }}
                  >
                    Attach
                  </Button>
                </div>
                {task.projectId || task.eventId ? (
                  <div className="rounded-lg border border-slate-200 p-3">
                    <FileUploadPanel
                      projectId={task.projectId}
                      eventId={task.eventId}
                      frameless
                      defaultVisibility="Internal"
                      onUploaded={(file) =>
                        void attachFileWithFeedback({ taskId: task.id, fileId: file.id })
                      }
                    />
                  </div>
                ) : null}
              </section>

              <section
                className={cn("space-y-3", activeTab !== "comments" && "hidden")}
                role="tabpanel"
              >
                <h3 className="text-sm font-semibold text-slate-950">Comments</h3>
                <Textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Add a note or @mention a teammate..."
                />
                <Button variant="outline" onClick={() => void addComment()}>
                  <MessageSquare className="h-4 w-4" />
                  Add comment
                </Button>
                <div className="space-y-3">
                  {taskComments.map((comment) => {
                    const author = data.users.find((user) => user.id === comment.authorId);
                    return (
                      <div key={comment.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>{author?.fullName ?? "System"}</span>
                          <span>{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section
                className={cn("space-y-3", activeTab !== "activity" && "hidden")}
                role="tabpanel"
              >
                <h3 className="text-sm font-semibold text-slate-950">Activity</h3>
                <div className="space-y-3">
                  <ActivityRow label="Task created" value={task.createdAt} />
                  <ActivityRow label="Last updated" value={task.updatedAt} />
                  {task.archivedAt ? (
                    <ActivityRow label="Archived" value={task.archivedAt} />
                  ) : null}
                  {taskComments.slice(0, 5).map((comment) => {
                    const author = data.users.find((user) => user.id === comment.authorId);
                    return (
                      <div key={comment.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Comment · {formatDate(comment.createdAt)}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {author?.fullName ?? "System"} added “{comment.body.slice(0, 90)}
                          {comment.body.length > 90 ? "..." : ""}”
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <SideField label="Workflow">
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={currentColumn?.id}
                  onChange={(event) => {
                    const column = columns.find((item) => item.id === event.target.value);
                    if (column) onMove(column);
                  }}
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </SideField>
              <SideField label="Owner">
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffUsers(data).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </SideField>
              <SideField label="Priority">
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskRecord["priority"])}
                >
                  {taskPriorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </SideField>
              <SideField label="Start">
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    aria-label="Task start date"
                  />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    aria-label="Task start time"
                  />
                </div>
              </SideField>
              <SideField label="Due">
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    aria-label="Task due date"
                  />
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(event) => setDueTime(event.target.value)}
                    aria-label="Task due time"
                  />
                </div>
              </SideField>
              <SideField label="Visibility">
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value as TaskRecord["visibility"])
                  }
                >
                  {taskVisibilities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </SideField>
              <SideField label="Labels">
                <div className="space-y-2">
                  {data.taskLabels.map((label) => (
                    <label
                      key={label.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <Checkbox
                        checked={selectedLabelIds.includes(label.id)}
                        onCheckedChange={() =>
                          toggleSelected(label.id, selectedLabelIds, setSelectedLabelIds)
                        }
                      />
                      <TaskLabelPill label={label} compact />
                    </label>
                  ))}
                </div>
              </SideField>
              <SideField label="Assignees">
                <UserCheckboxes
                  users={staffUsers(data)}
                  selected={assigneeIds}
                  onChange={setAssigneeIds}
                />
              </SideField>
              <SideField label="Watchers">
                <UserCheckboxes
                  users={staffUsers(data)}
                  selected={watcherIds}
                  onChange={setWatcherIds}
                />
              </SideField>
              <div className="grid gap-2">
                <Button
                  variant={task.status === "Blocked" ? "default" : "outline"}
                  onClick={() =>
                    void updateStateWithFeedback(
                      {
                        status: task.status === "Blocked" ? "To Do" : "Blocked",
                        normalizedStatus: task.status === "Blocked" ? "Not Started" : "Blocked",
                      },
                      task.status === "Blocked" ? "Blocked status cleared" : "Task marked blocked",
                    )
                  }
                >
                  {task.status === "Blocked" ? "Clear blocked" : "Mark blocked"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void updateStateWithFeedback(
                      task.archivedAt
                        ? { archivedAt: null, archivedById: null }
                        : {
                            archivedAt: new Date().toISOString(),
                            archivedById: currentUser?.id ?? null,
                          },
                      task.archivedAt ? "Task restored" : "Task archived",
                    )
                  }
                >
                  {task.archivedAt ? "Restore task" : "Archive task"}
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ActivityRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(value)}</p>
    </div>
  );
}

function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <Label className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function UserCheckboxes({
  users,
  selected,
  onChange,
}: {
  users: AppUser[];
  selected: string[];
  onChange: (users: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {users.map((user) => (
        <label key={user.id} className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            checked={selected.includes(user.id)}
            onCheckedChange={() =>
              onChange(
                selected.includes(user.id)
                  ? selected.filter((id) => id !== user.id)
                  : [...selected, user.id],
              )
            }
          />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
            {getInitials(user.fullName)}
          </span>
          {user.fullName}
        </label>
      ))}
    </div>
  );
}

function ChecklistItemRow({
  item,
  users,
  onUpdate,
}: {
  item: TaskChecklistItem;
  users: AppUser[];
  onUpdate: (
    input: Parameters<ReturnType<typeof useEaseEventsStore>["updateTaskChecklistItem"]>[1],
  ) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 md:grid-cols-[auto_1fr_150px_140px] md:items-center">
      <Checkbox
        checked={item.isComplete}
        onCheckedChange={(checked) => onUpdate({ isComplete: Boolean(checked) })}
      />
      <Input value={item.title} onChange={(event) => onUpdate({ title: event.target.value })} />
      <select
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
        value={item.assigneeId ?? ""}
        onChange={(event) => onUpdate({ assigneeId: event.target.value || null })}
        aria-label="Checklist item assignee"
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
      <Input
        type="date"
        value={item.dueAt?.slice(0, 10) ?? ""}
        onChange={(event) =>
          onUpdate({ dueAt: event.target.value ? `${event.target.value}T17:00:00` : null })
        }
      />
    </div>
  );
}

function staffUsers(data: EaseEventsData) {
  return data.users.filter((user) => user.role === "admin" || user.role === "planner");
}

function getTaskChecklistGroups(task: TaskRecord, data: EaseEventsData) {
  const taskChecklists = data.taskChecklists
    .filter((checklist) => checklist.taskId === task.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fallback: TaskChecklist = {
    id: `fallback-checklist-${task.id}`,
    organizationId: task.organizationId,
    taskId: task.id,
    title: "Checklist",
    sortOrder: 0,
    metadata: {},
    createdAt: "",
    updatedAt: "",
  };
  const groups = taskChecklists.length ? taskChecklists : task.checklist.length ? [fallback] : [];
  return groups.map((checklist) => ({
    ...checklist,
    items: task.checklist
      .filter((item) =>
        checklist.id.startsWith("fallback-")
          ? !item.checklistId || item.checklistId === checklist.id
          : item.checklistId === checklist.id,
      )
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  }));
}

function getTaskCover(data: EaseEventsData, task: TaskRecord) {
  const explicit = task.cardCoverFileId
    ? data.files.find(
        (file) => file.id === task.cardCoverFileId && file.mimeType.startsWith("image/"),
      )
    : undefined;
  if (explicit) return explicit;
  const attachedFiles = (task.attachments ?? [])
    .map((attachment) => data.files.find((file) => file.id === attachment.fileId))
    .filter(Boolean) as EventFile[];
  return attachedFiles.find((file) => file.mimeType.startsWith("image/"));
}

function canCurrentUserReadFile(
  file: EventFile,
  task: TaskRecord,
  data: EaseEventsData,
  currentUser: AppUser | null,
) {
  if (!currentUser) return false;
  if (currentUser.role === "admin" || currentUser.role === "planner") return true;
  if (currentUser.role === "client") {
    if (file.visibility !== "Client") return false;
    const event = task.eventId ? data.events.find((item) => item.id === task.eventId) : undefined;
    const project = task.projectId
      ? data.projects.find((item) => item.id === task.projectId)
      : undefined;
    const client = project?.clientId
      ? data.clients.find((item) => item.id === project.clientId)
      : event?.clientId
        ? data.clients.find((item) => item.id === event.clientId)
        : undefined;
    return (
      event?.clientUserId === currentUser.id ||
      client?.userId === currentUser.id ||
      event?.clientEmail?.toLowerCase() === currentUser.email.toLowerCase() ||
      client?.email?.toLowerCase() === currentUser.email.toLowerCase()
    );
  }
  if (currentUser.role === "vendor") {
    if (file.visibility !== "Vendor" || !task.eventId) return false;
    return data.eventVendors.some((assignment) => {
      const vendor = data.vendors.find((item) => item.id === assignment.vendorId);
      return (
        assignment.eventId === task.eventId &&
        vendor?.email.toLowerCase() === currentUser.email.toLowerCase()
      );
    });
  }
  return false;
}
