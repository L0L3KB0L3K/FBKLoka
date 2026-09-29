// MVP vikenda (SPEC.md §20.3): the Limited-Box-Score Floorball MVP Index, version 1.0 ("Academic MVP Formula for
// Floorball", club decision 29. 9. 2026). The weights are editorial, not fitted to data: change them here and raise the
// version, so older awards stay reproducible. The senior competitions come from src/config/ff.ts (clani), so the cup and
// the playoffs count as soon as they are there, and nothing in this file changes with the season.
export const MVP_VERSION = "LBS-MVPI 1.0";

/** Skater, per match: a goal is the unit, an assist 0.7, a penalty minute -0.05. FloorballFlash has no shots per player. */
export const SKATER = { goal: 1, assist: 0.7, penaltyMinute: -0.05 } as const;

/** Goalie, per match: goals prevented against an average goalie of the same competition, plus a small shutout bonus. */
export const GOALIE = { shutout: 0.25, shutoutMinShots: 8 } as const;

/** Average save rate while a competition has fewer than BASELINE_MIN_SHOTS shots on goal of its own this season. */
export const BASELINE_SAVE_PCT = 0.8;
export const BASELINE_MIN_SHOTS = 100;

/** "Skupaj v sezoni" on the card counts only this competition (its label in src/config/ff.ts), club decision 29. 9. 2026. */
export const SEASON_LABEL = "IFL";

/** Weekend scores this close are a tie: more goals, then fewer penalty minutes, then more matches with a positive score. */
export const TIE_MARGIN = 0.1;

/**
 * FloorballFlash person ids that are never shown as MVP (consent withdrawn). Players marked incognito in FloorballFlash
 * are not in the roster at all, so they never need to be listed here.
 */
export const MVP_EXCLUDED: readonly number[] = [];
