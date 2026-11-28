import { defineConfig, devices } from "@playwright/test";

// Visual regression tests. The app is built and served as in production, but
// every API call is answered from fixed data (visual/fakeApi.ts), so the only
// thing that can change a screenshot is the app itself.
const port = 4174;

export default defineConfig({
  testDir: "visual",
  snapshotPathTemplate: "visual/__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "visual-report" }]]
    : "list",
  outputDir: "visual-results",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      // Tight on purpose. With Playwright's defaults (a per-pixel color
      // threshold of 0.2), scripts/prove-visual.mjs showed a lighter accent
      // color and less rounded corners both passing. Baselines are made on the
      // CI runner image, so there is no cross-machine noise to allow for.
      threshold: 0.05,
      maxDiffPixels: 10,
    },
  },
  use: {
    baseURL: `http://localhost:${port}`,
    timezoneId: "America/Denver",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
