import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3200";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "small-mobile", use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run start -- --port 3200",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
