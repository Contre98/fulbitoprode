import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ConfiguracionPerfilPageClient from "@/app/configuracion/perfil/ConfiguracionPerfilPageClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn()
  }),
  usePathname: () => "/configuracion/perfil"
}));

vi.mock("@/lib/use-auth-session", () => ({
  useAuthSession: () => ({
    loading: false,
    authenticated: true,
    user: {
      id: "u1",
      email: "juan@example.com",
      name: "Juan Perez",
      favoriteTeam: "Boca Juniors"
    },
    memberships: [],
    activeGroupId: null,
    activeGroup: null,
    setActiveGroupId: vi.fn(),
    refresh: vi.fn()
  })
}));

describe("Configuracion perfil screen", () => {
  it("renders profile details and actions", () => {
    render(<ConfiguracionPerfilPageClient />);

    expect(screen.getByText("Volver")).toBeInTheDocument();
    expect(screen.getByText("Datos y preferencias")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });
});
