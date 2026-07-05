import { useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MobileDashboardService } from "../services/MobileDashboardService";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import type { RootStackParamList } from "../types/navigation";

type DashboardScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Dashboard"
>;

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const events = useOfflineStore((state) => state.events);
  const transactions = useOfflineStore((state) => state.transactions);
  const queue = useOfflineStore((state) => state.queue);
  const offlineError = useOfflineStore((state) => state.error);
  const refreshOfflineData = useOfflineStore((state) => state.refresh);
  const syncError = useSyncStore((state) => state.error);
  const syncing = useSyncStore((state) => state.syncing);
  const overview = MobileDashboardService.getOverview(
    transactions,
    events.length
  );
  const syncResource = MobileDashboardService.getSyncResourceName();

  useEffect(() => {
    void refreshOfflineData();
  }, [refreshOfflineData]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Mobile foundation</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("Settings")}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonText}>Settings</Text>
        </Pressable>
      </View>

      {offlineError && <Text style={styles.error}>{offlineError}</Text>}
      {syncError && <Text style={styles.error}>{syncError}</Text>}

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Net balance</Text>
        <Text style={styles.summaryValue}>
          {MobileDashboardService.getFormattedBalance(
            overview.totals.netBalance
          )}
        </Text>
      </View>

      <View style={styles.grid}>
        <Metric
          format="currency"
          label="Income"
          value={overview.totals.totalIncome}
        />
        <Metric
          format="currency"
          label="Expenses"
          value={overview.totals.totalExpenses}
        />
        <Metric
          format="number"
          label="Pending"
          value={overview.totals.pendingEvents}
        />
        <Metric
          format="number"
          label="Queued"
          value={queue.length}
        />
        <Metric
          label="Sync"
          value={syncing ? "Syncing" : syncResource}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workspace</Text>
        <View style={styles.navGrid}>
          <NavButton label="Events" onPress={() => navigation.navigate("Events")} />
          <NavButton
            label="Transactions"
            onPress={() => navigation.navigate("Transactions")}
          />
          <NavButton
            label="Merchants"
            onPress={() => navigation.navigate("Merchants")}
          />
          <NavButton
            label="Categories"
            onPress={() => navigation.navigate("Categories")}
          />
          <NavButton label="Budgets" onPress={() => navigation.navigate("Budgets")} />
          <NavButton label="Reports" onPress={() => navigation.navigate("Reports")} />
          <NavButton
            label="Analytics"
            onPress={() => navigation.navigate("Analytics")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function NavButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.navButton}>
      <Text style={styles.navButtonText}>{label}</Text>
    </Pressable>
  );
}

function Metric({
  format = "text",
  label,
  value,
}: {
  format?: "currency" | "number" | "text";
  label: string;
  value: number | string;
}) {
  const displayValue =
    format === "currency" && typeof value === "number"
      ? MobileDashboardService.getFormattedBalance(value)
      : value.toString();

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8fafc",
    gap: 16,
    padding: 20
  },
  eyebrow: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  error: {
    color: "#b91c1c",
    fontSize: 14
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  metric: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "47%",
    padding: 14
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 13
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6
  },
  navButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    minWidth: "47%",
    paddingHorizontal: 12
  },
  navButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800"
  },
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800"
  },
  settingsButton: {
    borderColor: "#2563eb",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  settingsButtonText: {
    color: "#2563eb",
    fontWeight: "700"
  },
  summary: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 18
  },
  summaryLabel: {
    color: "#cbd5e1",
    fontSize: 14
  },
  summaryValue: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800"
  }
});
