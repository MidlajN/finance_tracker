import type { NativeNotificationPayload } from "../services/NotificationService";
import { processCapturedNotificationHeadless } from "../stores/notificationStore";

// Intent extras arrive as strings (or are absent) — the native side
// stringifies every payload value before starting the service.
type HeadlessCapturePayload = Partial<
  Record<keyof NativeNotificationPayload, string>
>;

// Android headless task: the notification listener starts this when no
// foreground JS is observing (app killed or backgrounded), so parsing,
// persistence, and the review notification all happen without the user
// opening the app. Registered under "FinanceNotificationCapture" in
// index.ts; the name must match FinanceNotificationHeadlessTaskService.
export async function financeNotificationCaptureTask(
  data: HeadlessCapturePayload
) {
  if (!data?.captureId || !data.id || !data.packageName || !data.postedAt) {
    return;
  }

  await processCapturedNotificationHeadless({
    applicationName: data.applicationName ?? null,
    captureId: data.captureId,
    id: data.id,
    packageName: data.packageName,
    postedAt: data.postedAt,
    subText: data.subText ?? null,
    text: data.text ?? null,
    title: data.title ?? null,
  });
}
