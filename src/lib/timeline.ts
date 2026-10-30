// Club timeline on /klub (SPEC.md §7.6) and /zgodovina (§7.8): foundings, name changes, titles and events, oldest first.
// Pure, no Astro imports, so tests can load it in Node.

export type TimelineEntry = {
  leto: number;
  dogodek: string;
  opomba?: string;
  vrsta: "dogodek" | "ustanovitev" | "ime" | "naslovi";
  klub?: string;
  sezona?: string;
};

/**
 * Entries for /zgodovina: everything the club has confirmed (no opomba with TODO). Sorted by year; in the same year
 * a season's titles come before a founding, a name change or an event, because a season ends in spring and a club
 * is founded or renamed before the next one. Otherwise the order of the file.
 */
export function historyTimeline<T extends TimelineEntry>(entries: T[]): T[] {
  const titlesFirst = (entry: T) => (entry.vrsta === "naslovi" ? 0 : 1);
  return entries
    .filter((entry) => !entry.opomba?.includes("TODO"))
    .sort((a, b) => a.leto - b.leto || titlesFirst(a) - titlesFirst(b));
}

/** Entries for the /klub timeline: as on /zgodovina, without plain events. */
export function clubTimeline<T extends TimelineEntry>(entries: T[]): T[] {
  return historyTimeline(entries).filter((entry) => entry.vrsta !== "dogodek");
}
