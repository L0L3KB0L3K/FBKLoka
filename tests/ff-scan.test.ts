// Tests for the check of new FloorballFlash competitions (SPEC.md §5.7).
import assert from "node:assert/strict";
import { test } from "node:test";
import type { FfCompetition } from "../src/config/ff.ts";
import { newCompetitions } from "../src/lib/ff-scan.ts";

const config: Record<string, FfCompetition[]> = {
  clani: [
    { competitionId: 738, label: "IFL", teamNames: ["FBK Loka"] },
    { competitionId: 760, label: "1. SFL", teamNames: ["FBK Loka"] },
  ],
  u17: [{ competitionId: null, label: "U17 A", teamNames: ["FBK Loka A"] }], // not in FloorballFlash yet
};

test("new: a competition with FBK Loka that no team of the config has", () => {
  const found = [
    { id: 738, name: "3 Nations - IFL 2026/27", teams: ["FBK Loka"] },
    { id: 812, name: "SLO U17 2026/27", teams: ["FBK Loka A", "FBK Loka B"] },
  ];
  assert.deepEqual(
    newCompetitions(found, config).map((c) => c.id),
    [812],
  );
});

test("new: nothing when every found competition is known, or nothing was found", () => {
  assert.deepEqual(newCompetitions([{ id: 760, name: "SLO 1.SFL", teams: ["FBK Loka"] }], config), []);
  assert.deepEqual(newCompetitions([], config), []);
});
