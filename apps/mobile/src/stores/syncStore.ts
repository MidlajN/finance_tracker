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

// A run already in flight may be past its push stage, so it cannot carry
// writes enqueued after it started. Callers arriving mid-run share one
// queued follow-up run instead of returning early — awaiting synchronize()
// must always mean "everything enqueued before the call is pushed and the
// results pulled". Confirm/save flows rely on this to land back on the
// list with the new row already present.
let activeRun: Promise<void> | null = null;
let queuedRun: Promise<void> | null = null;

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
    if (activeRun) {
      if (!queuedRun) {
        queuedRun = activeRun.then(() => {
          queuedRun = null;

          return get().synchronize();
        });
      }

      return queuedRun;
    }

    activeRun = (async () => {
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
    })();

    try {
      await activeRun;
    } finally {
      activeRun = null;
    }
  },
}));
