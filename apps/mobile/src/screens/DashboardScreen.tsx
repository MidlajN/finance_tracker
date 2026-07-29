import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Landmark,
  Minus,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Wallet,
  X,
} from "lucide-react-native";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Svg, { Path } from "react-native-svg";

import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import {
  premiumHairline,
  premiumSurface,
  premiumTheme,
} from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";

type DashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Dashboard"
>;

interface SpendPoint {
  day: number;
  label: string;
  value: number;
}

type DashboardIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const { width } = useWindowDimensions();
  const androidStatusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const accounts = useOfflineStore((state) => state.accounts);
  const assets = useOfflineStore((state) => state.assets);
  const exchangeRates = useOfflineStore((state) => state.exchangeRates);
  const goals = useOfflineStore((state) => state.goals);
  const investments = useOfflineStore((state) => state.investments);
  const liabilities = useOfflineStore((state) => state.liabilities);
  const loans = useOfflineStore((state) => state.loans);
  const transactions = useOfflineStore((state) => state.transactions);
  const offlineError = useOfflineStore((state) => state.error);
  const refreshOfflineData = useOfflineStore((state) => state.refresh);
  const syncError = useSyncStore((state) => state.error);

  const financialOverview = useMemo(
    () =>
      MobileDashboardService.getFinancialIntelligenceOverview({
        accounts,
        assets,
        baseCurrency: "INR",
        exchangeRates,
        goals,
        investments,
        liabilities,
        loans,
        transactions,
      }),
    [
      accounts,
      assets,
      exchangeRates,
      goals,
      investments,
      liabilities,
      loans,
      transactions,
    ]
  );
  const [monthOffset, setMonthOffset] = useState(0);
  const monthOptions = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1
      );
      const label =
        offset === 0
          ? "This month"
          : date.toLocaleDateString("en-IN", {
              month: "short",
              ...(date.getFullYear() !== now.getFullYear() && {
                year: "numeric",
              }),
            });

      return { label, offset };
    });
  }, []);
  const monthlySpend = useMemo(() => {
    const now = new Date();
    const reference =
      monthOffset === 0
        ? now
        : new Date(
            now.getFullYear(),
            now.getMonth() - monthOffset + 1,
            0
          );

    return MobileDashboardService.getMonthlySpendSummary(
      transactions,
      reference
    );
  }, [monthOffset, transactions]);
  const spendDeltaPercent = MobileDashboardService.getMonthDeltaPercent(
    monthlySpend.currentExpenseTotal,
    monthlySpend.previousExpenseTotal
  );
  const incomeDeltaPercent = MobileDashboardService.getMonthDeltaPercent(
    monthlySpend.currentIncomeTotal,
    monthlySpend.previousIncomeTotal
  );
  const accountPreview = financialOverview.accounts.slice(0, 4);
  const chartWidth = Math.max(260, width - 72);

  useEffect(() => {
    void refreshOfflineData();
  }, [refreshOfflineData]);

  function openAddAccount() {
    setQuickAddVisible(false);
    navigation.navigate("FinancialIntelligence", {
      formIntentId: Date.now(),
      initialResource: "account",
    });
  }

  function openAddTransaction() {
    setQuickAddVisible(false);
    navigation.navigate("Events");
  }

  function openAddBudget() {
    setQuickAddVisible(false);
    navigation.navigate("Budgets");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: androidStatusBarHeight + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.title}>Finance</Text>

          <View style={styles.topActions}>
            <Pressable
              onPress={() => setQuickAddVisible(true)}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressedControl,
              ]}
            >
              <Plus color="#ffffff" size={17} strokeWidth={2.6} />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={({ pressed }) => [
                styles.settingsButton,
                pressed && styles.pressedControl,
              ]}
            >
              <Settings
                color={premiumTheme.colors.ink}
                size={19}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.dashboardIntro}>
          <Text style={styles.dashboardIntroTitle}>Monthly overview</Text>
          <Text style={styles.dashboardIntroText}>
            Spending, income, and account balances at a glance.
          </Text>
        </View>

        {(offlineError || syncError) && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{offlineError ?? syncError}</Text>
          </View>
        )}

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Total spend</Text>
            <MonthSelect
              onSelect={setMonthOffset}
              options={monthOptions}
              selectedOffset={monthOffset}
            />
          </View>

          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={styles.heroAmount}
          >
            {MobileDashboardService.getFormattedBalance(
              monthlySpend.currentExpenseTotal
            )}
          </Text>

          <MonthlySpendChart
            points={monthlySpend.points}
            width={chartWidth}
          />
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            deltaPercent={incomeDeltaPercent}
            Icon={ArrowUpRight}
            label="Income"
            value={monthlySpend.currentIncomeTotal}
          />
          <SummaryCard
            deltaPercent={spendDeltaPercent}
            Icon={ArrowDownRight}
            label="Expense"
            value={monthlySpend.currentExpenseTotal}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          {financialOverview.accounts.length > 4 && (
            <Pressable
              onPress={() => navigation.navigate("FinancialIntelligence")}
              style={styles.viewAllPill}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.accountsCard}>
          <View style={styles.accountsCardInner}>
          {accountPreview.length === 0 ? (
            <View style={styles.emptyAccountRow}>
              <Text style={styles.emptyAccountTitle}>No accounts yet</Text>
              <Text style={styles.emptyAccountText}>
                Add cash, bank accounts, cards, or wallets to see balances here.
              </Text>
              <Pressable
                onPress={openAddAccount}
                style={styles.emptyAccountButton}
              >
                <Plus color="#ffffff" size={18} strokeWidth={2.5} />
                <Text style={styles.emptyAccountButtonText}>Add account</Text>
              </Pressable>
            </View>
          ) : (
            accountPreview.map((accountBalance, index) => (
              <AccountRow
                key={accountBalance.account.id ?? accountBalance.account.name}
                balance={accountBalance.currentBalance}
                name={accountBalance.account.name}
                onPress={() => navigation.navigate("FinancialIntelligence")}
                type={accountBalance.account.account_type}
                showDivider={index < accountPreview.length - 1}
              />
            ))
          )}
          </View>
        </View>
      </ScrollView>

      <QuickAddMenu
        onAddAccount={openAddAccount}
        onAddBudget={openAddBudget}
        onAddTransaction={openAddTransaction}
        onClose={() => setQuickAddVisible(false)}
        visible={quickAddVisible}
      />
    </SafeAreaView>
  );
}

interface MonthOption {
  label: string;
  offset: number;
}

function MonthSelect({
  onSelect,
  options,
  selectedOffset,
}: {
  onSelect: (offset: number) => void;
  options: MonthOption[];
  selectedOffset: number;
}) {
  const [open, setOpen] = useState(false);
  const progress = useMemo(() => new Animated.Value(0), []);
  const animation = useMemo(
    () => ({
      rotate: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
      }),
      scale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
      }),
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-6, 0],
      }),
    }),
    [progress]
  );
  const selected =
    options.find((option) => option.offset === selectedOffset) ??
    options[0];

  function openMenu() {
    setOpen(true);
    Animated.spring(progress, {
      friction: 9,
      tension: 120,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }

  function closeMenu(offset?: number) {
    Animated.timing(progress, {
      duration: 120,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setOpen(false);

      if (offset !== undefined) {
        onSelect(offset);
      }
    });
  }

  return (
    <View style={styles.monthSelectWrap}>
      {open && (
        <Pressable
          onPress={() => closeMenu()}
          style={styles.monthBackdrop}
        />
      )}
      <Pressable
        onPress={() => (open ? closeMenu() : openMenu())}
        style={({ pressed }) => [
          styles.heroPeriodPill,
          pressed && styles.pressedControl,
        ]}
      >
        <Text style={styles.heroPeriodText}>{selected.label}</Text>
        <Animated.View
          style={{
            transform: [
              {
                rotate: animation.rotate,
              },
            ],
          }}
        >
          <ChevronDown
            color={premiumTheme.colors.secondary}
            size={13}
            strokeWidth={2.4}
          />
        </Animated.View>
      </Pressable>

      {open && (
        <Animated.View
          style={[
            styles.monthMenu,
            {
              opacity: progress,
              transform: [
                {
                  translateY: animation.translateY,
                },
                {
                  scale: animation.scale,
                },
              ],
            },
          ]}
        >
          {options.map((option) => {
            const active = option.offset === selectedOffset;

            return (
              <Pressable
                key={option.offset}
                onPress={() => closeMenu(option.offset)}
                style={({ pressed }) => [
                  styles.monthOption,
                  pressed && styles.monthOptionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.monthOptionText,
                    active && styles.monthOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {active && (
                  <Check
                    color={premiumTheme.colors.ink}
                    size={14}
                    strokeWidth={2.6}
                  />
                )}
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

function DeltaChip({ percent }: { percent: number }) {
  const Icon = percent > 0 ? ArrowUp : percent < 0 ? ArrowDown : Minus;

  return (
    <View style={styles.deltaChip}>
      <Icon
        color={premiumTheme.colors.ink}
        size={11}
        strokeWidth={2.6}
      />
      <Text style={styles.deltaPercentText}>
        {Math.abs(percent)}%
      </Text>
      <Text style={styles.deltaCaptionText}>vs last month</Text>
    </View>
  );
}

// Horizontal inset chart-kit reserves for y-axis labels (style.paddingRight
// default). Dot x positions follow paddingRight + i * (width - paddingRight)
// / count, which the scrub gesture inverts to find the nearest day.
const CHART_PLOT_LEFT = 64;
// Offset from the touch wrapper's left edge to the svg's left edge: the
// wrapper centers a chart 8px narrower than itself (+4) and chartCanvas
// shifts the svg left by 10, so the svg starts 6px left of the wrapper.
const CHART_CANVAS_SHIFT = 6;

function MonthlySpendChart({
  points,
  width,
}: {
  points: SpendPoint[];
  width: number;
}) {
  const values = points.map((point) => point.value);
  const lastIndex = values.length - 1;
  const hasSpend = values.some((value) => value > 0);
  const monthName =
    points
      .find((point) => point.label !== "")
      ?.label.split(" ")[1] ?? "";
  // null follows the newest point; scrubbing pins an explicit day.
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const selectedIndex =
    scrubIndex === null ? lastIndex : Math.min(scrubIndex, lastIndex);

  const panResponder = useMemo(() => {
    const count = Math.max(values.length, 1);

    function indexFromTouch(locationX: number) {
      const svgX = locationX + CHART_CANVAS_SHIFT;
      const step = (width - CHART_PLOT_LEFT) / count;
      const index = Math.round((svgX - CHART_PLOT_LEFT) / step);

      return Math.min(Math.max(index, 0), count - 1);
    }

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: (event) => {
        setScrubIndex(indexFromTouch(event.nativeEvent.locationX));
      },
      onPanResponderMove: (event) => {
        setScrubIndex(indexFromTouch(event.nativeEvent.locationX));
      },
      onPanResponderTerminationRequest: () => true,
      onStartShouldSetPanResponder: () => true,
    });
  }, [values.length, width]);

  return (
    <View style={styles.chart} {...panResponder.panHandlers}>
      <LineChart
        bezier
        data={{
          labels: points.map((point) => point.label),
          datasets: [
            {
              color: () => premiumTheme.colors.ink,
              data: values,
              strokeWidth: 2,
            },
          ],
        }}
        formatYLabel={(value) => formatCompact(Number(value))}
        fromZero
        height={150}
        xLabelsOffset={-4}
        renderDotContent={({ x, y, index }) => {
          if (index !== selectedIndex || !hasSpend) {
            return null;
          }

          const point = points[index];
          const tooltipText =
            point && point.day > 0
              ? `${point.day} ${monthName} · ${MobileDashboardService.getFormattedBalance(point.value)}`
              : MobileDashboardService.getFormattedBalance(
                  values[index] ?? 0
                );
          const clampedLeft = Math.min(
            Math.max(6, x - 56),
            width - 132
          );

          return (
            <View key={`marker-${index}`} pointerEvents="none">
              <View
                style={[
                  styles.chartMarkerLine,
                  {
                    height: Math.max(0, 116 - y),
                    left: x,
                    top: y + 6,
                  },
                ]}
              />
              <View
                style={[
                  styles.chartMarkerDot,
                  {
                    left: x - 5.5,
                    top: y - 5.5,
                  },
                ]}
              />
              <View
                style={[
                  styles.chartTooltip,
                  {
                    left: clampedLeft,
                    top: Math.max(2, y - 36),
                  },
                ]}
              >
                <Text style={styles.chartTooltipText}>{tooltipText}</Text>
              </View>
            </View>
          );
        }}
        segments={3}
        style={styles.chartCanvas}
        width={width}
        withDots
        withInnerLines
        withOuterLines={false}
        withShadow
        withVerticalLines={false}
        chartConfig={{
          backgroundGradientFrom: "#ffffff",
          backgroundGradientFromOpacity: 0,
          backgroundGradientTo: "#ffffff",
          backgroundGradientToOpacity: 0,
          color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
          decimalPlaces: 0,
          fillShadowGradientFrom: premiumTheme.colors.ink,
          fillShadowGradientFromOpacity: 0.07,
          fillShadowGradientTo: premiumTheme.colors.ink,
          fillShadowGradientToOpacity: 0,
          labelColor: () => premiumTheme.colors.muted,
          propsForBackgroundLines: {
            stroke: premiumTheme.colors.divider,
            strokeDasharray: "3 6",
          },
          propsForDots: {
            r: "0",
          },
          propsForLabels: {
            fontSize: 10,
          },
        }}
      />
    </View>
  );
}

function formatCompact(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return value.toFixed(0);
}

function SummaryCornerWave() {
  return (
    <View pointerEvents="none" style={styles.summaryCardBackdrop}>
      <Svg
        height={46}
        style={styles.summaryWave}
        viewBox="0 0 104 48"
        width={104}
      >
        <Path
          d="M0 48 C14 44 22 26 38 30 C52 33 58 14 74 20 C86 24 94 10 104 12 L104 48 Z"
          fill={premiumTheme.colors.field}
        />
        <Path
          d="M0 46 C14 42 22 24 38 28 C52 31 58 12 74 18 C86 22 94 8 104 10"
          fill="none"
          stroke={premiumTheme.colors.divider}
          strokeWidth={1.4}
        />
      </Svg>
    </View>
  );
}

function SummaryCard({
  deltaPercent,
  Icon,
  label,
  value,
}: {
  deltaPercent: number;
  Icon: DashboardIcon;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <SummaryCornerWave />
      <View style={styles.summaryCardHeader}>
        <View style={styles.summaryIcon}>
          <Icon
            color={premiumTheme.colors.ink}
            size={13}
            strokeWidth={2.4}
          />
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.summaryValue}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <DeltaChip percent={deltaPercent} />
    </View>
  );
}

function QuickAddMenu({
  onAddAccount,
  onAddBudget,
  onAddTransaction,
  onClose,
  visible,
}: {
  onAddAccount: () => void;
  onAddBudget: () => void;
  onAddTransaction: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.quickAddBackdrop}>
        <Pressable style={styles.quickAddPanel}>
          <View style={styles.quickAddHeader}>
            <View>
              <Text style={styles.quickAddTitle}>Add new</Text>
              <Text style={styles.quickAddSubtitle}>
                Choose what you want to record.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.quickAddCloseButton}>
              <X color="#0f172a" size={20} strokeWidth={2.4} />
            </Pressable>
          </View>

          <QuickAddOption
            Icon={ReceiptText}
            description="Record a cash, UPI, card, or income entry manually."
            iconBackground={premiumTheme.colors.field}
            iconColor={premiumTheme.colors.ink}
            label="Add transaction"
            onPress={onAddTransaction}
          />
          <QuickAddOption
            Icon={Landmark}
            description="Add cash, a bank account, credit card, or wallet balance."
            iconBackground={premiumTheme.colors.field}
            iconColor={premiumTheme.colors.ink}
            label="Add account"
            onPress={onAddAccount}
          />
          <QuickAddOption
            Icon={PiggyBank}
            description="Open budgets to review or manage spending limits."
            iconBackground={premiumTheme.colors.field}
            iconColor={premiumTheme.colors.ink}
            label="Add budget"
            onPress={onAddBudget}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function QuickAddOption({
  description,
  Icon,
  iconBackground,
  iconColor,
  label,
  onPress,
}: {
  description: string;
  Icon: DashboardIcon;
  iconBackground: string;
  iconColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickAddOption}>
      <View
        style={[
          styles.quickAddOptionIcon,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Icon color={iconColor} size={22} strokeWidth={2.4} />
      </View>
      <View style={styles.quickAddOptionText}>
        <Text style={styles.quickAddOptionLabel}>{label}</Text>
        <Text style={styles.quickAddOptionDescription}>{description}</Text>
      </View>
      <ChevronRight color="#a3a8b0" size={20} strokeWidth={2.2} />
    </Pressable>
  );
}

function AccountRow({
  balance,
  name,
  onPress,
  showDivider,
  type,
}: {
  balance: number;
  name: string;
  onPress: () => void;
  showDivider: boolean;
  type: string;
}) {
  const icon = getAccountIcon(type);
  const Icon = icon.Icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountRow,
        showDivider && styles.accountDivider,
        pressed && styles.accountRowPressed,
      ]}
    >
      <View style={[styles.accountIcon, { backgroundColor: icon.background }]}>
        <Icon color={icon.color} size={22} strokeWidth={2.4} />
      </View>

      <View style={styles.accountDetails}>
        <Text numberOfLines={1} style={styles.accountName}>
          {name}
        </Text>
        <Text style={styles.accountMeta}>{getAccountSubtitle(type)}</Text>
      </View>

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.76}
        numberOfLines={1}
        style={styles.accountBalance}
      >
        {MobileDashboardService.getFormattedBalance(balance)}
      </Text>
      <ChevronRight color="#a3a8b0" size={22} strokeWidth={2.2} />
    </Pressable>
  );
}

function getAccountIcon(type: string) {
  const background = premiumTheme.colors.field;
  const color = premiumTheme.colors.ink;

  if (type === "cash") {
    return { background, color, Icon: Banknote };
  }

  if (type === "credit_card") {
    return { background, color, Icon: CreditCard };
  }

  if (type === "digital_wallet") {
    return { background, color, Icon: Wallet };
  }

  if (type === "investment") {
    return { background, color, Icon: BriefcaseBusiness };
  }

  return { background, color, Icon: Landmark };
}

function getAccountSubtitle(type: string) {
  if (type === "credit_card") {
    return "Credit line";
  }

  if (type === "cash") {
    return "Wallet";
  }

  if (type === "investment") {
    return "Investments";
  }

  if (type === "digital_wallet") {
    return "Digital wallet";
  }

  return "Bank account";
}

const styles = StyleSheet.create({
  accountBalance: {
    color: premiumTheme.colors.ink,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    marginLeft: 8,
  },
  accountDetails: {
    flex: 1,
    minWidth: 0,
  },
  accountDivider: {
    borderBottomColor: premiumTheme.colors.divider,
    borderBottomWidth: premiumHairline,
  },
  accountIcon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  accountMeta: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
  accountName: {
    color: premiumTheme.colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  accountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    minHeight: 74,
    paddingHorizontal: 16,
  },
  accountRowPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  accountsCard: {
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.section,
    ...premiumSurface,
    ...premiumTheme.shadow.soft,
  },
  accountsCardInner: {
    borderRadius: premiumTheme.radius.section,
    overflow: "hidden",
  },
  addButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: premiumTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 15,
    ...premiumTheme.shadow.soft,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  chart: {
    alignItems: "center",
    height: 168,
    marginHorizontal: -6,
    marginTop: 6,
  },
  chartCanvas: {
    marginLeft: -10,
    paddingBottom: 10,
  },
  chartMarkerDot: {
    backgroundColor: premiumTheme.colors.ink,
    borderColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 2,
    height: 11,
    position: "absolute",
    width: 11,
  },
  chartMarkerLine: {
    backgroundColor: premiumTheme.colors.divider,
    position: "absolute",
    width: 1,
  },
  chartTooltip: {
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: premiumTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: "absolute",
  },
  chartTooltipText: {
    color: "#ffffff",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  emptyAccountRow: {
    padding: 20,
  },
  emptyAccountButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: premiumTheme.colors.ink,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    minHeight: 42,
    paddingHorizontal: 16,
  },
  emptyAccountButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyAccountText: {
    color: premiumTheme.colors.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  emptyAccountTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  errorCard: {
    backgroundColor: premiumTheme.colors.dangerSoft,
    borderRadius: 18,
    marginBottom: 16,
    padding: 14,
  },
  errorText: {
    color: premiumTheme.colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  dashboardIntro: {
    marginBottom: 28,
    marginTop: 24,
  },
  dashboardIntroText: {
    color: premiumTheme.colors.secondary,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: 5,
  },
  dashboardIntroTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  heroAmount: {
    color: premiumTheme.colors.ink,
    fontSize: 30,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 8,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.surface,
    paddingBottom: 6,
    paddingHorizontal: 18,
    paddingTop: 14,
    zIndex: 10,
    ...premiumSurface,
    ...premiumTheme.shadow.soft,
  },
  deltaChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    flexDirection: "row",
    gap: 4,
    marginTop: 11,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  deltaCaptionText: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "500",
  },
  deltaPercentText: {
    color: premiumTheme.colors.ink,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 20,
  },
  monthBackdrop: {
    bottom: -1000,
    left: -1000,
    position: "absolute",
    right: -1000,
    top: -1000,
    zIndex: 25,
  },
  monthMenu: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    minWidth: 150,
    paddingVertical: 6,
    position: "absolute",
    right: 0,
    top: 34,
    zIndex: 30,
    ...premiumSurface,
    ...premiumTheme.shadow.soft,
  },
  monthOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 14,
  },
  monthOptionPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  monthOptionText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  monthOptionTextActive: {
    color: premiumTheme.colors.ink,
    fontWeight: "700",
  },
  monthSelectWrap: {
    zIndex: 20,
  },
  heroLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroPeriodPill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...premiumSurface,
  },
  heroPeriodText: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  quickAddBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
  },
  quickAddCloseButton: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  quickAddHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    marginBottom: 18,
  },
  quickAddOption: {
    alignItems: "center",
    borderTopColor: "#eef1f5",
    borderTopWidth: premiumHairline,
    flexDirection: "row",
    gap: 14,
    minHeight: 70,
    paddingVertical: 12,
  },
  quickAddOptionDescription: {
    color: "#7b818c",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  quickAddOptionIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  quickAddOptionLabel: {
    color: premiumTheme.colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  quickAddOptionText: {
    flex: 1,
    minWidth: 0,
  },
  quickAddPanel: {
    backgroundColor: premiumTheme.colors.canvas,
    borderTopLeftRadius: premiumTheme.radius.modal,
    borderTopRightRadius: premiumTheme.radius.modal,
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  quickAddSubtitle: {
    color: "#7b818c",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  quickAddTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  safeArea: {
    backgroundColor: premiumTheme.colors.canvas,
    flex: 1,
  },
  pressedControl: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 34,
  },
  sectionTitle: {
    color: premiumTheme.colors.ink,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.canvas,
    borderRadius: premiumTheme.radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
    ...premiumSurface,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    flex: 1,
    minHeight: 96,
    padding: 14,
    ...premiumSurface,
    ...premiumTheme.shadow.soft,
  },
  summaryCardBackdrop: {
    borderRadius: 18,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  summaryCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.field,
    borderRadius: premiumTheme.radius.pill,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  summaryLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  summaryValue: {
    color: premiumTheme.colors.ink,
    fontSize: 19,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 10,
  },
  summaryWave: {
    bottom: -1,
    position: "absolute",
    right: -1,
  },
  title: {
    color: premiumTheme.colors.ink,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 34,
  },
  topActions: {
    flexDirection: "row",
    gap: 10,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  viewAllPill: {
    backgroundColor: "#ffffff",
    borderRadius: premiumTheme.radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
    ...premiumSurface,
  },
  viewAllText: {
    color: premiumTheme.colors.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
