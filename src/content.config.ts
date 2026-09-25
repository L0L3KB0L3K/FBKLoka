// Content collections (SPEC.md §4). Each collection has a Zod schema:
// a wrong value stops the build with a clear error instead of reaching the live site.
//
// Shaped for Decap CMS (phase 2), so no restructuring is needed later:
// - one YAML file per item (Decap "folder" collection), the file name is the id (slug),
// - or one YAML file with a list under a key (Decap "file" collection). Decap cannot edit a root-level list.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import yaml from "js-yaml";

// Temporary values are the literal "TODO" (SPEC.md §14). Components hide them with isSet().
const todo = z.literal("TODO");

const DAYS = ["ponedeljek", "torek", "sreda", "četrtek", "petek", "sobota", "nedelja"] as const;
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Čas vpiši v obliki HH:MM, npr. 17:00.");

/**
 * Link to an entry of a folder collection, checked against its file names.
 * Used instead of Astro's reference(): on Astro 7.3 a broken reference is only logged
 * and the build still succeeds, so a typo like "u16" would reach the live site.
 * The list is read when the config loads; after adding a file in dev, restart the dev server.
 */
function refTo(collection: string) {
  const dir = join(process.cwd(), "src", "content", collection);
  const slugs = readdirSync(dir)
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => name.replace(/.yaml$/, ""));
  const allowed = slugs.length ? slugs.join(", ") : "(zbirka je prazna)";
  return z.string().refine((value) => slugs.includes(value), {
    message: `Ni vnosa s to oznako v zbirki "${collection}". Obstajajo: ${allowed}.`,
  });
}

/**
 * Parser for a YAML file with a list under `key`.
 * Astro's file() loader needs an `id` on every item and silently drops items without one,
 * so each item gets an id here.
 */
function listUnder(key: string, makeId: (item: Record<string, unknown>, index: number) => string) {
  return (text: string) => {
    const data = yaml.load(text) as Record<string, unknown> | null;
    const list = data?.[key];
    if (!Array.isArray(list)) throw new Error(`Pričakujem seznam pod ključem "${key}:".`);
    return list.map((item: Record<string, unknown>, index) => ({ ...item, id: makeId(item, index) }));
  };
}

// §4.1 Teams (selekcije). File name = slug, e.g. src/content/selekcije/u15.yaml -> "u15".
const selekcije = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/selekcije" }),
  schema: z.object({
    ime: z.string().min(1),
    vrstniRed: z.number().int().positive(),
    starostniRazpon: z.string().min(1), // shown to parents, e.g. "18+"
    kapetan: z.string().default(""), // name, empty or "TODO"
    trenerji: z.array(refTo("trenerji")).default([]),
    naslovi: z
      .array(z.object({ leto: z.number().int().min(1990).max(2100), naziv: z.string().min(1) }))
      .default([]),
    kratekOpis: z.string().min(1), // 1–2 sentences
    prikaziSestavo: z.boolean().default(true),
  }),
});

// §4.2 Training slots. One file, list under "termini". Source for /treningi and each team page.
const treningi = defineCollection({
  loader: file("src/content/treningi/treningi.yaml", {
    parser: listUnder("termini", (t) => `${t.selekcija}-${t.dan}-${t.od}`),
  }),
  schema: z
    .object({
      selekcija: refTo("selekcije"),
      dan: z.enum(DAYS),
      od: time,
      do: time,
      dvorana: refTo("dvorane"),
      opomba: z.string().default(""),
    })
    .refine((t) => t.od < t.do, { message: "Konec treninga mora biti za začetkom.", path: ["do"] }),
});

// §4.3 Coaches. File name = slug. Photo sits next to the YAML file.
const trenerji = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/trenerji" }),
  schema: ({ image }) =>
    z.object({
      ime: z.string().min(1),
      vloga: z.string().min(1),
      foto: image().optional(),
      email: z.union([z.literal(""), z.email()]).default(""), // shown only when filled in
    }),
});

// §4.4 Halls. A map link, never an embedded iframe (SPEC.md §12).
const dvorane = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/dvorane" }),
  schema: z.object({
    ime: z.string().min(1),
    naslov: z.string().min(1),
    zemljevid: z.url(),
  }),
});

// §4.5 Players: manual additions to FloorballFlash data (numbers, positions, photos).
// The year of birth is shown only for adults, never for minors (SPEC.md §4.5, §12).
const igralci = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/igralci" }),
  schema: ({ image }) =>
    z.object({
      ime: z.string().min(1), // must match the name in FloorballFlash
      selekcija: refTo("selekcije"),
      stevilka: z.number().int().min(0).max(99),
      pozicija: z.enum(["vratar", "branilec", "napadalec"]),
      foto: image().optional(),
      letnik: z.number().int().min(1950).max(2100).optional(),
      aktiven: z.boolean().default(true), // false = hidden everywhere (consent withdrawn)
    }),
});

// §4.6 News (Markdown). Cover image sits in ./img next to the posts.
const novice = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/novice" }),
  schema: ({ image }) =>
    z.object({
      naslov: z.string().min(1),
      datum: z.coerce.date(),
      povzetek: z.string().min(1),
      naslovnaSlika: image(),
      selekcija: refTo("selekcije").optional(),
      vir: z.enum(["instagram", "facebook", "rocno"]).optional(),
    }),
});

// §4.7 Sponsors. Strip of logos under the footer on every page.
const sponzorji = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/sponzorji" }),
  schema: ({ image }) =>
    z.object({
      ime: z.string().min(1),
      logo: image(), // SVG or PNG
      povezava: z.url().optional(),
      raven: z.enum(["glavni", "zlati", "podporni"]),
    }),
});

// §4.7 History timeline. One file, list under "dogodki".
// An entry whose "opomba" contains TODO is not shown until the club confirms it.
const zgodovina = defineCollection({
  loader: file("src/content/zgodovina/zgodovina.yaml", {
    parser: listUnder("dogodki", (e, index) => `${e.leto}-${index}`),
  }),
  schema: ({ image }) =>
    z.object({
      leto: z.number().int().min(1900).max(2100),
      dogodek: z.string().min(1),
      foto: image().optional(),
      opomba: z.string().optional(),
    }),
});

// §4.7 Documents: a link to an external source OR a local club file in public/dokumenti/.
const dokumenti = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/dokumenti" }),
  schema: z
    .object({
      naslov: z.string().min(1),
      kategorija: z.enum(["pravila", "obrazci", "klubski"]),
      povezava: z.url().optional(),
      datoteka: z.string().regex(/^\/dokumenti\//, "Datoteka mora biti v mapi /dokumenti/.").optional(),
    })
    .refine((d) => Boolean(d.povezava) !== Boolean(d.datoteka), {
      message: "Vpiši povezavo ALI datoteko, ne obojega in ne nobenega.",
    }),
});

// §4.7 Text pages (Markdown): /klub, /kodeks, /zasebnost, /podpri-nas, /o-floorballu.
const strani = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/strani" }),
  schema: z.object({
    naslov: z.string().min(1),
    opis: z.string().min(1), // meta description
  }),
});

// §4.7 Club settings. One file: site.yaml (entry id "site").
const nastavitve = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/nastavitve" }),
  schema: z.object({
    imeKluba: z.string().min(1),
    email: z.union([todo, z.email()]),
    telefon: z.union([todo, z.string().min(6)]),
    naslov: z.union([todo, z.string().min(1)]),
    eos: z.object({
      portal: z.union([todo, z.url()]), // header button "Za starše in člane"
      registracija: z.union([todo, z.url()]), // button "Vpiši se" on /vpis
    }),
    socialna: z.object({
      instagram: z.url().optional(),
      facebook: z.url().optional(),
    }),
  }),
});

export const collections = {
  selekcije,
  treningi,
  trenerji,
  dvorane,
  igralci,
  novice,
  sponzorji,
  zgodovina,
  dokumenti,
  strani,
  nastavitve,
};
