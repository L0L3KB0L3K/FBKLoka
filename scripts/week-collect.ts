// Weekly summary, step 1 (SPEC.md §20.5): the facts of one week into tmp/week.json, and the fixed-template text into
// tmp/povzetek-predloga.md for comparison. Deterministic and offline: it reads src/data/ff/matches.json and mvp.json,
// so run it after `npm run fetch:ff`. WEEK_END=2026-09-27 picks the week that ends on that Sunday; the default is the
// current week (Monday to Sunday, Ljubljana). No finished match in the week: nothing is written and it says so.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import yaml from "js-yaml";
import type { Mvp } from "../src/lib/mvp.ts";
import type { Match } from "../src/lib/types.ts";
import { buildWeek, templateSummary, weekBounds } from "../src/lib/week.ts";

const DATA = new URL("../src/data/ff/", import.meta.url);
const TEAMS = new URL("../src/content/selekcije/", import.meta.url);
const OUT = new URL("../tmp/", import.meta.url);

const matches = JSON.parse(readFileSync(new URL("matches.json", DATA), "utf8")) as Match[];
const mvp = JSON.parse(readFileSync(new URL("mvp.json", DATA), "utf8")) as Mvp | null;
const teamNames = Object.fromEntries(
  readdirSync(TEAMS)
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => [file.replace(/\.yaml$/, ""), (yaml.load(readFileSync(new URL(file, TEAMS), "utf8")) as { ime: string }).ime]),
);

const end = process.env.WEEK_END;
const teden = weekBounds(end ? new Date(`${end}T12:00:00Z`) : new Date());
const week = buildWeek(matches, teamNames, mvp, teden);
if (week.tekme.length === 0) {
  console.log(`No finished match in the week ${teden.od} – ${teden.do}: no summary.`);
} else {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL("week.json", OUT), JSON.stringify(week, null, 2) + "\n");
  writeFileSync(new URL("povzetek-predloga.md", OUT), templateSummary(week) + "\n");
  console.log(`OK    week ${teden.od} – ${teden.do}: ${week.tekme.length} matches${week.mvp ? `, MVP ${week.mvp.ime}` : ""}`);
}
