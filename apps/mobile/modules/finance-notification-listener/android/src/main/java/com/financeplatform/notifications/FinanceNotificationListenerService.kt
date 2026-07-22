package com.financeplatform.notifications

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class FinanceNotificationListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName) {
      return
    }

    val notification = sbn.notification ?: return
    val extras = notification.extras

    val applicationName = runCatching {
      val applicationInfo = packageManager.getApplicationInfo(sbn.packageName, 0)
      packageManager.getApplicationLabel(applicationInfo).toString()
    }.getOrNull()

    val payload = mapOf(
      "id" to sbn.key,
      "packageName" to sbn.packageName,
      "applicationName" to applicationName,
      "title" to extras.getCharSequence("android.title")?.toString(),
      "text" to extras.getCharSequence("android.text")?.toString(),
      "subText" to extras.getCharSequence("android.subText")?.toString(),
      "postedAt" to java.time.Instant.ofEpochMilli(sbn.postTime).toString()
    )

    FinanceNotificationListenerModule.captureNotification(
      applicationContext,
      payload
    )
  }
}
