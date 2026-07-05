import { requireNativeModule, type EventSubscription } from "expo-modules-core";

import type { NativeNotificationPayload } from "./types";

interface FinanceNotificationListenerNativeModule {
  openNotificationListenerSettings: () => Promise<void>;
}

type FinanceNotificationListenerEvents = {
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

export type { NativeNotificationPayload };
