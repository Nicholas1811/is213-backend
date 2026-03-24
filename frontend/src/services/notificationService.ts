import axios from "axios";
import { ENDPOINTS } from "@/api/endpoints";
import { getFcmToken, requestPermission } from "@/firebase/messaging";

export interface NotificationTokenPayload {
  device_token: string;
  userId: string;
}

/**
 * Register FCM token with OutSystems backend
 */
export async function registerNotificationToken(userId: string): Promise<void> {
  try {
    const permission = Notification.permission === "granted"
      ? "granted"
      : await requestPermission();

    if (permission !== "granted") {
      throw new Error("Notification permission was not granted");
    }

    const token = await getFcmToken(undefined);
    if (!token) {
      throw new Error("Failed to get FCM token");
    }

    const payload: NotificationTokenPayload = {
      device_token: token,
      userId: userId,
    };

    await axios.post(ENDPOINTS.NOTIFICATION_TOKENS, payload);
    console.log("Notification token registered successfully");
  } catch (error) {
    console.error("Failed to register notification token:", error);
    throw error;
  }
}
