package com.financeplatform.notifications

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.UUID

class FinanceNotificationListenerModule : Module() {
  @Volatile
  private var observingActions = false

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
    }

    OnStopObserving("onNotification") {
      observingNotifications = false
    }

    OnStartObserving("onFinancialEventNotificationAction") {
      observingActions = true
    }

    OnStopObserving("onFinancialEventNotificationAction") {
      observingActions = false
    }

    OnDestroy {
      observingActions = false
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
      body: String,
      notificationKey: String ->
      val context = appContext.reactContext ?: return@AsyncFunction

      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
          context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
          PackageManager.PERMISSION_GRANTED
      ) {
        return@AsyncFunction
      }

      showFinancialEventNotification(
        context,
        eventId,
        title,
        body,
        notificationKey
      )
    }

    AsyncFunction("dismissFinancialEventNotification") {
      notificationKey: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      notificationManager(context).cancel(
        FinanceNotificationActionReceiver.notificationId(notificationKey)
      )
    }

    AsyncFunction("getPendingNotifications") {
      val context = appContext.reactContext?.applicationContext
        ?: return@AsyncFunction emptyList<Map<String, Any?>>()
      drainPendingNotifications(context)
    }

    AsyncFunction("markNotificationCaptureProcessed") {
      captureId: String,
      eventId: String?,
      status: String ->
      val context = appContext.reactContext?.applicationContext
        ?: return@AsyncFunction
      markCaptureProcessed(context, captureId, eventId, status)
    }

    AsyncFunction("getNotificationDiagnostics") {
      val context = appContext.reactContext?.applicationContext
        ?: return@AsyncFunction emptyMap<String, Any?>()
      getDiagnostics(context)
    }

    AsyncFunction("showTestFinancialNotification") {
      val context = appContext.reactContext?.applicationContext
        ?: return@AsyncFunction false
      showTestNotification(context)
    }

    AsyncFunction("getPendingFinancialEventNotificationActions") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, String>>()
      FinanceNotificationActionReceiver.drainPendingActions(context)
    }
  }

  companion object {
    private const val CHANNEL_ID = "finance_event_review"
    private const val DIAGNOSTICS_PREFERENCES =
      "finance_notification_diagnostics"
    private const val LAST_CAPTURED_AT_KEY = "last_captured_at"
    private const val LAST_ERROR_KEY = "last_error"
    private const val LAST_PREVIEW_AT_KEY = "last_preview_at"
    private const val LAST_PROCESSED_AT_KEY = "last_processed_at"
    private const val MAX_PENDING_NOTIFICATIONS = 100
    private const val MAX_PROCESSED_CAPTURES = 200
    private const val NOTIFICATION_QUEUE_KEY = "pending_notifications"
    private const val NOTIFICATION_QUEUE_PREFERENCES =
      "finance_notification_listener"
    private const val PROCESSED_CAPTURE_IDS_KEY = "processed_capture_ids"
    private const val POST_NOTIFICATIONS_REQUEST_CODE = 9371
    private var activeModule: FinanceNotificationListenerModule? = null
    private val amountPattern = Regex(
      """(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?""",
      RegexOption.IGNORE_CASE
    )
    private val transactionPattern = Regex(
      """\b(spent|debited|credited|paid|received|withdrawn|purchase|transaction|trxn|txn)\b""",
      RegexOption.IGNORE_CASE
    )

    fun captureNotification(
      context: Context,
      payload: Map<String, Any?>
    ) {
      val captureId = createCaptureId(payload)
      if (hasProcessedCapture(context, captureId)) {
        return
      }

      val enrichedPayload = payload + ("captureId" to captureId)
      recordDiagnostic(context, LAST_CAPTURED_AT_KEY, Instant.now().toString())
      enqueueNotification(context, enrichedPayload)

      if (looksLikeFinancialTransaction(enrichedPayload)) {
        runCatching {
          showCapturePreview(context, captureId, enrichedPayload)
        }.onFailure { error ->
          recordDiagnostic(
            context,
            LAST_ERROR_KEY,
            error.message ?: "Unable to show transaction preview."
          )
        }
      }

      val module = activeModule

      if (module?.observingNotifications == true) {
        module.sendEvent("onNotification", enrichedPayload)
      }
    }

    fun emitFinancialEventAction(payload: Map<String, String>): Boolean {
      val module = activeModule
      if (module?.observingActions != true) {
        return false
      }

      module.sendEvent("onFinancialEventNotificationAction", payload)
      return true
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
      val captureId = payload["captureId"]?.toString().orEmpty()

      for (index in 0 until queue.length()) {
        if (queue.optJSONObject(index)?.optString("captureId") == captureId) {
          return
        }
      }

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
            "captureId" to item.requiredString("captureId"),
            "packageName" to item.requiredString("packageName"),
            "applicationName" to item.optionalString("applicationName"),
            "title" to item.optionalString("title"),
            "text" to item.optionalString("text"),
            "subText" to item.optionalString("subText"),
            "postedAt" to item.requiredString("postedAt")
          )
        )
      }

      return payloads
    }

    private fun createCaptureId(payload: Map<String, Any?>): String {
      val source = listOf(
        payload["packageName"],
        payload["id"],
        payload["postedAt"]
      ).joinToString("|") { it?.toString().orEmpty() }

      return UUID.nameUUIDFromBytes(
        source.toByteArray(StandardCharsets.UTF_8)
      ).toString()
    }

    private fun looksLikeFinancialTransaction(
      payload: Map<String, Any?>
    ): Boolean {
      val text = listOf(
        payload["title"],
        payload["text"],
        payload["subText"]
      ).joinToString(" ") { it?.toString().orEmpty() }

      return amountPattern.containsMatchIn(text) &&
        transactionPattern.containsMatchIn(text)
    }

    private fun hasPostNotificationPermission(context: Context): Boolean =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
          PackageManager.PERMISSION_GRANTED

    private fun isNotificationAccessEnabled(context: Context): Boolean {
      val enabledListeners = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      ).orEmpty()
      val expected = ComponentName(
        context,
        FinanceNotificationListenerService::class.java
      )

      return enabledListeners
        .split(":")
        .mapNotNull(ComponentName::unflattenFromString)
        .any { component -> component == expected }
    }

    private fun createNotificationChannel(manager: NotificationManager) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

      val channel = NotificationChannel(
        CHANNEL_ID,
        "Transaction review",
        NotificationManager.IMPORTANCE_HIGH
      )
      channel.description = "Review captured financial activity."
      manager.createNotificationChannel(channel)
    }

    private fun notificationBuilder(context: Context): Notification.Builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, CHANNEL_ID)
      } else {
        Notification.Builder(context)
      }

    private fun smallIcon(context: Context): Int =
      if (context.applicationInfo.icon != 0) {
        context.applicationInfo.icon
      } else {
        android.R.drawable.ic_dialog_info
      }

    private fun showCapturePreview(
      context: Context,
      captureId: String,
      payload: Map<String, Any?>
    ) {
      if (!hasPostNotificationPermission(context)) return

      val manager = notificationManager(context)
      createNotificationChannel(manager)
      val source = payload["applicationName"]?.toString()
        ?.takeIf(String::isNotBlank)
        ?: "Financial notification"
      val rawText = payload["text"]?.toString()
        ?.replace(Regex("\\s+"), " ")
        ?.trim()
        ?.take(180)
        .orEmpty()
      val body = if (rawText.isBlank()) {
        "$source · Open Finance Tracker to review."
      } else {
        "$source · $rawText"
      }
      val icon = smallIcon(context)
      val privateNotification = notificationBuilder(context)
        .setSmallIcon(icon)
        .setContentTitle("Transaction detected")
        .setContentText(body)
        .setStyle(Notification.BigTextStyle().bigText(body))
        .setContentIntent(
          FinanceNotificationActionReceiver.pendingIntent(
            context,
            null,
            captureId,
            FinanceNotificationActionReceiver.ACTION_REVIEW,
            0
          )
        )
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .setPriority(Notification.PRIORITY_HIGH)
        .setVisibility(Notification.VISIBILITY_PRIVATE)
        .addAction(
          Notification.Action.Builder(
            icon,
            "Review",
            FinanceNotificationActionReceiver.pendingIntent(
              context,
              null,
              captureId,
              FinanceNotificationActionReceiver.ACTION_REVIEW,
              1
            )
          ).build()
        )
        .build()

      manager.notify(
        FinanceNotificationActionReceiver.notificationId(captureId),
        privateNotification
      )
      recordDiagnostic(context, LAST_PREVIEW_AT_KEY, Instant.now().toString())
    }

    @Synchronized
    private fun markCaptureProcessed(
      context: Context,
      captureId: String,
      eventId: String?,
      status: String
    ) {
      val preferences = context.getSharedPreferences(
        NOTIFICATION_QUEUE_PREFERENCES,
        Context.MODE_PRIVATE
      )
      val processed = runCatching {
        JSONArray(preferences.getString(PROCESSED_CAPTURE_IDS_KEY, "[]"))
      }.getOrElse { JSONArray() }
      val updatedProcessed = JSONArray()
      for (index in 0 until processed.length()) {
        val existing = processed.optJSONObject(index) ?: continue
        if (existing.optString("captureId") != captureId) {
          updatedProcessed.put(existing)
        }
      }
      val record = JSONObject()
        .put("captureId", captureId)
        .put("eventId", eventId ?: JSONObject.NULL)
        .put("status", status)
        .put("processedAt", Instant.now().toString())

      updatedProcessed.put(record)
      while (updatedProcessed.length() > MAX_PROCESSED_CAPTURES) {
        updatedProcessed.remove(0)
      }

      val queue = runCatching {
        JSONArray(preferences.getString(NOTIFICATION_QUEUE_KEY, "[]"))
      }.getOrElse { JSONArray() }
      val remaining = JSONArray()
      for (index in 0 until queue.length()) {
        val item = queue.optJSONObject(index) ?: continue
        if (item.optString("captureId") != captureId) {
          remaining.put(item)
        }
      }

      preferences.edit()
        .putString(PROCESSED_CAPTURE_IDS_KEY, updatedProcessed.toString())
        .putString(NOTIFICATION_QUEUE_KEY, remaining.toString())
        .apply()
      recordDiagnostic(context, LAST_PROCESSED_AT_KEY, Instant.now().toString())
      recordDiagnostic(context, LAST_ERROR_KEY, null)
    }

    private fun hasProcessedCapture(context: Context, captureId: String): Boolean {
      val preferences = context.getSharedPreferences(
        NOTIFICATION_QUEUE_PREFERENCES,
        Context.MODE_PRIVATE
      )
      val processed = runCatching {
        JSONArray(preferences.getString(PROCESSED_CAPTURE_IDS_KEY, "[]"))
      }.getOrElse { JSONArray() }

      for (index in 0 until processed.length()) {
        if (
          processed.optJSONObject(index)?.optString("captureId") == captureId
        ) {
          return true
        }
      }

      return false
    }

    private fun pendingCaptureCount(context: Context): Int {
      val preferences = context.getSharedPreferences(
        NOTIFICATION_QUEUE_PREFERENCES,
        Context.MODE_PRIVATE
      )
      return runCatching {
        JSONArray(preferences.getString(NOTIFICATION_QUEUE_KEY, "[]")).length()
      }.getOrDefault(0)
    }

    private fun getDiagnostics(context: Context): Map<String, Any?> {
      val diagnostics = context.getSharedPreferences(
        DIAGNOSTICS_PREFERENCES,
        Context.MODE_PRIVATE
      )
      val powerManager =
        context.getSystemService(Context.POWER_SERVICE) as PowerManager

      return mapOf(
        "batteryOptimizationExempt" to
          powerManager.isIgnoringBatteryOptimizations(context.packageName),
        "lastCapturedAt" to diagnostics.getString(LAST_CAPTURED_AT_KEY, null),
        "lastError" to diagnostics.getString(LAST_ERROR_KEY, null),
        "lastPreviewAt" to diagnostics.getString(LAST_PREVIEW_AT_KEY, null),
        "lastProcessedAt" to diagnostics.getString(LAST_PROCESSED_AT_KEY, null),
        "notificationAccessEnabled" to isNotificationAccessEnabled(context),
        "pendingActionCount" to
          FinanceNotificationActionReceiver.pendingActionCount(context),
        "pendingCaptureCount" to pendingCaptureCount(context),
        "postNotificationsGranted" to hasPostNotificationPermission(context)
      )
    }

    private fun recordDiagnostic(
      context: Context,
      key: String,
      value: String?
    ) {
      val preferences = context.getSharedPreferences(
        DIAGNOSTICS_PREFERENCES,
        Context.MODE_PRIVATE
      )
      val editor = preferences.edit()
      if (value == null) {
        editor.remove(key)
      } else {
        editor.putString(key, value)
      }
      editor.apply()
    }

    private fun showTestNotification(context: Context): Boolean {
      if (!hasPostNotificationPermission(context)) return false

      val manager = notificationManager(context)
      createNotificationChannel(manager)
      val launchIntent = context.packageManager.getLaunchIntentForPackage(
        context.packageName
      ) ?: return false
      val pendingIntent = PendingIntent.getActivity(
        context,
        9107,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE
          } else {
            0
          }
      )
      val body =
        "Background transaction alerts are enabled. This test creates no financial data."
      val notification = notificationBuilder(context)
        .setSmallIcon(smallIcon(context))
        .setContentTitle("Transaction alerts are ready")
        .setContentText(body)
        .setStyle(Notification.BigTextStyle().bigText(body))
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)
        .setPriority(Notification.PRIORITY_HIGH)
        .build()

      manager.notify(9107, notification)
      return true
    }

    private fun notificationManager(context: Context): NotificationManager =
      context.getSystemService(
        Context.NOTIFICATION_SERVICE
      ) as NotificationManager

    private fun JSONObject.requiredString(key: String): String =
      if (isNull(key)) "" else optString(key, "")

    private fun JSONObject.optionalString(key: String): String? =
      if (!has(key) || isNull(key)) null else getString(key)

    private fun showFinancialEventNotification(
      context: Context,
      eventId: String,
      title: String,
      body: String,
      notificationKey: String
    ) {
      val manager = notificationManager(context)
      val notificationId =
        FinanceNotificationActionReceiver.notificationId(notificationKey)

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
            notificationKey,
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
              notificationKey,
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
              notificationKey,
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
              notificationKey,
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
