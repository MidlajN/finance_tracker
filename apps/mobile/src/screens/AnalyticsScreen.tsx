import { Fragment, useMemo, useState } from "react";
import { MotiView } from "moti";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import type {
  AnalyticsGroup,
  AnalyticsTrendPoint,
  CachedTransaction,
} from "@finance/shared-types";

import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { financeStyles } from "../components/finance/financeStyles";
import { premiumHairline, premiumTheme } from "../theme/premiumTheme";
import {
  formatMonthRange,
  formatPercent,
  getCalendarDays,
  isCurrentMonth,
  isFutureLocalDay,
  isSameLocalDay,
} from "../utils/financeFormat";
import {
  type FinanceScreenIcon,
  getTransactionIcon,
} from "../utils/financeVisuals";

type AnalyticsRange = "month" | "3m" | "6m" | "ytd" | "1y" | "all" | "custom";

interface AnalyticsCustomRange {
  end: Date;
  start: Date;
}

interface AnalyticsChartSeries {
  expense: number[];
  income: number[];
  labels: string[];
}

const analyticsRangeOptions = [
  {
    label: "Month",
    value: "month",
  },
  {
    label: "3M",
    value: "3m",
  },
  {
    label: "6M",
    value: "6m",
  },
  {
    label: "YTD",
    value: "ytd",
  },
  {
    label: "1Y",
    value: "1y",
  },
  {
    label: "All",
    value: "all",
  },
] satisfies {
  label: string;
  value: AnalyticsRange;
}[];

const analyticsRangeMonthOffsets: Partial<Record<AnalyticsRange, number>> = {
  "1y": 11,
  "3m": 2,
  "6m": 5,
  month: 0,
};

// MotiView is not NativeWind-interop'd, so the dropdown and sheet panels keep
// plain style objects.
const periodMenuStyle = {
  backgroundColor: "#ffffff",
  borderColor: premiumTheme.colors.border,
  borderRadius: 14,
  borderWidth: 1,
  left: 12,
  minWidth: 176,
  paddingVertical: 6,
  position: "absolute",
  top: 52,
  zIndex: 30,
  ...premiumTheme.shadow.soft,
} as const;

const pickerPanelStyle = {
  backgroundColor: "#ffffff",
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  gap: 18,
  padding: 18,
  paddingBottom: 30,
} as const;

// Svg is a third-party component; positioning stays a plain style object.
const summaryWaveStyle = {
  bottom: 0,
  position: "absolute",
  right: 0,
} as const;

export function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("month");
  const [anchorOffset, setAnchorOffset] = useState(0);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [customRange, setCustomRange] = useState<AnalyticsCustomRange | null>(
    null
  );
  const transactions = useOfflineStore((state) => state.transactions);
  const periodOptions = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 12 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);

      return {
        label: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        }),
        offset,
      };
    });
  }, []);
  const anchorDate = useMemo(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth() - anchorOffset, 1);
  }, [anchorOffset]);
  const filteredTransactions = useMemo(
    () =>
      filterTransactionsForAnalyticsRange(
        transactions,
        analyticsRange,
        anchorDate,
        customRange
      ),
    [analyticsRange, anchorDate, customRange, transactions]
  );
  const analytics = useMemo(
    () => MobileDashboardService.getAnalytics(filteredTransactions),
    [filteredTransactions]
  );
  const spendComparison = useMemo(() => {
    if (
      analyticsRange === "all" ||
      (analyticsRange === "custom" && !customRange)
    ) {
      return null;
    }

    let prevStart: Date;
    let prevEnd: Date;
    let label: string;

    if (analyticsRange === "custom" && customRange) {
      const start = new Date(
        customRange.start.getFullYear(),
        customRange.start.getMonth(),
        customRange.start.getDate()
      );
      const end = new Date(
        customRange.end.getFullYear(),
        customRange.end.getMonth(),
        customRange.end.getDate(),
        23,
        59,
        59,
        999
      );

      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(
        prevEnd.getTime() - (end.getTime() - start.getTime())
      );
      label = "vs previous period";
    } else {
      const months =
        analyticsRange === "ytd"
          ? anchorDate.getMonth() + 1
          : (analyticsRangeMonthOffsets[analyticsRange] ?? 0) + 1;
      const start = new Date(
        anchorDate.getFullYear(),
        anchorDate.getMonth() - months + 1,
        1
      );

      prevStart = new Date(start.getFullYear(), start.getMonth() - months, 1);
      prevEnd = new Date(
        start.getFullYear(),
        start.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      label =
        analyticsRange === "month"
          ? `vs ${prevStart.toLocaleDateString("en-IN", { month: "long" })}`
          : "vs previous period";
    }

    const previousExpenses = transactions.reduce((total, transaction) => {
      if (transaction.transaction_type !== "expense") {
        return total;
      }

      const occurredAt = new Date(transaction.occurred_at);

      return occurredAt >= prevStart && occurredAt <= prevEnd
        ? total + transaction.amount
        : total;
    }, 0);

    if (previousExpenses <= 0) {
      return null;
    }

    return {
      changePercent:
        ((analytics.totalExpenses - previousExpenses) / previousExpenses) *
        100,
      label,
    };
  }, [
    analytics.totalExpenses,
    analyticsRange,
    anchorDate,
    customRange,
    transactions,
  ]);
  const visibleCashFlow = useMemo(() => {
    const periods = getAnalyticsMonthPeriods(
      analyticsRange,
      anchorDate,
      customRange
    );

    if (!periods) {
      return analytics.cashFlow.slice(-12);
    }

    const byPeriod = new Map(
      analytics.cashFlow.map((point) => [point.period, point])
    );
    const window = periods.map(
      (period) => byPeriod.get(period) ?? emptyTrendPointForPeriod(period)
    );

    return window.length > 12 ? window.slice(-12) : window;
  }, [analytics.cashFlow, analyticsRange, anchorDate, customRange]);
  const rangeBounds = useMemo(() => {
    const now = new Date();
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    if (analyticsRange === "custom") {
      if (!customRange) {
        return null;
      }

      const start = new Date(
        customRange.start.getFullYear(),
        customRange.start.getMonth(),
        customRange.start.getDate()
      );
      const end = new Date(
        customRange.end.getFullYear(),
        customRange.end.getMonth(),
        customRange.end.getDate(),
        23,
        59,
        59,
        999
      );

      return { end: end < todayEnd ? end : todayEnd, start };
    }

    if (analyticsRange === "all") {
      let earliest = Number.POSITIVE_INFINITY;

      transactions.forEach((transaction) => {
        const time = new Date(transaction.occurred_at).getTime();

        if (Number.isFinite(time)) {
          earliest = Math.min(earliest, time);
        }
      });

      if (!Number.isFinite(earliest)) {
        return null;
      }

      const earliestDate = new Date(earliest);

      return {
        end: todayEnd,
        start: new Date(
          earliestDate.getFullYear(),
          earliestDate.getMonth(),
          earliestDate.getDate()
        ),
      };
    }

    const months =
      analyticsRange === "ytd"
        ? anchorDate.getMonth() + 1
        : (analyticsRangeMonthOffsets[analyticsRange] ?? 0) + 1;
    const start = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth() - months + 1,
      1
    );
    const end = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    return { end: end < todayEnd ? end : todayEnd, start };
  }, [analyticsRange, anchorDate, customRange, transactions]);
  const chartSeries = useMemo<AnalyticsChartSeries>(() => {
    const isDaily =
      rangeBounds !== null &&
      (analyticsRange === "month" ||
        (analyticsRange === "custom" &&
          (rangeBounds.end.getTime() - rangeBounds.start.getTime()) /
            86400000 <=
            45));

    if (rangeBounds && isDaily) {
      const dayTotals = new Map<
        string,
        { expense: number; income: number }
      >();

      filteredTransactions.forEach((transaction) => {
        if (
          transaction.transaction_type !== "expense" &&
          transaction.transaction_type !== "income"
        ) {
          return;
        }

        const key = transaction.occurred_at.slice(0, 10);
        const entry = dayTotals.get(key) ?? { expense: 0, income: 0 };

        if (transaction.transaction_type === "expense") {
          entry.expense += transaction.amount;
        } else {
          entry.income += transaction.amount;
        }

        dayTotals.set(key, entry);
      });

      const labels: string[] = [];
      const income: number[] = [];
      const expense: number[] = [];
      const cursor = new Date(rangeBounds.start);
      let cumulativeIncome = 0;
      let cumulativeExpense = 0;
      let index = 0;

      while (cursor <= rangeBounds.end && labels.length < 120) {
        const key = `${cursor.getFullYear()}-${String(
          cursor.getMonth() + 1
        ).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
        const entry = dayTotals.get(key);

        cumulativeIncome += entry?.income ?? 0;
        cumulativeExpense += entry?.expense ?? 0;
        labels.push(
          index % 7 === 0
            ? `${cursor.getDate()} ${cursor.toLocaleDateString("en-IN", {
                month: "short",
              })}`
            : ""
        );
        income.push(cumulativeIncome);
        expense.push(cumulativeExpense);
        cursor.setDate(cursor.getDate() + 1);
        index += 1;
      }

      if (labels.length === 1) {
        labels.unshift("");
        income.unshift(0);
        expense.unshift(0);
      }

      return { expense, income, labels };
    }

    const points = getCashFlowChartPoints(visibleCashFlow);

    return {
      expense: points.map((point) => point.expenses),
      income: points.map((point) => point.income),
      labels: points.map((point, index) =>
        points.length > 8 && index % 2 === 1
          ? ""
          : formatShortPeriod(point.period)
      ),
    };
  }, [analyticsRange, filteredTransactions, rangeBounds, visibleCashFlow]);
  const spendStats = useMemo(() => {
    if (!rangeBounds) {
      return null;
    }

    const dayCount = Math.max(
      1,
      Math.floor(
        (rangeBounds.end.getTime() - rangeBounds.start.getTime()) / 86400000
      ) + 1
    );
    const dayTotals = new Map<string, number>();

    filteredTransactions.forEach((transaction) => {
      if (transaction.transaction_type !== "expense") {
        return;
      }

      const key = transaction.occurred_at.slice(0, 10);

      dayTotals.set(key, (dayTotals.get(key) ?? 0) + transaction.amount);
    });

    let highestKey: string | null = null;
    let highestAmount = 0;

    dayTotals.forEach((amount, key) => {
      if (amount > highestAmount) {
        highestAmount = amount;
        highestKey = key;
      }
    });

    return {
      avgPerDay: analytics.totalExpenses / dayCount,
      dayCount,
      highest: highestKey
        ? {
            amount: highestAmount,
            label: new Date(highestKey).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
          }
        : null,
    };
  }, [analytics.totalExpenses, filteredTransactions, rangeBounds]);
  const summaryTitle =
    analyticsRange === "month"
      ? anchorOffset === 0
        ? "This Month"
        : anchorDate.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })
      : analyticsRange === "3m"
        ? "Last 3 Months"
        : analyticsRange === "6m"
          ? "Last 6 Months"
          : analyticsRange === "ytd"
            ? "Year to Date"
            : analyticsRange === "1y"
              ? "Last 12 Months"
              : analyticsRange === "custom"
                ? "Custom Range"
                : "All Time";
  const expenseCategories = analytics.categoryAnalytics.filter(
    (group) => group.expenses > 0
  );
  const visibleCategories = expenseCategories.slice(0, 6);
  const listedCategories = expenseCategories.slice(0, 3);
  const chartWidth = Math.max(280, width - 72);
  const pieSize = Math.min(132, Math.max(108, width * 0.3));
  const highestCategory = expenseCategories[0] ?? null;
  const lowestCategory =
    expenseCategories.length > 0
      ? expenseCategories[expenseCategories.length - 1]
      : null;

  return (
    <ScrollView contentContainerClassName="gap-3.5 bg-canvas p-5 pb-7">
      <View
        className="z-30 rounded-[18px] border border-border bg-white"
        style={premiumTheme.shadow.soft}
      >
        <View className="z-30">
          {periodOpen ? (
            <Pressable
              className="absolute -bottom-[1000px] -left-[1000px] -right-[1000px] -top-[1000px] z-[25]"
              onPress={() => setPeriodOpen(false)}
            />
          ) : null}
          <View className="flex-row items-center gap-2 rounded-t-[17px] bg-field pr-3">
            <Pressable
              className="min-w-0 flex-1 flex-row items-center gap-2.5 px-3 py-2.5 active:opacity-85"
              disabled={analyticsRange === "all"}
              onPress={() => {
                if (analyticsRange === "custom") {
                  setCustomOpen(true);
                  return;
                }

                setPeriodOpen((open) => !open);
              }}
            >
              <View className="h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-border">
                <CalendarDays
                  color={premiumTheme.colors.ink}
                  size={16}
                  strokeWidth={2.2}
                />
              </View>
              <Text
                className="shrink text-[15px] font-extrabold text-ink tabular-nums"
                numberOfLines={1}
              >
                {formatAnalyticsRange(analyticsRange, anchorDate, customRange)}
              </Text>
              {analyticsRange !== "all" ? (
                <ChevronDown
                  color={premiumTheme.colors.secondary}
                  size={15}
                  strokeWidth={2.4}
                />
              ) : null}
            </Pressable>

            <Pressable
              className={`min-h-8 flex-row items-center gap-[5px] rounded-[11px] border active:opacity-85 ${
                analyticsRange === "custom"
                  ? "border-ink bg-ink"
                  : "border-border bg-white"
              } px-[11px]`}
              onPress={() => {
                setPeriodOpen(false);
                setCustomOpen(true);
              }}
            >
              <CalendarDays
                color={
                  analyticsRange === "custom"
                    ? "#ffffff"
                    : premiumTheme.colors.ink
                }
                size={13}
                strokeWidth={2.3}
              />
              <Text
                className={`text-[11px] font-bold ${
                  analyticsRange === "custom" ? "text-white" : "text-ink"
                }`}
              >
                Custom
              </Text>
            </Pressable>
          </View>

          {periodOpen ? (
            <MotiView
              animate={{ opacity: 1, translateY: 0 }}
              from={{ opacity: 0, translateY: -6 }}
              style={periodMenuStyle}
              transition={{ duration: 140, type: "timing" }}
            >
              <ScrollView className="max-h-[264px]" nestedScrollEnabled>
                {periodOptions.map((option) => {
                  const active = option.offset === anchorOffset;

                  return (
                    <Pressable
                      className="min-h-[38px] flex-row items-center justify-between gap-2.5 px-3.5 active:opacity-85"
                      key={option.offset}
                      onPress={() => {
                        setAnchorOffset(option.offset);
                        setPeriodOpen(false);
                      }}
                    >
                      <Text
                        className={`text-[12px] ${
                          active
                            ? "font-bold text-ink"
                            : "font-semibold text-secondary"
                        }`}
                      >
                        {option.offset === 0
                          ? "This month"
                          : option.label}
                      </Text>
                      {active ? (
                        <Check
                          color={premiumTheme.colors.ink}
                          size={14}
                          strokeWidth={2.8}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </MotiView>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1 border-t-hairline border-t-border px-2 py-[7px]">
          {analyticsRangeOptions.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? (
                <View
                  className="h-3.5 self-center bg-border"
                  style={{ width: premiumHairline }}
                />
              ) : null}
              <Pressable
                className={`min-h-[30px] flex-1 items-center justify-center rounded-[11px] ${
                  analyticsRange === option.value ? "bg-ink" : ""
                }`}
                onPress={() => {
                  setAnalyticsRange(option.value);

                  if (option.value === "all") {
                    setPeriodOpen(false);
                  }
                }}
              >
                <Text
                  className={`text-[11px] ${
                    analyticsRange === option.value
                      ? "font-bold text-white"
                      : "font-semibold text-secondary"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            </Fragment>
          ))}
        </View>
      </View>

      {customOpen ? (
        <AnalyticsCustomRangeModal
          initialRange={customRange}
          onApply={(range) => {
            setCustomRange(range);
            setAnalyticsRange("custom");
            setCustomOpen(false);
          }}
          onClose={() => setCustomOpen(false)}
        />
      ) : null}

      <View
        className="rounded-[18px] border border-border bg-white"
        style={premiumTheme.shadow.soft}
      >
        <View className="overflow-hidden rounded-t-[17px]">
          <AnalyticsSummaryWave />
          <View className="flex-row gap-3 p-4">
            <View className="min-w-0 flex-1">
              <Text className="text-[12px] font-bold text-secondary">
                {summaryTitle}
              </Text>
              <Text className="mt-1.5 text-[30px] font-extrabold tracking-[-0.5px] text-ink tabular-nums">
                {MobileDashboardService.getFormattedBalance(
                  analytics.totalExpenses
                )}
              </Text>
              <Text className="mt-0.5 text-[13px] font-semibold text-secondary">
                spent
              </Text>
              {spendComparison ? (
                <View className="mt-2.5 flex-row items-center gap-1">
                  {spendComparison.changePercent <= 0 ? (
                    <ArrowDown color="#16a34a" size={14} strokeWidth={2.5} />
                  ) : (
                    <ArrowUp color="#dc2626" size={14} strokeWidth={2.5} />
                  )}
                  <Text
                    className={`text-[12px] font-bold tabular-nums ${
                      spendComparison.changePercent <= 0
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {Math.abs(spendComparison.changePercent).toFixed(0)}%
                  </Text>
                  <Text
                    className={`text-[12px] font-semibold ${
                      spendComparison.changePercent <= 0
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {spendComparison.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#ece9fb]">
              <ChartNoAxesCombined
                color="#6d5ae6"
                size={20}
                strokeWidth={2.2}
              />
            </View>
          </View>
        </View>

        <View className="flex-row gap-3 overflow-hidden rounded-b-[17px] border-t-hairline border-t-border px-4 py-[13px]">
          <View className="absolute inset-0" pointerEvents="none">
            <Svg height="100%" preserveAspectRatio="none" width="100%">
              <Defs>
                <LinearGradient
                  id="analyticsStatsBg"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor="#7c6ce8" stopOpacity="0.01" />
                  <Stop offset="1" stopColor="#7c6ce8" stopOpacity="0.03" />
                </LinearGradient>
              </Defs>
              <Rect fill="url(#analyticsStatsBg)" height="100%" width="100%" />
            </Svg>
          </View>
          <AnalyticsSummaryStat
            accent="#16a34a"
            Icon={Wallet}
            label="Income"
            tinted
            value={MobileDashboardService.getFormattedBalance(
              analytics.totalIncome
            )}
          />
          <View
            className="my-0.5 self-stretch bg-border"
            style={{ width: premiumHairline }}
          />
          <AnalyticsSummaryStat
            accent="#d97706"
            Icon={IndianRupee}
            label="Net Saving"
            tinted
            value={MobileDashboardService.getFormattedBalance(
              analytics.netBalance
            )}
          />
          <View
            className="my-0.5 self-stretch bg-border"
            style={{ width: premiumHairline }}
          />
          <AnalyticsSummaryStat
            accent="#64748b"
            Icon={ReceiptText}
            label="Transactions"
            tinted
            value={`${filteredTransactions.length}`}
          />
        </View>
      </View>

      <View
        className="gap-3 overflow-hidden rounded-section bg-white p-3.5"
        style={premiumTheme.shadow.floating}
      >
        <View className="absolute inset-0" pointerEvents="none">
          <Svg height="100%" preserveAspectRatio="none" width="100%">
            <Defs>
              <LinearGradient
                id="analyticsChartCardBg"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <Stop offset="0" stopColor="#101828" stopOpacity="0.04" />
                <Stop offset="0.55" stopColor="#101828" stopOpacity="0.015" />
                <Stop offset="1" stopColor="#101828" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect
              fill="url(#analyticsChartCardBg)"
              height="100%"
              width="100%"
            />
          </Svg>
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[16px] font-black text-ink">
            Income vs Expense
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-[5px] bg-success" />
              <Text className="text-[12px] font-extrabold text-[#475569]">
                Income
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-[5px] bg-ink" />
              <Text className="text-[12px] font-extrabold text-[#475569]">
                Expense
              </Text>
            </View>
          </View>
        </View>

        <CashFlowLineChart series={chartSeries} width={chartWidth} />

        {spendStats ? (
          <View className="mt-0.5 flex-row gap-4 border-t-hairline border-t-divider pt-3.5">
          <AnalyticsSummaryStat
            accent={premiumTheme.colors.accent}
            Icon={TrendingUp}
            label="Avg. per day"
            round
            value={MobileDashboardService.getFormattedBalance(
              spendStats.avgPerDay
            )}
          />
          <AnalyticsSummaryStat
            accent={premiumTheme.colors.accent}
            Icon={CalendarDays}
            label="Highest day"
            round
            sub={spendStats.highest?.label}
            value={
              spendStats.highest
                ? MobileDashboardService.getFormattedBalance(
                    spendStats.highest.amount
                  )
                : "—"
            }
          />
          <AnalyticsSummaryStat
            accent={premiumTheme.colors.accent}
            Icon={ReceiptText}
            label="Total days"
            round
            value={`${spendStats.dayCount}`}
          />
          </View>
        ) : null}
      </View>

      <View
        className="gap-[18px] rounded-section bg-elevated p-3.5"
        style={premiumTheme.shadow.floating}
      >
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[16px] font-black text-ink">
            Spending by Category
          </Text>
          {expenseCategories.length > 0 ? (
            <Pressable
              className="min-h-7 flex-row items-center gap-[3px] rounded-full bg-field pl-3 pr-2"
              onPress={() => setCategoryModalOpen(true)}
            >
              <Text className="text-[12px] font-bold tracking-[-0.1px] text-ink">
                View all
              </Text>
              <ChevronRight
                color={premiumTheme.colors.ink}
                size={13}
                strokeWidth={2.6}
              />
            </Pressable>
          ) : null}
        </View>

        {listedCategories.length === 0 ? (
          <Text className="text-[13px] font-bold text-secondary">
            No expense categories yet.
          </Text>
        ) : (
          <View className="flex-row items-center gap-2.5">
            <CategoryDonutChart
              categories={visibleCategories}
              size={pieSize}
              total={analytics.totalExpenses}
            />
            <View className="flex-1 gap-1">
              {listedCategories.map((category, index) => (
                <AnalyticsCategoryRow
                  category={category}
                  color={getAnalyticsCategoryColor(index)}
                  key={category.name}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {categoryModalOpen ? (
        <AnalyticsCategoryModal
          categories={expenseCategories}
          onClose={() => setCategoryModalOpen(false)}
          subtitle={summaryTitle}
          total={analytics.totalExpenses}
        />
      ) : null}

      <View className="flex-row gap-2.5">
        <AnalyticsInsightCard
          Icon={TrendingUp}
          accent="#8b5cf6"
          background="#f3e8ff"
          label="Highest Spending"
          subtitle={highestCategory?.name ?? "No category"}
          value={highestCategory?.expenses ?? 0}
        />
        <AnalyticsInsightCard
          Icon={TrendingDown}
          accent="#14b8a6"
          background="#ccfbf1"
          label="Lowest Spending"
          subtitle={lowestCategory?.name ?? "No category"}
          value={lowestCategory?.expenses ?? 0}
        />
        <AnalyticsInsightCard
          Icon={IndianRupee}
          accent="#ff6b4a"
          background="#fee2e2"
          label="Avg Monthly Spend"
          subtitle={`${formatPercent(analytics.savingsRate)} saved`}
          value={analytics.averageMonthlyExpenses}
        />
      </View>
    </ScrollView>
  );
}

function AnalyticsSummaryWave() {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      <Svg height="100%" preserveAspectRatio="none" width="100%">
        <Defs>
          <LinearGradient id="analyticsHeroBg" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#7c6ce8" stopOpacity="0" />
            <Stop offset="1" stopColor="#7c6ce8" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#analyticsHeroBg)" height="100%" width="100%" />
      </Svg>
      <Svg
        height={72}
        style={summaryWaveStyle}
        viewBox="0 0 240 72"
        width={244}
      >
        <Defs>
          <LinearGradient id="analyticsWaveBack" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#7c6ce8" stopOpacity="0" />
            <Stop offset="0.45" stopColor="#7c6ce8" stopOpacity="0.015" />
            <Stop offset="1" stopColor="#7c6ce8" stopOpacity="0.1" />
          </LinearGradient>
          <LinearGradient id="analyticsWaveFront" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#7c6ce8" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#7c6ce8" stopOpacity="0.03" />
            <Stop offset="1" stopColor="#7c6ce8" stopOpacity="0.14" />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 72 C44 70 76 46 114 48 C154 50 190 24 240 18 L240 72 Z"
          fill="url(#analyticsWaveBack)"
        />
        <Path
          d="M0 72 C52 71 96 58 138 52 C178 46 210 38 240 34 L240 72 Z"
          fill="url(#analyticsWaveFront)"
        />
      </Svg>
    </View>
  );
}

function AnalyticsSummaryStat({
  accent = premiumTheme.colors.ink,
  Icon,
  label,
  round = false,
  sub,
  tinted = false,
  value,
}: {
  accent?: string;
  Icon: FinanceScreenIcon;
  label: string;
  round?: boolean;
  sub?: string;
  tinted?: boolean;
  value: string;
}) {
  return (
    <View className="min-w-0 flex-1 flex-row items-start gap-2">
      <View
        className={`items-center justify-center ${
          tinted
            ? "h-7 w-7 rounded-lg"
            : round
              ? "h-8 w-8 rounded-[9px] bg-border"
              : "h-8 w-8 rounded-[9px] border border-border bg-white"
        }`}
        style={
          tinted || (round && accent !== premiumTheme.colors.ink)
            ? { backgroundColor: `${accent}14` }
            : null
        }
      >
        <Icon
          color={accent}
          size={tinted ? 15 : round ? 14 : 15}
          strokeWidth={2.3}
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-[10px] font-semibold text-secondary"
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          adjustsFontSizeToFit
          className="text-[14px] font-extrabold text-ink tabular-nums"
          minimumFontScale={0.72}
          numberOfLines={1}
        >
          {value}
        </Text>
        {sub ? (
          <Text
            className="text-[10px] font-semibold text-secondary"
            numberOfLines={1}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Catmull-Rom smoothing: rounded without chart-kit's bezier overshoot.
function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function CashFlowLineChart({
  series,
  width,
}: {
  series: AnalyticsChartSeries;
  width: number;
}) {
  const height = 224;
  const padTop = 14;
  const padBottom = 28;
  const padLeft = 42;
  const padRight = 16;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const count = series.expense.length;
  const yMax =
    Math.max(1, ...series.income, ...series.expense) * 1.08;

  const toX = (index: number) =>
    padLeft + (count > 1 ? (index * plotWidth) / (count - 1) : plotWidth / 2);
  const toY = (value: number) =>
    padTop + plotHeight * (1 - value / yMax);

  const incomePoints = series.income.map((value, index) => ({
    x: toX(index),
    y: toY(value),
  }));
  const expensePoints = series.expense.map((value, index) => ({
    x: toX(index),
    y: toY(value),
  }));

  const baseline = padTop + plotHeight;
  const incomePath = buildSmoothPath(incomePoints);
  const expensePath = buildSmoothPath(expensePoints);
  const areaSuffix = (points: { x: number; y: number }[]) =>
    ` L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;

  const gridSteps = [0, 1, 2, 3, 4];
  const lastIndex = count - 1;
  const lastIncome = series.income[lastIndex] ?? 0;
  const lastExpense = series.expense[lastIndex] ?? 0;
  const endValuesEqual = lastIncome === lastExpense;

  // Nudge endpoint pills apart when the lines finish close together.
  let incomeEndY = incomePoints[lastIndex]?.y ?? baseline;
  let expenseEndY = expensePoints[lastIndex]?.y ?? baseline;

  if (!endValuesEqual && Math.abs(incomeEndY - expenseEndY) < 24) {
    const middle = (incomeEndY + expenseEndY) / 2;
    const direction = incomeEndY <= expenseEndY ? 1 : -1;

    incomeEndY = middle - direction * 12;
    expenseEndY = middle + direction * 12;
  }

  const xLabelIndices =
    count <= 6
      ? series.labels.map((_, index) => index)
      : [0, 1, 2, 3].map((step) =>
          Math.round((step * (count - 1)) / 3)
        );

  const endpoints: {
    color: string;
    key: string;
    pillY: number;
    pointY: number;
    value: number;
  }[] = endValuesEqual
    ? [
        {
          color: premiumTheme.colors.ink,
          key: "combined",
          pillY: expenseEndY,
          pointY: expensePoints[lastIndex]?.y ?? baseline,
          value: lastExpense,
        },
      ]
    : [
        {
          color: "#16a34a",
          key: "income",
          pillY: incomeEndY,
          pointY: incomePoints[lastIndex]?.y ?? baseline,
          value: lastIncome,
        },
        {
          color: premiumTheme.colors.ink,
          key: "expense",
          pillY: expenseEndY,
          pointY: expensePoints[lastIndex]?.y ?? baseline,
          value: lastExpense,
        },
      ];

  return (
    <View className="-mb-0.5 overflow-hidden">
      <Svg height={height} width={width}>
        <Defs>
          <LinearGradient id="cashFlowIncomeFill" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#16a34a" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#16a34a" stopOpacity={0.01} />
          </LinearGradient>
          <LinearGradient id="cashFlowExpenseFill" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#3f4a63" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#3f4a63" stopOpacity={0.01} />
          </LinearGradient>
        </Defs>

        {gridSteps.map((step) => {
          const y = padTop + (plotHeight * step) / 4;
          const value = yMax * (1 - step / 4);

          return (
            <G key={`grid-${step}`}>
              <Path
                d={`M ${padLeft} ${y} H ${padLeft + plotWidth}`}
                stroke={step === 4 ? "#e4e7ec" : "#f2f4f7"}
                strokeWidth={1}
              />
              <SvgText
                fill="#98a2b3"
                fontSize={10.5}
                fontWeight="600"
                textAnchor="end"
                x={padLeft - 9}
                y={y + 3.5}
              >
                {step === 4 ? "0" : formatCompactAmount(value)}
              </SvgText>
            </G>
          );
        })}

        {count > 1 ? (
          <>
            <Path
              d={`${incomePath}${areaSuffix(incomePoints)}`}
              fill="url(#cashFlowIncomeFill)"
            />
            <Path
              d={`${expensePath}${areaSuffix(expensePoints)}`}
              fill="url(#cashFlowExpenseFill)"
            />
          </>
        ) : null}

        <Path
          d={incomePath}
          fill="none"
          stroke="#16a34a"
          strokeLinecap="round"
          strokeWidth={2.4}
        />
        <Path
          d={expensePath}
          fill="none"
          stroke={premiumTheme.colors.ink}
          strokeLinecap="round"
          strokeWidth={2.4}
        />

        {endpoints.map((endpoint) => {
          const label = `₹${Math.round(endpoint.value).toLocaleString(
            "en-IN"
          )}`;
          const pillWidth = label.length * 6.6 + 18;
          const dotX = toX(lastIndex);

          return (
            <G key={endpoint.key}>
              <Circle
                cx={dotX}
                cy={endpoint.pointY}
                fill={endpoint.color}
                r={4.5}
              />
              <Rect
                fill={endpoint.color}
                height={23}
                rx={8}
                width={pillWidth}
                x={dotX - pillWidth - 10}
                y={endpoint.pillY - 11.5}
              />
              <SvgText
                fill="#ffffff"
                fontSize={10.5}
                fontWeight="700"
                textAnchor="middle"
                x={dotX - 10 - pillWidth / 2}
                y={endpoint.pillY + 3.5}
              >
                {label}
              </SvgText>
            </G>
          );
        })}

        {xLabelIndices.map((index) => (
          <SvgText
            fill="#98a2b3"
            fontSize={10}
            fontWeight="600"
            key={`x-${index}`}
            textAnchor={
              index === 0
                ? "start"
                : index === lastIndex
                  ? "end"
                  : "middle"
            }
            x={toX(index)}
            y={height - 7}
          >
            {series.labels[index] ?? ""}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function CategoryDonutChart({
  categories,
  size,
  total,
}: {
  categories: AnalyticsGroup[];
  size: number;
  total: number;
}) {
  const strokeWidth = Math.max(16, Math.round(size * 0.14));
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = getDonutSegments(categories, total, circumference);

  return (
    <View
      className="items-center justify-center overflow-hidden"
      style={{
        height: size,
        width: size,
      }}
    >
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment) => (
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="transparent"
            key={segment.name}
            originX={size / 2}
            originY={size / 2}
            r={radius}
            rotation="-90"
            stroke={segment.color}
            strokeDasharray={`${segment.arcLength} ${
              circumference - segment.arcLength
            }`}
            strokeDashoffset={segment.dashOffset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        ))}
      </Svg>
      <View className="absolute left-[26%] top-[26%] h-[48%] w-[48%] items-center justify-center rounded-full bg-white px-2">
        <Text
          adjustsFontSizeToFit
          className="text-center text-[13px] font-black text-ink"
          minimumFontScale={0.72}
          numberOfLines={1}
        >
          {MobileDashboardService.getFormattedBalance(total)}
        </Text>
        <Text className="mt-0.5 text-[11px] font-bold text-secondary">
          Total
        </Text>
      </View>
    </View>
  );
}

function AnalyticsCategoryRow({
  category,
  color,
}: {
  category: AnalyticsGroup;
  color: string;
}) {
  const categoryIcon = getTransactionIcon(category.name, "expense");
  const Icon = categoryIcon.Icon;

  const share = Math.max(
    0,
    Math.min(100, category.percentageOfExpenses)
  );

  return (
    <View className="min-h-11 flex-row items-center gap-2 py-[5px]">
      <View
        className="h-7 w-7 items-center justify-center rounded-[9px]"
        style={{
          backgroundColor: `${color}1f`,
        }}
      >
        <Icon color={color} size={13} strokeWidth={2.4} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="min-w-0 flex-1 text-[12.5px] font-bold tracking-[-0.2px] text-ink"
            numberOfLines={1}
          >
            {category.name}
          </Text>
          <Text className="ml-2 text-[12px] font-extrabold text-ink tabular-nums">
            {MobileDashboardService.getFormattedBalance(category.expenses)}
          </Text>
        </View>
        <View className="mt-[5px] flex-row items-center gap-[7px]">
          <View className="h-[5px] flex-1 overflow-hidden rounded-full bg-field">
            <View
              className="h-full rounded-full"
              style={{
                backgroundColor: color,
                width: `${share}%`,
              }}
            />
          </View>
          <Text className="min-w-[30px] text-right text-[10.5px] font-bold text-secondary tabular-nums">
            {Math.round(category.percentageOfExpenses)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

function AnalyticsInsightCard({
  accent,
  background,
  Icon,
  label,
  subtitle,
  value,
}: {
  accent: string;
  background: string;
  Icon: FinanceScreenIcon;
  label: string;
  subtitle: string;
  value: number;
}) {
  const gradientId = `insightBg${accent.replace("#", "")}`;

  return (
    <View className="min-w-0 flex-1 gap-[5px] overflow-hidden rounded-[18px] px-2.5 py-3">
      <View className="absolute inset-0" pointerEvents="none">
        <Svg height="100%" preserveAspectRatio="none" width="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="0.12" />
              <Stop offset="0.6" stopColor={accent} stopOpacity="0.05" />
              <Stop offset="1" stopColor={accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect fill={`url(#${gradientId})`} height="100%" width="100%" />
        </Svg>
      </View>
      <View
        className="mb-[3px] h-[34px] w-[34px] items-center justify-center rounded-[17px]"
        style={{
          backgroundColor: background,
        }}
      >
        <Icon color={accent} size={18} strokeWidth={2.5} />
      </View>
      <Text
        className="text-[10px] font-extrabold text-secondary"
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        className="text-[14px] font-black text-ink"
        minimumFontScale={0.72}
        numberOfLines={1}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <View
        className="mt-0.5 min-h-[22px] max-w-full flex-row items-center gap-[5px] self-start rounded-full px-[9px]"
        style={{
          backgroundColor: `${accent}17`,
        }}
      >
        <View
          className="h-[5px] w-[5px] rounded-full"
          style={{
            backgroundColor: accent,
          }}
        />
        <Text
          className="shrink text-[10.5px] font-extrabold"
          numberOfLines={1}
          style={{
            color: accent,
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function getDonutSegments(
  categories: AnalyticsGroup[],
  total: number,
  circumference: number
) {
  let consumedArc = 0;

  return categories.map((category, index) => {
    const arcLength =
      total > 0 ? (category.expenses / total) * circumference : 0;
    const segment = {
      arcLength,
      color: getAnalyticsCategoryColor(index),
      dashOffset: -consumedArc,
      name: category.name,
    };

    consumedArc += arcLength;

    return segment;
  });
}

function getAnalyticsMonthPeriods(
  range: AnalyticsRange,
  anchor: Date,
  customRange: AnalyticsCustomRange | null
) {
  if (range === "all" || (range === "custom" && !customRange)) {
    return null;
  }

  const start =
    range === "custom" && customRange
      ? new Date(
          customRange.start.getFullYear(),
          customRange.start.getMonth(),
          1
        )
      : range === "ytd"
        ? new Date(anchor.getFullYear(), 0, 1)
        : new Date(
            anchor.getFullYear(),
            anchor.getMonth() - (analyticsRangeMonthOffsets[range] ?? 0),
            1
          );
  const end =
    range === "custom" && customRange
      ? new Date(customRange.end.getFullYear(), customRange.end.getMonth(), 1)
      : new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const periods: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end && periods.length < 24) {
    periods.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
        2,
        "0"
      )}`
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return periods;
}

function getCashFlowChartPoints(points: AnalyticsTrendPoint[]) {
  if (points.length >= 2) {
    return points;
  }

  if (points.length === 1) {
    return [emptyPreviousTrendPoint(points[0].period), points[0]];
  }

  const now = new Date();

  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 3 + index, 1);

    return emptyTrendPointForPeriod(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  });
}

function emptyPreviousTrendPoint(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 2, 1);

  return emptyTrendPointForPeriod(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  );
}

function emptyTrendPointForPeriod(period: string): AnalyticsTrendPoint {
  return {
    expenses: 0,
    income: 0,
    net: 0,
    period,
    transactionCount: 0,
  };
}

function filterTransactionsForAnalyticsRange(
  transactions: CachedTransaction[],
  range: AnalyticsRange,
  anchor: Date,
  customRange: AnalyticsCustomRange | null
) {
  if (range === "all") {
    return transactions;
  }

  if (range === "custom" && !customRange) {
    return transactions;
  }

  const start =
    range === "custom" && customRange
      ? new Date(
          customRange.start.getFullYear(),
          customRange.start.getMonth(),
          customRange.start.getDate()
        )
      : range === "ytd"
        ? new Date(anchor.getFullYear(), 0, 1)
        : new Date(
            anchor.getFullYear(),
            anchor.getMonth() - (analyticsRangeMonthOffsets[range] ?? 0),
            1
          );
  const end =
    range === "custom" && customRange
      ? new Date(
          customRange.end.getFullYear(),
          customRange.end.getMonth(),
          customRange.end.getDate(),
          23,
          59,
          59,
          999
        )
      : new Date(
          anchor.getFullYear(),
          anchor.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

  return transactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurred_at);

    return (
      Number.isFinite(occurredAt.getTime()) &&
      occurredAt >= start &&
      occurredAt <= end
    );
  });
}

function formatAnalyticsRange(
  range: AnalyticsRange,
  anchor: Date,
  customRange: AnalyticsCustomRange | null
) {
  if (range === "all") {
    return "All transactions";
  }

  if (range === "custom") {
    return customRange
      ? formatCustomRange(customRange)
      : "Custom range";
  }

  if (range === "month") {
    return formatMonthRange(anchor);
  }

  const anchorEnd = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + 1,
    0
  );

  if (range === "ytd") {
    return `1 Jan - ${anchorEnd.getDate()} ${anchorEnd.toLocaleDateString(
      "en-IN",
      {
        month: "short",
        year: "numeric",
      }
    )}`;
  }

  return formatRollingRange(anchorEnd, range);
}

function formatCustomRange({ end, start }: AnalyticsCustomRange) {
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${start.toLocaleDateString("en-IN", {
      month: "short",
    })} - ${end.getDate()} ${end.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    })}`;
  }

  return `${start.getDate()} ${start.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  })} - ${end.getDate()} ${end.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  })}`;
}

function formatRollingRange(date: Date, range: AnalyticsRange) {
  const monthOffset = analyticsRangeMonthOffsets[range] ?? 0;
  const start = new Date(date.getFullYear(), date.getMonth() - monthOffset, 1);

  if (start.getFullYear() === date.getFullYear()) {
    return `${start.toLocaleDateString("en-IN", {
      month: "short",
    })} - ${date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    })}`;
  }

  return `${start.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  })} - ${date.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  })}`;
}

function formatShortPeriod(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
  });
}

function formatCompactAmount(value: number) {
  if (value >= 100000) {
    return `${trimTrailingZero(value / 100000)}L`;
  }

  if (value >= 1000) {
    return `${trimTrailingZero(value / 1000)}k`;
  }

  return value.toFixed(0);
}

function trimTrailingZero(value: number) {
  const rounded = Math.round(value * 10) / 10;

  return Number.isInteger(rounded)
    ? `${rounded}`
    : rounded.toFixed(1);
}

function getAnalyticsCategoryColor(index: number) {
  return [
    "#0f172a",
    "#64748b",
    "#ff6b4a",
    "#4ade80",
    "#facc15",
    "#67c7f7",
    "#cbd5e1",
  ][index % 7];
}

function AnalyticsCategoryModal({
  categories,
  onClose,
  subtitle,
  total,
}: {
  categories: AnalyticsGroup[];
  onClose: () => void;
  subtitle: string;
  total: number;
}) {
  const { height } = useWindowDimensions();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={financeStyles.modalBackdrop}>
        <Pressable onPress={onClose} style={financeStyles.modalDismissLayer} />
        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 24 }}
          style={pickerPanelStyle}
          transition={{
            damping: 18,
            mass: 0.8,
            stiffness: 180,
            type: "spring",
          }}
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text style={financeStyles.merchantPickerTitle}>
                Spending by Category
              </Text>
              <Text style={financeStyles.merchantPickerSubtitle}>
                {subtitle} · {categories.length}{" "}
                {categories.length === 1 ? "category" : "categories"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={financeStyles.modalCloseButton}>
              <X color="#0f172a" size={20} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            className="grow-0"
            contentContainerClassName="pb-2"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={{
              maxHeight: Math.max(320, height * 0.62),
            }}
          >
            <View className="items-center pb-1.5 pt-1">
              <CategoryDonutChart
                categories={categories}
                size={160}
                total={total}
              />
            </View>

            <View className="gap-1">
              {categories.map((category, index) => (
                <AnalyticsCategoryRow
                  category={category}
                  color={getAnalyticsCategoryColor(index)}
                  key={category.name}
                />
              ))}
            </View>
          </ScrollView>
        </MotiView>
      </View>
    </Modal>
  );
}

function AnalyticsCustomRangeModal({
  initialRange,
  onApply,
  onClose,
}: {
  initialRange: AnalyticsCustomRange | null;
  onApply: (range: AnalyticsCustomRange) => void;
  onClose: () => void;
}) {
  const [draftStart, setDraftStart] = useState<Date | null>(
    initialRange?.start ?? null
  );
  const [draftEnd, setDraftEnd] = useState<Date | null>(
    initialRange?.end ?? null
  );
  const [monthCursor, setMonthCursor] = useState(() => {
    const seed = initialRange?.end ?? new Date();

    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });
  const calendarDays = useMemo(
    () => getCalendarDays(monthCursor),
    [monthCursor]
  );

  function selectDay(date: Date) {
    if (!draftStart || draftEnd) {
      setDraftStart(date);
      setDraftEnd(null);
      return;
    }

    if (date < draftStart) {
      setDraftStart(date);
      return;
    }

    setDraftEnd(date);
  }

  const helperText = !draftStart
    ? "Pick a start date."
    : !draftEnd
      ? "Pick an end date."
      : formatCustomRange({ end: draftEnd, start: draftStart });

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={financeStyles.modalBackdrop}>
        <Pressable onPress={onClose} style={financeStyles.modalDismissLayer} />
        <MotiView
          animate={{ opacity: 1, translateY: 0 }}
          from={{ opacity: 0, translateY: 24 }}
          style={pickerPanelStyle}
          transition={{
            damping: 18,
            mass: 0.8,
            stiffness: 180,
            type: "spring",
          }}
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text style={financeStyles.merchantPickerTitle}>
                Custom range
              </Text>
              <Text style={financeStyles.merchantPickerSubtitle}>
                {helperText}
              </Text>
            </View>
            <Pressable onPress={onClose} style={financeStyles.modalCloseButton}>
              <X color="#0f172a" size={20} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between">
            <Pressable
              className="h-[38px] w-[38px] items-center justify-center rounded-control bg-field"
              onPress={() =>
                setMonthCursor(
                  new Date(
                    monthCursor.getFullYear(),
                    monthCursor.getMonth() - 1,
                    1
                  )
                )
              }
            >
              <ChevronLeft color="#0f172a" size={19} strokeWidth={2.5} />
            </Pressable>
            <Text className="flex-1 text-center text-[15px] font-extrabold text-ink">
              {monthCursor.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Pressable
              className={`h-[38px] w-[38px] items-center justify-center rounded-control bg-field ${
                isCurrentMonth(monthCursor) ? "opacity-35" : ""
              }`}
              disabled={isCurrentMonth(monthCursor)}
              onPress={() =>
                setMonthCursor(
                  new Date(
                    monthCursor.getFullYear(),
                    monthCursor.getMonth() + 1,
                    1
                  )
                )
              }
            >
              <ChevronRight color="#0f172a" size={19} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap">
            {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
              <Text
                className="basis-[14.285%] py-[7px] text-center text-[11px] font-extrabold text-muted"
                key={`${label}-${index}`}
              >
                {label}
              </Text>
            ))}
            {calendarDays.map((date, index) => {
              const isEdge = date
                ? (draftStart !== null && isSameLocalDay(date, draftStart)) ||
                  (draftEnd !== null && isSameLocalDay(date, draftEnd))
                : false;
              const inRange =
                date && draftStart && draftEnd
                  ? date > draftStart && date < draftEnd
                  : false;
              const future = date ? isFutureLocalDay(date) : false;

              return (
                <View
                  className="h-[42px] basis-[14.285%] items-center justify-center"
                  key={date?.toISOString() ?? `blank-${index}`}
                >
                  {date ? (
                    <Pressable
                      className={`h-[34px] w-[34px] items-center justify-center rounded-[16px] ${
                        isEdge ? "bg-ink" : inRange ? "bg-field" : ""
                      }`}
                      disabled={future}
                      onPress={() => selectDay(date)}
                    >
                      <Text
                        className={`text-[13px] font-extrabold ${
                          isEdge
                            ? "text-white"
                            : future
                              ? "text-[#cbd5e1]"
                              : "text-[#334155]"
                        }`}
                      >
                        {date.getDate()}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Pressable
            className={`min-h-12 items-center justify-center rounded-[15px] bg-ink ${
              !draftStart || !draftEnd ? "opacity-40" : ""
            }`}
            disabled={!draftStart || !draftEnd}
            onPress={() => {
              if (draftStart && draftEnd) {
                onApply({ end: draftEnd, start: draftStart });
              }
            }}
          >
            <Text className="text-[14px] font-extrabold text-white">
              Apply range
            </Text>
          </Pressable>
        </MotiView>
      </View>
    </Modal>
  );
}
