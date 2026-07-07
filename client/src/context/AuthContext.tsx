import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { cleanupTokenManager } from "../utils/tokenManager";

interface AuthUser {
  _id?: string;
  email: string;
  name: string;
  role?: string;
  profileId?: string;
  mode?: "BYOK" | "MANAGED";
}

interface AuthContextValue {
  user: AuthUser | null;
  userRole: "admin" | "user" | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}