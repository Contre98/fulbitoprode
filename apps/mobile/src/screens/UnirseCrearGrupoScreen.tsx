import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { GroupSearchResult, GroupVisibility } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { ScreenFrame } from "@/components/ScreenFrame";
import { groupsRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { usePeriod } from "@/state/PeriodContext";

type Tab = "buscar" | "crear";

export function UnirseCrearGrupoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<Tab>("buscar");

  return (
    <ScreenFrame
      title="Unirse/Crear grupo"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={6} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={colors.iconStrong} />
          </Pressable>
          <Text allowFontScaling={false} style={styles.headerTitle}>Unirse/Crear grupo</Text>
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("buscar")}
            style={[styles.tab, activeTab === "buscar" && styles.tabActive]}
          >
            <Ionicons
              name="search"
              size={16}
              color={activeTab === "buscar" ? colors.textTitle : colors.textMuted}
            />
            <Text
              allowFontScaling={false}
              style={[styles.tabText, activeTab === "buscar" && styles.tabTextActive]}
            >
              Buscar grupo
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("crear")}
            style={[styles.tab, activeTab === "crear" && styles.tabActive]}
          >
            <Ionicons
              name="add-circle-outline"
              size={16}
              color={activeTab === "crear" ? colors.textTitle : colors.textMuted}
            />
            <Text
              allowFontScaling={false}
              style={[styles.tabText, activeTab === "crear" && styles.tabTextActive]}
            >
              Crear grupo
            </Text>
          </Pressable>
        </View>

        {activeTab === "buscar" ? <SearchTab /> : <CreateTab />}
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

// ─── Search Tab ──────────────────────────────────────────────────────────────

function SearchTab() {
  const { refresh } = useAuth();
  const [query, setQuery] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<number | null>(null);
  const [results, setResults] = useState<GroupSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const groups = await groupsRepository.searchGroups({
        query: query.trim() || undefined,
        leagueId: leagueFilter ?? undefined
      });
      setResults(groups);
    } catch {
      Alert.alert("Error", "No se pudieron buscar grupos. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [query, leagueFilter]);

  useEffect(() => {
    void doSearch();
  }, []);

  function handleJoin(group: GroupSearchResult) {
    if (group.visibility === "closed") {
      Alert.alert(
        "Grupo cerrado",
        `"${group.name}" es un grupo cerrado. Se enviará una solicitud al admin para unirte.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Solicitar",
            onPress: () => void performJoin(group)
          }
        ]
      );
      return;
    }
    void performJoin(group);
  }

  async function performJoin(group: GroupSearchResult) {
    setJoining(group.id);
    try {
      await groupsRepository.joinGroup({ codeOrToken: group.id });
      await refresh();
      Alert.alert("Listo", `Te uniste a "${group.name}"`, [
        { text: "OK" }
      ]);
      await doSearch();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo unir al grupo.");
    } finally {
      setJoining(null);
    }
  }

  return (
    <View style={styles.tabContent}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre..."
            placeholderTextColor={colors.textSoft}
            returnKeyType="search"
            onSubmitEditing={doSearch}
          />
        </View>
        <Pressable onPress={doSearch} style={styles.searchButton}>
          <Text allowFontScaling={false} style={styles.searchButtonText}>Buscar</Text>
        </Pressable>
      </View>

      {/* League filter */}
      <View style={styles.filterRow}>
        <Text allowFontScaling={false} style={styles.filterLabel}>Liga:</Text>
        <Pressable
          onPress={() => setLeagueFilter(leagueFilter === null ? 128 : null)}
          style={[styles.filterChip, leagueFilter === 128 && styles.filterChipActive]}
        >
          <Text
            allowFontScaling={false}
            style={[styles.filterChipText, leagueFilter === 128 && styles.filterChipTextActive]}
          >
            LPF: Apertura 2026
          </Text>
        </Pressable>
        {leagueFilter !== null && (
          <Pressable onPress={() => { setLeagueFilter(null); }} style={styles.filterClear}>
            <Text allowFontScaling={false} style={styles.filterClearText}>Limpiar</Text>
          </Pressable>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : results.length === 0 && searched ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={40} color={colors.textSoft} />
          <Text allowFontScaling={false} style={styles.emptyText}>No se encontraron grupos</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
        >
          {results.map((group) => (
            <GroupResultCard
              key={group.id}
              group={group}
              joining={joining === group.id}
              onJoin={() => handleJoin(group)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Group Result Card ───────────────────────────────────────────────────────

function GroupResultCard({
  group,
  joining,
  onJoin
}: {
  group: GroupSearchResult;
  joining: boolean;
  onJoin: () => void;
}) {
  const isClosed = group.visibility === "closed";
  const membersLabel = group.maxMembers
    ? `${group.memberCount}/${group.maxMembers}`
    : `${group.memberCount}`;

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultCardTop}>
        <View style={styles.resultAvatar}>
          <Text allowFontScaling={false} style={styles.resultAvatarText}>
            {(group.name.trim()[0] ?? "G").toUpperCase()}
          </Text>
        </View>
        <View style={styles.resultInfo}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.resultName}>
            {group.name}
          </Text>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.resultMeta}>
            {group.competitionName || group.leagueName}
          </Text>
        </View>
      </View>

      <View style={styles.resultCardBottom}>
        <View style={styles.resultBadges}>
          <View style={styles.badge}>
            <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
            <Text allowFontScaling={false} style={styles.badgeText}>{membersLabel}</Text>
          </View>
          <View style={[styles.badge, isClosed ? styles.badgeClosed : styles.badgeOpen]}>
            <Ionicons
              name={isClosed ? "lock-closed-outline" : "lock-open-outline"}
              size={12}
              color={isClosed ? colors.warningDeep : colors.successDeep}
            />
            <Text
              allowFontScaling={false}
              style={[styles.badgeText, isClosed ? styles.badgeClosedText : styles.badgeOpenText]}
            >
              {isClosed ? "Cerrado" : "Abierto"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onJoin}
          disabled={joining}
          style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
        >
          {joining ? (
            <ActivityIndicator size="small" color={colors.textTitle} />
          ) : (
            <Text allowFontScaling={false} style={styles.joinBtnText}>
              {isClosed ? "Solicitar" : "Unirse"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Create Tab ──────────────────────────────────────────────────────────────

function CreateTab() {
  const { refresh } = useAuth();
  const navigation = useNavigation<any>();
  const { options: fechaOptions } = usePeriod();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("open");
  const [startingFecha, setStartingFecha] = useState(fechaOptions[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Ingresá un nombre para el grupo.");
      return;
    }
    setSaving(true);
    try {
      await groupsRepository.createGroup({
        name: trimmedName,
        leagueId: 128,
        season: "2026",
        competitionStage: "apertura",
        competitionName: "LPF: Apertura (2026)",
        competitionKey: "argentina-128",
        visibility,
        startingFecha: startingFecha || undefined
      });
      await refresh();
      Alert.alert("Grupo creado", `"${trimmedName}" fue creado exitosamente.`, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo crear el grupo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.createContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Group name */}
      <View style={styles.fieldGroup}>
        <Text allowFontScaling={false} style={styles.fieldLabel}>Nombre del grupo</Text>
        <TextInput
          style={styles.fieldInput}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Amigos del fútbol"
          placeholderTextColor={colors.textSoft}
          maxLength={40}
          autoFocus
        />
      </View>

      {/* League */}
      <View style={styles.fieldGroup}>
        <Text allowFontScaling={false} style={styles.fieldLabel}>Liga</Text>
        <View style={styles.leagueCard}>
          <Ionicons name="football-outline" size={18} color={colors.primaryDeep} />
          <Text allowFontScaling={false} style={styles.leagueCardText}>
            LPF: Apertura 2026
          </Text>
          <View style={styles.leagueOnly}>
            <Text allowFontScaling={false} style={styles.leagueOnlyText}>Única disponible</Text>
          </View>
        </View>
      </View>

      {/* Visibility */}
      <View style={styles.fieldGroup}>
        <Text allowFontScaling={false} style={styles.fieldLabel}>Tipo de grupo</Text>
        <View style={styles.visibilityRow}>
          <Pressable
            onPress={() => setVisibility("open")}
            style={[styles.visibilityOption, visibility === "open" && styles.visibilityOptionActive]}
          >
            <Ionicons
              name="lock-open-outline"
              size={18}
              color={visibility === "open" ? colors.primaryDeep : colors.textMuted}
            />
            <View style={styles.visibilityTextWrap}>
              <Text
                allowFontScaling={false}
                style={[styles.visibilityTitle, visibility === "open" && styles.visibilityTitleActive]}
              >
                Abierto
              </Text>
              <Text allowFontScaling={false} style={styles.visibilityDesc}>
                Cualquiera puede unirse
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setVisibility("closed")}
            style={[styles.visibilityOption, visibility === "closed" && styles.visibilityOptionActive]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={visibility === "closed" ? colors.primaryDeep : colors.textMuted}
            />
            <View style={styles.visibilityTextWrap}>
              <Text
                allowFontScaling={false}
                style={[styles.visibilityTitle, visibility === "closed" && styles.visibilityTitleActive]}
              >
                Cerrado
              </Text>
              <Text allowFontScaling={false} style={styles.visibilityDesc}>
                Admin aprueba solicitudes
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Starting fecha */}
      <View style={styles.fieldGroup}>
        <Text allowFontScaling={false} style={styles.fieldLabel}>Fecha de inicio</Text>
        <Text allowFontScaling={false} style={styles.fieldHint}>
          Desde qué fecha se empiezan a sumar puntos
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fechaList}
        >
          {fechaOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setStartingFecha(option.id)}
              style={[
                styles.fechaChip,
                startingFecha === option.id && styles.fechaChipActive
              ]}
            >
              <Text
                allowFontScaling={false}
                style={[
                  styles.fechaChipText,
                  startingFecha === option.id && styles.fechaChipTextActive
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Create button */}
      <Pressable
        onPress={handleCreate}
        disabled={saving || !name.trim()}
        style={[styles.createBtn, (saving || !name.trim()) && styles.createBtnDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={colors.textTitle} />
        ) : (
          <Text allowFontScaling={false} style={styles.createBtnText}>Crear grupo</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.canvas
  },
  screenContent: {
    flex: 1,
    gap: 0
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginHorizontal: -12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: colors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    color: colors.textTitle,
    fontSize: 18,
    fontWeight: "900"
  },

  // ─── Tabs ────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 14
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted
  },
  tabActive: {
    backgroundColor: colors.primaryStrong
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800"
  },
  tabTextActive: {
    color: colors.textTitle
  },

  // ─── Search ──────────────────────────────────────────────────────────────
  tabContent: {
    flex: 1
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingHorizontal: 12
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  searchButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  searchButtonText: {
    color: colors.textTitle,
    fontSize: 13,
    fontWeight: "800"
  },

  // ─── Filters ─────────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  filterChipTextActive: {
    color: colors.primaryDeep
  },
  filterClear: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  filterClearText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textDecorationLine: "underline"
  },

  // ─── Results ─────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700"
  },
  resultsList: {
    gap: 8,
    paddingBottom: 20
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 10
  },
  resultCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  resultAvatar: {
    height: 38,
    width: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  resultAvatarText: {
    color: colors.primaryDeep,
    fontSize: 16,
    fontWeight: "900"
  },
  resultInfo: {
    flex: 1,
    gap: 2
  },
  resultName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  resultMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  resultCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  resultBadges: {
    flexDirection: "row",
    gap: 6
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted
  },
  badgeOpen: {
    backgroundColor: "#ECFDF5"
  },
  badgeClosed: {
    backgroundColor: colors.surfaceTintWarning
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  badgeOpenText: {
    color: colors.successDeep
  },
  badgeClosedText: {
    color: colors.warningDeep
  },
  joinBtn: {
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  joinBtnDisabled: {
    opacity: 0.5
  },
  joinBtnText: {
    color: colors.textTitle,
    fontSize: 13,
    fontWeight: "800"
  },

  // ─── Create ──────────────────────────────────────────────────────────────
  createContent: {
    gap: 18,
    paddingBottom: 30
  },
  fieldGroup: {
    gap: 6
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800"
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  fieldInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  leagueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14
  },
  leagueCardText: {
    color: colors.primaryDeep,
    fontSize: 14,
    fontWeight: "800",
    flex: 1
  },
  leagueOnly: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted
  },
  leagueOnlyText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700"
  },

  // ─── Visibility ──────────────────────────────────────────────────────────
  visibilityRow: {
    flexDirection: "row",
    gap: 8
  },
  visibilityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: 12
  },
  visibilityOptionActive: {
    borderColor: colors.primaryStrong,
    backgroundColor: colors.primaryHighlight
  },
  visibilityTextWrap: {
    flex: 1,
    gap: 1
  },
  visibilityTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800"
  },
  visibilityTitleActive: {
    color: colors.textTitle
  },
  visibilityDesc: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600"
  },

  // ─── Fecha picker ────────────────────────────────────────────────────────
  fechaList: {
    gap: 6,
    paddingVertical: 2
  },
  fechaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: "transparent"
  },
  fechaChipActive: {
    backgroundColor: colors.primaryHighlight,
    borderColor: colors.primaryStrong
  },
  fechaChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  fechaChipTextActive: {
    color: colors.textTitle,
    fontWeight: "800"
  },

  // ─── Create button ──────────────────────────────────────────────────────
  createBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6
  },
  createBtnDisabled: {
    opacity: 0.4
  },
  createBtnText: {
    color: colors.textTitle,
    fontSize: 15,
    fontWeight: "900"
  }
});
