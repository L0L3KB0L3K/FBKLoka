// Tests for the FloorballFlash schedule gate (SPEC.md §20.2): a run counts from the start of its Ljubljana window until
// 8 hours later, past midnight, in summer and in winter time (summer time ends on 25. 10. 2026). The late starts of
// 4., 11. and 18. 10. 2026, which the old 45-minute window skipped, now run.
import assert from "node:assert/strict";
import { test } from "node:test";
import { alreadyPublished, shouldRun, windowAt } from "../scripts/ff-gate.ts";

const scheduled = (utc: string) => windowAt(new Date(utc), "schedule");

test("Sunday: from 22:00 to Monday 06:00 in Ljubljana, the late GitHub starts of October included", () => {
  assert.equal(scheduled("2026-10-04T20:07:00Z"), "sunday"); // Sunday 22:07 (summer)
  assert.equal(scheduled("2026-10-04T22:59:53Z"), "sunday"); // Monday 00:59, the real start of 4. 10.
  assert.equal(scheduled("2026-10-11T23:35:15Z"), "sunday"); // Monday 01:35, 11. 10.
  assert.equal(scheduled("2026-10-18T22:22:32Z"), "sunday"); // Monday 00:22, 18. 10.
  assert.equal(scheduled("2026-10-04T19:59:00Z"), null); // Sunday 21:59
  assert.equal(scheduled("2026-10-05T03:59:00Z"), "sunday"); // Monday 05:59
  assert.equal(scheduled("2026-10-05T04:00:00Z"), null); // Monday 06:00
});

test("Sunday in winter time: 21:07 is too early, 22:07 and the Monday-morning entries run", () => {
  assert.equal(scheduled("2026-11-08T20:07:00Z"), null); // Sunday 21:07
  assert.equal(scheduled("2026-11-08T21:07:00Z"), "sunday"); // Sunday 22:07
  assert.equal(scheduled("2026-11-09T03:07:00Z"), "sunday"); // Monday 04:07
});

test("Saturday: from 22:30 to Sunday 06:30, then the Sunday window is separate", () => {
  assert.equal(scheduled("2026-10-03T20:37:00Z"), "saturday"); // Saturday 22:37 (summer)
  assert.equal(scheduled("2026-10-03T20:29:00Z"), null); // Saturday 22:29
  assert.equal(scheduled("2026-10-04T04:29:00Z"), "saturday"); // Sunday 06:29
  assert.equal(scheduled("2026-10-04T04:30:00Z"), null); // Sunday 06:30
});

test("one deploy a night: a later run of the same window skips once the bot has published data", () => {
  const night = new Date("2026-10-25T23:07:00Z"); // Monday 00:07 (winter), Sunday window
  assert.equal(alreadyPublished("sunday", night, Date.parse("2026-10-25T21:09:00Z")), true); // published 2 h ago
  assert.equal(alreadyPublished("sunday", night, Date.parse("2026-10-18T22:30:00Z")), false); // last week
  assert.equal(alreadyPublished("manual", night, Date.parse("2026-10-25T23:00:00Z")), false); // manual always runs
  assert.equal(alreadyPublished("sunday", night, 0), false); // no data commit yet
});

test("other days never run on schedule; a manual run always does", () => {
  assert.equal(scheduled("2026-10-05T20:37:00Z"), null); // Monday 22:37
  assert.equal(scheduled("2026-10-07T12:00:00Z"), null); // Wednesday noon
  assert.equal(windowAt(new Date("2026-10-06T09:00:00Z"), "workflow_dispatch"), "manual"); // Tuesday morning
  assert.equal(shouldRun(new Date("2026-10-06T09:00:00Z"), "workflow_dispatch"), true);
});
