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
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FinancialDataExportService } from "../services/FinancialDataExportService";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";
import { premiumHairline, premiumTheme } from "../theme/premiumTheme";
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
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [testNotificationStatus, setTestNotificationStatus] =
    useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshNotificationDiagnostics();
    }, [refreshNotificationDiagnostics])
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

  async function handleExport() {
    if (exporting) return;

    setExporting(true);
    setExportStatus(null);

    try {
      const fileName = await FinancialDataExportService.exportTransactions(
        transactions,
        accounts
      );
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
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 12 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <View style={styles.profileGlow} />
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "U"}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.profileName}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={styles.profileEmail}>
              {email}
            </Text>
          </View>
          <View style={styles.profileSecurityBadge}>
            <ShieldCheck
              color={premiumTheme.colors.success}
              size={21}
              strokeWidth={2.3}
            />
          </View>
        </View>

        <View style={styles.profileMetrics}>
          <ProfileMetric
            Icon={Landmark}
            color="#6d4aff"
            label="Accounts"
            value={accounts.length}
          />
          <View style={styles.metricDivider} />
          <ProfileMetric
            Icon={ReceiptText}
            color="#16a34a"
            label="Transactions"
            value={transactions.length}
          />
          <View style={styles.metricDivider} />
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
          onPress={() => void handleExport()}
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

      <View style={styles.securityCard}>
        <View style={styles.securityIcon}>
          <ShieldCheck color="#315efb" size={25} strokeWidth={2.3} />
        </View>
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>Your data stays available</Text>
          <Text style={styles.securityText}>
            Financial data is cached for offline use and synced to your signed-in
            account.
          </Text>
        </View>
      </View>

      <Pressable
        disabled={authLoading}
        onPress={() => void signOut()}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.rowPressed,
          authLoading && styles.disabled,
        ]}
      >
        <LogOut color="#dc2626" size={19} strokeWidth={2.4} />
        <Text style={styles.signOutText}>
          {authLoading ? "Signing out..." : "Sign out"}
        </Text>
      </Pressable>
    </ScrollView>
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
      <View style={styles.diagnosticsLoading}>
        <Text style={styles.rowSubtitle}>
          Checking Android notification readiness...
        </Text>
      </View>
    );
  }

  const ready =
    diagnostics.notificationAccessEnabled &&
    diagnostics.postNotificationsGranted;

  return (
    <View style={styles.diagnosticsCard}>
      <View style={styles.diagnosticsHeader}>
        <View
          style={[
            styles.diagnosticsStatusIcon,
            {
              backgroundColor: ready ? "#dcfce7" : "#fff7ed",
            },
          ]}
        >
          {ready ? (
            <Check color="#16a34a" size={19} strokeWidth={2.8} />
          ) : (
            <ShieldAlert color="#ea580c" size={19} strokeWidth={2.5} />
          )}
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>
            {ready ? "Background alerts ready" : "Action required"}
          </Text>
          <Text style={styles.rowSubtitle}>
            {ready
              ? "Likely transaction messages can trigger an immediate review alert."
              : "Enable both Android notification permissions for automatic detection."}
          </Text>
        </View>
      </View>

      <View style={styles.diagnosticsGrid}>
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

      <View style={styles.diagnosticsFooter}>
        <Battery color="#64748b" size={15} strokeWidth={2.2} />
        <Text style={styles.diagnosticsFooterText}>
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
    <View style={styles.diagnosticValue}>
      <Text style={styles.diagnosticValueLabel}>{label}</Text>
      <Text style={styles.diagnosticValueText}>{value}</Text>
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
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
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
      <View style={[styles.rowIcon, { backgroundColor: color + "14" }]}>
        <Icon color={color} size={21} strokeWidth={2.3} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {trailingText ? (
        <Text style={styles.trailingText}>{trailingText}</Text>
      ) : onPress ? (
        <ChevronRight color="#94a3b8" size={20} strokeWidth={2.4} />
      ) : null}
    </>
  );
  const rowStyle = [styles.actionRow, showDivider && styles.actionRowDivider];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ...rowStyle,
        pressed && styles.rowPressed,
        disabled && styles.disabled,
      ]}
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
    <View style={styles.profileMetric}>
      <View style={[styles.metricIcon, { backgroundColor: color + "14" }]}>
        <Icon color={color} size={18} strokeWidth={2.4} />
      </View>
      <Text style={styles.metricValue}>{value.toLocaleString("en-IN")}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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

const styles = StyleSheet.create({
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionRowDivider: {
    borderTopColor: premiumTheme.colors.divider,
    borderTopWidth: premiumHairline,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.accentSoft,
    borderRadius: 999,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  avatarText: {
    color: premiumTheme.colors.accent,
    fontSize: 19,
    fontWeight: "900",
  },
  container: {
    backgroundColor: premiumTheme.colors.canvas,
    gap: 20,
    padding: 20,
    paddingBottom: 32,
  },
  disabled: {
    opacity: 0.58,
  },
  diagnosticValue: {
    backgroundColor: premiumTheme.colors.field,
    borderRadius: 13,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 3,
    padding: 11,
  },
  diagnosticValueLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
  },
  diagnosticValueText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "900",
  },
  diagnosticsCard: {
    gap: 14,
    padding: 16,
  },
  diagnosticsFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  diagnosticsFooterText: {
    color: "#64748b",
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  diagnosticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  diagnosticsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  diagnosticsLoading: {
    minHeight: 76,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  diagnosticsStatusIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  metricDivider: {
    backgroundColor: premiumTheme.colors.divider,
    height: 44,
    width: 1,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  metricLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    color: premiumTheme.colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  profileCard: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.surface,
    overflow: "hidden",
    ...premiumTheme.shadow.raised,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileEmail: {
    color: premiumTheme.colors.secondary,
    fontSize: 13,
    marginTop: 4,
  },
  profileGlow: {
    backgroundColor: "rgba(109, 74, 255, 0.08)",
    borderRadius: 999,
    height: 150,
    position: "absolute",
    right: -48,
    top: -72,
    width: 150,
  },
  profileMetric: {
    alignItems: "center",
    flex: 1,
    gap: 3,
  },
  profileMetrics: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.canvas,
    borderTopColor: premiumTheme.colors.divider,
    borderTopWidth: premiumHairline,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 13,
  },
  profileName: {
    color: premiumTheme.colors.ink,
    fontSize: 19,
    fontWeight: "900",
  },
  profileSecurityBadge: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.successSoft,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  profileTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  rowPressed: {
    backgroundColor: premiumTheme.colors.field,
  },
  rowSubtitle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  rowTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  section: {
    gap: 9,
  },
  sectionCard: {
    backgroundColor: premiumTheme.colors.elevated,
    borderRadius: premiumTheme.radius.section,
    overflow: "hidden",
    ...premiumTheme.shadow.floating,
  },
  sectionLabel: {
    color: premiumTheme.colors.secondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    paddingHorizontal: 4,
    textTransform: "uppercase",
  },
  securityCard: {
    alignItems: "center",
    backgroundColor: "#f2f5ff",
    borderRadius: premiumTheme.radius.section,
    flexDirection: "row",
    gap: 13,
    padding: 17,
  },
  securityCopy: {
    flex: 1,
  },
  securityIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 15,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  securityText: {
    color: "#526079",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  securityTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: premiumTheme.colors.dangerSoft,
    borderRadius: 17,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 52,
  },
  signOutText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "900",
  },
  trailingText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },
});
