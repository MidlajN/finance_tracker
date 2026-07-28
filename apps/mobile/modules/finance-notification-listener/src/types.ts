export interface NativeNotificationPayload {
  id: string;
  captureId: string;
  packageName: string;
  applicationName: string | null;
  title: string | null;
  text: string | null;
  subText: string | null;
  postedAt: string;
}

export type NativeFinancialEventNotificationActionType =
  | "confirm"
  | "ignore"
  | "review";

export interface NativeFinancialEventNotificationAction {
  action: NativeFinancialEventNotificationActionType;
  captureId: string | null;
  eventId: string | null;
  receivedAt: string;
}

export interface NativeNotificationDiagnostics {
  batteryOptimizationExempt: boolean;
  lastCapturedAt: string | null;
  lastError: string | null;
  lastPreviewAt: string | null;
  lastProcessedAt: string | null;
  notificationAccessEnabled: boolean;
  pendingActionCount: number;
  pendingCaptureCount: number;
  postNotificationsGranted: boolean;
}
