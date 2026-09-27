// All matches from src/data/ff/matches.json (written by scripts/fetch-ff.ts, never edited by hand).
import data from "../data/ff/matches.json";
import type { Match } from "./types.ts";

export const allMatches = data as Match[];
