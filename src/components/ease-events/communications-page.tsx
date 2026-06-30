import * as React from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { PageHeader } from "@/components/ease-events/app-shell";
import { EmptyState } from "@/components/ease-events/empty-state";
import { StatusBadge } from "@/components/ease-events/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDateTime,
  getEffectiveMeetingStatus,
  isUpcomingMeeting,
} from "@/lib/ease-events/calculations";
import { useEaseEventsAuth } from "@/lib/ease-events/auth";
import { hasOpenAIConfig } from "@/lib/ease-events/config";
import {
  disconnectIntegrationAccount,
  draftMeetingSummariesRequest,
  importFathomMeeting,
  listFathomMeetings,
  sendProjectEmailRequest,
  startIntegrationConnection,
  syncCalendar,
  syncFathomMeetings,
  syncMailbox,
  type FathomMeetingNote,
  type FathomMeetingPreview,
} from "@/lib/ease-events/integrations";
import { useEaseEventsStore } from "@/lib/ease-events/store";
import {
  type ConnectedAccount,
  communicationChannels,
  communicationDirections,
  communicationThreadStatuses,
  meetingStatuses,
  meetingTypes,
  type CommunicationDirection,
  type CommunicationMessage,
  type CommunicationThread,
  type MeetingActionItem,
  type MeetingRecord,
} from "@/lib/ease-events/types";
import { cn } from "@/lib/utils";

function eventHref(eventId: string) {
  return `/ease-events/events/${eventId}`;
}

function readSearchParam(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

function getEventLabel(
  events: ReturnType<typeof useEaseEventsStore>["data"]["events"],
  eventId: string,
) {
  return events.find((event) => event.id === eventId)?.eventName ?? "Unknown event";
}

function summarizeMeetingDraft(args: {
  eventName: string;
  transcript: string;
  agenda: string;
  notes: string;
}) {
  const transcriptLead = args.transcript
    .trim()
    .split(/[.!?]\s/)[0]
    ?.trim();
  const agendaLead = args.agenda
    .trim()
    .split(/[.!?]\s/)[0]
    ?.trim();
  const notesLead = args.notes
    .trim()
    .split(/[.!?]\s/)[0]
    ?.trim();

  const internalSummary = [
    `Call recap for ${args.eventName}.`,
    transcriptLead ? `Key signal: ${transcriptLead}.` : null,
    notesLead ? `Planner note: ${notesLead}.` : null,
    !transcriptLead && agendaLead ? `Agenda focus: ${agendaLead}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const clientSummary = [
    `Thanks for meeting with the Coco Cabana team about ${args.eventName}.`,
    agendaLead ? `We reviewed ${agendaLead.toLowerCase()}.` : null,
    notesLead ? `Next we will handle ${notesLead.toLowerCase()}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    internalSummary,
    clientSummary,
  };
}

const firstMeetingSlotIndex = 6 * 4;
const lastMeetingSlotIndex = 23 * 4 + 3;
const MEETING_TIME_OPTIONS = Array.from(
  { length: lastMeetingSlotIndex - firstMeetingSlotIndex + 1 },
  (_, offset) => {
    const index = firstMeetingSlotIndex + offset;
    const hours = String(Math.floor(index / 4)).padStart(2, "0");
    const minutes = String((index % 4) * 15).padStart(2, "0");
    return `${hours}:${minutes}`;
  },
);

function formatMeetingTimeLabel(time: string) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatMeetingDateLabel(date: Date | undefined) {
  return date ? format(date, "EEEE, MMM d, yyyy") : "Pick a meeting date";
}

function resolveCurrentEventId(
  events: ReturnType<typeof useEaseEventsStore>["data"]["events"],
  currentEventId: string,
  defaultEventId?: string,
) {
  if (defaultEventId && events.some((event) => event.id === defaultEventId)) return defaultEventId;
  if (events.some((event) => event.id === currentEventId)) return currentEventId;
  return events[0]?.id ?? defaultEventId ?? "";
}

function getEventClientEmail(
  events: ReturnType<typeof useEaseEventsStore>["data"]["events"],
  eventId: string,
) {
  return events.find((event) => event.id === eventId)?.clientEmail.trim() ?? "";
}

function getEventClientName(data: ReturnType<typeof useEaseEventsStore>["data"], eventId: string) {
  const event = data.events.find((item) => item.id === eventId);
  if (!event) return "Unknown client";
  return (
    data.clients.find((client) => client.id === event.clientId)?.displayName ??
    data.clients.find((client) => client.email.toLowerCase() === event.clientEmail.toLowerCase())
      ?.displayName ??
    event.clientNameSnapshot ??
    event.clientName
  );
}

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const bounded = Math.max(0, Math.min(totalMinutes, 23 * 60 + 45));
  const nextHours = String(Math.floor(bounded / 60)).padStart(2, "0");
  const nextMinutes = String(bounded % 60).padStart(2, "0");
  return `${nextHours}:${nextMinutes}`;
}

function combineMeetingDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseInviteEmails(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

interface ParticipantSuggestion {
  email: string;
  name: string;
  context: string;
  priority: number;
}

function getEventClientContact(
  data: ReturnType<typeof useEaseEventsStore>["data"],
  eventId: string,
): ParticipantSuggestion | null {
  const event = data.events.find((item) => item.id === eventId);
  const email = event?.clientEmail.trim();
  if (!event || !email) return null;

  return {
    email,
    name: getEventClientName(data, eventId),
    context: "Client",
    priority: 0,
  };
}

function getParticipantSuggestions(
  data: ReturnType<typeof useEaseEventsStore>["data"],
  eventId: string,
) {
  const suggestions = new Map<string, ParticipantSuggestion>();
  const addSuggestion = (suggestion: ParticipantSuggestion | null) => {
    if (!suggestion?.email) return;
    const key = suggestion.email.toLowerCase();
    const existing = suggestions.get(key);
    if (!existing || suggestion.priority < existing.priority) {
      suggestions.set(key, suggestion);
    }
  };

  addSuggestion(getEventClientContact(data, eventId));

  const eventTeamMembers = data.eventTeamMembers.filter((member) => member.eventId === eventId);
  eventTeamMembers.forEach((member) => {
    const user = data.users.find((item) => item.id === member.userId);
    if (!user?.email) return;
    addSuggestion({
      email: user.email,
      name: user.fullName,
      context: member.roleLabel || "Event team",
      priority: 1,
    });
  });

  const eventTeamUserIds = new Set(eventTeamMembers.map((member) => member.userId));
  data.users
    .filter((user) => user.role === "admin" || user.role === "planner")
    .forEach((user) => {
      addSuggestion({
        email: user.email,
        name: user.fullName,
        context: eventTeamUserIds.has(user.id) ? "Event team" : "Company planner",
        priority: eventTeamUserIds.has(user.id) ? 1 : 2,
      });
    });

  return Array.from(suggestions.values()).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });
}

function displayParticipantName(suggestions: ParticipantSuggestion[], email: string) {
  const suggestion = suggestions.find((item) => item.email.toLowerCase() === email.toLowerCase());
  return suggestion?.name || email;
}

function shouldUseEventClientEmail(currentInviteEmails: string, previousClientEmail: string) {
  const entries = parseInviteEmails(currentInviteEmails);
  if (!entries.length) return true;
  if (
    previousClientEmail &&
    entries.length === 1 &&
    entries[0].toLowerCase() === previousClientEmail.toLowerCase()
  ) {
    return true;
  }
  return !entries.some(isValidEmailAddress);
}

function providerLabel(provider: ConnectedAccount["provider"]) {
  return provider === "google" ? "Google Workspace" : "Microsoft 365";
}

function ThreadIcon({ channel }: { channel: CommunicationThread["channel"] }) {
  if (channel === "Meeting") return <Video className="h-4 w-4" />;
  if (channel === "Phone") return <Phone className="h-4 w-4" />;
  return <Mail className="h-4 w-4" />;
}

function MeetingTypeIcon({ type }: { type: MeetingRecord["meetingType"] }) {
  if (type === "Phone") return <Phone className="h-4 w-4" />;
  if (type === "In Person") return <MessageSquare className="h-4 w-4" />;
  return <Video className="h-4 w-4" />;
}

function ParticipantPicker({
  data,
  eventId,
  inputId,
  label,
  value,
  onChange,
  helper,
}: {
  data: ReturnType<typeof useEaseEventsStore>["data"];
  eventId: string;
  inputId: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  const [query, setQuery] = React.useState("");
  const suggestions = React.useMemo(
    () => getParticipantSuggestions(data, eventId),
    [data, eventId],
  );
  const selectedEmails = React.useMemo(() => parseInviteEmails(value), [value]);
  const selectedKeys = React.useMemo(
    () => new Set(selectedEmails.map((email) => email.toLowerCase())),
    [selectedEmails],
  );
  const filteredSuggestions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return suggestions
      .filter((suggestion) => !selectedKeys.has(suggestion.email.toLowerCase()))
      .filter((suggestion) => {
        if (!normalizedQuery) return suggestion.priority <= 1;
        return [suggestion.name, suggestion.email, suggestion.context].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      })
      .slice(0, 6);
  }, [query, selectedKeys, suggestions]);

  function commitParticipants(nextEmails: string[]) {
    const uniqueEmails = Array.from(
      new Map(nextEmails.map((email) => [email.toLowerCase(), email.trim()])).values(),
    ).filter(Boolean);
    onChange(uniqueEmails.join(", "));
  }

  function addParticipant(email: string) {
    const trimmed = email.trim();
    if (!trimmed) return;
    commitParticipants([...selectedEmails, trimmed]);
    setQuery("");
  }

  function addQuery() {
    const trimmed = query.trim().replace(/,$/, "");
    if (!trimmed) return;
    const matchedSuggestion =
      filteredSuggestions[0] ??
      suggestions.find(
        (suggestion) =>
          suggestion.name.toLowerCase() === trimmed.toLowerCase() ||
          suggestion.email.toLowerCase() === trimmed.toLowerCase(),
      );
    addParticipant(matchedSuggestion?.email ?? trimmed);
  }

  function removeParticipant(email: string) {
    commitParticipants(selectedEmails.filter((item) => item.toLowerCase() !== email.toLowerCase()));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="rounded-lg border border-slate-200 bg-white p-2">
        {selectedEmails.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedEmails.map((email) => {
              const displayName = displayParticipantName(suggestions, email);
              return (
                <span
                  key={email.toLowerCase()}
                  title={email}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  <span className="truncate">{displayName}</span>
                  <button
                    type="button"
                    className="rounded-sm p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                    aria-label={`Remove ${displayName}`}
                    onClick={() => removeParticipant(email)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
        <Input
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addQuery();
            }
            if (event.key === "Backspace" && !query && selectedEmails.length) {
              removeParticipant(selectedEmails[selectedEmails.length - 1]);
            }
          }}
          onBlur={() => {
            if (query.trim()) addQuery();
          }}
          placeholder="Type a name or email"
          className="border-0 px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}
      {filteredSuggestions.length ? (
        <div className="flex flex-wrap gap-2">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.email.toLowerCase()}
              type="button"
              title={suggestion.email}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              onMouseDown={(event) => {
                event.preventDefault();
                addParticipant(suggestion.email);
              }}
            >
              <Plus className="h-3 w-3" />
              <span className="font-medium">{suggestion.name}</span>
              <span className="text-slate-400">{suggestion.context}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommunicationsWorkspace({
  fixedEventId,
  showPageHeader = true,
}: {
  fixedEventId?: string;
  showPageHeader?: boolean;
}) {
  const { currentUser, authMode } = useEaseEventsAuth();
  const { data, createCommunicationThread, addCommunicationMessage, createMeeting, refreshData } =
    useEaseEventsStore();

  const [eventFilter, setEventFilter] = React.useState(
    fixedEventId ?? readSearchParam("event", "all"),
  );
  const [channelFilter, setChannelFilter] = React.useState<"all" | CommunicationThread["channel"]>(
    readSearchParam("channel", "all") as "all" | CommunicationThread["channel"],
  );
  const [threadStatusFilter, setThreadStatusFilter] = React.useState<
    "all" | CommunicationThread["status"]
  >(readSearchParam("status", "all") as "all" | CommunicationThread["status"]);

  React.useEffect(() => {
    if (fixedEventId) setEventFilter(fixedEventId);
  }, [fixedEventId]);

  const scopedThreads = data.communicationThreads
    .filter((thread) => {
      const eventMatches = eventFilter === "all" || thread.eventId === eventFilter;
      const channelMatches = channelFilter === "all" || thread.channel === channelFilter;
      const statusMatches = threadStatusFilter === "all" || thread.status === threadStatusFilter;
      return eventMatches && channelMatches && statusMatches;
    })
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

  const scopedMeetings = data.meetings
    .filter((meeting) => eventFilter === "all" || meeting.eventId === eventFilter)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
    scopedThreads[0]?.id ?? null,
  );

  React.useEffect(() => {
    if (!scopedThreads.length) {
      setSelectedThreadId(null);
      return;
    }
    if (!selectedThreadId || !scopedThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(scopedThreads[0].id);
    }
  }, [scopedThreads, selectedThreadId]);

  const selectedThread = scopedThreads.find((thread) => thread.id === selectedThreadId) ?? null;
  const selectedMessages = data.communicationMessages
    .filter((message) => message.threadId === selectedThread?.id)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  const upcomingMeetings = scopedMeetings.filter((meeting) => isUpcomingMeeting(meeting));
  const recapNeededCount = scopedMeetings.filter(
    (meeting) =>
      getEffectiveMeetingStatus(meeting) === "Completed" && !meeting.clientSummary.trim(),
  ).length;
  const pendingThreadCount = data.communicationThreads.filter(
    (thread) => thread.status === "Needs Reply",
  ).length;
  const openActionItemsCount = scopedMeetings.reduce(
    (sum, meeting) => sum + meeting.actionItems.filter((item) => !item.isComplete).length,
    0,
  );

  const [integrationNotice, setIntegrationNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const integration = params.get("integration");
    const reason = params.get("reason");
    if (!integration || !status) return;
    if (status === "connected") {
      setIntegrationNotice(
        `${integration === "google" ? "Google Workspace" : "Microsoft 365"} connected.`,
      );
      void refreshData();
      return;
    }
    if (status === "error") {
      setIntegrationNotice(reason ? decodeURIComponent(reason) : "Integration connection failed.");
    }
  }, [refreshData]);

  return (
    <div className="space-y-6">
      {showPageHeader ? (
        <PageHeader
          eyebrow="Client communications"
          title="Communications"
          description="Track client email, call scheduling, meeting recaps, transcripts, and follow-up action items in one place."
        />
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-4">
        <CommunicationMetric
          title="Needs reply"
          value={`${pendingThreadCount}`}
          helper="Client threads awaiting response"
        />
        <CommunicationMetric
          title="Upcoming meetings"
          value={`${upcomingMeetings.length}`}
          helper="Scheduled calls and reviews"
        />
        <CommunicationMetric
          title="Recaps due"
          value={`${recapNeededCount}`}
          helper="Completed calls missing client summary"
        />
        <CommunicationMetric
          title="Action items"
          value={`${openActionItemsCount}`}
          helper="Meeting follow-ups still open"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        {hasOpenAIConfig()
          ? "OpenAI is configured. AI recap workflows can be wired into these records next."
          : "AI-ready mode is enabled. Summary drafting is currently local and deterministic until OpenAI credentials are configured."}
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <Card className="min-w-0 overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              {!fixedEventId ? (
                <div className="min-w-[11rem] space-y-2">
                  <Label htmlFor="communications-event-filter">Event</Label>
                  <select
                    id="communications-event-filter"
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
              ) : null}
              <div className="min-w-[10rem] space-y-2">
                <Label htmlFor="communications-channel-filter">Channel</Label>
                <select
                  id="communications-channel-filter"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={channelFilter}
                  onChange={(event) =>
                    setChannelFilter(event.target.value as "all" | CommunicationThread["channel"])
                  }
                >
                  <option value="all">All channels</option>
                  {communicationChannels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[11rem] space-y-2">
                <Label htmlFor="communications-status-filter">Status</Label>
                <select
                  id="communications-status-filter"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={threadStatusFilter}
                  onChange={(event) =>
                    setThreadStatusFilter(
                      event.target.value as "all" | CommunicationThread["status"],
                    )
                  }
                >
                  <option value="all">All statuses</option>
                  {communicationThreadStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <CardTitle className="text-lg tracking-normal text-slate-950">
              Client communication threads
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-6">
            {scopedThreads.length ? (
              <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(14rem,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 space-y-3">
                  {scopedThreads.map((thread) => {
                    const isSelected = thread.id === selectedThread?.id;
                    const clientName = getEventClientName(data, thread.eventId);
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => setSelectedThreadId(thread.id)}
                        className={`w-full min-w-0 rounded-lg border p-4 text-left transition-colors ${
                          isSelected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <ThreadIcon channel={thread.channel} />
                              <p className="truncate font-semibold">{thread.subject}</p>
                            </div>
                            <p
                              className={`text-sm ${
                                isSelected ? "text-slate-200" : "text-slate-500"
                              }`}
                            >
                              {clientName} · {getEventLabel(data.events, thread.eventId)}
                            </p>
                            <p
                              className={`line-clamp-2 text-sm ${
                                isSelected ? "text-slate-200" : "text-slate-600"
                              }`}
                            >
                              {thread.preview}
                            </p>
                          </div>
                          {thread.unreadCount ? (
                            <span className="rounded-full bg-[#d4af37] px-2 py-0.5 text-xs font-semibold text-[#17130d]">
                              {thread.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusBadge value={thread.channel} />
                          <StatusBadge value={thread.status} />
                          <span
                            className={`text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}
                          >
                            {formatDateTime(thread.lastActivityAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedThread ? (
                  <ThreadDetail
                    currentUserId={currentUser?.id}
                    clientName={getEventClientName(data, selectedThread.eventId)}
                    eventName={getEventLabel(data.events, selectedThread.eventId)}
                    messages={selectedMessages}
                    thread={selectedThread}
                    onReply={async (reply) => {
                      if (
                        reply.direction === "Outbound" &&
                        selectedThread.channel === "Email" &&
                        authMode === "supabase"
                      ) {
                        const account = data.connectedAccounts.find(
                          (item) =>
                            item.status === "Connected" &&
                            (item.userId === currentUser?.id || currentUser?.role === "admin"),
                        );
                        const result = await sendProjectEmailRequest({
                          accountId: account?.id,
                          threadId: selectedThread.id,
                          eventId: selectedThread.eventId,
                          projectId: selectedThread.projectId,
                          leadId: selectedThread.leadId,
                          to: selectedThread.participants,
                          subject: selectedThread.subject.toLowerCase().startsWith("re:")
                            ? selectedThread.subject
                            : `Re: ${selectedThread.subject}`,
                          body: reply.body,
                          visibility: reply.visibility,
                          idempotencyKey:
                            typeof crypto !== "undefined" && "randomUUID" in crypto
                              ? `reply-${crypto.randomUUID()}`
                              : `reply-${Date.now()}`,
                        });
                        await refreshData();
                        setSelectedThreadId(result.threadId);
                        return;
                      }
                      await addCommunicationMessage({
                        threadId: selectedThread.id,
                        eventId: selectedThread.eventId,
                        authorId: reply.direction === "Inbound" ? undefined : currentUser?.id,
                        direction: reply.direction,
                        body: reply.body,
                        summary: reply.summary,
                        visibility: reply.visibility,
                        sentAt: new Date().toISOString(),
                      });
                    }}
                  />
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={Mail}
                title="No communication threads"
                description="Log a client email, phone note, or planning conversation to start the timeline."
              />
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
          <CreateThreadPanel
            authMode={authMode}
            currentUserId={currentUser?.id}
            defaultEventId={fixedEventId}
            onEmailSent={async (threadId) => {
              await refreshData();
              setSelectedThreadId(threadId);
            }}
            onCreate={async (threadDraft, firstMessage) => {
              const thread = await createCommunicationThread(threadDraft);
              await addCommunicationMessage({
                ...firstMessage,
                threadId: thread.id,
              });
              setSelectedThreadId(thread.id);
            }}
          />
          <CreateMeetingPanel
            currentUserId={currentUser?.id}
            defaultEventId={fixedEventId}
            connectedAccounts={data.connectedAccounts}
            users={data.users}
            onCreate={createMeeting}
          />
          <FathomMeetingNotesPanel defaultEventId={fixedEventId} events={data.events} />
        </div>
      </div>

      <MeetingsTable events={data.events} meetings={scopedMeetings} />

      <IntegrationAccountsPanel
        accounts={data.connectedAccounts}
        authMode={authMode}
        notice={integrationNotice}
        onClearNotice={() => setIntegrationNotice(null)}
        onRefresh={refreshData}
      />
    </div>
  );
}

function IntegrationAccountsPanel({
  accounts,
  authMode,
  notice,
  onClearNotice,
  onRefresh,
}: {
  accounts: ConnectedAccount[];
  authMode: "demo" | "supabase";
  notice: string | null;
  onClearNotice: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const googleAccount = accounts.find((account) => account.provider === "google");
  const microsoftAccount = accounts.find((account) => account.provider === "microsoft");

  async function runAction(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setStatus(null);
    try {
      await action();
      await onRefresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Integration action failed.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Live integrations
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={authMode !== "supabase"}
              onClick={() =>
                void runAction("connect-google", async () => {
                  await startIntegrationConnection("google", window.location.pathname);
                })
              }
            >
              <Mail className="h-4 w-4" />
              {googleAccount ? "Reconnect Google" : "Connect Google"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={authMode !== "supabase"}
              onClick={() =>
                void runAction("connect-microsoft", async () => {
                  await startIntegrationConnection("microsoft", window.location.pathname);
                })
              }
            >
              <CalendarClock className="h-4 w-4" />
              {microsoftAccount ? "Reconnect Microsoft" : "Connect Microsoft"}
            </Button>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Connect Gmail or Outlook for inbox sync, pull calendar updates into event workspaces, and
          generate real meeting links from connected calendars.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>{notice}</span>
            <button type="button" className="font-medium" onClick={onClearNotice}>
              Dismiss
            </button>
          </div>
        ) : null}
        {status ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {status}
          </div>
        ) : null}
        {authMode !== "supabase" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Sign in with a Supabase-backed staff account to connect Google or Microsoft providers.
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {[googleAccount, microsoftAccount].map((account, index) => {
            const provider = index === 0 ? "google" : "microsoft";
            const label = providerLabel(provider);
            const syncKeyPrefix = `provider-${provider}`;
            return (
              <div key={provider} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {account
                        ? account.providerAccountEmail
                        : provider === "google"
                          ? "Gmail + Google Calendar"
                          : "Outlook + Microsoft Calendar"}
                    </p>
                  </div>
                  <StatusBadge value={account?.status ?? "Not connected"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!account || busyKey === `${syncKeyPrefix}-mail`}
                    onClick={() =>
                      account &&
                      void runAction(`${syncKeyPrefix}-mail`, async () => {
                        const result = await syncMailbox(account.id);
                        setStatus(
                          `Mailbox sync complete: ${result.createdMessages ?? 0} new messages, ${result.createdThreads ?? 0} new threads, ${result.updatedThreads ?? 0} threads refreshed.`,
                        );
                      })
                    }
                  >
                    <Mail className="h-4 w-4" />
                    Sync mail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!account || busyKey === `${syncKeyPrefix}-calendar`}
                    onClick={() =>
                      account &&
                      void runAction(`${syncKeyPrefix}-calendar`, async () => {
                        const result = await syncCalendar(account.id);
                        setStatus(
                          `Calendar sync complete: ${result.createdMeetings ?? 0} meetings added, ${result.updatedMeetings ?? 0} refreshed.`,
                        );
                      })
                    }
                  >
                    <CalendarDays className="h-4 w-4" />
                    Sync calendar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!account || busyKey === `${syncKeyPrefix}-disconnect`}
                    onClick={() =>
                      account &&
                      void runAction(`${syncKeyPrefix}-disconnect`, async () => {
                        await disconnectIntegrationAccount(account.id);
                        setStatus(`${label} disconnected.`);
                      })
                    }
                  >
                    Disconnect
                  </Button>
                </div>
                {account ? (
                  <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <p>
                      Mail sync:{" "}
                      {account.lastMailSyncedAt
                        ? formatDateTime(account.lastMailSyncedAt)
                        : "Not yet"}
                    </p>
                    <p>
                      Calendar sync:{" "}
                      {account.lastCalendarSyncedAt
                        ? formatDateTime(account.lastCalendarSyncedAt)
                        : "Not yet"}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CommunicationMetric({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function MeetingRecapBody({ body, isInverted = false }: { body: string; isInverted?: boolean }) {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const headingLabels = new Set([
    "Meeting Purpose",
    "Key Takeaways",
    "Topics",
    "Event Requirements",
    "Next Steps",
    "Action items",
  ]);

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const normalized = line.replace(/:$/, "");
        const isHeading = headingLabels.has(normalized);
        const isBullet = line.startsWith("- ");
        const isUrl = /^https?:\/\//.test(line);

        if (isHeading) {
          return (
            <h4
              key={`${line}-${index}`}
              className={cn(
                "pt-2 text-xs font-semibold uppercase tracking-[0.14em]",
                isInverted ? "text-slate-200" : "text-slate-500",
              )}
            >
              {normalized}
            </h4>
          );
        }

        if (isUrl) {
          return (
            <a
              key={`${line}-${index}`}
              href={line}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "block break-words text-sm underline",
                isInverted ? "text-white" : "text-slate-700",
              )}
            >
              Open recording
            </a>
          );
        }

        return (
          <p
            key={`${line}-${index}`}
            className={cn(
              "text-sm leading-6",
              isBullet ? "pl-4 before:mr-2 before:content-['-']" : "",
              isInverted ? "text-slate-100" : "text-slate-600",
            )}
          >
            {isBullet ? line.slice(2) : line}
          </p>
        );
      })}
    </div>
  );
}

function ThreadDetail({
  clientName,
  currentUserId,
  eventName,
  messages,
  thread,
  onReply,
}: {
  clientName: string;
  currentUserId?: string;
  eventName: string;
  messages: CommunicationMessage[];
  thread: CommunicationThread;
  onReply: (input: {
    body: string;
    direction: CommunicationDirection;
    summary?: string;
    visibility: CommunicationMessage["visibility"];
  }) => Promise<void>;
}) {
  const [replyBody, setReplyBody] = React.useState("");
  const [replyDirection, setReplyDirection] = React.useState<CommunicationDirection>("Outbound");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [replyStatus, setReplyStatus] = React.useState("");

  return (
    <div className="min-w-0 space-y-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
      <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold text-slate-950">{thread.subject}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {clientName} ·{" "}
              <a href={eventHref(thread.eventId)} className="font-medium text-slate-700 underline">
                {eventName}
              </a>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={thread.channel} />
            <StatusBadge value={thread.status} />
          </div>
        </div>
        {thread.participants.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {thread.participants.map((participant) => (
              <span
                key={participant}
                className="max-w-full break-all rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
              >
                {participant}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="max-h-[24rem] min-w-0 space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => {
          const isFromCurrentUser = message.authorId && message.authorId === currentUserId;
          const isImportedFathomMessage =
            thread.integrationSource === "Fathom" || message.externalProvider === "fathom";
          return (
            <div
              key={message.id}
              className={`min-w-0 rounded-lg border p-3 ${
                isFromCurrentUser
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      isFromCurrentUser ? "bg-white text-slate-950" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {message.direction === "Inbound"
                      ? "CL"
                      : message.direction === "Internal"
                        ? "IN"
                        : "CC"}
                  </span>
                  <StatusBadge value={message.direction} />
                  {message.deliveryStatus ? <StatusBadge value={message.deliveryStatus} /> : null}
                </div>
                <span
                  className={`text-xs ${isFromCurrentUser ? "text-slate-200" : "text-slate-500"}`}
                >
                  {formatDateTime(message.sentAt)}
                </span>
              </div>
              {message.summary && !isImportedFathomMessage ? (
                <p
                  className={`mt-3 break-words text-sm font-medium ${isFromCurrentUser ? "text-white" : "text-slate-900"}`}
                >
                  {message.summary}
                </p>
              ) : null}
              {isImportedFathomMessage ? (
                <div
                  className={cn(
                    "mt-3 rounded-lg border p-4",
                    isFromCurrentUser ? "border-white/20 bg-white/10" : "border-slate-200 bg-white",
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isFromCurrentUser ? "text-white" : "text-slate-950",
                      )}
                    >
                      Fathom recap
                    </p>
                    <StatusBadge value="Meeting" />
                  </div>
                  <MeetingRecapBody body={message.body} isInverted={Boolean(isFromCurrentUser)} />
                </div>
              ) : (
                <>
                  <p
                    className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${isFromCurrentUser ? "text-slate-100" : "text-slate-600"}`}
                  >
                    {message.body}
                  </p>
                  {message.deliveryError ? (
                    <p
                      className={`mt-2 rounded-md px-2 py-1 text-xs ${
                        isFromCurrentUser ? "bg-white/10 text-rose-100" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      Delivery issue: {message.deliveryError}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>

      <form
        className="grid min-w-0 gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto]"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!replyBody.trim()) return;
          setIsSubmitting(true);
          setReplyStatus("");
          try {
            await onReply({
              body: replyBody,
              direction: replyDirection,
              summary: replyBody.slice(0, 120),
              visibility: replyDirection === "Internal" ? "Internal" : "Client",
            });
            setReplyBody("");
            const successMessage =
              replyDirection === "Outbound" ? "Reply sent or recorded." : "Reply saved.";
            setReplyStatus(successMessage);
            toast.success(successMessage);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to save reply.";
            setReplyStatus(message);
            toast.error("Unable to save reply", { description: message });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor={`thread-direction-${thread.id}`}>Reply type</Label>
          <select
            id={`thread-direction-${thread.id}`}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={replyDirection}
            onChange={(event) => setReplyDirection(event.target.value as CommunicationDirection)}
          >
            {communicationDirections.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`thread-reply-${thread.id}`}>Message or note</Label>
          <Textarea
            id={`thread-reply-${thread.id}`}
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            placeholder="Log the next client email, call note, or internal handoff."
            rows={4}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isSubmitting || !replyBody.trim()}>
            {isSubmitting
              ? "Saving..."
              : replyDirection === "Outbound"
                ? "Send reply"
                : "Save reply"}
          </Button>
        </div>
        {replyStatus ? (
          <p className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600">
            {replyStatus}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function CreateThreadPanel({
  authMode,
  currentUserId,
  defaultEventId,
  onEmailSent,
  onCreate,
}: {
  authMode: "demo" | "supabase";
  currentUserId?: string;
  defaultEventId?: string;
  onEmailSent?: (threadId: string) => Promise<void>;
  onCreate: (
    thread: Omit<CommunicationThread, "id" | "organizationId">,
    firstMessage: Omit<CommunicationMessage, "id" | "organizationId">,
  ) => Promise<void>;
}) {
  const { data } = useEaseEventsStore();
  type CommunicationAction = "compose" | "call" | "note" | "meeting";
  const actionConfig = React.useMemo<
    Record<
      CommunicationAction,
      {
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        channel: CommunicationThread["channel"];
        direction: CommunicationDirection;
        status: CommunicationThread["status"];
        source: string;
        titleLabel: string;
        bodyLabel: string;
        bodyPlaceholder: string;
        submitLabel: string;
      }
    >
  >(
    () => ({
      compose: {
        label: "Compose email",
        icon: Mail,
        channel: "Email",
        direction: "Outbound",
        status: "Waiting on Client",
        source: "EaseEvents email",
        titleLabel: "Subject",
        bodyLabel: "Message body",
        bodyPlaceholder:
          "Write the client-facing email. Delivery status is recorded in the timeline.",
        submitLabel: "Send email",
      },
      call: {
        label: "Log call",
        icon: Phone,
        channel: "Phone",
        direction: "Internal",
        status: "Closed",
        source: "Phone call",
        titleLabel: "Call outcome",
        bodyLabel: "Call summary and action items",
        bodyPlaceholder:
          "Capture participants, decisions, outcome, follow-up date, and action items.",
        submitLabel: "Log call",
      },
      note: {
        label: "Add internal note",
        icon: MessageSquare,
        channel: "Meeting",
        direction: "Internal",
        status: "Closed",
        source: "Internal note",
        titleLabel: "Note title",
        bodyLabel: "Internal note",
        bodyPlaceholder: "Add planner-only context, risks, preferences, or handoff notes.",
        submitLabel: "Add note",
      },
      meeting: {
        label: "Schedule meeting",
        icon: CalendarClock,
        channel: "Meeting",
        direction: "Outbound",
        status: "Scheduled",
        source: "Meeting scheduler",
        titleLabel: "Meeting title",
        bodyLabel: "Agenda or scheduling note",
        bodyPlaceholder:
          "Record what this consultation or meeting is for. Use the meeting scheduler below for calendar creation.",
        submitLabel: "Record schedule note",
      },
    }),
    [],
  );
  const [action, setAction] = React.useState<CommunicationAction>("compose");
  const [form, setForm] = React.useState({
    eventId: defaultEventId ?? data.events[0]?.id ?? "",
    channel: "Email" as CommunicationThread["channel"],
    status: "Needs Reply" as CommunicationThread["status"],
    subject: "",
    clientName: "",
    participants: "",
    connectedAccountId: "",
    integrationSource: "Manual log",
    body: "",
    direction: "Outbound" as CommunicationDirection,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState("");
  const selectedAction = actionConfig[action];
  const sendableAccounts = data.connectedAccounts.filter(
    (account) =>
      account.status === "Connected" &&
      (!currentUserId ||
        account.userId === currentUserId ||
        data.users.find((user) => user.id === currentUserId)?.role === "admin"),
  );
  const selectedConnectedAccount = sendableAccounts.find(
    (account) => account.id === form.connectedAccountId,
  );
  const selectedAccountCanSend =
    !selectedConnectedAccount ||
    (selectedConnectedAccount.provider === "google"
      ? selectedConnectedAccount.scopes.includes("https://www.googleapis.com/auth/gmail.send")
      : selectedConnectedAccount.scopes.includes("Mail.Send"));
  const selectedAccountNeedsReconnect = Boolean(
    selectedConnectedAccount && !selectedAccountCanSend,
  );

  React.useEffect(() => {
    setForm((current) => {
      const nextEventId = resolveCurrentEventId(data.events, current.eventId, defaultEventId);
      const currentEventExists = data.events.some((event) => event.id === current.eventId);
      const previousClientEmail = getEventClientEmail(data.events, current.eventId);
      const nextEvent = data.events.find((event) => event.id === nextEventId);
      const nextClientName = nextEvent
        ? getEventClientName(data, nextEvent.id)
        : current.clientName;
      const nextClientEmail = nextEvent?.clientEmail.trim() ?? "";
      const nextParticipants =
        nextClientEmail &&
        (!currentEventExists ||
          shouldUseEventClientEmail(current.participants, previousClientEmail))
          ? nextClientEmail
          : current.participants;

      if (
        current.eventId === nextEventId &&
        current.clientName === nextClientName &&
        current.participants === nextParticipants
      ) {
        return current;
      }

      return {
        ...current,
        eventId: nextEventId,
        clientName: nextClientName,
        participants: nextParticipants,
      };
    });
  }, [data, defaultEventId]);

  React.useEffect(() => {
    const event = data.events.find((item) => item.id === form.eventId);
    if (!event) return;
    setForm((current) => ({
      ...current,
      clientName: current.clientName || getEventClientName(data, event.id),
      participants: current.participants || event.clientEmail,
    }));
  }, [data, form.eventId]);

  React.useEffect(() => {
    const next = actionConfig[action];
    setForm((current) => ({
      ...current,
      channel: next.channel,
      direction: next.direction,
      status: next.status,
      integrationSource: next.source,
    }));
  }, [action, actionConfig]);

  React.useEffect(() => {
    if (form.connectedAccountId || !sendableAccounts.length) return;
    setForm((current) => ({ ...current, connectedAccountId: sendableAccounts[0]?.id ?? "" }));
  }, [form.connectedAccountId, sendableAccounts]);

  function clearDraft() {
    const nextEventId = resolveCurrentEventId(data.events, form.eventId, defaultEventId);
    const event = data.events.find((item) => item.id === nextEventId);
    setForm((current) => ({
      ...current,
      eventId: nextEventId,
      channel: selectedAction.channel,
      status: selectedAction.status,
      subject: "",
      clientName: event ? getEventClientName(data, event.id) : "",
      participants: event?.clientEmail ?? "",
      connectedAccountId: sendableAccounts[0]?.id ?? "",
      integrationSource: selectedAction.source,
      body: "",
      direction: selectedAction.direction,
    }));
    setSubmitStatus("");
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Project communication actions
        </CardTitle>
        <p className="text-sm leading-6 text-slate-500">
          Choose the action first, then record the communication in the project timeline.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            setSubmitStatus("");
            try {
              const selectedEventId = resolveCurrentEventId(
                data.events,
                form.eventId,
                defaultEventId,
              );
              if (!selectedEventId) throw new Error("Select an event before logging this thread.");

              const selectedEvent = data.events.find((event) => event.id === selectedEventId);
              const createdAt = new Date().toISOString();
              const participants = parseInviteEmails(form.participants);
              const threadDraft = {
                eventId: selectedEventId,
                projectId: selectedEvent?.projectId,
                leadId: selectedEvent?.leadId,
                assignedToId: currentUserId,
                subject: form.subject,
                clientName: selectedEvent
                  ? getEventClientName(data, selectedEvent.id)
                  : form.clientName,
                participants,
                channel: selectedAction.channel,
                status:
                  selectedAction.direction === "Inbound" ? "Needs Reply" : selectedAction.status,
                integrationSource: form.integrationSource,
                preview: form.body,
                unreadCount: form.direction === "Inbound" ? 1 : 0,
                lastActivityAt: createdAt,
              };
              const firstMessage = {
                threadId: "",
                eventId: selectedEventId,
                projectId: selectedEvent?.projectId,
                leadId: selectedEvent?.leadId,
                authorId: selectedAction.direction === "Inbound" ? undefined : currentUserId,
                direction: selectedAction.direction,
                body: form.body,
                summary: form.body.slice(0, 120),
                visibility: selectedAction.direction === "Internal" ? "Internal" : "Client",
                sentAt: createdAt,
              };

              if (action === "compose" && authMode === "supabase") {
                const result = await sendProjectEmailRequest({
                  accountId: form.connectedAccountId || undefined,
                  thread: {
                    eventId: selectedEventId,
                    projectId: selectedEvent?.projectId,
                    leadId: selectedEvent?.leadId,
                    assignedToId: currentUserId,
                    subject: form.subject,
                    clientName: threadDraft.clientName,
                    participants,
                  },
                  eventId: selectedEventId,
                  projectId: selectedEvent?.projectId,
                  leadId: selectedEvent?.leadId,
                  to: participants,
                  subject: form.subject,
                  body: form.body,
                  visibility: "Client",
                  idempotencyKey:
                    typeof crypto !== "undefined" && "randomUUID" in crypto
                      ? `compose-${crypto.randomUUID()}`
                      : `compose-${Date.now()}`,
                });
                const deliveryStatus = result.deliveryStatus ?? "recorded";
                const statusMessage = result.deliveryError
                  ? `${deliveryStatus}: ${result.deliveryError}`
                  : deliveryStatus === "Sent"
                    ? "Email sent."
                    : deliveryStatus === "Test Redirected"
                      ? "Email redirected to the configured test inbox."
                      : deliveryStatus === "Suppressed"
                        ? "Email suppressed. No email was delivered because email mode is disabled."
                        : `Email ${String(deliveryStatus).toLowerCase()}.`;
                setSubmitStatus(statusMessage);
                if (result.deliveryError) {
                  toast.error("Email recorded with delivery issue", {
                    description: result.deliveryError,
                  });
                } else if (deliveryStatus === "Suppressed") {
                  toast.warning("Email suppressed", {
                    description:
                      "No email was delivered because EASE_EVENTS_EMAIL_MODE is disabled.",
                  });
                } else if (deliveryStatus === "Sent") {
                  toast.success("Email sent");
                } else if (deliveryStatus === "Test Redirected") {
                  toast.success("Email redirected to test inbox");
                } else {
                  toast.success("Communication saved");
                }
                await onEmailSent?.(result.threadId);
              } else {
                await onCreate(threadDraft, firstMessage);
                setSubmitStatus(`${selectedAction.label} saved.`);
                toast.success(`${selectedAction.label} saved`);
              }
              setForm((current) => ({
                ...current,
                subject: "",
                body: "",
                direction: selectedAction.direction,
              }));
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Unable to save communication.";
              setSubmitStatus(message);
              toast.error("Unable to save communication", { description: message });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {!defaultEventId ? (
            <div className="space-y-2">
              <Label htmlFor="comms-thread-event">Event</Label>
              <select
                id="comms-thread-event"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.eventId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventId: event.target.value }))
                }
              >
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(actionConfig) as CommunicationAction[]).map((item) => {
              const Icon = actionConfig[item].icon;
              return (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition",
                    action === item
                      ? "border-amber-300 bg-amber-50 text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  onClick={() => setAction(item)}
                >
                  <Icon className="h-4 w-4" />
                  {actionConfig[item].label}
                </button>
              );
            })}
          </div>
          {submitStatus ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              {submitStatus}
            </div>
          ) : null}
          {action === "compose" ? (
            <div className="space-y-2">
              <Label htmlFor="comms-thread-from">From</Label>
              <select
                id="comms-thread-from"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.connectedAccountId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    connectedAccountId: event.target.value,
                  }))
                }
              >
                <option value="">Record only or use disabled email mode</option>
                {sendableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.provider === "google" ? "Google Workspace" : "Microsoft 365"} ·{" "}
                    {account.providerAccountEmail}
                    {account.provider === "google" &&
                    !account.scopes.includes("https://www.googleapis.com/auth/gmail.send")
                      ? " (reconnect to send)"
                      : account.provider === "microsoft" && !account.scopes.includes("Mail.Send")
                        ? " (reconnect to send)"
                        : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-slate-500">
                Disabled mode records without delivery. Test mode redirects to the configured test
                email. Live mode sends through this mailbox.
              </p>
              {selectedAccountNeedsReconnect ? (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <p>
                    This mailbox is connected for sync, but it is missing send permission. Reconnect{" "}
                    {selectedConnectedAccount?.provider === "google" ? "Google" : "Microsoft"}{" "}
                    before using live email delivery.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={authMode !== "supabase"}
                    onClick={() =>
                      void startIntegrationConnection(
                        selectedConnectedAccount?.provider === "google" ? "google" : "microsoft",
                        window.location.pathname,
                      )
                    }
                  >
                    Reconnect{" "}
                    {selectedConnectedAccount?.provider === "google" ? "Google" : "Microsoft"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="comms-thread-subject">{selectedAction.titleLabel}</Label>
            <Input
              id="comms-thread-subject"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              required
            />
          </div>
          <ParticipantPicker
            data={data}
            eventId={form.eventId}
            inputId="comms-thread-participants"
            label="Participants"
            value={form.participants}
            onChange={(participants) => setForm((current) => ({ ...current, participants }))}
            helper="The event client is included by default. Type a planner name or email to add the event team or another company planner."
          />
          <div className="space-y-2">
            <Label htmlFor="comms-thread-body">{selectedAction.bodyLabel}</Label>
            <Textarea
              id="comms-thread-body"
              rows={4}
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder={selectedAction.bodyPlaceholder}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="comms-thread-source">Source</Label>
              <Input
                id="comms-thread-source"
                value={form.integrationSource}
                onChange={(event) =>
                  setForm((current) => ({ ...current, integrationSource: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isSubmitting} onClick={clearDraft}>
                Clear
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Plus className="h-4 w-4" />
                {isSubmitting ? "Saving..." : selectedAction.submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateMeetingPanel({
  currentUserId,
  defaultEventId,
  connectedAccounts,
  users,
  onCreate,
}: {
  currentUserId?: string;
  defaultEventId?: string;
  connectedAccounts: ConnectedAccount[];
  users: ReturnType<typeof useEaseEventsStore>["data"]["users"];
  onCreate: (
    meeting: Omit<MeetingRecord, "id" | "organizationId" | "createdAt">,
  ) => Promise<MeetingRecord>;
}) {
  const { data } = useEaseEventsStore();
  const [form, setForm] = React.useState({
    eventId: defaultEventId ?? data.events[0]?.id ?? "",
    title: "",
    meetingType: "Google Meet" as MeetingRecord["meetingType"],
    status: "Scheduled" as MeetingRecord["status"],
    connectedAccountId: "",
    meetingDate: toDateInputValue(new Date()),
    startTime: "10:00",
    endTime: "10:30",
    attendees: "",
    agenda: "",
    link: "",
    transcript: "",
    internalSummary: "",
    clientSummary: "",
    notes: "",
  });
  const [actionItems, setActionItems] = React.useState<
    Array<{ id: string; title: string; ownerId: string; dueDate: string }>
  >([
    { id: "action-1", title: "", ownerId: "", dueDate: "" },
    { id: "action-2", title: "", ownerId: "", dueDate: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDraftingSummaries, setIsDraftingSummaries] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    setForm((current) => {
      const nextEventId = resolveCurrentEventId(data.events, current.eventId, defaultEventId);
      const currentEventExists = data.events.some((event) => event.id === current.eventId);
      const previousClientEmail = getEventClientEmail(data.events, current.eventId);
      const nextClientEmail = getEventClientEmail(data.events, nextEventId);
      const nextAttendees =
        nextClientEmail &&
        (!currentEventExists || shouldUseEventClientEmail(current.attendees, previousClientEmail))
          ? nextClientEmail
          : current.attendees;

      if (current.eventId === nextEventId && current.attendees === nextAttendees) return current;
      return { ...current, eventId: nextEventId, attendees: nextAttendees };
    });
  }, [data.events, defaultEventId]);

  const selectedMeetingDate = React.useMemo(() => {
    if (!form.meetingDate) return undefined;
    const parsed = new Date(`${form.meetingDate}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [form.meetingDate]);

  const endTimeOptions = React.useMemo(
    () => MEETING_TIME_OPTIONS.filter((time) => time > form.startTime),
    [form.startTime],
  );

  const availableAccounts = React.useMemo(() => {
    if (form.meetingType === "Google Meet") {
      return connectedAccounts.filter((account) => account.provider === "google");
    }
    if (form.meetingType === "Microsoft Teams") {
      return connectedAccounts.filter((account) => account.provider === "microsoft");
    }
    return connectedAccounts;
  }, [connectedAccounts, form.meetingType]);

  React.useEffect(() => {
    if (!form.connectedAccountId) return;
    if (availableAccounts.some((account) => account.id === form.connectedAccountId)) return;
    setForm((current) => ({ ...current, connectedAccountId: "" }));
  }, [availableAccounts, form.connectedAccountId]);

  function clearMeetingDraft() {
    const selectedEventId = resolveCurrentEventId(data.events, form.eventId, defaultEventId);
    const selectedClientEmail = getEventClientEmail(data.events, selectedEventId);
    const seed = Date.now();
    setForm((current) => ({
      ...current,
      eventId: selectedEventId,
      title: "",
      connectedAccountId: "",
      meetingDate: toDateInputValue(new Date()),
      startTime: "10:00",
      endTime: "10:30",
      attendees: selectedClientEmail,
      agenda: "",
      link: "",
      transcript: "",
      internalSummary: "",
      clientSummary: "",
      notes: "",
    }));
    setActionItems([
      { id: `action-${seed}-1`, title: "", ownerId: "", dueDate: "" },
      { id: `action-${seed}-2`, title: "", ownerId: "", dueDate: "" },
    ]);
    setSubmitStatus(null);
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Schedule meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            setSubmitStatus(null);
            try {
              const selectedEventId = resolveCurrentEventId(
                data.events,
                form.eventId,
                defaultEventId,
              );
              if (!selectedEventId)
                throw new Error("Select an event before scheduling this meeting.");

              const startAt = combineMeetingDateAndTime(form.meetingDate, form.startTime);
              const endAt = combineMeetingDateAndTime(form.meetingDate, form.endTime);
              if (endAt <= startAt) {
                throw new Error("Choose an end time after the start time.");
              }

              const selectedClientEmail = getEventClientEmail(data.events, selectedEventId);
              const selectedEvent = data.events.find((event) => event.id === selectedEventId);
              const attendees = parseInviteEmails(form.attendees);
              if (
                form.connectedAccountId &&
                selectedClientEmail &&
                isValidEmailAddress(selectedClientEmail) &&
                !attendees.some(
                  (email) => email.toLowerCase() === selectedClientEmail.toLowerCase(),
                )
              ) {
                attendees.unshift(selectedClientEmail);
              }
              if (form.connectedAccountId) {
                const invalidAttendees = attendees.filter((item) => !isValidEmailAddress(item));
                if (!attendees.length) {
                  throw new Error(
                    "Add at least one invite email address before creating this calendar meeting.",
                  );
                }
                if (invalidAttendees.length) {
                  throw new Error(
                    `Attendees must have valid email addresses. Check: ${invalidAttendees.join(
                      ", ",
                    )}`,
                  );
                }
              }

              const createdMeeting = await onCreate({
                eventId: selectedEventId,
                projectId: selectedEvent?.projectId,
                leadId: selectedEvent?.leadId,
                title: form.title,
                meetingType: form.meetingType,
                status: form.status,
                startAt: startAt.toISOString(),
                endAt: endAt.toISOString(),
                organizerId: currentUserId,
                connectedAccountId: form.connectedAccountId || undefined,
                attendees,
                agenda: form.agenda,
                link: form.link || undefined,
                transcript: form.transcript,
                internalSummary: form.internalSummary,
                clientSummary: form.clientSummary,
                notes: form.notes,
                actionItems: actionItems
                  .filter((item) => item.title.trim())
                  .map(
                    (item): MeetingActionItem => ({
                      id: item.id,
                      title: item.title,
                      ownerId: item.ownerId || undefined,
                      dueDate: item.dueDate || undefined,
                      isComplete: false,
                    }),
                  ),
              });
              setForm((current) => ({
                ...current,
                title: "",
                connectedAccountId: "",
                meetingDate: toDateInputValue(new Date()),
                startTime: "10:00",
                endTime: "10:30",
                attendees: selectedClientEmail,
                agenda: "",
                link: "",
                transcript: "",
                internalSummary: "",
                clientSummary: "",
                notes: "",
              }));
              setActionItems([
                { id: `action-${Date.now()}-1`, title: "", ownerId: "", dueDate: "" },
                { id: `action-${Date.now()}-2`, title: "", ownerId: "", dueDate: "" },
              ]);
              setSubmitStatus({
                type: "success",
                message: createdMeeting.link
                  ? "Meeting created and calendar link attached."
                  : "Meeting saved to this event workspace.",
              });
              toast.success(
                createdMeeting.link
                  ? "Meeting created and calendar link attached"
                  : "Meeting saved",
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Unable to save this meeting.";
              setSubmitStatus({
                type: "error",
                message,
              });
              toast.error("Unable to create meeting", { description: message });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {submitStatus ? (
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm",
                submitStatus.type === "success" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800",
                submitStatus.type === "error" && "border-rose-200 bg-rose-50 text-rose-800",
                submitStatus.type === "info" && "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              {submitStatus.message}
            </div>
          ) : null}

          {!defaultEventId ? (
            <div className="space-y-2">
              <Label htmlFor="meeting-event">Event</Label>
              <select
                id="meeting-event"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.eventId}
                onChange={(event) => {
                  const eventId = event.target.value;
                  const clientEmail = getEventClientEmail(data.events, eventId);
                  setForm((current) => ({
                    ...current,
                    eventId,
                    attendees:
                      clientEmail &&
                      shouldUseEventClientEmail(
                        current.attendees,
                        getEventClientEmail(data.events, current.eventId),
                      )
                        ? clientEmail
                        : current.attendees,
                  }));
                }}
              >
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Title</Label>
              <Input
                id="meeting-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-type">Meeting type</Label>
              <select
                id="meeting-type"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.meetingType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    meetingType: event.target.value as MeetingRecord["meetingType"],
                  }))
                }
              >
                {meetingTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="meeting-account">Calendar account</Label>
              {availableAccounts.length ? (
                <span className="text-xs text-slate-500">
                  {form.meetingType === "Google Meet"
                    ? "Creates a real Google Calendar event and Meet link."
                    : form.meetingType === "Microsoft Teams"
                      ? "Creates a real Outlook event and Teams link."
                      : "Also publishes this meeting to the selected external calendar."}
                </span>
              ) : (
                <span className="text-xs text-slate-500">No matching connected account yet.</span>
              )}
            </div>
            <select
              id="meeting-account"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.connectedAccountId}
              onChange={(event) =>
                setForm((current) => ({ ...current, connectedAccountId: event.target.value }))
              }
            >
              <option value="">Local only</option>
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {providerLabel(account.provider)} · {account.providerAccountEmail}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-2">
              <Label>Meeting date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-10 w-full justify-between px-3 text-left font-normal",
                      !selectedMeetingDate && "text-slate-500",
                    )}
                  >
                    <span className="truncate">{formatMeetingDateLabel(selectedMeetingDate)}</span>
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedMeetingDate}
                    onSelect={(date) => {
                      if (!date) return;
                      setForm((current) => ({
                        ...current,
                        meetingDate: toDateInputValue(date),
                      }));
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-status">Status</Label>
              <select
                id="meeting-status"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as MeetingRecord["status"],
                  }))
                }
              >
                {meetingStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-start-time">Start time</Label>
              <Select
                value={form.startTime}
                onValueChange={(value) =>
                  setForm((current) => {
                    const nextEndTime =
                      current.endTime > value ? current.endTime : addMinutesToTime(value, 30);
                    return {
                      ...current,
                      startTime: value,
                      endTime: nextEndTime,
                    };
                  })
                }
              >
                <SelectTrigger id="meeting-start-time">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatMeetingTimeLabel(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Times are shown in local AM/PM format.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-end-time">End time</Label>
              <Select
                value={form.endTime}
                onValueChange={(value) => setForm((current) => ({ ...current, endTime: value }))}
              >
                <SelectTrigger id="meeting-end-time">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {endTimeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatMeetingTimeLabel(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Defaults to a 30-minute slot; end time stays on the selected date.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ParticipantPicker
              data={data}
              eventId={form.eventId}
              inputId="meeting-attendees"
              label="Attendees"
              value={form.attendees}
              onChange={(attendees) => setForm((current) => ({ ...current, attendees }))}
              helper="The client is added by default. Type a planner name or email to add event-team or company attendees."
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="meeting-link">Meeting link</Label>
                {form.meetingType === "Google Meet" && !form.connectedAccountId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        link: "https://meet.google.com/new",
                      }))
                    }
                  >
                    <Video className="h-4 w-4" />
                    Use Meet quick-start
                  </Button>
                ) : null}
              </div>
              <Input
                id="meeting-link"
                value={form.link}
                onChange={(event) =>
                  setForm((current) => ({ ...current, link: event.target.value }))
                }
                placeholder={
                  form.connectedAccountId
                    ? "This will be filled from the connected calendar account."
                    : "https://meet.google.com/..."
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-agenda">Agenda</Label>
            <Textarea
              id="meeting-agenda"
              rows={3}
              value={form.agenda}
              onChange={(event) =>
                setForm((current) => ({ ...current, agenda: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-transcript">Transcript or raw notes</Label>
            <Textarea
              id="meeting-transcript"
              rows={4}
              value={form.transcript}
              onChange={(event) =>
                setForm((current) => ({ ...current, transcript: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="meeting-internal-summary">Internal summary</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isDraftingSummaries}
                onClick={async () => {
                  const eventName = getEventLabel(data.events, form.eventId);
                  const input = {
                    eventName,
                    transcript: form.transcript,
                    agenda: form.agenda,
                    notes: form.notes,
                  };
                  setIsDraftingSummaries(true);
                  setSubmitStatus(null);
                  try {
                    const draft = hasOpenAIConfig()
                      ? await draftMeetingSummariesRequest(input)
                      : summarizeMeetingDraft(input);
                    setForm((current) => ({
                      ...current,
                      internalSummary: draft.internalSummary,
                      clientSummary: draft.clientSummary,
                    }));
                    setSubmitStatus({
                      type: "success",
                      message: hasOpenAIConfig()
                        ? "AI summaries drafted for planner review."
                        : "Local summaries drafted for planner review.",
                    });
                  } catch (error) {
                    const fallback = summarizeMeetingDraft(input);
                    setForm((current) => ({
                      ...current,
                      internalSummary: fallback.internalSummary,
                      clientSummary: fallback.clientSummary,
                    }));
                    setSubmitStatus({
                      type: "info",
                      message:
                        error instanceof Error
                          ? `AI drafting fell back to local summary: ${error.message}`
                          : "AI drafting fell back to local summary.",
                    });
                  } finally {
                    setIsDraftingSummaries(false);
                  }
                }}
              >
                <Sparkles className="h-4 w-4" />
                {isDraftingSummaries ? "Drafting..." : "Draft summaries"}
              </Button>
            </div>
            <Textarea
              id="meeting-internal-summary"
              rows={3}
              value={form.internalSummary}
              onChange={(event) =>
                setForm((current) => ({ ...current, internalSummary: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-client-summary">Client summary</Label>
            <Textarea
              id="meeting-client-summary"
              rows={3}
              value={form.clientSummary}
              onChange={(event) =>
                setForm((current) => ({ ...current, clientSummary: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-notes">Planner notes</Label>
            <Textarea
              id="meeting-notes"
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-950">Action items</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setActionItems((current) => [
                    ...current,
                    {
                      id: `action-${Date.now()}-${current.length + 1}`,
                      title: "",
                      ownerId: "",
                      dueDate: "",
                    },
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
            {actionItems.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1.4fr_1fr_0.8fr]"
              >
                <Input
                  value={item.title}
                  onChange={(event) =>
                    setActionItems((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? { ...currentItem, title: event.target.value }
                          : currentItem,
                      ),
                    )
                  }
                  placeholder={`Action item ${index + 1}`}
                />
                <select
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={item.ownerId}
                  onChange={(event) =>
                    setActionItems((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? { ...currentItem, ownerId: event.target.value }
                          : currentItem,
                      ),
                    )
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
                <Input
                  type="date"
                  value={item.dueDate}
                  onChange={(event) =>
                    setActionItems((current) =>
                      current.map((currentItem) =>
                        currentItem.id === item.id
                          ? { ...currentItem, dueDate: event.target.value }
                          : currentItem,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm leading-6 text-slate-500">
              {form.connectedAccountId
                ? "Save meeting to create the external calendar event first, then attach it to this event workspace."
                : "Save meeting to keep the schedule local until an external account is selected."}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={clearMeetingDraft}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.title.trim() ||
                  !form.meetingDate ||
                  !form.startTime ||
                  !form.endTime
                }
              >
                <CalendarClock className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save meeting"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function formatDurationLabel(durationSeconds: number | undefined) {
  if (!durationSeconds) return "Duration unknown";
  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

function FathomMeetingNotesPanel({
  defaultEventId,
  events,
}: {
  defaultEventId?: string;
  events: ReturnType<typeof useEaseEventsStore>["data"]["events"];
}) {
  const [meetings, setMeetings] = React.useState<FathomMeetingPreview[]>([]);
  const [eventByMeetingId, setEventByMeetingId] = React.useState<Record<string, string>>({});
  const [importedNote, setImportedNote] = React.useState<FathomMeetingNote | null>(null);
  const [busy, setBusy] = React.useState<"list" | "sync" | string | null>(null);
  const [status, setStatus] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const defaultSelectedEventId = React.useMemo(
    () => resolveCurrentEventId(events, defaultEventId ?? "", defaultEventId),
    [defaultEventId, events],
  );

  async function refreshMeetings() {
    setBusy("list");
    setStatus(null);
    try {
      const recent = await listFathomMeetings(12);
      setMeetings(recent);
      setEventByMeetingId((current) => {
        const next = { ...current };
        recent.forEach((meeting) => {
          next[meeting.id] = meeting.matchedEventId ?? next[meeting.id] ?? defaultSelectedEventId;
        });
        return next;
      });
      setStatus({
        type: "success",
        message: `${recent.length} Fathom meetings loaded.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to load Fathom meetings.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function syncFathom() {
    setBusy("sync");
    setStatus(null);
    try {
      const result = await syncFathomMeetings(10);
      setImportedNote(result.importedNotes[0] ?? importedNote);
      await refreshMeetings();
      setStatus({
        type: result.errors.length ? "info" : "success",
        message: `Fathom sync imported ${result.imported} of ${result.scanned} meetings.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to sync Fathom meetings.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function importTranscript(meeting: FathomMeetingPreview) {
    setBusy(meeting.id);
    setStatus(null);
    try {
      const note = await importFathomMeeting({
        meetingId: meeting.id,
        eventId: eventByMeetingId[meeting.id] || undefined,
      });
      setImportedNote(note);
      setStatus({
        type: note.fathomSummary || note.aiEnrichedAt ? "success" : "info",
        message: note.fathomSummary
          ? "Transcript and Fathom summary imported into the meeting thread."
          : note.aiEnrichedAt
            ? "Transcript imported and AI summary generated."
            : note.aiError
              ? `Transcript imported. AI summary is waiting: ${note.aiError}`
              : "Transcript imported. AI summary will appear when enrichment is available.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to import Fathom transcript.",
      });
    } finally {
      setBusy(null);
    }
  }

  React.useEffect(() => {
    void refreshMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Fathom meeting notes
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy === "list"}
              onClick={refreshMeetings}
            >
              <RefreshCw className="h-4 w-4" />
              {busy === "list" ? "Loading..." : "Refresh"}
            </Button>
            <Button size="sm" disabled={busy === "sync"} onClick={syncFathom}>
              <Sparkles className="h-4 w-4" />
              {busy === "sync" ? "Syncing..." : "Sync Fathom"}
            </Button>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Sync recent Fathom calls, attach the right client event, and publish the recap into the
          Meeting channel.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? (
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              status.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              status.type === "error" && "border-rose-200 bg-rose-50 text-rose-800",
              status.type === "info" && "border-slate-200 bg-slate-50 text-slate-700",
            )}
          >
            {status.message}
          </div>
        ) : null}

        {meetings.length ? (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{meeting.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {meeting.startedAt ? formatDateTime(meeting.startedAt) : "Time unknown"} ·{" "}
                      {formatDurationLabel(meeting.durationSeconds)}
                    </p>
                    {meeting.matchedEventName ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        Matched to {meeting.matchedEventName}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge value="Fathom" />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={eventByMeetingId[meeting.id] ?? ""}
                    onChange={(event) =>
                      setEventByMeetingId((current) => ({
                        ...current,
                        [meeting.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Attach later</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.eventName}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === meeting.id}
                    onClick={() => void importTranscript(meeting)}
                  >
                    <FileText className="h-4 w-4" />
                    {busy === meeting.id ? "Importing..." : "Import transcript"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No Fathom meetings"
            description="Sync Fathom to bring transcripts, summaries, and action items into EaseEvents."
          />
        )}

        {importedNote ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-950">{importedNote.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  value={
                    importedNote.fathomSummary
                      ? "Fathom summary"
                      : importedNote.aiEnrichedAt
                        ? "AI summary"
                        : "Transcript"
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === `ai-${importedNote.providerMeetingId}`}
                  onClick={() => {
                    setBusy(`ai-${importedNote.providerMeetingId}`);
                    void importFathomMeeting({
                      meetingId: importedNote.providerMeetingId,
                      eventId: importedNote.eventId,
                    })
                      .then((note) => {
                        setImportedNote(note);
                        setStatus({
                          type: note.fathomSummary || note.aiEnrichedAt ? "success" : "info",
                          message: note.fathomSummary
                            ? "Fathom summary refreshed in the meeting thread."
                            : note.aiEnrichedAt
                              ? "AI summary generated."
                              : note.aiError
                                ? `AI summary is waiting: ${note.aiError}`
                                : "Transcript refreshed. AI summary will appear when enrichment is available.",
                        });
                      })
                      .catch((error) => {
                        setStatus({
                          type: "error",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unable to generate AI summary.",
                        });
                      })
                      .finally(() => setBusy(null));
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {busy === `ai-${importedNote.providerMeetingId}`
                    ? "Refreshing..."
                    : importedNote.fathomSummary
                      ? "Refresh Fathom summary"
                      : "Generate AI summary"}
                </Button>
              </div>
            </div>
            {importedNote.aiError ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {importedNote.aiError}
              </p>
            ) : null}
            {importedNote.fathomSummary ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                <MeetingRecapBody body={importedNote.fathomSummary} />
              </div>
            ) : null}
            {importedNote.aiEnrichment.actionItems.length ? (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Action items
                </p>
                {importedNote.aiEnrichment.actionItems.slice(0, 4).map((item) => (
                  <p key={item} className="text-sm text-slate-700">
                    {item}
                  </p>
                ))}
              </div>
            ) : null}
            {importedNote.aiFollowUpDraft ? (
              <Textarea className="mt-3" rows={4} readOnly value={importedNote.aiFollowUpDraft} />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MeetingsTable({
  events,
  meetings,
}: {
  events: ReturnType<typeof useEaseEventsStore>["data"]["events"];
  meetings: MeetingRecord[];
}) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Meetings</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {meetings.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((meeting) => {
                const effectiveStatus = getEffectiveMeetingStatus(meeting);
                return (
                  <TableRow key={meeting.id}>
                    <TableCell className="min-w-64">
                      <div>
                        <p className="font-medium text-slate-950">{meeting.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {meeting.agenda || "No agenda logged yet."}
                        </p>
                        {meeting.link ? (
                          <a
                            href={meeting.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm text-slate-700 underline"
                          >
                            Open link
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a href={eventHref(meeting.eventId)} className="font-medium hover:underline">
                        {getEventLabel(events, meeting.eventId)}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>{formatDateTime(meeting.startAt)}</p>
                        <p>{formatDateTime(meeting.endAt)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MeetingTypeIcon type={meeting.meetingType} />
                        <span>{meeting.meetingType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={effectiveStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>{meeting.actionItems.length} action items</p>
                        <p>
                          {meeting.clientSummary.trim()
                            ? "Client recap ready"
                            : "Client recap pending"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="No meetings logged"
            description="Scheduled calls and completed recaps will appear here."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function CommunicationsPage() {
  return <CommunicationsWorkspace />;
}

export function EventCommunicationsPanel({ eventId }: { eventId: string }) {
  return <CommunicationsWorkspace fixedEventId={eventId} showPageHeader={false} />;
}

export function ClientMeetingsPanel({ eventId }: { eventId: string }) {
  const { data } = useEaseEventsStore();
  const meetings = data.meetings
    .filter((meeting) => meeting.eventId === eventId)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  if (!meetings.length) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No meetings scheduled"
        description="Client calls, design reviews, and recap notes will appear here."
      />
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Meetings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetings.map((meeting) => {
          const effectiveStatus = getEffectiveMeetingStatus(meeting);
          return (
            <div key={meeting.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MeetingTypeIcon type={meeting.meetingType} />
                    <p className="font-semibold text-slate-950">{meeting.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(meeting.startAt)} to {formatDateTime(meeting.endAt)}
                  </p>
                </div>
                <StatusBadge value={effectiveStatus} />
              </div>
              {meeting.clientSummary.trim() ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">{meeting.clientSummary}</p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Client recap will appear here after the meeting is completed.
                </p>
              )}
              {meeting.link ? (
                <a
                  href={meeting.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-slate-700 underline"
                >
                  Open meeting link
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
