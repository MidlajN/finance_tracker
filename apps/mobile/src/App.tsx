import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import { AppNavigator } from "./navigation/AppNavigator";
import { useAuthStore } from "./stores/authStore";
import { useNotificationStore } from "./stores/notificationStore";
import { useOfflineStore } from "./stores/offlineStore";
import { useSyncStore } from "./stores/syncStore";

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const startListening = useNotificationStore((state) => state.startListening);
  const stopListening = useNotificationStore((state) => state.stopListening);
  const initializeOfflineStorage = useOfflineStore(
    (state) => state.initialize
  );
  const startRealtimeSync = useSyncStore((state) => state.startRealtime);
  const startBackgroundSync = useSyncStore(
    (state) => state.startBackgroundSync
  );
  const stopRealtimeSync = useSyncStore((state) => state.stopRealtime);
  const stopBackgroundSync = useSyncStore(
    (state) => state.stopBackgroundSync
  );
  const synchronize = useSyncStore((state) => state.synchronize);

  useEffect(() => {
    void initializeOfflineStorage();
    void initializeAuth();
    startListening();

    return stopListening;
  }, [
    initializeAuth,
    initializeOfflineStorage,
    startListening,
    stopListening,
  ]);

  useEffect(() => {
    if (!initialized || !session) {
      stopRealtimeSync();
      void stopBackgroundSync();
      return undefined;
    }

    startRealtimeSync();
    void startBackgroundSync();
    void synchronize();

    return () => {
      stopRealtimeSync();
      void stopBackgroundSync();
    };
  }, [
    initialized,
    session,
    startBackgroundSync,
    startRealtimeSync,
    stopBackgroundSync,
    stopRealtimeSync,
    synchronize,
  ]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const interval = setInterval(() => {
      void synchronize();
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, [session, synchronize]);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
