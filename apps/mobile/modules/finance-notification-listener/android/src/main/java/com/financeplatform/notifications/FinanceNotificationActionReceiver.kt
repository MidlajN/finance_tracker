package com.financeplatform.notifications

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import kotlin.math.abs

class FinanceNotificationActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val eventId = intent.getStringExtra(EXTRA_EVENT_ID)
    val captureId = intent.getStringExtra(EXTRA_CAPTURE_ID)
    val action = when (intent.action) {
      ACTION_CONFIRM -> "confirm"
      ACTION_IGNORE -> "ignore"
      ACTION_REVIEW -> "review"
      else -> return
    }
    if (eventId.isNullOrBlank() && captureId.isNullOrBlank()) {
      return
    }
    val payload = mapOf(
      "action" to action,
      "eventId" to (eventId ?: ""),
      "captureId" to (captureId ?: ""),
      "receivedAt" to Instant.now().toString()
    )

    if (!FinanceNotificationListenerModule.emitFinancialEventAction(payload)) {
      storePendingAction(context, payload)
    }
    cancelNotification(context, captureId ?: eventId.orEmpty())

    if (action == "review") {
      openApplication(context)
    }
  }

  companion object {
    const val ACTION_CONFIRM = "com.financeplatform.notifications.CONFIRM_EVENT"
    const val ACTION_IGNORE = "com.financeplatform.notifications.IGNORE_EVENT"
    const val ACTION_REVIEW = "com.financeplatform.notifications.REVIEW_EVENT"
    private const val EXTRA_CAPTURE_ID = "captureId"
    private const val EXTRA_EVENT_ID = "eventId"
    private const val PREFERENCES_NAME = "finance_notification_actions"
    private const val PENDING_ACTIONS_KEY = "pending_actions"

    fun pendingIntent(
      context: Context,
      eventId: String?,
      captureId: String,
      action: String,
      requestOffset: Int
    ): PendingIntent {
      if (action == ACTION_REVIEW) {
        return reviewPendingIntent(
          context,
          eventId,
          captureId,
          requestOffset
        )
      }

      val intent = Intent(context, FinanceNotificationActionReceiver::class.java)
      intent.action = action
      intent.putExtra(EXTRA_EVENT_ID, eventId ?: "")
      intent.putExtra(EXTRA_CAPTURE_ID, captureId)

      val flags =
        PendingIntent.FLAG_UPDATE_CURRENT or
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE
          } else {
            0
          }

      return PendingIntent.getBroadcast(
        context,
        abs((captureId + action).hashCode()) + requestOffset,
        intent,
        flags
      )
    }

    fun handleReviewLaunch(context: Context, intent: Intent): Boolean {
      if (intent.action != ACTION_REVIEW) {
        return false
      }

      val eventId = intent.getStringExtra(EXTRA_EVENT_ID)
      val captureId = intent.getStringExtra(EXTRA_CAPTURE_ID)
      if (eventId.isNullOrBlank() && captureId.isNullOrBlank()) {
        return false
      }

      val payload = mapOf(
        "action" to "review",
        "eventId" to (eventId ?: ""),
        "captureId" to (captureId ?: ""),
        "receivedAt" to Instant.now().toString()
      )

      if (!FinanceNotificationListenerModule.emitFinancialEventAction(payload)) {
        storePendingAction(context, payload)
      }
      cancelNotification(context, captureId ?: eventId.orEmpty())

      // Prevent the same action from being processed again if Android
      // recreates the activity with its existing launch intent.
      intent.action = null

      return true
    }

    fun notificationId(eventId: String): Int {
      return abs(eventId.hashCode())
    }

    fun drainPendingActions(context: Context): List<Map<String, String>> {
      val preferences = context.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE
      )
      val serialized = preferences.getString(PENDING_ACTIONS_KEY, "[]") ?: "[]"
      val actions = JSONArray(serialized)
      val result = mutableListOf<Map<String, String>>()

      for (index in 0 until actions.length()) {
        val item = actions.optJSONObject(index) ?: continue
        val action = item.optString("action")
        val eventId = item.optString("eventId")
        val captureId = item.optString("captureId")
        val receivedAt = item.optString("receivedAt")

        if (
          action.isNotBlank() &&
            (eventId.isNotBlank() || captureId.isNotBlank())
        ) {
          result.add(
            mapOf(
              "action" to action,
              "eventId" to eventId,
              "captureId" to captureId,
              "receivedAt" to receivedAt
            )
          )
        }
      }

      preferences.edit().putString(PENDING_ACTIONS_KEY, "[]").apply()

      return result
    }

    fun pendingActionCount(context: Context): Int {
      val preferences = context.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE
      )
      val serialized = preferences.getString(PENDING_ACTIONS_KEY, "[]") ?: "[]"
      return runCatching { JSONArray(serialized).length() }.getOrDefault(0)
    }

    private fun storePendingAction(
      context: Context,
      payload: Map<String, String>
    ) {
      val preferences = context.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE
      )
      val serialized = preferences.getString(PENDING_ACTIONS_KEY, "[]") ?: "[]"
      val actions = JSONArray(serialized)
      val action = JSONObject()

      payload.forEach { (key, value) ->
        action.put(key, value)
      }

      actions.put(action)
      preferences.edit().putString(PENDING_ACTIONS_KEY, actions.toString()).apply()
    }

    private fun reviewPendingIntent(
      context: Context,
      eventId: String?,
      captureId: String,
      requestOffset: Int
    ): PendingIntent {
      val intent = context.packageManager.getLaunchIntentForPackage(
        context.packageName
      ) ?: Intent()

      intent.action = ACTION_REVIEW
      intent.putExtra(EXTRA_EVENT_ID, eventId ?: "")
      intent.putExtra(EXTRA_CAPTURE_ID, captureId)
      intent.addFlags(
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
      )

      val flags =
        PendingIntent.FLAG_UPDATE_CURRENT or
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE
          } else {
            0
          }

      return PendingIntent.getActivity(
        context,
        abs((captureId + ACTION_REVIEW).hashCode()) + requestOffset,
        intent,
        flags
      )
    }

    private fun cancelNotification(context: Context, eventId: String) {
      val manager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.cancel(notificationId(eventId))
    }

    private fun openApplication(context: Context) {
      val intent = context.packageManager.getLaunchIntentForPackage(
        context.packageName
      ) ?: return

      intent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_CLEAR_TOP
      )
      context.startActivity(intent)
    }
  }
}
