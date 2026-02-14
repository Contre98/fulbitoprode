import React from "react";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "@/components/layout/BottomNav";

describe("BottomNav", () => {
  it("renders tab links", () => {
    render(<BottomNav activeTab="inicio" />);

    expect(screen.getByRole("link", { name: /Inicio/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Posiciones/i })).toHaveAttribute("href", "/posiciones");
    expect(screen.getByRole("link", { name: /Pronósticos/i })).toHaveAttribute("href", "/pronosticos");
    expect(screen.getByRole("link", { name: /Fixture/i })).toHaveAttribute("href", "/fixture");
    expect(screen.getByRole("link", { name: /Grupos/i })).toHaveAttribute("href", "/configuracion");
  });
});
