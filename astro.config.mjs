// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Final production URL. Needed for canonical URLs and the sitemap (SPEC.md §13.2).
  site: "https://fbkloka.si",

  // Static output only, no SSR (SPEC.md §2). "static" is Astro's default, stated here for clarity.
  output: "static",

  // Sitemap. The /ekipa/ exclusion is added in step 7 together with robots.txt (SPEC.md §13.2).
  integrations: [sitemap()],

  vite: {
    // Tailwind 4 through the official Vite plugin (SPEC.md §2).
    // Added by hand: `astro add` fails in this folder because of the "Š" in the path.
    plugins: [tailwindcss()],
    build: {
      // Astro inlines scripts and styles smaller than this limit (default 4 kB) into the HTML.
      // Inline scripts would break the CSP `script-src 'self'` (SPEC.md §13.1), so nothing is inlined.
      assetsInlineLimit: 0,
    },
  },
});
