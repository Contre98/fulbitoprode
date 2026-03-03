import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthSession } from "@fulbito/api-contracts";
import { mockAuthRepository } from "@/repositories/mockAuthRepository";

interface AuthContextValue {
  loading: boolean;
  session: AuthSession | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextSession = await mockAuthRepository.getSession();
      setSession(nextSession);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await mockAuthRepository.loginWithPassword(email, password);
    setSession(nextSession);
  }, []);

  const register = useCallback(async (input: { email: string; password: string; name: string }) => {
    const nextSession = await mockAuthRepository.registerWithPassword(input);
    setSession(nextSession);
  }, []);

  const logout = useCallback(async () => {
    await mockAuthRepository.logout();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      session,
      isAuthenticated: Boolean(session),
      refresh,
      login,
      register,
      logout
    }),
    [loading, session, refresh, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
