import {
  addNotificationListener,
  openNotificationListenerSettings,
  type NativeNotificationPayload,
} from "finance-notification-listener";
import {
  parseNotificationPayload,
  parsedNotificationToEventInput,
} from "@finance/parser";

import type {
  FinancialEventInput,
  ParsedFinancialEvent,
  RawNotificationPayload,
} from "@finance/shared-types";

export interface ParsedNotificationResult {
  event: ParsedFinancialEvent;
  financialEvent: FinancialEventInput;
}

function toRawNotificationPayload(
  payload: NativeNotificationPayload
): RawNotificationPayload {
  return {
    id: payload.id,
    packageName: payload.packageName,
    applicationName: payload.applicationName,
    title: payload.title,
    text: payload.text,
    subText: payload.subText,
    postedAt: payload.postedAt
  };
}

export class NotificationService {
  static openSettings() {
    return openNotificationListenerSettings();
  }

  static parseNotification(
    payload: NativeNotificationPayload
  ): ParsedNotificationResult | null {
    const parsed = parseNotificationPayload(
      toRawNotificationPayload(payload)
    );

    if (!parsed) {
      return null;
    }

    return {
      event: parsed,
      financialEvent: parsedNotificationToEventInput(parsed)
    };
  }

  static subscribe(
    onParsed: (result: ParsedNotificationResult) => void
  ) {
    return addNotificationListener((payload) => {
      const result = NotificationService.parseNotification(payload);

      if (result) {
        onParsed(result);
      }
    });
  }
}
