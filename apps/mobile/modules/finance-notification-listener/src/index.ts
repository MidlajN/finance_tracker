import type { EventSubscription } from "expo-modules-core";

import FinanceNotificationListenerModule, {
  type NativeFinancialEventNotificationAction,
  type NativeNotificationDiagnostics,
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
  body: string,
  notificationKey: string
) {
  return FinanceNotificationListenerModule.showFinancialEventNotification(
    eventId,
    title,
    body,
    notificationKey
  );
}

export function dismissFinancialEventNotification(notificationKey: string) {
  return FinanceNotificationListenerModule.dismissFinancialEventNotification(
    notificationKey
  );
}

export function getNotificationDiagnostics() {
  return FinanceNotificationListenerModule.getNotificationDiagnostics();
}

export function getPendingNotifications() {
  return FinanceNotificationListenerModule.getPendingNotifications();
}

export function markNotificationCaptureProcessed(
  captureId: string,
  eventId: string | null,
  status: string
) {
  return FinanceNotificationListenerModule.markNotificationCaptureProcessed(
    captureId,
    eventId,
    status
  );
}

export function showTestFinancialNotification() {
  return FinanceNotificationListenerModule.showTestFinancialNotification();
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
  NativeNotificationDiagnostics,
  NativeNotificationPayload,
};
