// Player rules (SPEC.md §4.5, §12).
import type { Position, RosterPlayer } from "./types.ts";

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

/** One line of a roster as the team page shows it. */
export type RosterEntry = { ime: string; stevilka: number | null; pozicija: Position | null; letnik?: number };

/** What teamRoster() needs from an entry of src/content/igralci. */
export type ManualPlayer = RosterEntry & { selekcija: string; aktiven: boolean };

const key = (name: string) => name.trim().toLocaleLowerCase("sl");

/**
 * Roster of one team (SPEC.md §4.5): the FloorballFlash competition roster, completed by src/content/igralci.
 * - an entry there with the same name replaces the FloorballFlash line (number, position, year of birth),
 * - with aktiven: false the player is left out (e.g. consent withdrawn), also when FloorballFlash lists them,
 * - an entry without a FloorballFlash match is added (teams without FloorballFlash data).
 */
export function teamRoster(ff: RosterPlayer[], manual: ManualPlayer[], selekcija: string): RosterEntry[] {
  const own = manual.filter((player) => player.selekcija === selekcija);
  const byName = new Map(own.map((player) => [key(player.ime), player]));
  const fromFf = ff
    .filter((player) => player.selekcija === selekcija)
    .map((player): RosterEntry => byName.get(key(player.ime)) ?? player);
  const ffNames = new Set(fromFf.map((player) => key(player.ime)));
  const added = own.filter((player) => !ffNames.has(key(player.ime)));
  return [...fromFf, ...added]
    .filter((player) => !("aktiven" in player) || player.aktiven)
    .map(({ ime, stevilka, pozicija, letnik }) => ({ ime, stevilka, pozicija, letnik }));
}
