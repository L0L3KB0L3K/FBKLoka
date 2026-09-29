// Weekly summary (SPEC.md §20.5): the facts of one week as a small JSON (tmp/week.json), a text from a fixed template,
// and a strict check of any written text against those facts. The summary is published without review, so a text that
// fails the check is replaced by the template. Pure functions, tested in tests/week.test.ts.
import { partsInLjubljana } from "./format.ts";
import { statsText, type Mvp, type MvpStats } from "./mvp.ts";
import type { Match } from "./types.ts";

export type WeekMatch = {
  id: number;
  ekipa: string; // team name, e.g. "Člani", "U17"
  tekmovanje: string; // e.g. "IFL", "1. SFL"
  zacetek: string;
  dan: string; // "sobota", "nedelja" …
  doma: boolean;
  nasprotnik: string;
  goliLoka: number;
  goliNasprotnik: number;
  izid: "zmaga" | "poraz" | "remi";
};

export type Week = {
  teden: { od: string; do: string }; // Monday and Sunday, YYYY-MM-DD
  tekme: WeekMatch[];
  mvp: { ime: string; vratar: boolean; tekme: ({ nasprotnik: string } & MvpStats)[]; skupaj: MvpStats } | null;
};

const DAYS = ["nedelja", "ponedeljek", "torek", "sreda", "četrtek", "petek", "sobota"];
const DAYS_ACCUSATIVE = ["nedeljo", "ponedeljek", "torek", "sredo", "četrtek", "petek", "soboto"];
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const localDay = (iso: string) => {
  const p = partsInLjubljana(iso);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

/** Monday and Sunday of the week that contains `now`, in Ljubljana. */
export function weekBounds(now: Date): { od: string; do: string } {
  const p = partsInLjubljana(now.toISOString());
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - ((p.weekday + 6) % 7)));
  return { od: isoDay(monday), do: isoDay(new Date(monday.getTime() + 6 * 86_400_000)) };
}

/** Finished matches of all our teams in the week, and the MVP when its weekend is in the week. */
export function buildWeek(matches: Match[], teamNames: Record<string, string>, mvp: Mvp | null, teden: { od: string; do: string }): Week {
  const tekme = matches
    .filter((m) => m.stanje === "koncana" && m.rezultat && localDay(m.zacetek) >= teden.od && localDay(m.zacetek) <= teden.do)
    .sort((a, b) => Date.parse(a.zacetek) - Date.parse(b.zacetek))
    .map((m): WeekMatch => {
      const loka = m.rezultat!.loka;
      const them = m.rezultat!.nasprotnik;
      return {
        id: m.id,
        ekipa: teamNames[m.selekcija] ?? m.selekcija,
        tekmovanje: m.tekmovanje,
        zacetek: m.zacetek,
        dan: DAYS[partsInLjubljana(m.zacetek).weekday]!,
        doma: m.doma,
        nasprotnik: m.nasprotnik.ime,
        goliLoka: loka,
        goliNasprotnik: them,
        izid: loka > them ? "zmaga" : loka < them ? "poraz" : "remi",
      };
    });
  const inWeek = mvp && mvp.vikend.do >= teden.od && mvp.vikend.do <= teden.do;
  const skupaj = (list: MvpStats[]): MvpStats => ({
    goli: list.reduce((n, s) => n + s.goli, 0),
    podaje: list.reduce((n, s) => n + s.podaje, 0),
    obrambe: list.reduce((n, s) => n + s.obrambe, 0),
    streli: list.reduce((n, s) => n + s.streli, 0),
  });
  return {
    teden,
    tekme,
    mvp: inWeek
      ? {
          ime: mvp.ime,
          vratar: mvp.vratar,
          tekme: mvp.tekme.map(({ nasprotnik, goli, podaje, obrambe, streli }) => ({ nasprotnik, goli, podaje, obrambe, streli })),
          skupaj: skupaj(mvp.tekme),
        }
      : null,
  };
}

/** "z" or "s" before a score, by the first sound of the first number read aloud (s 7:8 = "s sedem", z 12:6 = "z dvanajst"). */
export function prepositionFor(n: number): "z" | "s" {
  const voiceless = [3, 4, 5, 6, 7, 13, 14, 15, 16, 17];
  if (n < 20) return voiceless.includes(n) ? "s" : "z";
  if (n < 30) return "z"; // dvajset …
  return "s"; // trideset …
}

/** Subject and verb endings: "Člani so premagali", "Švigalice so premagale", "Ekipa U17 je premagala". */
function grammar(ekipa: string) {
  if (ekipa === "Člani") return { subject: "Člani", aux: "so", ending: "i" };
  if (ekipa === "Švigalice") return { subject: "Švigalice", aux: "so", ending: "e" };
  return { subject: `Ekipa ${ekipa}`, aux: "je", ending: "a" };
}

/** The fixed-template text: one sentence per match, grouped by team, and the MVP. No AI, so no invented facts. */
export function templateSummary(week: Week): string {
  const paragraphs: string[] = [];
  const teams = [...new Set(week.tekme.map((m) => m.ekipa))];
  for (const team of teams) {
    const g = grammar(team);
    const sentences = week.tekme
      .filter((m) => m.ekipa === team)
      .map((m, i) => {
        const day = DAYS_ACCUSATIVE[partsInLjubljana(m.zacetek).weekday]!;
        const where = m.doma ? "doma" : "v gosteh";
        const verb =
          m.izid === "zmaga"
            ? `premagal${g.ending} ekipo ${m.nasprotnik}`
            : m.izid === "poraz"
              ? `izgubil${g.ending} proti ekipi ${m.nasprotnik}`
              : `igral${g.ending} neodločeno z ekipo ${m.nasprotnik}`;
        const score = `${prepositionFor(m.goliLoka)} ${m.goliLoka}:${m.goliNasprotnik}`;
        const opening = i === 0 ? `${g.subject} ${g.aux} v ${day}` : `V ${day} ${g.aux}`;
        return `${opening} v ${m.tekmovanje} ${where} ${verb} ${score}.`;
      });
    paragraphs.push(sentences.join(" "));
  }
  if (week.mvp) paragraphs.push(`MVP vikenda je ${week.mvp.ime} (${statsText(week.mvp.skupaj, week.mvp.vratar)}).`);
  return paragraphs.join("\n\n");
}

/** Words that describe or predict: the summary only states facts (SPEC.md §20.5). Stems, lowercase. */
const OPINION = ["odlič", "izjemn", "fantast", "neverjet", "sijaj", "briljant", "junak", "junaš", "dramatič", "razburljiv", "vrhunsk", "čudovit", "bleste", "blestel", "napoved", "pričakuj", "upamo", "zasluž"];

/**
 * Problems of a written summary against the week's facts; empty = OK. A score must be one of the week's results (either
 * way round), and a sentence with a score must say the right outcome (premagali / izgubili / neodločeno); every other
 * number must be a number of the data (scores, stats, dates, digits in names), every capitalised word that does not
 * start a sentence must be a word of a name in the data, and there must be no opinion words. A heuristic: it catches
 * invented facts and a wrong outcome, not every wrong reading, so the rules of the skill still matter.
 */
export function verifySummary(text: string, week: Week): string[] {
  const problems: string[] = [];
  const scores = new Set(week.tekme.flatMap((m) => [`${m.goliLoka}:${m.goliNasprotnik}`, `${m.goliNasprotnik}:${m.goliLoka}`]));
  for (const found of text.match(/\d+\s*:\s*\d+/g) ?? []) {
    if (!scores.has(found.replace(/\s/g, ""))) problems.push(`rezultat ${found} ni v podatkih`);
  }

  // The outcome word next to a score must match that match: "premagali ekipo X s 7:8" after a 7:8 loss fails.
  const OUTCOME = { zmaga: /premagal|zmag/i, poraz: /izgubil|poraz/i, remi: /neodločen|remi/i } as const;
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    for (const found of sentence.match(/\d+\s*:\s*\d+/g) ?? []) {
      const score = found.replace(/\s/g, "");
      const match = week.tekme.find((m) => score === `${m.goliLoka}:${m.goliNasprotnik}` || score === `${m.goliNasprotnik}:${m.goliLoka}`);
      if (!match) continue;
      const wrong = (Object.keys(OUTCOME) as (keyof typeof OUTCOME)[]).filter((izid) => izid !== match.izid && OUTCOME[izid].test(sentence));
      if (wrong.length > 0 && !OUTCOME[match.izid].test(sentence)) problems.push(`izid ob ${found} ni ${wrong.join("/")}`);
    }
  }

  const names = [
    ...week.tekme.flatMap((m) => [m.ekipa, m.tekmovanje, m.nasprotnik]),
    ...(week.mvp ? [week.mvp.ime, ...week.mvp.tekme.map((t) => t.nasprotnik)] : []),
    "FBK Loka",
    "MVP",
  ];
  const numbers = new Set<number>();
  const addDate = (iso: string) => {
    const p = partsInLjubljana(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    [p.day, p.month, p.year].forEach((n) => numbers.add(n));
  };
  addDate(week.teden.od);
  addDate(week.teden.do);
  for (const m of week.tekme) {
    numbers.add(m.goliLoka).add(m.goliNasprotnik);
    addDate(m.zacetek);
  }
  if (week.mvp) {
    for (const s of [...week.mvp.tekme, week.mvp.skupaj]) {
      numbers.add(s.goli).add(s.podaje).add(s.obrambe).add(s.streli);
      if (s.streli > 0) numbers.add(Math.round((s.obrambe / s.streli) * 100));
    }
  }
  for (const name of names) for (const digits of name.match(/\d+/g) ?? []) numbers.add(Number(digits));
  for (const found of text.replace(/\d+\s*:\s*\d+/g, " ").match(/\d+/g) ?? []) {
    if (!numbers.has(Number(found))) problems.push(`število ${found} ni v podatkih`);
  }

  const vocabulary = new Set(names.flatMap((name) => name.split(/\s+/)));
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const words = sentence.split(/\s+/).map((w) => w.replace(/^[„“"(]+|[.,;:!?)“"]+$/g, "")).filter(Boolean);
    for (const word of words.slice(1)) {
      if (/^\p{Lu}/u.test(word) && !vocabulary.has(word)) problems.push(`ime ${word} ni v podatkih`);
    }
  }

  const lower = text.toLowerCase();
  for (const stem of OPINION) if (lower.includes(stem)) problems.push(`mnenje ali napoved: "${stem}…"`);
  return problems;
}
