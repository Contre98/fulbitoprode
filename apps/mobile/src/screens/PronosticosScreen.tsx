import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Fixture, Prediction } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { isPredictionInputComplete, normalizePredictionInput } from "@fulbito/domain";
import { FechaSelector } from "@/components/FechaSelector";
import { GroupSelector } from "@/components/GroupSelector";
import { ScreenFrame } from "@/components/ScreenFrame";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { fixtureRepository, predictionsRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

type DraftByFixture = Record<string, { home: string; away: string }>;
type PronosticosMode = "upcoming" | "history";

function toTeamCode(name: string) {
  const clean = name.trim();
  if (!clean) {
    return "---";
  }
  const words = clean
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["de", "del", "la", "el", "the", "fc", "club"].includes(word.toLowerCase()));
  if (words.length === 0) {
    return clean.slice(0, 3).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

export function PronosticosScreen() {
  const queryClient = useQueryClient();
  const { memberships, selectedGroupId } = useGroupSelection();
  const { fecha } = usePeriod();
  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const [draftByFixture, setDraftByFixture] = useState<DraftByFixture>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<PronosticosMode>("upcoming");

  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, fecha],
    queryFn: () =>
      fixtureRepository.listFixture({
        groupId,
        fecha
      })
  });

  const predictionsQuery = useQuery({
    queryKey: ["predictions", groupId, fecha],
    queryFn: () =>
      predictionsRepository.listPredictions({
        groupId,
        fecha
      })
  });

  useEffect(() => {
    if (!fixtureQuery.data || !predictionsQuery.data) {
      return;
    }

    const predictionByFixture = new Map(predictionsQuery.data.map((row) => [row.fixtureId, row]));
    const nextDrafts = fixtureQuery.data.reduce<DraftByFixture>((acc, fixture) => {
      const existing = predictionByFixture.get(fixture.id);
      acc[fixture.id] = {
        home: existing ? String(existing.home) : "",
        away: existing ? String(existing.away) : ""
      };
      return acc;
    }, {});

    setDraftByFixture(nextDrafts);
  }, [fixtureQuery.data, predictionsQuery.data]);

  const savePredictionMutation = useMutation({
    mutationFn: async (input: Prediction) => {
      await predictionsRepository.savePrediction({
        groupId,
        fecha,
        prediction: input
      });
    },
    onMutate: async (prediction) => {
      setStatusMessage(null);
      await queryClient.cancelQueries({ queryKey: ["predictions", groupId, fecha] });
      const previous = queryClient.getQueryData<Prediction[]>(["predictions", groupId, fecha]) ?? [];
      const withoutCurrent = previous.filter((item) => item.fixtureId !== prediction.fixtureId);
      queryClient.setQueryData<Prediction[]>(["predictions", groupId, fecha], [...withoutCurrent, prediction]);
      return { previous };
    },
    onError: (_error, _prediction, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Prediction[]>(["predictions", groupId, fecha], context.previous);
      }
      setStatusMessage("No se pudo guardar el pronóstico. Reintentá.");
    },
    onSuccess: () => {
      setStatusMessage("Pronóstico guardado.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["predictions", groupId, fecha] });
    }
  });

  const upcomingFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => fixture.status === "upcoming"),
    [fixtureQuery.data]
  );
  const historyFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => fixture.status !== "upcoming"),
    [fixtureQuery.data]
  );
  const visibleFixtures = mode === "upcoming" ? upcomingFixtures : historyFixtures;
  const completionSummary = useMemo(() => {
    const total = Math.max(1, (fixtureQuery.data ?? []).length);
    const completed = (fixtureQuery.data ?? []).filter((fixture) => {
      const draft = draftByFixture[fixture.id];
      if (!draft) return false;
      return isPredictionInputComplete(normalizePredictionInput(draft));
    }).length;
    const pct = Math.round((completed / total) * 100);
    return { total, completed, pct };
  }, [draftByFixture, fixtureQuery.data]);

  function updateDraft(fixtureId: string, side: "home" | "away", value: string) {
    const sanitized = value.replace(/[^\d]/g, "");
    setDraftByFixture((previous) => ({
      ...previous,
      [fixtureId]: {
        home: side === "home" ? sanitized : (previous[fixtureId]?.home ?? ""),
        away: side === "away" ? sanitized : (previous[fixtureId]?.away ?? "")
      }
    }));
  }

  function saveFixturePrediction(fixtureId: string) {
    const fixture = fixtureQuery.data?.find((item) => item.id === fixtureId);
    if (!fixture || fixture.status !== "upcoming") {
      setStatusMessage("Este partido ya está cerrado para edición.");
      return;
    }

    const draft = draftByFixture[fixtureId] ?? { home: "", away: "" };
    const normalized = normalizePredictionInput(draft);
    if (!isPredictionInputComplete(normalized)) {
      setStatusMessage("Completá ambos goles antes de guardar.");
      return;
    }

    void savePredictionMutation.mutateAsync({
      fixtureId,
      home: normalized.home,
      away: normalized.away
    });
  }

  function renderFixtureCard(fixture: Fixture) {
    const draft = draftByFixture[fixture.id] ?? { home: "", away: "" };
    const normalized = normalizePredictionInput(draft);
    const isEditable = mode === "upcoming" && fixture.status === "upcoming";
    const canSave = isEditable && isPredictionInputComplete(normalized) && !savePredictionMutation.isPending;
    const statusBadgeLabel = fixture.status === "upcoming" ? "Abierto" : fixture.status === "live" ? "En juego" : "Finalizado";
    const kickoffLabel = new Date(fixture.kickoffAt).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    const homeCode = toTeamCode(fixture.homeTeam);
    const awayCode = toTeamCode(fixture.awayTeam);
    const hasDraft = draft.home.length > 0 || draft.away.length > 0;

    return (
      <View key={fixture.id} style={styles.card}>
        <View style={styles.matchRow}>
          <View style={styles.teamBlock}>
            <Text numberOfLines={1} style={styles.teamCode}>
              {homeCode}
            </Text>
            <Text numberOfLines={1} style={styles.teamCaption}>
              {fixture.homeTeam}
            </Text>
          </View>
          <View style={[styles.inputsPill, hasDraft ? styles.inputsPillActive : null]}>
            <TextInput
              style={styles.scoreInput}
              value={draft.home}
              onChangeText={(value) => updateDraft(fixture.id, "home", value)}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="-"
              placeholderTextColor={colors.textSecondary}
              editable={isEditable}
            />
            <Text style={styles.separator}>:</Text>
            <TextInput
              style={styles.scoreInput}
              value={draft.away}
              onChangeText={(value) => updateDraft(fixture.id, "away", value)}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="-"
              placeholderTextColor={colors.textSecondary}
              editable={isEditable}
            />
          </View>
          <View style={[styles.teamBlock, styles.teamBlockRight]}>
            <Text numberOfLines={1} style={styles.teamCode}>
              {awayCode}
            </Text>
            <Text numberOfLines={1} style={[styles.teamCaption, styles.teamCaptionRight]}>
              {fixture.awayTeam}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, isEditable ? styles.statusBadgeOpen : styles.statusBadgeClosed]}>
            <Text style={[styles.statusBadgeText, isEditable ? styles.statusBadgeTextOpen : styles.statusBadgeTextClosed]}>{statusBadgeLabel}</Text>
          </View>
          <Text style={styles.kickoffBadge}>{kickoffLabel}</Text>
        </View>
        <Pressable
          onPress={() => saveFixturePrediction(fixture.id)}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            !canSave ? styles.saveButtonDisabled : null,
            pressed && canSave ? styles.saveButtonPressed : null
          ]}
        >
          <Text style={styles.saveButtonText}>
            {isEditable ? (savePredictionMutation.isPending ? "Guardando..." : "Guardar pronóstico") : "Solo lectura"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (fixtureQuery.isLoading || predictionsQuery.isLoading) {
    return (
      <ScreenFrame title="Pronósticos" subtitle="Ingresa y guarda tus predicciones">
        <LoadingState message="Cargando partidos..." />
      </ScreenFrame>
    );
  }

  if (fixtureQuery.isError || predictionsQuery.isError) {
    return (
      <ScreenFrame title="Pronósticos" subtitle="Ingresa y guarda tus predicciones">
        <ErrorState
          message="No se pudo cargar la información de pronósticos."
          retryLabel="Reintentar"
          onRetry={() => {
            void fixtureQuery.refetch();
            void predictionsQuery.refetch();
          }}
        />
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      title="Pronósticos"
      subtitle="Ingresa y guarda tus predicciones"
      header={
        <View style={styles.headerCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>FP</Text>
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>Fulbito Prode</Text>
              <Text style={styles.brandSubtitle}>Pronósticos · Resultados y carga</Text>
            </View>
            <View style={styles.profileDot}>
              <Text style={styles.profileDotText}>U</Text>
            </View>
          </View>
        </View>
      }
    >
      <GroupSelector />
      <FechaSelector />
      <View style={styles.summaryRow}>
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>
            {completionSummary.completed}/{completionSummary.total}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionSummary.pct}%` }]} />
          </View>
        </View>
      </View>
      <View style={styles.modeTabs}>
        <Pressable onPress={() => setMode("upcoming")} style={[styles.modeTab, mode === "upcoming" ? styles.modeTabActive : null]}>
          <Text style={[styles.modeTabLabel, mode === "upcoming" ? styles.modeTabLabelActive : null]}>Por jugar</Text>
        </Pressable>
        <Pressable onPress={() => setMode("history")} style={[styles.modeTab, mode === "history" ? styles.modeTabActive : null]}>
          <Text style={[styles.modeTabLabel, mode === "history" ? styles.modeTabLabelActive : null]}>Jugados</Text>
        </Pressable>
      </View>
      {visibleFixtures.length === 0 ? (
        <EmptyState
          title={mode === "upcoming" ? "Sin partidos próximos" : "Sin partidos finalizados"}
          description={mode === "upcoming" ? "Volvé más tarde para cargar tus próximos pronósticos." : "Todavía no hay partidos en historial para esta fecha."}
        />
      ) : null}
      {visibleFixtures.map((fixture) => renderFixtureCard(fixture))}
      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    padding: spacing.md
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  brandBadge: {
    height: 34,
    width: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  brandBadgeText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "800"
  },
  brandTextWrap: {
    flex: 1
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  },
  brandSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2
  },
  profileDot: {
    height: 30,
    width: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  profileDotText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 12
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.sm
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  teamBlock: {
    flex: 1
  },
  teamBlockRight: {
    alignItems: "flex-end"
  },
  teamCode: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  teamCaption: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2
  },
  teamCaptionRight: {
    textAlign: "right"
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  statusBadgeOpen: {
    borderColor: colors.primary,
    backgroundColor: "#123221"
  },
  statusBadgeClosed: {
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.background
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700"
  },
  statusBadgeTextOpen: {
    color: colors.primary
  },
  statusBadgeTextClosed: {
    color: colors.textSecondary
  },
  kickoffBadge: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.background
  },
  inputsPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 112,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.background
  },
  inputsPillActive: {
    borderColor: colors.primary,
    backgroundColor: "#123221"
  },
  scoreInput: {
    width: 28,
    height: 32,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    paddingVertical: 0
  },
  separator: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: spacing.xs
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md
  },
  saveButtonDisabled: {
    opacity: 0.45
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  saveButtonText: {
    color: colors.primaryText,
    fontWeight: "800",
    fontSize: 13
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: spacing.xs,
    gap: spacing.xs
  },
  modeTab: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 36
  },
  modeTabActive: {
    backgroundColor: colors.surface
  },
  modeTabLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700"
  },
  modeTabLabelActive: {
    color: colors.textPrimary
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  progressCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 12
  }
});
