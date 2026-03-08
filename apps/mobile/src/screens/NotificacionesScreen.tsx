import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { notificationsRepository } from "@/repositories";

export function NotificacionesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<string | null>(null);
  const inboxQuery = useQuery({
    queryKey: ["notifications-inbox"],
    queryFn: () => notificationsRepository.listInbox()
  });
  const preferencesQuery = useQuery({
    queryKey: ["notifications-preferences"],
    queryFn: () => notificationsRepository.getPreferences()
  });

  const updatePreference = useMutation({
    mutationFn: (input: { key: "reminders" | "results" | "social"; value: boolean }) =>
      notificationsRepository.updatePreferences({
        [input.key]: input.value
      }),
    onSuccess: () => {
      setStatus("Preferencias actualizadas.");
      void preferencesQuery.refetch();
    },
    onError: () => {
      setStatus("No se pudieron guardar las preferencias.");
    }
  });

  const markRead = useMutation({
    mutationFn: () => notificationsRepository.markAllRead(),
    onSuccess: () => {
      setStatus("Notificaciones marcadas como leídas.");
      void inboxQuery.refetch();
    }
  });

  const preferences = preferencesQuery.data;
  const items = inboxQuery.data?.items ?? [];

  return (
    <ScreenFrame
      title="Notificaciones"
      subtitle="Alertas y recordatorios"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <BrandBadgeIcon size={16} />
            </View>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.brandTitle}>
              <Text style={styles.brandTitleDark}>FULBITO</Text>
              <Text style={styles.brandTitleAccent}>PRODE</Text>
            </Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text allowFontScaling={false} style={styles.backButtonText}>←</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      <View style={styles.sectionCard}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>PREFERENCIAS</Text>
        {preferencesQuery.isLoading ? <LoadingState message="Cargando preferencias..." /> : null}
        {preferences ? (
          <>
            {([
              ["reminders", "Recordatorios de cierre"],
              ["results", "Resultados publicados"],
              ["social", "Actividad social de grupos"]
            ] as const).map(([key, label]) => (
              <Pressable
                key={key}
                style={styles.preferenceRow}
                onPress={() =>
                  updatePreference.mutate({
                    key,
                    value: !preferences[key]
                  })
                }
              >
                <Text allowFontScaling={false} style={styles.preferenceLabel}>{label}</Text>
                <Text allowFontScaling={false} style={styles.preferenceValue}>{preferences[key] ? "ON" : "OFF"}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>BANDEJA</Text>
          <Pressable onPress={() => markRead.mutate()} style={styles.markReadButton}>
            <Text allowFontScaling={false} style={styles.markReadLabel}>Marcar todo leído</Text>
          </Pressable>
        </View>
        {inboxQuery.isLoading ? <LoadingState message="Cargando notificaciones..." /> : null}
        {inboxQuery.isError ? (
          <ErrorState
            message="No se pudieron cargar las notificaciones."
            retryLabel="Reintentar"
            onRetry={() => void inboxQuery.refetch()}
          />
        ) : null}
        {!inboxQuery.isLoading && !inboxQuery.isError && items.length === 0 ? (
          <EmptyState title="Sin notificaciones" description="Vas a ver alertas importantes cuando haya novedades." />
        ) : null}
        {items.map((item) => (
          <View key={item.id} style={[styles.notificationRow, !item.read ? styles.notificationUnread : null]}>
            <Text allowFontScaling={false} style={styles.notificationTitle}>{item.title}</Text>
            <Text allowFontScaling={false} style={styles.notificationBody}>{item.body}</Text>
          </View>
        ))}
      </View>

      {status ? <Text allowFontScaling={false} style={styles.status}>{status}</Text> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#DDE2E8"
  },
  screenContent: {
    gap: 10
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    marginHorizontal: -12
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  brandBadge: {
    height: 28,
    width: 28,
    borderRadius: 10,
    backgroundColor: "#EFF4E6",
    alignItems: "center",
    justifyContent: "center"
  },
  brandTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2
  },
  brandTitleDark: {
    color: "#0F172A"
  },
  brandTitleAccent: {
    color: "#A3C90A"
  },
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#E9EDF2",
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "900"
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    color: "#8A94A4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7
  },
  preferenceRow: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10
  },
  preferenceLabel: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800"
  },
  preferenceValue: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "900"
  },
  markReadButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E8EDCD"
  },
  markReadLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "800"
  },
  notificationRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 4
  },
  notificationUnread: {
    borderColor: "#B6D900",
    backgroundColor: "#FCFFE8"
  },
  notificationTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900"
  },
  notificationBody: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600"
  },
  status: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "700"
  }
});
