// Team page rules (SPEC.md §7.2).
import type { CollectionEntry } from "astro:content";
import { isSet } from "./site.ts";
import type { Training } from "./trainings.ts";

/**
 * True when the team summary has at least one real item. Used by TeamSummary (render or not)
 * and by the team page (two columns only when the summary exists), SPEC.md §1.
 */
export function hasSummary(
  team: CollectionEntry<"selekcije">,
  coaches: CollectionEntry<"trenerji">[],
  trainings: Training[],
  hasCalendar: boolean,
): boolean {
  const { starostniRazpon, kapetan, treningiOpomba } = team.data;
  return (
    isSet(starostniRazpon) ||
    coaches.length > 0 ||
    isSet(kapetan) ||
    trainings.length > 0 ||
    isSet(treningiOpomba) ||
    hasCalendar
  );
}

