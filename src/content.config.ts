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
 * An optional field that Decap edits (SPEC.md §13.4). Decap writes a field the editor left empty as "" (or null), not as
 * a missing key; both mean "not set" here, so an empty optional field does not stop the build.
 */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());
}

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
    .map((name) => name.replace(/\.yaml$/, ""));
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
    kratekOpis: z.string().min(1), // 1–2 sentences
    prikaziSestavo: z.boolean().default(true),
    treningiOpomba: z.string().optional(), // e.g. "Trenira skupaj s člani ali z U17." Shown with the training times.
    // Trains with this team (e.g. U19 with "clani"): no own card on /treningi, the host card is "Člani in U19".
    treniraZ: refTo("selekcije").optional(),
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
      foto: optional(image()),
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
      foto: optional(image()),
      letnik: optional(z.number().int().min(1950).max(2100)),
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
      // Alt text of the cover (SPEC.md §13.3). Required: a cover always shows something, and a poster carries text.
      slikaAlt: z.string().min(1),
      selekcija: optional(refTo("selekcije")),
      // "samodejno": the weekly summary from the fixed template (SPEC.md §20.5, scripts/week-publish.ts).
      vir: optional(z.enum(["instagram", "facebook", "rocno", "samodejno"])),
      // Draft (SPEC.md §13.4): Decap saves go live on Sunday, so an unfinished post stays off the site until unticked.
      osnutek: z.boolean().default(false),
    }),
});

// §4.7 Sponsors. Strip of logos under the footer on every page.
const sponzorji = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/sponzorji" }),
  schema: ({ image }) =>
    z.object({
      ime: z.string().min(1),
      logo: image(), // SVG or PNG
      povezava: optional(z.url()),
      // The club has no sponsor levels (28. 9. 2026). Kept optional, as in SPEC.md §4.7, in case it adds them.
      raven: z.enum(["glavni", "zlati", "podporni"]).optional(),
      vrstniRed: optional(z.number().int().positive()), // order in the strip; sponsors without it follow by name
    }),
});

// §4.7 History timeline. One file, list under "dogodki".
// An entry whose "opomba" contains TODO is not shown until the club confirms it.
const zgodovina = defineCollection({
  loader: file("src/content/zgodovina/zgodovina.yaml", {
    parser: listUnder("dogodki", (e, index) => `${e.leto}-${index}`),
  }),
  schema: ({ image }) =>
    z
      .object({
        leto: z.number().int().min(1900).max(2100),
        dogodek: z.string().min(1),
        foto: image().optional(),
        opomba: z.string().optional(),
        // The /klub timeline shows foundings, name changes and titles; plain events wait for /zgodovina (phase 3).
        vrsta: z.enum(["dogodek", "ustanovitev", "ime", "naslovi"]).default("dogodek"),
        klub: z.string().min(1).optional(), // club name from a founding or a name change on, e.g. "FBK Loka"
        sezona: z.string().regex(/^\d{4}\/\d{2}$/).optional(), // titles: "2024/25", leto is its second year
      })
      .refine((entry) => (entry.vrsta !== "ustanovitev" && entry.vrsta !== "ime") || entry.klub, {
        message: "ustanovitev and ime need klub (the club name)",
      })
      .refine((entry) => entry.vrsta !== "naslovi" || entry.sezona, { message: "naslovi need sezona, e.g. 2024/25" }),
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

// §4.7 Text pages (Markdown): /klub, /vpis, /kodeks, /zasebnost, /podpri-nas, /o-floorballu.
const strani = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/strani" }),
  schema: ({ image }) =>
    z.object({
      naslov: z.string().min(1),
      opis: z.string().min(1), // meta description
      // Frequently asked questions, shown as <details> (SPEC.md §7.5). An answer with TODO is hidden.
      vprasanja: z.array(z.object({ vprasanje: z.string().min(1), odgovor: z.string().min(1) })).default([]),
      // Photo under the page title, e.g. the senior team on /klub (SPEC.md §9.1a). 3:2, from src/assets/foto/.
      foto: z.object({ src: image(), alt: z.string().min(1) }).optional(),
    }),
});

// §4.7 Club settings. One file: site.yaml (entry id "site").
const nastavitve = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/nastavitve" }),
  schema: ({ image }) =>
    z.object({
      imeKluba: z.string().min(1),
      email: z.union([todo, z.email()]),
      telefon: z.union([todo, z.string().min(6)]),
      naslov: z.union([todo, z.string().min(1)]),
      // Shown in the footer and on /kontakt. Quote them in YAML, otherwise they are read as numbers.
      davcna: z.union([todo, z.string().regex(/^[0-9]{8}$/, "Davčna številka ima 8 številk.")]),
      maticna: z.union([todo, z.string().regex(/^[0-9]{10}$/, "Matična številka ima 10 številk.")]),
      eos: z.object({
        portal: z.union([todo, z.url()]), // header button "Za starše in člane"
        registracija: z.union([todo, z.url()]), // button "Vpiši se" on /vpis
      }),
      socialna: z.object({
        instagram: z.url().optional(),
        facebook: z.url().optional(),
        tiktok: z.url().optional(),
        youtube: z.url().optional(),
      }),
      // Photos behind the match board on the home page, shown one after another (owner, 28. 9. 2026).
      // 3:2, at least 2000 px wide, from src/assets/foto/. None = the plain black board.
      naslovnaFotografije: z.array(image()).max(5).default([]),
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
