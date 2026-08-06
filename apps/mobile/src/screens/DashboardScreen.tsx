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
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Svg, { Path } from "react-native-svg";

import appMark from "../../assets/icon.png";

import { SavingOverlay } from "../components/finance/SavingOverlay";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumSurface, premiumTheme } from "../theme/premiumTheme";
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

const pressedControl = "active:opacity-[0.82] active:scale-[0.98]";

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
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  // Offline-first: with a warm cache the dashboard renders instantly and
  // sync updates in the background. Only a fresh install/login has nothing
  // to show, so that's the only time a loading state appears. Keyed on
  // "no sync completed yet" rather than `syncing` so the overlay covers
  // the frames before the first sync kicks off — gating on `syncing`
  // flashed the empty dashboard first. A failed first sync drops the
  // overlay via syncError so it can't get stuck.
  const isFirstLoad =
    transactions.length === 0 &&
    accounts.length === 0 &&
    lastSyncedAt === null &&
    syncError === null;

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
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView
        contentContainerClassName="px-5 pb-6"
        contentContainerStyle={{
          paddingTop: androidStatusBarHeight + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Image className="h-[38px] w-[38px] rounded-[11px]" source={appMark} />
            <Text className="text-[20px] font-extrabold tracking-[-0.5px] text-ink">
              FinAce
            </Text>
          </View>

          <View className="flex-row gap-2.5">
            <Pressable
              className={`min-h-[38px] flex-row items-center justify-center gap-1.5 rounded-full bg-ink px-[15px] ${pressedControl}`}
              onPress={() => setQuickAddVisible(true)}
              style={premiumTheme.shadow.soft}
            >
              <Plus color="#ffffff" size={17} strokeWidth={2.6} />
              <Text className="text-[13px] font-bold text-white">Add</Text>
            </Pressable>

            <Pressable
              className={`h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-canvas ${pressedControl}`}
              onPress={() => navigation.navigate("Settings")}
            >
              <Settings
                color={premiumTheme.colors.ink}
                size={19}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>

        {(offlineError || syncError) && (
          <View className="mb-4 rounded-[18px] bg-danger-soft p-3.5">
            <Text className="text-[13px] font-bold text-danger">
              {offlineError ?? syncError}
            </Text>
          </View>
        )}

        {!isFirstLoad && (
          <>
          <View
            className="z-10 rounded-surface border border-border bg-white px-[18px] pb-1.5 pt-3.5"
            style={premiumTheme.shadow.soft}
          >
            <View className="z-20 flex-row items-center justify-between">
              <Text className="text-[10px] font-bold uppercase tracking-[1.1px] text-secondary">
                Total spend
              </Text>
              <MonthSelect
                onSelect={setMonthOffset}
                options={monthOptions}
                selectedOffset={monthOffset}
              />
            </View>

            <Text
              adjustsFontSizeToFit
              className="mt-2 text-[30px] font-extrabold tracking-[-0.8px] text-ink tabular-nums"
              minimumFontScale={0.72}
              numberOfLines={1}
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

          <View className="mt-3.5 flex-row gap-3">
            <SummaryCard
              deltaGoodWhenUp
              deltaPercent={incomeDeltaPercent}
              Icon={ArrowUpRight}
              label="Income"
              value={monthlySpend.currentIncomeTotal}
            />
            <SummaryCard
              deltaGoodWhenUp={false}
              deltaPercent={spendDeltaPercent}
              Icon={ArrowDownRight}
              label="Expense"
              value={monthlySpend.currentExpenseTotal}
            />
          </View>

          <View className="mb-3.5 mt-[34px] flex-row items-center justify-between">
            <Text className="text-[19px] font-extrabold tracking-[-0.4px] text-ink">
              Accounts
            </Text>
            {financialOverview.accounts.length > 4 && (
              <Pressable
                className="rounded-full border border-border bg-white px-[13px] py-[7px]"
                onPress={() => navigation.navigate("FinancialIntelligence")}
              >
                <Text className="text-[12px] font-semibold text-secondary">
                  View all
                </Text>
              </Pressable>
            )}
          </View>

          <View
            className="rounded-section border border-border bg-white"
            style={premiumTheme.shadow.soft}
          >
            <View className="overflow-hidden rounded-section">
            {accountPreview.length === 0 ? (
              <View className="p-5">
                <Text className="text-[16px] font-bold text-ink">
                  No accounts yet
                </Text>
                <Text className="mt-1.5 text-[14px] leading-5 text-secondary">
                  Add cash, bank accounts, cards, or wallets to see balances here.
                </Text>
                <Pressable
                  className="mt-4 min-h-[42px] flex-row items-center gap-2 self-start rounded-full bg-ink px-4"
                  onPress={openAddAccount}
                >
                  <Plus color="#ffffff" size={18} strokeWidth={2.5} />
                  <Text className="text-[14px] font-bold text-white">
                    Add account
                  </Text>
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
          </>
        )}
      </ScrollView>

      <QuickAddMenu
        onAddAccount={openAddAccount}
        onAddBudget={openAddBudget}
        onAddTransaction={openAddTransaction}
        onClose={() => setQuickAddVisible(false)}
        visible={quickAddVisible}
      />

      <SavingOverlay
        subtitle="Syncing your accounts and transactions"
        title="Fetching your data"
        visible={isFirstLoad}
      />
    </SafeAreaView>
  );
}

interface MonthOption {
  label: string;
  offset: number;
}

// Animated.View is not NativeWind-interop'd, so the dropdown keeps a plain
// style object.
const monthMenuStyle = {
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
} as const;

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
    <View className="z-20">
      {open && (
        <Pressable
          className="absolute -bottom-[1000px] -left-[1000px] -right-[1000px] -top-[1000px] z-[25]"
          onPress={() => closeMenu()}
        />
      )}
      <Pressable
        className={`flex-row items-center gap-1 rounded-full border border-border bg-white px-2.5 py-[5px] ${pressedControl}`}
        onPress={() => (open ? closeMenu() : openMenu())}
      >
        <Text className="text-[11px] font-semibold text-secondary">
          {selected.label}
        </Text>
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
            monthMenuStyle,
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
                className="min-h-9 flex-row items-center justify-between px-3.5 active:bg-field"
                key={option.offset}
                onPress={() => closeMenu(option.offset)}
              >
                <Text
                  className={`text-[12px] ${
                    active
                      ? "font-bold text-ink"
                      : "font-semibold text-secondary"
                  }`}
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

function DeltaChip({
  goodWhenUp,
  percent,
}: {
  goodWhenUp: boolean;
  percent: number;
}) {
  const Icon = percent > 0 ? ArrowUp : percent < 0 ? ArrowDown : Minus;
  // Direction is only meaningful relative to the metric: rising income is
  // good, rising spend is not.
  const favourable = percent > 0 ? goodWhenUp : !goodWhenUp;
  const color =
    percent === 0
      ? premiumTheme.colors.ink
      : favourable
        ? premiumTheme.colors.success
        : premiumTheme.colors.danger;

  return (
    <View className="mt-[11px] flex-row items-center gap-1 self-start rounded-full bg-field px-[9px] py-1">
      <Icon color={color} size={11} strokeWidth={2.6} />
      <Text className="text-[11px] font-bold tabular-nums" style={{ color }}>
        {Math.abs(percent)}%
      </Text>
      <Text className="text-[11px] font-medium text-secondary">
        vs last month
      </Text>
    </View>
  );
}

// Horizontal inset chart-kit reserves for y-axis labels (style.paddingRight
// default). Dot x positions follow paddingRight + i * (width - paddingRight)
// / count, which the scrub gesture inverts to find the nearest day.
const CHART_PLOT_LEFT = 64;
// Offset from the touch wrapper's left edge to the svg's left edge: the
// wrapper centers a chart 8px narrower than itself (+4) and the canvas
// shifts the svg left by 10, so the svg starts 6px left of the wrapper.
const CHART_CANVAS_SHIFT = 6;

// LineChart is a third-party component; its style prop stays a plain object.
const chartCanvasStyle = {
  marginLeft: -10,
  paddingBottom: 10,
} as const;

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
    <View
      className="-mx-1.5 mt-1.5 h-[168px] items-center"
      {...panResponder.panHandlers}
    >
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
                className="absolute w-px bg-divider"
                style={{
                  height: Math.max(0, 116 - y),
                  left: x,
                  top: y + 6,
                }}
              />
              <View
                className="absolute h-[11px] w-[11px] rounded-md border-2 border-white bg-ink"
                style={{
                  left: x - 5.5,
                  top: y - 5.5,
                }}
              />
              <View
                className="absolute rounded-full bg-ink px-[9px] py-[5px]"
                style={{
                  left: clampedLeft,
                  top: Math.max(2, y - 36),
                }}
              >
                <Text className="text-[11px] font-bold text-white tabular-nums">
                  {tooltipText}
                </Text>
              </View>
            </View>
          );
        }}
        segments={3}
        style={chartCanvasStyle}
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

// Svg is a third-party component; positioning stays a plain style object.
const summaryWaveStyle = {
  bottom: -1,
  position: "absolute",
  right: -1,
} as const;

function SummaryCornerWave() {
  return (
    <View
      className="absolute inset-0 overflow-hidden rounded-[18px]"
      pointerEvents="none"
    >
      <Svg
        height={46}
        style={summaryWaveStyle}
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
  deltaGoodWhenUp,
  deltaPercent,
  Icon,
  label,
  value,
}: {
  deltaGoodWhenUp: boolean;
  deltaPercent: number;
  Icon: DashboardIcon;
  label: string;
  value: number;
}) {
  return (
    <View
      className="min-h-[96px] flex-1 rounded-[18px] border border-border bg-white p-3.5"
      style={premiumTheme.shadow.soft}
    >
      <SummaryCornerWave />
      <View className="flex-row items-center gap-2">
        <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-field">
          <Icon
            color={premiumTheme.colors.ink}
            size={13}
            strokeWidth={2.4}
          />
        </View>
        <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-secondary">
          {label}
        </Text>
      </View>
      <Text
        adjustsFontSizeToFit
        className="mt-2.5 text-[19px] font-extrabold tracking-[-0.3px] text-ink tabular-nums"
        minimumFontScale={0.72}
        numberOfLines={1}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <DeltaChip goodWhenUp={deltaGoodWhenUp} percent={deltaPercent} />
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
      <Pressable
        className="flex-1 justify-end bg-ink/[0.28]"
        onPress={onClose}
      >
        <Pressable className="rounded-t-modal bg-canvas px-[22px] pb-7 pt-[22px]">
          <View className="mb-[18px] flex-row items-start justify-between gap-4">
            <View>
              <Text className="text-[23px] font-extrabold tracking-[-0.4px] text-ink">
                Add new
              </Text>
              <Text className="mt-1 text-[14px] leading-5 text-[#7b818c]">
                Choose what you want to record.
              </Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-[18px] bg-[#f1f5f9]"
              onPress={onClose}
            >
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
    <Pressable
      className="min-h-[70px] flex-row items-center gap-3.5 border-t-hairline border-t-[#eef1f5] py-3"
      onPress={onPress}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-[18px]"
        style={{ backgroundColor: iconBackground }}
      >
        <Icon color={iconColor} size={22} strokeWidth={2.4} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[16px] font-bold text-ink">{label}</Text>
        <Text className="mt-[3px] text-[13px] leading-[18px] text-[#7b818c]">
          {description}
        </Text>
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
      className={`min-h-[74px] flex-row items-center gap-3.5 px-4 active:bg-field ${
        showDivider ? "border-b-hairline border-b-divider" : ""
      }`}
      onPress={onPress}
    >
      <View
        className="h-[46px] w-[46px] items-center justify-center rounded-control"
        style={{ backgroundColor: icon.background }}
      >
        <Icon color={icon.color} size={22} strokeWidth={2.4} />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-[3px] text-[12px] font-medium text-secondary">
          {getAccountSubtitle(type)}
        </Text>
      </View>

      <Text
        adjustsFontSizeToFit
        className="ml-2 text-[15px] font-extrabold text-ink tabular-nums"
        minimumFontScale={0.76}
        numberOfLines={1}
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
