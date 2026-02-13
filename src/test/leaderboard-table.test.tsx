import React from "react";
import { render, screen } from "@testing-library/react";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";

describe("LeaderboardTable", () => {
  it("renders expected columns and highlight row", () => {
    render(
      <LeaderboardTable
        mode="posiciones"
        rows={[
          { rank: 1, name: "Los Pibes FC", predictions: 74, record: "24/38/12", points: 110, highlight: true },
          { rank: 2, name: "Villa United", predictions: 74, record: "20/34/20", points: 102 }
        ]}
      />
    );

    expect(screen.getByText("Pred")).toBeInTheDocument();
    expect(screen.getByText("E/WD/N")).toBeInTheDocument();
    expect(screen.getByText("Pts")).toBeInTheDocument();
    expect(screen.getByText("Los Pibes FC")).toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-highlight-icon")).toBeInTheDocument();
  });
});
