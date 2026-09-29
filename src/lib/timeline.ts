// Club timeline on /klub (SPEC.md §7.6): foundings, name changes and titles by season, oldest first.
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
 * Entries for the /klub timeline: no plain events (they wait for /zgodovina) and nothing the club has not
 * confirmed (an opomba with TODO). Sorted by year; in the same year a season's titles come before a founding or
 * a name change, because a season ends in spring and a club is founded or renamed before the next one.
 */
export function clubTimeline<T extends TimelineEntry>(entries: T[]): T[] {
  const titlesFirst = (entry: T) => (entry.vrsta === "naslovi" ? 0 : 1);
  return entries
    .filter((entry) => entry.vrsta !== "dogodek" && !entry.opomba?.includes("TODO"))
    .sort((a, b) => a.leto - b.leto || titlesFirst(a) - titlesFirst(b));
}
