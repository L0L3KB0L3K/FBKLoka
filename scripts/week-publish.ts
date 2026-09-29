// Weekly summary, automatic publishing (SPEC.md §20.5): the fixed-template text of the week as a news post in
// src/content/novice, with the fixed cover. .github/workflows/fetch-ff.yml runs it after the Sunday fetch and commits
// the post together with the data, so it costs no extra deploy. By hand: WEEK_END=2026-09-27 npm run week:publish
// publishes the week that ends on that Sunday; the default is the current week (Monday to Sunday, Ljubljana).
// It writes nothing when the week has no finished match, when a match that has started has no result in FloorballFlash
// yet (better no summary than a wrong one), or when the post exists and was edited by hand (vir is no longer samodejno).
// "::warning::" lines show up in the GitHub Actions run.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { buildWeek, summaryPost, templateSummary, unfinishedMatches, verifySummary, weekBounds } from "../src/lib/week.ts";
import { loadWeekData } from "./week-data.ts";

const NEWS = new URL("../src/content/novice/", import.meta.url);

const { matches, mvp, teamNames } = loadWeekData();
const end = process.env.WEEK_END;
const teden = weekBounds(end ? new Date(`${end}T12:00:00Z`) : new Date());
const label = `${teden.od} – ${teden.do}`;

const pending = unfinishedMatches(matches, teden, new Date());
if (pending.length > 0) {
  const list = pending.map((m) => `${m.nasprotnik.ime} (${m.zacetek})`).join(", ");
  console.log(`::warning::No summary for the week ${label}: no result in FloorballFlash yet for ${list}.`);
  process.exit(0);
}

const week = buildWeek(matches, teamNames, mvp, teden);
if (week.tekme.length === 0) {
  console.log(`No finished match in the week ${label}: no summary.`);
  process.exit(0);
}

// A safety net: the template must pass the same check as a written text. A failure is a bug in src/lib/week.ts.
const problems = verifySummary(templateSummary(week), week);
if (problems.length > 0) {
  console.log(`::warning::No summary for the week ${label}: the template fails its check (${problems.join("; ")}).`);
  process.exit(0);
}

const post = summaryPost(week);
const target = new URL(post.file, NEWS);
if (existsSync(target) && !/^vir: samodejno$/m.test(readFileSync(target, "utf8"))) {
  console.log(`Kept src/content/novice/${post.file}: edited by hand.`);
  process.exit(0);
}
writeFileSync(target, post.markdown);
console.log(`OK    src/content/novice/${post.file}: ${week.tekme.length} matches${week.mvp ? `, MVP ${week.mvp.ime}` : ""}`);
