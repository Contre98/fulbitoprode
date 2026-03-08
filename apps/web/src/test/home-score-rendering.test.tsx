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

describe("Home screen score rendering", () => {
  it("renders live score from structured row.score instead of parsing row.scoreLabel", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        groupCards: [],
        updatedAt: new Date().toISOString(),
        liveCards: [
          {
            dateLabel: "Hoy",
            accent: "live",
            rows: [
              {
                home: "Boca Juniors",
                away: "River Plate",
                tone: "live",
                scoreLabel: "EN VIVO · SIN DATOS",
                score: {
                  home: 5,
                  away: 4
                },
                kickoffAt: "2026-03-08T21:00:00.000Z",
                statusDetail: "PT 33'"
              }
            ]
          }
        ]
      })
    }) as unknown as typeof fetch;

    render(<HomeScreen />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("5 - 4")).toBeInTheDocument());
    expect(screen.queryByText("0 - 0")).not.toBeInTheDocument();
  });
});
