// Which FloorballFlash competitions with an FBK Loka team are not in src/config/ff.ts yet (SPEC.md §5.7). The Sunday run
// checks this (scripts/scan-fbk-loka.ts --check), so a new league, e.g. the youth leagues when they start, is not missed.
// Pure function, tested in tests/ff-scan.test.ts.
import type { FfCompetition } from "../config/ff.ts";

/** A competition of the current season with at least one team whose name starts with "FBK Loka". */
export type LokaCompetition = { id: number; name: string; teams: string[] };

/** The competitions of `found` whose id is in no team's list in the config. */
export function newCompetitions(found: LokaCompetition[], config: Record<string, FfCompetition[]>): LokaCompetition[] {
  const known = new Set(Object.values(config).flatMap((list) => list.map((c) => c.competitionId)));
  return found.filter((competition) => !known.has(competition.id));
}
