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
  // Youth: SLO state championships 2026/27, found by the weekly check (scripts/scan-fbk-loka.ts --check) on 1. 10. 2026,
  // teams entered, no games yet. Matches appear by themselves once the federation publishes them. U9: none yet.
  u19: [{ competitionId: 762, label: "DP U19", teamNames: ["FBK Loka"] }], // SLO DP U19
  u17: [
    { competitionId: 763, label: "DP U17 A", teamNames: ["FBK Loka A"] }, // SLO DP U17
    { competitionId: 763, label: "DP U17 B", teamNames: ["FBK Loka B"] }, // SLO DP U17, same competition
  ],
  u15: [{ competitionId: 764, label: "DP U15", teamNames: ["FBK Loka"] }], // SLO DP U15
  u13: [{ competitionId: 765, label: "DP U13", teamNames: ["FBK Loka"] }], // SLO DP U13
  u11: [{ competitionId: 766, label: "DP U11", teamNames: ["FBK Loka"] }], // SLO DP U11
};
