/**
 * Notification preferences for zone events (stored in localStorage).
 * Used by NotificationSettings and municipality-dashboard for event toasts.
 */

export const NOTIFICATION_PREFERENCES_KEY = "notification_preferences";

export type ToastPosition =
  | "top-right"
  | "top-center"
  | "top-left"
  | "bottom-right"
  | "bottom-center"
  | "bottom-left";

export interface NotificationPreferences {
  /** Show zone event toasts at all */
  enabled: boolean;
  /** Play sound when a zone event toast is shown */
  soundEnabled: boolean;
  /** Position of the toast on screen */
  toastPosition: ToastPosition;
  /** How long the toast stays visible (seconds) */
  toastDurationSeconds: number;
}

const defaults: NotificationPreferences = {
  enabled: true,
  soundEnabled: true,
  toastPosition: "top-left",
  toastDurationSeconds: 8.5,
};

export function getDefaultNotificationPreferences(): NotificationPreferences {
  return { ...defaults };
}

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return getDefaultNotificationPreferences();
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
    if (!raw) return getDefaultNotificationPreferences();
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      enabled: parsed.enabled ?? defaults.enabled,
      soundEnabled: parsed.soundEnabled ?? defaults.soundEnabled,
      toastPosition: parsed.toastPosition ?? defaults.toastPosition,
      toastDurationSeconds:
        typeof parsed.toastDurationSeconds === "number" && parsed.toastDurationSeconds > 0
          ? parsed.toastDurationSeconds
          : defaults.toastDurationSeconds,
    };
  } catch {
    return getDefaultNotificationPreferences();
  }
}

export function setNotificationPreferences(prefs: Partial<NotificationPreferences>): void {
  if (typeof window === "undefined") return;
  try {
    const current = getNotificationPreferences();
    const next = { ...current, ...prefs };
    localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
