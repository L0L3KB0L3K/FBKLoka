// Schedule gate for .github/workflows/fetch-ff.yml (SPEC.md §20.2). GitHub cron runs in UTC, which has no summer time,
// and GitHub starts scheduled runs late or drops them: on 4., 11. and 18. 10. 2026 the Sunday runs started 2 to 3.5 hours
// late, after the old 45-minute window, so three weekends were never published. The workflow now has several cron
// entries per night, and this gate lets every run through that falls in a Ljubljana window of 8 hours (Sunday 22:00 to
// Monday 06:00). A second run in the same window changes nothing: data and the weekly summary are written only on a
// change. A manual run always goes through.
// Pure functions for tests (tests/ff-gate.test.ts); run as a script it writes "run=true|false" and
// "window=saturday|sunday|manual|" to $GITHUB_OUTPUT.
import { appendFileSync } from "node:fs";

/** Run windows in Ljubljana: weekday 1 = Monday ... 7 = Sunday, start in minutes since midnight. */
export const WINDOWS = [
  { name: "saturday", weekday: 6, from: 22 * 60 + 30 }, // Saturday 22:30: results of the day, if already entered
  { name: "sunday", weekday: 7, from: 22 * 60 }, // Sunday 22:00: the whole weekend
] as const;
/** How long after the start a run still counts: 8 hours, past midnight (GitHub was up to 3.5 hours late). */
export const WINDOW_MINUTES = 8 * 60;

const WEEK_MINUTES = 7 * 24 * 60;
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

/** The window a run belongs to: "manual" for a manual run, the window `date` falls in, or null (skip). */
export function windowAt(date: Date, event: string): "saturday" | "sunday" | "manual" | null {
  if (event === "workflow_dispatch") return "manual";
  const { weekday, minutes } = ljubljanaTime(date);
  const now = (weekday - 1) * 24 * 60 + minutes; // minutes since Monday 00:00
  for (const w of WINDOWS) {
    const start = (w.weekday - 1) * 24 * 60 + w.from;
    // Minutes since the window opened, across midnight and across the end of the week (Sunday night -> Monday).
    if ((now - start + WEEK_MINUTES) % WEEK_MINUTES < WINDOW_MINUTES) return w.name;
  }
  return null;
}

/** True for a manual run, or when `date` falls in one of the Ljubljana windows. */
export function shouldRun(date: Date, event: string): boolean {
  return windowAt(date, event) !== null;
}

/**
 * A scheduled window is done once the bot has published data in it (its last "data:" commit is less than the window
 * length ago): later runs of the same night skip, so a night costs at most one deploy. A manual run is never done.
 */
export function alreadyPublished(window: ReturnType<typeof windowAt>, now: Date, lastDataCommitMs: number): boolean {
  if (window !== "saturday" && window !== "sunday") return false;
  return now.getTime() - lastDataCommitMs < WINDOW_MINUTES * 60_000;
}

// As a script: `node scripts/ff-gate.ts` in the workflow (GITHUB_EVENT_NAME and GITHUB_OUTPUT come from Actions;
// LAST_DATA_COMMIT = unix seconds of the bot's last "data:" commit on main, from git log in the workflow).
if (process.argv[1]?.endsWith("ff-gate.ts")) {
  const now = new Date();
  const window = windowAt(now, process.env.GITHUB_EVENT_NAME ?? "");
  const done = alreadyPublished(window, now, Number(process.env.LAST_DATA_COMMIT || 0) * 1000);
  const run = window !== null && !done;
  const { weekday, minutes } = ljubljanaTime(now);
  const clock = `${WEEKDAYS[weekday - 1]} ${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const verdict = run ? `run (${window})` : done ? "skip (already published in this window)" : "skip";
  console.log(`Ljubljana ${clock}, event ${process.env.GITHUB_EVENT_NAME ?? "local"}: ${verdict}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\nwindow=${run ? window : ""}\n`);
}
