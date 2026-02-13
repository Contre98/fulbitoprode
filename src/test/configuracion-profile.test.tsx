import React from "react";
import { render, screen } from "@testing-library/react";
import ConfiguracionPerfilPage from "@/app/configuracion/perfil/page";

describe("Configuracion perfil screen", () => {
  it("renders profile details and actions", () => {
    render(<ConfiguracionPerfilPage />);

    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getByText("Datos y preferencias")).toBeInTheDocument();
    expect(screen.getByText("Cuenta verificada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });
});
