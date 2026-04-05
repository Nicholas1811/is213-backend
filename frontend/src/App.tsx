import { useEffect, useEffectEvent, useRef } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { onMessage } from "firebase/messaging";
import { Toaster } from "@/components/ui/sonner";
import { messaging } from "@/firebase/firebase";
import keycloak, { isKeycloakConfigured } from "@/lib/keycloak";
import { resolveNotificationUserId } from "@/lib/notificationUser";
import { router } from "@/router";
import { useNotificationStore } from "@/store/notificationStore";

const keycloakInitOptions = {
  onLoad: "check-sso" as const,
  checkLoginIframe: false,
  messageReceiveTimeout: 3000,
};

function getPayloadEventKey(payload: {
  messageId?: string;
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
}): string {
  const eventUuid = payload.data?.event_uuid;
  if (eventUuid) return `event:${eventUuid}`;
  if (payload.messageId) return `message:${payload.messageId}`;
  return `fallback:${payload.notification?.title ?? ""}:${payload.notification?.body ?? ""}`;
}

/**
 * Wrapper that conditionally renders ReactKeycloakProvider.
 * When Keycloak env vars are missing the app runs without auth
 * (useful for local development).
 */
function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isKeycloakConfigured) {
    return <>{children}</>;
  }

  return (
    <ReactKeycloakProvider authClient={keycloak} initOptions={keycloakInitOptions}>
      {children}
    </ReactKeycloakProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

export default function App() {
  const refreshFromApi = useNotificationStore((s) => s.refreshFromApi);
  const recentlyHandledRef = useRef<Map<string, number>>(new Map());

  const handleIncomingPayload = useEffectEvent((payload: {
    messageId?: string;
    notification?: { title?: string; body?: string };
    data?: Record<string, string>;
  }) => {
    const eventKey = getPayloadEventKey(payload);
    const now = Date.now();
    const lastSeen = recentlyHandledRef.current.get(eventKey);

    // Protect against duplicate callbacks from multiple channels.
    if (lastSeen && now - lastSeen < 2500) {
      return;
    }

    recentlyHandledRef.current.set(eventKey, now);
    void refreshFromApi(resolveNotificationUserId(keycloak.subject));
  });

  // Listen for foreground FCM messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message:", payload);
      handleIncomingPayload(payload);
    });
    return unsubscribe;
  }, [refreshFromApi]);

  // Listen for messages forwarded from the Firebase service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type !== "FCM_BACKGROUND_MESSAGE") return;
      handleIncomingPayload(event.data.payload ?? {});
    };

    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    };
  }, [refreshFromApi]);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  );
}
