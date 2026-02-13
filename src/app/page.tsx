import { HomeScreen } from "@/components/home/HomeScreen";
import { fetchLigaArgentinaFixtures, mapFixturesToHomeLiveMatches } from "@/lib/liga-live-provider";
import { currentLeagueLabel, homeGroupCards, liveMatches } from "@/lib/mock-data";

async function loadHomeMatches() {
  const fixtures = await fetchLigaArgentinaFixtures("fecha14");
  if (fixtures.length === 0) {
    return liveMatches;
  }

  const mapped = mapFixturesToHomeLiveMatches(fixtures);
  return mapped.length > 0 ? mapped : liveMatches;
}

export default async function Page() {
  const matches = await loadHomeMatches();

  return <HomeScreen leagueLabel={currentLeagueLabel} groupCards={homeGroupCards} matches={matches} />;
}
