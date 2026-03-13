import { describe, expect, it } from "vitest";
import { __testOnlyLeaderboardStats } from "../routes/leaderboard/route";

describe("leaderboard stats detailed sections", () => {
  it("computes user/group sections and comparatives from closed predictions", () => {
    const members = [
      { userId: "u-1", name: "Usuario Uno" },
      { userId: "u-2", name: "Usuario Dos" }
    ];

    const predictions = [
      { userId: "u-1", period: "p1", fixtureId: "f1", home: 1, away: 0 },
      { userId: "u-1", period: "p1", fixtureId: "f2", home: 1, away: 0 },
      { userId: "u-2", period: "p1", fixtureId: "f1", home: 2, away: 0 },
      { userId: "u-2", period: "p1", fixtureId: "f2", home: 0, away: 1 },
      { userId: "u-1", period: "p2", fixtureId: "f3", home: 1, away: 1 },
      { userId: "u-1", period: "p2", fixtureId: "f4", home: 2, away: 2 },
      { userId: "u-2", period: "p2", fixtureId: "f3", home: 0, away: 0 },
      { userId: "u-2", period: "p2", fixtureId: "f4", home: 0, away: 1 }
    ];

    const scoreMapByPeriod = new Map<string, Map<string, { home: number; away: number }>>([
      [
        "p1",
        new Map([
          ["f1", { home: 1, away: 0 }],
          ["f2", { home: 0, away: 1 }]
        ])
      ],
      [
        "p2",
        new Map([
          ["f3", { home: 1, away: 1 }],
          ["f4", { home: 2, away: 1 }]
        ])
      ]
    ]);

    const periodSnapshots = [
      {
        period: "p1",
        periodLabel: "Fecha 1",
        rows: [
          { rank: 1, userId: "u-2", name: "Usuario Dos", predictions: 2, record: "1/1/0", points: 4 },
          { rank: 2, userId: "u-1", name: "Usuario Uno", predictions: 2, record: "1/0/1", points: 3 }
        ]
      },
      {
        period: "p2",
        periodLabel: "Fecha 2",
        rows: [
          { rank: 1, userId: "u-1", name: "Usuario Uno", predictions: 2, record: "1/0/1", points: 3 },
          { rank: 2, userId: "u-2", name: "Usuario Dos", predictions: 2, record: "0/1/1", points: 1 }
        ]
      }
    ];

    const summary = {
      memberCount: 2,
      scoredPredictions: 8,
      correctPredictions: 5,
      exactPredictions: 3,
      resultPredictions: 2,
      missPredictions: 3,
      accuracyPct: 63,
      totalPoints: 11,
      averageMemberPoints: 5.5,
      bestRound: null,
      worstRound: null,
      worldBenchmark: null
    };

    const globalRows = [
      { rank: 1, userId: "u-1", name: "Usuario Uno", predictions: 4, record: "2/0/2", points: 6 },
      { rank: 2, userId: "u-2", name: "Usuario Dos", predictions: 4, record: "1/2/1", points: 5 }
    ];

    const result = __testOnlyLeaderboardStats.buildDetailedStatsSections({
      currentUserId: "u-1",
      members,
      predictions,
      scoreMapByPeriod,
      periodSnapshots,
      globalRows,
      summary
    });

    expect(result.userSection).toEqual(
      expect.objectContaining({
        userId: "u-1",
        precisionPct: 50,
        exactPct: 50,
        averagePointsPerRound: 3,
        consistencyStdDev: 0,
        nearMissRatePct: 0,
        homeAccuracyPct: 50,
        awayAccuracyPct: 0,
        trend: {
          accuracyPctDelta: 0,
          pointsPerRoundDelta: 0
        }
      })
    );

    expect(result.groupSection).toEqual(
      expect.objectContaining({
        precisionPct: 63,
        consensusHitPct: 100,
        advantageOpportunityCount: 0,
        activeParticipationPct: 100,
        parityGapTopVsMedian: 3.2,
        pointsDistribution: {
          p25: 2.6,
          median: 2.8,
          p75: 2.9
        }
      })
    );

    expect(result.comparatives).toEqual({
      vsMedianAccuracyPct: -12.5,
      vsMedianPointsPerRound: 0.2
    });
  });

  it("returns safe defaults when there are no closed predictions", () => {
    const result = __testOnlyLeaderboardStats.buildDetailedStatsSections({
      currentUserId: "u-1",
      members: [{ userId: "u-1", name: "Usuario Uno" }],
      predictions: [],
      scoreMapByPeriod: new Map(),
      periodSnapshots: [],
      globalRows: [{ rank: 1, userId: "u-1", name: "Usuario Uno", predictions: 0, record: "0/0/0", points: 0 }],
      summary: {
        memberCount: 1,
        scoredPredictions: 0,
        correctPredictions: 0,
        exactPredictions: 0,
        resultPredictions: 0,
        missPredictions: 0,
        accuracyPct: 0,
        totalPoints: 0,
        averageMemberPoints: 0,
        bestRound: null,
        worstRound: null,
        worldBenchmark: null
      }
    });

    expect(result.userSection).toEqual(
      expect.objectContaining({
        precisionPct: 0,
        exactPct: 0,
        averagePointsPerRound: 0,
        nearMissRatePct: 0,
        homeAccuracyPct: 0,
        awayAccuracyPct: 0
      })
    );
    expect(result.groupSection).toEqual(
      expect.objectContaining({
        precisionPct: 0,
        activeParticipationPct: 0,
        consensusHitPct: 0,
        advantageOpportunityCount: 0
      })
    );
    expect(result.comparatives).toEqual({
      vsMedianAccuracyPct: 0,
      vsMedianPointsPerRound: 0
    });
  });
});
