export interface NativeNotificationPayload {
  id: string;
  packageName: string;
  applicationName: string | null;
  title: string | null;
  text: string | null;
  subText: string | null;
  postedAt: string;
}
