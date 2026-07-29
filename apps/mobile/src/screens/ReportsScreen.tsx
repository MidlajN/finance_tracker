import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { financeStyles } from "../components/finance/financeStyles";
import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { premiumTheme } from "../theme/premiumTheme";

export function ReportsScreen() {
  const transactions = useOfflineStore((state) => state.transactions);
  const month = new Date().toISOString().slice(0, 7);
  const report = useMemo(
    () => MobileDashboardService.getReport(transactions, "monthly", month),
    [month, transactions]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
      <Text style={financeStyles.sectionTitle}>Categories</Text>
      {report.categoryReport.map((group) => (
        <View key={group.name} style={styles.row}>
          <Text style={styles.rowTitle}>{group.name}</Text>
          <Text style={financeStyles.muted}>
            {MobileDashboardService.getFormattedBalance(group.expenses)} •{" "}
            {group.transactionCount} transactions
          </Text>
        </View>
      ))}
    </ScrollView>
  );
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 18,
    flex: 1,
    padding: 15,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 13,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  row: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: 18,
    padding: 15,
    ...premiumTheme.shadow.floating,
  },
  rowTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  summary: {
    backgroundColor: "#111827",
    borderRadius: 22,
    padding: 20,
  },
  summaryLabel: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  summaryValue: {
    color: "#ffffff",
    fontSize: 33,
    fontWeight: "900",
    marginTop: 6,
  },
});
