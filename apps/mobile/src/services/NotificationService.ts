import {
  addNotificationListener,
  addFinancialEventNotificationActionListener,
  dismissFinancialEventNotification,
  getNotificationDiagnostics,
  getPendingFinancialEventNotificationActions,
  getPendingNotifications,
  markNotificationCaptureProcessed,
  openNotificationListenerSettings,
  requestPostNotificationsPermission,
  showFinancialEventNotification,
  showTestFinancialNotification,
  type NativeFinancialEventNotificationAction,
  type NativeNotificationDiagnostics,
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
    captureId: payload.captureId,
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

  static requestPostNotificationsPermission() {
    return requestPostNotificationsPermission();
  }

  static getPendingFinancialEventNotificationActions() {
    return getPendingFinancialEventNotificationActions().then((actions) =>
      actions.map(normalizeNotificationAction)
    );
  }

  static getPendingNotifications() {
    return getPendingNotifications();
  }

  static getDiagnostics() {
    return getNotificationDiagnostics();
  }

  static showTestNotification() {
    return showTestFinancialNotification();
  }

  static markCaptureProcessed(
    captureId: string,
    eventId: string | null,
    status: "confirmed" | "ignored" | "pending_review"
  ) {
    return markNotificationCaptureProcessed(
      captureId,
      eventId,
      status
    );
  }

  static dismissNotification(notificationKey: string) {
    return dismissFinancialEventNotification(notificationKey);
  }

  static showFinancialEventReviewNotification({
    accountName,
    amount,
    currency,
    eventId,
    merchantName,
    notificationKey,
  }: {
    accountName?: string | null;
    amount: number;
    currency: string;
    eventId: string;
    merchantName: string | null;
    notificationKey: string;
  }) {
    const merchant = merchantName?.trim() || "Unknown merchant";
    const account = accountName?.trim();
    const details = [
      merchant,
      formatNotificationAmount(amount, currency),
      account ? `Account: ${account}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return showFinancialEventNotification(
      eventId,
      "Review",
      `${details}. Confirm, review details, or ignore.`,
      notificationKey
    );
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

  static subscribeToCapturedNotifications(
    listener: (payload: NativeNotificationPayload) => void
  ) {
    return addNotificationListener(listener);
  }

  static subscribeToFinancialEventActions(
    onAction: (result: NativeFinancialEventNotificationAction) => void
  ) {
    return addFinancialEventNotificationActionListener((action) => {
      onAction(normalizeNotificationAction(action));
    });
  }
}

function normalizeNotificationAction(
  action: NativeFinancialEventNotificationAction
): NativeFinancialEventNotificationAction {
  return {
    ...action,
    captureId: action.captureId?.trim() || null,
    eventId: action.eventId?.trim() || null,
  };
}

function formatNotificationAmount(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (normalizedCurrency === "INR") {
    return `₹${amount.toFixed(2)}`;
  }

  return `${normalizedCurrency} ${amount.toFixed(2)}`;
}

export type { NativeFinancialEventNotificationAction };
export type { NativeNotificationDiagnostics, NativeNotificationPayload };
