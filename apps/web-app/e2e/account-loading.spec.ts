import { expect, test } from "@playwright/test";
import type { AffiliateSummary } from "../src/lib/types";
import { captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({
    json: { frequencies: [], enabled: false, days: 7, canEdit: true, updatedAt: null },
  }));
});

const summary = {
  account: { status: "active", code: "OKADO-FIXTURE", commissionRateBps: 4000, commissionDurationMonths: 12 },
  referralLinkPath: "/inscription?ref=OKADO-FIXTURE",
  totals: { referrals: 0, activeReferrals: 0, pendingCommissionCents: 0, paidCommissionCents: 0, totalCommissionCents: 0 },
  referrals: [],
} satisfies Pick<AffiliateSummary, "referralLinkPath" | "totals" | "referrals"> & {
  account: Pick<AffiliateSummary["account"], "status" | "code" | "commissionRateBps" | "commissionDurationMonths">;
};

test("@visual-1280 Mon compte charge le PIN et l’affiliation à la demande", async ({ page }, info) => {
  const sections: string[] = [];
  let releaseAffiliate!: () => void;
  const pendingAffiliate = new Promise<void>(resolve => { releaseAffiliate = resolve; });
  let releasePin!: () => void;
  const pendingPin = new Promise<void>(resolve => { releasePin = resolve; });
  await page.route("**/api/account/details?**", async route => {
    const params = new URL(route.request().url()).searchParams;
    const section = params.get("section")!;
    sections.push(section);
    if (section === "pin") {
      expect(params.get("locationId")).toBe("fixture-site-3");
      await pendingPin;
      return route.fulfill({ json: { pin: { value: "5678", configured: true, recoverable: true } } });
    }
    await pendingAffiliate;
    return route.fulfill({ json: { summary } });
  });

  await page.goto("/dev/affiliate-accounts?mode=deferred");
  const pin = page.getByRole("textbox", { name: "PIN commerçant" });
  await expect(pin).toHaveValue("1234");
  expect(sections).toEqual([]);
  await pin.fill("1357");
  await page.getByRole("tab", { name: "Utilisateur" }).click();
  await expect(page.getByRole("dialog")).toContainText("Changer de section ?");
  expect(sections).toEqual([]);
  await page.getByRole("button", { name: "Changer de section", exact: true }).click();
  await expect(page.getByText("Chargement de l’affiliation…")).toBeVisible();
  releaseAffiliate();
  await expect(page.getByRole("button", { name: "Copier le lien" })).toBeVisible();
  expect(sections).toEqual(["affiliate"]);
  await page.getByRole("button", { name: "Copier le lien" }).scrollIntoViewIfNeeded();
  await captureVisualAt1280(page, info, "compte-affiliation-chargee");

  await page.getByRole("tab", { name: "Établissement" }).click();
  await page.getByRole("button", { name: "Changer de section", exact: true }).click();
  await expect(pin).toHaveValue("1357");
  await page.getByRole("button", { name: /Annexe test/ }).click();
  await page.getByRole("button", { name: "Afficher l’établissement", exact: true }).click();
  await expect(pin).toBeDisabled();
  await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeDisabled();
  releasePin();
  await expect(pin).toHaveValue("5678");
  await pin.scrollIntoViewIfNeeded();
  await captureVisualAt1280(page, info, "compte-pin-autre-site");
  expect(sections).toEqual(["affiliate", "pin"]);
});

test("@visual-1280 Mon compte ouvre Abonnement au retour de Stripe", async ({ page }, info) => {
  let releaseBilling!: () => void;
  const pendingBilling = new Promise<void>(resolve => { releaseBilling = resolve; });
  await page.route("**/api/account/details?**", async route => {
    expect(route.request().method()).toBe("POST");
    expect(new URL(route.request().url()).searchParams.get("billing")).toBe("success");
    await pendingBilling;
    return route.fulfill({ json: { billing: { isSubscribed: true, subscriptionStatus: "active", hasPaymentMethodOnFile: true }, synced: false } });
  });
  await page.goto("/dev/affiliate-accounts?mode=deferred&billing=success");
  await expect(page.getByRole("tab", { name: "Abonnement", selected: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Actualisation de l’abonnement" })).toBeVisible();
  releaseBilling();
  await expect(page.getByRole("heading", { name: "Votre abonnement" })).toBeVisible();
  await expect(page.getByText("Abonnement actif", { exact: true }).first()).toBeVisible();
  await captureVisualAt1280(page, info, "compte-retour-stripe");
});
