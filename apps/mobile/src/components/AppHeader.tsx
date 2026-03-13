import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@fulbito/design-tokens";
import { HeaderGroupSelector } from "@/components/HeaderGroupSelector";
import { HeaderActionIcons } from "@/components/HeaderActionIcons";
import { useGroupSelection } from "@/state/GroupContext";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelectorOverlay } from "@/state/GroupSelectorOverlayContext";
import { groupsRepository } from "@/repositories";

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  const { refresh } = useAuth();
  const overlay = useGroupSelectorOverlay();

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) overlay.show();
    else overlay.hide();
  }, [overlay]);

  const handleRename = useCallback(async (groupId: string, name: string) => {
    await groupsRepository.updateGroupName({ groupId, name });
    await refresh();
  }, [refresh]);

  const handleCheckLeave = useCallback(async (groupId: string) => {
    const { members } = await groupsRepository.listMembers({ groupId });
    const isSoleMember = members.length <= 1;
    const adminCount = members.filter((m) => m.role === "owner" || m.role === "admin").length;
    return { isSoleMember, isSoleAdmin: adminCount <= 1 };
  }, []);

  const handleLeave = useCallback(async (groupId: string) => {
    await groupsRepository.leaveGroup({ groupId });
    await refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (groupId: string) => {
    await groupsRepository.deleteGroup({ groupId });
    await refresh();
  }, [refresh]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) + 8 }]}>
      <HeaderGroupSelector
        memberships={memberships}
        selectedGroupId={selectedGroupId}
        onSelectGroup={(nextGroupId) => void setSelectedGroupId(nextGroupId)}
        onRenameGroup={handleRename}
        onCheckLeave={handleCheckLeave}
        onLeaveGroup={handleLeave}
        onDeleteGroup={handleDelete}
        onOpenChange={handleOpenChange}
        forceClose={!overlay.visible}
        actionIcons={
          <HeaderActionIcons
            onPressNotifications={() => navigation.navigate("Notificaciones")}
          />
        }
      />
      <View style={styles.bottomAccentBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginHorizontal: -12
  },
  bottomAccentBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.primary
  }
});
