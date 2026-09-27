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

  // Every page URL ends with a slash (/tekme/), the form Netlify serves for tekme/index.html without a
  // redirect. Links without it caused a 301 on every click (found 28. 9. 2026). The dev server rejects
  // such links, and scripts/check-seo.mjs fails the build on them.
  trailingSlash: "always",

  // Sitemap without the thank-you page, the 404 page and the hidden team pages (SPEC.md §13.2, §19).
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        return !["/hvala", "/404", "/ekipa"].some((hidden) => path === hidden || path.startsWith(`${hidden}/`));
      },
    }),
  ],

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
