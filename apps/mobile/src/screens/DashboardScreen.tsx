import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  ChevronRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Wallet,
  X,
} from "lucide-react-native";
import {
  Modal,
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

import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import type { RootStackParamList } from "../types/navigation";

type DashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Dashboard"
>;

interface SpendPoint {
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

  const analytics = useMemo(
    () => MobileDashboardService.getAnalytics(transactions),
    [transactions]
  );
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
  const spendPoints = useMemo(
    () => getSpendPoints(analytics.spendingTrend),
    [analytics.spendingTrend]
  );
  const latestMonthlySpend =
    spendPoints[spendPoints.length - 1]?.value ?? 0;
  const accountPreview = financialOverview.accounts.slice(0, 4);
  const chartWidth = Math.max(260, width - 92);

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
              style={styles.addButton}
            >
              <Plus color="#ffffff" size={21} strokeWidth={2.6} />
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={styles.settingsButton}
            >
              <Settings color="#000000" size={19} strokeWidth={2.6} />
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
          <Text style={styles.heroLabel}>Total Spend</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={styles.heroAmount}
          >
            {MobileDashboardService.getFormattedBalance(latestMonthlySpend)}
          </Text>
          <MonthlySpendChart points={spendPoints} width={chartWidth} />
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            label="Income"
            value={analytics.totalIncome}
          />
          <SummaryCard
            label="Expense"
            value={analytics.totalExpenses}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          {financialOverview.accounts.length > 4 && (
            <Pressable
              onPress={() => navigation.navigate("FinancialIntelligence")}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.accountsCard}>
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

function getSpendPoints(
  trend: {
    expenses: number;
    period: string;
  }[]
): SpendPoint[] {
  const visibleTrend = trend.slice(-4);

  if (visibleTrend.length > 0) {
    return visibleTrend.map((point) => ({
      label: formatMonth(point.period),
      value: point.expenses,
    }));
  }

  const now = new Date();

  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 3 + index, 1);

    return {
      label: date.toLocaleDateString("en-IN", {
        month: "short",
      }),
      value: 0,
    };
  });
}

function formatMonth(period: string) {
  const [year, month] = period.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
  });
}

function MonthlySpendChart({
  points,
  width,
}: {
  points: SpendPoint[];
  width: number;
}) {
  const values = points.map((point) => point.value);

  return (
    <View style={styles.chart}>
      <LineChart
        bezier
        data={{
          labels: points.map((point) => point.label),
          datasets: [
            {
              color: () => "#3422ff",
              data: values,
              strokeWidth: 3,
            },
          ],
        }}
        formatYLabel={(value) => formatCompact(Number(value))}
        fromZero
        height={190}
        segments={3}
        style={styles.chartCanvas}
        width={width}
        withDots
        withInnerLines
        withOuterLines={false}
        withShadow={false}
        withVerticalLines={false}
        chartConfig={{
          backgroundGradientFrom: "#ffffff",
          backgroundGradientFromOpacity: 0,
          backgroundGradientTo: "#ffffff",
          backgroundGradientToOpacity: 0,
          color: (opacity = 1) => `rgba(52, 34, 255, ${opacity})`,
          decimalPlaces: 0,
          labelColor: () => "#818793",
          propsForBackgroundLines: {
            stroke: "#d9dde5",
            strokeDasharray: "4 4",
          },
          propsForDots: {
            r: "5",
            stroke: "#3422ff",
            strokeWidth: "3",
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCardHeader}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <ArrowUpRight color="#000000" size={22} strokeWidth={2.3} />
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={styles.summaryValue}
      >
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
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
            iconBackground="#ede9fe"
            iconColor="#4f46e5"
            label="Add transaction"
            onPress={onAddTransaction}
          />
          <QuickAddOption
            Icon={Landmark}
            description="Add cash, a bank account, credit card, or wallet balance."
            iconBackground="#e0f2fe"
            iconColor="#2563eb"
            label="Add account"
            onPress={onAddAccount}
          />
          <QuickAddOption
            Icon={PiggyBank}
            description="Open budgets to review or manage spending limits."
            iconBackground="#dcfce7"
            iconColor="#16a34a"
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
  if (type === "cash") {
    return {
      background: "#dcfce7",
      color: "#16a34a",
      Icon: Banknote,
    };
  }

  if (type === "credit_card") {
    return {
      background: "#ede9fe",
      color: "#4f46e5",
      Icon: CreditCard,
    };
  }

  if (type === "digital_wallet") {
    return {
      background: "#dbeafe",
      color: "#2563eb",
      Icon: Wallet,
    };
  }

  if (type === "investment") {
    return {
      background: "#fef3c7",
      color: "#f59e0b",
      Icon: BriefcaseBusiness,
    };
  }

  return {
    background: "#e0f2fe",
    color: "#4338ca",
    Icon: Landmark,
  };
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
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  accountDetails: {
    flex: 1,
    minWidth: 0,
  },
  accountDivider: {
    borderBottomColor: "#edf0f4",
    borderBottomWidth: 1,
  },
  accountIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  accountMeta: {
    color: "#8b929d",
    fontSize: 13,
    marginTop: 4,
  },
  accountName: {
    color: "#0b0b0c",
    fontSize: 16,
    fontWeight: "900",
  },
  accountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    minHeight: 74,
    paddingHorizontal: 18,
  },
  accountRowPressed: {
    backgroundColor: "#f8fafc",
  },
  accountsCard: {
    backgroundColor: "#ffffff",
    borderColor: "#f1f2f4",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 24,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  chart: {
    alignItems: "center",
    height: 204,
    marginTop: 20,
  },
  chartCanvas: {
    marginLeft: -10,
  },
  content: {
    paddingBottom: 28,
    paddingHorizontal: 22,
  },
  emptyAccountRow: {
    padding: 20,
  },
  emptyAccountButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#000000",
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
    fontWeight: "900",
  },
  emptyAccountText: {
    color: "#8b929d",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  emptyAccountTitle: {
    color: "#0b0b0c",
    fontSize: 16,
    fontWeight: "900",
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "800",
  },
  dashboardIntro: {
    marginBottom: 18,
    marginTop: 20,
  },
  dashboardIntroText: {
    color: "#7b818c",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 4,
  },
  dashboardIntroTitle: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 26,
  },
  heroAmount: {
    color: "#000000",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 10,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderColor: "#f1f2f4",
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: "#111827",
    shadowOffset: {
      height: 12,
      width: 0,
    },
    shadowOpacity: 0.06,
    shadowRadius: 28,
  },
  heroLabel: {
    color: "#777d88",
    fontSize: 16,
    fontWeight: "700",
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
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 78,
    paddingVertical: 14,
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
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  quickAddOptionText: {
    flex: 1,
    minWidth: 0,
  },
  quickAddPanel: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
  },
  safeArea: {
    backgroundColor: "#fafafa",
    flex: 1,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 28,
  },
  sectionTitle: {
    color: "#000000",
    fontSize: 21,
    fontWeight: "900",
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: {
      height: 7,
      width: 0,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    width: 38,
  },
  summaryArrow: {
    color: "#000000",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#f1f2f4",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    minHeight: 112,
    padding: 20,
    shadowColor: "#111827",
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 22,
  },
  summaryCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: "#7b818c",
    fontSize: 16,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 14,
  },
  summaryValue: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 16,
  },
  title: {
    color: "#000000",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 31,
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
  viewAllText: {
    color: "#321cff",
    fontSize: 17,
    fontWeight: "800",
  },
});
