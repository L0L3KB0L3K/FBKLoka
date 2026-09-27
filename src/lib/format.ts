// Date and time formatting in Europe/Ljubljana (SPEC.md §10):
// "sob 10. 10.", "17:00", "sobota, 10. oktober 2026", weeks "5.–11. oktober".
// Uses Intl with an explicit time zone, so the result does not depend on the server's zone.
const TIME_ZONE = "Europe/Ljubljana";
const DAY_SHORT = ["ned", "pon", "tor", "sre", "čet", "pet", "sob"];
const DAY_LONG = ["nedelja", "ponedeljek", "torek", "sreda", "četrtek", "petek", "sobota"];
const MONTHS = [
  "januar", "februar", "marec", "april", "maj", "junij",
  "julij", "avgust", "september", "oktober", "november", "december",
];

const pad = (n: number) => String(n).padStart(2, "0");

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

/** Calendar parts of an instant as seen in Ljubljana. weekday: 0 = Sunday … 6 = Saturday. */
export function partsInLjubljana(iso: string) {
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour: get("hour"), minute: get("minute"), weekday };
}

/** "sob 10. 10." */
export function formatDayShort(iso: string): string {
  const p = partsInLjubljana(iso);
  return `${DAY_SHORT[p.weekday]} ${p.day}. ${p.month}.`;
}

/** "17:00" */
export function formatTime(iso: string): string {
  const p = partsInLjubljana(iso);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "sobota, 10. oktober 2026" */
export function formatDateLong(iso: string): string {
  const p = partsInLjubljana(iso);
  return `${DAY_LONG[p.weekday]}, ${p.day}. ${MONTHS[p.month - 1]} ${p.year}`;
}

/** Monday of the Ljubljana week the instant falls in, as "YYYY-MM-DD". */
export function weekStart(iso: string): string {
  const p = partsInLjubljana(iso);
  const daysSinceMonday = (p.weekday + 6) % 7;
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - daysSinceMonday));
  return monday.toISOString().slice(0, 10);
}

/** Week heading from its Monday: "5.–11. oktober" or "28. september – 4. oktober". */
export function formatWeek(monday: string): string {
  const start = new Date(`${monday}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const [d1, m1] = [start.getUTCDate(), start.getUTCMonth()];
  const [d2, m2] = [end.getUTCDate(), end.getUTCMonth()];
  return m1 === m2 ? `${d1}.–${d2}. ${MONTHS[m2]}` : `${d1}. ${MONTHS[m1]} – ${d2}. ${MONTHS[m2]}`;
}
