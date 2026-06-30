import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { StatusBadge } from "./status-badge";

export type ActionHubItem = {
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  meta?: string;
  status?: string;
  tone?: "default" | "good" | "warn" | "danger";
  actionLabel?: string;
};

const iconTone: Record<NonNullable<ActionHubItem["tone"]>, string> = {
  default: "bg-slate-100 text-slate-700",
  good: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-700",
};

const actionGroups: Array<{
  key: NonNullable<ActionHubItem["tone"]>;
  label: string;
}> = [
  { key: "danger", label: "Critical" },
  { key: "warn", label: "Needs attention" },
  { key: "default", label: "Upcoming" },
  { key: "good", label: "Informational" },
];

export function ActionHub({
  title,
  description,
  items,
  groupByTone = false,
  emptyTitle = "Nothing urgent",
  emptyDescription = "The current view is clear. New work will appear here as it needs attention.",
}: {
  title: string;
  description?: string;
  items: ActionHubItem[];
  groupByTone?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const groupedItems = groupByTone
    ? actionGroups
        .map((group) => ({
          ...group,
          items: items.filter((item) => (item.tone ?? "default") === group.key),
        }))
        .filter((group) => group.items.length)
    : [];

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg tracking-normal text-slate-950">{title}</CardTitle>
        {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length && groupByTone ? (
          groupedItems.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    group.key === "danger"
                      ? "bg-rose-500"
                      : group.key === "warn"
                        ? "bg-amber-500"
                        : group.key === "good"
                          ? "bg-emerald-500"
                          : "bg-slate-400",
                  )}
                />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {group.label}
                </p>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <ActionHubRow key={`${item.title}-${item.href}`} item={item} compact />
                ))}
              </div>
            </div>
          ))
        ) : items.length ? (
          items.map((item) => <ActionHubRow key={`${item.title}-${item.href}`} item={item} />)
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">{emptyTitle}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{emptyDescription}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionHubRow({ item, compact = false }: { item: ActionHubItem; compact?: boolean }) {
  const Icon = item.icon;
  const content = (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "h-8 w-8" : "h-10 w-10",
          iconTone[item.tone ?? "default"],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words text-sm font-semibold text-slate-950">{item.title}</p>
          {item.status ? <StatusBadge value={item.status} /> : null}
        </div>
        <p className={cn("mt-1 text-sm text-slate-500", compact ? "leading-5" : "leading-6")}>
          {item.description}
        </p>
        {item.meta ? <p className="mt-2 text-xs font-medium text-slate-500">{item.meta}</p> : null}
      </div>
      {item.href && item.actionLabel ? (
        <span className="hidden shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 sm:inline-flex">
          {item.actionLabel}
        </span>
      ) : null}
    </div>
  );

  if (!item.href) {
    return <div className="rounded-lg border border-slate-200 p-4">{content}</div>;
  }

  return (
    <a
      href={item.href}
      className={cn(
        "block rounded-lg border transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-950",
        compact ? "border-slate-200 p-3" : "border-slate-200 p-4",
        item.tone === "danger" ? "border-l-4 border-l-rose-500" : "",
        item.tone === "warn" ? "border-l-4 border-l-amber-500" : "",
      )}
    >
      {content}
    </a>
  );
}
