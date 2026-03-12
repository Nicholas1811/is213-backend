import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/lib/constants";

interface AuthState {
  // Role selected on the home page (determines Keycloak realm)
  selectedRole: UserRole | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;

  // Actions
  setRole: (role: UserRole) => void;
  setUser: (user: { id: string; name: string; email: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      selectedRole: null,
      userId: null,
      userName: null,
      userEmail: null,
      isAuthenticated: false,

      setRole: (role) => set({ selectedRole: role }),

      setUser: (user) =>
        set({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          selectedRole: null,
          userId: null,
          userName: null,
          userEmail: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "jms-auth",
    }
  )
);
