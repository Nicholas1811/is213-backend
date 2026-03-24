import axios from "axios";
import { create } from "zustand";
import { ENDPOINTS } from "@/api/endpoints";

interface ApiNotification {
  Id?: number;
  message?: string;
  createdAt?: string;
  notification_type?: string;
  userId?: string;
  title?: string;
  event_uuid?: string;
}

interface ApiNotificationResponse {
  all_notifications?: ApiNotification[] | ApiNotification;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  eventUuid?: string;
  backendId?: number;
  notificationType?: string;
}

interface UpsertOptions {
  countAsUnread: boolean;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hydrateFromApi: (userId: string) => Promise<void>;
  refreshFromApi: (userId: string) => Promise<void>;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

function normalizeCreatedAt(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function toNotificationItem(raw: ApiNotification): NotificationItem {
  const backendId = typeof raw.Id === "number" ? raw.Id : undefined;
  const eventUuid = raw.event_uuid || undefined;

  return {
    id: eventUuid || String(backendId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: raw.title || "Notification",
    body: raw.message || "You have a new update.",
    receivedAt: normalizeCreatedAt(raw.createdAt),
    eventUuid,
    backendId,
    notificationType: raw.notification_type || undefined,
  };
}

function getDedupKey(item: NotificationItem): string {
  if (item.eventUuid) return `event:${item.eventUuid}`;
  if (typeof item.backendId === "number") return `id:${item.backendId}`;
  return `fallback:${item.title}:${item.body}:${item.receivedAt}`;
}

function upsertNotifications(
  existing: NotificationItem[],
  incoming: NotificationItem[],
  options: UpsertOptions
): { merged: NotificationItem[]; addedCount: number; unreadToAdd: number } {
  const byKey = new Map<string, NotificationItem>();

  for (const item of existing) {
    byKey.set(getDedupKey(item), item);
  }

  let addedCount = 0;
  for (const item of incoming) {
    const key = getDedupKey(item);
    if (!byKey.has(key)) {
      addedCount += 1;
      byKey.set(key, item);
    }
  }

  const merged = Array.from(byKey.values())
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 50);

  return {
    merged,
    addedCount,
    unreadToAdd: options.countAsUnread ? addedCount : 0,
  };
}

async function fetchNotificationsFromApi(userId: string): Promise<NotificationItem[]> {
  const { data } = await axios.get<ApiNotificationResponse | ApiNotification[]>(
    ENDPOINTS.USER_NOTIFICATIONS(userId)
  );

  const rawList = Array.isArray(data)
    ? data
    : Array.isArray(data.all_notifications)
      ? data.all_notifications
      : data.all_notifications
        ? [data.all_notifications]
        : [];

  return rawList.map(toNotificationItem);
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  hydrateFromApi: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const incoming = await fetchNotificationsFromApi(userId);
      const next = upsertNotifications(get().notifications, incoming, { countAsUnread: false });
      set({ notifications: next.merged, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load notifications";
      set({ isLoading: false, error: message });
    }
  },

  refreshFromApi: async (userId) => {
    try {
      const incoming = await fetchNotificationsFromApi(userId);
      const next = upsertNotifications(get().notifications, incoming, { countAsUnread: true });
      set((state) => ({
        notifications: next.merged,
        unreadCount: state.unreadCount + next.unreadToAdd,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh notifications";
      set({ error: message });
    }
  },

  markAllAsRead: () => set({ unreadCount: 0 }),
  clearNotifications: () => set({ notifications: [], unreadCount: 0, error: null }),
}));
