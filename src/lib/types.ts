// Shared data types (SPEC.md §5.4).

/** One match of an FBK Loka team, normalised from FloorballFlash by scripts/fetch-ff.ts. */
export type Match = {
  id: number; // FF game id
  selekcija: string; // team slug, e.g. "clani"
  tekmovanje: string; // label from src/config/ff.ts, e.g. "IFL"
  zacetek: string; // ISO 8601 with offset, e.g. "2026-10-10T17:00:00+02:00"
  doma: boolean; // true when FBK Loka is the home team
  ekipaLoka: string; // our team name in FF, e.g. "FBK Loka A"
  // logo: file name in src/data/ff/logos/ after fetch-ff.ts downloads it, null if there is none.
  // normalize() returns the FloorballFlash URL; the fetch script swaps it for the local file.
  nasprotnik: { ime: string; logo: string | null };
  prizorisce: { ime: string; kraj: string; naslov: string } | null;
  stanje: "prihodnja" | "koncana";
  rezultat: { loka: number; nasprotnik: number } | null; // only when "koncana"
  faza: string; // phase name, e.g. "Qualification Round"
  ffUrl: string;
};

/** One row of a league table, normalised from FloorballFlash competitionStandings. */
export type StandingsRow = {
  mesto: number;
  ekipa: string;
  // Same as Match.nasprotnik.logo: FF URL from normalizeStandings(), local file name after fetch-ff.ts.
  logo: string | null;
  loka: boolean; // one of our teams
  tekme: number;
  zmage: number; // in regular time
  zmagePodaljsek: number; // after overtime or penalty shots
  poraziPodaljsek: number;
  porazi: number; // in regular time
  remi: number;
  goliDani: number;
  goliPrejeti: number;
  tocke: number;
};

/** The league tables of one configured competition that include one of our teams. */
export type Standings = {
  selekcija: string; // team slug
  tekmovanje: string; // label from src/config/ff.ts, e.g. "IFL"
  competitionId: number;
  tabele: { ime: string; vrstice: StandingsRow[] }[];
};

/** Written to src/data/ff/standings.json. `posodobljeno` changes only when a table changes. */
export type StandingsFile = { posodobljeno: string; tekmovanja: Standings[] };

export type Position = "vratar" | "branilec" | "napadalec";

/**
 * One player of the FloorballFlash competition roster (src/data/ff/roster.json).
 * Only name, number and position: the birth date is never fetched, so it can never leak (SPEC.md §4.5).
 */
export type RosterPlayer = {
  selekcija: string;
  ffId: number;
  ime: string;
  stevilka: number | null;
  pozicija: Position | null;
};
