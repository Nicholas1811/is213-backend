import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/lib/constants";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const selectedRole = useAuthStore((s) => s.selectedRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // If no role selected, redirect to home
  if (!selectedRole) {
    return <Navigate to="/" replace />;
  }

  // If role mismatch, redirect to home
  if (requiredRole && selectedRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // If not authenticated, redirect to home (Keycloak should handle the login)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
