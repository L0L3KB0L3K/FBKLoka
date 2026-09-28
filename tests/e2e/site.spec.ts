// Pages from SPEC.md §13.5 plus /klub, /zasebnost and the news pages:
// 1. axe finds no WCAG 2.2 A/AA violations,
// 2. no CSP violation with the policy from netlify.toml,
// 3. mobile menu: Enter opens it, Escape closes it, focus returns to the button,
// 4. the team filter on /novice shows only that team and goes back to all,
// 5. the sponsor strip scrolls, the button stops it, and it stands still with "reduce motion" (WCAG 2.2.2),
// 6. the same for the photos behind the home match board.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const PAGES = [
  "/",
  "/ekipe/",
  "/ekipe/clani/",
  "/tekme/",
  "/treningi/",
  "/vpis/",
  "/kontakt/",
  "/klub/",
  "/zasebnost/",
  "/novice/",
  "/novice/2026-04-12-u17-drzavni-prvaki/",
];

// The same policy Netlify sends, read from netlify.toml so the test cannot drift from it.
const policy = readFileSync(new URL("../../netlify.toml", import.meta.url), "utf8").match(
  /Content-Security-Policy = "([^"]+)"/,
)?.[1];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(summary).toEqual([]);
  });

  test(`CSP: ${path}`, async ({ page }) => {
    expect(policy, "CSP not found in netlify.toml").toBeTruthy();
    await page.addInitScript(() => {
      (window as unknown as { cspViolations: string[] }).cspViolations = [];
      document.addEventListener("securitypolicyviolation", (event) => {
        (window as unknown as { cspViolations: string[] }).cspViolations.push(
          `${event.effectiveDirective} blocked ${event.blockedURI || "inline"}`,
        );
      });
    });
    await page.route("**/*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": policy as string } });
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const violations = await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
    expect(violations).toEqual([]);
  });
}

test("mobile menu: Enter opens, Escape closes, focus returns to the button", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the menu button exists only on small screens");
  await page.goto("/");
  const button = page.getByRole("button", { name: "Meni" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Meni" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Meni" })).toBeHidden();
  await expect(button).toBeFocused();
});

test("news filter: ?s=u17 shows only U17 posts, Vse shows all again", async ({ page }) => {
  await page.goto("/novice/?s=u17");
  const cards = page.locator("[data-selekcija]");
  const total = await cards.count();
  const visible = page.locator("[data-selekcija]:visible");
  await expect(visible.first()).toBeVisible();
  for (const value of await visible.evaluateAll((items) => items.map((item) => item.getAttribute("data-selekcija")))) {
    expect(value).toBe("u17");
  }
  await expect(page.getByRole("link", { name: "U17", exact: true })).toHaveAttribute("aria-current", "true");
  await page.getByRole("link", { name: "Vse", exact: true }).click();
  await expect(visible).toHaveCount(total);
  expect(new URL(page.url()).search).toBe("");
});

test("sponsors: the button stops the scrolling, reduced motion keeps them still", async ({ page }) => {
  await page.goto("/hvala/");
  const strip = page.locator("[data-sponsors]");
  await expect(strip).toHaveAttribute("data-marquee", "on");
  await page.getByRole("button", { name: "Ustavi pomikanje logotipov" }).click();
  await expect(strip).toHaveAttribute("data-marquee", "paused");
  await expect(page.getByRole("button", { name: "Nadaljuj pomikanje logotipov" })).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(strip).not.toHaveAttribute("data-marquee");
  await expect(page.getByRole("button", { name: /pomikanje logotipov/ })).toBeHidden();
});

test("home photos: the button stops the change, reduced motion keeps the first photo", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ustavi menjavo slik" }).click();
  await expect(page.getByRole("button", { name: "Nadaljuj menjavo slik" })).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByRole("button", { name: /menjavo slik/ })).toBeHidden();
  await expect(page.locator("[data-photo][data-active]")).toHaveCount(1);
});
