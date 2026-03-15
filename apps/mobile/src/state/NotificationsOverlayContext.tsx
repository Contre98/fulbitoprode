import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface NotificationsOverlayContextValue {
  visible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

const NotificationsOverlayContext = createContext<NotificationsOverlayContextValue | null>(null);

export function NotificationsOverlayProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible((prev) => !prev), []);

  const value = useMemo(
    () => ({
      visible,
      show,
      hide,
      toggle
    }),
    [visible, show, hide, toggle]
  );

  return (
    <NotificationsOverlayContext.Provider value={value}>
      {children}
    </NotificationsOverlayContext.Provider>
  );
}

export function useNotificationsOverlay() {
  const context = useContext(NotificationsOverlayContext);
  if (!context) {
    throw new Error("useNotificationsOverlay must be used within NotificationsOverlayProvider");
  }
  return context;
}
