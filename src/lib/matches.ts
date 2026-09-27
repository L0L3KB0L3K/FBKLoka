// Helpers for match lists (SPEC.md §7.2, §7.3). Pure functions, tested in tests/matches.test.ts.
import { weekStart } from "./format.ts";
import type { Match } from "./types.ts";

/**
 * One entry per game. A game between two of our teams (U17 A vs U17 B) is in the data once
 * per team; the home team's entry is kept, so "home – away" reads correctly.
 */
export function uniqueGames(matches: Match[]): Match[] {
  const byId = new Map<number, Match>();
  for (const match of matches) {
    const seen = byId.get(match.id);
    if (!seen || (match.doma && !seen.doma)) byId.set(match.id, match);
  }
  return matches.filter((match) => byId.get(match.id) === match);
}

/** Upcoming soonest first, finished newest first. Input must be in chronological order. */
export function splitByState(matches: Match[]) {
  return {
    prihodnje: matches.filter((m) => m.stanje === "prihodnja"),
    odigrane: matches.filter((m) => m.stanje === "koncana").reverse(),
  };
}

/** Consecutive groups by Ljubljana week (Monday), in the order of the input. */
export function groupByWeek(matches: Match[]): { monday: string; matches: Match[] }[] {
  const groups: { monday: string; matches: Match[] }[] = [];
  for (const match of matches) {
    const monday = weekStart(match.zacetek);
    const last = groups.at(-1);
    if (last?.monday === monday) last.matches.push(match);
    else groups.push({ monday, matches: [match] });
  }
  return groups;
}

/** Result in home:away order for the general list, e.g. "13:6". */
export function scoreHomeAway(match: Match): string {
  if (!match.rezultat) return "";
  const { loka, nasprotnik } = match.rezultat;
  return match.doma ? `${loka}:${nasprotnik}` : `${nasprotnik}:${loka}`;
}

/** Result from FBK Loka's side for team pages, e.g. "Zmaga 13:6" (SPEC.md §10). */
export function scoreForLoka(match: Match): string {
  if (!match.rezultat) return "";
  const { loka, nasprotnik } = match.rezultat;
  const word = loka > nasprotnik ? "Zmaga" : loka < nasprotnik ? "Poraz" : "Neodločeno";
  return `${word} ${loka}:${nasprotnik}`;
}
