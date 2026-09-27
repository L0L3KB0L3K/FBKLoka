// /koledar/[slug].ics: all matches of one team as a subscribable calendar (src/lib/ics.ts).
// Built only for teams that have matches. The file changes only when the match data changes.
import type { APIRoute, GetStaticPaths } from "astro";
import meta from "../../data/ff/meta.json";
import { loadCollection } from "../../lib/content.ts";
import { toIcs } from "../../lib/ics.ts";
import { allMatches } from "../../lib/match-data.ts";
import { uniqueGames } from "../../lib/matches.ts";

export const getStaticPaths = (async () => {
  const teams = await loadCollection("selekcije");
  return teams
    .filter((team) => allMatches.some((match) => match.selekcija === team.id))
    .map((team) => ({ params: { slug: team.id }, props: { ime: team.data.ime } }));
}) satisfies GetStaticPaths;

export const GET = (({ params, props }) => {
  // A game between our two teams (U17 A vs U17 B) goes into the calendar once.
  const matches = uniqueGames(allMatches.filter((match) => match.selekcija === params.slug));
  const body = toIcs(matches, { name: `FBK Loka – ${props.ime}`, stamp: meta.fetchedAt });
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}) satisfies APIRoute<{ ime: string }>;
