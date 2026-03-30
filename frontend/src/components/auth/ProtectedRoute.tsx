import { useEffect, type ReactNode } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { isKeycloakConfigured } from "@/lib/keycloak";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { keycloak, initialized } = useKeycloak();

  useEffect(() => {
    if (isKeycloakConfigured && initialized && !keycloak.authenticated) {
      keycloak.login({
        redirectUri: window.location.href,
      });
    }
  }, [initialized, keycloak]);

  // If Keycloak is not configured, we allow access (dev mode)
  if (!isKeycloakConfigured) {
    return <>{children}</>;
  }

  // If not initialized or not authenticated, show nothing (or a loading spinner)
  // while the redirect happens
  if (!initialized || !keycloak.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
};
