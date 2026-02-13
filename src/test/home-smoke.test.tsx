import React from "react";
import { render, screen } from "@testing-library/react";
import { HomeScreen } from "@/components/home/HomeScreen";

describe("Home screen smoke", () => {
  it("renders key sections and nav labels", () => {
    render(<HomeScreen />);

    expect(screen.getByText("Partidos en vivo")).toBeInTheDocument();
    expect(screen.getByText("Ver todo")).toBeInTheDocument();
    expect(screen.getByText("+3 pts")).toBeInTheDocument();

    expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);
    expect(screen.getByText("Posiciones")).toBeInTheDocument();
    expect(screen.getByText("Pronósticos")).toBeInTheDocument();
    expect(screen.getByText("Fixture")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });
});
