import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Membership } from "@fulbito/domain";
import { useAuth } from "@/state/AuthContext";

interface GroupContextValue {
  memberships: Membership[];
  selectedGroupId: string | null;
  setSelectedGroupId: (next: string) => void;
}

const GroupContext = createContext<GroupContextValue | null>(null);
const GROUP_STORAGE_KEY = "fulbito.mobile.selectedGroupId";

export function GroupProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const memberships = session?.memberships ?? [];
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(GROUP_STORAGE_KEY);
        if (!cancelled) {
          setSelectedGroupId(stored);
        }
      } catch {
        if (!cancelled) {
          setSelectedGroupId(null);
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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (memberships.length === 0) {
      if (selectedGroupId !== null) {
        setSelectedGroupId(null);
      }
      return;
    }

    const stillValid = selectedGroupId ? memberships.some((membership) => membership.groupId === selectedGroupId) : false;
    if (!stillValid) {
      setSelectedGroupId(memberships[0].groupId);
    }
  }, [hydrated, memberships, selectedGroupId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!selectedGroupId) {
      void AsyncStorage.removeItem(GROUP_STORAGE_KEY);
      return;
    }
    void AsyncStorage.setItem(GROUP_STORAGE_KEY, selectedGroupId);
  }, [hydrated, selectedGroupId]);

  const value = useMemo(
    () => ({
      memberships,
      selectedGroupId,
      setSelectedGroupId
    }),
    [memberships, selectedGroupId]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroupSelection() {
  const ctx = useContext(GroupContext);
  if (!ctx) {
    throw new Error("useGroupSelection must be used within GroupProvider");
  }
  return ctx;
}
