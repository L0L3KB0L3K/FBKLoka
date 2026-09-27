// Fetches FBK Loka matches from FloorballFlash and writes src/data/ff/matches.json and meta.json.
// Runs in the GitHub Action (fetch-ff.yml) and by hand: `npm run fetch:ff`. SPEC.md §5.5:
// 1. one call per configured competition, 300 ms apart,
// 2. our team is found by exact name; if missing: warning, keep old data, continue,
// 3. normalisation is the pure function normalize() in src/lib/ff.ts,
// 4. a failed call never overwrites the last good data of that competition,
// 5. if every call fails: exit code 1 (GitHub e-mails the repo owner), nothing is written,
// 6. files are written only when the matches change (no change = no commit = no build).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { FF_CONFIG } from "../src/config/ff.ts";
import {
  COMPETITION_DETAILS_QUERY,
  findTeamIds,
  mergeWithPrevious,
  normalize,
  type FfCompetitionDetails,
} from "../src/lib/ff.ts";
import type { Match } from "../src/lib/types.ts";
import { ffRequest, pause } from "./ff-api.ts";

const OUT_DIR = new URL("../src/data/ff/", import.meta.url);
const MATCHES_FILE = new URL("matches.json", OUT_DIR);
const META_FILE = new URL("meta.json", OUT_DIR);
const TEAMS_DIR = new URL("../src/content/selekcije/", import.meta.url);

// A typo in a config key would silently hide a team's matches, so stop early.
const teamSlugs = readdirSync(TEAMS_DIR)
  .filter((name) => name.endsWith(".yaml"))
  .map((name) => name.replace(/\.yaml$/, ""));
const unknownKeys = Object.keys(FF_CONFIG).filter((key) => !teamSlugs.includes(key));
if (unknownKeys.length) {
  console.error(`src/config/ff.ts: unknown team slug(s): ${unknownKeys.join(", ")}. Known: ${teamSlugs.join(", ")}.`);
  process.exit(1);
}

const cache = new Map<number, FfCompetitionDetails>(); // U17 A and B share one competition
const fresh: Match[] = [];
const failed: { selekcija: string; label: string }[] = [];
const report: { selekcija: string; label: string; competitionId: number; name: string; ok: boolean }[] = [];
let attempted = 0;

for (const [selekcija, competitions] of Object.entries(FF_CONFIG)) {
  for (const { competitionId, label, teamNames } of competitions) {
    if (competitionId === null) continue;
    attempted++;

    try {
      let details = cache.get(competitionId);
      if (!details) {
        if (cache.size > 0 || attempted > 1) await pause();
        const data = await ffRequest<{ competitionDetails: FfCompetitionDetails | null }>(
          "competitionDetailsTree",
          COMPETITION_DETAILS_QUERY,
          { competitionId },
        );
        if (!data.competitionDetails) throw new Error("competition not found");
        details = data.competitionDetails;
        cache.set(competitionId, details);
      }

      if (findTeamIds(details, teamNames).size === 0) {
        throw new Error(`team ${teamNames.join(" / ")} not found in "${details.name}"`);
      }

      const matches = normalize(details, { selekcija, label, teamNames });
      fresh.push(...matches);
      report.push({ selekcija, label, competitionId, name: details.name, ok: true });
      console.log(`OK    ${selekcija} ${label} (${competitionId}): ${matches.length} matches`);
    } catch (error) {
      failed.push({ selekcija, label });
      report.push({ selekcija, label, competitionId, name: "", ok: false });
      console.warn(`FAIL  ${selekcija} ${label} (${competitionId}): ${(error as Error).message}. Keeping old data.`);
    }
  }
}

if (attempted > 0 && failed.length === attempted) {
  console.error("Every FloorballFlash call failed. Nothing written.");
  process.exit(1);
}

const previousText = existsSync(MATCHES_FILE) ? readFileSync(MATCHES_FILE, "utf8") : "";
const previous: Match[] = previousText ? JSON.parse(previousText) : [];
const merged = mergeWithPrevious(fresh, previous, failed);
const nextText = JSON.stringify(merged, null, 2) + "\n";

if (nextText === previousText) {
  console.log("No change in matches. Files not written.");
} else {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(MATCHES_FILE, nextText);
  // meta.json is written only together with matches.json, otherwise fetchedAt alone would
  // cause a commit and a Netlify build on every run.
  writeFileSync(META_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), competitions: report }, null, 2) + "\n");
  console.log(`Wrote ${merged.length} matches.`);
}
