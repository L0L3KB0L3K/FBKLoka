// Tests for FloorballFlash normalisation (SPEC.md §5.5).
// Fixture: real competitionDetailsTree response for 3 Nations - IFL 2026/27 (competition 738), saved 25. 9. 2026.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FF_LOGO_BASE, logoFileName, mergeWithPrevious, normalize, sortMatches, type FfCompetitionDetails } from "../src/lib/ff.ts";
import type { Match } from "../src/lib/types.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/ff-738.json", import.meta.url), "utf8"));
const details: FfCompetitionDetails = fixture.data.competitionDetails;
const config = { selekcija: "clani", label: "IFL", teamNames: ["FBK Loka"] };
const matches = normalize(details, config);
const byId = (id: number) => {
  const match = matches.find((m) => m.id === id);
  assert.ok(match, `match ${id} missing`);
  return match;
};

test("playoff placeholders are removed", () => {
  const allGames = details.phases.flatMap((p) => p.groups.flatMap((g) => g.rounds.flatMap((r) => r.games)));
  const placeholderIds = allGames.filter((g) => g.home.id === null || g.away.id === null).map((g) => g.id);
  assert.ok(placeholderIds.length > 0, "fixture should contain placeholders");
  assert.equal(matches.filter((m) => placeholderIds.includes(m.id)).length, 0);

  // A placeholder against FBK Loka ("Winner Semi 1" vs FBK Loka) must also be dropped.
  const withPlaceholder: FfCompetitionDetails = structuredClone(details);
  withPlaceholder.phases[0].groups[0].rounds[0].games.push({
    id: 99999,
    state: "BeforeGame",
    home: { id: null, goals: 0, comment: "Winner Semi 1" },
    away: { id: 3462, goals: 0, comment: "FBK Loka" },
    venue: null,
    schedule: { date: { year: 2027, month: 3, day: 1 }, time: null, timezone: "Europe/Vienna" },
  });
  assert.equal(normalize(withPlaceholder, config).some((m) => m.id === 99999), false);
});

test("only FBK Loka games are kept (7 opponents, home and away)", () => {
  assert.equal(matches.length, 14);
  assert.ok(matches.every((m) => m.ekipaLoka === "FBK Loka"));
});

test("doma: 16493 is a home game, 16450 an away game", () => {
  assert.equal(byId(16493).doma, true);
  assert.equal(byId(16450).doma, false);
  assert.equal(byId(16450).nasprotnik.ime, "FBC Borovnica");
});

test("16496 on 25. 10. 2026 at 13:00, the day the clocks go back, is +01:00", () => {
  assert.equal(byId(16496).zacetek, "2026-10-25T13:00:00+01:00");
});

test("16494 on 10. 10. 2026 at 17:00, summer time, is +02:00", () => {
  assert.equal(byId(16494).zacetek, "2026-10-10T17:00:00+02:00");
});

test("finished 16458 has the result from FBK Loka's side", () => {
  const match = byId(16458);
  assert.equal(match.stanje, "koncana");
  assert.deepEqual(match.rezultat, { loka: 13, nasprotnik: 6 });
});

test("upcoming games have no result", () => {
  assert.equal(byId(16493).stanje, "prihodnja");
  assert.equal(byId(16493).rezultat, null);
});

test("a team name that is not in the competition gives no matches", () => {
  assert.deepEqual(normalize(details, { ...config, teamNames: ["FBK Loka A"] }), []);
});

test("a failed competition keeps its previous matches, others are replaced", () => {
  const ifl = byId(16493);
  const oldSfl: Match = { ...ifl, id: 1, tekmovanje: "1. SFL" };
  const staleIfl: Match = { ...ifl, id: 2 }; // removed from FF since the last run
  const merged = mergeWithPrevious([ifl], [oldSfl, staleIfl], [{ selekcija: "clani", label: "1. SFL" }]);
  assert.deepEqual(merged.map((m) => m.id).sort(), [1, 16493]);
});

test("sorting compares instants, not strings, across the DST change", () => {
  const base = byId(16493);
  const early: Match = { ...base, id: 1, zacetek: "2026-10-25T01:30:00+02:00" }; // 23:30 UTC on the 24th
  const late: Match = { ...base, id: 2, zacetek: "2026-10-25T01:00:00+01:00" }; // 00:00 UTC on the 25th
  assert.deepEqual(sortMatches([late, early]).map((m) => m.id), [1, 2]);
});

test("logo file names: plain image names only, nothing that could leave the logo folder", () => {
  assert.equal(logoFileName(FF_LOGO_BASE + "uploads/public/abc-123.PNG"), "abc-123.png");
  assert.equal(logoFileName("https://example.com/..%2F..%2Fetc%2Fpasswd"), null);
  assert.equal(logoFileName("https://example.com/page.html"), null);
});
