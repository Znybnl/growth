#!/usr/bin/env node

import nextEnv from "@next/env";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const { loadEnvConfig } = nextEnv;
loadEnvConfig(path.resolve(scriptDirectory, ".."));

const baseUrl = process.env.OKADO_SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.OKADO_SMOKE_EMAIL ?? process.env.OKADO_E2E_EMAIL;
const password = process.env.OKADO_SMOKE_PASSWORD ?? process.env.OKADO_E2E_PASSWORD;
const leadEmail = process.env.OKADO_SMOKE_LEAD_EMAIL ?? "delivered+okado-e2e@resend.dev";
const keepCampaign = process.env.OKADO_SMOKE_KEEP_CAMPAIGN === "true";

const cookieJar = new Map();
let merchantId = null;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceRoleKey, "Supabase doit être configuré pour nettoyer les données E2E.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function purgeE2eCampaigns() {
  assert(merchantId, "Le marchand E2E doit être identifié avant le nettoyage.");
  const supabase = getSupabaseAdmin();
  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("merchant_id", merchantId)
    .like("title", "E2E —%");
  if (campaignsError) throw new Error(`Lecture des jeux E2E impossible: ${campaignsError.message}`);

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  if (!campaignIds.length) return;

  const { data: deliveries, error: deliveriesError } = await supabase
    .from("reward_email_deliveries")
    .select("id")
    .in("campaign_id", campaignIds);
  if (deliveriesError) throw new Error(`Lecture des e-mails E2E impossible: ${deliveriesError.message}`);

  const deliveryIds = (deliveries ?? []).map((delivery) => delivery.id);
  if (deliveryIds.length) {
    const { error } = await supabase.from("reward_email_events").delete().in("reward_email_delivery_id", deliveryIds);
    if (error) throw new Error(`Suppression des événements e-mail E2E impossible: ${error.message}`);
  }

  const deletions = [
    supabase.from("reward_email_deliveries").delete().in("campaign_id", campaignIds),
    supabase.from("business_logs").delete().eq("merchant_id", merchantId).in("campaign_id", campaignIds),
    supabase.from("campaigns").delete().eq("merchant_id", merchantId).in("id", campaignIds),
  ];
  const results = await Promise.all(deletions);
  const deletionError = results.find((result) => result.error)?.error;
  if (deletionError) throw new Error(`Suppression des données E2E impossible: ${deletionError.message}`);

  console.log(`✓ Nettoyage E2E: ${campaignIds.length} jeu(x) supprimé(s)`);
}

async function assertTestRewardEmail(leadId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reward_email_deliveries")
    .select("recipient_email,subject,status,resend_email_id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`E-mail de gain E2E introuvable: ${error?.message ?? "ligne absente"}`);
  }
  assert(data.recipient_email.toLowerCase() === leadEmail.toLowerCase(), "L'e-mail de gain E2E cible un destinataire inattendu.");
  assert(data.subject.startsWith("[TEST]"), "L'objet de l'e-mail E2E doit commencer par [TEST].");
  assert(!["failed", "bounced", "complained", "suppressed"].includes(data.status), "L'e-mail de gain E2E est en échec.");

  const resendApiKey = process.env.RESEND_API_KEY;
  assert(resendApiKey, "RESEND_API_KEY est nécessaire pour valider l'e-mail E2E via Resend.");
  assert(data.resend_email_id, "L'identifiant Resend de l'e-mail E2E est manquant.");

  const resend = new Resend(resendApiKey);
  let remoteEmail;
  let lastError;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const result = await resend.emails.get(data.resend_email_id);
    if (result.error) {
      lastError = result.error.message;
    } else if (result.data) {
      remoteEmail = result.data;
      if (["delivered", "bounced", "complained", "suppressed", "failed"].includes(remoteEmail.last_event)) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  assert(remoteEmail, `E-mail E2E introuvable dans Resend${lastError ? `: ${lastError}` : "."}`);
  assert(remoteEmail.last_event === "delivered", `E-mail E2E non délivré: ${remoteEmail.last_event}.`);
  assert(remoteEmail.to.some((recipient) => recipient.toLowerCase() === leadEmail.toLowerCase()), "Resend cible un destinataire inattendu.");
  assert(remoteEmail.subject === data.subject, "Le sujet retourné par Resend ne correspond pas au sujet enregistré.");
  assert(remoteEmail.text?.includes("Café offert") || remoteEmail.html?.includes("Café offert"), "Le contenu de l'e-mail ne contient pas le lot attendu.");
  console.log(`✓ E-mail de gain E2E: ${remoteEmail.last_event} et contenu vérifié via Resend`);
}

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
  const url = new URL(path, baseUrl).toString();
  const headers = new Headers(options.headers ?? {});

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Origin")) headers.set("Origin", baseUrl);
  if (cookieJar.size) headers.set("Cookie", cookieHeader());

  const response = await fetch(url, {
    ...options,
    headers,
    redirect: options.redirect ?? "manual",
  });
  updateCookies(response);

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? body.error
        : `HTTP ${response.status}`;
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${message}`);
  }

  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function campaignPayload(merchant, gameType = "wheel") {
  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  const companyName = merchant.companyName || "Okado Smoke";
  const googleReviewUrl =
    merchant.googleReviewUrl ||
    "https://search.google.com/local/writereview?placeid=ChIJ48Wnhvdk5kcRX-CQ1DqPlqs";

  return {
    merchantId: merchant.id,
    title: `E2E — Smoke ${gameType} ${suffix}`,
    subtitle: "Test automatisé Okado.",
    goalType: "review_prompt",
    ctaLabel: "Je participe",
    successMetric: "Clics vers avis",
    targetUrl: googleReviewUrl,
    isActive: true,
    gameType,
    logoMode: "text",
    logoText: companyName,
    accent: {
      ink: "#111827",
      paper: "#ffffff",
      signal: "#f4c14a",
    },
    presentation: {
      logo: {
        sizePercent: 100,
        marginBottomPx: 18,
        align: "center",
      },
      background: {
        mode: "color",
        color: "#ffffff",
        imageUrl: "",
      },
      heading: {
        textColor: "#1f2937",
        fontSizePx: 40,
        fontFamily: "display",
        align: "center",
      },
      button: {
        backgroundColor: "#c59920",
        textColor: "#ffffff",
        borderColor: "#f4c14a",
        size: "md",
        textSizePx: 24,
        isBold: true,
      },
      layout: {
        blockSpacingPx: 28,
      },
      wheel: {
        rimColor: "#f4c14a",
        winColor: "#f4c14a",
        alternateWinColor: "#eef2ff",
        loseColor: "#1b2842",
        alternateLoseColor: "#8795db",
      },
      poster: {
        logoMode: "text",
        logoText: companyName,
        logoUrl: "",
        logoSizePercent: 100,
        logoBottomMarginPx: 28,
        backgroundMode: "color",
        backgroundColor: "#ffffff",
        backgroundImageUrl: "",
        headline: "Scannez, jouez, récupérez votre cadeau",
        headlineTextColor: "#ffffff",
        headlineFontSizePx: 42,
        headlineFontFamily: "display",
        wheel: {
          rimColor: "#f4c14a",
          winColor: "#f4c14a",
          alternateWinColor: "#eef2ff",
          loseColor: "#1b2842",
          alternateLoseColor: "#8795db",
        },
        footerBackgroundColor: "transparent",
      },
      email: {
        senderName: companyName,
        replyTo: merchant.restaurantEmail || "",
        subject: "[TEST] Votre cadeau est disponible",
        preheader: "Présentez votre QR code pour récupérer votre lot.",
        headline: "Bravo, votre cadeau vous attend.",
        body: "Merci pour votre participation. Présentez le QR code en restaurant pour récupérer votre lot.",
        buttonLabel: "Voir mon QR code",
        footerNote: "",
        accentColor: "#2f6df6",
      },
    },
    actions: [
      {
        id: "smoke-action-google",
        kind: "google",
        label: "Laisser un avis Google",
        url: googleReviewUrl,
      },
    ],
    rewardRules: {
      rewardExpiryMinutes: 20,
      purchaseRequired: false,
      availableAfterHours: 0,
      availabilityDurationDays: 14,
      isWinningEveryTime: true,
    },
    prizes: [
      {
        id: "smoke-prize-unlimited",
        label: "Café offert",
        totalQuantity: null,
        probability: 100,
        estimatedUnitCost: 2,
        usageConditions: "Valable une seule fois, hors livraison.",
      },
    ],
  };
}

async function cleanupSmokeCampaign() {
  if (!merchantId || keepCampaign) return;

  try {
    await purgeE2eCampaigns();
  } catch (error) {
    throw new Error(
      `Nettoyage E2E impossible: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function main() {
  assert(email && password, "Définissez OKADO_E2E_EMAIL et OKADO_E2E_PASSWORD avant de lancer le smoke critique.");
  assert(leadEmail, "Définissez OKADO_SMOKE_LEAD_EMAIL pour remplacer l'adresse Resend de test.");
  console.log(`Smoke Okado: ${baseUrl}`);

  const signIn = await request("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const merchant = signIn.body?.merchant;
  assert(merchant?.id, "Connexion OK mais marchand introuvable dans la réponse.");
  merchantId = merchant.id;
  console.log(`✓ Connexion marchand: ${merchant.companyName}`);

  await purgeE2eCampaigns();

  await request("/");
  await request("/campaigns");
  console.log("✓ Navigation dashboard/campagnes");

  const locations = await request("/api/merchant/locations");
  assert(Array.isArray(locations.body?.locations), "Liste des sites invalide.");
  assert(locations.body.locations.length >= 1, "Aucun site marchand disponible.");
  console.log(`✓ Périmètre site: ${locations.body.locations.length} site(s)`);

  const library = await request("/api/campaigns");
  assert(Array.isArray(library.body?.campaigns), "Liste campagnes invalide.");
  console.log(`✓ Liste campagnes: ${library.body.campaigns.length} élément(s)`);

  const created = await request("/api/campaigns/setup", {
    method: "POST",
    body: JSON.stringify(campaignPayload(merchant)),
  });
  const campaignId = created.body?.campaign?.campaign?.id;
  assert(campaignId, "Création campagne sans identifiant.");
  console.log(`✓ Création campagne: ${campaignId}`);

  await request(`/api/campaigns/${campaignId}`);
  await request(`/campaign/${campaignId}`, { headers: { Accept: "text/html" } });
  await request(`/api/public/campaign/${campaignId}`);
  console.log("✓ Publication page de jeu");

  await request(`/api/campaigns/${campaignId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive: false }),
  });
  let pausedCampaignBlocked = false;
  try {
    await request(`/api/public/campaign/${campaignId}`);
  } catch {
    pausedCampaignBlocked = true;
  }
  assert(pausedCampaignBlocked, "Une animation en pause reste accessible publiquement.");
  await request(`/api/campaigns/${campaignId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive: true }),
  });
  console.log("✓ Pause publique et réactivation contrôlées");

  const drawSession = await request("/api/public/draw/session", {
    method: "POST",
    body: JSON.stringify({ campaignId }),
  });
  const sessionId = drawSession.body?.session?.id;
  assert(sessionId, "Session de jeu non créée.");
  console.log(`✓ Session de jeu: ${sessionId}`);

  const finalized = await request("/api/public/draw/finalize", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      firstName: "Smoke",
      email: leadEmail,
      marketingConsent: true,
    }),
  });
  const lead = finalized.body?.lead;
  assert(lead?.id, "Participation non enregistrée.");
  assert(lead?.prizeId, "Le smoke test attend un lot gagnant.");
  assert(lead?.redemptionCode, "Code de retrait manquant.");
  console.log(`✓ Gain client: ${lead.redemptionCode}`);
  await assertTestRewardEmail(lead.id);

  let duplicateFinalizeBlocked = false;
  try {
    await request("/api/public/draw/finalize", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        firstName: "Smoke",
        email: leadEmail,
        marketingConsent: true,
      }),
    });
  } catch {
    duplicateFinalizeBlocked = true;
  }
  assert(duplicateFinalizeBlocked, "La finalisation multiple d'une même session n'est pas bloquée.");
  console.log("✓ Finalisation multiple bloquée");

  await request(`/api/public/redeem/${encodeURIComponent(lead.redemptionCode)}/qr`, {
    headers: { Accept: "image/svg+xml" },
  });
  await request(`/redeem/${encodeURIComponent(lead.redemptionCode)}`, {
    headers: { Accept: "text/html" },
  });
  console.log("✓ QR code et page retrait");

  await request(`/api/merchant/leads?campaign=${encodeURIComponent(campaignId)}`);
  const cashierLookup = await request("/api/merchant/cashier/lookup", {
    method: "POST",
    body: JSON.stringify({ code: lead.redemptionCode }),
  });
  assert(cashierLookup.body?.context?.status === "available", "Le code caisse devrait être valide.");
  const cashierRedeem = await request("/api/merchant/cashier/redeem", {
    method: "POST",
    body: JSON.stringify({
      leadId: lead.id,
      purchaseConfirmed: false,
      idempotencyKey: `smoke-cashier-${Date.now()}`,
    }),
  });
  assert(cashierRedeem.body?.context?.status === "redeemed", "Le retrait caisse n'est pas confirmé.");
  console.log("✓ Retrait vendeur");

  let doubleRedeemBlocked = false;
  try {
    await request("/api/merchant/cashier/redeem", {
      method: "POST",
      body: JSON.stringify({
        leadId: lead.id,
        purchaseConfirmed: false,
        idempotencyKey: `smoke-cashier-double-${Date.now()}`,
      }),
    });
  } catch {
    doubleRedeemBlocked = true;
  }
  assert(doubleRedeemBlocked, "Le retrait multiple n'est pas bloqué.");
  console.log("✓ Retrait multiple bloqué");

  const scratchCreated = await request("/api/campaigns/setup", {
    method: "POST",
    body: JSON.stringify(campaignPayload(merchant, "scratch")),
  });
  const scratchCampaignId = scratchCreated.body?.campaign?.campaign?.id;
  assert(scratchCampaignId, "Création du ticket à gratter sans identifiant.");
  const scratchSession = await request("/api/public/draw/session", {
    method: "POST",
    body: JSON.stringify({ campaignId: scratchCampaignId }),
  });
  const scratchSessionId = scratchSession.body?.session?.id;
  assert(scratchSessionId, "Session du ticket à gratter non créée.");
  const scratchFinalized = await request("/api/public/draw/finalize", {
    method: "POST",
    body: JSON.stringify({
      sessionId: scratchSessionId,
      firstName: "Smoke Scratch",
      email: leadEmail,
      marketingConsent: false,
    }),
  });
  assert(scratchFinalized.body?.lead?.id, "Participation du ticket à gratter non enregistrée.");
  console.log("✓ Parcours ticket à gratter");

  await cleanupSmokeCampaign();
  console.log("Smoke critique terminé avec succès.");
}

main().catch((error) => {
  cleanupSmokeCampaign().finally(() => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
});
