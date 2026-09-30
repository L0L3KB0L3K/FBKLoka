// Lists every current-season competition where a team name starts with "FBK Loka" (SPEC.md §5.7).
// By hand: `npm run scan:ff`, then copy the IDs into src/config/ff.ts.
// With --check (the last step of the Sunday run in .github/workflows/fetch-ff.yml): prints only the competitions that
// src/config/ff.ts does not have yet and exits 1 when there are any, so the run fails and GitHub e-mails the owner.
// The data of that run is already published by then. A failed request is a warning, never a failure.
import { FF_CONFIG } from "../src/config/ff.ts";
import { newCompetitions, type LokaCompetition } from "../src/lib/ff-scan.ts";
import { ffRequest, pause } from "./ff-api.ts";

// 55 = Austrian federation (IFL), 86 = Floorball zveza Slovenije.
const ORGANIZERS = [55, 86];
const CHECK = process.argv.includes("--check");

const COMPETITIONS_QUERY = `query competitionsCurrentSeason($organizerId: Int) {
  competitions: competitionsCurrentSeason(organizerId: $organizerId) { id name season }
}`;

const TEAMS_QUERY = `query competitionTeams($competitionId: Int!) {
  competitionDetails(competitionId: $competitionId) { id name teams { id name } }
}`;

type Competition = { id: number; name: string; season: number };
type Details = { competitionDetails: { id: number; name: string; teams: { id: number; name: string }[] } };

const found: LokaCompetition[] = [];
let failed = 0;

for (const organizerId of ORGANIZERS) {
  let competitions: Competition[];
  try {
    ({ competitions } = await ffRequest<{ competitions: Competition[] }>("competitionsCurrentSeason", COMPETITIONS_QUERY, {
      organizerId,
    }));
  } catch (error) {
    failed++;
    console.warn(`::warning::FloorballFlash organizer ${organizerId}: ${(error as Error).message}`);
    continue;
  }
  if (!CHECK) console.log(`\nOrganizer ${organizerId}: ${competitions.length} competitions`);

  for (const competition of competitions) {
    await pause();
    try {
      const { competitionDetails } = await ffRequest<Details>("competitionTeams", TEAMS_QUERY, {
        competitionId: competition.id,
      });
      const loka = competitionDetails.teams.filter((team) => team.name.startsWith("FBK Loka"));
      if (loka.length) {
        found.push({ id: competition.id, name: competition.name, teams: loka.map((team) => team.name) });
        if (!CHECK) {
          const teams = loka.map((team) => `"${team.name}" (team ${team.id})`).join(", ");
          console.log(`  ${competition.id}  ${competition.name} [${competition.season}]  ->  ${teams}`);
        }
      }
    } catch (error) {
      failed++;
      console.warn(`${CHECK ? "::warning::" : "  "}${competition.id}  ${competition.name}: failed (${(error as Error).message})`);
    }
  }
}

if (CHECK) {
  const fresh = newCompetitions(found, FF_CONFIG);
  for (const c of fresh) {
    console.log(`::error::New FloorballFlash competition with FBK Loka: ${c.id} ${c.name} (${c.teams.join(", ")}). Add it to src/config/ff.ts.`);
  }
  console.log(`Checked: ${found.length} competitions with FBK Loka, ${fresh.length} new${failed ? `, ${failed} requests failed` : ""}.`);
  if (fresh.length > 0) process.exit(1);
}
