// The notice strip above the header on every page (13. 11. 2026): one yellow line with one link, until its last day.
// The site is static, so it disappears at the first build after that day (the Sunday run), not at midnight.
export type Announcement = { text: string; href: string; until: string };

// 1 % of income tax for the club (news of 19. 11. 2026). The form on olympic.si asks for a tax number and a signature,
// so the strip leads to the news first, where it is explained that the donation costs nothing.
export const ANNOUNCEMENT: Announcement = {
  text: "Namenite 1 % dohodnine klubu: odprite navodila",
  href: "/novice/2026-11-19-dohodnina/",
  until: "2026-12-31",
};

/** The notice on or before its last day (UTC date), otherwise null. */
export function activeAnnouncement(now: Date, notice: Announcement = ANNOUNCEMENT): Announcement | null {
  return now.toISOString().slice(0, 10) <= notice.until ? notice : null;
}
