// Browser tests for the hidden team pages (SPEC.md §19.8). The pages are built with PUBLIC_EKIPA_URL pointing at
// https://ekipa.test/exec (playwright.config.ts); every request there is answered by a mock that runs the real
// apps-script/ekipa/Rules.gs in a Node vm, so the pages and the rules are tested together without Google.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ENDPOINT = "https://ekipa.test/exec";
const CODE = "zelena palica hitri gol";

type Row = { row: number; ime: string; tekmaId: number; vloga: string; akcija: string; status: string };

const rules: Record<string, (...args: unknown[]) => unknown> = {};
vm.createContext(rules);
vm.runInContext(readFileSync(new URL("../../apps-script/ekipa/Rules.gs", import.meta.url), "utf8"), rules);

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/** A tiny in-memory Apps Script: the same answers as Code.gs doPost, rules from Rules.gs. */
async function mockBackend(page: Page) {
  const rows: Row[] = [];
  const ctx = () => ({
    players: ["Ana Novak", "Bor Kos"],
    matches: [
      { id: 1, zacetek: inDays(5), tekmovanje: "IFL", nasprotnik: "KAC Floorball", doma: true, prizorisce: "Dvorana Poden" },
      { id: 2, zacetek: inDays(8), tekmovanje: "IFL", nasprotnik: "FBC Dragons", doma: false, prizorisce: "Alterlaa, Wien" },
    ],
    rows,
    now: Date.now(),
    settings: { odjavaRokUr: 24 },
  });
  await page.route(`${ENDPOINT}**`, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    let answer: Record<string, unknown>;
    if (body.code !== CODE) answer = { error: "bad_code" };
    else if (!body.action) answer = rules.buildData(ctx()) as Record<string, unknown>;
    else {
      const decision = rules.decide(body.action, ctx()) as { status: string; razlog: string; cancelRow?: number };
      rows.push({ row: rows.length + 2, ime: body.action.ime, tekmaId: body.action.tekmaId, vloga: body.action.vloga, akcija: body.action.type, status: decision.status });
      if (decision.cancelRow) rows.find((r) => r.row === decision.cancelRow)!.status = "preklicano";
      answer = { ...(rules.buildData(ctx()) as object), result: decision.status === "OK" ? { ok: true } : { ok: false, razlog: decision.razlog } };
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(answer), headers: { "access-control-allow-origin": "*" } });
  });
}

async function openWithCode(page: Page, path: string) {
  await page.goto(path);
  await page.getByLabel("Ekipna koda").fill(CODE);
  await page.getByRole("button", { name: "Odpri" }).click();
}

test("hidden: noindex and nofollow, not in the sitemap", async ({ page, request }) => {
  await page.goto("/ekipa/plato/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).not.toContain("/ekipa/");
});

test("wrong team code: message, the list stays hidden", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/ekipa/plato/");
  await page.getByLabel("Ekipna koda").fill("napacna koda");
  await page.getByRole("button", { name: "Odpri" }).click();
  await expect(page.getByText("Koda ni pravilna. Preveri jo v ekipni skupini.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tekme" })).toBeHidden();
});

test("plato: sign up with my name, the match is taken, cancel makes it free again", async ({ page }) => {
  await mockBackend(page);
  await openWithCode(page, "/ekipa/plato/");
  const first = page.locator("[data-match-id='1']");
  await first.getByRole("button", { name: "Prinesem jaz" }).click();
  await page.getByLabel("Ime in priimek").selectOption("Ana Novak");
  await page.getByRole("button", { name: "Potrdi" }).click();
  await expect(first.getByText("Prinese: Ana Novak")).toBeVisible();
  await expect(first.getByText("Prijavljen.")).toBeVisible();
  await expect(page.getByText("Ti si:")).toBeVisible();
  await first.getByRole("button", { name: "Odjavi" }).click();
  await expect(first.getByText("Prosto")).toBeVisible();
});

test("prevoz: only away matches, several drivers", async ({ page }) => {
  await mockBackend(page);
  await openWithCode(page, "/ekipa/prevoz/");
  await expect(page.locator("[data-match-id='1']")).toHaveCount(0); // home match: no prevoz
  const away = page.locator("[data-match-id='2']");
  await away.getByRole("button", { name: "Vozim jaz" }).click();
  await page.getByLabel("Ime in priimek").selectOption("Bor Kos");
  await page.getByRole("button", { name: "Potrdi" }).click();
  await expect(away.getByText("Vozijo: Bor Kos")).toBeVisible();
});

test("axe: plato page with data", async ({ page }) => {
  await mockBackend(page);
  await openWithCode(page, "/ekipa/plato/");
  await expect(page.getByRole("heading", { name: "Tekme" })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});
