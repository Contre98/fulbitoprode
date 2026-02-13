import type { FixtureDateCard, GroupCard, LeaderboardRow, MatchCardData } from "@/lib/types";

export const currentLeagueLabel = "Liga Argentina/Grupo Amigos";

export const homeGroupCards: GroupCard[] = [
  {
    id: "grupo-amigos",
    title: "Grupo Amigos",
    subtitle: "GRUPO",
    rank: "#4",
    rankDelta: "▲ 2",
    points: "128",
    primary: true
  },
  {
    id: "prode-laboral",
    title: "Prode Laboral",
    subtitle: "GRUPO",
    rank: "#1",
    points: "142"
  }
];

export const liveMatches: MatchCardData[] = [
  {
    id: "m1",
    status: "live",
    homeTeam: { code: "RAC" },
    awayTeam: { code: "IND" },
    score: { home: 2, away: 1 },
    prediction: { home: 2, away: 1 },
    meta: { label: "EN VIVO · 85' ST" },
    points: { value: 3, tone: "positive" },
    progress: 75
  },
  {
    id: "m2",
    status: "live",
    homeTeam: { code: "BOC" },
    awayTeam: { code: "RIV" },
    score: { home: 2, away: 0 },
    prediction: { home: 4, away: 1 },
    meta: { label: "EN VIVO · 73' ST" },
    points: { value: 1, tone: "warning" },
    progress: 75
  },
  {
    id: "m3",
    status: "live",
    homeTeam: { code: "PLA" },
    awayTeam: { code: "ARG" },
    score: { home: 1, away: 0 },
    prediction: { home: 1, away: 1 },
    meta: { label: "EN VIVO · 22' PT" },
    points: { value: 0, tone: "danger" },
    progress: 75
  }
];

export const pronosticosMatches: MatchCardData[] = [
  liveMatches[0],
  {
    id: "upcoming-1",
    status: "upcoming",
    homeTeam: { code: "RIV" },
    awayTeam: { code: "BOC" },
    meta: { label: "POR JUGAR · HOY 17:00", venue: "MONUMENTAL" }
  },
  {
    id: "upcoming-2",
    status: "upcoming",
    homeTeam: { code: "ROS" },
    awayTeam: { code: "TAL" },
    meta: { label: "POR JUGAR · HOY 19:30", venue: "UNO" }
  },
  {
    id: "final-1",
    status: "final",
    homeTeam: { code: "VEL" },
    awayTeam: { code: "SLO" },
    score: { home: 1, away: 1 },
    prediction: { home: 0, away: 0 },
    meta: { label: "FINALIZADO" },
    points: { value: 1, tone: "neutral" }
  }
];

export const leaderboardRows: LeaderboardRow[] = [
  { rank: 1, name: "Los Pibes FC", predictions: 74, record: "24/38/12", points: 110, highlight: true },
  { rank: 2, name: "Villa United", predictions: 74, record: "20/34/20", points: 102 },
  { rank: 3, name: "Naranja Mecanica", predictions: 74, record: "18/33/23", points: 96 },
  { rank: 4, name: "La Banda", predictions: 74, record: "16/31/27", points: 89 },
  { rank: 5, name: "Barrio Norte", predictions: 74, record: "13/28/33", points: 80 },
  { rank: 6, name: "Los del Oeste", predictions: 74, record: "10/26/38", points: 72 },
  { rank: 7, name: "Atletico Sur", predictions: 74, record: "9/24/41", points: 67 },
  { rank: 8, name: "Tiro Libre", predictions: 74, record: "8/23/43", points: 63 },
  { rank: 9, name: "La Maquina", predictions: 74, record: "7/22/45", points: 59 },
  { rank: 10, name: "Cantera FC", predictions: 74, record: "6/20/48", points: 54 },
  { rank: 11, name: "Estrella Roja", predictions: 74, record: "5/19/50", points: 51 }
];

export const fixtureDateCards: FixtureDateCard[] = [
  {
    dateLabel: "Jueves, 12 de Febrero",
    rows: [
      { home: "Tigre", away: "Aldosivi", scoreLabel: "FINAL · 3 - 1", tone: "final" },
      { home: "Argentinos JRS", away: "River Plate", scoreLabel: "FINAL · 2 - 4", tone: "final" }
    ]
  },
  {
    dateLabel: "Viernes, 13 de Febrero",
    rows: [
      { home: "Defensa y Justicia", away: "Velez Sarsfield", scoreLabel: "FINAL · 0 - 0", tone: "final" },
      { home: "Union Santa Fe", away: "San Lorenzo", scoreLabel: "FINAL · 3 - 1", tone: "final" }
    ]
  },
  {
    dateLabel: "Sábado, 14 de Febrero",
    accent: "live",
    rows: [{ home: "Boca Juniors", away: "Rosario Central", scoreLabel: "EN VIVO · 0 - 0", tone: "live" }]
  },
  {
    dateLabel: "Domingo, 15 de Febrero",
    rows: [
      { home: "Platense", away: "Godoy Cruz", scoreLabel: "POR JUGAR · 16:00", tone: "upcoming" },
      { home: "Instituto", away: "Atlético Tucumán", scoreLabel: "POR JUGAR · 18:30", tone: "upcoming" },
      { home: "Racing Club", away: "Estudiantes", scoreLabel: "POR JUGAR · 22:15", tone: "warning" }
    ]
  }
];
