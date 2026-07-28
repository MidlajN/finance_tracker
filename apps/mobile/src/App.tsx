import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  CommonActions,
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

import {
  AppBottomNavigation,
  type AppBottomNavigationRoute,
  getBottomNavigationRoute,
} from "./components/AppBottomNavigation";
import { AppNavigator } from "./navigation/AppNavigator";
import { useAuthStore } from "./stores/authStore";
import { useNotificationStore } from "./stores/notificationStore";
import { useOfflineStore } from "./stores/offlineStore";
import { useSyncStore } from "./stores/syncStore";
import type { RootStackParamList } from "./types/navigation";

const APP_CANVAS_COLOR = "#f8fafc";

void SystemUI.setBackgroundColorAsync(APP_CANVAS_COLOR);

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeRoute, setActiveRoute] =
    useState<AppBottomNavigationRoute>("Dashboard");
  const [navigationReady, setNavigationReady] = useState(false);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const startListening = useNotificationStore((state) => state.startListening);
  const stopListening = useNotificationStore((state) => state.stopListening);
  const reviewEventId = useNotificationStore((state) => state.reviewEventId);
  const consumeReviewEventId = useNotificationStore(
    (state) => state.consumeReviewEventId
  );
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

  useEffect(() => {
    if (!session || !navigationReady || !reviewEventId) {
      return;
    }

    navigationRef.navigate("EventReview", {
      eventId: reviewEventId,
    });
    consumeReviewEventId();
  }, [
    consumeReviewEventId,
    navigationReady,
    navigationRef,
    reviewEventId,
    session,
  ]);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  function syncActiveRoute() {
    const routeName = navigationRef.getCurrentRoute()
      ?.name as keyof RootStackParamList | undefined;

    if (routeName) {
      setActiveRoute(getBottomNavigationRoute(routeName));
    }
  }

  function navigateFromBottomBar(route: AppBottomNavigationRoute) {
    if (navigationRef.isReady()) {
      const routes =
        route === "Dashboard"
          ? [{ name: "Dashboard" as const }]
          : [
              { name: "Dashboard" as const },
              { name: route },
            ];

      navigationRef.dispatch(
        CommonActions.reset({
          index: routes.length - 1,
          routes,
        })
      );
    }
  }

  return (
    <NavigationContainer
      onReady={() => {
        setNavigationReady(true);
        syncActiveRoute();
      }}
      onStateChange={syncActiveRoute}
      ref={navigationRef}
    >
      <StatusBar style="auto" />
      <View style={styles.appShell}>
        <View style={styles.navigator}>
          <AppNavigator />
        </View>
        {session && (
          <AppBottomNavigation
            activeRoute={activeRoute}
            onNavigate={navigateFromBottomBar}
          />
        )}
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  appShell: {
    backgroundColor: APP_CANVAS_COLOR,
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  navigator: {
    flex: 1,
  }
});
