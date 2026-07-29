import { useMemo, useState } from "react";
import { MotiView } from "moti";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Svg, { Circle } from "react-native-svg";

import type {
  AnalyticsGroup,
  AnalyticsTrendPoint,
  CachedTransaction,
} from "@finance/shared-types";

import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { premiumHairline, premiumTheme } from "../theme/premiumTheme";
import { formatMonthRange, formatPercent } from "../utils/financeFormat";
import {
  type FinanceScreenIcon,
  getTransactionIcon,
} from "../utils/financeVisuals";

type AnalyticsRange = "month" | "3m" | "6m" | "all";

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
    label: "All",
    value: "all",
  },
] satisfies {
  label: string;
  value: AnalyticsRange;
}[];


export function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("month");
  const [anchorOffset, setAnchorOffset] = useState(0);
  const [periodOpen, setPeriodOpen] = useState(false);
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
        anchorDate
      ),
    [analyticsRange, anchorDate, transactions]
  );
  const analytics = useMemo(
    () => MobileDashboardService.getAnalytics(filteredTransactions),
    [filteredTransactions]
  );
  const visibleCashFlow = analytics.cashFlow.slice(-6);
  const visibleCategories = analytics.categoryAnalytics
    .filter((group) => group.expenses > 0)
    .slice(0, 6);
  const latestComparison =
    analytics.monthlyComparisons[analytics.monthlyComparisons.length - 1] ??
    null;
  const chartWidth = Math.max(280, width - 72);
  const pieSize = Math.min(124, Math.max(104, width * 0.29));
  const highestCategory = visibleCategories[0] ?? null;
  const lowestCategory =
    visibleCategories.length > 0
      ? visibleCategories[visibleCategories.length - 1]
      : null;

  return (
    <ScrollView contentContainerStyle={styles.analyticsContainer}>
      <View style={styles.analyticsHeaderRow}>
        <View style={styles.analyticsPeriodWrap}>
          {periodOpen ? (
            <Pressable
              onPress={() => setPeriodOpen(false)}
              style={styles.analyticsPeriodBackdrop}
            />
          ) : null}
          <Pressable
            disabled={analyticsRange === "all"}
            onPress={() => setPeriodOpen((open) => !open)}
            style={({ pressed }) => [
              styles.analyticsDatePill,
              pressed && styles.analyticsPressed,
            ]}
          >
            <CalendarDays
              color={premiumTheme.colors.ink}
              size={15}
              strokeWidth={2.2}
            />
            <Text numberOfLines={1} style={styles.analyticsDateText}>
              {formatAnalyticsRange(analyticsRange, anchorDate)}
            </Text>
            {analyticsRange !== "all" ? (
              <ChevronDown
                color={premiumTheme.colors.secondary}
                size={14}
                strokeWidth={2.4}
              />
            ) : null}
          </Pressable>

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
          {analyticsRangeOptions.map((option) => (
            <Pressable
              key={option.value}
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
          ))}
        </View>
      </View>

      <View style={styles.analyticsMetricRow}>
        <AnalyticsMetricCard
          Icon={ChartNoAxesCombined}
          accent="#7c3aed"
          background="#f5f3ff"
          label="Total Spend"
          trend={formatAnalyticsTrend(
            latestComparison?.expensesChangePercentage,
            "expense"
          )}
          value={analytics.totalExpenses}
        />
        <AnalyticsMetricCard
          Icon={Wallet}
          accent="#16a34a"
          background="#ecfdf5"
          label="Total Income"
          trend={formatAnalyticsTrend(
            latestComparison?.incomeChangePercentage,
            "income"
          )}
          value={analytics.totalIncome}
        />
        <AnalyticsMetricCard
          Icon={IndianRupee}
          accent="#f59e0b"
          background="#fffbeb"
          label="Net Savings"
          trend={formatAnalyticsTrend(
            latestComparison?.netChangePercentage,
            "income"
          )}
          value={analytics.netBalance}
        />
      </View>

      <View style={styles.analyticsChartCard}>
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsSectionTitle}>
            Income vs Expense Trend
          </Text>
          <View style={styles.analyticsLegendRow}>
            <AnalyticsLegendDot color="#0f172a" label="Income" />
            <AnalyticsLegendDot color="#94a3b8" label="Expense" />
          </View>
        </View>
        <CashFlowLineChart points={visibleCashFlow} width={chartWidth} />
      </View>

      <View style={styles.analyticsCategoryCard}>
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsSectionTitle}>
            Spending by Category
          </Text>
        </View>

        <View style={styles.analyticsCategoryBody}>
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

function AnalyticsMetricCard({
  accent,
  background,
  Icon,
  label,
  trend,
  value,
}: {
  accent: string;
  background: string;
  Icon: FinanceScreenIcon;
  label: string;
  trend: AnalyticsTrendDisplay;
  value: number;
}) {
  const TrendIcon = trend.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <View style={styles.analyticsMetricCard}>
      <View style={styles.analyticsMetricHeader}>
        <Text numberOfLines={1} style={styles.analyticsMetricLabel}>
          {label}
        </Text>
        <View
          style={[
            styles.analyticsMetricIcon,
            {
              backgroundColor: background,
            },
          ]}
        >
          <Icon color={accent} size={17} strokeWidth={2.4} />
        </View>
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.analyticsMetricValue}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <View style={styles.analyticsTrendRow}>
        <TrendIcon
          color={trend.color}
          size={13}
          strokeWidth={2.6}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.analyticsTrendText,
            {
              color: trend.color,
            },
          ]}
        >
          {trend.label}
        </Text>
      </View>
    </View>
  );
}

function AnalyticsLegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <View style={styles.analyticsLegendItem}>
      <View
        style={[
          styles.analyticsLegendDot,
          {
            backgroundColor: color,
          },
        ]}
      />
      <Text style={styles.analyticsLegendText}>{label}</Text>
    </View>
  );
}

function CashFlowLineChart({
  points,
  width,
}: {
  points: AnalyticsTrendPoint[];
  width: number;
}) {
  const chartPoints = getCashFlowChartPoints(points);

  return (
    <View style={styles.analyticsLineChartWrap}>
      <LineChart
        bezier
        chartConfig={{
          backgroundGradientFrom: "#ffffff",
          backgroundGradientFromOpacity: 0,
          backgroundGradientTo: "#ffffff",
          backgroundGradientToOpacity: 0,
          color: (opacity = 1) => `rgba(56, 86, 246, ${opacity})`,
          decimalPlaces: 0,
          labelColor: () => "#667085",
          propsForBackgroundLines: {
            stroke: "#e5e7eb",
            strokeDasharray: "4 5",
          },
        }}
        data={{
          labels: chartPoints.map((point) => formatShortPeriod(point.period)),
          datasets: [
            {
              color: () => "#0f172a",
              data: chartPoints.map((point) => point.income),
              strokeWidth: 2.5,
            },
            {
              color: () => "#94a3b8",
              data: chartPoints.map((point) => point.expenses),
              strokeWidth: 2.5,
            },
          ],
        }}
        formatYLabel={(value) => formatCompactAmount(Number(value))}
        fromZero
        height={220}
        segments={4}
        style={styles.analyticsLineChart}
        width={width}
        withDots={false}
        withInnerLines
        withOuterLines={false}
        withShadow={false}
        withVerticalLines={false}
      />
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

  return (
    <View style={styles.analyticsCategoryRow}>
      <View
        style={[
          styles.analyticsCategoryIcon,
          {
            backgroundColor: color,
          },
        ]}
      >
        <Icon color="#ffffff" size={14} strokeWidth={2.5} />
      </View>
      <Text numberOfLines={1} style={styles.analyticsCategoryName}>
        {category.name}
      </Text>
      <Text style={styles.analyticsCategoryPercent}>
        {Math.round(category.percentageOfExpenses)}%
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.analyticsCategoryAmount}
      >
        {MobileDashboardService.getFormattedBalance(category.expenses)}
      </Text>
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

interface AnalyticsTrendDisplay {
  color: string;
  direction: "down" | "up";
  label: string;
}

function formatAnalyticsTrend(
  value: number | null | undefined,
  tone: "expense" | "income"
): AnalyticsTrendDisplay {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return {
      color: "#64748b",
      direction: "up",
      label: "No comparison",
    };
  }

  const direction = value < 0 ? "down" : "up";
  const isFavorable = tone === "expense" ? value <= 0 : value >= 0;

  return {
    color: isFavorable ? "#10b981" : "#f43f5e",
    direction,
    label: `${Math.abs(value).toFixed(1)}% vs prev`,
  };
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
  anchor: Date
) {
  if (range === "all") {
    return transactions;
  }

  const monthOffset = range === "month" ? 0 : range === "3m" ? 2 : 5;
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth() - monthOffset,
    1
  );
  const end = new Date(
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

function formatAnalyticsRange(range: AnalyticsRange, anchor: Date) {
  if (range === "all") {
    return "All transactions";
  }

  if (range === "month") {
    return formatMonthRange(anchor);
  }

  const anchorEnd = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + 1,
    0
  );

  return formatRollingRange(anchorEnd, range);
}

function formatRollingRange(date: Date, range: AnalyticsRange) {
  const monthOffset = range === "3m" ? 2 : 5;
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
    return `${Math.round(value / 100000)}L`;
  }

  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }

  return value.toFixed(0);
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

const styles = StyleSheet.create({
  analyticsCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  analyticsCategoryAmount: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
    minWidth: 60,
    textAlign: "right",
  },
  analyticsCategoryBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
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
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  analyticsCategoryList: {
    flex: 1,
    gap: 9,
    justifyContent: "center",
    minWidth: 0,
  },
  analyticsCategoryName: {
    color: "#0f172a",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 0,
  },
  analyticsCategoryPercent: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "900",
    minWidth: 32,
    textAlign: "right",
  },
  analyticsCategoryRow: {
    alignItems: "center",
    borderBottomColor: premiumTheme.colors.divider,
    borderBottomWidth: premiumHairline,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingVertical: 6,
  },
  analyticsChartCard: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    gap: 12,
    overflow: "hidden",
    padding: 14,
    ...premiumTheme.shadow.floating,
  },
  analyticsContainer: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 14,
    padding: 20,
    paddingBottom: 28,
  },
  analyticsDatePill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: premiumTheme.colors.border,
    borderRadius: premiumTheme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 10,
    ...premiumTheme.shadow.soft,
  },
  analyticsDateText: {
    color: "#0f172a",
    flexShrink: 1,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  analyticsHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    zIndex: 30,
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
    left: 0,
    minWidth: 176,
    paddingVertical: 6,
    position: "absolute",
    top: 50,
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
    flex: 1,
    zIndex: 30,
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
    padding: 8,
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
  analyticsLineChart: {
    marginLeft: -18,
    marginTop: 2,
  },
  analyticsLineChartWrap: {
    marginBottom: -4,
    marginLeft: -4,
    overflow: "hidden",
  },
  analyticsMetricCard: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flex: 1,
    gap: 7,
    minHeight: 102,
    minWidth: 0,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },
  analyticsMetricHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  analyticsMetricIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  analyticsMetricLabel: {
    color: "#64748b",
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    minWidth: 0,
  },
  analyticsMetricRow: {
    flexDirection: "row",
    gap: 10,
  },
  analyticsMetricValue: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  analyticsRangeButton: {
    alignItems: "center",
    borderRadius: premiumTheme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
  },
  analyticsRangeButtonActive: {
    backgroundColor: premiumTheme.colors.ink,
  },
  analyticsRangeSelector: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    flex: 1.15,
    flexDirection: "row",
    gap: 2,
    padding: 4,
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
  analyticsTrendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    minWidth: 0,
  },
  analyticsTrendText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "900",
    minWidth: 0,
  },
});
