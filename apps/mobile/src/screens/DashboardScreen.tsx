import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowDown,
  ArrowUp,
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
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { getAccountClass } from "@finance/finance-core";
import type { CachedTransaction } from "@finance/shared-types";

import appMark from "../../assets/icon.png";

import { SavingOverlay } from "../components/finance/SavingOverlay";
import { TransactionIcon } from "../components/finance/TransactionIcon";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumHairline, premiumSurface, premiumTheme } from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";
import {
  formatNeutralTransactionAmount,
  formatTransactionListTimestamp,
  getAccountBalanceDisplay,
  getSignedTransactionAmount,
  getTransactionMerchantDisplay,
  titleCase,
} from "../utils/financeFormat";

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
// Dashboard wash: fixed vertical gradient from dark slate-teal through
// misty sage to pale green (reference palette). The dark top inverts the
// header/hero to light text; the pale bottom lets the white sheet read
// as an elevated layer. Screen-local by design; other screens keep the
// plain canvas.
// Stops anchor to the logo's own background navy (#16212e sampled from
// icon.png) fading through steel blue to a pale blue-grey under the
// white sheet.
const WASH_STOPS = [
  { color: "#16212e", offset: 0 },
  { color: "#6d7f92", offset: 0.55 },
  { color: "#e2e8ef", offset: 1 },
] as const;

// Linear mix of two #rrggbb colors. Used to sample the wash gradient at
// an arbitrary height so the hero backdrop and corner wedges match the
// fixed background exactly.
function mixHexColors(from: string, to: string, ratio: number) {
  const f = parseInt(from.slice(1), 16);
  const t = parseInt(to.slice(1), 16);
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const channel = (shift: number) =>
    Math.round(
      ((f >> shift) & 255) * (1 - clamped) +
        ((t >> shift) & 255) * clamped
    );

  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0))
    .toString(16)
    .padStart(6, "0")}`;
}

// Piecewise-linear sample of the wash gradient at a 0..1 position.
function sampleWashColor(position: number) {
  const t = Math.min(Math.max(position, 0), 1);

  for (let index = 1; index < WASH_STOPS.length; index += 1) {
    const previous = WASH_STOPS[index - 1];
    const next = WASH_STOPS[index];

    if (t <= next.offset) {
      const span = next.offset - previous.offset;

      return mixHexColors(
        previous.color,
        next.color,
        span > 0 ? (t - previous.offset) / span : 0
      );
    }
  }

  return WASH_STOPS[WASH_STOPS.length - 1].color;
}

const washLayerStyle = {
  bottom: 0,
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
} as const;

// Animated views are not NativeWind-interop'd; plain styles for the
// scroll content and the pinned hero.
const scrollContentStyle = { flexGrow: 1 } as const;

// Manual sticky: RN's stickyHeaderIndices wraps the header in its own
// component, so a zIndex on the child never competes with later siblings
// and the chart card paints over the pinned hero on Android. Translating
// the hero by the scroll offset ourselves keeps it a plain sibling whose
// zIndex works, so content genuinely slides beneath it. No background
// here — the pinned backdrop is a gradient slice that fades in on scroll
// (a static bg would band against the fixed wash gradient at rest).
const heroPinBaseStyle = {
  zIndex: 20,
} as const;

// The trend card's fade is tied to how much of it has already slid under
// the pinned hero: solid until this fraction is hidden, gone by the end
// fraction. Fading any earlier leaves a large invisible-but-still-there
// card as blank space between the hero and the balances sheet.
const CHART_CARD_FADE_START_FRACTION = 0.45;
const CHART_CARD_FADE_END_FRACTION = 0.85;

// Corner radius of the fake rounded-top edge under the pinned hero —
// matches the balances sheet (rounded-t-modal, 28) so the sheet's own
// corners hand off seamlessly when they reach the hero.
const HERO_CORNER_RADIUS = 28;

// RN can't clip scrolling content against a sibling, so the rounded edge
// is faked: two wash-colored inverse-corner wedges hang just below the
// pinned hero and paint over whatever slides beneath, making it appear
// clipped with a top radius. Hidden at rest (faded in on scroll) so they
// never sit on top of the chart card's own corners.
const heroCornerMaskStyle = {
  flexDirection: "row",
  height: HERO_CORNER_RADIUS,
  justifyContent: "space-between",
  left: 0,
  position: "absolute",
  right: 0,
  top: "100%",
} as const;

const heroCornerMirrorStyle = {
  transform: [{ scaleX: -1 }],
} as const;

// The corner square minus its quarter-circle: M0,0 → across the top →
// arc back to the left edge, bulging toward the origin.
const heroCornerWedgePath = `M0 0H${HERO_CORNER_RADIUS}A${HERO_CORNER_RADIUS} ${HERO_CORNER_RADIUS} 0 0 0 0 ${HERO_CORNER_RADIUS}Z`;

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const { height: screenHeight, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  // Content-space geometry measured via onLayout so the pin point and the
  // card-fade trigger survive the error banner appearing above the hero.
  const [heroTop, setHeroTop] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const [chartCardTop, setChartCardTop] = useState(0);
  const [chartCardHeight, setChartCardHeight] = useState(0);
  const heroPinStyle = useMemo(
    () => ({
      transform: [
        {
          // 0 until the hero reaches the top, then exactly the scroll
          // offset beyond it — i.e. pinned (extrapolates linearly right,
          // clamps left).
          translateY: scrollY.interpolate({
            extrapolateLeft: "clamp",
            inputRange: [heroTop, heroTop + 1],
            outputRange: [0, 1],
          }),
        },
      ],
    }),
    [heroTop, scrollY]
  );
  // The card starts sliding under the pinned hero at scroll offset
  // (cardTop - heroHeight).
  const underHeroStart = Math.max(chartCardTop - heroHeight, 1);
  const chartCardFadeStyle = useMemo(() => {
    // Fall back to a plausible height until onLayout lands so the ranges
    // are never zero-width.
    const cardHeight = Math.max(chartCardHeight, 100);
    const fadeStart =
      underHeroStart + cardHeight * CHART_CARD_FADE_START_FRACTION;
    const fadeEnd =
      underHeroStart + cardHeight * CHART_CARD_FADE_END_FRACTION;

    return {
      opacity: scrollY.interpolate({
        extrapolate: "clamp",
        inputRange: [fadeStart, fadeEnd],
        outputRange: [1, 0],
      }),
      // Above the balances sheet so the month dropdown can overflow the
      // card, below the pinned hero (20).
      zIndex: 10,
    };
  }, [chartCardHeight, scrollY, underHeroStart]);
  const heroCornerFadeStyle = useMemo(
    () => ({
      opacity: scrollY.interpolate({
        extrapolate: "clamp",
        inputRange: [underHeroStart, underHeroStart + 40],
        outputRange: [0, 1],
      }),
    }),
    [scrollY, underHeroStart]
  );
  // The pinned hero sits BELOW the status-bar inset, so its backdrop
  // slice must continue the fixed wash from that screen position — not
  // restart at the gradient's top color, which banded visibly against
  // the status-bar strip above it. Sample both edges of the slice in
  // screen space; the corner wedges pick up the bottom edge.
  const heroTopColor = sampleWashColor(
    screenHeight > 0 ? insets.top / screenHeight : 0
  );
  const heroEdgeColor = sampleWashColor(
    screenHeight > 0 ? (insets.top + heroHeight) / screenHeight : 0
  );
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
  const accountPreview = financialOverview.accounts.slice(0, 4);
  // Asset money vs liability debt, engine-classed. An in-credit card
  // counts as your money; only true outstanding lands in "owed".
  const balanceSplit = useMemo(() => {
    let owed = 0;
    let owedAccounts = 0;
    let yourMoney = 0;
    let yourAccounts = 0;

    for (const entry of financialOverview.accounts) {
      if (
        getAccountClass(entry.account.account_type) === "liability" &&
        entry.currentBalance < 0
      ) {
        owed += -entry.currentBalance;
        owedAccounts += 1;
      } else {
        yourMoney += entry.currentBalance;
        yourAccounts += 1;
      }
    }

    return { owed, owedAccounts, yourAccounts, yourMoney };
  }, [financialOverview.accounts]);
  const recentTransactions = useMemo(
    () =>
      transactions
        .slice()
        .sort(
          (first, second) =>
            new Date(second.occurred_at).getTime() -
            new Date(first.occurred_at).getTime()
        )
        .slice(0, 4),
    [transactions]
  );

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
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: WASH_STOPS[WASH_STOPS.length - 1].color }}
    >
      {/* Fixed wash gradient behind everything; content scrolls over it. */}
      <View pointerEvents="none" style={washLayerStyle}>
        <Svg height="100%" width="100%">
          <Defs>
            <SvgLinearGradient id="dashWash" x1="0" x2="0" y1="0" y2="1">
              {WASH_STOPS.map((stop) => (
                <Stop
                  key={stop.offset}
                  offset={String(stop.offset)}
                  stopColor={stop.color}
                />
              ))}
            </SvgLinearGradient>
          </Defs>
          <Rect fill="url(#dashWash)" height="100%" width="100%" />
        </Svg>
      </View>

      <Animated.ScrollView
        contentContainerStyle={scrollContentStyle}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5">
          <View className="mb-6 flex-row items-center justify-between pt-1">
            <View className="flex-row items-center gap-2.5">
              <Image
                className="h-[38px] w-[38px] rounded-[11px]"
                source={appMark}
              />
              <Text className="text-[20px] font-extrabold tracking-[-0.5px] text-white">
                FinAce
              </Text>
            </View>

            <View className="flex-row gap-2.5">
              <Pressable
                className={`min-h-[38px] flex-row items-center justify-center gap-1.5 rounded-full border border-border/20 bg-white/30 px-[15px] shadow ${pressedControl}`}
                onPress={() => setQuickAddVisible(true)}
                style={premiumTheme.shadow.soft}
              >
                <Plus
                  color={premiumTheme.colors.canvas}
                  size={17}
                  strokeWidth={2.6}
                />
              </Pressable>

              <Pressable
                className={`h-[38px] w-[38px] items-center justify-center rounded-full border border-border/20 bg-white/30 ${pressedControl}`}
                onPress={() => navigation.navigate("Settings")}
              >
                <Settings
                  color={premiumTheme.colors.canvas}
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
        </View>

        {!isFirstLoad && (
          <Animated.View
            onLayout={(event) => {
              setHeroTop(event.nativeEvent.layout.y);
              setHeroHeight(event.nativeEvent.layout.height);
            }}
            style={[heroPinBaseStyle, heroPinStyle]}
          >
          {/* Pinned backdrop: gradient slice matching the fixed wash at
              the top of the screen. Fades in with the pin so it never
              bands against the background at rest. */}
          <Animated.View
            pointerEvents="none"
            style={[washLayerStyle, heroCornerFadeStyle]}
          >
            <Svg height="100%" width="100%">
              <Defs>
                <SvgLinearGradient
                  id="heroWash"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={heroTopColor} />
                  <Stop offset="1" stopColor={heroEdgeColor} />
                </SvgLinearGradient>
              </Defs>
              <Rect fill="url(#heroWash)" height="100%" width="100%" />
            </Svg>
          </Animated.View>
          <View className="px-5 pb-3">
            <Text className="text-[12px] font-bold uppercase tracking-[1.6px] text-white/80">
              Spending
            </Text>

            <Text
              adjustsFontSizeToFit
              className="text-[28px] font-bold text-white tabular-nums"
              minimumFontScale={0.7}
              numberOfLines={1}
            >
              {MobileDashboardService.getFormattedBalance(
                monthlySpend.currentExpenseTotal
              )}
            </Text>

            <View className="flex-row items-center gap-2.5">
              <FlowStat
                color="#4ade80"
                label="in"
                value={monthlySpend.currentIncomeTotal}
              />
              <View
                className="h-4 bg-white/25"
                style={{ width: premiumHairline }}
              />
              <DeltaChip
                goodWhenUp={false}
                isNew={
                  monthlySpend.previousExpenseTotal === 0 &&
                  monthlySpend.currentExpenseTotal > 0
                }
                percent={spendDeltaPercent}
              />
            </View>

            <View className="z-20 mt-2 flex-row items-center justify-end">
              
              <MonthSelect
                onSelect={setMonthOffset}
                options={monthOptions}
                selectedOffset={monthOffset}
              />
            </View>
          </View>

          <Animated.View
            pointerEvents="none"
            style={[heroCornerMaskStyle, heroCornerFadeStyle]}
          >
            <Svg
              height={HERO_CORNER_RADIUS}
              viewBox={`0 0 ${HERO_CORNER_RADIUS} ${HERO_CORNER_RADIUS}`}
              width={HERO_CORNER_RADIUS}
            >
              <Path d={heroCornerWedgePath} fill={heroEdgeColor} />
            </Svg>
            <Svg
              height={HERO_CORNER_RADIUS}
              style={heroCornerMirrorStyle}
              viewBox={`0 0 ${HERO_CORNER_RADIUS} ${HERO_CORNER_RADIUS}`}
              width={HERO_CORNER_RADIUS}
            >
              <Path d={heroCornerWedgePath} fill={heroEdgeColor} />
            </Svg>
          </Animated.View>
          </Animated.View>
        )}

        {!isFirstLoad && (
          <Animated.View
            onLayout={(event) => {
              setChartCardTop(event.nativeEvent.layout.y);
              setChartCardHeight(event.nativeEvent.layout.height);
            }}
            style={chartCardFadeStyle}
          >
            {/* Chart draws directly on the wash — no card (reference
                design): white line, under-fill, x labels only. */}
            <MonthlySpendChart
              points={monthlySpend.points}
              width={width}
            />
          </Animated.View>
        )}

        {!isFirstLoad && (
          <View
            className="mt-6 flex-1 rounded-t-modal bg-white px-5 pb-9 pt-2.5"
            style={premiumTheme.shadow.floating}
          >
            {/* <View className="mb-3.5 h-1 w-9 self-center rounded-full bg-divider" /> */}

            <View
              className="mt-3.5 flex-row items-center overflow-hidden rounded-section border border-border bg-white"
              style={premiumTheme.shadow.soft}
            >
              <View className="min-w-0 flex-1 overflow-hidden">
                <View className="flex flex-row items-center justify-between p-4 pb-2">
                  <View>
                    <Text className="text-[12px] font-semibold text-secondary">
                      Net balance
                    </Text>
                    <Text
                      adjustsFontSizeToFit
                      className=" text-[20px] font-extrabold tracking-[-0.6px] tabular-nums"
                      numberOfLines={1}
                      style={{
                        color:
                          balanceSplit.yourMoney - balanceSplit.owed < 0
                            ? premiumTheme.colors.ink
                            : premiumTheme.colors.ink,
                      }}
                    >
                      {MobileDashboardService.getFormattedBalance(
                        balanceSplit.yourMoney - balanceSplit.owed
                      )}
                    </Text>
                  </View>
                  <View className="">
                    <BalanceDonut
                      owed={balanceSplit.owed}
                      yours={balanceSplit.yourMoney}
                    />
                  </View>
                </View>
                <View className="flex flex-row justify-between gap-6 mt-2 px-4 rounded-2xl py-3 bg-slate-50">
                  <View className="flex">
                    <View className="flex flex-row items-center">
                      <View className="h-[6px] w-[6px] mr-1 rounded-full bg-danger" />
                      <Text
                        adjustsFontSizeToFit
                        className=" text-[14px] font-extrabold text-ink tabular-nums"
                        numberOfLines={1}
                      >
                        {MobileDashboardService.getFormattedBalance(
                          balanceSplit.owed
                        )}
                      </Text>
                      <Text className="text-[10px] pl-[1px] leading-4 mt-auto font-semibold text-secondary">
                        Owed
                      </Text>
                    </View>
                  
                    <Text className="mt-[1px] text-[10px] font-medium text-muted">
                      {formatAccountCount(balanceSplit.owedAccounts)}
                    </Text>
                  </View>

                  <View>
                    <View className="flex flex-row items-center">
                      <View className="h-[6px] w-[6px] mr-1 rounded-full bg-transfer" />
                      <Text
                        adjustsFontSizeToFit
                        className=" text-[14px] font-extrabold text-ink tabular-nums"
                        numberOfLines={1}
                      >
                        {MobileDashboardService.getFormattedBalance(
                          balanceSplit.yourMoney
                        )}
                      </Text>
                      <Text className="text-[10px] pl-[1px] leading-4 mt-auto font-semibold text-secondary">
                        Yours
                      </Text>
                    </View>
                  
                    <Text className="mt-[1px] text-[10px] font-medium text-muted">
                      {formatAccountCount(balanceSplit.yourAccounts)}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                className="h-[72px] bg-border"
                style={{ width: premiumHairline }}
              />
            </View>

            <View className="flex flex-row items-center justify-between mt-8">
              <Text className="text-[13px] font-semibold text-secondary">
                Accounts
              </Text>
              <Pressable
                className={`flex-row items-center gap-0.5 ${pressedControl}`}
                onPress={() => navigation.navigate("FinancialIntelligence")}
              >
                <Text className="text-[13px] font-bold text-transfer">
                  All accounts
                </Text>
                <ChevronRight
                  color={premiumTheme.colors.transfer}
                  size={15}
                  strokeWidth={2.4}
                />
              </Pressable>
            </View>

            <View
              className="mt-2 overflow-hidden rounded-section "
              style={premiumTheme.shadow.soft}
            >
              {accountPreview.length === 0 ? (
                <View className="p-4 text-center">
                  <Text className="text-[15px] text-center font-bold text-ink">
                    No accounts yet
                  </Text>
                  <Text className="mt-1.5 text-[13px] text-center leading-[18px] text-secondary">
                    Add cash, bank accounts, cards, or wallets to see
                    balances here.
                  </Text>
                  <Pressable
                    className="mt-3.5 flex-row items-center mx-auto gap-1 self-start rounded-full bg-ink px-4 py-2"
                    onPress={openAddAccount}
                  >
                    <Plus color="#ffffff" size={15} strokeWidth={2} />
                    <Text className="text-[12px] font-bold text-white">
                      Add account
                    </Text>
                  </Pressable>
                </View>
              ) : (
                accountPreview.map((accountBalance, index) => (
                  <AccountRow
                    key={
                      accountBalance.account.id ?? accountBalance.account.name
                    }
                    balance={accountBalance.currentBalance}
                    name={accountBalance.account.name}
                    onPress={() =>
                      navigation.navigate("FinancialIntelligence")
                    }
                    type={accountBalance.account.account_type}
                    showDivider={index < accountPreview.length - 1}
                  />
                ))
              )}
            </View>

            <View className="mt-8 flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-secondary">
                Recent Transaction
              </Text>
              <Pressable
                className={`flex-row items-center gap-0.5 ${pressedControl}`}
                onPress={() => navigation.navigate("Transactions")}
              >
                <Text className="text-[13px] font-bold text-transfer">
                  View all
                </Text>
                <ChevronRight
                  color={premiumTheme.colors.transfer}
                  size={15}
                  strokeWidth={2.4}
                />
              </Pressable>
            </View>

            <View className="mt-1">
              {recentTransactions.length === 0 ? (
                <Text className="py-4 text-[13px] leading-[18px] text-secondary">
                  Transactions you add or confirm will show up here.
                </Text>
              ) : (
                recentTransactions.map((transaction, index) => (
                  <RecentTransactionRow
                    key={transaction.id}
                    onPress={() => navigation.navigate("Transactions")}
                    showDivider={index < recentTransactions.length - 1}
                    transaction={transaction}
                  />
                ))
              )}
            </View>
          </View>
        )}
      </Animated.ScrollView>

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

function formatAccountCount(count: number) {
  return `from ${count} account${count === 1 ? "" : "s"}`;
}

function FlowStat({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View className="flex flex-row items-center">
      <View
        className="h-[6px] w-[6px] mr-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text className="text-[13px] font-medium text-white tabular-nums">
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
      <Text className="text-[11px] pl-[2px] text-white/60">{label}</Text>
    </View>
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
        className={`flex-row items-center gap-1 rounded-full border border-white/30 bg-white/20 shadow px-3 py-[4px] ${pressedControl}`}
        onPress={() => (open ? closeMenu() : openMenu())}
      >
        <Text className="text-[10px] font-bold text-white">
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
            color={premiumTheme.colors.canvas}
            size={11}
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
  isNew,
  percent,
}: {
  goodWhenUp: boolean;
  isNew: boolean;
  percent: number;
}) {
  // No previous month to compare against — a percentage would read as
  // real growth, so say what it actually is.
  // Frosted pill on the dark wash; colors brightened for contrast.
  if (isNew) {
    return (
      <View className="self-start rounded-full py-[4px]">
        <Text className="text-[10px] font-semibold text-white/70">
          New this month
        </Text>
      </View>
    );
  }

  const Icon = percent > 0 ? ArrowUp : percent < 0 ? ArrowDown : Minus;
  // Direction is only meaningful relative to the metric: rising income is
  // good, rising spend is not.
  const favourable = percent > 0 ? goodWhenUp : !goodWhenUp;
  const color =
    percent === 0 ? "#ffffff" : favourable ? "#4ade80" : "#f87171";
  // Tiny previous months explode the ratio; beyond 999% the exact figure
  // carries no meaning.
  const display =
    Math.abs(percent) > 999 ? "999%+" : `${Math.abs(percent)}%`;

  return (
    <View className="flex-row items-center gap-1 self-start rounded-full  py-[4px]">
      <Icon color={color} size={12} strokeWidth={2.6} />
      <Text className="text-[10px] font-bold tabular-nums" style={{ color }}>
        {display}
      </Text>
      <Text className="text-[10px] font-medium text-white/90">
        vs last month
      </Text>
    </View>
  );
}

// Left inset of the plot. The chart has no y-axis labels (reference
// design) so this is purely the breathing room before the first point —
// chart-kit consumes it via style.paddingRight, which it destructures
// from the style prop. Dot x positions follow paddingRight + i * (width -
// paddingRight) / count, which the scrub gesture inverts to find the
// nearest day; keep in lockstep with chartCanvasStyle.paddingRight.
const CHART_PLOT_LEFT = 20;
// Svg height of the chart. chart-kit draws the plot in the top 3/4 of the
// svg (bottom quarter is the x-label band), offset by its paddingTop, so
// the zero baseline — where the scrub drop-line ends — is derived rather
// than eyeballed. The 10 matches chartCanvasStyle.paddingTop.
const CHART_HEIGHT = 200;
const CHART_PLOT_BOTTOM = (CHART_HEIGHT * 3) / 4 + 10;
// Scale ceiling multiplier: the axis max is pinned this far above the
// data max so the peak-day marker's tooltip always has headroom.
const CHART_HEADROOM_FACTOR = 1.7;
// Offset from the touch wrapper's left edge to the svg's left edge: the
// canvas shifts the svg left by 10 (marginLeft below), so touch x + 10 is
// svg x.
const CHART_CANVAS_SHIFT = 10;

// LineChart is a third-party component; its style prop stays a plain object.
// paddingRight/paddingTop are chart-kit's own gutters (defaults 64/16),
// not real CSS padding — tightened so the plot fills the card. No
// paddingBottom: the lib consumes it too and it pushed the x-labels up,
// growing the dead band under them. The negative bottom margin swallows
// the label band's leftover whitespace (labels sit at its top).
const chartCanvasStyle = {
  marginBottom: -16,
  marginLeft: -10,
  paddingRight: CHART_PLOT_LEFT,
  paddingTop: 10,
} as const;

function MonthlySpendChart({
  points,
  width,
}: {
  points: SpendPoint[];
  width: number;
}) {
  // The reference plots DAILY spend (a wavy line), while the service
  // series is cumulative so its endpoint equals the hero total — diff
  // consecutive points to recover each day's amount.
  const values = points.map((point, index) =>
    index === 0 ? point.value : point.value - points[index - 1].value
  );
  const lastIndex = values.length - 1;
  const hasSpend = values.some((value) => value > 0);
  // Pin the scale above the real max so the peak sits well below the svg
  // top — the resting marker lives on the peak and its tooltip (value +
  // date, ~64px) needs that headroom. Rendered as an invisible one-point
  // dataset; chart-kit scales to the max across datasets.
  const scaleCeiling = hasSpend
    ? Math.max(...values) * CHART_HEADROOM_FACTOR
    : 0;
  // chart-kit places point i at gutter + (i / count) * (svgWidth - gutter),
  // so the last point stops one step short of the svg's right edge.
  // Oversize the svg so the last point lands CHART_PLOT_LEFT in from the
  // screen's right edge (mirroring the left inset); the wrapper's
  // overflow-hidden clips the overhang.
  const pointCount = Math.max(values.length, 2);
  const svgWidth =
    CHART_PLOT_LEFT +
    ((width + CHART_CANVAS_SHIFT - 2 * CHART_PLOT_LEFT) * pointCount) /
      (pointCount - 1);
  const monthName =
    points
      .find((point) => point.label !== "")
      ?.label.split(" ")[1] ?? "";
  // Region ABOVE the line, closed against the svg top — drawn via the
  // decorator with a gradient that strengthens toward the line. The path
  // replicates chart-kit's bezier exactly (same floored x/y and control
  // points, source-verified) so the fill hugs the stroke.
  const aboveLinePath = useMemo(() => {
    if (!hasSpend) {
      return "";
    }

    const count = Math.max(values.length, 1);
    const maxScale =
      scaleCeiling > 0 ? scaleCeiling : Math.max(...values, 1);
    const plotX = (index: number) =>
      Math.floor(
        CHART_PLOT_LEFT +
          (index * (svgWidth - CHART_PLOT_LEFT)) / count
      );
    const plotY = (value: number) =>
      Math.floor(CHART_HEIGHT * 0.75 * (1 - value / maxScale) + 10);

    let path = `M${plotX(0)},${plotY(values[0])}`;

    for (let index = 0; index < values.length - 1; index += 1) {
      const x0 = plotX(index);
      const x1 = plotX(index + 1);
      const y0 = plotY(values[index]);
      const y1 = plotY(values[index + 1]);
      const xMid = (x0 + x1) / 2;
      const yMid = (y0 + y1) / 2;
      const control1 = (xMid + x0) / 2;
      const control2 = (xMid + x1) / 2;

      path += ` Q ${control1}, ${y0}, ${xMid}, ${yMid} Q ${control2}, ${y1}, ${x1}, ${y1}`;
    }

    path += ` L${plotX(values.length - 1)},0 L${plotX(0)},0 Z`;

    return path;
  }, [hasSpend, scaleCeiling, svgWidth, values]);
  // At rest the marker sits on the month's peak spend day — the most
  // informative single point. Scrubbing moves it; releasing returns it
  // to the peak.
  const peakIndex = hasSpend
    ? values.indexOf(Math.max(...values))
    : null;
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const selectedIndex =
    scrubIndex === null ? peakIndex : Math.min(scrubIndex, lastIndex);

  const panResponder = useMemo(() => {
    const count = Math.max(values.length, 1);

    function indexFromTouch(locationX: number) {
      const svgX = locationX + CHART_CANVAS_SHIFT;
      const step = (svgWidth - CHART_PLOT_LEFT) / count;
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
      onPanResponderRelease: () => {
        setScrubIndex(null);
      },
      onPanResponderTerminate: () => {
        setScrubIndex(null);
      },
      onPanResponderTerminationRequest: () => true,
      onStartShouldSetPanResponder: () => true,
    });
  }, [svgWidth, values.length]);

  return (
    <View
      className="overflow-hidden"
      {...panResponder.panHandlers}
    >
      <LineChart
        bezier
        data={{
          labels: points.map((point) => point.label),
          datasets: [
            {
              color: () => "#ffffff",
              data: values,
              strokeWidth: 2.5,
            },
            ...(scaleCeiling > 0
              ? [
                  {
                    color: () => "rgba(0, 0, 0, 0)",
                    data: [scaleCeiling],
                    strokeWidth: 0,
                    withDots: false,
                  },
                ]
              : []),
          ],
        }}
        decorator={() =>
          hasSpend ? (
            <>
              <Defs>
                <SvgLinearGradient
                  gradientUnits="userSpaceOnUse"
                  id="aboveLineFill"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2={String(CHART_PLOT_BOTTOM)}
                >
                  <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                  <Stop
                    offset="5"
                    stopColor="#ffffff"
                    stopOpacity="0.2"
                  />
                </SvgLinearGradient>
              </Defs>
              <Path d={aboveLinePath} fill="url(#aboveLineFill)" />
            </>
          ) : null
        }
        fromZero
        height={CHART_HEIGHT}
        xLabelsOffset={-6}
        renderDotContent={({ x, y, index }) => {
          if (!hasSpend) {
            return null;
          }

          const isEndpoint = index === lastIndex;
          const isScrubbed =
            selectedIndex !== null && index === selectedIndex;

          if (!isEndpoint && !isScrubbed) {
            return null;
          }

          const point = points[index];
          const textTop = Math.max(4, y - 64);
          const textLeft = Math.min(
            Math.max(4, x - 60),
            width - 124
          );

          return (
            <View key={`marker-${index}`} pointerEvents="none">
              {isScrubbed && (
                <>
                  {/* Drop-line runs from under the tooltip, through the
                      dot, to the zero baseline. */}
                  <View
                    className="absolute w-[1.5px] rounded-full bg-white/70"
                    style={{
                      height: Math.max(
                        0,
                        CHART_PLOT_BOTTOM - textTop - 34
                      ),
                      left: x,
                      top: textTop + 34,
                    }}
                  />
                  <View
                    className="absolute h-[9px] w-[9px] rounded-full bg-white"
                    style={{
                      left: x - 4.5,
                      top: y - 4.5,
                    }}
                  />
                  <View
                    className="absolute w-[120px]  items-center"
                    style={{
                      left: textLeft,
                      top: textTop,
                    }}
                  >
                    <Text className="text-[11px] font-bold text-white tabular-nums">
                      {MobileDashboardService.getFormattedBalance(
                        values[index] ?? 0
                      )}
                    </Text>
                    <Text className="mt-[1px] text-[8px] font-semibold uppercase tracking-[1px] text-white/65">
                      {point && point.day > 0
                        ? `${point.day} ${monthName}`
                        : ""}
                    </Text>
                  </View>
                </>
              )}
              {isEndpoint && !isScrubbed && (
                <View
                  className="absolute h-[12px] w-[12px] rounded-full border-2 border-white"
                  style={{
                    left: x - 6,
                    top: y - 6,
                  }}
                />
              )}
            </View>
          );
        }}
        style={chartCanvasStyle}
        width={svgWidth}
        withDots
        withHorizontalLabels={false}
        withInnerLines={false}
        withOuterLines={false}
        withShadow={false}
        withVerticalLines={false}
        chartConfig={{
          backgroundGradientFrom: "#ffffff",
          backgroundGradientFromOpacity: 0,
          backgroundGradientTo: "#ffffff",
          backgroundGradientToOpacity: 0,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          decimalPlaces: 0,
          labelColor: () => "rgba(255, 255, 255, 0.6)",
          propsForDots: {
            r: "0",
          },
          propsForLabels: {
            fontSize: 11,
          },
        }}
      />
    </View>
  );
}


const DONUT_SIZE = 50;
const DONUT_STROKE = 4;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
// Fraction of the circle left blank at each segment junction.
const DONUT_GAP_FRACTION = 0;

// Yours-vs-owed ring with a wallet badge in the middle. Segments are two
// stroked circles with dash arrays sized to each share, rotated so the
// yours arc starts at 12 o'clock and the owed arc follows it.
function BalanceDonut({
  owed,
  yours,
}: {
  owed: number;
  yours: number;
}) {
  const yoursShare = Math.max(yours, 0);
  const owedShare = Math.max(owed, 0);
  const total = yoursShare + owedShare;
  const center = DONUT_SIZE / 2;
  const gap = DONUT_CIRCUMFERENCE * DONUT_GAP_FRACTION;
  const yoursLength = total
    ? Math.max((yoursShare / total) * DONUT_CIRCUMFERENCE - gap, 0)
    : 0;
  const owedLength = total
    ? Math.max((owedShare / total) * DONUT_CIRCUMFERENCE - gap, 0)
    : 0;
  const owedStartDegrees = total
    ? -90 + (yoursShare / total) * 360
    : -90;

  return (
    <View className="items-center justify-center">
      <Svg height={DONUT_SIZE} width={DONUT_SIZE}>
        {total === 0 ? (
          <Circle
            cx={center}
            cy={center}
            fill="none"
            r={DONUT_RADIUS}
            stroke={premiumTheme.colors.divider}
            strokeWidth={DONUT_STROKE}
          />
        ) : (
          <>
            {yoursLength > 0 && (
              <Circle
                cx={center}
                cy={center}
                fill="none"
                r={DONUT_RADIUS}
                stroke={premiumTheme.colors.transfer}
                strokeDasharray={`${yoursLength} ${DONUT_CIRCUMFERENCE}`}
                strokeLinecap="round"
                strokeWidth={DONUT_STROKE}
                transform={`rotate(-90 ${center} ${center})`}
              />
            )}
            {owedLength > 0 && (
              <Circle
                cx={center}
                cy={center}
                fill="none"
                r={DONUT_RADIUS}
                stroke={premiumTheme.colors.danger}
                strokeDasharray={`${owedLength} ${DONUT_CIRCUMFERENCE}`}
                strokeLinecap="round"
                strokeWidth={DONUT_STROKE}
                transform={`rotate(${owedStartDegrees} ${center} ${center})`}
              />
            )}
          </>
        )}
      </Svg>
      <View className="absolute h-[34px] w-[34px] items-center justify-center rounded-full bg-field">
        <Wallet color={premiumTheme.colors.secondary} size={17} strokeWidth={1.7} />
      </View>
    </View>
  );
}
 
function RecentTransactionRow({
  onPress,
  showDivider,
  transaction,
}: {
  onPress: () => void;
  showDivider: boolean;
  transaction: CachedTransaction;
}) {
  const type = transaction.transaction_type;
  const categoryName =
    transaction.category?.name ?? titleCase(type);
  const merchantDisplay = getTransactionMerchantDisplay(
    transaction,
    categoryName
  );
  const isTransfer = type === "transfer";
  const signedAmount = getSignedTransactionAmount(
    transaction.amount,
    type
  );
  // Money direction chip: out = red up-arrow, in = green down-arrow,
  // transfer = neutral.
  const chip = isTransfer
    ? {
        background: premiumTheme.colors.transferSoft,
        color: premiumTheme.colors.transfer,
        Icon: Minus,
      }
    : signedAmount > 0
      ? {
          background: premiumTheme.colors.successSoft,
          color: premiumTheme.colors.success,
          Icon: ArrowDown,
        }
      : {
          background: premiumTheme.colors.dangerSoft,
          color: premiumTheme.colors.danger,
          Icon: ArrowUp,
        };
  const ChipIcon = chip.Icon;

  return (
    <Pressable
      accessibilityHint="Opens the transactions list"
      accessibilityRole="button"
      className="-mx-2  flex-row items-center gap-3 rounded-[14px] px-2 py-2 active:bg-field"
      onPress={onPress}
    >
      <TransactionIcon category={transaction.category} type={type} />

      <View className="min-w-0 flex-1">
        <Text
          className="text-[12px] font-bold tracking-[-0.2px] text-ink"
          numberOfLines={1}
        >
          {merchantDisplay.name}
        </Text>
        <Text
          className="text-[10px] font-medium text-secondary"
          numberOfLines={1}
        >
          {categoryName}
        </Text>
      </View>

      <View className="ml-1 items-end">
        <Text className="text-[12px] font-extrabold tracking-[-0.2px] text-ink tabular-nums">
          {formatNeutralTransactionAmount(transaction.amount)}
        </Text>
        <Text className="mt-[3px] text-[10px] font-semibold text-muted">
          {formatTransactionListTimestamp(transaction.occurred_at)}
        </Text>
      </View>

      <View
        className="ml-1 items-center justify-center rounded-full"
        // style={{ backgroundColor: chip.background }}
      >
        <ChipIcon color={chip.color} size={13} strokeWidth={2.6} />
      </View>

      {showDivider ? (
        <View
          className="absolute bottom-0 left-[62px] right-2 bg-divider"
          style={{ height: premiumHairline }}
        />
      ) : null}
    </Pressable>
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
  const display = getAccountBalanceDisplay(type, balance);
  const subtitle = display.owed
    ? `${getAccountSubtitle(type)} · ${display.label}`
    : display.label !== "Current balance"
      ? `${getAccountSubtitle(type)} · ${display.label}`
      : getAccountSubtitle(type);

  return (
    <Pressable
      className="min-h-[58px]  flex flex-row items-center gap-3  active:bg-field"
      onPress={onPress}
    >
      <View
        className="h-[36px] w-[36px] items-center justify-center rounded-[13px]"
        style={{ backgroundColor: icon.background }}
      >
        <Icon color={icon.color} size={15} strokeWidth={2} />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-[13px] font-bold text-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[12px] font-medium text-secondary">
          {subtitle}
        </Text>
      </View>

      <Text
        adjustsFontSizeToFit
        className="ml-2 text-[12px] font-extrabold tabular-nums"
        minimumFontScale={0.76}
        numberOfLines={1}
        style={{
          color: display.owed
            ? premiumTheme.colors.danger
            : premiumTheme.colors.ink,
        }}
      >
        {MobileDashboardService.getFormattedBalance(display.amount)}
      </Text>
      <ChevronRight color="#a3a8b0" size={20} strokeWidth={2.2} />

      {showDivider ? (
        <View
          className="absolute bottom-0 left-[68px] right-3.5 bg-divider"
          style={{ height: premiumHairline }}
        />
      ) : null}
    </Pressable>
  );
}

// Monochrome by design: account tiles stay field-grey with ink icons —
// the app reserves color for meaning (the outstanding amount is already
// red), unlike transaction rows where color is categorical.
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
    return "Credit card";
  }

  if (type === "cash") {
    return "Cash";
  }

  if (type === "digital_wallet") {
    return "Digital wallet";
  }

  if (type === "investment") {
    return "Investments";
  }

  return "Bank account";
}
