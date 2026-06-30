import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "purple" | "good" | "warn" | "danger";

const toneMap: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  blue: "border-sky-200 bg-sky-100 text-sky-700",
  green: "border-emerald-200 bg-emerald-100 text-emerald-700",
  amber: "border-amber-200 bg-amber-100 text-amber-800",
  red: "border-rose-200 bg-rose-100 text-rose-700",
  purple: "border-violet-200 bg-violet-100 text-violet-700",
  good: "border-emerald-200 bg-emerald-100 text-emerald-700",
  warn: "border-amber-200 bg-amber-100 text-amber-800",
  danger: "border-rose-200 bg-rose-100 text-rose-700",
};

function getTone(value: string): Tone {
  if (["Booked", "Confirmed", "Done", "Paid", "Approved", "Completed"].includes(value)) {
    return "green";
  }
  if (["Planning", "In Progress", "Proposal Sent", "Partially Paid"].includes(value)) {
    return "blue";
  }
  if (
    [
      "Awaiting Client Approval",
      "Pending",
      "Deposit Paid",
      "Consultation Scheduled",
      "To Do",
    ].includes(value)
  ) {
    return "amber";
  }
  if (["Blocked", "Overdue", "Lost", "Cancelled", "Changes Requested"].includes(value)) {
    return "red";
  }
  if (["New Inquiry", "Urgent", "High"].includes(value)) {
    return "purple";
  }
  return "neutral";
}

export function StatusBadge({
  label,
  value,
  status,
  tone,
  className,
}: {
  label?: string;
  value?: string;
  status?: string;
  tone?: Tone;
  className?: string;
}) {
  const displayValue = label ?? value ?? status ?? "";
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full whitespace-normal break-words border text-left leading-5",
        toneMap[tone ?? getTone(displayValue)],
        className,
      )}
    >
      {displayValue}
    </Badge>
  );
}
