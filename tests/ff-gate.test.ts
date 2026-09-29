// Tests for the FloorballFlash schedule gate (SPEC.md §20.2): of the two cron entries per run time, exactly one runs,
// in summer and in winter time. Summer time ends on 25. 10. 2026.
import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldRun } from "../scripts/ff-gate.ts";

const scheduled = (utc: string) => shouldRun(new Date(utc), "schedule");

test("Saturday: 22:37 in Ljubljana runs, the other cron entry skips (summer and winter)", () => {
  // Summer (UTC+2): 20:37 UTC = 22:37, 21:37 UTC = 23:37.
  assert.equal(scheduled("2026-10-03T20:37:00Z"), true);
  assert.equal(scheduled("2026-10-03T21:37:00Z"), false);
  // Winter (UTC+1): 20:37 UTC = 21:37, 21:37 UTC = 22:37.
  assert.equal(scheduled("2026-11-07T20:37:00Z"), false);
  assert.equal(scheduled("2026-11-07T21:37:00Z"), true);
});

test("Sunday: 22:07 in Ljubljana runs, the other cron entry skips (summer and winter)", () => {
  assert.equal(scheduled("2026-10-04T20:07:00Z"), true);
  assert.equal(scheduled("2026-10-04T21:07:00Z"), false);
  assert.equal(scheduled("2026-11-08T20:07:00Z"), false);
  assert.equal(scheduled("2026-11-08T21:07:00Z"), true);
});

test("a late start counts for 45 minutes after the time", () => {
  assert.equal(scheduled("2026-10-03T21:14:00Z"), true); // Saturday 23:14
  assert.equal(scheduled("2026-10-03T21:15:00Z"), false); // Saturday 23:15
  assert.equal(scheduled("2026-10-04T20:44:00Z"), true); // Sunday 22:44
});

test("other days never run on schedule; a manual run always does", () => {
  assert.equal(scheduled("2026-10-05T20:37:00Z"), false); // Monday
  assert.equal(shouldRun(new Date("2026-10-06T09:00:00Z"), "workflow_dispatch"), true); // Tuesday morning
});
