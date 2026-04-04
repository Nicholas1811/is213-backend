import { useEffect, type ReactNode } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { isKeycloakConfigured } from "@/lib/keycloak";
import { UserRole } from "@/lib/constants";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { keycloak, initialized } = useKeycloak();
  const navigate = useNavigate();

  useEffect(() => {
    if (isKeycloakConfigured && initialized && !keycloak.authenticated) {
      keycloak.login({
        redirectUri: window.location.href,
      });
    }
  }, [initialized, keycloak]);

  // Handle role-based access control
  useEffect(() => {
    if (isKeycloakConfigured && initialized && keycloak.authenticated && requiredRole) {
      const hasRole = keycloak.hasRealmRole(requiredRole.toLowerCase());
      if (!hasRole) {
        // Redirect to a safe page if unauthorized
        // If a buyer tries to access seller page, they should go to /buyer
        // If a seller tries to access buyer page, they should go to /seller
        // If unknown role, go to home
        const userHasBuyerRole = keycloak.hasRealmRole("buyer");
        const userHasSellerRole = keycloak.hasRealmRole("seller");
        
        if (userHasBuyerRole) {
          navigate("/buyer", { replace: true });
        } else if (userHasSellerRole) {
          navigate("/seller", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    }
  }, [initialized, keycloak, requiredRole, navigate]);

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

  // Final role check before rendering to avoid flashes of content
  if (requiredRole && !keycloak.hasRealmRole(requiredRole.toLowerCase())) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
};
