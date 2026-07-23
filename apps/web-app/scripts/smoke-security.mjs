#!/usr/bin/env node

const baseUrl = process.env.OKADO_SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.OKADO_SMOKE_EMAIL ?? "camille@maisonsora.fr";
const password = process.env.OKADO_SMOKE_PASSWORD ?? "demo1234";

const cookieJar = new Map();

function updateCookies(response) {
  const setCookie = response.headers.getSetCookie?.() ?? [];
  for (const rawCookie of setCookie) {
    const [pair] = rawCookie.split(";");
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) continue;
    cookieJar.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (cookieJar.size && !headers.has("Cookie")) {
    headers.set("Cookie", cookieHeader());
  }

  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    headers,
    redirect: options.redirect ?? "manual",
  });
  updateCookies(response);
  return response;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectStatus(path, expectedStatuses, options = {}) {
  const response = await request(path, options);
  assert(
    expectedStatuses.includes(response.status),
    `${options.method ?? "GET"} ${path}: statut ${response.status}, attendu ${expectedStatuses.join("/")}`,
  );
  return response;
}

async function signIn() {
  const response = await request("/api/auth/signin", {
    method: "POST",
    headers: { Origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  assert(response.status === 200, `Connexion smoke sécurité impossible: ${response.status}`);
}

async function main() {
  console.log(`Smoke sécurité Okado: ${baseUrl}`);

  await expectStatus("/api/campaigns", [401]);
  await expectStatus("/api/campaigns/not-existing/assets", [401]);
  await expectStatus("/api/background-library", [401]);
  await expectStatus("/api/google-places/search?q=test", [401]);
  await expectStatus("/api/merchant/leads", [307, 401]);
  await expectStatus("/api/merchant/locations", [307, 401]);
  await expectStatus("/api/merchant/cashier/lookup", [307, 401], { method: "POST", body: JSON.stringify({ code: "OK-TEST" }) });
  await expectStatus("/api/merchant/cashier/redeem", [307, 401], { method: "POST", body: JSON.stringify({ leadId: "lead-test", idempotencyKey: "test" }) });
  await expectStatus("/api/stripe/portal-session", [307, 401, 405], { method: "POST" });
  console.log("✓ Accès API sans session refusés");

  await expectStatus("/api/public/draw/session", [400, 409], {
    method: "POST",
    headers: { Origin: baseUrl },
    body: JSON.stringify({ campaignId: "../bad-id" }),
  });
  await expectStatus("/api/public/draw/finalize", [400, 409], {
    method: "POST",
    headers: { Origin: baseUrl },
    body: JSON.stringify({ sessionId: "../bad-id", firstName: "A", email: "bad" }),
  });
  console.log("✓ Entrées publiques invalides refusées");

  await expectStatus("/api/auth/signin", [403], {
    method: "POST",
    headers: { Origin: "https://evil.example" },
    body: JSON.stringify({ email, password }),
  });
  await expectStatus("/api/auth/signup", [403], {
    method: "POST",
    headers: { Origin: "https://evil.example" },
    body: JSON.stringify({
      firstName: "Evil",
      lastName: "Origin",
      email: "evil@example.com",
      password: "demo1234",
      companyName: "Evil",
    }),
  });
  console.log("✓ Auth cross-origin refusée");

  await signIn();
  console.log("✓ Session marchand standard ouverte");

  await expectStatus("/api/account", [403], {
    method: "POST",
    headers: { Origin: "https://evil.example" },
    body: JSON.stringify({}),
  });
  console.log("✓ Mutation cross-origin refusée");

  await expectStatus("/api/background-library", [403], {
    method: "POST",
    headers: { Origin: baseUrl },
    body: JSON.stringify({}),
  });
  await expectStatus("/api/background-library/not-existing", [403], {
    method: "DELETE",
    headers: { Origin: baseUrl },
  });
  console.log("✓ Administration bibliothèque refusée au marchand standard");

  await expectStatus("/api/merchant/prizes/not-existing/stock", [404], {
    method: "PATCH",
    headers: { Origin: baseUrl },
    body: JSON.stringify({ remainingQuantity: 1 }),
  });
  await expectStatus("/api/merchant/leads/not-existing/redeem", [404], {
    method: "POST",
    headers: { Origin: baseUrl },
  });
  console.log("✓ Actions sensibles bornées au périmètre marchand");

  console.log("Smoke sécurité terminé avec succès.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

