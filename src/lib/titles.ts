// Team titles (SPEC.md §4.1, §7.2). Pure, no Astro imports, so tests can load it in Node.
/**
 * Titles grouped by name, years ascending, groups in the order they first appear:
 * [{ naziv: "Prvaki IFL", leta: [2019, 2020] }]. A list instead of a count, because the club
 * may still add older titles and a bare number would look final.
 */
export function groupTitles(naslovi: { leto: number; naziv: string }[]): { naziv: string; leta: number[] }[] {
  const groups = new Map<string, number[]>();
  for (const { leto, naziv } of naslovi) groups.set(naziv, [...(groups.get(naziv) ?? []), leto]);
  return [...groups].map(([naziv, leta]) => ({ naziv, leta: [...new Set(leta)].sort((a, b) => a - b) }));
}
