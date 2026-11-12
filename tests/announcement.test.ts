// Tests for the notice strip above the header (13. 11. 2026): shown to its last day, gone after it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { activeAnnouncement, type Announcement } from "../src/lib/announcement.ts";

const notice: Announcement = { text: "Obvestilo", href: "/novice/x/", until: "2026-12-31" };

test("the notice is shown before its last day and on it", () => {
  assert.equal(activeAnnouncement(new Date("2026-11-19T10:00:00Z"), notice), notice);
  assert.equal(activeAnnouncement(new Date("2026-12-31T22:59:59Z"), notice), notice);
});

test("the notice is gone from the day after its last day", () => {
  assert.equal(activeAnnouncement(new Date("2027-01-01T00:00:00Z"), notice), null);
  assert.equal(activeAnnouncement(new Date("2027-01-03T21:00:00Z"), notice), null);
});

test("the real notice leads to the 1 % dohodnine news and ends on 31. 12. 2026", () => {
  const real = activeAnnouncement(new Date("2026-11-19T10:00:00Z"));
  assert.equal(real?.href, "/novice/2026-11-19-dohodnina/");
  assert.equal(activeAnnouncement(new Date("2027-01-03T21:00:00Z")), null);
});
