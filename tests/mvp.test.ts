// Tests for MVP vikenda (SPEC.md §20.3, LBS-MVPI 1.0): the worked examples of the formula document, the weekend,
// ties, exclusions and the Slovenian number forms on the card. The weekend data is the real IFL weekend 26.–27. 9. 2026.
import assert from "node:assert/strict";
import { test } from "node:test";
import { lineScore, matchWeight, pickMvp, statsText, weekendOf, weekendText, type GameLine, type MvpMatch } from "../src/lib/mvp.ts";

const line = (o: Partial<GameLine>): GameLine => ({
  gameId: 16450,
  personId: 1,
  ime: "A",
  goals: 0,
  assists: 0,
  pim: 0,
  saves: 0,
  shotsAgainst: 0,
  goalsAgainst: 0,
  ...o,
});
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test("match weight: close matches and wins count a little more", () => {
  near(matchWeight(5, 4), 1.15 * 1.05);
  near(matchWeight(7, 8), 1.15 * 0.95);
  near(matchWeight(3, 3), 1.15);
  near(matchWeight(6, 4), 1.05 * 1.05);
  near(matchWeight(12, 6), 1.05);
});

test("scores of the worked examples (p0 = 0.80), without the shot term", () => {
  near(lineScore(line({ saves: 18, shotsAgainst: 20, goalsAgainst: 2 }), 0.8), 2.0);
  near(lineScore(line({ goals: 1, assists: 1, pim: 2 }), 0.8), 1.6);
  near(lineScore(line({ saves: 14, shotsAgainst: 14 }), 0.8), 3.05); // shutout bonus from 8 shots
  near(lineScore(line({ saves: 9, shotsAgainst: 10, goalsAgainst: 1 }), 0.8), 1.0);
  near(lineScore(line({ goals: 2, assists: 1 }), 0.8), 2.7);
});

test("weekend: Saturday and Sunday in Ljubljana; a weekday match belongs to none", () => {
  assert.deepEqual(weekendOf("2026-09-26T17:00:00+02:00"), { od: "2026-09-26", do: "2026-09-27" });
  assert.deepEqual(weekendOf("2026-09-27T17:00:00+02:00"), { od: "2026-09-26", do: "2026-09-27" });
  assert.deepEqual(weekendOf("2026-10-31T23:30:00+01:00"), { od: "2026-10-31", do: "2026-11-01" });
  assert.equal(weekendOf("2026-09-30T19:00:00+02:00"), null);
  assert.equal(weekendText({ od: "2026-09-26", do: "2026-09-27" }), "26. in 27. september 2026");
  assert.equal(weekendText({ od: "2026-10-31", do: "2026-11-01" }), "31. oktober in 1. november 2026");
});

// IFL, 26. and 27. 9. 2026: FBK Loka – VSV 7:8, FBC Borovnica – FBK Loka 4:5 (5:4 for us); 20. 9. is an older weekend.
const matches: MvpMatch[] = [
  { id: 16458, competitionId: 738, zacetek: "2026-09-20T13:00:00+02:00", nasprotnik: "IBK Cartoon Heroes", goalsFor: 13, goalsAgainst: 6 },
  { id: 16493, competitionId: 738, zacetek: "2026-09-26T17:00:00+02:00", nasprotnik: "C.Hamp VSV Unihockey", goalsFor: 7, goalsAgainst: 8 },
  { id: 16450, competitionId: 738, zacetek: "2026-09-27T17:00:00+02:00", nasprotnik: "FBC Borovnica", goalsFor: 5, goalsAgainst: 4 },
];
const lines: GameLine[] = [
  line({ gameId: 16458, personId: 2643, ime: "Nejc Peklaj", goals: 2, assists: 2 }),
  line({ gameId: 16493, personId: 2643, ime: "Nejc Peklaj", goals: 3, assists: 1 }),
  line({ gameId: 16450, personId: 2643, ime: "Nejc Peklaj", goals: 2, assists: 1 }),
  line({ gameId: 16493, personId: 10, ime: "Gašper Triler", goals: 1, assists: 3 }),
  line({ gameId: 16450, personId: 10, ime: "Gašper Triler", goals: 1, assists: 1 }),
  line({ gameId: 16493, personId: 20, ime: "Tim Luznar", saves: 22, shotsAgainst: 30, goalsAgainst: 8 }),
  line({ gameId: 16450, personId: 30, ime: "Bine Lang", saves: 19, shotsAgainst: 23, goalsAgainst: 4 }),
];
const baselines = new Map([[738, 0.753]]);
const IFL = { competitionId: 738, label: "IFL" };

test("MVP of the latest weekend: both matches summed, one line per match, season totals from IFL", () => {
  const mvp = pickMvp(lines, matches, baselines, new Set(), IFL);
  assert.equal(mvp?.ime, "Nejc Peklaj");
  assert.deepEqual(mvp?.vikend, { od: "2026-09-26", do: "2026-09-27" });
  assert.deepEqual(
    mvp?.tekme.map((t) => `Tekma proti ${t.nasprotnik}: ${statsText(t, false)}`),
    ["Tekma proti C.Hamp VSV Unihockey: 3 goli, 1 podaja", "Tekma proti FBC Borovnica: 2 gola, 1 podaja"],
  );
  assert.equal(statsText(mvp!.sezona!, false), "7 golov, 4 podaje");
  assert.equal(mvp?.sezonaTekmovanje, "IFL");
});

test("the season line counts only IFL: a 1. SFL match is left out, no IFL match means no line", () => {
  const sfl: MvpMatch = { id: 9001, competitionId: 760, zacetek: "2026-09-13T17:00:00+02:00", nasprotnik: "FBC Borovnica", goalsFor: 9, goalsAgainst: 2 };
  const withSfl = [...lines, line({ gameId: 9001, personId: 2643, ime: "Nejc Peklaj", goals: 5, assists: 5 })];
  const mvp = pickMvp(withSfl, [...matches, sfl], baselines, new Set(), IFL);
  assert.equal(statsText(mvp!.sezona!, false), "7 golov, 4 podaje");
  const sflOnly = pickMvp(lines, matches, baselines, new Set(), { competitionId: 760, label: "1. SFL" });
  assert.equal(sflOnly?.sezona, null);
});

test("a goalie who prevents goals in a 1:0 win beats a one-goal skater", () => {
  const shutout = [{ ...matches[2]!, goalsFor: 1, goalsAgainst: 0 }];
  const mvp = pickMvp(
    [line({ personId: 30, ime: "Bine Lang", saves: 14, shotsAgainst: 14 }), line({ personId: 1, ime: "A", goals: 1 })],
    shutout,
    baselines,
    new Set(),
    IFL,
  );
  assert.equal(mvp?.ime, "Bine Lang");
  assert.equal(mvp?.vratar, true);
  assert.equal(statsText(mvp!.tekme[0]!, true), "14 obramb od 14 strelov (100 %)");
});

test("excluded players are never MVP; without a positive score there is no MVP", () => {
  assert.equal(pickMvp(lines, matches, baselines, new Set([2643]), IFL)?.ime, "Gašper Triler");
  assert.equal(pickMvp([line({ pim: 2 })], matches, baselines, new Set(), IFL), null);
  assert.equal(pickMvp(lines, [], baselines, new Set(), IFL), null);
});

test("a tie (within 0.10) goes to more goals", () => {
  // Both score 1.4 before the weight: 1 goal + 1 assist - 6 penalty minutes, and 2 assists.
  const tied = [line({ personId: 1, ime: "Strelec", goals: 1, assists: 1, pim: 6 }), line({ personId: 2, ime: "Podajalec", assists: 2 })];
  assert.equal(pickMvp(tied, matches, baselines, new Set(), IFL)?.ime, "Strelec");
});

test("Slovenian forms on the card", () => {
  const s = (goli: number, podaje: number) => statsText({ goli, podaje, obrambe: 0, streli: 0 }, false);
  assert.equal(s(1, 2), "1 gol, 2 podaji");
  assert.equal(s(3, 4), "3 goli, 4 podaje");
  assert.equal(s(5, 1), "5 golov, 1 podaja");
  assert.equal(s(0, 0), "0 golov, 0 podaj");
  assert.equal(statsText({ goli: 0, podaje: 0, obrambe: 1, streli: 1 }, true), "1 obramba od 1 strela (100 %)");
  assert.equal(statsText({ goli: 0, podaje: 0, obrambe: 2, streli: 3 }, true), "2 obrambi od 3 strelov (67 %)");
});
