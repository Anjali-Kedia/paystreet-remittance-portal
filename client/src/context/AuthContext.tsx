import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

type User = {
  id: string;
  fullName: string;
  email: string;
  accountNumber: string;
  role: string;
  createdAt: string;
  kycStatus?: "PENDING" | "APPROVED" | "REVIEW" | "REJECTED";
  kycCheckedAt?: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  setAuth: (u: User, t: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;  // ✅ added
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("ps_user");
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("ps_token")
  );

  const setAuth = useCallback((u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("ps_user", JSON.stringify(u));
    localStorage.setItem("ps_token", t);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("ps_user");
    localStorage.removeItem("ps_token");
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem("ps_user", JSON.stringify(next)); // ✅ fixed key, was "auth"
      return next;
    });
  }, []);

  // ✅ dependencies now stable (useCallback ensures functions are memoized)
  const value = useMemo(
    () => ({ user, token, setAuth, logout, updateUser }),
    [user, token, setAuth, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
