// Tests for the weekly summary (SPEC.md §20.5): the week's facts, the fixed template (grammar included) and the strict
// check that decides between a written text and the template. Data: the real IFL weekend 26.–27. 9. 2026.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Mvp } from "../src/lib/mvp.ts";
import type { Match } from "../src/lib/types.ts";
import {
  buildWeek,
  prepositionFor,
  summaryPost,
  templateSummary,
  unfinishedMatches,
  verifySummary,
  weekBounds,
  weekRange,
} from "../src/lib/week.ts";

const match = (o: Partial<Match>): Match => ({
  id: 1,
  selekcija: "clani",
  tekmovanje: "IFL",
  zacetek: "2026-09-26T17:00:00+02:00",
  doma: true,
  ekipaLoka: "FBK Loka",
  nasprotnik: { ime: "C.Hamp VSV Unihockey", logo: null },
  prizorisce: null,
  stanje: "koncana",
  rezultat: { loka: 7, nasprotnik: 8 },
  faza: "Qualification Round",
  ffUrl: "",
  ...o,
});
const matches: Match[] = [
  match({ id: 16458, zacetek: "2026-09-20T13:00:00+02:00", nasprotnik: { ime: "IBK Cartoon Heroes", logo: null }, rezultat: { loka: 13, nasprotnik: 6 } }),
  match({ id: 16493 }),
  match({ id: 16450, zacetek: "2026-09-27T17:00:00+02:00", doma: false, nasprotnik: { ime: "FBC Borovnica", logo: null }, rezultat: { loka: 5, nasprotnik: 4 } }),
  match({ id: 16500, zacetek: "2026-10-03T15:00:00+02:00", stanje: "prihodnja", rezultat: null }),
];
const mvp: Mvp = {
  razlicica: "LBS-MVPI 1.0",
  vikend: { od: "2026-09-26", do: "2026-09-27" },
  ffId: 2643,
  ime: "Nejc Peklaj",
  vratar: false,
  slika: null,
  tekme: [
    { nasprotnik: "C.Hamp VSV Unihockey", zacetek: "2026-09-26T17:00:00+02:00", goli: 3, podaje: 1, obrambe: 0, streli: 0 },
    { nasprotnik: "FBC Borovnica", zacetek: "2026-09-27T17:00:00+02:00", goli: 2, podaje: 1, obrambe: 0, streli: 0 },
  ],
  sezona: { goli: 12, podaje: 7, obrambe: 0, streli: 0 },
  sezonaTekmovanje: "IFL",
};
const teden = weekBounds(new Date("2026-09-27T20:07:00Z"));
const week = buildWeek(matches, { clani: "Člani" }, mvp, teden);

test("week: Monday to Sunday in Ljubljana, only finished matches of the week, the MVP of its weekend", () => {
  assert.deepEqual(teden, { od: "2026-09-21", do: "2026-09-27" });
  assert.deepEqual(weekBounds(new Date("2026-09-21T00:30:00+02:00")), { od: "2026-09-21", do: "2026-09-27" });
  assert.deepEqual(week.tekme.map((m) => `${m.dan} ${m.goliLoka}:${m.goliNasprotnik} ${m.izid}`), ["sobota 7:8 poraz", "nedelja 5:4 zmaga"]);
  assert.deepEqual(week.mvp?.skupaj, { goli: 5, podaje: 2, obrambe: 0, streli: 0 });
  assert.deepEqual(week.naslednjiTeden, { od: "2026-09-28", do: "2026-10-04" });
  assert.deepEqual(week.prihodnje.map((m) => `${m.dan} ${m.ura} ${m.nasprotnik}`), ["sobota 15:00 C.Hamp VSV Unihockey"]);
  assert.equal(buildWeek(matches, { clani: "Člani" }, mvp, { od: "2026-09-28", do: "2026-10-04" }).mvp, null);
});

test("template: one paragraph per team, the MVP last, correct z/s and endings", () => {
  assert.equal(
    templateSummary(week),
    "Člani so v soboto v IFL doma izgubili proti ekipi C.Hamp VSV Unihockey s 7:8. V nedeljo so v IFL v gosteh premagali ekipo FBC Borovnica s 5:4.\n\n" +
      "MVP vikenda je Nejc Peklaj (5 golov, 2 podaji).\n\n" +
      "## Naslednji teden\n\nČlani igrajo v soboto, 3. 10., ob 15:00 v IFL doma proti ekipi C.Hamp VSV Unihockey.",
  );
  const youth = buildWeek([match({ id: 9, selekcija: "u17", tekmovanje: "U17", rezultat: { loka: 12, nasprotnik: 6 } })], { u17: "U17" }, null, teden);
  assert.equal(templateSummary(youth), "Ekipa U17 je v soboto v U17 doma premagala ekipo C.Hamp VSV Unihockey z 12:6.\n\nNaslednji teden ni tekem.");
  assert.deepEqual([0, 1, 2, 3, 7, 8, 12, 13, 18, 20, 30].map(prepositionFor), ["z", "z", "z", "s", "s", "z", "z", "s", "z", "z", "s"]);
});

test("check: the template always passes", () => {
  assert.deepEqual(verifySummary(templateSummary(week), week), []);
});

test("check: an invented score, number, name or opinion fails", () => {
  const good = "Člani so v soboto doma izgubili proti ekipi C.Hamp VSV Unihockey s 7:8.";
  assert.deepEqual(verifySummary(good, week), []);
  assert.match(verifySummary("Člani so zmagali s 6:4.", week).join(), /rezultat 6:4/);
  assert.match(verifySummary("Člani so zmagali že tretjič v 14 dneh.", week).join(), /število 14/);
  assert.match(verifySummary("Člani so premagali ekipo FBC Borovnica, zadel je Janez Novak.", week).join(), /ime Janez/);
  assert.match(verifySummary("Člani so odlično premagali ekipo FBC Borovnica.", week).join(), /mnenje/);
  assert.match(verifySummary("Člani so premagali Borovnico.", week).join(), /ime Borovnico/);
  assert.match(verifySummary("Člani so premagali ekipo C.Hamp VSV Unihockey s 7:8.", week).join(), /izid ob 7:8/);
  assert.deepEqual(verifySummary("Člani igrajo v soboto, 3. 10., ob 15:00 v IFL doma.", week), []);
  assert.match(verifySummary("Člani igrajo v soboto, 3. 10., ob 16:00.", week).join(), /16:00/);
  assert.deepEqual(verifySummary("V nedeljo so v gosteh premagali ekipo FBC Borovnica s 5:4.", week), []);
});

test("post: named by the Sunday, dates in the title, first paragraph as teaser, fixed cover, label for one team", () => {
  const post = summaryPost(week);
  assert.equal(post.file, "2026-09-27-povzetek-tedna.md");
  assert.equal(
    post.markdown.split("---\n")[1],
    'naslov: "Povzetek tedna 21.–27. 9."\n' +
      "datum: 2026-09-27\n" +
      'povzetek: "Člani so v soboto v IFL doma izgubili proti ekipi C.Hamp VSV Unihockey s 7:8. V nedeljo so v IFL v gosteh premagali ekipo FBC Borovnica s 5:4."\n' +
      "naslovnaSlika: ./img/povzetek-tedna.webp\n" +
      'slikaAlt: "Logotip FBK Loka na črni podlagi."\n' +
      "selekcija: clani\n" +
      "vir: samodejno\n",
  );
  assert.ok(post.markdown.endsWith(`---\n${templateSummary(week)}\n`));
  const two = buildWeek([...matches, match({ id: 9, selekcija: "u17", tekmovanje: "U17" })], { clani: "Člani", u17: "U17" }, mvp, teden);
  assert.doesNotMatch(summaryPost(two).markdown, /selekcija:/);
  assert.equal(weekRange({ od: "2026-09-28", do: "2026-10-04" }), "28. 9.–4. 10.");
});

test("post: waits while a match of the week has started without a result", () => {
  const sundayNight = new Date("2026-09-27T20:07:00Z");
  assert.deepEqual(unfinishedMatches(matches, teden, sundayNight), []);
  const late = [...matches, match({ id: 17, zacetek: "2026-09-27T18:00:00+02:00", stanje: "prihodnja", rezultat: null })];
  assert.deepEqual(
    unfinishedMatches(late, teden, sundayNight).map((m) => m.id),
    [17],
  );
  assert.deepEqual(unfinishedMatches(late, teden, new Date("2026-09-27T15:00:00Z")), []); // not started yet
});

test("next week: a summary made later for an old week still lists that next week's matches, played or not", () => {
  const old = buildWeek(matches, { clani: "Člani" }, null, { od: "2026-09-14", do: "2026-09-20" });
  assert.deepEqual(
    old.prihodnje.map((m) => m.id),
    [16493, 16450],
  );
});
