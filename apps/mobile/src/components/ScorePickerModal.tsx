import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@fulbito/design-tokens";
import { TeamCrest } from "@/components/TeamCrest";

const SCORE_MIN = 0;
const SCORE_MAX = 99;
const SCORE_VALUES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, index) => SCORE_MIN + index);
const ITEM_HEIGHT = 38;
const VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const CENTER_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

type SavePhase = "idle" | "saving" | "saved";

interface ScorePickerModalProps {
  visible: boolean;
  homeLabel: string;
  awayLabel: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  initialHome: number;
  initialAway: number;
  onSave: (value: { home: number; away: number }) => Promise<void> | void;
  onClose: () => void;
}

function clampScore(value: number) {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, value));
}

function ScoreWheel({
  value,
  onChange,
  testIdPrefix
}: {
  value: number;
  onChange: (next: number) => void;
  testIdPrefix: string;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const valueRef = useRef(value);
  const hasMomentumRef = useRef(false);
  const dragEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  valueRef.current = value;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: value * ITEM_HEIGHT, animated: false });
  }, [value]);

  useEffect(() => {
    return () => {
      if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current);
    };
  }, []);

  function commitSnap(y: number) {
    const rawIndex = Math.round(y / ITEM_HEIGHT);
    const nextValue = clampScore(rawIndex);
    const previous = valueRef.current;
    valueRef.current = nextValue;
    if (nextValue !== previous) {
      onChange(nextValue);
    }
    scrollRef.current?.scrollTo({ y: nextValue * ITEM_HEIGHT, animated: false });
  }

  function nudge(offset: number) {
    hasMomentumRef.current = false;
    if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current);
    const previous = valueRef.current;
    const next = clampScore(valueRef.current + offset);
    valueRef.current = next;
    if (next !== previous) {
      onChange(next);
    }
    scrollRef.current?.scrollTo({ y: next * ITEM_HEIGHT, animated: false });
  }

  return (
    <>
      <Pressable
        testID={`${testIdPrefix}-inc`}
        accessibilityRole="button"
        onPress={() => nudge(-1)}
        style={styles.arrowButton}
      >
        <Ionicons name="chevron-up" size={14} color={colors.textSecondary} />
      </Pressable>
      <View style={styles.wheelWrap} testID={testIdPrefix}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          disableIntervalMomentum
          decelerationRate="fast"
          contentContainerStyle={styles.wheelContent}
          onScrollBeginDrag={() => {
            hasMomentumRef.current = false;
            if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current);
          }}
          onMomentumScrollBegin={() => {
            hasMomentumRef.current = true;
            if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current);
          }}
          onMomentumScrollEnd={(event) => {
            hasMomentumRef.current = false;
            commitSnap(event.nativeEvent.contentOffset.y);
          }}
          onScrollEndDrag={(event) => {
            const y = event.nativeEvent.contentOffset.y;
            if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current);
            dragEndTimerRef.current = setTimeout(() => {
              if (!hasMomentumRef.current) {
                commitSnap(y);
              }
            }, 50);
          }}
        >
          {SCORE_VALUES.map((score) => {
            const active = score === value;
            return (
              <View key={score} style={styles.wheelRow}>
                <Text allowFontScaling={false} style={[styles.wheelValue, active ? styles.wheelValueActive : null]}>
                  {score}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        <View pointerEvents="none" style={styles.wheelActiveBand} />
      </View>
      <Pressable
        testID={`${testIdPrefix}-dec`}
        accessibilityRole="button"
        onPress={() => nudge(1)}
        style={styles.arrowButton}
      >
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>
    </>
  );
}

export function ScorePickerModal({
  visible,
  homeLabel,
  awayLabel,
  homeLogoUrl,
  awayLogoUrl,
  initialHome,
  initialAway,
  onSave,
  onClose
}: ScorePickerModalProps) {
  const [home, setHome] = useState(initialHome);
  const [away, setAway] = useState(initialAway);
  const [savePhase, setSavePhase] = useState<SavePhase>("idle");
  const savePhaseRef = useRef<SavePhase>("idle");
  const saveStartedRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setHome(clampScore(initialHome));
    setAway(clampScore(initialAway));
    setSavePhase("idle");
    savePhaseRef.current = "idle";
    saveStartedRef.current = false;
    progressAnim.setValue(0);
    checkmarkScale.setValue(0);
  }, [visible, initialHome, initialAway]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  async function handleSave() {
    savePhaseRef.current = "saving";
    setSavePhase("saving");

    Animated.timing(progressAnim, {
      toValue: 0.7,
      duration: 400,
      useNativeDriver: false
    }).start();

    try {
      await onSave({ home, away });

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false
      }).start(() => {
        savePhaseRef.current = "saved";
        setSavePhase("saved");
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true
        }).start();
      });

      savedTimerRef.current = setTimeout(() => {
        saveStartedRef.current = false;
        onClose();
      }, 900);
    } catch {
      saveStartedRef.current = false;
      savePhaseRef.current = "idle";
      setSavePhase("idle");
      progressAnim.setValue(0);
    }
  }

  function triggerSave() {
    if (saveStartedRef.current || savePhaseRef.current !== "idle") {
      return;
    }
    saveStartedRef.current = true;
    void handleSave();
  }

  const buttonBgColor = progressAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [colors.primaryStrong, colors.primaryAccent, colors.primaryStrong]
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={savePhase === "idle" ? onClose : undefined} />
        <View style={styles.modalCard}>
          {/* Score picker area */}
          <View style={styles.pickerRow}>
            <View style={styles.teamColumn}>
              <TeamCrest teamName={homeLabel} code={homeLabel} logoUrl={homeLogoUrl} size={32} />
              <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>
                {homeLabel}
              </Text>
            </View>

            <View style={styles.wheelColumn}>
              <ScoreWheel value={home} onChange={setHome} testIdPrefix="score-wheel-home" />
            </View>

            <Text allowFontScaling={false} style={styles.vsDivider}>:</Text>

            <View style={styles.wheelColumn}>
              <ScoreWheel value={away} onChange={setAway} testIdPrefix="score-wheel-away" />
            </View>

            <View style={styles.teamColumn}>
              <TeamCrest teamName={awayLabel} code={awayLabel} logoUrl={awayLogoUrl} size={32} />
              <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>
                {awayLabel}
              </Text>
            </View>
          </View>

          {/* Save button */}
          <Pressable
            testID="score-picker-apply"
            onPressIn={triggerSave}
            onPress={triggerSave}
            disabled={savePhase !== "idle"}
            hitSlop={8}
            style={styles.saveButtonWrap}
          >
            <Animated.View style={[styles.saveButton, { backgroundColor: buttonBgColor }]}>
              {savePhase === "saving" ? (
                <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
              ) : null}
              <View style={styles.saveButtonContent}>
                {savePhase === "saved" ? (
                  <View style={styles.savedRow}>
                    <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.textHigh} />
                    </Animated.View>
                    <Text allowFontScaling={false} style={styles.saveLabel}>
                      Guardado
                    </Text>
                  </View>
                ) : savePhase === "saving" ? (
                  <Text allowFontScaling={false} style={styles.saveLabel}>
                    Guardando...
                  </Text>
                ) : (
                  <Text allowFontScaling={false} style={styles.saveLabel}>
                    Guardar
                  </Text>
                )}
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlaySubtle
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6
  },
  teamColumn: {
    alignItems: "center",
    gap: 4,
    width: 48
  },
  teamCode: {
    color: colors.textHigh,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: -0.2,
    textAlign: "center"
  },
  wheelColumn: {
    flex: 1,
    alignItems: "center",
    gap: 3
  },
  wheelWrap: {
    width: "100%",
    height: WHEEL_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.surfaceTintNeutral,
    overflow: "hidden",
    position: "relative"
  },
  arrowButton: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  wheelContent: {
    paddingVertical: CENTER_PADDING
  },
  wheelRow: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center"
  },
  wheelValue: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: "700"
  },
  wheelValueActive: {
    color: colors.textPrimary,
    fontWeight: "900"
  },
  wheelActiveBand: {
    position: "absolute",
    top: CENTER_PADDING,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primaryStrong,
    backgroundColor: colors.primaryAlpha16
  },
  vsDivider: {
    color: colors.textSoftAlt2,
    fontSize: 20,
    fontWeight: "900"
  },
  saveButtonWrap: {
    borderRadius: 10,
    overflow: "hidden"
  },
  saveButton: {
    minHeight: 42,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative"
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primaryDeep,
    borderRadius: 10
  },
  saveButtonContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  saveLabel: {
    color: colors.textHigh,
    fontSize: 15,
    fontWeight: "900"
  }
});
