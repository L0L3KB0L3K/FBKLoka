// Weekly summary, step 3 (SPEC.md §20.5): checks a written summary against tmp/week.json (src/lib/week.ts verifySummary).
// Usage: node scripts/week-verify.ts <file.md>. A Markdown frontmatter is skipped. Exit 1 on any problem: the workflow
// then publishes the fixed-template text instead of the written one.
import { readFileSync } from "node:fs";
import { verifySummary, type Week } from "../src/lib/week.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/week-verify.ts <file.md>");
  process.exit(2);
}
const week = JSON.parse(readFileSync(new URL("../tmp/week.json", import.meta.url), "utf8")) as Week;
const text = readFileSync(file, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
const problems = verifySummary(text, week);
if (problems.length > 0) {
  console.error(`FAIL  ${file}:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`OK    ${file}: every score, number and name is in tmp/week.json.`);
