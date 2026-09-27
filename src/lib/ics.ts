// Team match calendar in iCalendar format (RFC 5545), served as /koledar/[slug].ics.
// Parents subscribe once ("Dodaj v koledar") and their calendar app refreshes it on its own.
// Pure function, tested in tests/ics.test.ts. Times are written in UTC, so no time zone block is needed.
import { scoreHomeAway } from "./matches.ts";
import type { Match } from "./types.ts";

const BACKSLASH = String.fromCharCode(92);

/** A floorball game with breaks takes about two hours. */
const MATCH_MS = 2 * 60 * 60 * 1000;

/** "2026-10-10T17:00:00+02:00" -> "20261010T150000Z" */
function utc(isoOrMs: string | number): string {
  return new Date(isoOrMs).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Text values: backslash, semicolon, comma and line breaks must be escaped (RFC 5545 §3.3.11). */
function escapeText(text: string): string {
  return text
    .split(BACKSLASH)
    .join(BACKSLASH + BACKSLASH)
    .replace(/[;,]/g, (char) => BACKSLASH + char)
    .replace(/\r?\n/g, BACKSLASH + "n");
}

/** Lines longer than 75 bytes are folded: CRLF + space (RFC 5545 §3.1). Never splits a character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export type CalendarOptions = {
  /** Calendar name shown in the app, e.g. "FBK Loka – Člani". */
  name: string;
  /** When the data was fetched (DTSTAMP). Same input gives the same file. */
  stamp: string;
};

export function toIcs(matches: Match[], { name, stamp }: CalendarOptions): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FBK Loka//Tekme//SL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Europe/Ljubljana",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  for (const match of matches) {
    const [home, away] = match.doma ? [match.ekipaLoka, match.nasprotnik.ime] : [match.nasprotnik.ime, match.ekipaLoka];
    const score = match.rezultat ? ` ${scoreHomeAway(match)}` : "";
    const venue = match.prizorisce ? [match.prizorisce.ime, match.prizorisce.naslov].filter(Boolean).join(", ") : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:game-${match.id}@fbkloka.si`,
      `DTSTAMP:${utc(stamp)}`,
      `DTSTART:${utc(match.zacetek)}`,
      `DTEND:${utc(Date.parse(match.zacetek) + MATCH_MS)}`,
      `SUMMARY:${escapeText(`${home} – ${away}${score} (${match.tekmovanje})`)}`,
      ...(venue ? [`LOCATION:${escapeText(venue)}`] : []),
      `DESCRIPTION:${escapeText(`Podrobnosti: ${match.ffUrl}`)}`,
      `URL:${match.ffUrl}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
