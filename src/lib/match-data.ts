// FloorballFlash data from src/data/ff/ (written by scripts/fetch-ff.ts, never edited by hand):
// matches, league tables and competition rosters.
import data from "../data/ff/matches.json";
import rosterData from "../data/ff/roster.json";
import standingsData from "../data/ff/standings.json";
import type { Match, RosterPlayer, StandingsFile } from "./types.ts";

export const allMatches = data as Match[];
export const standingsFile = standingsData as StandingsFile;
export const ffRoster = rosterData as RosterPlayer[];
