import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderGroupSelector } from "@/components/HeaderGroupSelector";
import { HeaderActionIcons } from "@/components/HeaderActionIcons";
import { useGroupSelection } from "@/state/GroupContext";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelectorOverlay } from "@/state/GroupSelectorOverlayContext";
import { groupsRepository, notificationsRepository } from "@/repositories";
import { useNotificationsOverlay } from "@/state/NotificationsOverlayContext";
import { useNavigationChromeTheme } from "@/theme/navigationChromeTheme";

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const chromeTheme = useNavigationChromeTheme();
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  const { refresh } = useAuth();
  const overlay = useGroupSelectorOverlay();
  const notificationsOverlay = useNotificationsOverlay();
  const notificationsQuery = useQuery({
    queryKey: ["notifications-inbox"],
    queryFn: () => notificationsRepository.listInbox(),
    staleTime: 30_000
  });
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

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
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 10) + 8,
          backgroundColor: chromeTheme.headerBackground,
          borderBottomColor: chromeTheme.headerBorder
        }
      ]}
    >
      <View style={styles.selectorLayer}>
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
              notificationCount={unreadCount}
              onPressNotifications={notificationsOverlay.toggle}
            />
          }
        />
      </View>
      <View style={[styles.bottomAccentBar, { backgroundColor: chromeTheme.headerAccent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    marginHorizontal: -12,
    position: "relative",
    zIndex: 5
  },
  selectorLayer: {
    position: "relative",
    zIndex: 2
  },
  bottomAccentBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    zIndex: 1
  }
});
