import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/** Optional cross-browser recipe; the normal CI keeps its Chromium project. */
export default defineConfig({
  ...base,
  testMatch: ["christmas-wheels.spec.ts", "christmas-scratch.spec.ts", "christmas-background-coverage.spec.ts"],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
});
