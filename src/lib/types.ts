// Shared data types (SPEC.md §5.4).

/** One match of an FBK Loka team, normalised from FloorballFlash by scripts/fetch-ff.ts. */
export type Match = {
  id: number; // FF game id
  selekcija: string; // team slug, e.g. "clani"
  tekmovanje: string; // label from src/config/ff.ts, e.g. "IFL"
  zacetek: string; // ISO 8601 with offset, e.g. "2026-10-10T17:00:00+02:00"
  doma: boolean; // true when FBK Loka is the home team
  ekipaLoka: string; // our team name in FF, e.g. "FBK Loka A"
  nasprotnik: { ime: string; logo: string | null };
  prizorisce: { ime: string; kraj: string; naslov: string } | null;
  stanje: "prihodnja" | "koncana";
  rezultat: { loka: number; nasprotnik: number } | null; // only when "koncana"
  faza: string; // phase name, e.g. "Qualification Round"
  ffUrl: string;
};
