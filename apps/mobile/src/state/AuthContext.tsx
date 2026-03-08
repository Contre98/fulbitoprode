import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import type { AuthSession } from "@fulbito/api-contracts";
import { canUseHttpSession } from "@/repositories/authBridgeState";
import type { FallbackFailure } from "@/repositories/fallbackDiagnostics";
import {
  clearFallbackHistory,
  getFallbackFailure,
  getFallbackHistory,
  subscribeFallbackFailure,
  subscribeFallbackHistory
} from "@/repositories/fallbackDiagnostics";
import { authRepository, notificationsRepository } from "@/repositories";

interface AuthContextValue {
  loading: boolean;
  session: AuthSession | null;
  isAuthenticated: boolean;
  dataMode: "http" | "mock";
  fallbackIssue: string | null;
  fallbackHistory: FallbackFailure[];
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ ok: true; message: string }>;
  logout: () => Promise<void>;
  retryHttpMode: () => Promise<void>;
  clearFallbackDiagnosticsHistory: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [dataMode, setDataMode] = useState<"http" | "mock">("mock");
  const [fallbackIssue, setFallbackIssue] = useState<string | null>(null);
  const [fallbackHistory, setFallbackHistory] = useState<FallbackFailure[]>([]);

  useEffect(() => {
    setFallbackIssue(getFallbackFailure()?.scope ?? null);
    setFallbackHistory(getFallbackHistory());
    const unsubscribe = subscribeFallbackFailure((failure) => {
      if (!failure) {
        setFallbackIssue(null);
        return;
      }
      setFallbackIssue(`${failure.scope}: ${failure.message}`);
    });
    const unsubscribeHistory = subscribeFallbackHistory((entries) => {
      setFallbackHistory(entries);
    });
    return () => {
      unsubscribe();
      unsubscribeHistory();
    };
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

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }
    const syntheticToken = `fulbito-${Platform.OS}-${session.user.id}`;
    void notificationsRepository
      .registerDeviceToken({
        token: syntheticToken,
        platform: Platform.OS
      })
      .catch(() => undefined);
  }, [session?.user?.id]);

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

  const requestPasswordReset = useCallback(async (email: string) => {
    return authRepository.requestPasswordReset(email);
  }, []);

  const logout = useCallback(async () => {
    await authRepository.logout();
    setSession(null);
    setDataMode("mock");
  }, []);

  const retryHttpMode = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const clearFallbackDiagnosticsHistory = useCallback(() => {
    clearFallbackHistory();
  }, []);

  const value = useMemo(
    () => ({
      loading,
      session,
      isAuthenticated: Boolean(session),
      dataMode,
      fallbackIssue,
      fallbackHistory,
      refresh,
      login,
      register,
      requestPasswordReset,
      logout,
      retryHttpMode,
      clearFallbackDiagnosticsHistory
    }),
    [
      loading,
      session,
      dataMode,
      fallbackIssue,
      fallbackHistory,
      refresh,
      login,
      register,
      requestPasswordReset,
      logout,
      retryHttpMode,
      clearFallbackDiagnosticsHistory
    ]
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
