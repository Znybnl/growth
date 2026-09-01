import { expect, test, type Page } from "@playwright/test";
import type { BrowserContext } from "playwright-core";

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

let cachedState: StorageState | null = null;
let loginPromise: Promise<StorageState> | null = null;
const missingCredentialsMessage =
  "Définissez OKADO_E2E_EMAIL et OKADO_E2E_PASSWORD pour exécuter ce parcours avec le compte de test dédié.";

async function createSession(page: Page): Promise<StorageState> {
  const email = process.env.OKADO_E2E_EMAIL;
  const password = process.env.OKADO_E2E_PASSWORD;
  if (!email || !password) throw new Error(missingCredentialsMessage);
  const browser = page.context().browser();
  if (!browser) throw new Error("Le navigateur Playwright n'est pas disponible.");
  const context = await browser.newContext();
  try {
    const loginPage = await context.newPage();
    await loginPage.goto("/connexion");
    await loginPage.getByPlaceholder("Email").fill(email);
    await loginPage.getByPlaceholder("Mot de passe").fill(password);
    await loginPage.getByRole("button", { name: "Se connecter", exact: true }).click();
    await expect(loginPage).not.toHaveURL(/\/connexion/, { timeout: 15_000 });
    return await context.storageState();
  } finally {
    await context.close();
  }
}

export async function signIn(page: Page) {
  if (!process.env.OKADO_E2E_EMAIL || !process.env.OKADO_E2E_PASSWORD) {
    test.skip(true, missingCredentialsMessage);
    return;
  }
  if (!cachedState) {
    loginPromise ??= createSession(page);
    cachedState = await loginPromise;
  }
  await page.context().addCookies(cachedState.cookies);
  await page.addInitScript((origins) => {
    for (const origin of origins) {
      for (const item of origin.localStorage) window.localStorage.setItem(item.name, item.value);
    }
  }, cachedState.origins);
  await page.goto("/");
}
