import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ProfilePageClient from "@/app/perfil/ProfilePageClient";

const replaceMock = vi.fn();
const refreshMock = vi.fn().mockResolvedValue(undefined);
const mockUser = {
  id: "u1",
  name: "Facundo Contreras",
  email: "facu@example.com",
  username: "facu"
};
const mockMemberships = [
  {
    groupId: "g1",
    groupName: "Los Galácticos",
    role: "owner" as const,
    leagueId: 128,
    leagueName: "Liga Profesional",
    season: "2026",
    joinedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    teamLogoDataUrl: "data:image/png;base64,ZmFrZQ=="
  }
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock
  }),
  usePathname: () => "/perfil"
}));

vi.mock("@/lib/use-theme", () => ({
  useTheme: () => ({
    toggleTheme: vi.fn()
  })
}));

vi.mock("@/lib/use-auth-session", () => ({
  useAuthSession: () => ({
    loading: false,
    authenticated: true,
    user: mockUser,
    memberships: mockMemberships,
    activeGroupId: "g1",
    setActiveGroupId: vi.fn(),
    refresh: refreshMock
  })
}));

describe("Perfil screen", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stats: {
          totalPoints: 1240,
          accuracyPct: 70,
          groups: 2
        },
        recentActivity: [
          {
            id: "pred:1",
            type: "prediction",
            label: "Pronóstico: Boca vs River",
            occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            points: 3
          }
        ],
        updatedAt: new Date().toISOString()
      })
    }) as unknown as typeof fetch;
  });

  it("renders profile content and toggles compact mode", async () => {
    render(<ProfilePageClient />);

    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getByText("Actividad Reciente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inicio/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Grupos/i })).toHaveAttribute("href", "/configuracion");

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Pronóstico: Boca vs River")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("1240")).toBeInTheDocument());
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.queryByText(/Ranking/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SELECCIÓN ACTUAL/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Estadísticas y actividad" }));
    expect(screen.getByRole("button", { name: "Editar Perfil" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Editar Perfil" })[0]);
    expect(screen.getByText("Nombre Completo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeInTheDocument();
  });

  it("lets the user edit username and email", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "/api/profile") {
        return {
          ok: true,
          json: async () => ({
            stats: { totalPoints: 1240, accuracyPct: 70, groups: 2 },
            recentActivity: [],
            updatedAt: new Date().toISOString()
          })
        } as Response;
      }

      if (input === "/api/auth/me" && init?.method === "PATCH") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            user: {
              id: "u1",
              email: "nuevo@example.com",
              name: "Facundo Contreras",
              username: "nuevo"
            }
          })
        } as Response;
      }

      return { ok: false, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    render(<ProfilePageClient />);

    await waitFor(() => expect(screen.getByText("Perfil")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Editar Perfil" }));

    fireEvent.change(screen.getByDisplayValue("@facu"), { target: { value: "@nuevo" } });
    fireEvent.change(screen.getByDisplayValue("facu@example.com"), { target: { value: "nuevo@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());

    const authCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url, options]) => url === "/api/auth/me" && (options as RequestInit | undefined)?.method === "PATCH"
    );

    expect(authCall).toBeDefined();
    const requestBody = JSON.parse(((authCall?.[1] as RequestInit | undefined)?.body as string) || "{}") as {
      username?: string;
      email?: string;
    };
    expect(requestBody.username).toBe("nuevo");
    expect(requestBody.email).toBe("nuevo@example.com");
  });
});
