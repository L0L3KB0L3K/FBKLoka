// Main menu (SPEC.md §7). Only pages of phase 1: a page from a later phase is not in the menu.
// "Novice" joins in phase 2. Pages under /ekipa/ are never linked from public pages (SPEC.md §19).
export const MAIN_NAV = [
  { href: "/", label: "Domov" },
  { href: "/klub", label: "Klub" },
  { href: "/ekipe", label: "Ekipe" },
  { href: "/tekme", label: "Tekme" },
  { href: "/treningi", label: "Treningi" },
  { href: "/vpis", label: "Vpis" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

/** "page" for the current page, "section" for a parent section (e.g. /ekipe on /ekipe/clani). */
export function navState(href: string, pathname: string): "page" | "section" | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === href) return "page";
  if (href !== "/" && path.startsWith(`${href}/`)) return "section";
  return null;
}
