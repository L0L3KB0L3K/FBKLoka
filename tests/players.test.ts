// Tests for the roster rules (SPEC.md §4.5). The year-of-birth rule is tested in format.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { hiddenFfIds, teamRoster, type ManualPlayer } from "../src/lib/players.ts";
import type { RosterPlayer } from "../src/lib/types.ts";

const ff = (ime: string, stevilka: number | null, selekcija = "clani"): RosterPlayer => ({
  selekcija,
  ffId: stevilka ?? 0,
  ime,
  stevilka,
  pozicija: "napadalec",
});
const manual = (ime: string, extra: Partial<ManualPlayer> = {}): ManualPlayer => ({
  ime,
  selekcija: "clani",
  stevilka: 0,
  pozicija: "branilec",
  aktiven: true,
  ...extra,
});

test("FloorballFlash players of this team only", () => {
  const roster = teamRoster([ff("Ana Novak", 9), ff("Bor Kos", 1, "u19")], [], "clani");
  assert.deepEqual(
    roster.map((p) => p.ime),
    ["Ana Novak"],
  );
});

test("a manual entry with the same name replaces the FloorballFlash line", () => {
  const [player] = teamRoster([ff("Ana Novak", 9)], [manual(" ana novak ", { stevilka: 19, letnik: 1990 })], "clani");
  assert.equal(player?.stevilka, 19);
  assert.equal(player?.pozicija, "branilec");
  assert.equal(player?.letnik, 1990);
});

test("aktiven: false hides a player even when FloorballFlash lists them", () => {
  const roster = teamRoster([ff("Ana Novak", 9), ff("Bor Kos", 1)], [manual("Ana Novak", { aktiven: false })], "clani");
  assert.deepEqual(
    roster.map((p) => p.ime),
    ["Bor Kos"],
  );
});

test("a manual entry without a FloorballFlash match is added", () => {
  const roster = teamRoster([ff("Ana Novak", 9)], [manual("Cene Zupan", { stevilka: 5 })], "clani");
  assert.deepEqual(
    roster.map((p) => [p.ime, p.stevilka]),
    [
      ["Ana Novak", 9],
      ["Cene Zupan", 5],
    ],
  );
});

test("hidden ids: aktiven: false by name and team, the same player is gone from the roster; no aktiven = shown", () => {
  const ffList = [ff("Ana Novak", 9), ff("Bor Kos", 1), ff("Ana Novak", 5, "u19")];
  const manualList = [manual(" ana novak ", { aktiven: false })];
  assert.deepEqual(hiddenFfIds(ffList, manualList, "clani"), [9]);
  assert.deepEqual(
    teamRoster(ffList, manualList, "clani").map((p) => p.ime),
    ["Bor Kos"],
  );
  assert.deepEqual(hiddenFfIds(ffList, [{ ime: "Bor Kos", selekcija: "clani" }], "clani"), []);
});
