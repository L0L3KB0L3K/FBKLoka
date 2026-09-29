// Schedule gate for .github/workflows/fetch-ff.yml (SPEC.md §20.2). GitHub cron runs in UTC, which has no summer time,
// so every run time has two cron entries (one for summer, one for winter). This gate lets through only the entry that
// falls in the Ljubljana window, so each run time fetches once, all year. A manual run always goes through.
// Pure function for tests (tests/ff-gate.test.ts); run as a script it writes "run=true|false" to $GITHUB_OUTPUT.
import { appendFileSync } from "node:fs";

/** Run times in Ljubljana: weekday 1 = Monday ... 7 = Sunday, minutes since midnight. */
export const WINDOWS = [
  { weekday: 6, from: 22 * 60 + 30 }, // Saturday 22:30: results of the day, if already entered
  { weekday: 7, from: 22 * 60 }, // Sunday 22:00: the whole weekend
];
/** GitHub starts scheduled runs late (usually minutes, sometimes more): a run up to 45 min after the time still counts. */
export const WINDOW_MINUTES = 45;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weekday (1 = Monday ... 7 = Sunday) and minutes since midnight in Ljubljana at `date`. */
export function ljubljanaTime(date: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Ljubljana",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: WEEKDAYS.indexOf(get("weekday")) + 1, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** True for a manual run, or when `date` falls in one of the Ljubljana windows. */
export function shouldRun(date: Date, event: string): boolean {
  if (event === "workflow_dispatch") return true;
  const { weekday, minutes } = ljubljanaTime(date);
  return WINDOWS.some((w) => w.weekday === weekday && minutes >= w.from && minutes < w.from + WINDOW_MINUTES);
}

// As a script: `node scripts/ff-gate.ts` in the workflow (GITHUB_EVENT_NAME and GITHUB_OUTPUT come from Actions).
if (process.argv[1]?.endsWith("ff-gate.ts")) {
  const now = new Date();
  const run = shouldRun(now, process.env.GITHUB_EVENT_NAME ?? "");
  const { weekday, minutes } = ljubljanaTime(now);
  const clock = `${WEEKDAYS[weekday - 1]} ${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  console.log(`Ljubljana ${clock}, event ${process.env.GITHUB_EVENT_NAME ?? "local"}: ${run ? "run" : "skip"}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
}
