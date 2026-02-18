import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ConfiguracionPageClient from "@/app/configuracion/ConfiguracionPageClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn()
  }),
  usePathname: () => "/configuracion",
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("@/lib/use-auth-session", () => ({
  useAuthSession: () => ({
    loading: false,
    authenticated: true,
    user: {
      id: "u1",
      email: "juan@example.com",
      name: "Juan Perez"
    },
    memberships: [
      {
        groupId: "g1",
        groupName: "Grupo Amigos",
        role: "admin",
        leagueId: 128,
        leagueName: "Liga Profesional (Apertura 2026)",
        season: "2026",
        competitionKey: "arg-primera-division",
        competitionName: "Liga Profesional",
        competitionStage: "apertura"
      }
    ],
    activeGroupId: "g1",
    setActiveGroupId: vi.fn(),
    refresh: vi.fn()
  })
}));

global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/api/leagues")) {
    return {
      ok: true,
      json: async () => ({
        leagues: [
          {
            id: 128,
            name: "Liga Profesional",
            season: "2026",
            competitionKey: "arg-primera-division",
            competitionName: "Liga Profesional",
            competitionStage: "apertura",
            status: "ongoing"
          }
        ],
        updatedAt: new Date().toISOString()
      })
    };
  }

  if (url.includes("/api/groups/") && url.includes("/invite")) {
    return {
      ok: true,
      json: async () => ({
        invite: {
          code: "ABC12345",
          token: "token-demo",
          expiresAt: new Date(Date.now() + 3600_000).toISOString()
        },
        canRefresh: true
      })
    };
  }

  return {
    ok: true,
    json: async () => ({})
  };
}) as unknown as typeof fetch;

describe("Configuracion grupos screen", () => {
  it("renders group management and invite panel", async () => {
    render(<ConfiguracionPageClient />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(screen.getByText("Crear grupo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Código o token de invitación")).toBeInTheDocument();
    expect(screen.getByText("Mis Grupos")).toBeInTheDocument();
    expect(screen.getByText("Grupo Amigos")).toBeInTheDocument();
    expect(screen.queryByText("Perfil")).not.toBeInTheDocument();
    expect(screen.queryByText("SELECCION ACTUAL")).not.toBeInTheDocument();
    expect(screen.queryByText("Reglas del Prode")).not.toBeInTheDocument();
    expect(screen.queryByText("Abandonar")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
    expect(screen.queryByText(/En curso/i)).not.toBeInTheDocument();
  });
});
