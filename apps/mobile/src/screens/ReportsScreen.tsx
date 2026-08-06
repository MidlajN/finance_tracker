import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
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
    <ScrollView contentContainerClassName="gap-[18px] bg-canvas p-5 pb-9">
      <View className="rounded-[22px] bg-[#111827] p-5">
        <Text className="text-[14px] text-[#cbd5e1]">Net balance</Text>
        <Text className="mt-1.5 text-[33px] font-black text-white">
          {MobileDashboardService.getFormattedBalance(report.netBalance)}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <ReportMetric label="Income" value={report.totalIncome} />
        <ReportMetric label="Expenses" value={report.totalExpenses} />
      </View>
      <Text style={financeStyles.sectionTitle}>Categories</Text>
      {report.categoryReport.map((group) => (
        <View
          className="rounded-[18px] bg-elevated p-[15px]"
          key={group.name}
          style={premiumTheme.shadow.floating}
        >
          <Text className="flex-1 text-[16px] font-black text-ink">
            {group.name}
          </Text>
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
    <View className="flex-1 rounded-[18px] bg-field p-[15px]">
      <Text className="text-[13px] text-secondary">{label}</Text>
      <Text className="mt-1.5 text-[18px] font-black text-ink">
        {MobileDashboardService.getFormattedBalance(value)}
      </Text>
    </View>
  );
}
