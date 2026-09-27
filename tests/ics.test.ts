// Tests for the team calendar (src/lib/ics.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { toIcs } from "../src/lib/ics.ts";
import type { Match } from "../src/lib/types.ts";

const base: Match = {
  id: 16496,
  selekcija: "clani",
  tekmovanje: "IFL",
  zacetek: "2026-10-25T13:00:00+01:00",
  doma: true,
  ekipaLoka: "FBK Loka",
  nasprotnik: { ime: "FBC Dragons", logo: null },
  prizorisce: { ime: "Dvorana Poden", kraj: "Škofja Loka", naslov: "Podlubnik 1c, 4220 Škofja Loka" },
  stanje: "prihodnja",
  rezultat: null,
  faza: "Qualification Round",
  ffUrl: "https://www.floorballflash.at/game/16496",
};
const options = { name: "FBK Loka – Člani", stamp: "2026-09-27T10:00:00.000Z" };

test("times are converted to UTC, also on the day the clocks go back", () => {
  const ics = toIcs([base], options);
  assert.match(ics, /DTSTART:20261025T120000Z\r\n/);
  assert.match(ics, /DTEND:20261025T140000Z\r\n/);
  const summer = toIcs([{ ...base, zacetek: "2026-10-10T17:00:00+02:00" }], options);
  assert.match(summer, /DTSTART:20261010T150000Z\r\n/);
});

test("lines end with CRLF and the calendar is well formed", () => {
  const ics = toIcs([base], options);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(ics.split("\r\n").filter((l) => l === "BEGIN:VEVENT").length, 1);
  assert.equal(ics.replace(/\r\n/g, "").includes("\n"), false);
});

test("commas are escaped in text values and the finished result is in the summary", () => {
  const ics = toIcs([{ ...base, stanje: "koncana", rezultat: { loka: 13, nasprotnik: 6 } }], options);
  const bs = String.fromCharCode(92);
  assert.ok(ics.includes(`LOCATION:Dvorana Poden${bs}, Podlubnik 1c${bs}, 4220 Škofja Loka`));
  assert.match(ics, /SUMMARY:FBK Loka – FBC Dragons 13:6 \(IFL\)/);
});

test("long lines are folded at 75 bytes without splitting a character", () => {
  const long = { ...base, prizorisce: { ime: "Športna dvorana Šolskega centra Škofja Loka".repeat(3), kraj: "", naslov: "" } };
  const lines = toIcs([long], options).split("\r\n");
  const encoder = new TextEncoder();
  assert.ok(lines.every((line) => encoder.encode(line).length <= 75));
  assert.ok(lines.some((line) => line.startsWith(" ")));
  assert.equal(lines.join("\r\n").includes("\uFFFD"), false);
});
