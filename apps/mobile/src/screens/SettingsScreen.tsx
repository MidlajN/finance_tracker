import {
  type ComponentType,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import {
  Bell,
  BellRing,
  Battery,
  Check,
  ChevronRight,
  Cloud,
  Download,
  Info,
  Landmark,
  LogOut,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Tags,
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NotificationParseMiss } from "@finance/shared-types";

import {
  ExportOptionsModal,
  type ExportOptions,
} from "../components/finance/ExportOptionsModal";
import { FinancialDataExportService } from "../services/FinancialDataExportService";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumTheme } from "../theme/premiumTheme";
import type { RootStackParamList } from "../types/navigation";

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, "Settings">;
type RowIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const authLoading = useAuthStore((state) => state.loading);
  const openNotificationSettings = useNotificationStore(
    (state) => state.openSettings
  );
  const notificationError = useNotificationStore((state) => state.error);
  const notificationDiagnostics = useNotificationStore(
    (state) => state.diagnostics
  );
  const refreshNotificationDiagnostics = useNotificationStore(
    (state) => state.refreshDiagnostics
  );
  const sendTestNotification = useNotificationStore(
    (state) => state.sendTestNotification
  );
  const parseMisses = useNotificationStore((state) => state.parseMisses);
  const refreshParseMisses = useNotificationStore(
    (state) => state.refreshParseMisses
  );
  const clearParseMisses = useNotificationStore(
    (state) => state.clearParseMisses
  );
  const accounts = useOfflineStore((state) => state.accounts);
  const budgets = useOfflineStore((state) => state.budgets);
  const categories = useOfflineStore((state) => state.categories);
  const events = useOfflineStore((state) => state.events);
  const merchants = useOfflineStore((state) => state.merchants);
  const transactions = useOfflineStore((state) => state.transactions);
  const queue = useOfflineStore((state) => state.queue);
  const synchronize = useSyncStore((state) => state.synchronize);
  const syncing = useSyncStore((state) => state.syncing);
  const syncError = useSyncStore((state) => state.error);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const [exporting, setExporting] = useState(false);
  const [exportOptionsVisible, setExportOptionsVisible] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [testNotificationStatus, setTestNotificationStatus] =
    useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshNotificationDiagnostics();
      void refreshParseMisses();
    }, [refreshNotificationDiagnostics, refreshParseMisses])
  );

  const email = session?.user.email ?? "Signed-in account";
  const displayName = useMemo(() => {
    const metadata = session?.user.user_metadata;
    const suppliedName =
      typeof metadata?.full_name === "string"
        ? metadata.full_name
        : typeof metadata?.name === "string"
          ? metadata.name
          : "";

    if (suppliedName.trim()) {
      return suppliedName.trim();
    }

    const emailName = email.split("@")[0]?.replace(/[._-]+/g, " ") ?? "You";
    return emailName.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [email, session?.user.user_metadata]);
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const pendingReviews = events.filter((event) => event.status === "pending").length;
  const syncSubtitle = syncing
    ? "Syncing your latest changes..."
    : lastSyncedAt
      ? "Last synced " + formatRelativeSyncTime(lastSyncedAt)
      : "Sync your local changes across devices";

  async function handleExport(options: ExportOptions) {
    if (exporting) return;

    setExporting(true);
    setExportStatus(null);

    try {
      const filtered = transactions.filter((transaction) => {
        if (options.accountId && transaction.account_id !== options.accountId) {
          return false;
        }

        const occurredAt = new Date(transaction.occurred_at).getTime();

        if (options.from && occurredAt < options.from.getTime()) {
          return false;
        }

        return !(options.to && occurredAt > options.to.getTime());
      });

      if (filtered.length === 0) {
        setExportStatus("No transactions match the selected period.");
        return;
      }

      const fileName = await FinancialDataExportService.exportTransactions(
        filtered,
        options.accountId
          ? accounts.filter((account) => account.id === options.accountId)
          : accounts
      );
      setExportOptionsVisible(false);
      setExportStatus("Created " + fileName);
    } catch (error) {
      setExportStatus(
        error instanceof Error ? error.message : "Unable to export your data."
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleSync() {
    await synchronize();
  }

  async function handleTestNotification() {
    setTestNotificationStatus("Sending test alert...");
    const shown = await sendTestNotification();
    setTestNotificationStatus(
      shown
        ? "Test alert sent without creating financial data"
        : "Enable notification permission to send a test alert"
    );
  }

  return (
    <>
    <ScrollView
      contentContainerClassName="gap-5 bg-canvas p-5 pb-8"
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        className="overflow-hidden rounded-surface bg-elevated"
        style={premiumTheme.shadow.raised}
      >
        <View className="absolute -right-12 -top-[72px] h-[150px] w-[150px] rounded-full bg-accent/[0.08]" />
        <View className="flex-row items-center gap-3.5 p-4">
          <View className="h-[54px] w-[54px] items-center justify-center rounded-full bg-accent-soft">
            <Text className="text-[19px] font-black text-accent">
              {initials || "U"}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[19px] font-black text-ink" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="mt-1 text-[13px] text-secondary" numberOfLines={1}>
              {email}
            </Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-control bg-success-soft">
            <ShieldCheck
              color={premiumTheme.colors.success}
              size={21}
              strokeWidth={2.3}
            />
          </View>
        </View>

        <View className="flex-row items-center border-t-hairline border-t-divider bg-canvas px-2 py-[13px]">
          <ProfileMetric
            Icon={Landmark}
            color="#6d4aff"
            label="Accounts"
            value={accounts.length}
          />
          <View className="h-11 w-px bg-divider" />
          <ProfileMetric
            Icon={ReceiptText}
            color="#16a34a"
            label="Transactions"
            value={transactions.length}
          />
          <View className="h-11 w-px bg-divider" />
          <ProfileMetric
            Icon={PiggyBank}
            color="#f59e0b"
            label="Budgets"
            value={budgets.length}
          />
        </View>
      </View>

      <SettingsSection label="Tools">
        <MoreActionRow
          Icon={Download}
          color="#16a34a"
          disabled={exporting}
          onPress={() => setExportOptionsVisible(true)}
          subtitle={
            exportStatus ??
            "Export confirmed transactions as a CSV for Excel or Sheets"
          }
          title={exporting ? "Preparing export..." : "Export data"}
        />
      </SettingsSection>

      <SettingsSection label="Manage finances">
        <MoreActionRow
          Icon={Landmark}
          color="#6d4aff"
          onPress={() => navigation.navigate("FinancialIntelligence")}
          subtitle={
            accounts.length +
            (accounts.length === 1 ? " account" : " accounts") +
            " connected"
          }
          title="Accounts"
        />
        <MoreActionRow
          Icon={PiggyBank}
          color="#f59e0b"
          onPress={() => navigation.navigate("Budgets")}
          showDivider
          subtitle="Create and manage monthly spending limits"
          title="Budgets"
        />
        <MoreActionRow
          Icon={Tags}
          color="#2563eb"
          onPress={() => navigation.navigate("Categories")}
          showDivider
          subtitle={categories.length + " categories for organizing transactions"}
          title="Categories"
        />
        <MoreActionRow
          Icon={Store}
          color="#db2777"
          onPress={() => navigation.navigate("Merchants")}
          showDivider
          subtitle={merchants.length + " recognized merchants"}
          title="Merchants"
        />
      </SettingsSection>

      <SettingsSection label="Application">
        <MoreActionRow
          Icon={Bell}
          color="#2563eb"
          onPress={() => void openNotificationSettings()}
          subtitle={
            notificationError ??
            (pendingReviews > 0
              ? pendingReviews + " transactions waiting for review"
              : "Manage Android transaction-notification access")
          }
          title="Notification access"
        />
        <MoreActionRow
          Icon={syncing ? RefreshCw : Cloud}
          color="#f59e0b"
          disabled={syncing}
          onPress={() => void handleSync()}
          showDivider
          subtitle={syncError ?? syncSubtitle}
          title="Backup & sync"
          trailingText={queue.length > 0 ? queue.length + " pending" : undefined}
        />
      </SettingsSection>

      <SettingsSection label="Transaction detection">
        <NotificationDiagnosticsCard
          diagnostics={notificationDiagnostics}
        />
        <MoreActionRow
          Icon={BellRing}
          color="#6d4aff"
          onPress={() => void handleTestNotification()}
          showDivider
          subtitle={
            testNotificationStatus ??
            "Verify that Finance Tracker can show background alerts"
          }
          title="Send test alert"
        />
        <ParseMissCard
          misses={parseMisses}
          onClear={() => void clearParseMisses()}
        />
      </SettingsSection>

      <SettingsSection label="About">
        <MoreActionRow
          Icon={Info}
          color="#64748b"
          subtitle="Finance Tracker for Android"
          title="App information"
          trailingText={"v" + (Constants.expoConfig?.version ?? "0.0.0")}
        />
      </SettingsSection>

      <View className="flex-row items-center gap-[13px] rounded-section bg-[#f2f5ff] p-[17px]">
        <View className="h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-white">
          <ShieldCheck color="#315efb" size={25} strokeWidth={2.3} />
        </View>
        <View className="flex-1">
          <Text className="text-[14px] font-black text-ink">
            Your data stays available
          </Text>
          <Text className="mt-[3px] text-[12px] leading-[18px] text-[#526079]">
            Financial data is cached for offline use and synced to your signed-in
            account.
          </Text>
        </View>
      </View>

      <Pressable
        className={`min-h-[52px] flex-row items-center justify-center gap-[9px] rounded-[17px] bg-danger-soft active:bg-field ${
          authLoading ? "opacity-[0.58]" : ""
        }`}
        disabled={authLoading}
        onPress={() => void signOut()}
      >
        <LogOut color="#dc2626" size={19} strokeWidth={2.4} />
        <Text className="text-[14px] font-black text-danger">
          {authLoading ? "Signing out..." : "Sign out"}
        </Text>
      </Pressable>
    </ScrollView>

    <ExportOptionsModal
      accounts={accounts}
      exporting={exporting}
      onClose={() => setExportOptionsVisible(false)}
      onExport={(options) => void handleExport(options)}
      visible={exportOptionsVisible}
    />
    </>
  );
}

const parseMissReasonLabels: Record<string, string> = {
  blocked_source: "Blocked source",
  invalid_date: "Unreadable date",
  missing_amount: "No amount found",
  missing_direction: "No debit/credit wording",
  promotional: "Looked promotional",
  unparsed: "Not recognized",
};

function ParseMissCard({
  misses,
  onClear,
}: {
  misses: NotificationParseMiss[];
  onClear: () => void;
}) {
  if (misses.length === 0) {
    return null;
  }

  return (
    <View className="gap-3 border-t-hairline border-t-divider p-4">
      <View className="flex-row items-center gap-2.5">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-black text-ink">
            Skipped notifications
          </Text>
          <Text className="mt-[3px] text-[12px] leading-[17px] text-secondary">
            Recent captures that were not turned into transactions.
          </Text>
        </View>
        <Pressable
          className="rounded-full bg-field px-3 py-1.5"
          onPress={onClear}
        >
          <Text className="text-[11px] font-bold text-ink">Clear</Text>
        </Pressable>
      </View>

      {misses.slice(0, 5).map((miss) => (
        <View
          className="border-t-hairline border-t-divider pt-2.5"
          key={miss.id}
        >
          <Text
            className="text-[12px] font-bold text-ink"
            numberOfLines={1}
          >
            {miss.package_name ?? "Unknown app"}
          </Text>
          <Text className="mt-px text-[11px] font-semibold text-secondary">
            {parseMissReasonLabels[miss.reason] ?? miss.reason}
          </Text>
          {miss.body_preview ? (
            <Text
              className="mt-0.5 text-[11px] text-muted"
              numberOfLines={2}
            >
              {miss.body_preview}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function NotificationDiagnosticsCard({
  diagnostics,
}: {
  diagnostics: ReturnType<
    typeof useNotificationStore.getState
  >["diagnostics"];
}) {
  if (!diagnostics) {
    return (
      <View className="min-h-[76px] justify-center px-4">
        <Text className="mt-[3px] text-[12px] leading-[17px] text-secondary">
          Checking Android notification readiness...
        </Text>
      </View>
    );
  }

  const ready =
    diagnostics.notificationAccessEnabled &&
    diagnostics.postNotificationsGranted;

  return (
    <View className="gap-3.5 p-4">
      <View className="flex-row items-center gap-3">
        <View
          className={`h-[42px] w-[42px] items-center justify-center rounded-control ${
            ready ? "bg-[#dcfce7]" : "bg-[#fff7ed]"
          }`}
        >
          {ready ? (
            <Check color="#16a34a" size={19} strokeWidth={2.8} />
          ) : (
            <ShieldAlert color="#ea580c" size={19} strokeWidth={2.5} />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-black text-ink">
            {ready ? "Background alerts ready" : "Action required"}
          </Text>
          <Text className="mt-[3px] text-[12px] leading-[17px] text-secondary">
            {ready
              ? "Likely transaction messages can trigger an immediate review alert."
              : "Enable both Android notification permissions for automatic detection."}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <DiagnosticValue
          label="Notification access"
          value={
            diagnostics.notificationAccessEnabled ? "Enabled" : "Disabled"
          }
        />
        <DiagnosticValue
          label="Post alerts"
          value={
            diagnostics.postNotificationsGranted ? "Enabled" : "Disabled"
          }
        />
        <DiagnosticValue
          label="Battery"
          value={
            diagnostics.batteryOptimizationExempt
              ? "Unrestricted"
              : "Optimized"
          }
        />
        <DiagnosticValue
          label="Waiting"
          value={
            diagnostics.pendingCaptureCount +
            diagnostics.pendingActionCount +
            " queued"
          }
        />
      </View>

      <View className="flex-row items-center gap-[7px]">
        <Battery color="#64748b" size={15} strokeWidth={2.2} />
        <Text className="flex-1 text-[11px] font-bold text-secondary">
          {diagnostics.lastCapturedAt
            ? "Last captured " +
              formatRelativeSyncTime(diagnostics.lastCapturedAt)
            : "No transaction notification captured yet"}
        </Text>
      </View>
    </View>
  );
}

function DiagnosticValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="basis-[47%] grow gap-[3px] rounded-[13px] bg-field p-[11px]">
      <Text className="text-[10px] font-extrabold text-secondary">{label}</Text>
      <Text className="text-[12px] font-black text-ink">{value}</Text>
    </View>
  );
}

function SettingsSection({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View className="gap-[9px]">
      <Text className="px-1 text-[11px] font-black uppercase tracking-[0.7px] text-secondary">
        {label}
      </Text>
      <View
        className="overflow-hidden rounded-section bg-elevated"
        style={premiumTheme.shadow.floating}
      >
        {children}
      </View>
    </View>
  );
}

function MoreActionRow({
  color,
  disabled = false,
  Icon,
  onPress,
  showDivider = false,
  subtitle,
  title,
  trailingText,
}: {
  color: string;
  disabled?: boolean;
  Icon: RowIcon;
  onPress?: () => void;
  showDivider?: boolean;
  subtitle: string;
  title: string;
  trailingText?: string;
}) {
  const content = (
    <>
      <View
        className="h-10 w-10 items-center justify-center rounded-control"
        style={{ backgroundColor: color + "14" }}
      >
        <Icon color={color} size={21} strokeWidth={2.3} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-black text-ink">{title}</Text>
        <Text className="mt-[3px] text-[12px] leading-[17px] text-secondary">
          {subtitle}
        </Text>
      </View>
      {trailingText ? (
        <Text className="ml-1 text-[11px] font-extrabold text-secondary">
          {trailingText}
        </Text>
      ) : onPress ? (
        <ChevronRight color="#94a3b8" size={20} strokeWidth={2.4} />
      ) : null}
    </>
  );
  const rowClassName = `min-h-[68px] flex-row items-center gap-[13px] px-3.5 py-2.5 ${
    showDivider ? "border-t-hairline border-t-divider" : ""
  }`;

  if (!onPress) {
    return <View className={rowClassName}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      className={`${rowClassName} active:bg-field ${
        disabled ? "opacity-[0.58]" : ""
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

function ProfileMetric({
  color,
  Icon,
  label,
  value,
}: {
  color: string;
  Icon: RowIcon;
  label: string;
  value: number;
}) {
  return (
    <View className="flex-1 items-center gap-[3px]">
      <View
        className="h-[30px] w-[30px] items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "14" }}
      >
        <Icon color={color} size={18} strokeWidth={2.4} />
      </View>
      <Text className="text-[15px] font-black text-ink">
        {value.toLocaleString("en-IN")}
      </Text>
      <Text className="text-[11px] font-bold text-secondary">{label}</Text>
    </View>
  );
}

function formatRelativeSyncTime(value: string) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000)
  );

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return elapsedMinutes + "m ago";

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return elapsedHours + "h ago";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
