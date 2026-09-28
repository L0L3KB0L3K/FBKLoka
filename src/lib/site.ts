// Helpers for club settings (src/content/nastavitve/site.yaml).
import { getEntry } from "astro:content";

/** Returns the club settings. Fails the build if site.yaml is missing. */
export async function getSettings() {
  const entry = await getEntry("nastavitve", "site");
  if (!entry) throw new Error("Missing src/content/nastavitve/site.yaml");
  return entry.data;
}

/**
 * True when a value is real content: not empty and not a "TODO" placeholder.
 * Sections and buttons without real content are not rendered (SPEC.md §1, §14).
 */
export function isSet(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "" && !value.includes("TODO");
}

type Social = Awaited<ReturnType<typeof getSettings>>["socialna"];

/**
 * Social profiles that are set, in display order.
 * One list for the footer, /kontakt and the JSON-LD "sameAs", so a new network is added in one place.
 */
export function socialLinks(socialna: Social): { href: string; label: string }[] {
  return [
    { href: socialna.instagram, label: "Instagram" },
    { href: socialna.facebook, label: "Facebook" },
    { href: socialna.tiktok, label: "TikTok" },
    { href: socialna.youtube, label: "YouTube" },
  ].filter((item): item is { href: string; label: string } => isSet(item.href));
}
