import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { chromium } from "@playwright/test";

import {
  createCampaignEmailDefaults,
  getRewardEmailConditions,
  normalizeCampaignEmailSettings,
  renderRewardEmailHtml,
  renderRewardEmailText,
  upgradeLegacyRewardEmailSettings,
  validateCampaignEmailSettings,
} from "./email-settings.ts";

const defaults = createCampaignEmailDefaults({ industry: "Beauté", restaurantEmail: "contact@example.test" });
const variables = {
  firstName: "Pierre-Henri", merchantName: "AZURA", campaignTitle: "Jeu de test",
  prizeLabel: "ÉPILATION OFFERTE", redemptionCode: "3042EF1A-1",
  redeemUrl: "https://example.test/redeem/3042EF1A-1", qrUrl: "https://example.test/api/public/redeem/3042EF1A-1/qr",
  rewardAvailability: "Disponible à partir du 4 oct. 2026, 12:00.", rewardExpiry: "Valable jusqu'au 3 déc. 2026, 12:00.",
  rewardDate: "3 oct. 2026, 12:00", purchaseCondition: "", usageConditions: "Valable avec un Brow Lift",
};
const options = { rewardAvailableAt: "2026-10-04T12:00:00Z", rewardExpiresAt: "2026-12-03T12:00:00Z" };
const oldBody = [
  "Vous avez gagné le lot {{prizeLabel}} chez {{merchantName}} le {{rewardDate}}.",
  "Ce coupon sera valable lors de votre prochaine visite. Rendez-vous sur place à partir de demain et montrez le QR code ci-dessous au personnel de l'établissement pour récupérer votre cadeau.",
  "{{rewardAvailability}}", "{{rewardExpiry}}", "{{purchaseCondition}}", "{{usageConditions}}",
].join("\n\n");

test("recommended defaults are valid, merchant sender and reply-to are unchanged", () => {
  assert.deepEqual(validateCampaignEmailSettings(defaults), []);
  assert.equal(defaults.headline, "Félicitations {{firstName}} 🎁");
  assert.equal(defaults.senderName, "{{merchantName}}");
  assert.equal(defaults.replyTo, "contact@example.test");
});

test("HTML follows brief, shows real prize/merchant, conditions, QR then backup code", () => {
  const html = renderRewardEmailHtml(defaults, variables, options);
  for (const text of ["Félicitations Pierre-Henri 🎁", "Vous avez gagné :", "ÉPILATION OFFERTE", "chez <strong>AZURA</strong>", "Comment profiter de votre gain ?", "Conditions", "Valable avec un Brow Lift", "Utilisable du 4 octobre 2026 au 3 décembre 2026", "Utilisable une seule fois", "QR CODE DE RETRAIT", "Code de secours :", variables.redemptionCode]) assert.ok(html.includes(text), text);
  assert.ok(html.indexOf('alt="QR code de retrait"') < html.indexOf("Code de secours :"));
  assert.ok(html.includes(`src="${variables.qrUrl}"`));
  assert.ok(!html.includes("Rendez-vous sur place"));
  assert.equal((html.match(/Valable avec un Brow Lift/g) || []).length, 1);
});

test("plain text contains the same information and backup code", () => {
  const text = renderRewardEmailText(defaults, variables, options);
  for (const item of ["Félicitations Pierre-Henri 🎁", variables.prizeLabel, "chez AZURA", "Conditions", variables.usageConditions, "Utilisable une seule fois", variables.qrUrl, "Code de secours : 3042EF1A-1", "En cas de difficulté à scanner"]) assert.ok(text.includes(item));
  assert.ok(text.indexOf("QR CODE DE RETRAIT") < text.indexOf("Code de secours"));
});

test("no invented purchase condition, no empty bullets or dates without an expiry", () => {
  const conditions = getRewardEmailConditions({ ...variables, purchaseCondition: "", usageConditions: "", rewardExpiry: "", rewardAvailability: "Disponible dès maintenant au comptoir." });
  assert.deepEqual(conditions, ["Disponible dès maintenant au comptoir.", "Utilisable une seule fois"]);
  assert.ok(!renderRewardEmailHtml(defaults, { ...variables, usageConditions: "" }).includes("Brow Lift"));
});

test("configured purchase condition is preserved even without detailed usage condition", () => {
  assert.ok(getRewardEmailConditions({ ...variables, purchaseCondition: "Achat requis", usageConditions: "" }).includes("Achat requis"));
});

test("one-sided and invalid dates fall back without throwing", () => {
  assert.ok(getRewardEmailConditions(variables, { rewardAvailableAt: options.rewardAvailableAt }).includes("Utilisable à partir du 4 octobre 2026"));
  assert.ok(getRewardEmailConditions(variables, { rewardExpiresAt: options.rewardExpiresAt }).includes("Utilisable jusqu’au 3 décembre 2026"));
  assert.ok(getRewardEmailConditions(variables, { rewardExpiresAt: "invalid" }).includes(variables.rewardExpiry));
});

test("existing standard campaigns are upgraded at render and normalization without writes", () => {
  const old = { ...defaults, headline: "Récupérez votre lot, {{firstName}}", body: oldBody, footerNote: "Présentez ce QR code au comptoir. Il ne pourra être consommé qu'une seule fois." };
  assert.equal(normalizeCampaignEmailSettings(old, defaults).body, defaults.body);
  assert.equal(renderRewardEmailHtml(old, variables, options), renderRewardEmailHtml(defaults, variables, options));
  assert.equal(old.body, oldBody);
  for (const wording of [oldBody.replace("à partir de demain", "demain"), oldBody.replace("gagné le lot", "gagné"), oldBody.replaceAll("\n", "\r\n")]) assert.equal(upgradeLegacyRewardEmailSettings({ ...old, body: wording }).body, defaults.body);
});

test("custom merchant body, headline, footer and sender are preserved", () => {
  const custom = { ...defaults, headline: "Bravo {{firstName}} !", senderName: "Maison test", replyTo: "autre@example.test", body: `Un mot de notre équipe.\n\n${oldBody}\n\nCode de retrait : {{redemptionCode}}`, footerNote: "À très bientôt !" };
  assert.deepEqual(upgradeLegacyRewardEmailSettings(custom), custom);
  const html = renderRewardEmailHtml(custom, variables);
  for (const item of ["Bravo Pierre-Henri !", "Un mot de notre équipe.", "À très bientôt !"]) assert.ok(html.includes(item));
});

test("merchant text, code, URLs, colors and logos cannot inject HTML", () => {
  const html = renderRewardEmailHtml({ ...defaults, accentColor: 'red;" onclick="alert(1)' }, { ...variables, firstName: '<script>alert(1)</script>', prizeLabel: '<img onerror="alert(1)">', merchantName: '<svg onload="x">', usageConditions: '<iframe src="x">', redemptionCode: '<b>code</b>', qrUrl: 'https://example.test/qr?x=" onerror="x' }, { logoSrc: 'https://example.test/logo?x=" onerror="x' });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<svg"));
  assert.ok(!html.includes('<iframe src="x">'));
  assert.ok(!html.includes('onclick="alert'));
  assert.ok(html.includes("&lt;b&gt;code&lt;/b&gt;"));
  assert.ok(html.includes("color:#111827"));
});

test("appointment CTA only appears for a safe configured URL", () => {
  for (const url of [undefined, "", "javascript:alert(1)", "https://user:secret@example.test"]) {
    assert.ok(!renderRewardEmailHtml(defaults, variables, { appointmentUrl: url }).includes("Prendre rendez-vous"));
    assert.ok(!renderRewardEmailText(defaults, variables, { appointmentUrl: url }).includes("Prendre rendez-vous"));
  }
  assert.ok(renderRewardEmailHtml(defaults, variables, { appointmentUrl: "https://example.test/rdv" }).includes('href="https://example.test/rdv"'));
});

test("HTML and plain text receive real dates from the sending pipeline", async () => {
  const source = await readFile(new URL("./reward-email.ts", import.meta.url), "utf8");
  assert.equal((source.match(/rewardAvailableAt: input.rewardAvailableAt/g) || []).length, 2);
  assert.equal((source.match(/rewardExpiresAt: input.rewardExpiresAt/g) || []).length, 2);
});

test("desktop/mobile render: loaded QR, readable text, no horizontal overflow", async () => {
  const browser = await chromium.launch();
  const output = path.resolve("../../.codex-logs/reward-email");
  await mkdir(output, { recursive: true });
  const qrUrl = await QRCode.toDataURL("OKADO-DEMO-NON-REDEEMABLE", { width: 200, margin: 4 });
  const html = `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${renderRewardEmailHtml(defaults, { ...variables, qrUrl }, options)}</body></html>`;
  await writeFile(path.join(output, "preview.html"), html);
  try {
    for (const width of [680, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.setContent(html);
      await page.locator('img[alt="QR code de retrait"]').waitFor();
      assert.ok(await page.locator('img[alt="QR code de retrait"]').evaluate((img) => img.complete && img.naturalWidth === 200));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      assert.ok(await page.getByRole("heading", { name: "ÉPILATION OFFERTE" }).isVisible());
      await page.screenshot({ path: path.join(output, `${width}px.png`), fullPage: true });
      // Stress content, not just the short example from the brief.
      await page.setContent(renderRewardEmailHtml(defaults, { ...variables, qrUrl, prizeLabel: "LOT".repeat(80), usageConditions: "Condition détaillée ".repeat(40) }, options));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.close();
    }
  } finally { await browser.close(); }
});
