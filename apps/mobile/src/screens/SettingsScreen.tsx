import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { useOfflineStore } from "../stores/offlineStore";
import { useSyncStore } from "../stores/syncStore";

export function SettingsScreen() {
  const signOut = useAuthStore((state) => state.signOut);
  const loading = useAuthStore((state) => state.loading);
  const openNotificationSettings = useNotificationStore(
    (state) => state.openSettings
  );
  const notificationError = useNotificationStore((state) => state.error);
  const lastParsedNotification = useNotificationStore(
    (state) => state.lastParsedNotification
  );
  const offlineError = useOfflineStore((state) => state.error);
  const cachedEvents = useOfflineStore((state) => state.events);
  const cachedMerchants = useOfflineStore((state) => state.merchants);
  const cachedCategories = useOfflineStore((state) => state.categories);
  const cachedBudgets = useOfflineStore((state) => state.budgets);
  const cachedRules = useOfflineStore((state) => state.rules);
  const syncQueue = useOfflineStore((state) => state.queue);
  const syncError = useSyncStore((state) => state.error);
  const syncing = useSyncStore((state) => state.syncing);
  const backgroundRegistered = useSyncStore(
    (state) => state.backgroundRegistered
  );
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.description}>
        Authentication is shared with the web client through Supabase.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification access</Text>
        <Text style={styles.description}>
          Android notification payloads are parsed into Financial Events before
          synchronization.
        </Text>

        {lastParsedNotification && (
          <Text style={styles.description}>
            Last parsed: {lastParsedNotification.event.merchantName ?? "Unknown"}{" "}
            {lastParsedNotification.event.amount}{" "}
            {lastParsedNotification.event.currency}
          </Text>
        )}

        {notificationError && (
          <Text style={styles.error}>{notificationError}</Text>
        )}

        {offlineError && <Text style={styles.error}>{offlineError}</Text>}
        {syncError && <Text style={styles.error}>{syncError}</Text>}

        <Pressable
          onPress={() => {
            void openNotificationSettings();
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Open access settings</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offline storage</Text>
        <Text style={styles.description}>
          Cached events: {cachedEvents.length}
        </Text>
        <Text style={styles.description}>
          Cached transactions and references: {cachedMerchants.length} merchants,{" "}
          {cachedCategories.length} categories, {cachedBudgets.length} budgets
        </Text>
        <Text style={styles.description}>
          Cached rules: {cachedRules.length}
        </Text>
        <Text style={styles.description}>
          Pending sync operations: {syncQueue.length}
        </Text>
        <Text style={styles.description}>
          Sync status: {syncing ? "Syncing" : "Idle"}
        </Text>
        <Text style={styles.description}>
          Background sync: {backgroundRegistered ? "Registered" : "Inactive"}
        </Text>
        {lastSyncedAt && (
          <Text style={styles.description}>
            Last sync: {new Date(lastSyncedAt).toLocaleString()}
          </Text>
        )}
      </View>

      <Pressable
        disabled={loading}
        onPress={() => {
          void signOut();
        }}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  container: {
    flex: 1,
    gap: 16,
    padding: 20
  },
  description: {
    color: "#475569",
    fontSize: 16
  },
  error: {
    color: "#b91c1c",
    fontSize: 14
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#2563eb",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "700"
  },
  section: {
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800"
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800"
  }
});
