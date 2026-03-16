import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { GroupSearchResult, GroupVisibility } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { ScreenFrame } from "@/components/ScreenFrame";
import { groupsRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useAppDialog } from "@/state/AppDialogContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

type Tab = "buscar" | "crear";
const SEARCH_PAGE_SIZE = 5;
const AUTO_LOAD_THRESHOLD_PX = 96;
const LEAGUE_FILTER_ID = 128;
const LEAGUE_LABEL = "LPF: Apertura 2026";
const CREATE_COMPETITION_LABEL = "LPF: Apertura (2026)";
const TAB_ORDER: Tab[] = ["buscar", "crear"];
const PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 430,
  mass: 0.4
} as const;
const PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;
const SEGMENT_INDICATOR_SPRING = {
  damping: 20,
  stiffness: 290,
  mass: 0.5
} as const;

interface DropdownOption {
  id: string;
  label: string;
}

function usePressScale(scaleDown: number, disabled = false) {
  const reducedMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }]
  }));

  const onPressIn = useCallback(() => {
    if (reducedMotion || disabled) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(scaleDown, PRESS_IN_SPRING);
  }, [disabled, pressScale, reducedMotion, scaleDown]);

  const onPressOut = useCallback(() => {
    if (reducedMotion || disabled) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(1, PRESS_OUT_SPRING);
  }, [disabled, pressScale, reducedMotion]);

  return { animatedStyle, onPressIn, onPressOut };
}

function SegmentedTabButton({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const press = usePressScale(0.97);
  return (
    <Animated.View style={[styles.segmentedTabWrap, press.animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.segmentedTab}
      >
        <Text
          allowFontScaling={false}
          style={[styles.segmentedTabText, active && styles.segmentedTabTextActive]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function UnirseCrearGrupoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<Tab>("buscar");
  const [segmentedWidth, setSegmentedWidth] = useState(0);
  const searchTabActive = activeTab === "buscar";
  const tabIndicatorX = useSharedValue(0);
  const backPress = usePressScale(0.94);
  const activeTabIndex = TAB_ORDER.indexOf(activeTab);
  const segmentTabWidth = segmentedWidth > 0 ? (segmentedWidth - 8) / TAB_ORDER.length : 0;
  const segmentedIndicatorStyle = useAnimatedStyle(() => ({
    opacity: segmentTabWidth > 0 ? 1 : 0,
    transform: [{ translateX: tabIndicatorX.value }]
  }));

  useEffect(() => {
    if (segmentTabWidth <= 0 || activeTabIndex < 0) {
      return;
    }
    const target = activeTabIndex * (segmentTabWidth + 2);
    if (reducedMotion) {
      tabIndicatorX.value = target;
      return;
    }
    tabIndicatorX.value = withSpring(target, SEGMENT_INDICATOR_SPRING);
  }, [activeTabIndex, reducedMotion, segmentTabWidth, tabIndicatorX]);

  return (
    <ScreenFrame
      title="Unirse o crear grupo"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerShell, { paddingTop: Math.max(insets.top, 10) + 8 }]}>
          <View style={styles.headerRow}>
            <Animated.View style={backPress.animatedStyle}>
              <Pressable
                onPress={() => navigation.goBack()}
                onPressIn={backPress.onPressIn}
                onPressOut={backPress.onPressOut}
                hitSlop={8}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={18} color={colors.iconStrong} />
              </Pressable>
            </Animated.View>
          </View>
          <Text allowFontScaling={false} style={styles.headerTitle}>Unirse o crear grupo</Text>
          <Text allowFontScaling={false} style={styles.headerSubtitle}>
            Elegí un grupo para competir ahora o creá el tuyo en segundos.
          </Text>
          <View style={styles.headerAccentBar} />
        </View>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardContent}>
        <View style={styles.segmentedControl} onLayout={(event) => setSegmentedWidth(event.nativeEvent.layout.width)}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.segmentedIndicator,
              { width: segmentTabWidth > 0 ? segmentTabWidth : undefined },
              segmentedIndicatorStyle
            ]}
          />
          <SegmentedTabButton label="Buscar grupo" active={searchTabActive} onPress={() => setActiveTab("buscar")} />
          <SegmentedTabButton label="Crear grupo" active={!searchTabActive} onPress={() => setActiveTab("crear")} />
        </View>

        {searchTabActive ? <SearchTab /> : <CreateTab />}
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

function SearchTab() {
  const { refresh } = useAuth();
  const { memberships } = useGroupSelection();
  const dialog = useAppDialog();
  const [query, setQuery] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<number | null>(null);
  const [results, setResults] = useState<GroupSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [resultsScrollStarted, setResultsScrollStarted] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const canTriggerLoadMoreRef = useRef(true);
  const resultCountLabel = `${results.length} grupo${results.length === 1 ? "" : "s"}`.toUpperCase();
  const memberGroupIds = useMemo(() => new Set(memberships.map((membership) => membership.groupId)), [memberships]);
  const searchPress = usePressScale(0.97, loading);
  const refreshPress = usePressScale(0.97, loading || loadingMore);
  const filterChipPress = usePressScale(0.97);
  const filterClearPress = usePressScale(0.97, leagueFilter === null);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setLoadingMore(false);
    setResultsScrollStarted(false);
    canTriggerLoadMoreRef.current = true;
    setSearched(true);
    try {
      const response = await groupsRepository.searchGroups({
        query: query.trim() || undefined,
        leagueId: leagueFilter ?? undefined,
        page: 1,
        perPage: SEARCH_PAGE_SIZE
      });
      setResults(response.groups);
      setPage(response.page);
      setHasMore(response.hasMore);
    } catch {
      dialog.alert("Error", "No se pudieron buscar grupos. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [dialog, leagueFilter, query]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current || !hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await groupsRepository.searchGroups({
        query: query.trim() || undefined,
        leagueId: leagueFilter ?? undefined,
        page: nextPage,
        perPage: SEARCH_PAGE_SIZE
      });

      setResults((current) => {
        const seen = new Set(current.map((item) => item.id));
        const newItems = response.groups.filter((item) => !seen.has(item.id));
        return [...current, ...newItems];
      });
      setPage(response.page);
      setHasMore(response.hasMore);
    } catch {
      dialog.alert("Error", "No se pudieron cargar más grupos. Intentá de nuevo.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [dialog, hasMore, leagueFilter, loading, page, query]);

  const handleResultsEndReached = useCallback(() => {
    if (!resultsScrollStarted || !hasMore || loading || loadingMoreRef.current) {
      return;
    }
    void loadMore();
  }, [hasMore, loadMore, loading, resultsScrollStarted]);

  const handleResultsScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!resultsScrollStarted || !hasMore || loading || loadingMoreRef.current) {
      return;
    }

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceToBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);

    if (distanceToBottom > AUTO_LOAD_THRESHOLD_PX) {
      canTriggerLoadMoreRef.current = true;
      return;
    }

    if (!canTriggerLoadMoreRef.current) {
      return;
    }

    canTriggerLoadMoreRef.current = false;
    void handleResultsEndReached();
  }, [handleResultsEndReached, hasMore, loading, resultsScrollStarted]);

  useEffect(() => {
    void doSearch();
  }, []);

  function handleJoin(group: GroupSearchResult) {
    if (group.visibility === "closed") {
      dialog.alert(
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
      const result = await groupsRepository.joinGroup({ codeOrToken: group.id });
      if (result.status === "pending") {
        dialog.alert(
          "Solicitud enviada",
          `Tu solicitud para unirte a "${group.name}" fue enviada. El admin del grupo la revisará.`,
          [{ text: "OK" }]
        );
      } else {
        await refresh();
        dialog.alert("Listo", `Te uniste a "${group.name}"`, [{ text: "OK" }]);
      }
      await doSearch();
    } catch (error) {
      dialog.alert("Error", error instanceof Error ? error.message : "No se pudo unir al grupo.");
    } finally {
      setJoining(null);
    }
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionBlock}>
        <Text allowFontScaling={false} style={styles.sectionCaption}>BUSCAR GRUPO</Text>
        <View style={styles.panelCard}>
          <Text allowFontScaling={false} style={styles.panelDescription}>
            Buscá por nombre y aplicá filtros para encontrar comunidades activas.
          </Text>

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: Amigos del fútbol"
                placeholderTextColor={colors.textSoft}
                returnKeyType="search"
                onSubmitEditing={doSearch}
              />
            </View>
            <Animated.View style={searchPress.animatedStyle}>
              <Pressable
                onPress={doSearch}
                onPressIn={searchPress.onPressIn}
                onPressOut={searchPress.onPressOut}
                style={styles.searchButton}
              >
                <Text allowFontScaling={false} style={styles.searchButtonText}>Buscar</Text>
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.filterRow}>
            <Text allowFontScaling={false} style={styles.filterLabel}>Filtrar por liga</Text>
            <Animated.View style={filterChipPress.animatedStyle}>
              <Pressable
                onPress={() => setLeagueFilter(leagueFilter === null ? LEAGUE_FILTER_ID : null)}
                onPressIn={filterChipPress.onPressIn}
                onPressOut={filterChipPress.onPressOut}
                style={[styles.filterChip, leagueFilter === LEAGUE_FILTER_ID && styles.filterChipActive]}
              >
                <Text
                  allowFontScaling={false}
                  style={[styles.filterChipText, leagueFilter === LEAGUE_FILTER_ID && styles.filterChipTextActive]}
                >
                  {LEAGUE_LABEL}
                </Text>
              </Pressable>
            </Animated.View>
            {leagueFilter !== null ? (
              <Animated.View style={filterClearPress.animatedStyle}>
                <Pressable
                  onPress={() => setLeagueFilter(null)}
                  onPressIn={filterClearPress.onPressIn}
                  onPressOut={filterClearPress.onPressOut}
                  style={styles.filterClear}
                >
                  <Text allowFontScaling={false} style={styles.filterClearText}>Limpiar</Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text allowFontScaling={false} style={styles.sectionCaption}>
          {searched ? resultCountLabel : "GRUPOS DISPONIBLES"}
        </Text>
        <Animated.View style={refreshPress.animatedStyle}>
          <Pressable
            onPress={doSearch}
            onPressIn={refreshPress.onPressIn}
            onPressOut={refreshPress.onPressOut}
            style={styles.resultsRefreshChip}
          >
            <Ionicons name="refresh" size={13} color={colors.textSecondary} />
            <Text allowFontScaling={false} style={styles.resultsRefreshChipText}>Actualizar</Text>
          </Pressable>
        </Animated.View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : results.length === 0 && searched ? (
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyStateIconWrap}>
            <Ionicons name="search-outline" size={24} color={colors.textMuted} />
          </View>
          <Text allowFontScaling={false} style={styles.emptyStateTitle}>No encontramos grupos</Text>
          <Text allowFontScaling={false} style={styles.emptyStateDescription}>
            Probá con otro nombre o quitá los filtros para ver más resultados.
          </Text>
        </View>
      ) : (
        <ScrollView
          onScrollBeginDrag={() => setResultsScrollStarted(true)}
          onScroll={handleResultsScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.resultsList}
        >
          {results.map((group) => (
            <GroupResultCard
              key={group.id}
              group={group}
              isMember={memberGroupIds.has(group.id)}
              joining={joining === group.id}
              onJoin={() => handleJoin(group)}
            />
          ))}
          {loadingMore ? (
            <View style={styles.loadMoreSpinner}>
              <ActivityIndicator size="small" color={colors.primaryDeep} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function GroupResultCard({
  group,
  isMember,
  joining,
  onJoin
}: {
  group: GroupSearchResult;
  isMember: boolean;
  joining: boolean;
  onJoin: () => void;
}) {
  const isClosed = group.visibility === "closed";
  const membersLabel = group.maxMembers ? `${group.memberCount}/${group.maxMembers}` : `${group.memberCount}`;
  const actionDisabled = joining;
  const joinPress = usePressScale(0.97, actionDisabled);

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultTopRow}>
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
        <View style={[styles.visibilityBadge, isClosed ? styles.visibilityBadgeClosed : styles.visibilityBadgeOpen]}>
          <Ionicons
            name={isClosed ? "lock-closed-outline" : "lock-open-outline"}
            size={12}
            color={isClosed ? colors.warningDeep : colors.successDeep}
          />
          <Text
            allowFontScaling={false}
            style={[styles.visibilityBadgeText, isClosed ? styles.visibilityBadgeTextClosed : styles.visibilityBadgeTextOpen]}
          >
            {isClosed ? "Cerrado" : "Abierto"}
          </Text>
        </View>
      </View>

      <View style={styles.resultBottomRow}>
        <View style={styles.resultTags}>
          <View style={styles.membersTag}>
            <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
            <Text allowFontScaling={false} style={styles.membersTagText}>{membersLabel} miembros</Text>
          </View>
          {isMember ? (
            <View style={styles.memberTag}>
              <Ionicons name="checkmark-circle" size={12} color={colors.primaryDeep} />
              <Text allowFontScaling={false} style={styles.memberTagText}>Ya sos miembro</Text>
            </View>
          ) : null}
        </View>
        {!isMember ? (
          <Animated.View style={joinPress.animatedStyle}>
            <Pressable
              onPress={onJoin}
              onPressIn={joinPress.onPressIn}
              onPressOut={joinPress.onPressOut}
              disabled={actionDisabled}
              style={[styles.joinButton, joining && styles.joinButtonDisabled]}
            >
              {joining ? (
                <ActivityIndicator size="small" color={colors.textTitle} />
              ) : (
                <Text allowFontScaling={false} style={styles.joinButtonText}>
                  {isClosed ? "Solicitar acceso" : "Unirse"}
                </Text>
              )}
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function DropdownSelect({
  value,
  options,
  onChange,
  placeholder
}: {
  value: string;
  options: DropdownOption[];
  onChange: (nextValue: string) => void;
  placeholder: string;
}) {
  function DropdownOptionRow({
    label,
    active,
    onPress
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) {
    const optionPress = usePressScale(0.985);
    return (
      <Animated.View style={optionPress.animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={optionPress.onPressIn}
          onPressOut={optionPress.onPressOut}
          style={[styles.dropdownMenuRow, active ? styles.dropdownMenuRowActive : null]}
        >
          <Text allowFontScaling={false} style={[styles.dropdownMenuText, active ? styles.dropdownMenuTextActive : null]}>
            {label}
          </Text>
          {active ? <Ionicons name="checkmark" size={14} color={colors.primaryDeep} /> : null}
        </Pressable>
      </Animated.View>
    );
  }

  const triggerRef = useRef<View | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selected = options.find((option) => option.id === value) ?? null;
  const triggerPress = usePressScale(0.99);

  function openMenu() {
    const node = triggerRef.current;
    setMenuOpen(true);
    if (!node || typeof node.measureInWindow !== "function") {
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
    });
  }

  function selectOption(nextId: string) {
    onChange(nextId);
    setMenuOpen(false);
  }

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Animated.View style={triggerPress.animatedStyle}>
          <Pressable
            onPress={openMenu}
            onPressIn={triggerPress.onPressIn}
            onPressOut={triggerPress.onPressOut}
            style={styles.dropdownTrigger}
          >
            <Text allowFontScaling={false} numberOfLines={1} style={styles.dropdownValue}>
              {selected?.label ?? placeholder}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.dropdownModalRoot}>
          <Pressable style={styles.dropdownBackdrop} onPress={() => setMenuOpen(false)} />
          <View
            style={[
              styles.dropdownMenuCard,
              {
                top: (menuAnchor?.y ?? 84) + (menuAnchor?.height ?? 0) + spacing.xs,
                left: menuAnchor?.x ?? spacing.md,
                width: menuAnchor?.width ?? 320
              }
            ]}
          >
            <ScrollView style={styles.dropdownMenuScroll} contentContainerStyle={styles.dropdownMenuContent}>
              {options.map((option) => {
                const active = option.id === selected?.id;
                return (
                  <DropdownOptionRow
                    key={option.id}
                    label={option.label}
                    active={active}
                    onPress={() => selectOption(option.id)}
                  />
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CreateTab() {
  const { refresh } = useAuth();
  const dialog = useAppDialog();
  const navigation = useNavigation<any>();
  const { options: fechaOptions } = usePeriod();
  const leagueOptions: DropdownOption[] = [{ id: String(LEAGUE_FILTER_ID), label: LEAGUE_LABEL }];
  const [name, setName] = useState("");
  const [leagueId, setLeagueId] = useState(String(LEAGUE_FILTER_ID));
  const [visibility, setVisibility] = useState<GroupVisibility>("open");
  const [startingFecha, setStartingFecha] = useState(fechaOptions[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const openVisibilityPress = usePressScale(0.985);
  const closedVisibilityPress = usePressScale(0.985);
  const canCreate = name.trim().length > 0;
  const createPress = usePressScale(0.97, saving || !canCreate);

  useEffect(() => {
    if (fechaOptions.length === 0) {
      return;
    }
    if (!startingFecha || !fechaOptions.some((option) => option.id === startingFecha)) {
      setStartingFecha(fechaOptions[0].id);
    }
  }, [fechaOptions, startingFecha]);

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      dialog.alert("Error", "Ingresá un nombre para el grupo.");
      return;
    }
    setSaving(true);
    try {
      await groupsRepository.createGroup({
        name: trimmedName,
        leagueId: Number(leagueId) || LEAGUE_FILTER_ID,
        season: "2026",
        competitionStage: "apertura",
        competitionName: CREATE_COMPETITION_LABEL,
        competitionKey: "argentina-128",
        visibility,
        startingFecha: startingFecha || undefined
      });
      await refresh();
      dialog.alert("Grupo creado", `"${trimmedName}" fue creado exitosamente.`, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      dialog.alert("Error", error instanceof Error ? error.message : "No se pudo crear el grupo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.createContent}>
      <View style={styles.sectionBlock}>
        <Text allowFontScaling={false} style={styles.sectionCaption}>NOMBRE DEL GRUPO</Text>
        <View style={styles.formCard}>
          <Text allowFontScaling={false} style={styles.fieldHelp}>
            Elegí un nombre claro para que tus amigos lo encuentren rápido.
          </Text>
          <TextInput
            style={styles.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Amigos del fútbol"
            placeholderTextColor={colors.textSoft}
            maxLength={40}
          />
          <Text allowFontScaling={false} style={styles.counterText}>{name.length}/40</Text>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text allowFontScaling={false} style={styles.sectionCaption}>LIGA</Text>
        <View style={styles.formCard}>
          <Text allowFontScaling={false} style={styles.fieldHelp}>
            Elegí la competición para el grupo.
          </Text>
          <DropdownSelect
            value={leagueId}
            options={leagueOptions}
            onChange={setLeagueId}
            placeholder="Seleccionar liga"
          />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text allowFontScaling={false} style={styles.sectionCaption}>TIPO DE GRUPO</Text>
        <View style={styles.formCard}>
          <Text allowFontScaling={false} style={styles.fieldHelp}>Definí cómo se suman nuevos participantes.</Text>
          <View style={styles.visibilityList}>
            <Animated.View style={openVisibilityPress.animatedStyle}>
              <Pressable
                onPress={() => setVisibility("open")}
                onPressIn={openVisibilityPress.onPressIn}
                onPressOut={openVisibilityPress.onPressOut}
                style={[styles.visibilityOption, visibility === "open" && styles.visibilityOptionActive]}
              >
                <View style={styles.visibilityOptionIcon}>
                  <Ionicons
                    name="lock-open-outline"
                    size={16}
                    color={visibility === "open" ? colors.primaryDeep : colors.textMuted}
                  />
                </View>
                <View style={styles.visibilityTextWrap}>
                  <Text
                    allowFontScaling={false}
                    style={[styles.visibilityTitle, visibility === "open" && styles.visibilityTitleActive]}
                  >
                    Abierto
                  </Text>
                  <Text allowFontScaling={false} style={styles.visibilityDesc}>Cualquiera puede unirse al instante</Text>
                </View>
                <Ionicons
                  name={visibility === "open" ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={visibility === "open" ? colors.primaryDeep : colors.textSoft}
                />
              </Pressable>
            </Animated.View>

            <Animated.View style={closedVisibilityPress.animatedStyle}>
              <Pressable
                onPress={() => setVisibility("closed")}
                onPressIn={closedVisibilityPress.onPressIn}
                onPressOut={closedVisibilityPress.onPressOut}
                style={[styles.visibilityOption, visibility === "closed" && styles.visibilityOptionActive]}
              >
                <View style={styles.visibilityOptionIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={visibility === "closed" ? colors.primaryDeep : colors.textMuted}
                  />
                </View>
                <View style={styles.visibilityTextWrap}>
                  <Text
                    allowFontScaling={false}
                    style={[styles.visibilityTitle, visibility === "closed" && styles.visibilityTitleActive]}
                  >
                    Cerrado
                  </Text>
                  <Text allowFontScaling={false} style={styles.visibilityDesc}>El admin aprueba cada solicitud</Text>
                </View>
                <Ionicons
                  name={visibility === "closed" ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={visibility === "closed" ? colors.primaryDeep : colors.textSoft}
                />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text allowFontScaling={false} style={styles.sectionCaption}>FECHA DE INICIO</Text>
        <View style={styles.formCard}>
          <Text allowFontScaling={false} style={styles.fieldHelp}>
            Desde qué fecha comenzás a sumar puntos en el grupo.
          </Text>
          {fechaOptions.length > 0 ? (
            <DropdownSelect
              value={startingFecha}
              options={fechaOptions}
              onChange={setStartingFecha}
              placeholder="Seleccionar fecha"
            />
          ) : (
            <View style={styles.noFechaState}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text allowFontScaling={false} style={styles.noFechaStateText}>Cargando fechas disponibles...</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text allowFontScaling={false} style={styles.summaryLabel}>Acceso</Text>
          <Text allowFontScaling={false} style={styles.summaryValue}>{visibility === "open" ? "Abierto" : "Cerrado"}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text allowFontScaling={false} style={styles.summaryLabel}>Inicio</Text>
          <Text allowFontScaling={false} style={styles.summaryValue}>
            {fechaOptions.find((item) => item.id === startingFecha)?.label ?? "Primera fecha disponible"}
          </Text>
        </View>
      </View>

      <Animated.View style={createPress.animatedStyle}>
        <Pressable
          onPress={handleCreate}
          onPressIn={createPress.onPressIn}
          onPressOut={createPress.onPressOut}
          disabled={saving || !canCreate}
          style={[styles.createButton, (saving || !canCreate) && styles.createButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={colors.textTitle} />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={16} color={colors.textTitle} />
              <Text allowFontScaling={false} style={styles.createButtonText}>Crear grupo</Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardContent: {
    gap: spacing.sm
  },
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.canvas
  },
  screenContent: {
    gap: 10,
    marginTop: spacing.sm
  },
  headerShell: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginHorizontal: -12
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderMuted
  },
  headerTitle: {
    marginTop: spacing.sm,
    color: colors.textTitle,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2
  },
  headerSubtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
  },
  headerAccentBar: {
    marginTop: spacing.sm,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.primaryStrong
  },

  segmentedControl: {
    position: "relative",
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 3,
    overflow: "hidden",
    gap: 2
  },
  segmentedTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  segmentedTabWrap: {
    flex: 1
  },
  segmentedIndicator: {
    position: "absolute",
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: 8,
    backgroundColor: colors.primaryStrong
  },
  segmentedTabText: {
    color: colors.textMutedAlt,
    fontSize: 14,
    fontWeight: "800"
  },
  segmentedTabTextActive: {
    color: colors.textHigh,
    fontWeight: "800"
  },

  sectionBlock: {
    gap: 8
  },
  sectionCaption: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  tabContent: {
    gap: spacing.sm
  },
  panelCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm
  },
  panelDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
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
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong
  },
  searchButtonText: {
    color: colors.textTitle,
    fontSize: 13,
    fontWeight: "800"
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderMuted
  },
  filterChipActive: {
    backgroundColor: colors.primarySoftAlt,
    borderColor: colors.primaryStrong
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  filterChipTextActive: {
    color: colors.primaryDeep
  },
  filterClear: {
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  filterClearText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textDecorationLine: "underline"
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2
  },
  resultsRefreshChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted
  },
  resultsRefreshChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl
  },
  emptyStateCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm
  },
  emptyStateIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  emptyStateTitle: {
    color: colors.textTitle,
    fontSize: 15,
    fontWeight: "800"
  },
  emptyStateDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 17
  },
  resultsList: {
    gap: 8,
    paddingBottom: spacing.md
  },
  loadMoreSpinner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm
  },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.sm + 4,
    gap: spacing.sm
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  resultAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
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
    fontSize: 14,
    fontWeight: "800"
  },
  resultMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  visibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  visibilityBadgeOpen: {
    backgroundColor: colors.primarySoftAlt
  },
  visibilityBadgeClosed: {
    backgroundColor: colors.surfaceTintWarning
  },
  visibilityBadgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  visibilityBadgeTextOpen: {
    color: colors.successDeep
  },
  visibilityBadgeTextClosed: {
    color: colors.warningDeep
  },
  resultBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  resultTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap"
  },
  membersTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  membersTagText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  memberTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    backgroundColor: colors.primarySoftAlt,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  memberTagText: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: "700"
  },
  joinButton: {
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  joinButtonDisabled: {
    opacity: 0.5
  },
  joinButtonText: {
    color: colors.textTitle,
    fontSize: 12,
    fontWeight: "800"
  },

  createContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl + spacing.lg
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 8
  },
  fieldHelp: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17
  },
  fieldInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  counterText: {
    alignSelf: "flex-end",
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700"
  },
  visibilityList: {
    gap: 8
  },
  visibilityOption: {
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  visibilityOptionActive: {
    backgroundColor: colors.primaryHighlight,
    borderColor: colors.primaryStrong
  },
  visibilityOptionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  visibilityTextWrap: {
    flex: 1,
    gap: 1
  },
  visibilityTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800"
  },
  visibilityTitleActive: {
    color: colors.primaryDeep
  },
  visibilityDesc: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600"
  },
  dropdownTrigger: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  dropdownValue: {
    flex: 1,
    color: colors.textTitle,
    fontSize: 14,
    fontWeight: "800"
  },
  dropdownModalRoot: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start"
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlaySubtle
  },
  dropdownMenuCard: {
    position: "absolute",
    maxHeight: "60%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
    overflow: "hidden",
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  dropdownMenuScroll: {
    width: "100%"
  },
  dropdownMenuContent: {
    padding: spacing.xs
  },
  dropdownMenuRow: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "transparent"
  },
  dropdownMenuRowActive: {
    backgroundColor: colors.primaryAlpha16,
    borderColor: colors.borderInfo
  },
  dropdownMenuText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  dropdownMenuTextActive: {
    color: colors.primaryDeep,
    fontWeight: "900"
  },
  noFechaState: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  noFechaStateText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    gap: 6
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800"
  },
  createButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  createButtonDisabled: {
    opacity: 0.4
  },
  createButtonText: {
    color: colors.textTitle,
    fontSize: 15,
    fontWeight: "900"
  }
});
