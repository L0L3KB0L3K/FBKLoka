// Input of the weekly-summary scripts (SPEC.md §20.5): matches, the MVP and the team names. Offline: it reads
// src/data/ff and src/content/selekcije, so run the scripts after `npm run fetch:ff`.
import { readdirSync, readFileSync } from "node:fs";
import yaml from "js-yaml";
import type { Mvp } from "../src/lib/mvp.ts";
import type { Match } from "../src/lib/types.ts";

const DATA = new URL("../src/data/ff/", import.meta.url);
const TEAMS = new URL("../src/content/selekcije/", import.meta.url);

export function loadWeekData(): { matches: Match[]; mvp: Mvp | null; teamNames: Record<string, string> } {
  return {
    matches: JSON.parse(readFileSync(new URL("matches.json", DATA), "utf8")) as Match[],
    mvp: JSON.parse(readFileSync(new URL("mvp.json", DATA), "utf8")) as Mvp | null,
    teamNames: Object.fromEntries(
      readdirSync(TEAMS)
        .filter((file) => file.endsWith(".yaml"))
        .map((file) => [file.replace(/\.yaml$/, ""), (yaml.load(readFileSync(new URL(file, TEAMS), "utf8")) as { ime: string }).ime]),
    ),
  };
}
