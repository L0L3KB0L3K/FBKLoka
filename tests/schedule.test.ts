// Tests for grouping training schedules on /vpis.
import assert from "node:assert/strict";
import { test } from "node:test";
import { groupBySchedule, joinSl } from "../src/lib/schedule.ts";
import type { Training } from "../src/lib/trainings.ts";

const hall = { ime: "Dvorana Poden", naslov: "", zemljevid: "https://example.com/" };
const slot = (dan: Training["dan"], opomba = ""): Training => ({ selekcija: "x", dan, od: "15:45", do: "17:15", dvorana: hall, opomba });

test("teams with the same slots are grouped; notes are dropped in a group", () => {
  const groups = groupBySchedule([
    { ime: "U9", trainings: [slot("sreda", "Skupaj z U11")] },
    { ime: "U11", trainings: [slot("sreda", "Skupaj z U9")] },
    { ime: "U13", trainings: [slot("petek")] },
    { ime: "U19", trainings: [] },
  ]);
  assert.deepEqual(groups.map((g) => g.names), [["U9", "U11"], ["U13"]]);
  assert.equal(groups[0].trainings[0].opomba, "");
});

test("Slovenian lists", () => {
  assert.equal(joinSl(["U9"]), "U9");
  assert.equal(joinSl(["U9", "U11"]), "U9 in U11");
  assert.equal(joinSl(["U9", "U11", "U13"]), "U9, U11 in U13");
});
