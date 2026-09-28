// Structured data objects (schema.org) for the home page, team pages and matches (SPEC.md §13.2).
import type { Match } from "./types.ts";

const CONTEXT = "https://schema.org";

/** "Podlubnik 1c, 4220 Škofja Loka" -> PostalAddress. Returns undefined for anything else. */
function postalAddress(naslov: string) {
  const [street, town] = naslov.split(", ");
  const match = town?.match(/^(\d{4}) (.+)$/);
  if (!street || !match) return undefined;
  return { "@type": "PostalAddress", streetAddress: street, postalCode: match[1], addressLocality: match[2], addressCountry: "SI" };
}

export function organization(site: URL, naslov: string | null, sameAs: string[]) {
  return {
    "@context": CONTEXT,
    "@type": "SportsOrganization",
    name: "FBK Loka",
    sport: "Floorball",
    url: site.href,
    logo: new URL("/og.png", site).href,
    ...(naslov ? { address: postalAddress(naslov) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function sportsTeam(site: URL, url: URL, teamName: string, coachNames: string[]) {
  return {
    "@context": CONTEXT,
    "@type": "SportsTeam",
    name: `FBK Loka – ${teamName}`,
    sport: "Floorball",
    url: url.href,
    parentOrganization: { "@type": "SportsOrganization", name: "FBK Loka", url: site.href },
    ...(coachNames.length ? { coach: coachNames.map((name) => ({ "@type": "Person", name })) } : {}),
  };
}

/** Upcoming matches with a venue (search engines need a location for an event). */
export function sportsEvents(matches: Match[]) {
  return matches
    .filter((match) => match.stanje === "prihodnja" && match.prizorisce)
    .map((match) => {
      const [home, away] = match.doma ? [match.ekipaLoka, match.nasprotnik.ime] : [match.nasprotnik.ime, match.ekipaLoka];
      return {
        "@context": CONTEXT,
        "@type": "SportsEvent",
        name: `${home} – ${away}`,
        sport: "Floorball",
        startDate: match.zacetek,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: match.prizorisce?.ime, address: match.prizorisce?.naslov },
        homeTeam: { "@type": "SportsTeam", name: home },
        awayTeam: { "@type": "SportsTeam", name: away },
        url: match.ffUrl,
      };
    });
}

/** One news post (schema.org NewsArticle). The club is author and publisher; posts have no named author. */
export function newsArticle(site: URL, url: URL, headline: string, datum: Date, imageUrl: URL) {
  const club = { "@type": "SportsOrganization", name: "FBK Loka", url: site.href, logo: new URL("/og.png", site).href };
  return {
    "@context": CONTEXT,
    "@type": "NewsArticle",
    headline,
    datePublished: datum.toISOString().slice(0, 10),
    image: [imageUrl.href],
    url: url.href,
    mainEntityOfPage: url.href,
    author: club,
    publisher: club,
  };
}
