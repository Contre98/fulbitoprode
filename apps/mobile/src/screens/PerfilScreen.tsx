import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@fulbito/design-tokens";
import { translateBackendError } from "@fulbito/domain";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { profileRepository } from "@/repositories";
import { validateAndNormalizeProfileForm } from "@/screens/profileValidation";
import { useAuth } from "@/state/AuthContext";

function profileInitials(name: string | undefined) {
  const chunks = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());
  if (chunks.length === 0) {
    return "FC";
  }
  return chunks.join("");
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { session, refresh } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileRepository.getProfile()
  });
  const updateProfileMutation = useMutation({
    mutationFn: (input: { name: string; username: string; email: string }) => profileRepository.updateProfile(input),
    onSuccess: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditStatus("Perfil actualizado correctamente.");
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      setEditStatus(translateBackendError(error, "No se pudo guardar el perfil. Reintentá."));
    }
  });

  const profileUsername = useMemo(() => {
    if (typeof session?.user.username === "string" && session.user.username.trim().length > 0) {
      return session.user.username.trim().replace(/^@+/, "");
    }
    if (session?.user.email && session.user.email.includes("@")) {
      return session.user.email.split("@")[0].toLowerCase();
    }
    return (session?.user.name || "usuario").trim().replace(/\s+/g, "").toLowerCase();
  }, [session?.user.email, session?.user.name, session?.user.username]);

  useEffect(() => {
    if (!isEditModalOpen) {
      return;
    }
    setEditName(session?.user.name || "");
    setEditUsername(profileUsername);
    setEditEmail(session?.user.email || "");
  }, [isEditModalOpen, profileUsername, session?.user.email, session?.user.name]);

  const activity = profileQuery.data?.recentActivity ?? [];
  const achievements = profileQuery.data?.achievements ?? [];
  const rankHistory = profileQuery.data?.rankHistory ?? [];
  const performance = profileQuery.data?.performance ?? null;
  const statCards = useMemo(
    () => [
      { key: "points", label: "PUNTOS", value: String(profileQuery.data?.stats.totalPoints ?? 0) },
      { key: "accuracy", label: "PRECISIÓN", value: `${profileQuery.data?.stats.accuracyPct ?? 0}%` },
      { key: "groups", label: "GRUPOS", value: String(profileQuery.data?.stats.groups ?? 0) }
    ],
    [profileQuery.data?.stats]
  );

  function openEditModal() {
    setEditStatus(null);
    setEditName(session?.user.name || "");
    setEditUsername(profileUsername);
    setEditEmail(session?.user.email || "");
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    if (updateProfileMutation.isPending) {
      return;
    }
    setIsEditModalOpen(false);
  }

  function submitEditProfile() {
    const { value, error } = validateAndNormalizeProfileForm({
      name: editName,
      username: editUsername,
      email: editEmail
    });
    if (error || !value) {
      setEditStatus(error ?? "No se pudo validar el perfil.");
      return;
    }

    setEditStatus(null);
    void updateProfileMutation.mutateAsync(value).catch(() => undefined);
  }

  return (
    <ScreenFrame
      title="Perfil"
      subtitle="Resumen personal"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <View style={styles.brandRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={6} style={styles.backButton}>
              <Text allowFontScaling={false} style={styles.backButtonText}>←</Text>
            </Pressable>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text allowFontScaling={false} style={styles.profileAvatarText}>{profileInitials(session?.user.name)}</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.profileName}>
                {session?.user.name || "Usuario Fulbito"}
              </Text>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.profileEmail}>
                {session?.user.email || "Sin email"}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={openEditModal} style={styles.editButton}>
              <Text allowFontScaling={false} style={styles.editButtonText}>Editar</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      {profileQuery.isLoading ? <LoadingState message="Cargando perfil..." variant="profile" /> : null}
      {profileQuery.isError ? (
        <ErrorState message="No se pudo cargar el perfil." retryLabel="Reintentar" onRetry={() => void profileQuery.refetch()} />
      ) : null}

      {!profileQuery.isLoading && !profileQuery.isError ? (
        <>
          <View style={styles.statsRow}>
            {statCards.map((card) => (
              <View key={card.key} style={styles.statCard}>
                <Text allowFontScaling={false} style={styles.statLabel}>{card.label}</Text>
                <Text allowFontScaling={false} style={styles.statValue}>{card.value}</Text>
              </View>
            ))}
          </View>

          <Text allowFontScaling={false} style={styles.sectionTitle}>ACTIVIDAD RECIENTE</Text>
          {activity.length === 0 ? (
            <EmptyState title="Sin actividad" description="Todavía no tenés actividad registrada." />
          ) : null}
          {activity.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityMain}>
                <Text allowFontScaling={false} numberOfLines={2} style={styles.activityLabel}>{item.label}</Text>
                <Text allowFontScaling={false} style={styles.activityMeta}>{formatDateTime(item.occurredAt)}</Text>
              </View>
              <View style={styles.activitySide}>
                <Text allowFontScaling={false} style={styles.activityType}>
                  {item.type === "prediction" ? "PRODE" : "GRUPO"}
                </Text>
                {typeof item.points === "number" ? (
                  <Text allowFontScaling={false} style={styles.activityPoints}>
                    {item.points > 0 ? `+${item.points}` : item.points} pts
                  </Text>
                ) : null}
              </View>
            </View>
          ))}

          {performance ? (
            <>
              <Text allowFontScaling={false} style={styles.sectionTitle}>RENDIMIENTO</Text>
              <View style={styles.sectionCard}>
                <Text allowFontScaling={false} style={styles.sectionBody}>Plenos: {performance.exactHitRatePct}% · Tendencia: {performance.outcomeHitRatePct}%</Text>
                <Text allowFontScaling={false} style={styles.sectionBody}>Fallos: {performance.misses} · Promedio: {performance.averagePointsPerRound} pts/fecha</Text>
                <Text allowFontScaling={false} style={styles.sectionBody}>Racha: {performance.streak}</Text>
              </View>
            </>
          ) : null}

          <Text allowFontScaling={false} style={styles.sectionTitle}>LOGROS</Text>
          {achievements.length === 0 ? (
            <EmptyState title="Sin logros aún" description="Cuando cumplas objetivos vas a verlos acá." />
          ) : null}
          {achievements.map((item) => (
            <View key={item.id} style={styles.sectionCard}>
              <Text allowFontScaling={false} style={styles.sectionCardTitle}>{item.title}</Text>
              <Text allowFontScaling={false} style={styles.sectionBody}>{item.description}</Text>
            </View>
          ))}

          <Text allowFontScaling={false} style={styles.sectionTitle}>EVOLUCIÓN DE RANKING</Text>
          {rankHistory.length === 0 ? (
            <EmptyState title="Sin historial" description="Todavía no hay fechas cerradas para mostrar evolución." />
          ) : null}
          {rankHistory.slice(0, 8).map((point) => (
            <View key={`${point.period}-${point.rank}`} style={styles.rankRow}>
              <Text allowFontScaling={false} style={styles.rankLabel}>{point.periodLabel}</Text>
              <Text allowFontScaling={false} style={styles.rankValue}>#{point.rank} · {point.points} pts</Text>
            </View>
          ))}
        </>
      ) : null}

      <Modal visible={isEditModalOpen} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeEditModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text allowFontScaling={false} style={styles.modalTitle}>Editar perfil</Text>
              <Pressable accessibilityRole="button" onPress={closeEditModal} hitSlop={6} style={styles.modalCloseButton}>
                <Text allowFontScaling={false} style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <Text allowFontScaling={false} style={styles.inputLabel}>Nombre</Text>
            <TextInput
              editable={!updateProfileMutation.isPending}
              value={editName}
              onChangeText={setEditName}
              maxLength={120}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text allowFontScaling={false} style={styles.inputLabel}>Username</Text>
            <TextInput
              editable={!updateProfileMutation.isPending}
              value={editUsername}
              onChangeText={setEditUsername}
              maxLength={48}
              autoCapitalize="none"
              placeholder="usuario"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text allowFontScaling={false} style={styles.inputLabel}>Email</Text>
            <TextInput
              editable={!updateProfileMutation.isPending}
              value={editEmail}
              onChangeText={setEditEmail}
              maxLength={190}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            {editStatus ? <Text allowFontScaling={false} style={styles.modalStatus}>{editStatus}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={updateProfileMutation.isPending}
              onPress={submitEditProfile}
              style={[styles.modalSaveButton, updateProfileMutation.isPending ? styles.modalSaveButtonDisabled : null]}
            >
              <Text allowFontScaling={false} style={styles.modalSaveText}>
                {updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.canvas
  },
  screenContent: {
    gap: 10
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginHorizontal: -12
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8
  },
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: colors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonText: {
    color: colors.iconStrong,
    fontSize: 16,
    fontWeight: "900"
  },
  profileRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  profileAvatar: {
    height: 48,
    width: 48,
    borderRadius: 14,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center"
  },
  profileAvatarText: {
    color: colors.iconStrong,
    fontWeight: "900",
    fontSize: 14
  },
  profileMeta: {
    flex: 1
  },
  editButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.brandTintSoft,
    minHeight: 44,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  editButtonText: {
    color: colors.textBrandDark,
    fontSize: 13,
    fontWeight: "900"
  },
  profileName: {
    color: colors.textTitle,
    fontSize: 16,
    fontWeight: "900"
  },
  profileEmail: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  statsRow: {
    flexDirection: "row",
    gap: 8
  },
  statCard: {
    flex: 1,
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7
  },
  statValue: {
    marginTop: 4,
    color: colors.textHigh,
    fontSize: 22,
    fontWeight: "900"
  },
  sectionTitle: {
    marginTop: 4,
    color: colors.textHigh,
    fontSize: 16,
    fontWeight: "900"
  },
  activityRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  activityMain: {
    flex: 1
  },
  activityLabel: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "800"
  },
  activityMeta: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  activitySide: {
    alignItems: "flex-end"
  },
  activityType: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900"
  },
  activityPoints: {
    marginTop: 2,
    color: colors.primaryAccent,
    fontSize: 11,
    fontWeight: "900"
  },
  sectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 10,
    gap: 4
  },
  sectionCardTitle: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "900"
  },
  sectionBody: {
    color: colors.textBodyStrong,
    fontSize: 12,
    fontWeight: "700"
  },
  rankRow: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10
  },
  rankLabel: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "800"
  },
  rankValue: {
    color: colors.textBodyStrong,
    fontSize: 12,
    fontWeight: "800"
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlaySoft
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 14
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  modalTitle: {
    color: colors.textTitle,
    fontSize: 17,
    fontWeight: "900"
  },
  modalCloseButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandTintAlt
  },
  modalCloseText: {
    color: colors.textSlateSoft,
    fontSize: 13,
    fontWeight: "900"
  },
  inputLabel: {
    marginTop: 10,
    marginBottom: 4,
    color: colors.textSlateStrong,
    fontSize: 12,
    fontWeight: "800"
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    color: colors.textHigh,
    fontSize: 13,
    fontWeight: "700"
  },
  modalStatus: {
    marginTop: 10,
    color: colors.textSlate,
    fontSize: 12,
    fontWeight: "700"
  },
  modalSaveButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryAccent
  },
  modalSaveButtonDisabled: {
    opacity: 0.75
  },
  modalSaveText: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: "900"
  }
});
