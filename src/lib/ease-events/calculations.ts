import type {
  BudgetItem,
  BudgetSummary,
  EventRecord,
  MeetingRecord,
  MeetingStatus,
  TaskRecord,
} from "./types";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCurrency(amount: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date?: string | null) {
  if (!date) return "TBD";

  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "TBD";

  return dateFormatter.format(parsedDate);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function getBudgetSummary(event: EventRecord, budgetItems: BudgetItem[]): BudgetSummary {
  const scopedItems = budgetItems.filter((item) => item.eventId === event.id);
  const totalPlannedBudget = scopedItems.reduce((sum, item) => sum + item.plannedAmount, 0);
  const totalActualCost = scopedItems.reduce((sum, item) => sum + item.actualAmount, 0);
  const totalPaid = scopedItems.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalBalanceDue = scopedItems.reduce(
    (sum, item) =>
      sum +
      Math.max(
        (item.actualAmount > 0 ? item.actualAmount : item.plannedAmount) - item.paidAmount,
        0,
      ),
    0,
  );
  const hasClientPrice = event.clientPrice > 0;
  const estimatedProfit = hasClientPrice ? event.clientPrice - totalActualCost : 0;
  const profitMarginPercentage = hasClientPrice
    ? Math.round((estimatedProfit / event.clientPrice) * 1000) / 10
    : 0;

  return {
    totalPlannedBudget,
    totalActualCost,
    totalPaid,
    totalBalanceDue,
    clientPrice: event.clientPrice,
    hasClientPrice,
    estimatedProfit,
    profitMarginPercentage,
  };
}

export function isOverdueTask(task: TaskRecord, today = new Date()) {
  if (task.status === "Done") return false;
  const dueDate = new Date(`${task.dueDate}T23:59:59`);
  return dueDate < today;
}

export function isUpcomingEvent(event: EventRecord, today = new Date()) {
  const eventDate = new Date(`${event.eventDate}T12:00:00`);
  const daysAway = (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return daysAway >= -1 && daysAway <= 45 && event.status !== "Cancelled";
}

export function getEffectiveMeetingStatus(
  meeting: Pick<MeetingRecord, "status" | "endAt">,
  now = new Date(),
): MeetingStatus {
  if (meeting.status !== "Scheduled") return meeting.status;

  const endTime = new Date(meeting.endAt).getTime();
  if (Number.isNaN(endTime)) return meeting.status;

  return endTime < now.getTime() ? "Completed" : "Scheduled";
}

export function isUpcomingMeeting(meeting: Pick<MeetingRecord, "status" | "endAt">) {
  return getEffectiveMeetingStatus(meeting) === "Scheduled";
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
