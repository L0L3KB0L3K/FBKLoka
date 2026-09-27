// Player rules (SPEC.md §4.5, §12).

/**
 * The year of birth may be shown only for adults. We know only the year, not the birthday,
 * so a player counts as adult when they turn 18 at the latest on 1 January of this year:
 * born in (this year - 19) or earlier. When in doubt, the year stays hidden.
 */
export function canShowBirthYear(letnik: number | undefined, today: Date): boolean {
  return letnik !== undefined && today.getFullYear() - letnik >= 19;
}

export const POSITION_ORDER = ["vratar", "branilec", "napadalec"] as const;
export const POSITION_TITLES: Record<(typeof POSITION_ORDER)[number], string> = {
  vratar: "Vratarji",
  branilec: "Branilci",
  napadalec: "Napadalci",
};
