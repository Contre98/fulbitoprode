import React from "react";
import { render, screen } from "@testing-library/react";
import { MatchCard } from "@/components/matches/MatchCard";

describe("MatchCard", () => {
  it("renders live match state", () => {
    const { container } = render(
      <MatchCard
        id="m1"
        status="live"
        homeTeam={{ code: "RAC" }}
        awayTeam={{ code: "IND" }}
        score={{ home: 2, away: 1 }}
        prediction={{ home: 2, away: 1 }}
        meta={{ label: "EN VIVO · 85' ST" }}
        points={{ value: 3, tone: "positive" }}
        progress={76}
      />
    );

    expect(screen.getByText("EN VIVO · 85' ST")).toBeInTheDocument();
    expect(screen.getByText("RAC")).toBeInTheDocument();
    expect(screen.getByText("IND")).toBeInTheDocument();
    expect(screen.getByText("+3 pts")).toBeInTheDocument();
    expect(screen.getByText("TU PRODE: 2-1")).toBeInTheDocument();
    expect(container.querySelector('div[style*="width: 76%"]')).toBeInTheDocument();
  });

  it("renders upcoming match state with stepper", () => {
    render(
      <MatchCard
        id="m2"
        status="upcoming"
        homeTeam={{ code: "RIV" }}
        awayTeam={{ code: "BOC" }}
        meta={{ label: "POR JUGAR · HOY 17:00", venue: "MONUMENTAL" }}
        showPredictionStepper
        stepper={{
          homeValue: null,
          awayValue: null
        }}
      />
    );

    expect(screen.getByText("POR JUGAR · HOY 17:00")).toBeInTheDocument();
    expect(screen.getByText("MONUMENTAL")).toBeInTheDocument();
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("renders final match state", () => {
    render(
      <MatchCard
        id="m3"
        status="final"
        homeTeam={{ code: "VEL" }}
        awayTeam={{ code: "SLO" }}
        score={{ home: 1, away: 1 }}
        prediction={{ home: 0, away: 0 }}
        meta={{ label: "FINALIZADO" }}
        points={{ value: 1, tone: "neutral" }}
      />
    );

    expect(screen.getByText("FINALIZADO")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("TU PRODE: 0-0")).toBeInTheDocument();
  });
});
