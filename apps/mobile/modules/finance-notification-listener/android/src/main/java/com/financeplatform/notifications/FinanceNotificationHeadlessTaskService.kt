package com.financeplatform.notifications

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

// Runs the JS capture pipeline (parse, persist, review notification)
// while the app UI is closed. Started by captureNotification when no
// foreground JS is observing; the task itself is registered in index.ts
// under the same name.
class FinanceNotificationHeadlessTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null

    return HeadlessJsTaskConfig(
      TASK_NAME,
      Arguments.fromBundle(extras),
      TASK_TIMEOUT_MS,
      // The listener only starts this service when no JS is observing,
      // so allowing foreground execution is safe and avoids dropping a
      // capture that races an app launch.
      true
    )
  }

  companion object {
    const val TASK_NAME = "FinanceNotificationCapture"
    private const val TASK_TIMEOUT_MS = 60_000L
  }
}
