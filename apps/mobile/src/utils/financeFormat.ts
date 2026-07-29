import type {
  CachedTransaction,
  Json,
  TransactionType,
} from "@finance/shared-types";

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

export function getSignedTransactionAmount(
  amount: number,
  type: TransactionType
) {
  if (type === "income" || type === "refund") {
    return Math.abs(amount);
  }

  return -Math.abs(amount);
}

export function formatSignedTransactionAmount(amount: number) {
  const formatted = MobileDashboardService.getFormattedBalance(
    Math.abs(amount)
  );

  return `${amount > 0 ? "+" : "-"}${formatted}`;
}

export function getTransactionMerchantDisplay(
  transaction: CachedTransaction
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
    name: "Unknown merchant",
    registered: false,
  };
}
