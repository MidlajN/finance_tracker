import type { EventSubscription } from "expo-modules-core";

import FinanceNotificationListenerModule, {
  type NativeFinancialEventNotificationAction,
  type NativeNotificationPayload,
} from "./FinanceNotificationListenerModule";

export function openNotificationListenerSettings() {
  return FinanceNotificationListenerModule.openNotificationListenerSettings();
}

export function requestPostNotificationsPermission() {
  return FinanceNotificationListenerModule.requestPostNotificationsPermission();
}

export function showFinancialEventNotification(
  eventId: string,
  title: string,
  body: string
) {
  return FinanceNotificationListenerModule.showFinancialEventNotification(
    eventId,
    title,
    body
  );
}

export function getPendingFinancialEventNotificationActions() {
  return FinanceNotificationListenerModule.getPendingFinancialEventNotificationActions();
}

export function addNotificationListener(
  listener: (payload: NativeNotificationPayload) => void
): EventSubscription {
  return FinanceNotificationListenerModule.addListener(
    "onNotification",
    listener
  );
}

export function addFinancialEventNotificationActionListener(
  listener: (payload: NativeFinancialEventNotificationAction) => void
): EventSubscription {
  return FinanceNotificationListenerModule.addListener(
    "onFinancialEventNotificationAction",
    listener
  );
}

export type {
  NativeFinancialEventNotificationAction,
  NativeNotificationPayload,
};
