// Checks WCAG contrast for the colour pairs in SPEC.md §9.2.
// Reads the tokens from src/styles/global.css, so the table cannot drift from the real values.
// Exits with code 1 if a required pair fails. Runs in `npm run verify`.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2]]),
);

// [foreground, background, minimum ratio]. 4.5 = text (AA), 3 = UI edges (AA).
const REQUIRED = [
  ["ink", "paper", 4.5],
  ["paper", "ink", 4.5], // white text in header and footer
  ["muted", "paper", 4.5],
  ["muted", "court", 4.5],
  ["ball", "ink", 4.5],
  ["ink", "ball", 4.5],
  ["input-border", "paper", 3],
  ["input-border", "court", 3],
];

// Listed for the record: yellow is never used as text on light backgrounds.
const FORBIDDEN = [["ball", "paper"]];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

function color(name) {
  if (!tokens[name]) {
    console.error(`Missing token --color-${name} in global.css`);
    process.exit(1);
  }
  return tokens[name];
}

let failed = 0;
for (const [fg, bg, min] of REQUIRED) {
  const r = ratio(color(fg), color(bg));
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${fg} on ${bg}: ${r.toFixed(2)}:1 (min ${min})`);
}
for (const [fg, bg] of FORBIDDEN) {
  console.log(`--   ${fg} on ${bg}: ${ratio(color(fg), color(bg)).toFixed(2)}:1 (forbidden pair, never use)`);
}

if (failed) {
  console.error(`\n${failed} colour pair(s) below WCAG AA.`);
  process.exit(1);
}
