// "Next match" logic for the home page (SPEC.md §7.1). It runs in the browser, not at build time:
// the site is built only when data changes, so a "today" or a countdown from build time would be wrong.
// Pure functions, tested in tests/upcoming.test.ts.
import { partsInLjubljana } from "./format.ts";

/** A match stays on the board and in lists until 3 hours after its start (SPEC.md §7.1). */
export const SHOW_AFTER_START_MS = 3 * 60 * 60 * 1000;
/** A match that ended keeps a "Odigrano" line under the board for 48 hours after its start (SPEC.md §20.4). */
export const PLAYED_UNTIL_MS = 48 * 60 * 60 * 1000;

export type Pick = {
  /** Per input match: still shown (started less than 3 hours ago, or later). */
  visible: boolean[];
  /** Index of the match for the board, null when none is left. */
  board: number | null;
  /** The board match is on today's date in Ljubljana. */
  today: boolean;
  /** The board match has started and is still within the 3 hours. */
  live: boolean;
  /** Board start minus now in ms; negative once started. 0 when there is no board match. */
  msToStart: number;
};

/** starts: ISO start times of the matches in the HTML, in chronological order. */
export function pick(starts: string[], now: Date): Pick {
  const time = now.getTime();
  const visible = starts.map((start) => Date.parse(start) + SHOW_AFTER_START_MS > time);
  const index = visible.indexOf(true);
  if (index === -1) return { visible, board: null, today: false, live: false, msToStart: 0 };

  const msToStart = Date.parse(starts[index]) - time;
  return { visible, board: index, today: isSameDay(starts[index], now), live: msToStart <= 0, msToStart };
}

/**
 * Index of the latest match that has ended (start + 3 h) and started less than 48 h ago, or null (SPEC.md §20.4).
 * starts: ISO start times in chronological order. The data deploy with the result removes the match from the list.
 */
export function lastPlayed(starts: string[], now: Date): number | null {
  const time = now.getTime();
  let found: number | null = null;
  starts.forEach((start, i) => {
    const t = Date.parse(start);
    if (t + SHOW_AFTER_START_MS <= time && t + PLAYED_UNTIL_MS > time) found = i;
  });
  return found;
}

/** Same calendar day in Ljubljana (not UTC, not the visitor's time zone). */
export function isSameDay(iso: string, now: Date): boolean {
  const a = partsInLjubljana(iso);
  const b = partsInLjubljana(now.toISOString());
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

// Slovenian number forms after "še": 1 dan, 2 dneva, 3 in 4 dni, 5+ dni (and the same for 101, 102 …).
const FORMS = {
  dan: ["dan", "dneva", "dni", "dni"],
  ura: ["uro", "uri", "ure", "ur"],
  minuta: ["minuto", "minuti", "minute", "minut"],
} as const;

function withForm(n: number, word: keyof typeof FORMS): string {
  const rest = n % 100;
  const forms = FORMS[word];
  const form = rest === 1 ? forms[0] : rest === 2 ? forms[1] : rest === 3 || rest === 4 ? forms[2] : forms[3];
  return `${n} ${form}`;
}

/** "še 2 dneva 4 ure", "še 5 ur 10 minut", "še 1 minuto". Empty once the match has started. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalMinutes = Math.ceil(ms / 60_000); // 30 s left still reads "še 1 minuto"
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `še ${withForm(days, "dan")}${hours ? ` ${withForm(hours, "ura")}` : ""}`;
  if (hours > 0) return `še ${withForm(hours, "ura")}${minutes ? ` ${withForm(minutes, "minuta")}` : ""}`;
  return `še ${withForm(minutes, "minuta")}`;
}
