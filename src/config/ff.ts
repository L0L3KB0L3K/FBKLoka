// FloorballFlash competitions per team slug (SPEC.md §5.2).
// Competition IDs change every season: run `npm run scan:ff` and update this file.
// Team IDs are never hard-coded: the team is found by its exact name in each competition.
export type FfCompetition = {
  competitionId: number | null; // null = not known yet, the team is shown without matches
  label: string; // tab label, e.g. "IFL"
  teamNames: string[]; // exact names in FF, e.g. ["FBK Loka"] or ["FBK Loka A"]
};

export const FF_CONFIG: Record<string, FfCompetition[]> = {
  clani: [
    { competitionId: 738, label: "IFL", teamNames: ["FBK Loka"] }, // 3 Nations - IFL 2026/27
    { competitionId: 760, label: "1. SFL", teamNames: ["FBK Loka"] }, // SLO 1.SFL - DP VF 2026/27, found by scan 25. 9. 2026
  ],
  u17: [
    { competitionId: null, label: "U17 A", teamNames: ["FBK Loka A"] }, // TODO: not in FF yet
    { competitionId: null, label: "U17 B", teamNames: ["FBK Loka B"] }, // TODO: not in FF yet
  ],
  // Other teams: added when the federation enters the 2026/27 youth competitions (run the scan).
};
