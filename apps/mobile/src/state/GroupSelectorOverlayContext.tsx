import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface GroupSelectorOverlayValue {
  visible: boolean;
  show: () => void;
  hide: () => void;
}

const GroupSelectorOverlayContext = createContext<GroupSelectorOverlayValue>({
  visible: false,
  show: () => {},
  hide: () => {}
});

export function GroupSelectorOverlayProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ visible, show, hide }), [visible, show, hide]);
  return (
    <GroupSelectorOverlayContext.Provider value={value}>
      {children}
    </GroupSelectorOverlayContext.Provider>
  );
}

export function useGroupSelectorOverlay() {
  return useContext(GroupSelectorOverlayContext);
}
