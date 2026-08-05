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
  StyleSheet,
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


export function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("month");
  const [anchorOffset, setAnchorOffset] = useState(0);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
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
  const visibleCategories = analytics.categoryAnalytics
    .filter((group) => group.expenses > 0)
    .slice(0, 6);
  const chartWidth = Math.max(280, width - 72);
  const pieSize = Math.min(176, Math.max(148, width * 0.42));
  const highestCategory = visibleCategories[0] ?? null;
  const lowestCategory =
    visibleCategories.length > 0
      ? visibleCategories[visibleCategories.length - 1]
      : null;

  return (
    <ScrollView contentContainerStyle={styles.analyticsContainer}>
      <View style={styles.analyticsHeaderCard}>
        <View style={styles.analyticsPeriodWrap}>
          {periodOpen ? (
            <Pressable
              onPress={() => setPeriodOpen(false)}
              style={styles.analyticsPeriodBackdrop}
            />
          ) : null}
          <View style={styles.analyticsHeaderTop}>
            <Pressable
              disabled={analyticsRange === "all"}
              onPress={() => {
                if (analyticsRange === "custom") {
                  setCustomOpen(true);
                  return;
                }

                setPeriodOpen((open) => !open);
              }}
              style={({ pressed }) => [
                styles.analyticsDateRow,
                pressed && styles.analyticsPressed,
              ]}
            >
              <View style={styles.analyticsDateIconTile}>
                <CalendarDays
                  color={premiumTheme.colors.ink}
                  size={16}
                  strokeWidth={2.2}
                />
              </View>
              <Text numberOfLines={1} style={styles.analyticsDateText}>
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
              onPress={() => {
                setPeriodOpen(false);
                setCustomOpen(true);
              }}
              style={({ pressed }) => [
                styles.analyticsCustomButton,
                analyticsRange === "custom" &&
                  styles.analyticsCustomButtonActive,
                pressed && styles.analyticsPressed,
              ]}
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
                style={[
                  styles.analyticsCustomText,
                  analyticsRange === "custom" &&
                    styles.analyticsCustomTextActive,
                ]}
              >
                Custom
              </Text>
            </Pressable>
          </View>

          {periodOpen ? (
            <MotiView
              animate={{ opacity: 1, translateY: 0 }}
              from={{ opacity: 0, translateY: -6 }}
              style={styles.analyticsPeriodMenu}
              transition={{ duration: 140, type: "timing" }}
            >
              <ScrollView
                nestedScrollEnabled
                style={styles.analyticsPeriodViewport}
              >
                {periodOptions.map((option) => {
                  const active = option.offset === anchorOffset;

                  return (
                    <Pressable
                      key={option.offset}
                      onPress={() => {
                        setAnchorOffset(option.offset);
                        setPeriodOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.analyticsPeriodOption,
                        pressed && styles.analyticsPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.analyticsPeriodOptionText,
                          active && styles.analyticsPeriodOptionTextActive,
                        ]}
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

        <View style={styles.analyticsRangeSelector}>
          {analyticsRangeOptions.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? (
                <View style={styles.analyticsRangeDivider} />
              ) : null}
              <Pressable
                onPress={() => {
                  setAnalyticsRange(option.value);

                  if (option.value === "all") {
                    setPeriodOpen(false);
                  }
                }}
                style={[
                  styles.analyticsRangeButton,
                  analyticsRange === option.value &&
                    styles.analyticsRangeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.analyticsRangeText,
                    analyticsRange === option.value &&
                      styles.analyticsRangeTextActive,
                  ]}
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

      <View style={styles.analyticsSummaryCard}>
        <View style={styles.analyticsSummaryTopWrap}>
          <AnalyticsSummaryWave />
          <View style={styles.analyticsSummaryTop}>
            <View style={styles.analyticsSummaryCopy}>
              <Text style={styles.analyticsSummaryTitle}>{summaryTitle}</Text>
              <Text style={styles.analyticsSummaryAmount}>
                {MobileDashboardService.getFormattedBalance(
                  analytics.totalExpenses
                )}
              </Text>
              <Text style={styles.analyticsSummarySub}>spent</Text>
              {spendComparison ? (
                <View style={styles.analyticsSummaryDeltaRow}>
                  {spendComparison.changePercent <= 0 ? (
                    <ArrowDown color="#16a34a" size={14} strokeWidth={2.5} />
                  ) : (
                    <ArrowUp color="#dc2626" size={14} strokeWidth={2.5} />
                  )}
                  <Text
                    style={[
                      styles.analyticsSummaryDeltaText,
                      spendComparison.changePercent <= 0
                        ? styles.analyticsSummaryDeltaGood
                        : styles.analyticsSummaryDeltaBad,
                    ]}
                  >
                    {Math.abs(spendComparison.changePercent).toFixed(0)}%
                  </Text>
                  <Text
                    style={[
                      styles.analyticsSummaryDeltaLabel,
                      spendComparison.changePercent <= 0
                        ? styles.analyticsSummaryDeltaGood
                        : styles.analyticsSummaryDeltaBad,
                    ]}
                  >
                    {spendComparison.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.analyticsSummaryIconTile}>
              <ChartNoAxesCombined
                color="#6d5ae6"
                size={20}
                strokeWidth={2.2}
              />
            </View>
          </View>
        </View>

        <View style={styles.analyticsSummaryStats}>
          <View pointerEvents="none" style={styles.analyticsSummaryStatsBg}>
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
          <View style={styles.analyticsSummaryStatDivider} />
          <AnalyticsSummaryStat
            accent="#d97706"
            Icon={IndianRupee}
            label="Net Saving"
            tinted
            value={MobileDashboardService.getFormattedBalance(
              analytics.netBalance
            )}
          />
          <View style={styles.analyticsSummaryStatDivider} />
          <AnalyticsSummaryStat
            accent="#64748b"
            Icon={ReceiptText}
            label="Transactions"
            tinted
            value={`${filteredTransactions.length}`}
          />
        </View>
      </View>

      <View style={styles.analyticsChartCard}>
        <View pointerEvents="none" style={styles.analyticsChartCardBg}>
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
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsSectionTitle}>
            Income vs Expense
          </Text>
          <View style={styles.analyticsLegendRow}>
            <View style={styles.analyticsLegendItem}>
              <View
                style={[
                  styles.analyticsLegendDot,
                  { backgroundColor: "#16a34a" },
                ]}
              />
              <Text style={styles.analyticsLegendText}>Income</Text>
            </View>
            <View style={styles.analyticsLegendItem}>
              <View
                style={[
                  styles.analyticsLegendDot,
                  { backgroundColor: premiumTheme.colors.ink },
                ]}
              />
              <Text style={styles.analyticsLegendText}>Expense</Text>
            </View>
          </View>
        </View>

        <CashFlowLineChart series={chartSeries} width={chartWidth} />

        {spendStats ? (
          <View style={styles.analyticsChartStats}>
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

      <View style={styles.analyticsCategoryCard}>
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsSectionTitle}>
            Spending by Category
          </Text>
        </View>

        <View style={styles.analyticsDonutContainer}>
          <CategoryDonutChart
            categories={visibleCategories}
            size={pieSize}
            total={analytics.totalExpenses}
          />
        </View>

        <View style={styles.analyticsCategoryList}>
          {visibleCategories.length === 0 ? (
            <Text style={styles.analyticsEmptyText}>
              No expense categories yet.
            </Text>
          ) : (
            visibleCategories.map((category, index) => (
              <AnalyticsCategoryRow
                category={category}
                color={getAnalyticsCategoryColor(index)}
                key={category.name}
              />
            ))
          )}
        </View>
      </View>

      <View style={styles.analyticsInsightRow}>
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
    <View pointerEvents="none" style={styles.analyticsSummaryWaveWrap}>
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
        style={styles.analyticsSummaryWave}
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
    <View style={styles.analyticsSummaryStat}>
      <View
        style={[
          styles.analyticsSummaryStatIcon,
          round && styles.analyticsSummaryStatIconRound,
          tinted && styles.analyticsSummaryStatIconFilled,
          (tinted ||
            (round && accent !== premiumTheme.colors.ink)) && {
            backgroundColor: `${accent}14`,
          },
        ]}
      >
        <Icon
          color={accent}
          size={tinted ? 15 : round ? 14 : 15}
          strokeWidth={2.3}
        />
      </View>
      <View style={styles.analyticsSummaryStatCopy}>
        <Text numberOfLines={1} style={styles.analyticsSummaryStatLabel}>
          {label}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.analyticsSummaryStatValue}
        >
          {value}
        </Text>
        {sub ? (
          <Text numberOfLines={1} style={styles.analyticsSummaryStatSub}>
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
    <View style={styles.analyticsLineChartWrap}>
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
      style={[
        styles.analyticsDonutWrap,
        {
          height: size,
          width: size,
        },
      ]}
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
      <View style={styles.analyticsDonutCenter}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.analyticsDonutValue}
        >
          {MobileDashboardService.getFormattedBalance(total)}
        </Text>
        <Text style={styles.analyticsDonutLabel}>Total</Text>
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
    <View style={styles.analyticsCategoryRow}>
      <View
        style={[
          styles.analyticsCategoryIcon,
          {
            backgroundColor: `${color}1f`,
          },
        ]}
      >
        <Icon color={color} size={15} strokeWidth={2.4} />
      </View>
      <View style={styles.analyticsCategoryCopy}>
        <View style={styles.analyticsCategoryTopRow}>
          <Text numberOfLines={1} style={styles.analyticsCategoryName}>
            {category.name}
          </Text>
          <Text style={styles.analyticsCategoryAmount}>
            {MobileDashboardService.getFormattedBalance(category.expenses)}
          </Text>
        </View>
        <View style={styles.analyticsCategoryBarRow}>
          <View style={styles.analyticsCategoryBarTrack}>
            <View
              style={[
                styles.analyticsCategoryBarFill,
                {
                  backgroundColor: color,
                  width: `${share}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.analyticsCategoryPercent}>
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
  return (
    <View style={styles.analyticsInsightCard}>
      <View
        style={[
          styles.analyticsInsightIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Icon color={accent} size={18} strokeWidth={2.5} />
      </View>
      <Text numberOfLines={1} style={styles.analyticsInsightLabel}>
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.analyticsInsightValue}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.analyticsInsightSubtitle,
          {
            color: accent,
          },
        ]}
      >
        {subtitle}
      </Text>
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
          style={styles.analyticsPickerPanel}
          transition={{
            damping: 18,
            mass: 0.8,
            stiffness: 180,
            type: "spring",
          }}
        >
          <View style={styles.analyticsPickerHeader}>
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

          <View style={styles.analyticsPickerMonthRow}>
            <Pressable
              onPress={() =>
                setMonthCursor(
                  new Date(
                    monthCursor.getFullYear(),
                    monthCursor.getMonth() - 1,
                    1
                  )
                )
              }
              style={styles.analyticsPickerNavButton}
            >
              <ChevronLeft color="#0f172a" size={19} strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.analyticsPickerMonth}>
              {monthCursor.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Pressable
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
              style={[
                styles.analyticsPickerNavButton,
                isCurrentMonth(monthCursor) &&
                  styles.analyticsPickerNavButtonDisabled,
              ]}
            >
              <ChevronRight color="#0f172a" size={19} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.analyticsPickerGrid}>
            {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
              <Text
                key={`${label}-${index}`}
                style={styles.analyticsPickerWeekday}
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
                  key={date?.toISOString() ?? `blank-${index}`}
                  style={styles.analyticsPickerCell}
                >
                  {date ? (
                    <Pressable
                      disabled={future}
                      onPress={() => selectDay(date)}
                      style={[
                        styles.analyticsPickerDay,
                        inRange && styles.analyticsPickerDayInRange,
                        isEdge && styles.analyticsPickerDaySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.analyticsPickerDayText,
                          future && styles.analyticsPickerDayTextDisabled,
                          isEdge && styles.analyticsPickerDayTextSelected,
                        ]}
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
            disabled={!draftStart || !draftEnd}
            onPress={() => {
              if (draftStart && draftEnd) {
                onApply({ end: draftEnd, start: draftStart });
              }
            }}
            style={[
              styles.analyticsPickerApply,
              (!draftStart || !draftEnd) && styles.analyticsPickerApplyDisabled,
            ]}
          >
            <Text style={styles.analyticsPickerApplyText}>Apply range</Text>
          </Pressable>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  analyticsCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  analyticsCategoryAmount: {
    color: "#0f172a",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    marginLeft: 10,
  },
  analyticsCategoryBarFill: {
    borderRadius: 999,
    height: "100%",
  },
  analyticsCategoryBarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 6,
  },
  analyticsCategoryBarTrack: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 999,
    flex: 1,
    height: 5,
    overflow: "hidden",
  },
  analyticsCategoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  analyticsCategoryTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  analyticsCategoryCard: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    gap: 18,
    padding: 14,
    ...premiumTheme.shadow.floating,
  },
  analyticsCategoryIcon: {
    alignItems: "center",
    borderRadius: 11,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  analyticsCategoryList: {
    gap: 4,
  },
  analyticsCategoryName: {
    color: "#0f172a",
    flex: 1,
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    minWidth: 0,
  },
  analyticsCategoryPercent: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    minWidth: 34,
    textAlign: "right",
  },
  analyticsCategoryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 54,
    paddingVertical: 8,
  },
  analyticsChartCard: {
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.section,
    gap: 12,
    overflow: "hidden",
    padding: 14,
    ...premiumTheme.shadow.floating,
  },
  analyticsChartCardBg: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  analyticsContainer: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 14,
    padding: 20,
    paddingBottom: 28,
  },
  analyticsCustomButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 11,
  },
  analyticsCustomButtonActive: {
    backgroundColor: premiumTheme.colors.ink,
    borderColor: premiumTheme.colors.ink,
  },
  analyticsCustomText: {
    color: premiumTheme.colors.ink,
    fontSize: 11,
    fontWeight: "700",
  },
  analyticsCustomTextActive: {
    color: "#ffffff",
  },
  analyticsDateIconTile: {
    alignItems: "center",
    backgroundColor: "#e9ebf1",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  analyticsDateRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  analyticsDateText: {
    color: "#0f172a",
    flexShrink: 1,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  analyticsHeaderCard: {
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    zIndex: 30,
    ...premiumTheme.shadow.soft,
  },
  analyticsHeaderTop: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    flexDirection: "row",
    gap: 8,
    paddingRight: 12,
  },
  analyticsPeriodBackdrop: {
    bottom: -1000,
    left: -1000,
    position: "absolute",
    right: -1000,
    top: -1000,
    zIndex: 25,
  },
  analyticsPeriodMenu: {
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
  },
  analyticsPeriodOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 38,
    paddingHorizontal: 14,
  },
  analyticsPeriodOptionText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  analyticsPeriodOptionTextActive: {
    color: premiumTheme.colors.ink,
    fontWeight: "700",
  },
  analyticsPeriodViewport: {
    maxHeight: 264,
  },
  analyticsPeriodWrap: {
    zIndex: 30,
  },
  analyticsPickerApply: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 15,
    justifyContent: "center",
    minHeight: 48,
  },
  analyticsPickerApplyDisabled: {
    opacity: 0.4,
  },
  analyticsPickerApplyText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  analyticsPickerCell: {
    alignItems: "center",
    flexBasis: "14.285%",
    height: 42,
    justifyContent: "center",
  },
  analyticsPickerDay: {
    alignItems: "center",
    borderRadius: 16,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  analyticsPickerDayInRange: {
    backgroundColor: premiumTheme.colors.field,
  },
  analyticsPickerDaySelected: {
    backgroundColor: premiumTheme.colors.ink,
  },
  analyticsPickerDayText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  analyticsPickerDayTextDisabled: {
    color: "#cbd5e1",
  },
  analyticsPickerDayTextSelected: {
    color: "#ffffff",
  },
  analyticsPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  analyticsPickerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  analyticsPickerMonth: {
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  analyticsPickerMonthRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  analyticsPickerNavButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  analyticsPickerNavButtonDisabled: {
    opacity: 0.35,
  },
  analyticsPickerPanel: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 18,
    padding: 18,
    paddingBottom: 30,
  },
  analyticsPickerWeekday: {
    color: "#94a3b8",
    flexBasis: "14.285%",
    fontSize: 11,
    fontWeight: "800",
    paddingVertical: 7,
    textAlign: "center",
  },
  analyticsPressed: {
    opacity: 0.85,
  },
  analyticsDonutCenter: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    height: "48%",
    justifyContent: "center",
    left: "26%",
    paddingHorizontal: 8,
    position: "absolute",
    top: "26%",
    width: "48%",
  },
  analyticsDonutContainer: {
    alignItems: "center",
    paddingBottom: 6,
    paddingTop: 4,
  },
  analyticsDonutLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  analyticsDonutValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  analyticsDonutWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  analyticsEmptyText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  analyticsInsightCard: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flex: 1,
    gap: 5,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  analyticsInsightIcon: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    marginBottom: 3,
    width: 34,
  },
  analyticsInsightLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
  },
  analyticsInsightRow: {
    flexDirection: "row",
    gap: 10,
  },
  analyticsInsightSubtitle: {
    fontSize: 11,
    fontWeight: "900",
  },
  analyticsInsightValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  analyticsLegendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  analyticsLegendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  analyticsLegendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  analyticsLegendText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  analyticsLineChartWrap: {
    marginBottom: -2,
    overflow: "hidden",
  },
  analyticsSummaryAmount: {
    color: "#0f172a",
    fontSize: 30,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 6,
  },
  analyticsSummaryCard: {
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    ...premiumTheme.shadow.soft,
  },
  analyticsSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  analyticsSummaryDeltaBad: {
    color: "#dc2626",
  },
  analyticsSummaryDeltaGood: {
    color: "#16a34a",
  },
  analyticsSummaryDeltaLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  analyticsSummaryDeltaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 10,
  },
  analyticsSummaryDeltaText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  analyticsSummaryIconTile: {
    alignItems: "center",
    backgroundColor: "#ece9fb",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  analyticsSummaryStat: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  analyticsSummaryStatCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  analyticsSummaryStatDivider: {
    alignSelf: "stretch",
    backgroundColor: premiumTheme.colors.border,
    marginVertical: 2,
    width: premiumHairline,
  },
  analyticsSummaryStatIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: 9,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  analyticsSummaryStatIconFilled: {
    borderRadius: 8,
    borderWidth: 0,
    height: 28,
    width: 28,
  },
  analyticsSummaryStatIconRound: {
    backgroundColor: "#e9ebf1",
    borderRadius: 9,
    borderWidth: 0,
    height: 32,
    width: 32,
  },
  analyticsChartStats: {
    borderTopColor: premiumTheme.colors.divider,
    borderTopWidth: premiumHairline,
    flexDirection: "row",
    gap: 16,
    marginTop: 2,
    paddingTop: 14,
  },

  analyticsSummaryStatSub: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "600",
  },
  analyticsSummaryStatLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "600",
  },
  analyticsSummaryStats: {
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    borderTopColor: premiumTheme.colors.border,
    borderTopWidth: premiumHairline,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  analyticsSummaryStatsBg: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  analyticsSummaryStatValue: {
    color: "#0f172a",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  analyticsSummarySub: {
    color: premiumTheme.colors.secondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  analyticsSummaryTitle: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  analyticsSummaryTop: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  analyticsSummaryTopWrap: {
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    overflow: "hidden",
  },
  analyticsSummaryWave: {
    bottom: 0,
    position: "absolute",
    right: 0,
  },
  analyticsSummaryWaveWrap: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  analyticsRangeButton: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 30,
  },
  analyticsRangeButtonActive: {
    backgroundColor: premiumTheme.colors.ink,
  },
  analyticsRangeDivider: {
    alignSelf: "center",
    backgroundColor: premiumTheme.colors.border,
    height: 14,
    width: premiumHairline,
  },
  analyticsRangeSelector: {
    alignItems: "center",
    borderTopColor: premiumTheme.colors.border,
    borderTopWidth: premiumHairline,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  analyticsRangeText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },
  analyticsRangeTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  analyticsSectionTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
});
