import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { EventDirection } from "@finance/shared-types";

import { MobileDashboardService } from "../services/MobileDashboardService";
import { MobileEventService } from "../services/MobileEventService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";

export function EventsScreen() {
  const events = useOfflineStore((state) => state.events);
  const createFinancialEvent = useOfflineStore(
    (state) => state.createFinancialEvent
  );
  const updateFinancialEvent = useOfflineStore(
    (state) => state.updateFinancialEvent
  );
  const deleteFinancialEvent = useOfflineStore(
    (state) => state.deleteFinancialEvent
  );
  const refresh = useOfflineStore((state) => state.refresh);
  const synchronize = useSyncStore((state) => state.synchronize);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<EventDirection>("debit");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const parsedAmount = Number(amount);

    if (!merchant.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a merchant and a valid amount.");
      return;
    }

    await createFinancialEvent(
      {
        amount: parsedAmount,
        confidence: 1,
        currency: "INR",
        direction,
        merchant_id: null,
        merchant_name_raw: merchant.trim(),
        metadata: {
          source: "manual",
        },
        notes: notes.trim() || null,
        occurred_at: new Date().toISOString(),
        status: "pending",
      },
      "manual"
    );
    await synchronize();

    setMerchant("");
    setAmount("");
    setNotes("");
    setError(null);
  }

  async function handleConfirm(eventId: string) {
    try {
      await MobileEventService.confirm(eventId);
      await refresh();
      await synchronize();
      setError(null);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to confirm while offline."
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Financial Events</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create event</Text>
        <TextInput
          onChangeText={setMerchant}
          placeholder="Merchant"
          style={styles.input}
          value={merchant}
        />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          placeholder="Amount"
          style={styles.input}
          value={amount}
        />
        <View style={styles.segmented}>
          {(["debit", "credit"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setDirection(item)}
              style={[
                styles.segment,
                direction === item && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  direction === item && styles.segmentTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          onChangeText={setNotes}
          placeholder="Notes"
          style={styles.input}
          value={notes}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={handleCreate} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Save offline</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {events.map((event) => (
          <View key={event.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>
                {event.merchant_name_raw ?? "Unknown merchant"}
              </Text>
              <Text style={styles.amount}>
                {MobileDashboardService.getFormattedBalance(event.amount)}
              </Text>
            </View>
            <Text style={styles.muted}>
              {event.direction} • {event.status} •{" "}
              {new Date(event.occurred_at).toLocaleDateString()}
            </Text>
            {event.notes && <Text style={styles.muted}>{event.notes}</Text>}
            <View style={styles.actions}>
              {event.status === "pending" && (
                <Pressable
                  onPress={() => {
                    void handleConfirm(event.id);
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Confirm</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  void updateFinancialEvent(event.id, {
                    status: "ignored",
                  }).then(synchronize);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Ignore</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void deleteFinancialEvent(event.id).then(synchronize);
                }}
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function TransactionsScreen() {
  const transactions = useOfflineStore((state) => state.transactions);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Transactions</Text>
      <View style={styles.list}>
        {transactions.map((transaction) => (
          <View key={transaction.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>
                {transaction.merchant?.name ?? "Unknown merchant"}
              </Text>
              <Text style={styles.amount}>
                {MobileDashboardService.getFormattedBalance(transaction.amount)}
              </Text>
            </View>
            <Text style={styles.muted}>
              {transaction.transaction_type} •{" "}
              {transaction.category?.name ?? "Uncategorized"} •{" "}
              {new Date(transaction.occurred_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function MerchantsScreen() {
  const merchants = useOfflineStore((state) => state.merchants);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Merchants</Text>
      <View style={styles.list}>
        {merchants.map((merchant) => (
          <View key={merchant.id} style={styles.row}>
            <Text style={styles.rowTitle}>{merchant.name}</Text>
            <Text style={styles.muted}>
              {merchant.category?.name ?? "Uncategorized"} • Used{" "}
              {merchant.usage_count ?? 0} times
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function CategoriesScreen() {
  const categories = useOfflineStore((state) => state.categories);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Categories</Text>
      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category.id} style={styles.row}>
            <Text style={styles.rowTitle}>{category.name}</Text>
            <Text style={styles.muted}>
              {category.is_system ? "System category" : "Custom category"}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function BudgetsScreen() {
  const budgets = useOfflineStore((state) => state.budgets);
  const transactions = useOfflineStore((state) => state.transactions);
  const overview = useMemo(
    () => MobileDashboardService.getBudgetOverview(budgets, transactions),
    [budgets, transactions]
  );
  const budgetMaximum =
    Math.max(
      ...overview.budgets.flatMap((item) => [item.spent, item.budget.amount]),
      0
    ) || 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Budgets</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Remaining this month</Text>
        <Text style={styles.summaryValue}>
          {MobileDashboardService.getFormattedBalance(overview.remaining)}
        </Text>
      </View>
      <View style={styles.list}>
        {overview.budgets.map((item) => (
          <View key={item.budget.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>
                {item.budget.category?.name ?? "Uncategorized"}
              </Text>
              <Text style={styles.amount}>{Math.round(item.percentage)}%</Text>
            </View>
            <Text style={styles.muted}>
              {MobileDashboardService.getFormattedBalance(item.spent)} spent of{" "}
              {MobileDashboardService.getFormattedBalance(item.budget.amount)}
            </Text>
            <VisualBar
              maximum={budgetMaximum}
              tone={item.status === "on_track" ? "income" : "expense"}
              value={item.spent}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function ReportsScreen() {
  const transactions = useOfflineStore((state) => state.transactions);
  const month = new Date().toISOString().slice(0, 7);
  const report = useMemo(
    () => MobileDashboardService.getReport(transactions, "monthly", month),
    [month, transactions]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reports</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Net balance</Text>
        <Text style={styles.summaryValue}>
          {MobileDashboardService.getFormattedBalance(report.netBalance)}
        </Text>
      </View>
      <View style={styles.grid}>
        <ReportMetric label="Income" value={report.totalIncome} />
        <ReportMetric label="Expenses" value={report.totalExpenses} />
      </View>
      <Text style={styles.sectionTitle}>Categories</Text>
      {report.categoryReport.map((group) => (
        <View key={group.name} style={styles.row}>
          <Text style={styles.rowTitle}>{group.name}</Text>
          <Text style={styles.muted}>
            {MobileDashboardService.getFormattedBalance(group.expenses)} •{" "}
            {group.transactionCount} transactions
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function AnalyticsScreen() {
  const transactions = useOfflineStore((state) => state.transactions);
  const analytics = useMemo(
    () => MobileDashboardService.getAnalytics(transactions),
    [transactions]
  );
  const visibleCashFlow = analytics.cashFlow.slice(-6);
  const cashFlowMaximum =
    Math.max(
      ...visibleCashFlow.flatMap((point) => [
        point.income,
        point.expenses,
        Math.abs(point.net),
      ]),
      0
    ) || 1;
  const categoryMaximum =
    Math.max(
      ...analytics.categoryAnalytics
        .slice(0, 6)
        .map((group) => group.expenses),
      0
    ) || 1;
  const merchantMaximum =
    Math.max(
      ...analytics.merchantAnalytics
        .slice(0, 6)
        .map((group) => group.expenses),
      0
    ) || 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Cash flow</Text>
        <Text style={styles.summaryValue}>
          {MobileDashboardService.getFormattedBalance(analytics.netBalance)}
        </Text>
      </View>
      <View style={styles.grid}>
        <ReportMetric label="Income" value={analytics.totalIncome} />
        <ReportMetric label="Expenses" value={analytics.totalExpenses} />
      </View>
      <View style={styles.grid}>
        <ReportMetric
          label="Avg income"
          value={analytics.averageMonthlyIncome}
        />
        <ReportMetric
          label="Avg expenses"
          value={analytics.averageMonthlyExpenses}
        />
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Savings rate</Text>
        <Text style={styles.metricValue}>
          {formatPercent(analytics.savingsRate)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Cash flow</Text>
      {visibleCashFlow.map((point) => (
        <View key={point.period} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{formatPeriod(point.period)}</Text>
            <Text style={styles.amount}>
              {MobileDashboardService.getFormattedBalance(point.net)}
            </Text>
          </View>
          <Text style={styles.muted}>
            {MobileDashboardService.getFormattedBalance(point.income)} income •{" "}
            {MobileDashboardService.getFormattedBalance(point.expenses)} expenses
          </Text>
          <View style={styles.visualStack}>
            <VisualBar
              maximum={cashFlowMaximum}
              tone="income"
              value={point.income}
            />
            <VisualBar
              maximum={cashFlowMaximum}
              tone="expense"
              value={point.expenses}
            />
            <VisualBar
              maximum={cashFlowMaximum}
              tone={point.net >= 0 ? "income" : "expense"}
              value={Math.abs(point.net)}
            />
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Categories</Text>
      {analytics.categoryAnalytics.slice(0, 6).map((group) => (
        <View key={group.name} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{group.name}</Text>
            <Text style={styles.amount}>
              {MobileDashboardService.getFormattedBalance(group.expenses)}
            </Text>
          </View>
          <Text style={styles.muted}>
            {group.transactionCount} transactions •{" "}
            {formatPercent(group.percentageOfExpenses)} of expenses
          </Text>
          <VisualBar
            maximum={categoryMaximum}
            tone="expense"
            value={group.expenses}
          />
        </View>
      ))}

      <Text style={styles.sectionTitle}>Merchants</Text>
      {analytics.merchantAnalytics.slice(0, 6).map((group) => (
        <View key={group.name} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{group.name}</Text>
            <Text style={styles.amount}>
              {MobileDashboardService.getFormattedBalance(group.expenses)}
            </Text>
          </View>
          <Text style={styles.muted}>
            {group.transactionCount} transactions • Avg{" "}
            {MobileDashboardService.getFormattedBalance(
              group.averageTransaction
            )}
          </Text>
          <VisualBar
            maximum={merchantMaximum}
            tone="expense"
            value={group.expenses}
          />
        </View>
      ))}
    </ScrollView>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatPeriod(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function ReportMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
    </View>
  );
}

function VisualBar({
  maximum,
  tone,
  value,
}: {
  maximum: number;
  tone: "income" | "expense";
  value: number;
}) {
  return (
    <View style={styles.visualTrack}>
      <View
        style={[
          styles.visualBar,
          tone === "income" ? styles.visualBarIncome : styles.visualBarExpense,
          {
            width: `${Math.min(100, (Math.abs(value) / maximum) * 100)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  amount: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  container: {
    backgroundColor: "#f8fafc",
    gap: 16,
    padding: 20,
  },
  dangerButton: {
    borderColor: "#dc2626",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  list: {
    gap: 12,
  },
  metric: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 13,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  muted: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  rowTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    borderColor: "#2563eb",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  segment: {
    alignItems: "center",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
  },
  segmentText: {
    color: "#334155",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  summary: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 18,
  },
  summaryLabel: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  summaryValue: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  visualBar: {
    borderRadius: 999,
    height: "100%",
  },
  visualBarExpense: {
    backgroundColor: "#ef4444",
  },
  visualBarIncome: {
    backgroundColor: "#22c55e",
  },
  visualStack: {
    gap: 5,
    marginTop: 10,
  },
  visualTrack: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
});
