"use client";

import type { ReactNode } from "react";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ACTIVE_GROUP_STORAGE_KEY = "fulbito.activeGroupId";

interface Membership {
  groupId: string;
  groupName: string;
  leagueId: number;
  leagueName: string;
  season: string;
  competitionKey?: string;
  competitionName?: string;
  competitionStage?: "apertura" | "clausura" | "general";
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

interface SessionUser {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  favoriteTeam?: string | null;
}

interface AuthSessionValue {
  loading: boolean;
  authenticated: boolean;
  user: SessionUser | null;
  memberships: Membership[];
  activeGroupId: string | null;
  activeGroup: Membership | null;
  setActiveGroupId: (groupId: string) => void;
  refresh: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

function useAuthSessionState(): AuthSessionValue {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
      if (!response.ok) {
        setAuthenticated(false);
        setUser(null);
        setMemberships([]);
        setActiveGroupIdState(null);
        return;
      }

      const payload = (await response.json()) as {
        user: SessionUser;
        memberships: Membership[];
      };

      setAuthenticated(true);
      setUser(payload.user);
      setMemberships(payload.memberships);

      const fromStorage = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY) : null;
      const exists = payload.memberships.find((m) => m.groupId === fromStorage);
      const nextActive = exists?.groupId || payload.memberships[0]?.groupId || null;
      setActiveGroupIdState(nextActive);
      if (typeof window !== "undefined") {
        if (nextActive) {
          window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, nextActive);
        } else {
          window.localStorage.removeItem(ACTIVE_GROUP_STORAGE_KEY);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setActiveGroupId = useCallback(
    (groupId: string) => {
      const exists = memberships.find((membership) => membership.groupId === groupId);
      if (!exists) {
        return;
      }
      setActiveGroupIdState(groupId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId);
      }
    },
    [memberships]
  );

  const activeGroup = useMemo(
    () => memberships.find((m) => m.groupId === activeGroupId) || null,
    [memberships, activeGroupId]
  );

  return {
    loading,
    authenticated,
    user,
    memberships,
    activeGroupId,
    activeGroup,
    setActiveGroupId,
    refresh
  };
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const value = useAuthSessionState();
  return createElement(AuthSessionContext.Provider, { value }, children);
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider");
  }
  return value;
}
