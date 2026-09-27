// Grouping of training schedules for /vpis (SPEC.md §7.5). Pure, tested in tests/schedule.test.ts.
import type { Training } from "./trainings.ts";

/**
 * Teams with exactly the same slots (day, time, hall) become one group, so parents read the
 * schedule once: "U9, U11 in U13" instead of three identical tables. Notes are dropped in groups.
 */
export function groupBySchedule(teams: { ime: string; trainings: Training[] }[]) {
  const groups = new Map<string, { names: string[]; trainings: Training[] }>();
  for (const { ime, trainings } of teams) {
    if (trainings.length === 0) continue;
    const key = trainings.map((t) => `${t.dan} ${t.od} ${t.do} ${t.dvorana.ime}`).join("|");
    const group = groups.get(key);
    if (group) group.names.push(ime);
    else groups.set(key, { names: [ime], trainings: trainings.map((t) => ({ ...t, opomba: "" })) });
  }
  return [...groups.values()];
}

/** Slovenian list: "U9", "U9 in U11", "U9, U11 in U13". */
export function joinSl(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} in ${items.at(-1)}`;
}
