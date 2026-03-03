# Project: Fulbito Prode (Social Sports Prediction App)

## 🎯 App Vision
A competitive sports prediction platform where users guess scores for football matches. The UI must be high-contrast, "night-mode" first, and mobile-optimized.

## 🛠 Tech Stack
- **Frontend:** Next.js 15+ (App Router), TypeScript.
- **Styling:** Tailwind CSS 4.0.
- **Components:** Shadcn/UI (modified for dark aesthetics).
- **Icons:** Lucide-React.
- **Animations:** Framer Motion (for score steppers and card transitions).

## 🎨 Design System (Extracted from Pencil)
- **Primary Background:** #000000 (True Black)
- **Surface/Card:** #111111 (Dark Charcoal)
- **Primary Accent:** #D9FF00 (Lime Green / "Green Glow") — Used for points, selected tabs, and active states.
- **Secondary Accent:** #888888 (Muted Gray) for subtext.
- **Typography:** Sans-serif (Inter or Geist), high weight for headers.
- **Borders:** 1px solid #222222.

## 🔢 Business Logic (Prode Rules)
- **Exact Score (+3 pts):** User predicted 2-1, final was 2-1.
- **Correct Outcome (+1 pt):** User predicted 1-0 (Home win), final was 3-1 (Home win).
- **Incorrect (+0 pts):** General miss.

## 📱 Core Screens (Mapping)
1. **Inicio:** Dashboard showing active groups, ranking, and "Live" matches with "Tu Prode" (User Prediction) comparisons.
2. **Posiciones:** Leaderboard table with "Posiciones" and "Stats" toggles.
3. **Pronósticos:** The entry engine. Use steppers for score input.
4. **Fixture:** Chronological list of matches grouped by date (e.g., "Jueves, 12 de Febrero").