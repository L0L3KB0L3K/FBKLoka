// Content Security Policy of the site pages (SPEC.md §13.1). src/layouts/Base.astro sends it as a <meta> tag in the
// built pages, not as a Netlify header: Netlify combines every [[headers]] rule that matches a path, so a site-wide header
// would also apply to /admin, where Decap needs 'unsafe-eval' and inline styles (SPEC.md §13.4). The header for "/*" in
// netlify.toml keeps only what a <meta> cannot carry (frame-ancestors) and what /admin can live with.
// scripts/check-seo.mjs checks that every built page has the tag; tests/e2e/site.spec.ts checks the pages for violations.
import { EKIPA } from "./ekipa.ts";

// Apps Script web app of /ekipa/plato and /ekipa/prevoz (SPEC.md §19), from its configured URL, so the browser tests can
// point it at a mock. script.google.com answers with a redirect to script.googleusercontent.com.
const ekipaOrigin = /^https:\/\//.test(EKIPA.appsScriptUrl) ? new URL(EKIPA.appsScriptUrl).origin : null;

export const SITE_CSP = [
  "default-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "style-src 'self'",
  "script-src 'self'",
  ["connect-src 'self'", ekipaOrigin, "https://script.googleusercontent.com"].filter(Boolean).join(" "),
  "form-action 'self'",
].join("; ");
