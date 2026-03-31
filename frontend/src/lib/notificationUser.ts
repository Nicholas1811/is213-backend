const FALLBACK_NOTIFICATION_USER_ID = "temp-user-id";

export function resolveNotificationUserId(subject?: string | null): string {
  return subject || FALLBACK_NOTIFICATION_USER_ID;
}

