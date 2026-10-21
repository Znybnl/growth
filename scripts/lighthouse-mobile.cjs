// Read-only first-visit baseline. Lighthouse owns a fresh isolated browser;
// never pass a user's profile, cookies or credentials to this configuration.
module.exports = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "mobile",
    throttlingMethod: "simulate",
    onlyCategories: ["performance"],
    blockedUrlPatterns: ["*posthog.com/*", "*/_vercel/insights/*"],
  },
};
