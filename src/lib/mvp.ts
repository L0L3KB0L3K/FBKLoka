// MVP vikenda (SPEC.md §20.3). Pure functions, no network: tested in tests/mvp.test.ts.
// Skaters score goals and assists, goalies score goals prevented against the competition's average save rate; both are
// in "goals", weighted by how close the match was and its result, and summed over the weekend (Saturday and Sunday,
// Ljubljana time). Weights and version: src/config/mvp.ts.
import { BASELINE_MIN_SHOTS, BASELINE_SAVE_PCT, GOALIE, MVP_VERSION, SKATER, TIE_MARGIN } from "../config/mvp.ts";
import { formatDate, partsInLjubljana, plural } from "./format.ts";

/** One of our players in one of our senior matches (FloorballFlash playerStats and goalieStats of that game). */
export type GameLine = {
  gameId: number;
  personId: number;
  ime: string;
  goals: number;
  assists: number;
  pim: number;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
};

/** One of our finished senior matches, from our side. */
export type MvpMatch = {
  id: number;
  competitionId: number;
  zacetek: string;
  nasprotnik: string;
  goalsFor: number;
  goalsAgainst: number;
};

export type MvpStats = { goli: number; podaje: number; obrambe: number; streli: number };

/** src/data/ff/mvp.json (null when there is no MVP). */
export type Mvp = {
  razlicica: string;
  vikend: { od: string; do: string };
  ffId: number;
  ime: string;
  vratar: boolean;
  slika: string | null; // file name in src/data/ff/mvp/, null without a photo
  tekme: ({ nasprotnik: string; zacetek: string } & MvpStats)[];
  sezona: MvpStats | null; // only the season competition (SEASON_LABEL); null when the player has no match in it
  sezonaTekmovanje: string; // its label, e.g. "IFL"
};

/** A goalie line faced at least one shot; every other line is scored as a skater. */
export const isGoalie = (line: GameLine) => line.shotsAgainst > 0;

/** Close matches and wins count a little more: 1.15 / 1.05 / 1.00 by the margin, times 1.05 / 1.00 / 0.95 by the result. */
export function matchWeight(goalsFor: number, goalsAgainst: number): number {
  const margin = Math.abs(goalsFor - goalsAgainst);
  const closeness = margin <= 1 ? 1.15 : margin === 2 ? 1.05 : 1;
  const result = goalsFor > goalsAgainst ? 1.05 : goalsFor === goalsAgainst ? 1 : 0.95;
  return closeness * result;
}

/** Score of one line before the match weight. baseline = average save rate of the competition. */
export function lineScore(line: GameLine, baseline: number): number {
  if (!isGoalie(line)) return SKATER.goal * line.goals + SKATER.assist * line.assists + SKATER.penaltyMinute * line.pim;
  const shutout = line.goalsAgainst === 0 && line.shotsAgainst >= GOALIE.shutoutMinShots ? GOALIE.shutout : 0;
  return (1 - baseline) * line.shotsAgainst - line.goalsAgainst + shutout;
}

/** Average save rate of a competition from all its goalies, or the default until it has enough shots. */
export function baselineSavePct(saves: number, shots: number): number {
  return shots >= BASELINE_MIN_SHOTS ? saves / shots : BASELINE_SAVE_PCT;
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Saturday and Sunday (YYYY-MM-DD) of the weekend a match is played on, in Ljubljana; null for a weekday match. */
export function weekendOf(iso: string): { od: string; do: string } | null {
  const p = partsInLjubljana(iso);
  if (p.weekday !== 6 && p.weekday !== 0) return null;
  const saturday = new Date(Date.UTC(p.year, p.month - 1, p.day - (p.weekday === 0 ? 1 : 0)));
  return { od: isoDay(saturday), do: isoDay(new Date(saturday.getTime() + 86_400_000)) };
}

const totals = (lines: GameLine[]): MvpStats => ({
  goli: lines.reduce((n, line) => n + line.goals, 0),
  podaje: lines.reduce((n, line) => n + line.assists, 0),
  obrambe: lines.reduce((n, line) => n + line.saves, 0),
  streli: lines.reduce((n, line) => n + line.shotsAgainst, 0),
});

/**
 * MVP of the latest weekend with finished senior matches, or null when nobody has a positive score.
 * lines: our players in all senior matches of the season so far; baselines: average save rate per competition id;
 * excluded: FloorballFlash person ids never shown; season: the one competition the season totals count (IFL).
 */
export function pickMvp(
  lines: GameLine[],
  matches: MvpMatch[],
  baselines: ReadonlyMap<number, number>,
  excluded: ReadonlySet<number>,
  season: { competitionId: number; label: string } | null,
): Omit<Mvp, "slika"> | null {
  const saturdays = matches.flatMap((match) => weekendOf(match.zacetek)?.od ?? []);
  const latest = saturdays.sort().at(-1);
  if (!latest) return null;
  const weekend = matches
    .filter((match) => weekendOf(match.zacetek)?.od === latest)
    .sort((a, b) => Date.parse(a.zacetek) - Date.parse(b.zacetek));
  const byId = new Map(weekend.map((match) => [match.id, match]));

  type Candidate = { personId: number; ime: string; score: number; goals: number; pim: number; positive: number; lines: GameLine[] };
  const candidates = new Map<number, Candidate>();
  for (const line of lines) {
    const match = byId.get(line.gameId);
    if (!match || excluded.has(line.personId)) continue;
    const baseline = baselines.get(match.competitionId) ?? BASELINE_SAVE_PCT;
    const score = matchWeight(match.goalsFor, match.goalsAgainst) * lineScore(line, baseline);
    const candidate = candidates.get(line.personId) ?? { personId: line.personId, ime: line.ime, score: 0, goals: 0, pim: 0, positive: 0, lines: [] };
    candidate.score += score;
    candidate.goals += line.goals;
    candidate.pim += line.pim;
    candidate.positive += score > 0 ? 1 : 0;
    candidate.lines.push(line);
    candidates.set(line.personId, candidate);
  }

  const ranked = [...candidates.values()].filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top) return null;
  // A tie within TIE_MARGIN of the top: more goals, fewer penalty minutes, more matches with a positive score, then the
  // person id, so the same data always gives the same MVP.
  const winner = ranked
    .filter((c) => top.score - c.score <= TIE_MARGIN)
    .sort((a, b) => b.goals - a.goals || a.pim - b.pim || b.positive - a.positive || a.personId - b.personId)[0]!;

  return {
    razlicica: MVP_VERSION,
    vikend: { od: latest, do: isoDay(new Date(Date.parse(latest) + 86_400_000)) },
    ffId: winner.personId,
    ime: winner.ime,
    vratar: winner.lines.some(isGoalie),
    tekme: weekend.flatMap((match) => {
      const line = winner.lines.find((l) => l.gameId === match.id);
      return line ? [{ nasprotnik: match.nasprotnik, zacetek: match.zacetek, ...totals([line]) }] : [];
    }),
    sezona: seasonTotals(lines, matches, winner.personId, season),
    sezonaTekmovanje: season?.label ?? "",
  };
}

/** The player's totals in the season competition only, or null when they have not played in it. */
function seasonTotals(
  lines: GameLine[],
  matches: MvpMatch[],
  personId: number,
  season: { competitionId: number } | null,
): MvpStats | null {
  if (!season) return null;
  const games = new Set(matches.filter((match) => match.competitionId === season.competitionId).map((match) => match.id));
  const own = lines.filter((line) => line.personId === personId && games.has(line.gameId));
  return own.length > 0 ? totals(own) : null;
}

const GOL = ["gol", "gola", "goli", "golov"] as const;
const PODAJA = ["podaja", "podaji", "podaje", "podaj"] as const;
const OBRAMBA = ["obramba", "obrambi", "obrambe", "obramb"] as const;

/** "2 gola, 4 podaje" for a skater; "25 obramb od 31 strelov (81 %)" for a goalie. */
export function statsText(stats: MvpStats, vratar: boolean): string {
  if (!vratar) return `${plural(stats.goli, GOL)}, ${plural(stats.podaje, PODAJA)}`;
  const shots = `${stats.streli} ${stats.streli % 100 === 1 ? "strela" : "strelov"}`;
  const pct = stats.streli > 0 ? ` (${Math.round((stats.obrambe / stats.streli) * 100)} %)` : "";
  return `${plural(stats.obrambe, OBRAMBA)} od ${shots}${pct}`;
}

/** "26. in 27. september 2026", or "31. oktober in 1. november 2026" across a month. */
export function weekendText(vikend: { od: string; do: string }): string {
  const saturday = partsInLjubljana(`${vikend.od}T12:00:00Z`);
  const sunday = partsInLjubljana(`${vikend.do}T12:00:00Z`);
  const last = formatDate(`${vikend.do}T12:00:00Z`);
  if (saturday.month === sunday.month) return `${saturday.day}. in ${last}`;
  return `${formatDate(`${vikend.od}T12:00:00Z`).replace(/ \d{4}$/, "")} in ${last}`;
}
