// Accessibility and browser tests, run locally before launch, not in the Netlify build (SPEC.md §13.5).
// Uses the Microsoft Edge that is installed on the machine (channel "msedge"), so no browser download.
// iPhone 14 runs as an emulated device in Chromium: close enough for layout and keyboard checks, but not WebKit.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  webServer: {
    command: "npx astro build && npx astro preview --port 4330",
    url: "http://localhost:4330",
    timeout: 180_000,
    reuseExistingServer: false,
    // /ekipa/* pages call this address; tests/e2e/ekipa.spec.ts answers it with a mock (never a real request).
    env: { PUBLIC_EKIPA_URL: "https://ekipa.test/exec" },
  },
  use: { baseURL: "http://localhost:4330" },
  projects: [
    { name: "Pixel 7", use: { ...devices["Pixel 7"], channel: "msedge" } },
    { name: "Desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "iPhone 14", use: { ...devices["iPhone 14"], browserName: "chromium", channel: "msedge" } },
  ],
});
