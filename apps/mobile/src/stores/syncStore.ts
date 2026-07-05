import { create } from "zustand";

import { BackgroundSyncService } from "../services/BackgroundSyncService";
import { SyncService, type SyncResult } from "../services/SyncService";
import { useOfflineStore } from "./offlineStore";

interface SyncState {
  backgroundRegistered: boolean;
  error: string | null;
  lastResult: SyncResult | null;
  lastSyncedAt: string | null;
  realtimeUnsubscribe: (() => void) | null;
  syncing: boolean;
  startBackgroundSync: () => Promise<void>;
  startRealtime: () => void;
  stopBackgroundSync: () => Promise<void>;
  stopRealtime: () => void;
  synchronize: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  backgroundRegistered: false,
  error: null,
  lastResult: null,
  lastSyncedAt: null,
  realtimeUnsubscribe: null,
  syncing: false,

  async startBackgroundSync() {
    if (get().backgroundRegistered) {
      return;
    }

    try {
      await BackgroundSyncService.register();

      set({
        backgroundRegistered: true,
        error: null,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to register background synchronization.",
      });
    }
  },

  startRealtime() {
    if (get().realtimeUnsubscribe) {
      return;
    }

    const realtimeUnsubscribe = SyncService.subscribeToRemoteChanges(
      () => {
        void get().synchronize();
      }
    );

    set({
      realtimeUnsubscribe,
    });
  },

  async stopBackgroundSync() {
    if (!get().backgroundRegistered) {
      return;
    }

    try {
      await BackgroundSyncService.unregister();

      set({
        backgroundRegistered: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to unregister background synchronization.",
      });
    }
  },

  stopRealtime() {
    get().realtimeUnsubscribe?.();

    set({
      realtimeUnsubscribe: null,
    });
  },

  async synchronize() {
    if (get().syncing) {
      return;
    }

    set({
      error: null,
      syncing: true,
    });

    try {
      const result = await SyncService.synchronize();

      await useOfflineStore.getState().refresh();

      set({
        error: null,
        lastResult: result,
        lastSyncedAt: new Date().toISOString(),
        syncing: false,
      });
    } catch (error) {
      await useOfflineStore.getState().refresh();

      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to synchronize.",
        syncing: false,
      });
    }
  },
}));
