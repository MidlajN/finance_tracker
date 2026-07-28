import { requireNativeModule, type EventSubscription } from "expo-modules-core";

import type {
  NativeFinancialEventNotificationAction,
  NativeNotificationDiagnostics,
  NativeNotificationPayload,
} from "./types";

interface FinanceNotificationListenerNativeModule {
  dismissFinancialEventNotification: (
    notificationKey: string
  ) => Promise<void>;
  getNotificationDiagnostics: () => Promise<NativeNotificationDiagnostics>;
  getPendingNotifications: () => Promise<NativeNotificationPayload[]>;
  getPendingFinancialEventNotificationActions: () => Promise<
    NativeFinancialEventNotificationAction[]
  >;
  markNotificationCaptureProcessed: (
    captureId: string,
    eventId: string | null,
    status: string
  ) => Promise<void>;
  openNotificationListenerSettings: () => Promise<void>;
  requestPostNotificationsPermission: () => Promise<boolean>;
  showFinancialEventNotification: (
    eventId: string,
    title: string,
    body: string,
    notificationKey: string
  ) => Promise<void>;
  showTestFinancialNotification: () => Promise<boolean>;
}

type FinanceNotificationListenerEvents = {
  onFinancialEventNotificationAction: (
    payload: NativeFinancialEventNotificationAction
  ) => void;
  onNotification: (payload: NativeNotificationPayload) => void;
};

export default requireNativeModule<
  FinanceNotificationListenerNativeModule & {
    addListener: <EventName extends keyof FinanceNotificationListenerEvents>(
      eventName: EventName,
      listener: FinanceNotificationListenerEvents[EventName]
    ) => EventSubscription;
    removeListener: <EventName extends keyof FinanceNotificationListenerEvents>(
      eventName: EventName,
      listener: FinanceNotificationListenerEvents[EventName]
    ) => void;
    removeAllListeners: (
      eventName: keyof FinanceNotificationListenerEvents
    ) => void;
  }
>("FinanceNotificationListener");

export type {
  NativeFinancialEventNotificationAction,
  NativeNotificationDiagnostics,
  NativeNotificationPayload,
};
