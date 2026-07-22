package com.financeplatform.notifications

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class FinanceNotificationListenerModule : Module() {
  @Volatile
  private var observingNotifications = false

  override fun definition() = ModuleDefinition {
    Name("FinanceNotificationListener")

    Events("onNotification", "onFinancialEventNotificationAction")

    OnCreate {
      activeModule = this@FinanceNotificationListenerModule
    }

    OnStartObserving("onNotification") {
      observingNotifications = true

      val context = appContext.reactContext?.applicationContext
        ?: return@OnStartObserving

      drainPendingNotifications(context).forEach { payload ->
        sendEvent("onNotification", payload)
      }
    }

    OnStopObserving("onNotification") {
      observingNotifications = false
    }

    OnDestroy {
      observingNotifications = false

      if (activeModule === this@FinanceNotificationListenerModule) {
        activeModule = null
      }
    }

    AsyncFunction("openNotificationListenerSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      appContext.reactContext?.startActivity(intent)
    }

    AsyncFunction("requestPostNotificationsPermission") {
      val context = appContext.reactContext ?: return@AsyncFunction false

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        return@AsyncFunction true
      }

      if (
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
          PackageManager.PERMISSION_GRANTED
      ) {
        return@AsyncFunction true
      }

      val activity = appContext.currentActivity ?: return@AsyncFunction false
      activity.requestPermissions(
        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
        POST_NOTIFICATIONS_REQUEST_CODE
      )

      false
    }

    AsyncFunction("showFinancialEventNotification") {
      eventId: String,
      title: String,
      body: String ->
      val context = appContext.reactContext ?: return@AsyncFunction

      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
          context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
          PackageManager.PERMISSION_GRANTED
      ) {
        return@AsyncFunction
      }

      showFinancialEventNotification(context, eventId, title, body)
    }

    AsyncFunction("getPendingFinancialEventNotificationActions") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, String>>()
      FinanceNotificationActionReceiver.drainPendingActions(context)
    }
  }

  companion object {
    private const val CHANNEL_ID = "finance_event_review"
    private const val MAX_PENDING_NOTIFICATIONS = 100
    private const val NOTIFICATION_QUEUE_KEY = "pending_notifications"
    private const val NOTIFICATION_QUEUE_PREFERENCES =
      "finance_notification_listener"
    private const val POST_NOTIFICATIONS_REQUEST_CODE = 9371
    private var activeModule: FinanceNotificationListenerModule? = null

    fun captureNotification(
      context: Context,
      payload: Map<String, Any?>
    ) {
      val module = activeModule

      if (module?.observingNotifications == true) {
        module.sendEvent("onNotification", payload)
        return
      }

      enqueueNotification(context, payload)
    }

    fun emitFinancialEventAction(payload: Map<String, String>) {
      activeModule?.sendEvent("onFinancialEventNotificationAction", payload)
    }

    @Synchronized
    private fun enqueueNotification(
      context: Context,
      payload: Map<String, Any?>
    ) {
      val preferences = context.getSharedPreferences(
        NOTIFICATION_QUEUE_PREFERENCES,
        Context.MODE_PRIVATE
      )
      val queue = runCatching {
        JSONArray(preferences.getString(NOTIFICATION_QUEUE_KEY, "[]"))
      }.getOrElse { JSONArray() }

      while (queue.length() >= MAX_PENDING_NOTIFICATIONS) {
        queue.remove(0)
      }

      val serializedPayload = JSONObject()
      payload.forEach { (key, value) ->
        serializedPayload.put(key, value ?: JSONObject.NULL)
      }
      queue.put(serializedPayload)

      preferences.edit()
        .putString(NOTIFICATION_QUEUE_KEY, queue.toString())
        .apply()
    }

    @Synchronized
    private fun drainPendingNotifications(
      context: Context
    ): List<Map<String, Any?>> {
      val preferences = context.getSharedPreferences(
        NOTIFICATION_QUEUE_PREFERENCES,
        Context.MODE_PRIVATE
      )
      val queue = runCatching {
        JSONArray(preferences.getString(NOTIFICATION_QUEUE_KEY, "[]"))
      }.getOrElse { JSONArray() }
      val payloads = mutableListOf<Map<String, Any?>>()

      for (index in 0 until queue.length()) {
        val item = queue.optJSONObject(index) ?: continue
        payloads.add(
          mapOf(
            "id" to item.requiredString("id"),
            "packageName" to item.requiredString("packageName"),
            "applicationName" to item.optionalString("applicationName"),
            "title" to item.optionalString("title"),
            "text" to item.optionalString("text"),
            "subText" to item.optionalString("subText"),
            "postedAt" to item.requiredString("postedAt")
          )
        )
      }

      preferences.edit().remove(NOTIFICATION_QUEUE_KEY).apply()

      return payloads
    }

    private fun JSONObject.requiredString(key: String): String =
      if (isNull(key)) "" else optString(key, "")

    private fun JSONObject.optionalString(key: String): String? =
      if (!has(key) || isNull(key)) null else getString(key)

    private fun showFinancialEventNotification(
      context: Context,
      eventId: String,
      title: String,
      body: String
    ) {
      val manager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val notificationId = FinanceNotificationActionReceiver.notificationId(eventId)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          "Transaction review",
          NotificationManager.IMPORTANCE_HIGH
        )
        channel.description = "Confirm or ignore captured financial events."
        manager.createNotificationChannel(channel)
      }

      val builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          Notification.Builder(context, CHANNEL_ID)
        } else {
          Notification.Builder(context)
        }

      val smallIcon =
        if (context.applicationInfo.icon != 0) {
          context.applicationInfo.icon
        } else {
          android.R.drawable.ic_dialog_info
        }

      val notification = builder
        .setSmallIcon(smallIcon)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(Notification.BigTextStyle().bigText(body))
        .setContentIntent(
          FinanceNotificationActionReceiver.pendingIntent(
            context,
            eventId,
            FinanceNotificationActionReceiver.ACTION_REVIEW,
            0
          )
        )
        .setAutoCancel(true)
        .setPriority(Notification.PRIORITY_HIGH)
        .addAction(
          Notification.Action.Builder(
            smallIcon,
            "Confirm",
            FinanceNotificationActionReceiver.pendingIntent(
              context,
              eventId,
              FinanceNotificationActionReceiver.ACTION_CONFIRM,
              1
            )
          ).build()
        )
        .addAction(
          Notification.Action.Builder(
            smallIcon,
            "Review",
            FinanceNotificationActionReceiver.pendingIntent(
              context,
              eventId,
              FinanceNotificationActionReceiver.ACTION_REVIEW,
              2
            )
          ).build()
        )
        .addAction(
          Notification.Action.Builder(
            smallIcon,
            "Ignore",
            FinanceNotificationActionReceiver.pendingIntent(
              context,
              eventId,
              FinanceNotificationActionReceiver.ACTION_IGNORE,
              3
            )
          ).build()
        )
        .build()

      manager.notify(notificationId, notification)
    }
  }
}
