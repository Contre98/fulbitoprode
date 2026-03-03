import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ConfiguracionAjustesPageClient from "@/app/configuracion/ajustes/ConfiguracionAjustesPageClient";

const replaceMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn(async () => undefined);
const showToastMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock
  }),
  usePathname: () => "/configuracion/ajustes"
}));

vi.mock("@/lib/use-auth-session", () => ({
  useAuthSession: () => ({
    loading: false,
    authenticated: true,
    user: {
      id: "u1",
      name: "Facundo Contreras"
    },
    memberships: [],
    activeGroupId: null,
    setActiveGroupId: vi.fn(),
    refresh: refreshMock
  })
}));

vi.mock("@/lib/use-theme", () => ({
  useTheme: () => ({
    toggleTheme: vi.fn()
  })
}));

vi.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({
    showToast: showToastMock
  })
}));

describe("Configuracion ajustes screen", () => {
  it("renders sections and keeps toggle behavior", () => {
    render(<ConfiguracionAjustesPageClient />);

    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByText("Ajustes de la cuenta")).toBeInTheDocument();
    expect(screen.getByText("Push Notifications")).toBeInTheDocument();
    expect(screen.getByText("Vibración")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mi Perfil/i })).toHaveAttribute("href", "/perfil");
    expect(screen.getByRole("button", { name: /Cerrar Sesión/i })).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Push Notifications" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});
