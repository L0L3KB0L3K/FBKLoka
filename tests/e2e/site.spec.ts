// Pages from SPEC.md §13.5 plus /klub and /zasebnost:
// 1. axe finds no WCAG 2.2 A/AA violations,
// 2. no CSP violation with the policy from netlify.toml,
// 3. mobile menu: Enter opens it, Escape closes it, focus returns to the button.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const PAGES = ["/", "/ekipe/clani/", "/tekme/", "/treningi/", "/vpis/", "/kontakt/", "/klub/", "/zasebnost/"];

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
