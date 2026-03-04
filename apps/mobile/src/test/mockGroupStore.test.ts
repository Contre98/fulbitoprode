import { createMockGroup, joinMockGroup, listMockMemberships, resetMockGroupStore } from "@/repositories/mockGroupStore";

describe("mockGroupStore", () => {
  beforeEach(() => {
    resetMockGroupStore();
  });

  it("creates a new owner membership when creating a group", () => {
    const created = createMockGroup({ name: "Equipo QA" });
    const memberships = listMockMemberships();

    expect(created.name).toBe("Equipo QA");
    expect(memberships[0]?.groupId).toBe(created.id);
    expect(memberships[0]?.role).toBe("owner");
  });

  it("creates a member membership when joining by invite code", () => {
    const joined = joinMockGroup({ codeOrToken: "ABC123" });
    const memberships = listMockMemberships();

    expect(joined.name).toContain("ABC123");
    expect(memberships[0]?.groupId).toBe(joined.id);
    expect(memberships[0]?.role).toBe("member");
  });
});
