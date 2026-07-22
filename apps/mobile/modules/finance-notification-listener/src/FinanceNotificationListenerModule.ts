import { requireNativeModule, type EventSubscription } from "expo-modules-core";

import type {
  NativeFinancialEventNotificationAction,
  NativeNotificationPayload,
} from "./types";

interface FinanceNotificationListenerNativeModule {
  getPendingFinancialEventNotificationActions: () => Promise<
    NativeFinancialEventNotificationAction[]
  >;
  openNotificationListenerSettings: () => Promise<void>;
  requestPostNotificationsPermission: () => Promise<boolean>;
  showFinancialEventNotification: (
    eventId: string,
    title: string,
    body: string
  ) => Promise<void>;
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
  NativeNotificationPayload,
};
