import type { EventSubscription } from "expo-modules-core";
import { create } from "zustand";

import type { NotificationParseMiss } from "@finance/shared-types";

import { LocalNotificationMissRepository } from "../repositories/LocalDatabaseRepository";
import {
  type NativeFinancialEventNotificationAction,
  NotificationService,
  type NativeNotificationDiagnostics,
  type NativeNotificationPayload,
  type ParsedNotificationResult,
} from "../services/NotificationService";
import { useAuthStore } from "./authStore";
import { useOfflineStore } from "./offlineStore";
import { useSyncStore } from "./syncStore";

interface NotificationState {
  error: string | null;
  diagnostics: NativeNotificationDiagnostics | null;
  lastParsedNotification: ParsedNotificationResult | null;
  listening: boolean;
  parseMisses: NotificationParseMiss[];
  reviewEventId: string | null;
  actionSubscription: EventSubscription | null;
  subscription: EventSubscription | null;
  clearParseMisses: () => Promise<void>;
  consumeReviewEventId: () => void;
  openSettings: () => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
  refreshParseMisses: () => Promise<void>;
  sendTestNotification: () => Promise<boolean>;
  startListening: () => void;
  stopListening: () => void;
}

export const useNotificationStore = create<NotificationState>(
  (set, get) => ({
    error: null,
    diagnostics: null,
    lastParsedNotification: null,
    listening: false,
    parseMisses: [],
    reviewEventId: null,
    actionSubscription: null,
    subscription: null,

    async clearParseMisses() {
      await LocalNotificationMissRepository.clear();
      set({ parseMisses: [] });
    },

    async refreshParseMisses() {
      const parseMisses =
        await LocalNotificationMissRepository.list();
      set({ parseMisses });
    },

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

    async refreshDiagnostics() {
      try {
        const diagnostics = await NotificationService.getDiagnostics();
        set({ diagnostics });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Unable to read notification diagnostics.",
        });
      }
    },

    async sendTestNotification() {
      try {
        const shown = await NotificationService.showTestNotification();
        await get().refreshDiagnostics();
        set({
          error: shown
            ? null
            : "Allow Finance Tracker to post notifications first.",
        });
        return shown;
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Unable to show the test notification.",
        });
        return false;
      }
    },

    startListening() {
      if (get().subscription) {
        return;
      }

      const subscription =
        NotificationService.subscribeToCapturedNotifications((payload) => {
          enqueueNotificationWork(() =>
            processCapturedNotification(payload, set)
          );
        });
      const actionSubscription =
        NotificationService.subscribeToFinancialEventActions((action) => {
          enqueueNotificationWork(() =>
            handleFinancialEventNotificationAction(action, set)
          );
        });

      set({
        error: null,
        listening: true,
        actionSubscription,
        subscription
      });

      enqueueNotificationWork(async () => {
        await NotificationService.requestPostNotificationsPermission();
        const pendingNotifications =
          await NotificationService.getPendingNotifications();

        for (const payload of pendingNotifications) {
          await processCapturedNotification(payload, set);
        }

        const actions =
          await NotificationService.getPendingFinancialEventNotificationActions();
        for (const action of actions) {
          await handleFinancialEventNotificationAction(action, set);
        }

        const diagnostics = await NotificationService.getDiagnostics();
        set({ diagnostics });
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

let notificationWork = Promise.resolve();
const completedCaptureIds = new Set<string>();

function enqueueNotificationWork(work: () => Promise<void>) {
  notificationWork = notificationWork
    .then(work)
    .catch((error) => {
      useNotificationStore.setState({
        error:
          error instanceof Error
            ? error.message
            : "Unable to process a captured notification.",
      });
    });
}

async function processCapturedNotification(
  payload: NativeNotificationPayload,
  set: (partial: Partial<NotificationState>) => void
) {
  if (completedCaptureIds.has(payload.captureId)) {
    return;
  }

  const { failure, result } =
    NotificationService.explainNotification(payload);

  if (!result) {
    completedCaptureIds.add(payload.captureId);
    await recordParseMiss(payload, failure);
    await NotificationService.markCaptureProcessed(
      payload.captureId,
      null,
      "ignored"
    );
    await NotificationService.dismissNotification(payload.captureId);
    return;
  }

  const persisted = await useOfflineStore
    .getState()
    .persistParsedNotification(result);

  if (!persisted) {
    throw new Error("Unable to persist the captured transaction.");
  }

  completedCaptureIds.add(payload.captureId);
  await NotificationService.markCaptureProcessed(
    payload.captureId,
    persisted.event.id,
    "pending_review"
  );

  // The native preview is keyed by captureId, which changes when the
  // source app reposts its notification. Dismiss it and key the review
  // notification by event id so recaptures replace instead of stack.
  await NotificationService.dismissNotification(payload.captureId);

  if (persisted.event.status !== "confirmed") {
    const accountId = getEventAccountId(persisted.event.metadata);
    const accountName = accountId
      ? useOfflineStore
          .getState()
          .accounts.find((account) => account.id === accountId)?.name
      : null;

    await NotificationService.showFinancialEventReviewNotification({
      accountName,
      amount: persisted.event.amount,
      currency: persisted.event.currency ?? result.event.currency,
      eventId: persisted.event.id,
      merchantName:
        persisted.event.merchant_name_raw ??
        result.event.merchantName,
      notificationKey: persisted.event.id,
    });
  }

  if (useAuthStore.getState().session) {
    await useSyncStore.getState().synchronize();
  }

  set({
    error: null,
    lastParsedNotification: result,
  });
}

async function recordParseMiss(
  payload: NativeNotificationPayload,
  failure: string | null
) {
  // Blocked sources include personal chats/SMS — record only that
  // something was dropped, never the content.
  const blocked = failure === "blocked_source";

  await LocalNotificationMissRepository.record({
    id: payload.captureId,
    package_name: payload.packageName ?? null,
    title: blocked ? null : payload.title ?? null,
    body_preview: blocked
      ? null
      : payload.text?.replace(/\s+/g, " ").trim().slice(0, 140) ?? null,
    reason: failure ?? "unparsed",
    captured_at: payload.postedAt ?? new Date().toISOString(),
  });
}

async function handleFinancialEventNotificationAction(
  action: NativeFinancialEventNotificationAction,
  set: (partial: Partial<NotificationState>) => void
) {
  try {
    if (action.action === "review") {
      const eventId =
        action.eventId ??
        findEventIdForCapture(action.captureId);

      if (!eventId) {
        throw new Error(
          "The captured transaction is not ready for review yet."
        );
      }

      set({
        error: null,
        reviewEventId: eventId,
      });
      return;
    }

    if (!action.eventId) {
      throw new Error(
        "Open Finance Tracker and review this transaction before processing it."
      );
    }

    if (action.action === "confirm") {
      await useOfflineStore.getState().confirmFinancialEvent(action.eventId);
    } else {
      await useOfflineStore.getState().ignoreFinancialEvent(action.eventId);
    }

    if (action.captureId) {
      await NotificationService.markCaptureProcessed(
        action.captureId,
        action.eventId,
        action.action === "confirm" ? "confirmed" : "ignored"
      );
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

function findEventIdForCapture(captureId: string | null) {
  if (!captureId) return null;

  return (
    useOfflineStore
      .getState()
      .events.find(
        (event) =>
          getEventCaptureId(event.metadata) === captureId
      )?.id ?? null
  );
}

function getEventCaptureId(metadata: unknown) {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const captureId = (metadata as Record<string, unknown>).capture_id;
  return typeof captureId === "string" && captureId.trim()
    ? captureId
    : null;
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
