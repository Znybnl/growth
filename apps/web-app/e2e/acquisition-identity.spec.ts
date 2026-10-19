import { expect, test } from "@playwright/test";
import { gunzipSync } from "node:zlib";

test.use({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" });

// Proxy both real-origin namespaces to trusted local builds. No production page,
// account API, ingestion endpoint, Supabase or email provider receives a request.
test("identité anonyme partagée puis rapprochée au marchand après inscription simulée", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    !process.env.LANDING_TEST_BASE_URL,
    "Requires both local production builds",
  );
  const landing = new URL(process.env.LANDING_TEST_BASE_URL!);
  const app = new URL(baseURL!);
  expect(
    [landing.hostname, app.hostname].every((host) =>
      ["localhost", "127.0.0.1"].includes(host),
    ),
  ).toBe(true);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  await context.addCookies([
    {
      name: "okado_analytics_consent",
      value: encodeURIComponent(
        JSON.stringify({
          version: "2026-10-15",
          choice: "accepted",
          decidedAt: Date.now(),
        }),
      ),
      domain: ".okado.app",
      path: "/",
      secure: true,
      sameSite: "Lax",
    },
  ]);
  const events: { event: string; properties: Record<string, unknown> }[] = [];
  const network: string[] = [];
  page.on("request", (request) => { if (request.url().includes("posthog.com")) network.push(request.method() + " " + new URL(request.url()).pathname); });
  page.on("requestfailed", (request) => { if (request.url().includes("posthog.com")) network.push("FAILED " + request.failure()?.errorText); });
  let signupRequests = 0;
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname.endsWith("posthog.com")) {
      let body = request.postDataBuffer();
      if (body?.length) {
        if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body);
        const payload = JSON.parse(body.toString());
        events.push(
          ...(payload.batch ?? (Array.isArray(payload) ? payload : [payload])),
        );
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: '{"status":1}',
      });
      return;
    }
    if (url.pathname.startsWith("/_vercel/insights/")) {
      await route.fulfill({ status: 200, body: "" });
      return;
    }
    if (
      url.hostname === "app.okado.app" &&
      url.pathname === "/api/auth/signup"
    ) {
      signupRequests++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          merchant: { id: "audit-merchant-fixture" },
          user: { id: "audit-user-fixture" },
        }),
      });
      return;
    }
    if (url.hostname === "app.okado.app" && url.pathname === "/onboarding") {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<h1>Onboarding local fixture</h1>",
      });
      return;
    }
    if (
      ["www.okado.app", "app.okado.app"].includes(url.hostname) &&
      request.method() === "GET"
    ) {
      const destination = new URL(
        url.pathname + url.search,
        url.hostname === "www.okado.app" ? landing : app,
      );
      await route.fulfill({
        response: await route.fetch({ url: destination.href }),
      });
      return;
    }
    await route.abort();
  });
  await page.goto(
    "https://www.okado.app/?email=private%40example.test&token=secret",
  );
  await expect
    .poll(() => events.some((event) => event.event === "$pageview"))
    .toBe(true);
  const anonymous = events.find((event) => event.event === "$pageview")!
    .properties.distinct_id;
  expect(typeof anonymous).toBe("string");
  expect(
    (await context.cookies()).some(
      (cookie) =>
        cookie.name.startsWith("ph_") && cookie.domain === ".okado.app",
    ),
  ).toBe(true);
  await page.goto("https://app.okado.app/inscription");
  await page.getByPlaceholder("Camille", { exact: true }).fill("Audit");
  await page.getByPlaceholder("Martin", { exact: true }).fill("Fixture");
  await page
    .getByPlaceholder("camille@maisonsora.fr", { exact: true })
    .fill("audit@example.test");
  await page
    .locator('input[type="password"]')
    .nth(0)
    .fill("Fixture-password-507");
  await page
    .locator('input[type="password"]')
    .nth(1)
    .fill("Fixture-password-507");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  try {
    await expect.poll(() => events.some((event) => event.event === "$identify")).toBe(true);
  } catch (error) {
    console.log({ network, events: events.map((event) => event.event), signupRequests });
    throw error;
  }
  const started = events.find((event) => event.event === "signup_started")!;
  expect(started.properties.distinct_id).toBe(anonymous);
  const identified = events.find((event) => event.event === "$identify")!;
  expect(identified.properties.$anon_distinct_id).toBe(anonymous);
  expect(identified.properties.distinct_id).toBe(
    "audit-merchant-fixture:audit-user-fixture",
  );
  expect(signupRequests).toBe(1);
  expect(JSON.stringify(events)).not.toMatch(
    /audit@example|Fixture-password|private@example|token=secret/,
  );
});
