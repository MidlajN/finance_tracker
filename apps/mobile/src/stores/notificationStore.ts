import type { EventSubscription } from "expo-modules-core";
import { create } from "zustand";

import {
  type NativeFinancialEventNotificationAction,
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
  reviewEventId: string | null;
  actionSubscription: EventSubscription | null;
  subscription: EventSubscription | null;
  consumeReviewEventId: () => void;
  openSettings: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
}

export const useNotificationStore = create<NotificationState>(
  (set, get) => ({
    error: null,
    lastParsedNotification: null,
    listening: false,
    reviewEventId: null,
    actionSubscription: null,
    subscription: null,

    consumeReviewEventId() {
      set({
        reviewEventId: null,
      });
    },

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

      void NotificationService.requestPostNotificationsPermission();
      void NotificationService
        .getPendingFinancialEventNotificationActions()
        .then((actions) => {
          actions.forEach((action) => {
            void handleFinancialEventNotificationAction(action, set);
          });
        });

      const subscription = NotificationService.subscribe((result) => {
        void useOfflineStore
          .getState()
          .persistParsedNotification(result)
          .then((persisted) => {
            if (persisted && persisted.event.status !== "confirmed") {
              const accountId = getEventAccountId(persisted.event.metadata);
              const accountName = accountId
                ? useOfflineStore
                    .getState()
                    .accounts.find((account) => account.id === accountId)?.name
                : null;

              void NotificationService.showFinancialEventReviewNotification({
                accountName,
                amount: persisted.event.amount,
                currency: persisted.event.currency ?? result.event.currency,
                eventId: persisted.event.id,
                merchantName:
                  persisted.event.merchant_name_raw ??
                  result.event.merchantName,
              });
            }

            if (useAuthStore.getState().session) {
              void useSyncStore.getState().synchronize();
            }
          });

        set({
          error: null,
          lastParsedNotification: result
        });
      });
      const actionSubscription =
        NotificationService.subscribeToFinancialEventActions((action) => {
          void handleFinancialEventNotificationAction(action, set);
        });

      set({
        error: null,
        listening: true,
        actionSubscription,
        subscription
      });
    },

    stopListening() {
      get().subscription?.remove();
      get().actionSubscription?.remove();

      set({
        actionSubscription: null,
        listening: false,
        subscription: null
      });
    }
  })
);

async function handleFinancialEventNotificationAction(
  action: NativeFinancialEventNotificationAction,
  set: (partial: Partial<NotificationState>) => void
) {
  try {
    if (action.action === "review") {
      set({
        error: null,
        reviewEventId: action.eventId,
      });
      return;
    }

    if (action.action === "confirm") {
      await useOfflineStore.getState().confirmFinancialEvent(action.eventId);
    } else {
      await useOfflineStore.getState().ignoreFinancialEvent(action.eventId);
    }

    if (useAuthStore.getState().session) {
      await useSyncStore.getState().synchronize();
      await useOfflineStore.getState().refresh();
    }

    set({
      error: null,
    });
  } catch (error) {
    set({
      error:
        error instanceof Error
          ? error.message
          : "Unable to handle notification action.",
    });
  }
}

function getEventAccountId(metadata: unknown) {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const accountId = (metadata as Record<string, unknown>).account_id;

  return typeof accountId === "string" && accountId.trim()
    ? accountId
    : null;
}
