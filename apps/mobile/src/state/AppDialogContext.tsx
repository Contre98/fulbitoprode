import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { useThemeColors } from "@/theme/useThemeColors";
let activeColors: ColorTokens = getColors("light");

type DialogButtonStyle = "default" | "cancel" | "destructive";
type DialogTone = "default" | "success" | "warning" | "danger";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface AppDialogButton {
  text?: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
}

interface AppDialogOptions {
  cancelable?: boolean;
}

interface AppDialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AppDialogButton[];
  cancelable: boolean;
}

interface AppDialogContextValue {
  alert: (title: string, message?: string, buttons?: AppDialogButton[], options?: AppDialogOptions) => void;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

const DEFAULT_BUTTON: AppDialogButton = { text: "Entendido", style: "default" };

function inferTone(title: string, buttons: AppDialogButton[]): DialogTone {
  const label = title.trim().toLowerCase();
  if (label.includes("error")) {
    return "danger";
  }
  if (label.includes("listo") || label.includes("creado") || label.includes("enviado") || label.includes("aprob")) {
    return "success";
  }
  if (buttons.some((button) => button.style === "destructive")) {
    return "warning";
  }
  return "default";
}

function toneMeta(tone: DialogTone): { icon: IoniconName; iconColor: string; iconBackground: string } {
  if (tone === "danger") {
    return {
      icon: "alert-circle-outline",
      iconColor: activeColors.dangerStrong,
      iconBackground: activeColors.surfaceTintDangerSoft
    };
  }
  if (tone === "success") {
    return {
      icon: "checkmark-circle-outline",
      iconColor: activeColors.successDeep,
      iconBackground: activeColors.primarySoftAlt
    };
  }
  if (tone === "warning") {
    return {
      icon: "warning-outline",
      iconColor: activeColors.warningDeep,
      iconBackground: activeColors.surfaceTintWarning
    };
  }
  return {
    icon: "information-circle-outline",
    iconColor: activeColors.primaryDeep,
    iconBackground: activeColors.surfaceTintBlueSoft
  };
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const nextIdRef = useRef(1);
  const [queue, setQueue] = useState<AppDialogRequest[]>([]);
  const current = queue[0] ?? null;
  const currentButtons = current?.buttons ?? [];
  const actionCount = currentButtons.length;

  const closeCurrent = useCallback((button?: AppDialogButton) => {
    setQueue((previous) => (previous.length > 0 ? previous.slice(1) : previous));
    if (button?.onPress) {
      setTimeout(() => {
        button.onPress?.();
      }, 0);
    }
  }, []);

  const dismissFromBackdrop = useCallback(() => {
    if (!current?.cancelable) {
      return;
    }
    const cancelButton = current.buttons.find((button) => button.style === "cancel");
    closeCurrent(cancelButton);
  }, [closeCurrent, current]);

  const alert = useCallback(
    (title: string, message?: string, buttons?: AppDialogButton[], options?: AppDialogOptions) => {
      const normalizedButtons = buttons && buttons.length > 0
        ? buttons
        : [DEFAULT_BUTTON];

      setQueue((previous) => [
        ...previous,
        {
          id: nextIdRef.current++,
          title,
          message,
          buttons: normalizedButtons,
          cancelable: options?.cancelable ?? true
        }
      ]);
    },
    []
  );

  const value = useMemo(() => ({ alert }), [alert]);
  const tone = current ? inferTone(current.title, current.buttons) : "default";
  const toneStyles = toneMeta(tone);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(current)}
        transparent
        animationType="fade"
        onRequestClose={dismissFromBackdrop}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissFromBackdrop} />
          {current ? (
            <View key={current.id} style={styles.card}>
              <View style={styles.cardStripe} />
              <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: toneStyles.iconBackground }]}>
                  <Ionicons name={toneStyles.icon} size={19} color={toneStyles.iconColor} />
                </View>
                <Text allowFontScaling={false} style={styles.title}>{current.title}</Text>
              </View>
              {current.message ? (
                <Text allowFontScaling={false} style={styles.message}>
                  {current.message}
                </Text>
              ) : null}
              <View style={[styles.actions, actionCount <= 2 && styles.actionsRow]}>
                {currentButtons.map((button, index) => {
                  const buttonText = button.text?.trim() || (index === 0 ? "Aceptar" : "Continuar");
                  return (
                    <Pressable
                      key={`${current.id}-${buttonText}-${index}`}
                      accessibilityRole="button"
                      onPress={() => closeCurrent(button)}
                      style={[
                        styles.actionButton,
                        actionCount <= 2 && styles.actionButtonRow,
                        button.style === "destructive" && styles.actionButtonDestructive,
                        button.style === "cancel" && styles.actionButtonCancel
                      ]}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.actionButtonText,
                          button.style === "destructive" && styles.actionButtonTextDestructive
                        ]}
                      >
                        {buttonText}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) {
    throw new Error("useAppDialog must be used within AppDialogProvider");
  }
  return context;
}

const createStyles = () => StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: activeColors.overlaySubtle,
    paddingHorizontal: 20
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    backgroundColor: activeColors.surface,
    borderWidth: 1,
    borderColor: activeColors.borderMuted,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12
  },
  cardStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: activeColors.primary
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    flex: 1,
    color: activeColors.textTitle,
    fontSize: 16,
    fontWeight: "800"
  },
  message: {
    color: activeColors.textBody,
    fontSize: 14,
    lineHeight: 20
  },
  actions: {
    gap: 8
  },
  actionsRow: {
    flexDirection: "row"
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: activeColors.borderMuted,
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  actionButtonRow: {
    flex: 1
  },
  actionButtonCancel: {
    backgroundColor: activeColors.surface,
    borderColor: activeColors.borderSubtle
  },
  actionButtonDestructive: {
    borderColor: activeColors.borderDangerSoft,
    backgroundColor: activeColors.surfaceTintDangerSoft
  },
  actionButtonText: {
    color: activeColors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  actionButtonTextDestructive: {
    color: activeColors.dangerStrong
  }
});


let styles = createStyles();
