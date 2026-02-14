import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { HomeScreen } from "@/components/home/HomeScreen";

vi.mock("@/lib/use-auth-session", () => ({
  useAuthSession: () => ({
    user: {
      id: "u1",
      name: "Juan",
      email: "juan@example.com"
    },
    memberships: [
      {
        groupId: "g1",
        groupName: "Grupo 1",
        role: "owner",
        leagueId: 128,
        leagueName: "Liga Profesional",
        season: "2026"
      }
    ],
    activeGroupId: "g1",
    setActiveGroupId: vi.fn()
  })
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    groupCards: [],
    liveCards: [],
    updatedAt: new Date().toISOString()
  })
}) as unknown as typeof fetch;

describe("Home screen smoke", () => {
  it("renders key sections and nav labels", async () => {
    render(<HomeScreen />);

    expect(screen.getByText("Próximos Partidos")).toBeInTheDocument();
    expect(screen.queryByText("SELECCION ACTUAL")).not.toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
    expect(screen.getByText("Posiciones")).toBeInTheDocument();
    expect(screen.getByText("Pronósticos")).toBeInTheDocument();
    expect(screen.getByText("Fixture")).toBeInTheDocument();
    expect(screen.getByText("Grupos")).toBeInTheDocument();
  });
});
