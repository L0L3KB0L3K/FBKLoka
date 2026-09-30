// Tests for the page helpers of /ekipa/plato and /ekipa/prevoz (SPEC.md §19.5).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canCancel,
  driversLine,
  fromSnapshot,
  matchesFor,
  messageFor,
  MESSAGE_OTHER,
  teamsLine,
  toMs,
  toSnapshot,
  whenLine,
  type EkipaData,
  type EkipaMatch,
} from "../src/lib/ekipa.ts";

const match = (id: number, doma: boolean, zacetek = "2026-10-10T17:00:00+02:00"): EkipaMatch => ({
  id,
  zacetek,
  tekmovanje: "IFL",
  nasprotnik: "KAC Floorball",
  doma,
  prizorisce: "Dvorana Poden",
  plato: null,
  prevoz: doma ? null : [],
});
const data = (tekme: EkipaMatch[]): EkipaData => ({
  generatedAt: "",
  igralci: [],
  tekme,
  stevci: { plato: [], prevoz: [] },
  pravila: { odjavaRokUr: 24 },
});

test("plato lists every match, prevoz only away matches", () => {
  const d = data([match(1, true), match(2, false)]);
  assert.deepEqual(
    matchesFor("plato", d).map((m) => m.id),
    [1, 2],
  );
  assert.deepEqual(
    matchesFor("prevoz", d).map((m) => m.id),
    [2],
  );
});

test("lines: date and time in Ljubljana, home team first", () => {
  assert.equal(whenLine(match(1, true, "2026-10-03T15:00:00+02:00")), "sob 3. 10. ob 15:00");
  assert.equal(teamsLine(match(1, true)), "FBK Loka – KAC Floorball");
  assert.equal(teamsLine(match(2, false)), "KAC Floorball – FBK Loka");
});

test("cancel: plato until 24 h before, drivers until the start, nobody after the start", () => {
  const m = match(1, true, "2026-10-10T17:00:00+02:00");
  const dayBefore = new Date("2026-10-09T18:00:00+02:00"); // 23 h before
  const twoDays = new Date("2026-10-08T17:00:00+02:00");
  assert.equal(canCancel("plato", m, 24, twoDays), true);
  assert.equal(canCancel("plato", m, 24, dayBefore), false);
  assert.equal(canCancel("plato", m, 0, dayBefore), true);
  assert.equal(canCancel("prevoz", m, 24, dayBefore), true);
  assert.equal(canCancel("prevoz", m, 24, new Date("2026-10-10T17:30:00+02:00")), false);
});

test("messages: known reasons have their own text, the rest a general one", () => {
  assert.match(messageFor("zasedeno"), /hitrejši/);
  assert.equal(messageFor("neznano ime"), MESSAGE_OTHER);
});

test("snapshot: saved without the action answer, read back without started matches, ignored after 7 days", () => {
  const now = Date.parse("2026-10-01T12:00:00+02:00");
  const withAnswer: EkipaData = { ...data([match(1, true, "2026-09-30T17:00:00+02:00"), match(2, false)]), result: { ok: true } };
  const raw = toSnapshot(withAnswer, now);
  assert.equal(JSON.parse(raw).data.result, undefined);
  assert.deepEqual(fromSnapshot(raw, now)?.tekme.map((m) => m.id), [2]);
  assert.equal(fromSnapshot(raw, now + 8 * 24 * 60 * 60 * 1000), null);
  assert.equal(fromSnapshot("{broken", now), null);
  assert.equal(fromSnapshot(JSON.stringify({ savedAt: now, data: { tekme: [] } }), now), null);
  assert.equal(fromSnapshot(null, now), null);
});

test("CSS times in ms: minified seconds, milliseconds, fallback", () => {
  assert.equal(toMs(".22s", 0), 220);
  assert.equal(toMs("150ms", 0), 150);
  assert.equal(toMs("", 220), 220);
  assert.equal(toMs("auto", 150), 150);
});

test("drivers: the verb agrees with the number (vozi, vozita, vozijo)", () => {
  assert.equal(driversLine([]), "Še nihče ne vozi.");
  assert.equal(driversLine(["Maj Oman"]), "Vozi: Maj Oman");
  assert.equal(driversLine(["Maj Oman", "Nejc Peklaj"]), "Vozita: Maj Oman, Nejc Peklaj");
  assert.equal(driversLine(["Maj Oman", "Nejc Peklaj", "Tim Luznar"]), "Vozijo: Maj Oman, Nejc Peklaj, Tim Luznar");
});
