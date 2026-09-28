// Fetches FBK Loka matches from FloorballFlash and writes src/data/ff/matches.json and meta.json,
// plus league tables (standings.json) and competition rosters (roster.json, SPEC.md §5.8).
// Runs in the GitHub Action (fetch-ff.yml) and by hand: `npm run fetch:ff`. SPEC.md §5.5:
// 1. one call per configured competition, 300 ms apart,
// 2. our team is found by exact name; if missing: warning, keep old data, continue,
// 3. normalisation is the pure function normalize() in src/lib/ff.ts,
// 4. a failed call never overwrites the last good data of that competition,
// 5. if every call fails: exit code 1 (GitHub e-mails the repo owner), nothing is written,
// 6. files are written only when the matches change (no change = no commit = no build).
// Standings and rosters follow rules 1, 4 and 6; they never cause exit code 1 on their own.
// Opponent logos are downloaded into src/data/ff/logos/, so visitors never load images from
// Google's servers (no third-party requests, SPEC.md §12).
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { FF_CONFIG } from "../src/config/ff.ts";
import {
  COMPETITION_DETAILS_QUERY,
  findTeamIds,
  logoFileName,
  mergeWithPrevious,
  normalize,
  normalizeRoster,
  normalizeStandings,
  PLAYERS_QUERY,
  STANDINGS_QUERY,
  type FfCompetitionDetails,
  type FfCompetitionPlayer,
  type FfStandingsTable,
} from "../src/lib/ff.ts";
import type { Match, RosterPlayer, Standings, StandingsFile } from "../src/lib/types.ts";
import { ffRequest, pause } from "./ff-api.ts";

const OUT_DIR = new URL("../src/data/ff/", import.meta.url);
const MATCHES_FILE = new URL("matches.json", OUT_DIR);
const META_FILE = new URL("meta.json", OUT_DIR);
const STANDINGS_FILE = new URL("standings.json", OUT_DIR);
const ROSTER_FILE = new URL("roster.json", OUT_DIR);
const LOGO_DIR = new URL("logos/", OUT_DIR);
const TEAMS_DIR = new URL("../src/content/selekcije/", import.meta.url);
const MAX_LOGO_BYTES = 2_000_000;

// A typo in a config key would silently hide a team's matches, so stop early.
const teamSlugs = readdirSync(TEAMS_DIR)
  .filter((name) => name.endsWith(".yaml"))
  .map((name) => name.replace(/\.yaml$/, ""));
const unknownKeys = Object.keys(FF_CONFIG).filter((key) => !teamSlugs.includes(key));
if (unknownKeys.length) {
  console.error(`src/config/ff.ts: unknown team slug(s): ${unknownKeys.join(", ")}. Known: ${teamSlugs.join(", ")}.`);
  process.exit(1);
}

/** Downloads one logo unless it is already on disk. Returns the local file name, or null. */
async function downloadLogo(url: string): Promise<string | null> {
  const name = logoFileName(url);
  if (!name) return null;
  // FloorballFlash gives a changed logo a new file name, so an existing file is never stale.
  if (existsSync(new URL(name, LOGO_DIR))) return name;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error("not an image");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_LOGO_BYTES) throw new Error(`too large (${bytes.length} B)`);
    writeFileSync(new URL(name, LOGO_DIR), bytes);
    console.log(`Logo  ${name} downloaded`);
    return name;
  } catch (error) {
    console.warn(`Logo  ${url}: ${(error as Error).message}. Shown without a logo, retried next run.`);
    return null;
  }
}

const logoByUrl = new Map<string, string | null>();

/** FloorballFlash logo URL -> local file name (downloaded once). A kept name whose file is gone -> null. */
async function toLocalLogo(logo: string | null): Promise<string | null> {
  mkdirSync(LOGO_DIR, { recursive: true });
  if (logo?.startsWith("http")) {
    if (!logoByUrl.has(logo)) logoByUrl.set(logo, await downloadLogo(logo));
    return logoByUrl.get(logo) ?? null;
  }
  return logo && existsSync(new URL(logo, LOGO_DIR)) ? logo : null;
}

/** Replaces FloorballFlash logo URLs with local file names; drops names whose file is missing. */
async function useLocalLogos(matches: Match[]): Promise<Match[]> {
  const result: Match[] = [];
  for (const match of matches) {
    result.push({ ...match, nasprotnik: { ...match.nasprotnik, logo: await toLocalLogo(match.nasprotnik.logo) } });
  }
  return result;
}

/** The same for every row of every league table. */
async function useLocalStandingsLogos(list: Standings[]): Promise<Standings[]> {
  const result: Standings[] = [];
  for (const standings of list) {
    const tabele: Standings["tabele"] = [];
    for (const table of standings.tabele) {
      const vrstice = [];
      for (const row of table.vrstice) vrstice.push({ ...row, logo: await toLocalLogo(row.logo) });
      tabele.push({ ...table, vrstice });
    }
    result.push({ ...standings, tabele });
  }
  return result;
}

/** Deletes logo files that no match and no table uses any more (old season, changed logo). */
function removeUnusedLogos(used: Set<string | null>) {
  for (const name of readdirSync(LOGO_DIR)) {
    if (!used.has(name)) {
      unlinkSync(new URL(name, LOGO_DIR));
      console.log(`Logo  ${name} removed (unused)`);
    }
  }
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
        if (attempted > 1) await pause();
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

// --- Standings and rosters (SPEC.md §5.8): two more calls per competition. ---
const readJson = <T,>(file: URL, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);
const previousStandings = readJson<StandingsFile>(STANDINGS_FILE, { posodobljeno: "", tekmovanja: [] });
const previousRoster = readJson<RosterPlayer[]>(ROSTER_FILE, []);
const standings: Standings[] = [];
const roster: RosterPlayer[] = [];

for (const [selekcija, competitions] of Object.entries(FF_CONFIG)) {
  const keepStandings = (label: string) =>
    standings.push(...previousStandings.tekmovanja.filter((s) => s.selekcija === selekcija && s.tekmovanje === label));
  const lists: FfCompetitionPlayer[][] = [];
  let rosterComplete = true;

  for (const { competitionId, label, teamNames } of competitions) {
    if (competitionId === null) continue;
    const details = cache.get(competitionId);
    const ourIds = details ? findTeamIds(details, teamNames) : new Set<number>();
    if (ourIds.size === 0) {
      // The matches call failed or our team is missing: keep the old table and roster.
      keepStandings(label);
      rosterComplete = false;
      continue;
    }

    try {
      await pause();
      const data = await ffRequest<{ competitionStandings: FfStandingsTable[] }>("competitionStandings", STANDINGS_QUERY, {
        competitionId,
      });
      const result = normalizeStandings(data.competitionStandings, ourIds, { selekcija, label, competitionId });
      standings.push(result);
      console.log(`OK    ${selekcija} ${label}: ${result.tabele.length} table(s)`);
    } catch (error) {
      keepStandings(label);
      console.warn(`FAIL  ${selekcija} ${label} standings: ${(error as Error).message}. Keeping old data.`);
    }

    for (const teamId of ourIds) {
      try {
        await pause();
        const data = await ffRequest<{ competitionPlayers: FfCompetitionPlayer[] }>("competitionPlayers", PLAYERS_QUERY, {
          filter: { competitionId, teamId },
          pagination: { start: 0, limit: 200 },
        });
        lists.push(data.competitionPlayers);
      } catch (error) {
        rosterComplete = false;
        console.warn(`FAIL  ${selekcija} ${label} roster: ${(error as Error).message}. Keeping old roster.`);
      }
    }
  }

  // A roster from only some of the calls could drop players, so the team keeps its old roster then.
  const players = rosterComplete ? normalizeRoster(lists, selekcija) : previousRoster.filter((p) => p.selekcija === selekcija);
  if (rosterComplete && lists.length) console.log(`OK    ${selekcija} roster: ${players.length} players`);
  roster.push(...players);
}

const localStandings = await useLocalStandingsLogos(standings);
if (JSON.stringify(localStandings) === JSON.stringify(previousStandings.tekmovanja)) {
  console.log("No change in standings. File not written.");
} else {
  // The date changes only with the tables, so an unchanged week makes no commit and no build.
  const file: StandingsFile = { posodobljeno: new Date().toISOString(), tekmovanja: localStandings };
  writeFileSync(STANDINGS_FILE, JSON.stringify(file, null, 2) + "\n");
  console.log("Wrote standings.");
}

const rosterText = JSON.stringify(roster, null, 2) + "\n";
if (existsSync(ROSTER_FILE) && readFileSync(ROSTER_FILE, "utf8") === rosterText) {
  console.log("No change in rosters. File not written.");
} else {
  writeFileSync(ROSTER_FILE, rosterText);
  console.log(`Wrote ${roster.length} players.`);
}

const previousText = existsSync(MATCHES_FILE) ? readFileSync(MATCHES_FILE, "utf8") : "";
const previous: Match[] = previousText ? JSON.parse(previousText) : [];
const merged = await useLocalLogos(mergeWithPrevious(fresh, previous, failed));
removeUnusedLogos(
  new Set([
    ...merged.map((match) => match.nasprotnik.logo),
    ...localStandings.flatMap((s) => s.tabele.flatMap((table) => table.vrstice.map((row) => row.logo))),
  ]),
);
const nextText = JSON.stringify(merged, null, 2) + "\n";

if (nextText === previousText) {
  console.log("No change in matches. Files not written.");
} else {
  writeFileSync(MATCHES_FILE, nextText);
  // meta.json is written only together with matches.json, otherwise fetchedAt alone would
  // cause a commit and a Netlify build on every run.
  writeFileSync(META_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), competitions: report }, null, 2) + "\n");
  console.log(`Wrote ${merged.length} matches.`);
}
