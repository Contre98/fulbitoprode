import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_INVITE_STORAGE_KEY = "fulbito.mobile.pendingInviteToken";

interface PendingInviteContextValue {
  hydrated: boolean;
  pendingInviteToken: string | null;
  setPendingInviteToken: (token: string) => Promise<void>;
  clearPendingInviteToken: () => Promise<void>;
}

const PendingInviteContext = createContext<PendingInviteContextValue | null>(null);

export function PendingInviteProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [pendingInviteToken, setPendingInviteTokenState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(PENDING_INVITE_STORAGE_KEY);
        if (!cancelled) {
          setPendingInviteTokenState(stored || null);
        }
      } catch {
        if (!cancelled) {
          setPendingInviteTokenState(null);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setPendingInviteToken(token: string) {
    const clean = token.trim();
    if (!clean) return;
    setPendingInviteTokenState(clean);
    await AsyncStorage.setItem(PENDING_INVITE_STORAGE_KEY, clean);
  }

  async function clearPendingInviteToken() {
    setPendingInviteTokenState(null);
    await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
  }

  const value = useMemo(
    () => ({
      hydrated,
      pendingInviteToken,
      setPendingInviteToken,
      clearPendingInviteToken
    }),
    [hydrated, pendingInviteToken]
  );

  return <PendingInviteContext.Provider value={value}>{children}</PendingInviteContext.Provider>;
}

export function usePendingInvite() {
  const ctx = useContext(PendingInviteContext);
  if (!ctx) {
    throw new Error("usePendingInvite must be used within PendingInviteProvider");
  }
  return ctx;
}
