import { cleanPath } from "../lib/paths.ts";

// Main menu (SPEC.md §7). Only pages that are built: a page of a later phase joins when it exists.
// Novice are built ahead of phase 2 (the owner may decide so, SPEC.md §15).
// Pages under /ekipa/ are never linked from public pages (SPEC.md §19).
export const MAIN_NAV = [
  { href: "/", label: "Domov" },
  { href: "/klub/", label: "Klub" },
  { href: "/ekipe/", label: "Ekipe" },
  { href: "/tekme/", label: "Tekme" },
  { href: "/treningi/", label: "Treningi" },
  { href: "/vpis/", label: "Vpis" },
  { href: "/novice/", label: "Novice" },
  { href: "/kontakt/", label: "Kontakt" },
] as const;

/** "page" for the current page, "section" for a parent section (e.g. /ekipe on /ekipe/clani). */
export function navState(href: string, pathname: string): "page" | "section" | null {
  const path = cleanPath(pathname);
  const target = cleanPath(href);
  if (path === target) return "page";
  if (target !== "/" && path.startsWith(`${target}/`)) return "section";
  return null;
}
