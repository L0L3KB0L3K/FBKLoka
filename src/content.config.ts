// Content collections (SPEC.md §4). Each collection has a Zod schema:
// a wrong value stops the build with a clear error instead of reaching the live site.
// Step 1 defines only `nastavitve` (header and footer need it). The rest follow in step 2.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Temporary values are the literal "TODO" (SPEC.md §14). Components hide them with isSet().
const todo = z.literal("TODO");

const nastavitve = defineCollection({
  // One YAML file per settings group. Today only site.yaml (entry id "site").
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

export const collections = { nastavitve };
