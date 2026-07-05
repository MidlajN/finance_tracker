import type { EventSubscription } from "expo-modules-core";
import { create } from "zustand";

import {
  NotificationService,
  type ParsedNotificationResult,
} from "../services/NotificationService";
import { useAuthStore } from "./authStore";
import { useOfflineStore } from "./offlineStore";
import { useSyncStore } from "./syncStore";

interface NotificationState {
  error: string | null;
  lastParsedNotification: ParsedNotificationResult | null;
  listening: boolean;
  subscription: EventSubscription | null;
  openSettings: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
}

export const useNotificationStore = create<NotificationState>(
  (set, get) => ({
    error: null,
    lastParsedNotification: null,
    listening: false,
    subscription: null,

    async openSettings() {
      try {
        await NotificationService.openSettings();
        set({ error: null });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Unable to open notification access settings."
        });
      }
    },

    startListening() {
      if (get().subscription) {
        return;
      }

      const subscription = NotificationService.subscribe((result) => {
        void useOfflineStore
          .getState()
          .persistParsedNotification(result)
          .then(() => {
            if (useAuthStore.getState().session) {
              void useSyncStore.getState().synchronize();
            }
          });

        set({
          error: null,
          lastParsedNotification: result
        });
      });

      set({
        error: null,
        listening: true,
        subscription
      });
    },

    stopListening() {
      get().subscription?.remove();

      set({
        listening: false,
        subscription: null
      });
    }
  })
);
