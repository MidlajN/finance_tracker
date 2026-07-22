export interface NativeNotificationPayload {
  id: string;
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
  eventId: string;
  receivedAt: string;
}
