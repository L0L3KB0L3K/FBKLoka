// Pure helpers for the hidden team pages (SPEC.md §19.5). No DOM, so they run in tests/ekipa.test.ts too.
import { formatDayShort, formatTime } from "./format.ts";

export type Mode = "plato" | "prevoz";

export type EkipaMatch = {
  id: number;
  zacetek: string;
  tekmovanje: string;
  nasprotnik: string;
  doma: boolean;
  prizorisce: string;
  plato: string | null;
  prevoz: string[] | null;
};

export type EkipaData = {
  generatedAt: string;
  igralci: string[];
  tekme: EkipaMatch[];
  stevci: { plato: { ime: string; n: number }[]; prevoz: { ime: string; n: number }[] };
  pravila: { odjavaRokUr: number };
  result?: { ok: true } | { ok: false; razlog: string };
  error?: string;
};

/** What the visitor reads for each reason the server gives (SPEC.md §19.5 table, plus "domaca tekma"). */
export const MESSAGES: Record<string, string> = {
  zasedeno: "Nekdo je bil hitrejši. Plato za to tekmo je že zaseden.",
  podvojeno: "Na to tekmo si že prijavljen.",
  "po roku": "Odjava ni več mogoča. Piši skrbniku.",
  "tekma mimo": "Tekma se je že začela.",
  "domaca tekma": "Za domače tekme prevoza ne urejamo.",
};
export const MESSAGE_OTHER = "Nekaj ni v redu. Osveži stran in poskusi znova.";
export const MESSAGE_NOT_SAVED = "Ni shranjeno. Poskusi znova.";
export const MESSAGE_BAD_CODE = "Koda ni pravilna. Preveri jo v ekipni skupini.";

export function messageFor(razlog: string): string {
  return MESSAGES[razlog] ?? MESSAGE_OTHER;
}

/** Plato: every upcoming match. Prevoz: away matches only (club decision, 28. 9. 2026). */
export function matchesFor(mode: Mode, data: EkipaData): EkipaMatch[] {
  return mode === "prevoz" ? data.tekme.filter((match) => !match.doma) : data.tekme;
}

/** "sob 3. 10. ob 15:00" */
export function whenLine(match: EkipaMatch): string {
  return `${formatDayShort(match.zacetek)} ob ${formatTime(match.zacetek)}`;
}

/** "FBK Loka – KAC Floorball" at home, "FBC Dragons – FBK Loka" away. */
export function teamsLine(match: EkipaMatch): string {
  return match.doma ? `FBK Loka – ${match.nasprotnik}` : `${match.nasprotnik} – FBK Loka`;
}

/** A plato can be cancelled until `hours` before the start; 0 = until the start. Drivers always until the start. */
export function canCancel(mode: Mode, match: EkipaMatch, hours: number, now: Date): boolean {
  const left = Date.parse(match.zacetek) - now.getTime();
  if (left <= 0) return false;
  return mode === "prevoz" || hours <= 0 || left >= hours * 3600 * 1000;
}
