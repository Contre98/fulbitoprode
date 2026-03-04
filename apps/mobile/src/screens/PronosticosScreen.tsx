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

    return (
      <View key={fixture.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.kickoffLabel}>{kickoffLabel}</Text>
          <View style={[styles.statusBadge, isEditable ? styles.statusBadgeOpen : styles.statusBadgeClosed]}>
            <Text style={[styles.statusBadgeText, isEditable ? styles.statusBadgeTextOpen : styles.statusBadgeTextClosed]}>{statusBadgeLabel}</Text>
          </View>
        </View>
        <View style={styles.teamsRow}>
          <Text numberOfLines={1} style={styles.teamName}>
            {fixture.homeTeam}
          </Text>
          <Text style={styles.vsLabel}>vs</Text>
          <Text numberOfLines={1} style={[styles.teamName, styles.teamNameRight]}>
            {fixture.awayTeam}
          </Text>
        </View>
        <View style={styles.inputsRow}>
          <TextInput
            style={styles.scoreInput}
            value={draft.home}
            onChangeText={(value) => updateDraft(fixture.id, "home", value)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            editable={isEditable}
          />
          <Text style={styles.separator}>-</Text>
          <TextInput
            style={styles.scoreInput}
            value={draft.away}
            onChangeText={(value) => updateDraft(fixture.id, "away", value)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            editable={isEditable}
          />
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
            {isEditable ? (savePredictionMutation.isPending ? "Guardando..." : "Guardar") : "Solo lectura"}
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
    <ScreenFrame title="Pronósticos" subtitle="Ingresa y guarda tus predicciones">
      <GroupSelector />
      <FechaSelector />
      <View style={styles.modeTabs}>
        <Pressable onPress={() => setMode("upcoming")} style={[styles.modeTab, mode === "upcoming" ? styles.modeTabActive : null]}>
          <Text style={[styles.modeTabLabel, mode === "upcoming" ? styles.modeTabLabelActive : null]}>Próximos</Text>
        </Pressable>
        <Pressable onPress={() => setMode("history")} style={[styles.modeTab, mode === "history" ? styles.modeTabActive : null]}>
          <Text style={[styles.modeTabLabel, mode === "history" ? styles.modeTabLabelActive : null]}>Historial</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    padding: spacing.lg,
    gap: spacing.md
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  teamName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  teamNameRight: {
    textAlign: "right"
  },
  vsLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  kickoffLabel: {
    color: colors.textSecondary,
    fontSize: 12
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
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
    fontSize: 10,
    fontWeight: "700"
  },
  statusBadgeTextOpen: {
    color: colors.primary
  },
  statusBadgeTextClosed: {
    color: colors.textSecondary
  },
  inputsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  scoreInput: {
    width: 64,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    backgroundColor: colors.background
  },
  separator: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: "700"
  },
  saveButton: {
    marginTop: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary
  },
  saveButtonDisabled: {
    opacity: 0.45
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  saveButtonText: {
    color: colors.primaryText,
    fontWeight: "700"
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
  statusText: {
    color: colors.textSecondary,
    fontSize: 12
  }
});
