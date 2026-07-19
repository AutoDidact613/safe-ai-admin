import { useState, useCallback, type ReactNode } from "react";
import { cleanupTokenManager } from "../utils/tokenManager";
import { AuthContext, type AuthUser } from "./authStore";

function readFromStorage(): { user: AuthUser | null; userRole: "admin" | "user" | null } {
  try {
    const raw = localStorage.getItem("user");
    const role = localStorage.getItem("userRole") as "admin" | "user" | null;
    return { user: raw ? JSON.parse(raw) : null, userRole: role };
  } catch {
    return { user: null, userRole: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readFromStorage();
  const [user, setUserState] = useState<AuthUser | null>(initial.user);

  const userRole = (user?.role as "admin" | "user" | null) ?? null;

  const setUser = useCallback((updated: AuthUser) => {
    localStorage.setItem("user", JSON.stringify(updated));
    localStorage.setItem("userRole", updated.role ?? "");
    setUserState(updated);
  }, []);

  const logout = useCallback(() => {
    cleanupTokenManager();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      isAuthenticated: !!user,
      setUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
