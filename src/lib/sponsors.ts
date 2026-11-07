import { loadCollection } from "./content.ts";

// Sponsors in display order, shared by the strip under the footer and the list on /podpri-nas.
// Order: by level when the club sets one (it has none now), then by vrstniRed, then by name.
const LEVEL_ORDER = { glavni: 0, zlati: 1, podporni: 2 } as const;
// Missing level or order goes last, so a new sponsor without them never jumps ahead.
const level = (raven?: keyof typeof LEVEL_ORDER) => (raven ? LEVEL_ORDER[raven] : 3);
const order = (vrstniRed?: number) => vrstniRed ?? Number.MAX_SAFE_INTEGER;

export async function loadSponsors() {
  return (await loadCollection("sponzorji")).sort(
    (a, b) =>
      level(a.data.raven) - level(b.data.raven) ||
      order(a.data.vrstniRed) - order(b.data.vrstniRed) ||
      a.data.ime.localeCompare(b.data.ime, "sl"),
  );
}
