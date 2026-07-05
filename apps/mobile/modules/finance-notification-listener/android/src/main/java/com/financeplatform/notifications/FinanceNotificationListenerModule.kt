package com.financeplatform.notifications

import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FinanceNotificationListenerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FinanceNotificationListener")

    Events("onNotification")

    OnCreate {
      activeModule = this@FinanceNotificationListenerModule
    }

    OnDestroy {
      if (activeModule === this@FinanceNotificationListenerModule) {
        activeModule = null
      }
    }

    AsyncFunction("openNotificationListenerSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      appContext.reactContext?.startActivity(intent)
    }
  }

  companion object {
    private var activeModule: FinanceNotificationListenerModule? = null

    fun emitNotification(payload: Map<String, Any?>) {
      activeModule?.sendEvent("onNotification", payload)
    }
  }
}
