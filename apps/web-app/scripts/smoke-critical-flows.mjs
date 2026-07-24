#!/usr/bin/env node

const baseUrl = process.env.OKADO_SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.OKADO_SMOKE_EMAIL ?? "camille@maisonsora.fr";
const password = process.env.OKADO_SMOKE_PASSWORD ?? "demo1234";
const leadEmail =
  process.env.OKADO_SMOKE_LEAD_EMAIL ??
  `okado-smoke-${Date.now()}@example.com`;
const keepCampaign = process.env.OKADO_SMOKE_KEEP_CAMPAIGN === "true";

const cookieJar = new Map();
let createdCampaignId = null;

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

function campaignPayload(merchant) {
  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  const companyName = merchant.companyName || "Okado Smoke";
  const googleReviewUrl =
    merchant.googleReviewUrl ||
    "https://search.google.com/local/writereview?placeid=ChIJ48Wnhvdk5kcRX-CQ1DqPlqs";

  return {
    merchantId: merchant.id,
    title: `Smoke test ${suffix}`,
    subtitle: "Test automatisé Okado.",
    goalType: "review_prompt",
    ctaLabel: "Je participe",
    successMetric: "Clics vers avis",
    targetUrl: googleReviewUrl,
    isActive: true,
    gameType: "wheel",
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
        subject: "Votre cadeau est disponible",
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
  if (!createdCampaignId || keepCampaign) return;

  try {
    await request(`/api/campaigns/${createdCampaignId}`, { method: "DELETE" });
    console.log(`✓ Nettoyage campagne smoke: ${createdCampaignId}`);
    createdCampaignId = null;
  } catch (error) {
    try {
      await request(`/api/campaigns/${createdCampaignId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      console.log(`✓ Campagne smoke archivée: ${createdCampaignId}`);
      createdCampaignId = null;
    } catch (archiveError) {
      console.warn(
        `Nettoyage campagne smoke impossible (${createdCampaignId}): ${
          archiveError instanceof Error ? archiveError.message : error
        }`,
      );
    }
  }
}

async function main() {
  console.log(`Smoke Okado: ${baseUrl}`);

  const signIn = await request("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const merchant = signIn.body?.merchant;
  assert(merchant?.id, "Connexion OK mais marchand introuvable dans la réponse.");
  console.log(`✓ Connexion marchand: ${merchant.companyName}`);

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
  createdCampaignId = campaignId;
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

  await cleanupSmokeCampaign();
  console.log("Smoke critique terminé avec succès.");
}

main().catch((error) => {
  cleanupSmokeCampaign().finally(() => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
});
