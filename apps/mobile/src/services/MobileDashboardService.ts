import {
  buildBudgetOverview,
  buildDashboardData,
  buildFinancialIntelligenceOverview,
  buildFinancialAnalytics,
  buildFinancialReport,
} from "@finance/finance-core";
import { parseFinancialEventsCsv } from "@finance/parser";
import { API_RESOURCES } from "@finance/shared-api";
import type {
  BudgetLike,
  AccountLike,
  AssetLike,
  ExchangeRateLike,
  GoalLike,
  InvestmentLike,
  LiabilityLike,
  LoanLike,
  ParsedFinancialEvent,
  ReportPeriod,
  TransactionLike,
} from "@finance/shared-types";
import { formatCurrency } from "@finance/shared-utils";

export class MobileDashboardService {
  static getEmptyOverview() {
    return buildDashboardData([], [], 0, 0);
  }

  static getOverview(
    transactions: TransactionLike[],
    pendingEvents: number
  ) {
    return buildDashboardData(transactions, [], 0, pendingEvents);
  }

  static getBudgetOverview(
    budgets: BudgetLike[],
    transactions: TransactionLike[]
  ) {
    return buildBudgetOverview(budgets, transactions, new Date());
  }

  static getReport(
    transactions: TransactionLike[],
    period: ReportPeriod,
    value: string
  ) {
    return buildFinancialReport(transactions, period, value);
  }

  static getAnalytics(transactions: TransactionLike[]) {
    return buildFinancialAnalytics(transactions);
  }

  /**
   * Current-month dashboard summary. The chart series is cumulative expense,
   * one point per day up to today, so the endpoint always equals the month's
   * total spend shown in the hero. Also totals income and expense for the
   * current and previous month to power the "vs last month" deltas.
   */
  static getMonthlySpendSummary(
    transactions: TransactionLike[],
    now = new Date()
  ) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const monthShort = now.toLocaleDateString("en-IN", {
      month: "short",
    });
    const previousMonthDate = new Date(year, month - 1, 1);
    const previousYear = previousMonthDate.getFullYear();
    const previousMonth = previousMonthDate.getMonth();

    const dailySpend = new Array<number>(today).fill(0);
    let previousExpenseTotal = 0;
    let currentIncomeTotal = 0;
    let previousIncomeTotal = 0;

    for (const transaction of transactions) {
      const isExpense = transaction.transaction_type === "expense";
      const isIncome = transaction.transaction_type === "income";

      if (!isExpense && !isIncome) {
        continue;
      }

      const occurredAt = new Date(transaction.occurred_at);

      if (Number.isNaN(occurredAt.getTime())) {
        continue;
      }

      const inCurrentMonth =
        occurredAt.getFullYear() === year &&
        occurredAt.getMonth() === month;
      const inPreviousMonth =
        occurredAt.getFullYear() === previousYear &&
        occurredAt.getMonth() === previousMonth;

      if (isExpense && inCurrentMonth) {
        const day = Math.min(occurredAt.getDate(), today);

        dailySpend[day - 1] += transaction.amount;
      } else if (isExpense && inPreviousMonth) {
        previousExpenseTotal += transaction.amount;
      } else if (isIncome && inCurrentMonth) {
        currentIncomeTotal += transaction.amount;
      } else if (isIncome && inPreviousMonth) {
        previousIncomeTotal += transaction.amount;
      }
    }

    let runningTotal = 0;

    const points = dailySpend.map((value, index) => {
      runningTotal += value;

      return {
        day: index + 1,
        label:
          index % 7 === 0 ? `${index + 1} ${monthShort}` : "",
        value: runningTotal,
      };
    });

    if (points.length === 1) {
      points.unshift({
        day: 0,
        label: "",
        value: 0,
      });
    }

    return {
      currentExpenseTotal: runningTotal,
      currentIncomeTotal,
      points,
      previousExpenseTotal,
      previousIncomeTotal,
    };
  }

  /**
   * Percentage change against the previous month. A missing previous month
   * counts as 100% growth when there is activity now, and 0% when both
   * months are empty.
   */
  static getMonthDeltaPercent(current: number, previous: number) {
    if (previous > 0) {
      return Math.round(((current - previous) / previous) * 100);
    }

    return current > 0 ? 100 : 0;
  }

  static getFinancialIntelligenceOverview({
    accounts,
    assets,
    baseCurrency,
    exchangeRates,
    goals,
    investments,
    liabilities,
    loans,
    transactions,
  }: {
    accounts: AccountLike[];
    assets: AssetLike[];
    baseCurrency: string;
    exchangeRates: ExchangeRateLike[];
    goals: GoalLike[];
    investments: InvestmentLike[];
    liabilities: LiabilityLike[];
    loans: LoanLike[];
    transactions: TransactionLike[];
  }) {
    return buildFinancialIntelligenceOverview({
      accounts,
      assets,
      liabilities,
      loans,
      investments,
      goals,
      transactions,
      exchangeRates,
      baseCurrency,
    });
  }

  static getFormattedBalance(amount: number) {
    return formatCurrency(amount);
  }

  static getSyncResourceName() {
    return API_RESOURCES.sync;
  }

  static describeParsedEvent(event: ParsedFinancialEvent) {
    return `${event.direction}:${event.amount}:${event.currency}`;
  }

  static getCsvFinancialEventCount(text: string) {
    return parseFinancialEventsCsv(text).length;
  }
}
