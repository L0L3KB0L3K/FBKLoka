// Cover of the automatic weekly summary (SPEC.md §20.5): the club logo on ink with the ball-hole pattern of the match
// board. No people and no text of ours, so no font is needed. 1200 x 900 (4:3, like every news cover); the logo stays
// in the middle band, so the wide share crop keeps it whole. Made once: run again only when the logo or the colours
// change (node scripts/summary-cover.ts). The colours come from the tokens in src/styles/global.css; sharp comes with Astro.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const OUT = fileURLToPath(new URL("../src/content/novice/img/povzetek-tedna.webp", import.meta.url));
const WIDTH = 1200;
const HEIGHT = 900;
const LOGO_WIDTH = 760;
const PATTERN_OPACITY = 0.12; // as the holes on the match board: texture, not a second picture

const css = read("src/styles/global.css");
function token(name: string): string {
  const value = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`Token --${name} not found in src/styles/global.css`);
  return value;
}

// The holes of the ball (black shapes in a 240 x 240 tile) and the logo for dark backgrounds (viewBox 0 0 1772 789).
const holes = read("src/assets/ball-holes.svg").match(/<g fill="#000">([\s\S]*?)<\/g>/)?.[1];
const logo = read("src/assets/logo/logo-na-temnem.svg")
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .replace(/<title[\s\S]*?<\/title>/, "");
if (!holes) throw new Error("No holes in src/assets/ball-holes.svg");
const logoHeight = Math.round((LOGO_WIDTH * 789) / 1772);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <pattern id="holes" width="240" height="240" patternUnits="userSpaceOnUse">
      <g fill="${token("color-ball")}" fill-opacity="${PATTERN_OPACITY}">${holes}</g>
    </pattern>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${token("color-ink")}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#holes)"/>
  <svg x="${(WIDTH - LOGO_WIDTH) / 2}" y="${(HEIGHT - logoHeight) / 2}" width="${LOGO_WIDTH}" height="${logoHeight}" viewBox="0 0 1772 789">${logo}</svg>
</svg>`;

const info = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(OUT);
console.log(`OK    ${OUT}: ${info.width} x ${info.height}, ${Math.round(info.size / 1024)} KB`);
