// Tests for FloorballFlash standings and rosters (SPEC.md §5.8).
// Standings fixture: real competitionStandings response for IFL 2026/27 (competition 738), saved 28. 9. 2026.
// Roster entries are made up: real player lists are not stored in the tests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FF_LOGO_BASE, normalizeRoster, normalizeStandings, type FfStandingsTable } from "../src/lib/ff.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/ff-738-standings.json", import.meta.url), "utf8"));
const tables: FfStandingsTable[] = fixture.data.competitionStandings;
const LOKA = 3462;
const standings = normalizeStandings(tables, new Set([LOKA]), { selekcija: "clani", label: "IFL", competitionId: 738 });

test("only tables with our team are kept (the Austria-only table is dropped)", () => {
  assert.equal(tables.length, 2);
  assert.equal(standings.tabele.length, 1);
  assert.match(standings.tabele[0]?.ime ?? "", /IFL$/);
});

test("rows keep FloorballFlash order and numbers, our row is marked", () => {
  const rows = standings.tabele[0]?.vrstice ?? [];
  assert.equal(rows.length, 8);
  assert.deepEqual(
    rows.map((row) => row.mesto),
    [...rows].map((row) => row.mesto).sort((a, b) => a - b),
  );
  const ours = rows.filter((row) => row.loka);
  assert.equal(ours.length, 1);
  assert.equal(ours[0]?.ekipa, "FBK Loka");
  for (const row of rows) {
    assert.equal(row.zmage + row.zmagePodaljsek + row.poraziPodaljsek + row.porazi + row.remi, row.tekme, row.ekipa);
    assert.ok(row.logo === null || row.logo.startsWith(FF_LOGO_BASE));
  }
});

test("missing numbers count as 0", () => {
  const [table] = structuredClone(tables);
  assert.ok(table);
  const [row] = table.teams;
  assert.ok(row);
  row.points = null;
  row.goalsFor = null;
  const [first] = normalizeStandings([table], new Set([row.id]), { selekcija: "clani", label: "IFL", competitionId: 738 })
    .tabele[0]?.vrstice ?? [];
  assert.equal(first?.tocke, 0);
  assert.equal(first?.goliDani, 0);
});

const player = (id: number, first: string, last: string, number: number | null, position: string | null, incognito = false) => ({
  number,
  position,
  person: { id, firstname: first, lastname: last, incognito },
});

test("roster: positions mapped, names cleaned, incognito left out, one entry per person", () => {
  const ifl = [
    player(1, "Ana ", "Novak", 9, "F"),
    player(2, "Bor", "Kos", 1, "G"),
    player(3, "Cene", "Zupan", 5, "D", true),
    player(4, "Dan", "Hrast", null, null),
  ];
  const sfl = [player(1, "Ana", "Novak", 19, "F"), player(5, "Eva", "Lipa", 22, "D")];
  const roster = normalizeRoster([ifl, sfl], "clani");

  assert.deepEqual(
    roster.map((p) => [p.ime, p.stevilka, p.pozicija]),
    [
      ["Ana Novak", 9, "napadalec"], // IFL number wins
      ["Bor Kos", 1, "vratar"],
      ["Dan Hrast", null, null],
      ["Eva Lipa", 22, "branilec"],
    ],
  );
  assert.ok(roster.every((p) => p.selekcija === "clani"));
});
