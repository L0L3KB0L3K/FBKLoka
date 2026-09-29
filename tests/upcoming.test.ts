// Tests for the home page match logic (SPEC.md §7.1, §15 step 5).
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCountdown, lastPlayed, pick } from "../src/lib/upcoming.ts";

const KAC = "2026-10-10T17:00:00+02:00"; // Saturday
const NEXT = "2026-10-11T10:00:00+02:00"; // Sunday
const at = (iso: string) => new Date(iso);

test("match day: the match is on the board, marked as today, with a countdown", () => {
  const r = pick([KAC, NEXT], at("2026-10-10T12:00:00+02:00"));
  assert.equal(r.board, 0);
  assert.equal(r.today, true);
  assert.equal(r.live, false);
  assert.equal(formatCountdown(r.msToStart), "še 5 ur");
});

test("started 2 hours ago: still on the board, live, no countdown", () => {
  const r = pick([KAC, NEXT], at("2026-10-10T19:00:00+02:00"));
  assert.deepEqual(r.visible, [true, true]);
  assert.equal(r.board, 0);
  assert.equal(r.live, true);
  assert.equal(formatCountdown(r.msToStart), "");
});

test("started 4 hours ago: hidden, the next match takes the board", () => {
  const r = pick([KAC, NEXT], at("2026-10-10T21:00:00+02:00"));
  assert.deepEqual(r.visible, [false, true]);
  assert.equal(r.board, 1);
  assert.equal(r.today, false);
  assert.equal(formatCountdown(r.msToStart), "še 13 ur");
});

test("no matches: nothing on the board", () => {
  assert.equal(pick([], at("2026-10-10T12:00:00+02:00")).board, null);
});

test("an old build where every match is over: nothing on the board", () => {
  const r = pick([KAC, NEXT], at("2026-10-20T12:00:00+02:00"));
  assert.equal(r.board, null);
  assert.deepEqual(r.visible, [false, false]);
});

test("'today' follows the Ljubljana date, not UTC", () => {
  // 00:30 on Sunday in Ljubljana is still Saturday in UTC.
  assert.equal(pick([NEXT], at("2026-10-11T00:30:00+02:00")).today, true);
  // 23:30 on Saturday: a match at 00:30 on Sunday is tomorrow, although UTC says the same day.
  assert.equal(pick(["2026-10-11T00:30:00+02:00"], at("2026-10-10T23:30:00+02:00")).today, false);
});

test("countdown uses Slovenian number forms", () => {
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  assert.equal(formatCountdown(2 * day + 4 * hour), "še 2 dneva 4 ure");
  assert.equal(formatCountdown(1 * day + 1 * hour), "še 1 dan 1 uro");
  assert.equal(formatCountdown(5 * day), "še 5 dni");
  assert.equal(formatCountdown(3 * hour + 3 * min), "še 3 ure 3 minute");
  assert.equal(formatCountdown(2 * hour + 2 * min), "še 2 uri 2 minuti");
  assert.equal(formatCountdown(45 * min), "še 45 minut");
  assert.equal(formatCountdown(30_000), "še 1 minuto");
  assert.equal(formatCountdown(0), "");
});

test("played: a match that ended (after 3 h) and started less than 48 h ago; the latest one wins", () => {
  const starts = ["2026-10-10T15:00:00+02:00", "2026-10-11T13:00:00+02:00"];
  assert.equal(lastPlayed(starts, at("2026-10-10T17:00:00+02:00")), null); // still on the board (live)
  assert.equal(lastPlayed(starts, at("2026-10-10T19:00:00+02:00")), 0); // Saturday evening
  assert.equal(lastPlayed(starts, at("2026-10-11T17:00:00+02:00")), 1); // Sunday: the later match
  assert.equal(lastPlayed(starts, at("2026-10-13T14:00:00+02:00")), null); // both older than 48 h
});
