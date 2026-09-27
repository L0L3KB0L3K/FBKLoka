// Training slots with their hall, sorted by day and time (SPEC.md §4.2, §7.4).
import { getCollection } from "astro:content";

const DAY_ORDER = ["ponedeljek", "torek", "sreda", "četrtek", "petek", "sobota", "nedelja"];

/**
 * Placeholder slots (a "TODO" in opomba) are shown in `npm run dev` only and never reach a build,
 * so invented times cannot go live (SPEC.md §1, §14).
 */
export async function getTrainings() {
  const slots = await getCollection("treningi");
  const halls = new Map((await getCollection("dvorane")).map((hall) => [hall.id, hall.data]));
  return slots
    .filter((slot) => import.meta.env.DEV || !slot.data.opomba.includes("TODO"))
    .map((slot) => {
      const dvorana = halls.get(slot.data.dvorana);
      if (!dvorana) throw new Error(`Unknown hall "${slot.data.dvorana}" in treningi.yaml`);
      return { ...slot.data, dvorana };
    })
    .sort((a, b) => DAY_ORDER.indexOf(a.dan) - DAY_ORDER.indexOf(b.dan) || a.od.localeCompare(b.od));
}

export type Training = Awaited<ReturnType<typeof getTrainings>>[number];
