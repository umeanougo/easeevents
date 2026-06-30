import type {
  BudgetItem,
  BudgetVarianceRow,
  EaseEventsData,
  EventRecord,
  ExpensePaymentRecord,
  ExpenseRecord,
  FinanceAlert,
  InvoiceRecord,
  ProjectFinanceSummary,
  ProposalRecord,
  ProposalVersion,
} from "./types";

const ACTIVE_INVOICE_STATUSES = new Set(["Sent", "Partially Paid", "Paid", "Overdue"]);
const INCURRED_EXPENSE_STATUSES = new Set(["Approved", "Partially Paid", "Paid", "Overdue"]);
const ACTIVE_EXPENSE_PAYMENT_STATUSES = new Set(["Completed"]);

function clampCurrency(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function getEvent(data: EaseEventsData, eventId?: string) {
  if (!eventId) return undefined;
  return data.events.find((event) => event.id === eventId);
}

function getProjectEvent(data: EaseEventsData, projectId?: string, eventId?: string) {
  return (
    getEvent(data, eventId) ??
    data.events.find((event) => event.projectId && event.projectId === projectId)
  );
}

function belongsToProject(
  record: { projectId?: string; eventId?: string },
  projectId?: string,
  eventId?: string,
  data?: EaseEventsData,
) {
  if (projectId && record.projectId === projectId) return true;
  if (eventId && record.eventId === eventId) return true;
  if (!projectId || !record.eventId || !data) return false;
  return data.events.some((event) => event.id === record.eventId && event.projectId === projectId);
}

function getAcceptedProposal(data: EaseEventsData, projectId?: string, eventId?: string) {
  return data.proposals
    .filter(
      (proposal) =>
        proposal.status === "Accepted" &&
        belongsToProject(
          { projectId: proposal.projectId, eventId: proposal.eventId },
          projectId,
          eventId,
        ),
    )
    .sort((a, b) => (b.acceptedAt ?? b.updatedAt).localeCompare(a.acceptedAt ?? a.updatedAt))[0];
}

function getProposalCurrentVersion(
  data: EaseEventsData,
  proposal?: ProposalRecord,
): ProposalVersion | undefined {
  if (!proposal) return undefined;
  return (
    data.proposalVersions.find((version) => version.id === proposal.currentVersionId) ??
    data.proposalVersions.find(
      (version) =>
        version.proposalId === proposal.id &&
        version.versionNumber === proposal.currentVersionNumber,
    ) ??
    data.proposalVersions
      .filter((version) => version.proposalId === proposal.id)
      .sort((a, b) => b.versionNumber - a.versionNumber)[0]
  );
}

export function getContractedRevenue(data: EaseEventsData, projectId?: string, eventId?: string) {
  const proposal = getAcceptedProposal(data, projectId, eventId);
  const version = getProposalCurrentVersion(data, proposal);
  if (version) {
    return {
      amount: clampCurrency(version.totalAmount),
      source: "Accepted Proposal" as const,
      proposal,
      proposalVersion: version,
    };
  }

  const event = getProjectEvent(data, projectId, eventId);
  if (event?.clientPrice) {
    return {
      amount: clampCurrency(event.clientPrice),
      source: "Legacy Event Price" as const,
      proposal: undefined,
      proposalVersion: undefined,
    };
  }

  return {
    amount: 0,
    source: "None" as const,
    proposal: undefined,
    proposalVersion: undefined,
  };
}

export function getProjectInvoices(data: EaseEventsData, projectId?: string, eventId?: string) {
  return data.invoices.filter((invoice) =>
    belongsToProject(
      { projectId: invoice.projectId, eventId: invoice.eventId },
      projectId,
      eventId,
      data,
    ),
  );
}

export function getProjectExpenses(data: EaseEventsData, projectId?: string, eventId?: string) {
  return data.expenses.filter((expense) =>
    belongsToProject(
      { projectId: expense.projectId, eventId: expense.eventId },
      projectId,
      eventId,
      data,
    ),
  );
}

export function getExpensePaidAmount(
  expense: ExpenseRecord,
  expensePayments: ExpensePaymentRecord[],
) {
  return clampCurrency(
    expensePayments
      .filter(
        (payment) =>
          payment.expenseId === expense.id && ACTIVE_EXPENSE_PAYMENT_STATUSES.has(payment.status),
      )
      .reduce((sum, payment) => sum + payment.amount, 0),
  );
}

export function getInvoicePaidAmount(invoice: InvoiceRecord, data: EaseEventsData) {
  const payments = data.invoicePayments.filter((payment) => payment.invoiceId === invoice.id);
  if (payments.length > 0) {
    return clampCurrency(payments.reduce((sum, payment) => sum + payment.amount, 0));
  }
  return clampCurrency(invoice.paidAmount);
}

function getBudgetForecastAmount(item: BudgetItem, linkedExpenses: ExpenseRecord[]) {
  const legacyForecast = item.actualAmount > 0 ? item.actualAmount : item.plannedAmount;
  const linkedIncurred = linkedExpenses
    .filter((expense) => INCURRED_EXPENSE_STATUSES.has(expense.status))
    .reduce((sum, expense) => sum + expense.totalAmount, 0);

  return clampCurrency(Math.max(legacyForecast, linkedIncurred));
}

export function getBudgetVarianceRows(
  data: EaseEventsData,
  projectId?: string,
  eventId?: string,
): BudgetVarianceRow[] {
  const event = getProjectEvent(data, projectId, eventId);
  const scopedBudgetItems = data.budgetItems.filter((item) => item.eventId === event?.id);
  const scopedExpenses = getProjectExpenses(
    data,
    projectId ?? event?.projectId,
    eventId ?? event?.id,
  );
  const linkedExpenseIds = new Set<string>();

  const rows = scopedBudgetItems.map((item) => {
    const linkedExpenses = scopedExpenses.filter((expense) => expense.budgetItemId === item.id);
    linkedExpenses.forEach((expense) => linkedExpenseIds.add(expense.id));
    const incurredAmount = linkedExpenses
      .filter((expense) => INCURRED_EXPENSE_STATUSES.has(expense.status))
      .reduce((sum, expense) => sum + expense.totalAmount, 0);
    const paidAmount = linkedExpenses.reduce(
      (sum, expense) => sum + getExpensePaidAmount(expense, data.expensePayments),
      0,
    );
    const forecastAmount = getBudgetForecastAmount(item, linkedExpenses);
    const varianceAmount = clampCurrency(forecastAmount - item.plannedAmount);
    const variancePercentage = item.plannedAmount
      ? clampCurrency((varianceAmount / item.plannedAmount) * 100)
      : 0;

    return {
      id: item.id,
      projectId: event?.projectId,
      eventId: item.eventId,
      budgetItemId: item.id,
      category: item.category,
      description: item.description,
      vendorId: item.vendorId,
      plannedAmount: clampCurrency(item.plannedAmount),
      forecastAmount,
      incurredAmount: clampCurrency(incurredAmount),
      paidAmount: clampCurrency(paidAmount),
      varianceAmount,
      variancePercentage,
      remainingBudget: clampCurrency(item.plannedAmount - incurredAmount),
      linkedExpenseCount: linkedExpenses.length,
      status:
        varianceAmount > 0
          ? "Over Budget"
          : linkedExpenses.some(
                (expense) => expense.status === "Submitted" || expense.status === "Draft",
              )
            ? "Under Review"
            : "On Track",
    } satisfies BudgetVarianceRow;
  });

  scopedExpenses
    .filter((expense) => !expense.budgetItemId && !linkedExpenseIds.has(expense.id))
    .forEach((expense) => {
      const paidAmount = getExpensePaidAmount(expense, data.expensePayments);
      rows.push({
        id: `expense-${expense.id}`,
        projectId: expense.projectId,
        eventId: expense.eventId,
        category: expense.category,
        description: expense.description,
        vendorId: expense.vendorId,
        plannedAmount: 0,
        forecastAmount: expense.totalAmount,
        incurredAmount: INCURRED_EXPENSE_STATUSES.has(expense.status) ? expense.totalAmount : 0,
        paidAmount,
        varianceAmount: expense.totalAmount,
        variancePercentage: 0,
        remainingBudget: -expense.totalAmount,
        linkedExpenseCount: 1,
        status: "No Budget",
      });
    });

  return rows;
}

export function getProjectFinanceSummary(
  data: EaseEventsData,
  projectId?: string,
  eventId?: string,
): ProjectFinanceSummary {
  const event = getProjectEvent(data, projectId, eventId);
  const resolvedProjectId = projectId ?? event?.projectId;
  const resolvedEventId = eventId ?? event?.id;
  const revenue = getContractedRevenue(data, resolvedProjectId, resolvedEventId);
  const invoices = getProjectInvoices(data, resolvedProjectId, resolvedEventId);
  const issuedInvoices = invoices.filter((invoice) => ACTIVE_INVOICE_STATUSES.has(invoice.status));
  const expenses = getProjectExpenses(data, resolvedProjectId, resolvedEventId);
  const incurredExpenses = expenses.filter((expense) =>
    INCURRED_EXPENSE_STATUSES.has(expense.status),
  );
  const budgetRows = getBudgetVarianceRows(data, resolvedProjectId, resolvedEventId);
  const plannedCost = budgetRows
    .filter((row) => row.budgetItemId)
    .reduce((sum, row) => sum + row.plannedAmount, 0);
  const currentCostForecast = budgetRows.reduce((sum, row) => sum + row.forecastAmount, 0);
  const invoicedRevenue = issuedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const collectedRevenue = issuedInvoices.reduce(
    (sum, invoice) => sum + getInvoicePaidAmount(invoice, data),
    0,
  );
  const incurredExpenseAmount = incurredExpenses.reduce(
    (sum, expense) => sum + expense.totalAmount,
    0,
  );
  const paidExpenses = incurredExpenses.reduce(
    (sum, expense) => sum + getExpensePaidAmount(expense, data.expensePayments),
    0,
  );
  const forecastGrossProfit = revenue.amount - currentCostForecast;
  const forecastMarginPercentage = revenue.amount
    ? clampCurrency((forecastGrossProfit / revenue.amount) * 100)
    : 0;
  const outstandingExpenseBalance = Math.max(incurredExpenseAmount - paidExpenses, 0);
  const outstandingClientBalance = Math.max(invoicedRevenue - collectedRevenue, 0);
  const alerts = getFinanceAlerts({
    data,
    projectId: resolvedProjectId,
    eventId: resolvedEventId,
    budgetRows,
    expenses,
    issuedInvoices,
    forecastMarginPercentage,
    plannedCost,
    collectedRevenue,
  });

  return {
    projectId: resolvedProjectId,
    eventId: resolvedEventId,
    contractedRevenue: clampCurrency(revenue.amount),
    contractedRevenueSource: revenue.source,
    invoicedRevenue: clampCurrency(invoicedRevenue),
    collectedRevenue: clampCurrency(collectedRevenue),
    outstandingClientBalance: clampCurrency(outstandingClientBalance),
    plannedCost: clampCurrency(plannedCost),
    currentCostForecast: clampCurrency(currentCostForecast),
    incurredExpenses: clampCurrency(incurredExpenseAmount),
    paidExpenses: clampCurrency(paidExpenses),
    outstandingExpenseBalance: clampCurrency(outstandingExpenseBalance),
    forecastGrossProfit: clampCurrency(forecastGrossProfit),
    forecastMarginPercentage,
    cashPosition: clampCurrency(collectedRevenue - paidExpenses),
    expenseCount: expenses.length,
    invoiceCount: issuedInvoices.length,
    alerts,
  };
}

function getFinanceAlerts(input: {
  data: EaseEventsData;
  projectId?: string;
  eventId?: string;
  budgetRows: BudgetVarianceRow[];
  expenses: ExpenseRecord[];
  issuedInvoices: InvoiceRecord[];
  forecastMarginPercentage: number;
  plannedCost: number;
  collectedRevenue: number;
}): FinanceAlert[] {
  const {
    data,
    projectId,
    eventId,
    budgetRows,
    expenses,
    issuedInvoices,
    forecastMarginPercentage,
    plannedCost,
    collectedRevenue,
  } = input;
  const today = new Date();
  const settings = data.financeSettings[0];
  const marginTarget = settings?.defaultMarginTargetPercent ?? 30;
  const receiptThreshold = settings?.receiptRequiredThreshold ?? 250;
  const expenseFileIds = new Set(data.expenseFiles.map((file) => file.expenseId));
  const baseHref = eventId ? `/ease-events/events/${eventId}?tab=finances` : "/ease-events/budgets";
  const financeHref = (section: string) =>
    baseHref.includes("?") ? `${baseHref}&finance=${section}` : `${baseHref}?finance=${section}`;
  const alerts: FinanceAlert[] = [];

  budgetRows
    .filter((row) => row.status === "Over Budget")
    .forEach((row) => {
      alerts.push({
        id: `budget-overrun-${row.id}`,
        severity: "Warning",
        label: `${row.category} is over budget`,
        description: `${row.description} is forecast ${row.variancePercentage.toFixed(1)}% above plan.`,
        href: financeHref("budget"),
      });
    });

  expenses
    .filter((expense) => expense.status === "Submitted")
    .forEach((expense) => {
      alerts.push({
        id: `expense-approval-${expense.id}`,
        severity: "Info",
        label: "Expense awaiting approval",
        description: expense.description,
        href: financeHref("expenses"),
      });
    });

  expenses
    .filter(
      (expense) =>
        expense.totalAmount >= receiptThreshold &&
        !expenseFileIds.has(expense.id) &&
        expense.status !== "Voided",
    )
    .forEach((expense) => {
      alerts.push({
        id: `expense-receipt-${expense.id}`,
        severity: "Warning",
        label: "Expense missing receipt",
        description: expense.description,
        href: financeHref("expenses"),
      });
    });

  expenses
    .filter((expense) => {
      if (!expense.dueDate || expense.status === "Paid" || expense.status === "Voided")
        return false;
      return new Date(`${expense.dueDate}T23:59:59`) < today;
    })
    .forEach((expense) => {
      alerts.push({
        id: `expense-overdue-${expense.id}`,
        severity: "Critical",
        label: "Vendor payment overdue",
        description: expense.description,
        href: financeHref("expenses"),
      });
    });

  issuedInvoices
    .filter((invoice) => {
      if (!invoice.dueDate || invoice.status === "Paid" || invoice.status === "Void") return false;
      return new Date(`${invoice.dueDate}T23:59:59`) < today;
    })
    .forEach((invoice) => {
      alerts.push({
        id: `invoice-overdue-${invoice.id}`,
        severity: "Critical",
        label: "Client payment overdue",
        description: `${invoice.invoiceNumber} has an outstanding balance.`,
        href: financeHref("invoices"),
      });
    });

  if (forecastMarginPercentage > 0 && forecastMarginPercentage < marginTarget) {
    alerts.push({
      id: `margin-low-${projectId ?? eventId ?? "global"}`,
      severity: "Warning",
      label: "Forecast margin below target",
      description: `Forecast margin is ${forecastMarginPercentage.toFixed(1)}%; target is ${marginTarget}%.`,
      href: financeHref("profitability"),
    });
  }

  if (collectedRevenue > 0 && expenses.length === 0) {
    alerts.push({
      id: `no-expenses-${projectId ?? eventId ?? "global"}`,
      severity: "Info",
      label: "No expenses recorded",
      description: "Client revenue has been collected, but project costs have not been entered.",
      href: financeHref("expenses"),
    });
  }

  if (eventId && plannedCost === 0) {
    alerts.push({
      id: `missing-budget-${eventId}`,
      severity: "Info",
      label: "Booked project missing budget",
      description: "Add budget categories to forecast project profitability.",
      href: financeHref("budget"),
    });
  }

  return alerts;
}

export function getGlobalFinanceSummary(data: EaseEventsData) {
  const projectIds = new Set<string>();
  data.projects.forEach((project) => projectIds.add(project.id));
  data.events.forEach((event) => {
    if (event.projectId) projectIds.add(event.projectId);
  });

  const summaries = Array.from(projectIds).map((projectId) =>
    getProjectFinanceSummary(data, projectId),
  );

  return summaries.reduce(
    (total, summary) => ({
      contractedRevenue: total.contractedRevenue + summary.contractedRevenue,
      invoicedRevenue: total.invoicedRevenue + summary.invoicedRevenue,
      collectedRevenue: total.collectedRevenue + summary.collectedRevenue,
      outstandingClientBalance: total.outstandingClientBalance + summary.outstandingClientBalance,
      plannedCost: total.plannedCost + summary.plannedCost,
      currentCostForecast: total.currentCostForecast + summary.currentCostForecast,
      incurredExpenses: total.incurredExpenses + summary.incurredExpenses,
      paidExpenses: total.paidExpenses + summary.paidExpenses,
      outstandingExpenseBalance:
        total.outstandingExpenseBalance + summary.outstandingExpenseBalance,
      forecastGrossProfit: total.forecastGrossProfit + summary.forecastGrossProfit,
      cashPosition: total.cashPosition + summary.cashPosition,
      alerts: [...total.alerts, ...summary.alerts],
      projectSummaries: [...total.projectSummaries, summary],
    }),
    {
      contractedRevenue: 0,
      invoicedRevenue: 0,
      collectedRevenue: 0,
      outstandingClientBalance: 0,
      plannedCost: 0,
      currentCostForecast: 0,
      incurredExpenses: 0,
      paidExpenses: 0,
      outstandingExpenseBalance: 0,
      forecastGrossProfit: 0,
      cashPosition: 0,
      alerts: [] as FinanceAlert[],
      projectSummaries: [] as ProjectFinanceSummary[],
    },
  );
}

export function exportFinanceReportCsv(data: EaseEventsData, summaries: ProjectFinanceSummary[]) {
  const headers = [
    "Project",
    "Client",
    "Contracted Revenue",
    "Invoiced Revenue",
    "Collected Revenue",
    "Planned Cost",
    "Current Forecast Cost",
    "Incurred Expenses",
    "Paid Expenses",
    "Forecast Profit",
    "Forecast Margin %",
    "Cash Position",
  ];

  const rows = summaries.map((summary) => {
    const project = data.projects.find((candidate) => candidate.id === summary.projectId);
    const event = getProjectEvent(data, summary.projectId, summary.eventId);
    const client = data.clients.find(
      (candidate) => candidate.id === (project?.clientId ?? event?.clientId),
    );
    return [
      project?.name ?? event?.eventName ?? "Unassigned project",
      client?.displayName ?? event?.clientName ?? "",
      summary.contractedRevenue,
      summary.invoicedRevenue,
      summary.collectedRevenue,
      summary.plannedCost,
      summary.currentCostForecast,
      summary.incurredExpenses,
      summary.paidExpenses,
      summary.forecastGrossProfit,
      summary.forecastMarginPercentage,
      summary.cashPosition,
    ];
  });

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => {
          const escaped = String(value).replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");
}
