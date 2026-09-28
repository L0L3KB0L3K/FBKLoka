// FloorballFlash normalisation (SPEC.md §5.3–5.5, standings and rosters §5.8).
// Pure functions without network access, so they can be tested (tests/normalize.test.ts).
import type { Match, Position, RosterPlayer, Standings } from "./types.ts";

export const FF_LOGO_BASE = "https://storage.googleapis.com/floorballflash.appspot.com/";
export const FF_GAME_URL = "https://www.floorballflash.at/game/";

/** GraphQL query for fixtures and results of one competition (SPEC.md §5.3). */
export const COMPETITION_DETAILS_QUERY = `query competitionDetailsTree($competitionId: Int!) {
  competitionDetails(competitionId: $competitionId) {
    id
    name
    teams { id name shortName logo }
    phases {
      id name mode order
      groups {
        id name order
        rounds {
          id name order
          games {
            id
            state
            home { id score comment }
            away { id score comment }
            venue { id name address { street number postCode city country } }
            schedule {
              date { year month day }
              time { hour min sec }
              timezone
            }
          }
        }
      }
    }
  }
}`;

// Raw API shapes: only the fields we query.
// FloorballFlash renamed the score field from "goals" to "score" (found 29. 9. 2026: the old name returned HTTP 422).
type FfSide = { id: number | null; score: number | null; comment: string | null };
type FfAddress = { street: string | null; number: string | null; postCode: string | null; city: string | null };
type FfGame = {
  id: number;
  state: string;
  home: FfSide;
  away: FfSide;
  venue: { name: string; address: FfAddress | null } | null;
  schedule: {
    date: { year: number; month: number; day: number } | null;
    time: { hour: number; min: number } | null;
    timezone: string | null;
  } | null;
};
type FfTeam = { id: number; name: string; shortName: string | null; logo: string | null };
export type FfCompetitionDetails = {
  id: number;
  name: string;
  teams: FfTeam[];
  phases: { name: string; groups: { rounds: { games: FfGame[] }[] }[] }[];
};

/** What normalize() needs to know about one configured competition. */
export type NormalizeConfig = { selekcija: string; label: string; teamNames: string[] };

const pad = (n: number) => String(n).padStart(2, "0");

/** Offset of `timeZone` from UTC at the instant `utcMs`, in minutes (e.g. 120 for CEST). */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((wallAsUtc - utcMs) / 60_000);
}

/**
 * Wall-clock time in an IANA time zone -> ISO 8601 with the offset valid on that day,
 * e.g. 25. 10. 2026 13:00 Europe/Vienna -> "2026-10-25T13:00:00+01:00".
 * The zone rules come from Intl, so summer time is handled without a date library.
 */
export function zonedIso(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): string {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  // First guess, then one correction: the offset must be read at the real instant (matters on DST days).
  const guess = offsetMinutes(wallAsUtc, timeZone);
  const offset = offsetMinutes(wallAsUtc - guess * 60_000, timeZone);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** IDs of our teams in this competition, matched by exact name. Empty if none is found. */
export function findTeamIds(details: FfCompetitionDetails, teamNames: string[]): Set<number> {
  return new Set(details.teams.filter((team) => teamNames.includes(team.name)).map((team) => team.id));
}

function formatAddress(address: FfAddress | null): string {
  if (!address) return "";
  const street = [address.street, address.number].filter(Boolean).join(" ");
  const city = [address.postCode, address.city].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ");
}

/**
 * Turns one competition response into our Match list (SPEC.md §5.5 rule 3):
 * flattens phases -> groups -> rounds -> games, drops playoff placeholders and games
 * without a date or time, keeps only games with one of our teams.
 */
export function normalize(details: FfCompetitionDetails, config: NormalizeConfig): Match[] {
  const ourIds = findTeamIds(details, config.teamNames);
  const teams = new Map(details.teams.map((team) => [team.id, team]));
  const matches: Match[] = [];

  for (const phase of details.phases) {
    for (const group of phase.groups) {
      for (const round of group.rounds) {
        for (const game of round.games) {
          const { home, away, schedule } = game;
          // Playoff placeholders ("Winner Semi 1") have no team id and no time.
          if (home.id === null || away.id === null) continue;
          if (!schedule?.date || !schedule.time) continue;

          const homeIsOurs = ourIds.has(home.id);
          if (!homeIsOurs && !ourIds.has(away.id)) continue;

          const [ours, theirs] = homeIsOurs ? [home, away] : [away, home];
          const opponent = teams.get(theirs.id as number);
          const finished = game.state === "Finished"; // unknown states count as upcoming

          matches.push({
            id: game.id,
            selekcija: config.selekcija,
            tekmovanje: config.label,
            zacetek: zonedIso(
              schedule.date.year,
              schedule.date.month,
              schedule.date.day,
              schedule.time.hour,
              schedule.time.min,
              schedule.timezone ?? "Europe/Vienna",
            ),
            doma: homeIsOurs,
            ekipaLoka: teams.get(ours.id as number)?.name ?? ours.comment ?? "FBK Loka",
            nasprotnik: {
              ime: opponent?.name ?? theirs.comment ?? "",
              logo: opponent?.logo ? FF_LOGO_BASE + opponent.logo : null,
            },
            prizorisce: game.venue
              ? {
                  ime: game.venue.name,
                  kraj: game.venue.address?.city ?? "",
                  naslov: formatAddress(game.venue.address),
                }
              : null,
            stanje: finished ? "koncana" : "prihodnja",
            rezultat: finished ? { loka: ours.score ?? 0, nasprotnik: theirs.score ?? 0 } : null,
            faza: phase.name,
            ffUrl: FF_GAME_URL + game.id,
          });
        }
      }
    }
  }

  return sortMatches(matches);
}

/**
 * Local file name for a FloorballFlash logo URL, e.g. ".../uploads/public/abc-123.png" -> "abc-123.png".
 * Returns null for anything that is not a plain image file name, so a strange URL can never
 * write outside the logo folder.
 */
export function logoFileName(url: string): string | null {
  const name = url.split("/").pop() ?? "";
  return /^[a-z0-9-]+\.(svg|png|jpe?g|webp|gif)$/i.test(name) ? name.toLowerCase() : null;
}

/** Chronological order. Compares instants, not strings: offsets differ across the DST change. */
export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) =>
      Date.parse(a.zacetek) - Date.parse(b.zacetek) || a.id - b.id || a.tekmovanje.localeCompare(b.tekmovanje),
  );
}

/**
 * Adds the previous matches of every competition whose fetch failed, so a failed call
 * never wipes good data (SPEC.md §5.5 rule 4). A competition is identified by team + label.
 */
export function mergeWithPrevious(
  fresh: Match[],
  previous: Match[],
  failed: { selekcija: string; label: string }[],
): Match[] {
  const kept = previous.filter((match) =>
    failed.some((f) => f.selekcija === match.selekcija && f.label === match.tekmovanje),
  );
  return sortMatches([...fresh, ...kept]);
}

// --- Standings and rosters (SPEC.md §5.8). Queries found on 28. 9. 2026 in the FloorballFlash schema. ---

export const STANDINGS_QUERY = `query competitionStandings($competitionId: Int!) {
  competitionStandings(competitionId: $competitionId) {
    name
    teams {
      id
      rank
      name
      logo
      gamesPlayed
      winsRegular
      winsOvertime
      lossesRegular
      lossesOvertime
      ties
      goalsFor
      goalsAgainst
      points
    }
  }
}`;

// The person's birth date is deliberately not in the query: we never need it and never store it.
export const PLAYERS_QUERY = `query competitionPlayers($filter: CompetitionPlayerFilter, $pagination: Pagination) {
  competitionPlayers(filter: $filter, pagination: $pagination) {
    number
    position
    person {
      id
      firstname
      lastname
      incognito
    }
  }
}`;

type FfInt = number | null;

export type FfStandingsTable = {
  name: string;
  teams: {
    id: number;
    rank: FfInt;
    name: string;
    logo: string | null;
    gamesPlayed: FfInt;
    winsRegular: FfInt;
    winsOvertime: FfInt;
    lossesRegular: FfInt;
    lossesOvertime: FfInt;
    ties: FfInt;
    goalsFor: FfInt;
    goalsAgainst: FfInt;
    points: FfInt;
  }[];
};

export type FfCompetitionPlayer = {
  number: FfInt;
  position: string | null;
  person: { id: number; firstname: string | null; lastname: string | null; incognito: boolean | null };
};

/**
 * Keeps only the tables with one of our teams (IFL also has an Austria-only table) and maps the rows.
 * Missing numbers count as 0. The table order and FloorballFlash's ranks are kept as they are.
 */
export function normalizeStandings(
  tables: FfStandingsTable[],
  ourIds: Set<number>,
  config: { selekcija: string; label: string; competitionId: number },
): Standings {
  return {
    selekcija: config.selekcija,
    tekmovanje: config.label,
    competitionId: config.competitionId,
    tabele: tables
      .filter((table) => table.teams.some((row) => ourIds.has(row.id)))
      .map((table) => ({
        ime: table.name,
        vrstice: table.teams.map((row) => ({
          mesto: row.rank ?? 0,
          ekipa: row.name,
          logo: row.logo ? FF_LOGO_BASE + row.logo : null,
          loka: ourIds.has(row.id),
          tekme: row.gamesPlayed ?? 0,
          zmage: row.winsRegular ?? 0,
          zmagePodaljsek: row.winsOvertime ?? 0,
          poraziPodaljsek: row.lossesOvertime ?? 0,
          porazi: row.lossesRegular ?? 0,
          remi: row.ties ?? 0,
          goliDani: row.goalsFor ?? 0,
          goliPrejeti: row.goalsAgainst ?? 0,
          tocke: row.points ?? 0,
        })),
      })),
  };
}

const POSITIONS: Record<string, Position> = { G: "vratar", D: "branilec", F: "napadalec" };

/** "Miha " + "Triler" -> "Miha Triler": FloorballFlash names sometimes carry extra spaces. */
function fullName(first: string | null, last: string | null): string {
  return [first, last].join(" ").split(" ").filter(Boolean).join(" ");
}

/**
 * Roster of one team from one or more competitions. Players marked incognito in FloorballFlash are left out,
 * so are entries without a name. A player in two competitions (IFL and 1. SFL) is listed once:
 * the first competition in src/config/ff.ts wins, so the number from IFL is kept.
 */
export function normalizeRoster(lists: FfCompetitionPlayer[][], selekcija: string): RosterPlayer[] {
  const players = new Map<number, RosterPlayer>();
  for (const list of lists) {
    for (const entry of list) {
      const ime = fullName(entry.person.firstname, entry.person.lastname);
      if (entry.person.incognito || !ime || players.has(entry.person.id)) continue;
      players.set(entry.person.id, {
        selekcija,
        ffId: entry.person.id,
        ime,
        stevilka: entry.number,
        pozicija: POSITIONS[entry.position ?? ""] ?? null,
      });
    }
  }
  return [...players.values()].sort((a, b) => a.ime.localeCompare(b.ime, "sl") || a.ffId - b.ffId);
}
