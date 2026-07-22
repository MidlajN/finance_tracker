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
    val eventId = intent.getStringExtra(EXTRA_EVENT_ID) ?: return
    val action = when (intent.action) {
      ACTION_CONFIRM -> "confirm"
      ACTION_IGNORE -> "ignore"
      ACTION_REVIEW -> "review"
      else -> return
    }
    val payload = mapOf(
      "action" to action,
      "eventId" to eventId,
      "receivedAt" to Instant.now().toString()
    )

    storePendingAction(context, payload)
    FinanceNotificationListenerModule.emitFinancialEventAction(payload)
    cancelNotification(context, eventId)

    if (action == "review") {
      openApplication(context)
    }
  }

  companion object {
    const val ACTION_CONFIRM = "com.financeplatform.notifications.CONFIRM_EVENT"
    const val ACTION_IGNORE = "com.financeplatform.notifications.IGNORE_EVENT"
    const val ACTION_REVIEW = "com.financeplatform.notifications.REVIEW_EVENT"
    private const val EXTRA_EVENT_ID = "eventId"
    private const val PREFERENCES_NAME = "finance_notification_actions"
    private const val PENDING_ACTIONS_KEY = "pending_actions"

    fun pendingIntent(
      context: Context,
      eventId: String,
      action: String,
      requestOffset: Int
    ): PendingIntent {
      val intent = Intent(context, FinanceNotificationActionReceiver::class.java)
      intent.action = action
      intent.putExtra(EXTRA_EVENT_ID, eventId)

      val flags =
        PendingIntent.FLAG_UPDATE_CURRENT or
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE
          } else {
            0
          }

      return PendingIntent.getBroadcast(
        context,
        abs((eventId + action).hashCode()) + requestOffset,
        intent,
        flags
      )
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
        val receivedAt = item.optString("receivedAt")

        if (action.isNotBlank() && eventId.isNotBlank()) {
          result.add(
            mapOf(
              "action" to action,
              "eventId" to eventId,
              "receivedAt" to receivedAt
            )
          )
        }
      }

      preferences.edit().putString(PENDING_ACTIONS_KEY, "[]").apply()

      return result
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
