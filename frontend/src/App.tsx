import { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { onMessage } from "firebase/messaging";
import { Toaster } from "@/components/ui/sonner";
import { messaging } from "@/firebase/firebase";
import keycloak, { isKeycloakConfigured } from "@/lib/keycloak";
import NotificationToast from "@/components/notifications/NotificationToast";
import { router } from "@/router";

type ToastMessage = {
  title?: string;
  body?: string;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

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
    <ReactKeycloakProvider authClient={keycloak}>
      {children}
    </ReactKeycloakProvider>
  );
}

export default function App() {
  const [showToast, setShowToast] = useState<ToastMessage | null>(null);

  // Listen for foreground FCM messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message:", payload);
      setShowToast({
        title: payload.notification?.title,
        body: payload.notification?.body,
      });
    });
    return unsubscribe;
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        {showToast && (
          <NotificationToast
            message={showToast}
            onClose={() => setShowToast(null)}
          />
        )}
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  );
}
