import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthSession } from "@fulbito/api-contracts";
import { canUseHttpSession } from "@/repositories/authBridgeState";
import { getFallbackFailure, subscribeFallbackFailure } from "@/repositories/fallbackDiagnostics";
import { authRepository } from "@/repositories";

interface AuthContextValue {
  loading: boolean;
  session: AuthSession | null;
  isAuthenticated: boolean;
  dataMode: "http" | "mock";
  fallbackIssue: string | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [dataMode, setDataMode] = useState<"http" | "mock">("mock");
  const [fallbackIssue, setFallbackIssue] = useState<string | null>(null);

  useEffect(() => {
    setFallbackIssue(getFallbackFailure()?.scope ?? null);
    const unsubscribe = subscribeFallbackFailure((failure) => {
      if (!failure) {
        setFallbackIssue(null);
        return;
      }
      setFallbackIssue(`${failure.scope}: ${failure.message}`);
    });
    return unsubscribe;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextSession = await authRepository.getSession();
      setSession(nextSession);
      setDataMode(canUseHttpSession() ? "http" : "mock");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await authRepository.loginWithPassword(email, password);
    setSession(nextSession);
    setDataMode(canUseHttpSession() ? "http" : "mock");
  }, []);

  const register = useCallback(async (input: { email: string; password: string; name: string }) => {
    const nextSession = await authRepository.registerWithPassword(input);
    setSession(nextSession);
    setDataMode(canUseHttpSession() ? "http" : "mock");
  }, []);

  const logout = useCallback(async () => {
    await authRepository.logout();
    setSession(null);
    setDataMode("mock");
  }, []);

  const value = useMemo(
    () => ({
      loading,
      session,
      isAuthenticated: Boolean(session),
      dataMode,
      fallbackIssue,
      refresh,
      login,
      register,
      logout
    }),
    [loading, session, dataMode, fallbackIssue, refresh, login, register, logout]
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
