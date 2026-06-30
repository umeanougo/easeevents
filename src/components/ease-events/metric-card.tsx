import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "default" | "good" | "warn" | "danger";
  href?: string;
}) {
  const toneClass = {
    default: "bg-slate-900 text-white",
    good: "bg-emerald-600 text-white",
    warn: "bg-amber-500 text-white",
    danger: "bg-rose-600 text-white",
  }[tone];

  const card = (
    <Card
      className={cn(
        "min-w-0 rounded-lg border-slate-200 bg-white shadow-sm",
        href && "transition-colors hover:bg-slate-50",
      )}
    >
      <CardContent className="flex min-h-32 items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            toneClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="break-words text-sm font-medium leading-5 text-slate-500">{label}</p>
          <p className="mt-1 break-words text-2xl font-semibold leading-7 tracking-normal text-slate-950">
            {value}
          </p>
          {helper ? (
            <p className="mt-1 break-words text-xs leading-4 text-slate-500">{helper}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <a href={href} className="block min-w-0 focus:outline-none focus:ring-2 focus:ring-slate-950">
      {card}
    </a>
  );
}
