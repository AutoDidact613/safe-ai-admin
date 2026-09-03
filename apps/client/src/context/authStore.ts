import { createContext, useContext } from "react";

export interface AuthUser {
  _id?: string;
  email: string;
  name: string;
  role?: string;
  profileId?: string;
  mode?: "BYOK" | "MANAGED";
  canCreatePosts?: boolean;
  canComment?: boolean;
  mustChangePassword?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  userRole: "admin" | "user" | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
