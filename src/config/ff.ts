// FloorballFlash competitions per team slug (SPEC.md §5.2).
// Competition IDs change every season: run `npm run scan:ff` and update this file.
// The team is found by its exact name in each competition; teamId is only for the link to the team's games.
export type FfCompetition = {
  competitionId: number | null; // null = not known yet, the team is shown without matches
  label: string; // tab label, e.g. "IFL"
  teamNames: string[]; // exact names in FF, e.g. ["FBK Loka"] or ["FBK Loka A"]
  site: FfSite; // web address of FloorballFlash: "at" for IFL, "si" for the Slovenian federation (from 23. 10. 2026)
  teamId: number | null; // our team in the competition, for /competition/<id>/games?team=<teamId>
};

/** FloorballFlash on the web: the Austrian site for IFL, the Slovenian one for the competitions of the Slovenian federation. */
export const FF_WEB = { at: "https://www.floorballflash.at", si: "https://floorballflash.si" } as const;
export type FfSite = keyof typeof FF_WEB;

/** Web address of a competition (standings, games), on its own site. Unknown competition: the Austrian site. */
export function ffCompetitionWeb(competitionId: number): string {
  const entry = Object.values(FF_CONFIG).flat().find((c) => c.competitionId === competitionId);
  return `${FF_WEB[entry?.site ?? "at"]}/competition/${competitionId}`;
}

export const FF_CONFIG: Record<string, FfCompetition[]> = {
  clani: [
    { competitionId: 738, label: "IFL", teamNames: ["FBK Loka"], site: "at", teamId: 3462 }, // 3 Nations - IFL 2026/27
    { competitionId: 760, label: "1. SFL", teamNames: ["FBK Loka"], site: "si", teamId: 3597 }, // SLO 1.SFL - DP VF 2026/27
  ],
  // Švigalice play the mixed 2. SFL as "Švigalice Loka" (Maj, 23. 10. 2026; the check missed it: it looked for "FBK Loka").
  svigalice: [
    { competitionId: 761, label: "2. SFL", teamNames: ["Švigalice Loka"], site: "si", teamId: 3604 }, // SLO 2.SFL - DP MF
  ],
  // Youth: SLO state championships 2026/27, found by the weekly check (scripts/scan-fbk-loka.ts --check) on 1. 10. 2026,
  // teams entered, no games yet. Matches appear by themselves once the federation publishes them. U9: none yet.
  u19: [{ competitionId: 762, label: "DP U19", teamNames: ["FBK Loka"], site: "si", teamId: 3607 }], // SLO DP U19
  u17: [
    { competitionId: 763, label: "DP U17 A", teamNames: ["FBK Loka A"], site: "si", teamId: 3611 }, // SLO DP U17
    { competitionId: 763, label: "DP U17 B", teamNames: ["FBK Loka B"], site: "si", teamId: 3612 }, // SLO DP U17, same competition
  ],
  u15: [{ competitionId: 764, label: "DP U15", teamNames: ["FBK Loka"], site: "si", teamId: 3614 }], // SLO DP U15
  u13: [{ competitionId: 765, label: "DP U13", teamNames: ["FBK Loka"], site: "si", teamId: 3620 }], // SLO DP U13
  u11: [{ competitionId: 766, label: "DP U11", teamNames: ["FBK Loka"], site: "si", teamId: 3626 }], // SLO DP U11
};
