import type {
  CachedTransaction,
  Json,
  TransactionType,
} from "@finance/shared-types";

import {
  getAccountClass,
  getTransactionEffect,
} from "@finance/finance-core";

import { MobileDashboardService } from "../services/MobileDashboardService";

export function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function getJsonObject(value: Json | null | undefined) {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? value
    : {};
}

export function getEventRuleCategoryId(value: Json | null | undefined) {
  const categoryId = getJsonObject(value).rule_category_id;

  return typeof categoryId === "string" && categoryId.trim()
    ? categoryId
    : null;
}

export function getEventAccountId(value: Json | null | undefined) {
  const accountId = getJsonObject(value).account_id;

  return typeof accountId === "string" && accountId.trim()
    ? accountId
    : null;
}

export function getFrequentCategoryIds(transactions: CachedTransaction[]) {
  const usage = new Map<string, number>();

  transactions.forEach((transaction) => {
    const categoryId = transaction.category_id ?? transaction.category?.id;

    if (categoryId) {
      usage.set(categoryId, (usage.get(categoryId) ?? 0) + 1);
    }
  });

  return [...usage.entries()]
    .sort(
      ([firstId, firstCount], [secondId, secondCount]) =>
        secondCount - firstCount || firstId.localeCompare(secondId)
    )
    .map(([categoryId]) => categoryId);
}

export function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();

  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from(
      { length: dayCount },
      (_, index) => new Date(year, monthIndex, index + 1)
    ),
  ];
}

export function isSameLocalDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function isFutureLocalDay(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);
  return candidate.getTime() > today.getTime();
}

export function isCurrentMonth(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

export function formatTransactionDate(date: Date) {
  if (isSameLocalDay(date, new Date())) {
    return "Today";
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthRange(date: Date) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const monthYear = date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });

  return `1 - ${lastDay} ${monthYear}`;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function groupTransactionsByRecency<
  T extends { occurred_at: string },
>(transactions: T[]) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const groups: {
    label: string;
    transactions: T[];
  }[] = [];

  transactions
    .slice()
    .sort(
      (first, second) =>
        new Date(second.occurred_at).getTime() -
        new Date(first.occurred_at).getTime()
    )
    .forEach((transaction) => {
      const date = startOfDay(new Date(transaction.occurred_at));
      let label = "Earlier";

      if (date.getTime() === today.getTime()) {
        label = "Today";
      } else if (date.getTime() === yesterday.getTime()) {
        label = "Yesterday";
      } else if (date >= weekStart) {
        label = "Earlier This Week";
      }

      let group = groups.find((item) => item.label === label);
      if (!group) {
        group = {
          label,
          transactions: [],
        };
        groups.push(group);
      }
      group.transactions.push(transaction);
    });

  return groups;
}

export function formatTransactionTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// List rows: time-of-day only reads as recency for today/yesterday. Older
// entries show the calendar date instead (with year once it differs).
export function formatTransactionListTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const day = startOfDay(date).getTime();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (day === today.getTime() || day === yesterday.getTime()) {
    return formatTransactionTime(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
}

// Delegates to the accounting engine so list rows agree with every
// report. Transfers have no sign without their event direction — the
// list renders them through the neutral formatter instead.
export function getSignedTransactionAmount(
  amount: number,
  type: TransactionType
) {
  return getTransactionEffect({
    amount: Math.abs(amount),
    occurred_at: "",
    transaction_type: type,
  }).balanceDelta;
}

// Transfers are neither income nor expense — the ledger shows them
// unsigned and neutral.
export function formatNeutralTransactionAmount(amount: number) {
  return MobileDashboardService.getFormattedBalance(Math.abs(amount));
}

export interface AccountBalanceDisplay {
  // Magnitude to render; the label carries the meaning of the sign.
  amount: number;
  label: string;
  owed: boolean;
}

// Liability accounts keep the engine's signed convention (negative =
// owed) but present the debt as a positive "outstanding" figure with
// liability wording. Asset accounts are untouched.
export function getAccountBalanceDisplay(
  accountType: string | null | undefined,
  balance: number
): AccountBalanceDisplay {
  if (getAccountClass(accountType) === "liability") {
    if (balance < 0) {
      return { amount: -balance, label: "Outstanding", owed: true };
    }

    if (balance > 0) {
      return { amount: balance, label: "In credit", owed: false };
    }

    return { amount: 0, label: "All settled", owed: false };
  }

  return { amount: balance, label: "Current balance", owed: false };
}

// Room left on a limit-bearing liability account. Null when no limit is
// set or the account is not a liability.
export function getAvailableCredit(
  account: { account_type?: string | null; credit_limit?: number | null },
  balance: number
): number | null {
  if (
    getAccountClass(account.account_type) !== "liability" ||
    typeof account.credit_limit !== "number" ||
    account.credit_limit <= 0
  ) {
    return null;
  }

  const outstanding = balance < 0 ? -balance : 0;

  return Math.max(account.credit_limit - outstanding, 0);
}

export function formatSignedTransactionAmount(amount: number) {
  const formatted = MobileDashboardService.getFormattedBalance(
    Math.abs(amount)
  );

  return `${amount > 0 ? "+" : "-"}${formatted}`;
}

export function getTransactionMerchantDisplay(
  transaction: CachedTransaction,
  fallbackName?: string | null
) {
  const registeredName = transaction.merchant?.name?.trim();
  const rawName = transaction.event?.merchant_name_raw?.trim();

  if (registeredName) {
    return {
      name: registeredName,
      registered: true,
    };
  }

  if (rawName) {
    return {
      name: rawName,
      registered: false,
    };
  }

  return {
    name: fallbackName?.trim() || "Unknown merchant",
    registered: false,
  };
}
