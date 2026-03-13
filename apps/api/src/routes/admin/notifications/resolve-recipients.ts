import { getPocketBaseConfig } from "@fulbito/server-core/pocketbase";
import type { NotificationTargetScope } from "@fulbito/domain";

interface PbListResult<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

async function pbAdminRequest<T>(path: string): Promise<T> {
  const { url } = getPocketBaseConfig();
  const res = await fetch(`${url}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`PocketBase ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function q(v: string) {
  return `'${v.replace(/'/g, "\\'")}'`;
}

/**
 * Resolve the final list of user IDs for a given targeting scope.
 *
 * scope=user  → targetIds are already user IDs
 * scope=group → fetch all member user IDs for each group
 * scope=global → fetch all user IDs from PocketBase (paginated)
 */
export async function resolveRecipientUserIds(input: {
  scope: NotificationTargetScope;
  targetIds?: string[];
}): Promise<string[]> {
  if (input.scope === "user") {
    return [...new Set(input.targetIds || [])];
  }

  if (input.scope === "group") {
    if (!input.targetIds?.length) return [];
    const userIds = new Set<string>();
    for (const groupId of input.targetIds) {
      const filter = `group_id=${q(groupId)} && status='active'`;
      const result = await pbAdminRequest<PbListResult<{ user_id: string }>>(
        `/api/collections/group_memberships/records?filter=${encodeURIComponent(filter)}&perPage=500&fields=user_id`
      );
      for (const row of result.items) userIds.add(row.user_id);
    }
    return [...userIds];
  }

  // scope=global — paginate through all users
  const userIds: string[] = [];
  let page = 1;
  while (true) {
    const result = await pbAdminRequest<PbListResult<{ id: string }>>(
      `/api/collections/users/records?perPage=200&page=${page}&fields=id`
    );
    for (const row of result.items) userIds.push(row.id);
    if (page >= result.totalPages) break;
    page++;
  }
  return userIds;
}
