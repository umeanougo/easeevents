import * as React from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CreditCard,
  Download,
  FileText,
  LinkIcon,
  Plus,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/ease-events/calculations";
import {
  exportFinanceReportCsv,
  getBudgetVarianceRows,
  getExpensePaidAmount,
  getGlobalFinanceSummary,
  getInvoicePaidAmount,
  getProjectExpenses,
  getProjectFinanceSummary,
  getProjectInvoices,
} from "@/lib/ease-events/finance";
import { useEaseEventsAuth } from "@/lib/ease-events/auth";
import { useEaseEventsStore } from "@/lib/ease-events/store";
import {
  budgetCategories,
  expenseBookkeepingStatuses,
  expensePaymentMethods,
  expenseSources,
  expenseStatuses,
  type BudgetCategory,
  type BudgetVarianceRow,
  type EaseEventsData,
  type EventRecord,
  type ExpensePaymentMethod,
  type ExpenseRecord,
  type ExpenseStatus,
  type ProjectFinanceSummary,
  type ProjectRecord,
} from "@/lib/ease-events/types";
import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { MetricCard } from "./metric-card";
import { StatusBadge } from "./status-badge";

function eventHref(eventId: string, section = "finances") {
  return `/ease-events/events/${eventId}?tab=${section}`;
}

function projectEvent(data: EaseEventsData, projectId?: string, eventId?: string) {
  return (
    data.events.find((event) => event.id === eventId) ??
    data.events.find((event) => projectId && event.projectId === projectId)
  );
}

function projectName(data: EaseEventsData, summary: ProjectFinanceSummary) {
  const project = data.projects.find((item) => item.id === summary.projectId);
  const event = projectEvent(data, summary.projectId, summary.eventId);
  return project?.name ?? event?.eventName ?? "Unassigned project";
}

function clientName(data: EaseEventsData, projectId?: string, eventId?: string) {
  const project = data.projects.find((item) => item.id === projectId);
  const event = projectEvent(data, projectId, eventId);
  const client = data.clients.find((item) => item.id === (project?.clientId ?? event?.clientId));
  return client?.displayName ?? event?.clientName ?? "No client";
}

function downloadTextFile(filename: string, body: string, type = "text/csv;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[^\d.]/g, "");
  const [whole, ...decimalParts] = cleaned.split(".");
  const decimal = decimalParts.join("").slice(0, 2);
  return decimalParts.length ? `${whole}.${decimal}` : whole;
}

function parseMoneyInput(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(normalizeMoneyInput(value));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function ProjectFinanceMetrics({
  summary,
  currency,
}: {
  summary: ProjectFinanceSummary;
  currency: string;
}) {
  const metricCards = [
    {
      label: "Contracted revenue",
      value:
        summary.contractedRevenueSource === "None"
          ? "Not configured"
          : formatCurrency(summary.contractedRevenue, currency),
      helper:
        summary.contractedRevenueSource === "None"
          ? "Accepted proposal or confirmed legacy price required"
          : summary.contractedRevenueSource,
      icon: BadgeDollarSign,
      tone: "good" as const,
    },
    {
      label: "Invoiced revenue",
      value: formatCurrency(summary.invoicedRevenue, currency),
      helper: `${formatCurrency(summary.outstandingClientBalance, currency)} client balance`,
      icon: CreditCard,
      tone: summary.outstandingClientBalance > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      label: "Collected revenue",
      value: formatCurrency(summary.collectedRevenue, currency),
      helper: "Successful recorded client payments",
      icon: Wallet,
      tone: "good" as const,
    },
    {
      label: "Current cost forecast",
      value: formatCurrency(summary.currentCostForecast, currency),
      helper: `${formatCurrency(summary.plannedCost, currency)} planned budget`,
      icon: ReceiptText,
      tone:
        summary.currentCostForecast > summary.plannedCost
          ? ("warn" as const)
          : ("default" as const),
    },
    {
      label: "Incurred expenses",
      value: formatCurrency(summary.incurredExpenses, currency),
      helper: `${formatCurrency(summary.outstandingExpenseBalance, currency)} vendor balance`,
      icon: FileText,
      tone: summary.outstandingExpenseBalance > 0 ? ("warn" as const) : ("good" as const),
    },
    {
      label: "Cash position",
      value: formatCurrency(summary.cashPosition, currency),
      helper: "Collected revenue minus paid expenses",
      icon: BarChart3,
      tone: summary.cashPosition >= 0 ? ("good" as const) : ("danger" as const),
    },
    {
      label: "Forecast profit",
      value:
        summary.contractedRevenueSource === "None"
          ? "Not configured"
          : formatCurrency(summary.forecastGrossProfit, currency),
      helper:
        summary.contractedRevenueSource === "None"
          ? "No authoritative revenue source yet"
          : `${summary.forecastMarginPercentage.toFixed(1)}% forecast margin`,
      icon: BadgeDollarSign,
      tone:
        summary.contractedRevenueSource === "None"
          ? ("default" as const)
          : summary.forecastGrossProfit >= 0
            ? ("good" as const)
            : ("danger" as const),
    },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-4">
      {metricCards.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}

function FinanceAlerts({ summary }: { summary: ProjectFinanceSummary }) {
  if (!summary.alerts.length) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        No financial blockers are currently flagged for this scope.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {summary.alerts.slice(0, 6).map((alert) => (
        <a
          key={alert.id}
          href={alert.href}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-white",
            alert.severity === "Critical"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : alert.severity === "Warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-slate-200 bg-slate-50 text-slate-800",
          )}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{alert.label}</p>
              <p className="mt-1 leading-5 opacity-80">{alert.description}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function getInitialExpenseForm(data: EaseEventsData, projectId?: string, eventId?: string) {
  const event = projectEvent(data, projectId, eventId);
  const project = data.projects.find((item) => item.id === (projectId ?? event?.projectId));
  const today = new Date().toISOString().slice(0, 10);

  return {
    projectId: project?.id ?? data.projects[0]?.id ?? "",
    eventId: event?.id ?? "",
    vendorId: "",
    budgetItemId: "",
    description: "",
    category: "Miscellaneous" as BudgetCategory,
    source: "Manual" as const,
    status: "Draft" as ExpenseStatus,
    currency: data.financeSettings[0]?.defaultCurrency ?? data.organization.currency,
    subtotal: "",
    taxAmount: "",
    serviceFeeAmount: "",
    tipAmount: "",
    expenseDate: today,
    dueDate: "",
    notes: "",
    clientBillable: false,
    reimbursable: false,
    bookkeepingStatus: "Unreviewed" as const,
  };
}

function RecordExpensePanel({
  projectId,
  eventId,
  onCreated,
}: {
  projectId?: string;
  eventId?: string;
  onCreated?: () => void;
}) {
  const { data, createExpense } = useEaseEventsStore();
  const { currentUser } = useEaseEventsAuth();
  const [form, setForm] = React.useState(() => getInitialExpenseForm(data, projectId, eventId));
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const subtotal = parseMoneyInput(form.subtotal);
  const taxAmount = parseMoneyInput(form.taxAmount);
  const serviceFeeAmount = parseMoneyInput(form.serviceFeeAmount);
  const tipAmount = parseMoneyInput(form.tipAmount);
  const total = subtotal + taxAmount + serviceFeeAmount + tipAmount;
  const selectedProject = data.projects.find((project) => project.id === form.projectId);
  const selectedEvent = projectEvent(
    data,
    form.projectId,
    form.eventId || selectedProject?.eventId,
  );
  const budgetItems = data.budgetItems.filter((item) => item.eventId === selectedEvent?.id);

  async function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!form.projectId || !form.description.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      await createExpense({
        ...form,
        eventId: form.eventId || selectedEvent?.id,
        vendorId: form.vendorId || undefined,
        budgetItemId: form.budgetItemId || undefined,
        createdById: currentUser?.id,
        approvedById: form.status === "Approved" ? currentUser?.id : undefined,
        dueDate: form.dueDate || undefined,
        notes: form.notes.trim() || undefined,
        subtotal,
        taxAmount,
        serviceFeeAmount,
        tipAmount,
        totalAmount: Math.round(total * 100) / 100,
        metadata: { source: "easeevents_phase4_ui" },
        idempotencyKey:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `expense-${Date.now()}`,
      });
      setForm(getInitialExpenseForm(data, projectId, eventId));
      onCreated?.();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to record expense.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Record expense</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-4">
          {!projectId ? (
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="expense-project">Project</Label>
              <select
                id="expense-project"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.projectId}
                onChange={(event) => {
                  const nextProject = data.projects.find(
                    (project) => project.id === event.target.value,
                  );
                  setForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                    eventId: nextProject?.eventId ?? "",
                    vendorId: "",
                    budgetItemId: "",
                  }));
                }}
                required
              >
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="expense-description">Description</Label>
            <Input
              id="expense-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Vendor invoice, receipt, or reimbursement"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-vendor">Vendor</Label>
            <select
              id="expense-vendor"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.vendorId}
              onChange={(event) =>
                setForm((current) => ({ ...current, vendorId: event.target.value }))
              }
            >
              <option value="">No vendor</option>
              {data.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <select
              id="expense-category"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as BudgetCategory,
                }))
              }
            >
              {budgetCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-budget-item">Budget item</Label>
            <select
              id="expense-budget-item"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.budgetItemId}
              onChange={(event) =>
                setForm((current) => ({ ...current, budgetItemId: event.target.value }))
              }
            >
              <option value="">No linked budget</option>
              {budgetItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.category} · {item.description}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-source">Source</Label>
            <select
              id="expense-source"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.source}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  source: event.target.value as typeof form.source,
                }))
              }
            >
              {expenseSources.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-status">Status</Label>
            <select
              id="expense-status"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as ExpenseStatus,
                }))
              }
            >
              {expenseStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          {[
            ["Subtotal", "subtotal"],
            ["Tax", "taxAmount"],
            ["Service fee", "serviceFeeAmount"],
            ["Tip", "tipAmount"],
          ].map(([label, key]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`expense-${key}`}>{label}</Label>
              <Input
                id={`expense-${key}`}
                inputMode="decimal"
                value={String(form[key as keyof typeof form] ?? "")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: normalizeMoneyInput(event.target.value),
                  }))
                }
                placeholder="0.00"
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="expense-date">Expense date</Label>
            <Input
              id="expense-date"
              type="date"
              value={form.expenseDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, expenseDate: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-due">Due date</Label>
            <Input
              id="expense-due"
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, dueDate: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-bookkeeping">Bookkeeping</Label>
            <select
              id="expense-bookkeeping"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.bookkeepingStatus}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bookkeepingStatus: event.target.value as typeof form.bookkeepingStatus,
                }))
              }
            >
              {expenseBookkeepingStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {formatCurrency(total, form.currency)}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={form.clientBillable}
              onCheckedChange={(value) =>
                setForm((current) => ({ ...current, clientBillable: Boolean(value) }))
              }
            />
            Client billable
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={form.reimbursable}
              onCheckedChange={(value) =>
                setForm((current) => ({ ...current, reimbursable: Boolean(value) }))
              }
            />
            Reimbursable
          </label>
          <div className="space-y-2 lg:col-span-4">
            <Label htmlFor="expense-notes">Notes</Label>
            <Textarea
              id="expense-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Internal cost context, approval notes, or payment instructions."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-4">
            <Button type="submit" disabled={isSaving}>
              <Plus className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save expense"}
            </Button>
            <p className="text-sm text-slate-500">
              Receipt uploads use the project Files area, then can be linked here.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ExpenseActions({ expense, data }: { expense: ExpenseRecord; data: EaseEventsData }) {
  const { recordExpensePayment, attachExpenseFile } = useEaseEventsStore();
  const { currentUser } = useEaseEventsAuth();
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<ExpensePaymentMethod>("Bank Transfer");
  const [fileId, setFileId] = React.useState("");
  const [error, setError] = React.useState("");
  const paidAmount = getExpensePaidAmount(expense, data.expensePayments);
  const outstanding = Math.max(expense.totalAmount - paidAmount, 0);
  const availableFiles = data.files.filter(
    (file) =>
      (file.projectId && file.projectId === expense.projectId) ||
      (file.eventId && file.eventId === expense.eventId),
  );

  async function submitPayment() {
    setError("");
    try {
      await recordExpensePayment({
        expenseId: expense.id,
        amount: paymentAmount.trim() ? parseMoneyInput(paymentAmount) : outstanding,
        currency: expense.currency,
        paymentMethod,
        paymentDate: new Date().toISOString().slice(0, 10),
        recordedById: currentUser?.id,
        status: "Completed",
        metadata: { source: "easeevents_phase4_ui" },
        idempotencyKey:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `expense-payment-${Date.now()}`,
      });
      setIsPaymentOpen(false);
      setPaymentAmount("");
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Unable to record payment.");
    }
  }

  async function submitReceipt() {
    if (!fileId) return;
    setError("");
    try {
      await attachExpenseFile({
        expenseId: expense.id,
        fileId,
        visibility: "Internal",
        createdById: currentUser?.id,
      });
      setIsReceiptOpen(false);
      setFileId("");
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : "Unable to attach receipt.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsPaymentOpen((current) => !current);
            setPaymentAmount(outstanding ? String(outstanding) : "");
          }}
          disabled={outstanding <= 0 || expense.status === "Voided"}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Pay
        </Button>
        <Button size="sm" variant="outline" onClick={() => setIsReceiptOpen((current) => !current)}>
          <LinkIcon className="h-3.5 w-3.5" />
          Receipt
        </Button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {isPaymentOpen ? (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Input
            inputMode="decimal"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(normalizeMoneyInput(event.target.value))}
            aria-label="Expense payment amount"
            placeholder="0.00"
          />
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as ExpensePaymentMethod)}
          >
            {expensePaymentMethods.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => void submitPayment()}>
            Record payment
          </Button>
        </div>
      ) : null}
      {isReceiptOpen ? (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={fileId}
            onChange={(event) => setFileId(event.target.value)}
          >
            <option value="">Choose project file</option>
            {availableFiles.map((file) => (
              <option key={file.id} value={file.id}>
                {file.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => void submitReceipt()} disabled={!fileId}>
            Attach receipt
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ExpensesTable({
  expenses,
  data,
  currency,
}: {
  expenses: ExpenseRecord[];
  data: EaseEventsData;
  currency: string;
}) {
  if (!expenses.length) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No expenses recorded"
        description="Record vendor invoices, receipts, reimbursements, and adjustments to start tracking actual costs."
      />
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => {
              const vendor = data.vendors.find((item) => item.id === expense.vendorId);
              const paidAmount = getExpensePaidAmount(expense, data.expensePayments);
              const receiptCount = data.expenseFiles.filter(
                (file) => file.expenseId === expense.id,
              ).length;
              return (
                <TableRow key={expense.id}>
                  <TableCell className="min-w-72">
                    <p className="font-medium text-slate-950">{expense.description}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {expense.expenseNumber ?? "No expense number"} ·{" "}
                      {formatDate(expense.expenseDate)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge value={expense.source} />
                      <StatusBadge value={expense.bookkeepingStatus} />
                      {receiptCount ? <StatusBadge value={`${receiptCount} receipt`} /> : null}
                    </div>
                  </TableCell>
                  <TableCell>{vendor?.name ?? "No vendor"}</TableCell>
                  <TableCell>
                    <StatusBadge value={expense.category} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={expense.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(expense.totalAmount, expense.currency || currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(paidAmount, expense.currency || currency)}
                  </TableCell>
                  <TableCell>{formatDate(expense.dueDate)}</TableCell>
                  <TableCell>
                    <ExpenseActions expense={expense} data={data} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BudgetVarianceTable({
  rows,
  data,
  currency,
}: {
  rows: BudgetVarianceRow[];
  data: EaseEventsData;
  currency: string;
}) {
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [varianceFilter, setVarianceFilter] = React.useState("all");
  const [keyword, setKeyword] = React.useState("");
  const [sort, setSort] = React.useState("variance");
  const filteredRows = rows
    .filter((row) => categoryFilter === "all" || row.category === categoryFilter)
    .filter((row) => vendorFilter === "all" || row.vendorId === vendorFilter)
    .filter((row) => varianceFilter === "all" || row.status === varianceFilter)
    .filter((row) => row.description.toLowerCase().includes(keyword.toLowerCase()))
    .sort((a, b) => {
      if (sort === "due") return 0;
      if (sort === "amount") return b.forecastAmount - a.forecastAmount;
      return b.varianceAmount - a.varianceAmount;
    });

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Budget variance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search budget"
          />
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {budgetCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
          >
            <option value="all">All vendors</option>
            {data.vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={varianceFilter}
            onChange={(event) => setVarianceFilter(event.target.value)}
          >
            <option value="all">All variance</option>
            <option>On Track</option>
            <option>Over Budget</option>
            <option>Under Review</option>
            <option>No Budget</option>
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="variance">Sort by variance</option>
            <option value="amount">Sort by amount</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Forecast</TableHead>
                <TableHead className="text-right">Incurred</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-64">
                    <p className="font-medium text-slate-950">{row.description}</p>
                    <p className="text-xs text-slate-500">
                      {row.linkedExpenseCount} linked expenses
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.category} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.plannedAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.forecastAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.incurredAmount, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.paidAmount, currency)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      row.varianceAmount > 0 ? "text-rose-700" : "text-emerald-700",
                    )}
                  >
                    {formatCurrency(row.varianceAmount, currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceFinancialTable({
  data,
  invoices,
  currency,
}: {
  data: EaseEventsData;
  invoices: ReturnType<typeof getProjectInvoices>;
  currency: string;
}) {
  if (!invoices.length) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No issued invoices"
        description="Invoices generated from accepted proposals or created manually will appear here."
      />
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const paid = getInvoicePaidAmount(invoice, data);
              const balance = Math.max(invoice.amount - paid, 0);
              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <p className="font-medium text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{invoice.invoiceType}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.amount, currency)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(paid, currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(balance, currency)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProfitabilityCard({
  summary,
  currency,
}: {
  summary: ProjectFinanceSummary;
  currency: string;
}) {
  const lines = [
    ["Contracted revenue", summary.contractedRevenue, "Accepted proposal total or legacy fallback"],
    [
      "Current forecast cost",
      -summary.currentCostForecast,
      "Budget forecast without double-counting expenses",
    ],
    [
      "Forecast gross profit",
      summary.forecastGrossProfit,
      "Contracted revenue minus forecast cost",
    ],
    ["Cash position", summary.cashPosition, "Collected revenue minus paid expenses"],
  ];
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg tracking-normal text-slate-950">Profitability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lines.map(([label, amount, helper]) => (
          <div
            key={label as string}
            className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-slate-950">{label}</p>
              <p className="text-xs text-slate-500">{helper}</p>
            </div>
            <p
              className={cn(
                "font-semibold",
                Number(amount) < 0 ? "text-rose-700" : "text-slate-950",
              )}
            >
              {formatCurrency(Number(amount), currency)}
            </p>
          </div>
        ))}
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">
            Forecast margin: {summary.forecastMarginPercentage.toFixed(1)}%
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This is not accounting net income. It is an operating forecast for planner decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectFinancePanel({
  project,
  event,
}: {
  project?: ProjectRecord;
  event?: EventRecord;
}) {
  const { data } = useEaseEventsStore();
  const currency = data.financeSettings[0]?.defaultCurrency ?? data.organization.currency;
  const projectId = project?.id ?? event?.projectId;
  const eventId = event?.id ?? project?.eventId;
  const [isExpenseOpen, setIsExpenseOpen] = React.useState(false);
  const [tab, setTab] = React.useState("overview");
  const summary = getProjectFinanceSummary(data, projectId, eventId);
  const expenses = getProjectExpenses(data, projectId, eventId);
  const invoices = getProjectInvoices(data, projectId, eventId);
  const budgetRows = getBudgetVarianceRows(data, projectId, eventId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">Project finances</h2>
          <p className="mt-1 text-sm text-slate-500">
            Clear separation between sold value, invoices, collections, budget, expenses, and cash.
          </p>
        </div>
        <Button onClick={() => setIsExpenseOpen((current) => !current)}>
          <Plus className="h-4 w-4" />
          Record expense
        </Button>
      </div>
      {isExpenseOpen ? (
        <RecordExpensePanel
          projectId={projectId}
          eventId={eventId}
          onCreated={() => setIsExpenseOpen(false)}
        />
      ) : null}
      <ProjectFinanceMetrics summary={summary} currency={currency} />
      <FinanceAlerts summary={summary} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          {["overview", "budget", "expenses", "invoices", "payments", "profitability"].map(
            (item) => (
              <TabsTrigger
                key={item}
                value={item}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600 data-[state=active]:bg-slate-950 data-[state=active]:text-white"
              >
                {item[0].toUpperCase() + item.slice(1)}
              </TabsTrigger>
            ),
          )}
        </TabsList>
        <TabsContent value="overview" className="mt-6 space-y-6">
          <ProfitabilityCard summary={summary} currency={currency} />
          <BudgetVarianceTable rows={budgetRows} data={data} currency={currency} />
        </TabsContent>
        <TabsContent value="budget" className="mt-6">
          <BudgetVarianceTable rows={budgetRows} data={data} currency={currency} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-6">
          <ExpensesTable expenses={expenses} data={data} currency={currency} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <InvoiceFinancialTable data={data} invoices={invoices} currency={currency} />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <ExpensePaymentsTable data={data} expenses={expenses} currency={currency} />
        </TabsContent>
        <TabsContent value="profitability" className="mt-6">
          <ProfitabilityCard summary={summary} currency={currency} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpensePaymentsTable({
  data,
  expenses,
  currency,
}: {
  data: EaseEventsData;
  expenses: ExpenseRecord[];
  currency: string;
}) {
  const expenseIds = new Set(expenses.map((expense) => expense.id));
  const payments = data.expensePayments.filter((payment) => expenseIds.has(payment.expenseId));

  if (!payments.length) {
    return (
      <EmptyState
        icon={Wallet}
        title="No vendor payments recorded"
        description="Partial and final expense payments will appear here as they are recorded."
      />
    );
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment</TableHead>
              <TableHead>Expense</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const expense = expenses.find((item) => item.id === payment.expenseId);
              return (
                <TableRow key={payment.id}>
                  <TableCell>{payment.reference ?? payment.id.slice(0, 8)}</TableCell>
                  <TableCell>{expense?.description ?? "Expense"}</TableCell>
                  <TableCell>{payment.paymentMethod}</TableCell>
                  <TableCell>
                    <StatusBadge value={payment.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payment.amount, payment.currency || currency)}
                  </TableCell>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function GlobalFinancePanel() {
  const { data } = useEaseEventsStore();
  const currency = data.financeSettings[0]?.defaultCurrency ?? data.organization.currency;
  const [isExpenseOpen, setIsExpenseOpen] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [keyword, setKeyword] = React.useState("");
  const global = getGlobalFinanceSummary(data);
  const filteredExpenses = data.expenses
    .filter((expense) => categoryFilter === "all" || expense.category === categoryFilter)
    .filter((expense) => vendorFilter === "all" || expense.vendorId === vendorFilter)
    .filter((expense) => statusFilter === "all" || expense.status === statusFilter)
    .filter((expense) => expense.description.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">Finance overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Portfolio-wide contracted revenue, collections, costs, vendor balances, and cash
            position.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadTextFile(
                "easeevents-finance-report.csv",
                exportFinanceReportCsv(data, global.projectSummaries),
              )
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setIsExpenseOpen((current) => !current)}>
            <Plus className="h-4 w-4" />
            Record expense
          </Button>
        </div>
      </div>
      {isExpenseOpen ? <RecordExpensePanel onCreated={() => setIsExpenseOpen(false)} /> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-4">
        <MetricCard
          label="Contracted revenue"
          value={formatCurrency(global.contractedRevenue, currency)}
          helper="Accepted proposals plus legacy fallback"
          icon={BadgeDollarSign}
          tone="good"
        />
        <MetricCard
          label="Collected revenue"
          value={formatCurrency(global.collectedRevenue, currency)}
          helper={`${formatCurrency(global.outstandingClientBalance, currency)} open client balance`}
          icon={Wallet}
          tone="good"
        />
        <MetricCard
          label="Incurred expenses"
          value={formatCurrency(global.incurredExpenses, currency)}
          helper={`${formatCurrency(global.outstandingExpenseBalance, currency)} vendor balance`}
          icon={ReceiptText}
          tone={global.outstandingExpenseBalance > 0 ? "warn" : "good"}
        />
        <MetricCard
          label="Forecast profit"
          value={formatCurrency(global.forecastGrossProfit, currency)}
          helper={`${formatCurrency(global.currentCostForecast, currency)} forecast cost`}
          icon={BarChart3}
          tone={global.forecastGrossProfit >= 0 ? "good" : "danger"}
        />
        <MetricCard
          label="Cash position"
          value={formatCurrency(global.cashPosition, currency)}
          helper="Collected revenue minus paid expenses"
          icon={CreditCard}
          tone={global.cashPosition >= 0 ? "good" : "danger"}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Search expenses"
        />
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">All categories</option>
          {budgetCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={vendorFilter}
          onChange={(event) => setVendorFilter(event.target.value)}
        >
          <option value="all">All vendors</option>
          {data.vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          {expenseStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <ExpensesTable expenses={filteredExpenses} data={data} currency={currency} />
      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg tracking-normal text-slate-950">
            Profit by project
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Contracted</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Forecast cost</TableHead>
                <TableHead className="text-right">Forecast profit</TableHead>
                <TableHead className="text-right">Cash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {global.projectSummaries.map((summary) => {
                const event = projectEvent(data, summary.projectId, summary.eventId);
                const href = event ? eventHref(event.id) : "/ease-events/projects";
                return (
                  <TableRow key={summary.projectId ?? summary.eventId}>
                    <TableCell>
                      <a href={href} className="font-medium text-slate-950 hover:underline">
                        {projectName(data, summary)}
                      </a>
                    </TableCell>
                    <TableCell>{clientName(data, summary.projectId, summary.eventId)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.contractedRevenue, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.collectedRevenue, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.currentCostForecast, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.forecastGrossProfit, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(summary.cashPosition, currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function VendorFinancialSummary({
  event,
  assignmentVendorId,
}: {
  event: EventRecord;
  assignmentVendorId: string;
}) {
  const { data } = useEaseEventsStore();
  const currency = data.organization.currency;
  const projectId = event.projectId;
  const expenses = getProjectExpenses(data, projectId, event.id).filter(
    (expense) => expense.vendorId === assignmentVendorId,
  );
  const incurred = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
  const paid = expenses.reduce(
    (sum, expense) => sum + getExpensePaidAmount(expense, data.expensePayments),
    0,
  );
  const balance = Math.max(incurred - paid, 0);

  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium text-slate-950">{formatCurrency(incurred, currency)} recorded</p>
      <p className="text-slate-500">
        {formatCurrency(paid, currency)} paid · {formatCurrency(balance, currency)} balance
      </p>
    </div>
  );
}

export function FinanceReportPanel() {
  const { data } = useEaseEventsStore();
  const currency = data.organization.currency;
  const global = getGlobalFinanceSummary(data);
  const reports = [
    ["Contracted revenue", global.contractedRevenue],
    ["Invoiced revenue", global.invoicedRevenue],
    ["Collected revenue", global.collectedRevenue],
    ["Open client balances", global.outstandingClientBalance],
    ["Total incurred expenses", global.incurredExpenses],
    ["Total paid expenses", global.paidExpenses],
    ["Outstanding vendor balances", global.outstandingExpenseBalance],
    ["Forecast profit", global.forecastGrossProfit],
    ["Cash position", global.cashPosition],
  ];

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg tracking-normal text-slate-950">
          Financial report definitions
        </CardTitle>
        <Button
          variant="outline"
          onClick={() =>
            downloadTextFile(
              "easeevents-financial-report.csv",
              exportFinanceReportCsv(data, global.projectSummaries),
            )
          }
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {reports.map(([label, value]) => (
          <div key={label as string} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrency(Number(value), currency)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
