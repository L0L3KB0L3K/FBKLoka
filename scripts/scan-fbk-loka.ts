// Lists every current-season competition where a team name starts with "FBK Loka" (SPEC.md §5.7).
// Run by hand once per season: `npm run scan:ff`. Copy the IDs into src/config/ff.ts.
import { ffRequest, pause } from "./ff-api.ts";

// 55 = Austrian federation (IFL), 86 = Floorball zveza Slovenije.
const ORGANIZERS = [55, 86];

const COMPETITIONS_QUERY = `query competitionsCurrentSeason($organizerId: Int) {
  competitions: competitionsCurrentSeason(organizerId: $organizerId) { id name season }
}`;

const TEAMS_QUERY = `query competitionTeams($competitionId: Int!) {
  competitionDetails(competitionId: $competitionId) { id name teams { id name } }
}`;

type Competition = { id: number; name: string; season: number };
type Details = { competitionDetails: { id: number; name: string; teams: { id: number; name: string }[] } };

for (const organizerId of ORGANIZERS) {
  const { competitions } = await ffRequest<{ competitions: Competition[] }>(
    "competitionsCurrentSeason",
    COMPETITIONS_QUERY,
    { organizerId },
  );
  console.log(`\nOrganizer ${organizerId}: ${competitions.length} competitions`);

  for (const competition of competitions) {
    await pause();
    try {
      const { competitionDetails } = await ffRequest<Details>("competitionTeams", TEAMS_QUERY, {
        competitionId: competition.id,
      });
      const loka = competitionDetails.teams.filter((team) => team.name.startsWith("FBK Loka"));
      if (loka.length) {
        const teams = loka.map((team) => `"${team.name}" (team ${team.id})`).join(", ");
        console.log(`  ${competition.id}  ${competition.name} [${competition.season}]  ->  ${teams}`);
      }
    } catch (error) {
      console.warn(`  ${competition.id}  ${competition.name}: failed (${(error as Error).message})`);
    }
  }
}
