import {
  buildBudgetOverview,
  buildDashboardData,
  buildFinancialAnalytics,
  buildFinancialReport,
  getCurrentMonthStart,
} from "@finance/finance-core";
import { parseFinancialEventsCsv } from "@finance/parser";
import { API_RESOURCES } from "@finance/shared-api";
import type {
  BudgetLike,
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
    return buildBudgetOverview(
      budgets,
      transactions,
      getCurrentMonthStart()
    );
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
