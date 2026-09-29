// MVP vikenda (SPEC.md §20.3). Runs after fetch-ff.ts in `npm run fetch:ff`: reads our finished senior matches
// (src/data/ff/matches.json) and the senior roster (roster.json), fetches the statistics of each of those matches from
// FloorballFlash, picks the MVP of the latest weekend (src/lib/mvp.ts) and writes src/data/ff/mvp.json and the player's
// photo in src/data/ff/mvp/. Files are written only on a change (every change is a commit and a deploy); on any error
// the old files stay and the step does not fail the workflow.
//
// FloorballFlash (checked 29. 9. 2026): the stats filter by gameId works, the filter by teamId does not, so our players
// are picked by the roster. Players marked incognito are never in the roster. Photos: images/crop/ratio3x4/<width>/.
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { FF_CONFIG } from "../src/config/ff.ts";
import { MVP_EXCLUDED, SEASON_LABEL } from "../src/config/mvp.ts";
import { baselineSavePct, pickMvp, type GameLine, type Mvp, type MvpMatch } from "../src/lib/mvp.ts";
import type { Match, RosterPlayer } from "../src/lib/types.ts";
import { ffRequest, pause } from "./ff-api.ts";

const OUT_DIR = new URL("../src/data/ff/", import.meta.url);
const MVP_FILE = new URL("mvp.json", OUT_DIR);
const PHOTO_DIR = new URL("mvp/", OUT_DIR);
// 3:4 crop, 960 px wide (FloorballFlash also has 240 and 480); Astro makes the smaller sizes.
const PHOTO_URL = "https://storage.googleapis.com/floorballflash.appspot.com/images/crop/ratio3x4/960/";
const MAX_PHOTO_BYTES = 2_000_000;

type Value = { value: number | null } | null;
type Person = { id: number; imageId: string | null };
const PLAYERS_QUERY = `query mvpPlayers($q: PlayerStatsFilter!) {
  playerStats(query: $q) { player { id imageId } stats { goals { value } assists { value } pim { value } } }
}`;
const GOALIES_QUERY = `query mvpGoalies($q: GoalieStatsFilter!) {
  goalieStats(query: $q) { player { id imageId } stats { saves { value } shotsAgainst { value } goalsAgainst { value } } }
}`;
type PlayerRow = { player: Person; stats: { goals: Value; assists: Value; pim: Value } };
type GoalieRow = { player: Person; stats: { saves: Value; shotsAgainst: Value; goalsAgainst: Value } };

const n = (value: Value | undefined) => value?.value ?? 0;
const readJson = <T,>(file: URL, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);
const filter = (baseFilter: object, orderBy: string) => ({
  baseFilter,
  orderBy,
  sortOrder: "DESC",
  orderByPos: false,
  pagination: { start: 0, limit: 200 },
});

// Senior competitions from the config; our finished matches in them, from our side.
const competitionByLabel = new Map(
  (FF_CONFIG.clani ?? []).flatMap((c) => (c.competitionId === null ? [] : [[c.label, c.competitionId] as const])),
);
const senior: MvpMatch[] = readJson<Match[]>(new URL("matches.json", OUT_DIR), [])
  .filter((m) => m.selekcija === "clani" && m.stanje === "koncana" && m.rezultat && competitionByLabel.has(m.tekmovanje))
  .map((m) => ({
    id: m.id,
    competitionId: competitionByLabel.get(m.tekmovanje)!,
    zacetek: m.zacetek,
    nasprotnik: m.nasprotnik.ime,
    goalsFor: m.rezultat!.loka,
    goalsAgainst: m.rezultat!.nasprotnik,
  }));
const names = new Map(
  readJson<RosterPlayer[]>(new URL("roster.json", OUT_DIR), [])
    .filter((p) => p.selekcija === "clani")
    .map((p) => [p.ffId, p.ime]),
);

async function run(): Promise<Mvp | null> {
  const lines: GameLine[] = [];
  const images = new Map<number, string | null>();
  for (const match of senior) {
    await pause();
    const { playerStats } = await ffRequest<{ playerStats: PlayerRow[] }>("mvpPlayers", PLAYERS_QUERY, {
      q: filter({ gameId: match.id, for: "Game" }, "points"),
    });
    await pause();
    const { goalieStats } = await ffRequest<{ goalieStats: GoalieRow[] }>("mvpGoalies", GOALIES_QUERY, {
      q: filter({ gameId: match.id, for: "Game" }, "gamesPlayed"),
    });
    const people = new Map<number, GameLine>();
    const line = (person: Person) => {
      images.set(person.id, person.imageId);
      const found = people.get(person.id);
      if (found) return found;
      const fresh: GameLine = { gameId: match.id, personId: person.id, ime: names.get(person.id)!, goals: 0, assists: 0, pim: 0, saves: 0, shotsAgainst: 0, goalsAgainst: 0 };
      people.set(person.id, fresh);
      return fresh;
    };
    for (const row of playerStats) {
      if (!names.has(row.player.id)) continue;
      Object.assign(line(row.player), { goals: n(row.stats.goals), assists: n(row.stats.assists), pim: n(row.stats.pim) });
    }
    for (const row of goalieStats) {
      if (!names.has(row.player.id)) continue;
      Object.assign(line(row.player), { saves: n(row.stats.saves), shotsAgainst: n(row.stats.shotsAgainst), goalsAgainst: n(row.stats.goalsAgainst) });
    }
    lines.push(...people.values());
  }

  // Average save rate per competition, from all its goalies this season.
  const baselines = new Map<number, number>();
  for (const competitionId of new Set(senior.map((m) => m.competitionId))) {
    await pause();
    const { goalieStats } = await ffRequest<{ goalieStats: GoalieRow[] }>("mvpGoalies", GOALIES_QUERY, {
      q: filter({ competitionId, for: "Competition" }, "gamesPlayed"),
    });
    const saves = goalieStats.reduce((sum, row) => sum + n(row.stats.saves), 0);
    const shots = goalieStats.reduce((sum, row) => sum + n(row.stats.shotsAgainst), 0);
    baselines.set(competitionId, baselineSavePct(saves, shots));
    console.log(`OK    MVP baseline ${competitionId}: ${saves}/${shots} -> ${baselines.get(competitionId)!.toFixed(3)}`);
  }

  const seasonId = competitionByLabel.get(SEASON_LABEL);
  const season = seasonId === undefined ? null : { competitionId: seasonId, label: SEASON_LABEL };
  const picked = pickMvp(lines, senior, baselines, new Set(MVP_EXCLUDED), season);
  if (!picked) {
    await photo(0, null); // no MVP: no photo stays behind
    return null;
  }
  return { ...picked, slika: await photo(picked.ffId, images.get(picked.ffId) ?? null) };
}

/** Keeps only the current MVP's photo in src/data/ff/mvp/; downloads it when it is not there yet. */
async function photo(personId: number, imageId: string | null): Promise<string | null> {
  mkdirSync(PHOTO_DIR, { recursive: true });
  const name = imageId ? `${personId}.jpeg` : null;
  for (const file of readdirSync(PHOTO_DIR)) if (file !== name) unlinkSync(new URL(file, PHOTO_DIR));
  if (!name || existsSync(new URL(name, PHOTO_DIR))) return name;
  try {
    const response = await fetch(PHOTO_URL + imageId + ".jpeg", { signal: AbortSignal.timeout(20_000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) throw new Error(`HTTP ${response.status} ${type}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_PHOTO_BYTES) throw new Error(`${bytes.length} bytes`);
    writeFileSync(new URL(name, PHOTO_DIR), bytes);
    return name;
  } catch (error) {
    console.warn(`WARN  MVP photo ${personId}: ${(error as Error).message}. The card is shown without a photo.`);
    return null;
  }
}

try {
  const mvp = await run();
  const text = JSON.stringify(mvp, null, 2) + "\n";
  if (existsSync(MVP_FILE) && readFileSync(MVP_FILE, "utf8") === text) console.log("MVP unchanged.");
  else {
    writeFileSync(MVP_FILE, text);
    console.log(mvp ? `OK    MVP ${mvp.vikend.od}: ${mvp.ime}` : "OK    no MVP (no finished senior weekend)");
  }
} catch (error) {
  console.warn(`FAIL  MVP: ${(error as Error).message}. Keeping old data.`);
}
