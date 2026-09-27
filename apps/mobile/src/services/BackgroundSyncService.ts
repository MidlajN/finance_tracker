import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { SyncService } from "./SyncService";

const BACKGROUND_SYNC_TASK = "finance-background-sync";

if (!TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      // Joins a foreground run already in flight instead of racing it.
      const result = await SyncService.synchronizeIfIdle();

      // Report items still unpushed (offline, server error) as a failed
      // run. The periodic schedule retries them on its next window.
      return result.failed > 0
        ? BackgroundTask.BackgroundTaskResult.Failed
        : BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export class BackgroundSyncService {
  static register() {
    return BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15,
    });
  }

  static unregister() {
    return BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  }
}
