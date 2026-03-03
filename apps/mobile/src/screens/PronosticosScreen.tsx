import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Fixture, Prediction } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { isPredictionInputComplete, normalizePredictionInput } from "@fulbito/domain";
import { ScreenFrame } from "@/components/ScreenFrame";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { mockFixtureRepository, mockPredictionsRepository } from "@/repositories/mockDataRepositories";
import { useAuth } from "@/state/AuthContext";

type DraftByFixture = Record<string, { home: string; away: string }>;

const DEFAULT_FECHA = "2026-01";

export function PronosticosScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const groupId = session?.memberships[0]?.groupId ?? "grupo-1";
  const [draftByFixture, setDraftByFixture] = useState<DraftByFixture>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, DEFAULT_FECHA],
    queryFn: () =>
      mockFixtureRepository.listFixture({
        groupId,
        fecha: DEFAULT_FECHA
      })
  });

  const predictionsQuery = useQuery({
    queryKey: ["predictions", groupId, DEFAULT_FECHA],
    queryFn: () =>
      mockPredictionsRepository.listPredictions({
        groupId,
        fecha: DEFAULT_FECHA
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
      await mockPredictionsRepository.savePrediction({
        groupId,
        fecha: DEFAULT_FECHA,
        prediction: input
      });
    },
    onMutate: async (prediction) => {
      setStatusMessage(null);
      await queryClient.cancelQueries({ queryKey: ["predictions", groupId, DEFAULT_FECHA] });
      const previous = queryClient.getQueryData<Prediction[]>(["predictions", groupId, DEFAULT_FECHA]) ?? [];
      const withoutCurrent = previous.filter((item) => item.fixtureId !== prediction.fixtureId);
      queryClient.setQueryData<Prediction[]>(["predictions", groupId, DEFAULT_FECHA], [...withoutCurrent, prediction]);
      return { previous };
    },
    onError: (_error, _prediction, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Prediction[]>(["predictions", groupId, DEFAULT_FECHA], context.previous);
      }
      setStatusMessage("No se pudo guardar el pronóstico. Reintentá.");
    },
    onSuccess: () => {
      setStatusMessage("Pronóstico guardado.");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["predictions", groupId, DEFAULT_FECHA] });
    }
  });

  const upcomingFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => fixture.status === "upcoming"),
    [fixtureQuery.data]
  );

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
    const canSave = isPredictionInputComplete(normalized) && !savePredictionMutation.isPending;

    return (
      <View key={fixture.id} style={styles.card}>
        <Text style={styles.matchTitle}>
          {fixture.homeTeam} vs {fixture.awayTeam}
        </Text>
        <Text style={styles.kickoffLabel}>{new Date(fixture.kickoffAt).toLocaleString()}</Text>
        <View style={styles.inputsRow}>
          <TextInput
            style={styles.scoreInput}
            value={draft.home}
            onChangeText={(value) => updateDraft(fixture.id, "home", value)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
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
          <Text style={styles.saveButtonText}>{savePredictionMutation.isPending ? "Guardando..." : "Guardar"}</Text>
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
      {upcomingFixtures.length === 0 ? (
        <EmptyState title="Sin partidos próximos" description="Volvé más tarde para cargar tus próximos pronósticos." />
      ) : null}
      {upcomingFixtures.map((fixture) => renderFixtureCard(fixture))}
      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm
  },
  matchTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  kickoffLabel: {
    color: colors.textSecondary,
    fontSize: 12
  },
  inputsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  scoreInput: {
    width: 56,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    backgroundColor: colors.background
  },
  separator: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "700"
  },
  saveButton: {
    marginTop: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary
  },
  saveButtonDisabled: {
    opacity: 0.5
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  saveButtonText: {
    color: colors.primaryText,
    fontWeight: "700"
  },
  statusText: {
    color: colors.textSecondary
  }
});
