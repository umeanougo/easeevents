import { TrendingUp, Wallet, ReceiptText, BadgeDollarSign } from "lucide-react";

import { getBudgetSummary, formatCurrency } from "@/lib/ease-events/calculations";
import type { BudgetItem, EventRecord } from "@/lib/ease-events/types";

import { MetricCard } from "./metric-card";

export function BudgetSummaryGrid({
  event,
  budgetItems,
  currency,
}: {
  event: EventRecord;
  budgetItems: BudgetItem[];
  currency: string;
}) {
  const summary = getBudgetSummary(event, budgetItems);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Planned budget"
        value={formatCurrency(summary.totalPlannedBudget, currency)}
        helper="Internal vendor plan"
        icon={Wallet}
      />
      <MetricCard
        label="Actual cost"
        value={formatCurrency(summary.totalActualCost, currency)}
        helper={`${formatCurrency(summary.totalBalanceDue, currency)} balance due`}
        icon={ReceiptText}
        tone={summary.totalBalanceDue > 0 ? "warn" : "good"}
      />
      <MetricCard
        label="Budget revenue"
        value={
          summary.hasClientPrice ? formatCurrency(summary.clientPrice, currency) : "Not configured"
        }
        helper={
          summary.hasClientPrice
            ? "Legacy event price; accepted proposals override this in Finances"
            : "Create an accepted proposal or invoice before reporting profit"
        }
        icon={BadgeDollarSign}
      />
      <MetricCard
        label="Estimated profit"
        value={
          summary.hasClientPrice
            ? formatCurrency(summary.estimatedProfit, currency)
            : "Not configured"
        }
        helper={
          summary.hasClientPrice
            ? `${summary.profitMarginPercentage}% margin`
            : "No revenue source yet"
        }
        icon={TrendingUp}
        tone={
          !summary.hasClientPrice
            ? "default"
            : summary.profitMarginPercentage >= 25
              ? "good"
              : "warn"
        }
      />
    </div>
  );
}
