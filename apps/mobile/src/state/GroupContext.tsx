import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Membership } from "@fulbito/domain";
import { useAuth } from "@/state/AuthContext";

interface GroupContextValue {
  memberships: Membership[];
  selectedGroupId: string | null;
  setSelectedGroupId: (next: string) => void;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const memberships = session?.memberships ?? [];
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(memberships[0]?.groupId ?? null);

  useEffect(() => {
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
  }, [memberships, selectedGroupId]);

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
