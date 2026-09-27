// Checks the built pages in dist/ (SPEC.md §13.5). Runs in `npm run verify` after the build.
// Every page: <html lang>, exactly one <h1>, alt + width + height on every <img>, no visible "TODO".
// Pages without noindex: a unique <title>, a meta description, a canonical URL and og:image.
// dist/admin/ and dist/ekipa/ are skipped (Decap and the hidden team pages).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DIST = "dist";
const SKIP = ["admin", "ekipa"];

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIP.includes(relative(DIST, path).split(sep)[0]) ? [] : htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

const errors = [];
const titles = new Map();

for (const file of htmlFiles(DIST)) {
  const page = relative(DIST, file);
  const html = readFileSync(file, "utf8");
  const fail = (message) => errors.push(`${page}: ${message}`);

  if (!/<html[^>]*\slang="[a-z-]+"/i.test(html)) fail("missing <html lang>");
  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 !== 1) fail(`${h1} <h1> elements, expected exactly 1`);

  for (const img of html.match(/<img\b[^>]*>/gi) ?? []) {
    // A decorative image has an empty alt, which Astro writes as a bare `alt` attribute.
    const required = { alt: /\salt(=|\s|\/?>)/i, width: /\swidth=/i, height: /\sheight=/i };
    for (const [attr, pattern] of Object.entries(required)) {
      if (!pattern.test(img)) fail(`<img> without ${attr}: ${img.slice(0, 90)}`);
    }
  }

  // Internal page links end with "/": a link to /tekme gets a 301 to /tekme/ on Netlify.
  // Links to files (/og.png, /koledar/clani.ics) keep their extension.
  for (const [, url] of html.matchAll(/(?:href|action)="([/][^"]*)"/g)) {
    const path = url.split(/[?#]/)[0];
    if (url.startsWith("//")) continue;
    if (!path.endsWith("/") && !/[.][a-z0-9]+$/i.test(path)) fail(`internal link without a trailing slash: ${url}`);
  }

  // Temporary values are "TODO" (SPEC.md §14); none may be visible on a built page.
  const visibleText = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
  if (visibleText.includes("TODO")) fail('visible "TODO" on the page');

  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) continue;

  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (!title) fail("missing <title>");
  else titles.set(title, [...(titles.get(title) ?? []), page]);
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) fail("missing meta description");
  if (!/<link\s+rel="canonical"\s+href="https?:\/\/[^"]+"/i.test(html)) fail("missing canonical URL");
  if (!/<meta\s+property="og:image"\s+content="https?:\/\/[^"]+"/i.test(html)) fail("missing og:image");
}

for (const [title, pages] of titles) {
  if (pages.length > 1) errors.push(`duplicate <title> "${title}": ${pages.join(", ")}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\ncheck-seo: ${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`check-seo: ${titles.size} indexable pages OK.`);
