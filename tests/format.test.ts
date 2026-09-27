// Tests for date formatting in Europe/Ljubljana and match list helpers (SPEC.md §7.3, §10).
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateLong, formatDayShort, formatTime, formatWeek, weekStart } from "../src/lib/format.ts";
import { groupByWeek, scoreForLoka, scoreHomeAway, splitByState, uniqueGames } from "../src/lib/matches.ts";
import type { Match } from "../src/lib/types.ts";

test("short date and time in Ljubljana", () => {
  assert.equal(formatDayShort("2026-10-10T17:00:00+02:00"), "sob 10. 10.");
  assert.equal(formatTime("2026-10-10T17:00:00+02:00"), "17:00");
});

test("a late game keeps its Ljubljana date even when UTC is already the next day", () => {
  // 23:30 in Ljubljana = 21:30 UTC, same day; 00:30 in Ljubljana = 22:30 UTC on the previous day.
  assert.equal(formatDayShort("2026-10-10T23:30:00+02:00"), "sob 10. 10.");
  assert.equal(formatDayShort("2026-10-11T00:30:00+02:00"), "ned 11. 10.");
});

test("long date", () => {
  assert.equal(formatDateLong("2026-10-25T13:00:00+01:00"), "nedelja, 25. oktober 2026");
});

test("weeks start on Monday, also across the DST change", () => {
  assert.equal(weekStart("2026-10-10T17:00:00+02:00"), "2026-10-05"); // Saturday
  assert.equal(weekStart("2026-10-05T00:10:00+02:00"), "2026-10-05"); // Monday just after midnight
  assert.equal(weekStart("2026-10-25T13:00:00+01:00"), "2026-10-19"); // Sunday, clocks went back
});

test("week headings", () => {
  assert.equal(formatWeek("2026-10-05"), "5.–11. oktober");
  assert.equal(formatWeek("2026-09-28"), "28. september – 4. oktober");
});

const base: Match = {
  id: 1,
  selekcija: "u17",
  tekmovanje: "U17 A",
  zacetek: "2026-10-10T10:00:00+02:00",
  doma: true,
  ekipaLoka: "FBK Loka A",
  nasprotnik: { ime: "FBK Loka B", logo: null },
  prizorisce: null,
  stanje: "koncana",
  rezultat: { loka: 5, nasprotnik: 3 },
  faza: "",
  ffUrl: "",
};

test("a game between our two teams is listed once, from the home team's side", () => {
  const home = base;
  const away: Match = { ...base, tekmovanje: "U17 B", doma: false, ekipaLoka: "FBK Loka B", nasprotnik: { ime: "FBK Loka A", logo: null } };
  const other: Match = { ...base, id: 2 };
  const unique = uniqueGames([away, home, other]);
  assert.equal(unique.length, 2);
  assert.equal(unique.find((m) => m.id === 1)?.ekipaLoka, "FBK Loka A");
});

test("scores: home – away in general lists, FBK Loka's side on team pages", () => {
  const away: Match = { ...base, doma: false, rezultat: { loka: 13, nasprotnik: 6 } };
  assert.equal(scoreHomeAway(away), "6:13");
  assert.equal(scoreForLoka(away), "Zmaga 13:6");
  assert.equal(scoreForLoka({ ...base, rezultat: { loka: 2, nasprotnik: 4 } }), "Poraz 2:4");
  assert.equal(scoreForLoka({ ...base, rezultat: { loka: 3, nasprotnik: 3 } }), "Neodločeno 3:3");
});

test("finished games newest first, upcoming soonest first, grouped by week", () => {
  const a: Match = { ...base, id: 1, zacetek: "2026-10-03T10:00:00+02:00" };
  const b: Match = { ...base, id: 2, zacetek: "2026-10-04T10:00:00+02:00" };
  const c: Match = { ...base, id: 3, zacetek: "2026-10-10T10:00:00+02:00", stanje: "prihodnja", rezultat: null };
  const { prihodnje, odigrane } = splitByState([a, b, c]);
  assert.deepEqual(odigrane.map((m) => m.id), [2, 1]);
  assert.deepEqual(prihodnje.map((m) => m.id), [3]);
  assert.deepEqual(groupByWeek([a, b, c]).map((g) => [g.monday, g.matches.length]), [["2026-09-28", 2], ["2026-10-05", 1]]);
});

test("birth year is shown only when the player is certainly an adult", async () => {
  const { canShowBirthYear } = await import("../src/lib/players.ts");
  const today = new Date("2026-09-27T12:00:00Z");
  assert.equal(canShowBirthYear(2007, today), true); // 19 this year
  assert.equal(canShowBirthYear(2008, today), false); // 18 only if the birthday has passed: unknown
  assert.equal(canShowBirthYear(2012, today), false);
  assert.equal(canShowBirthYear(undefined, today), false);
});

test("titles are grouped by name with years ascending", async () => {
  const { groupTitles } = await import("../src/lib/titles.ts");
  const groups = groupTitles([
    { leto: 2020, naziv: "Prvaki IFL" },
    { leto: 2019, naziv: "Prvaki IFL" },
    { leto: 2019, naziv: "Državni prvaki" },
  ]);
  assert.deepEqual(groups, [
    { naziv: "Prvaki IFL", leta: [2019, 2020] },
    { naziv: "Državni prvaki", leta: [2019] },
  ]);
});
