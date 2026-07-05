import type { EventSubscription } from "expo-modules-core";

import FinanceNotificationListenerModule, {
  type NativeNotificationPayload,
} from "./FinanceNotificationListenerModule";

export function openNotificationListenerSettings() {
  return FinanceNotificationListenerModule.openNotificationListenerSettings();
}

export function addNotificationListener(
  listener: (payload: NativeNotificationPayload) => void
): EventSubscription {
  return FinanceNotificationListenerModule.addListener(
    "onNotification",
    listener
  );
}

export type { NativeNotificationPayload };
