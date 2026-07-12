import { createContext } from "react";

export interface AuthUser {
  _id?: string;
  email: string;
  name: string;
  role?: string;
  profileId?: string;
  mode?: "BYOK" | "MANAGED";
}

export interface AuthContextValue {
  user: AuthUser | null;
  userRole: "admin" | "user" | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
