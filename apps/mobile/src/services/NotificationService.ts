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
  explainNotificationParse,
  parsedNotificationToEventInput,
  type NotificationParseFailure,
} from "@finance/parser";

import type {
  EventDirection,
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

  // Must mirror the native previewNotificationKey exactly: the capture
  // preview is posted under package|sbn-key (stable across reposts, so
  // reposts replace instead of stack), not under the per-post captureId.
  static getCapturePreviewKey(payload: NativeNotificationPayload) {
    return `${payload.packageName}|${payload.id}`;
  }

  static showFinancialEventReviewNotification({
    accountName,
    amount,
    currency,
    direction,
    eventId,
    merchantName,
    notificationKey,
  }: {
    accountName?: string | null;
    amount: number;
    currency: string;
    direction: EventDirection;
    eventId: string;
    merchantName: string | null;
    notificationKey: string;
  }) {
    const merchant = merchantName?.trim();
    const account = accountName?.trim();
    const amountLabel = formatNotificationAmount(amount, currency);
    const title =
      direction === "credit"
        ? merchant
          ? `${amountLabel} received from ${merchant}`
          : `${amountLabel} received`
        : merchant
          ? `${amountLabel} spent at ${merchant}`
          : `${amountLabel} spent`;
    const body = account
      ? `${account} · Confirm, review, or ignore.`
      : "Confirm, review, or ignore.";

    return showFinancialEventNotification(
      eventId,
      title,
      body,
      notificationKey
    );
  }

  static parseNotification(
    payload: NativeNotificationPayload
  ): ParsedNotificationResult | null {
    return NotificationService.explainNotification(payload).result;
  }

  static explainNotification(payload: NativeNotificationPayload): {
    failure: NotificationParseFailure | null;
    result: ParsedNotificationResult | null;
  } {
    // Source trust (blocked/unknown/trusted) is enforced inside the
    // parser itself.
    const outcome = explainNotificationParse(
      toRawNotificationPayload(payload)
    );

    if (!outcome.event) {
      return { failure: outcome.failure, result: null };
    }

    return {
      failure: null,
      result: {
        event: outcome.event,
        financialEvent: parsedNotificationToEventInput(outcome.event),
      },
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
  // Indian digit grouping (₹1,00,000); whole amounts drop the ".00" so
  // the notification title stays scannable.
  const formatted = amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });

  if (normalizedCurrency === "INR") {
    return `₹${formatted}`;
  }

  return `${normalizedCurrency} ${formatted}`;
}

export type { NativeFinancialEventNotificationAction };
export type { NativeNotificationDiagnostics, NativeNotificationPayload };
export type { NotificationParseFailure };
