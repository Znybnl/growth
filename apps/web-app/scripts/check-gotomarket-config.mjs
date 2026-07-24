import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const args = new Set(process.argv.slice(2));
const shouldCheckLive = args.has("--live") || process.env.OKADO_CHECK_LIVE === "true";
const productionUrl = process.env.OKADO_PRODUCTION_URL ?? "https://app.okado.app";

function loadDotenvLocal() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readEnv(name) {
  return process.env[name]?.trim() ?? "";
}

function pushIssue(list, level, message, hint) {
  list.push({ level, message, hint });
}

function getEmailDomain(value) {
  const match = value.match(/<([^>]+)>/)?.[1] ?? value;
  const domain = match.split("@")[1]?.replace(/[>\s]/g, "").toLowerCase();
  return domain || "";
}

function assertUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

async function checkLiveEndpoint(issues) {
  const targets = [
    `${productionUrl}/connexion`,
    `${productionUrl}/campaigns`,
  ];

  for (const target of targets) {
    try {
      const response = await fetch(target, { redirect: "manual" });
      if (![200, 302, 307, 308].includes(response.status)) {
        pushIssue(
          issues,
          "error",
          `Endpoint production inattendu: ${target} retourne ${response.status}.`,
          "Verifier le domaine Vercel et les redirections d'authentification.",
        );
      }
    } catch (error) {
      const cause =
        error instanceof Error && "cause" in error && error.cause instanceof Error
          ? ` (${error.cause.message})`
          : "";
      pushIssue(
        issues,
        "error",
        `Endpoint production inaccessible: ${target}.`,
        error instanceof Error
          ? `${error.message}${cause}. Verifier DNS, certificat HTTPS et domaine Vercel depuis un reseau externe.`
          : "Erreur reseau inconnue. Verifier DNS, certificat HTTPS et domaine Vercel.",
      );
    }
  }
}

function checkRequiredEnv(issues) {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "RESEND_WEBHOOK_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_ID_MONTHLY",
    "STRIPE_WEBHOOK_SECRET",
    "GOOGLE_PLACES_API_KEY",
  ];

  for (const name of required) {
    if (!readEnv(name)) {
      pushIssue(issues, "error", `${name} est manquant.`, "Ajouter la variable dans Vercel et .env.local.");
    }
  }
}

function checkConventions(issues) {
  const supabaseUrl = assertUrl(readEnv("NEXT_PUBLIC_SUPABASE_URL"));
  if (!supabaseUrl || !supabaseUrl.hostname.endsWith(".supabase.co")) {
    pushIssue(
      issues,
      "error",
      "NEXT_PUBLIC_SUPABASE_URL ne ressemble pas a une URL Supabase valide.",
      "Valeur attendue du type https://xxxx.supabase.co.",
    );
  }

  const serviceRole = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRole && serviceRole === readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    pushIssue(
      issues,
      "error",
      "SUPABASE_SERVICE_ROLE_KEY est identique a la cle anon publique.",
      "Utiliser la service role key serveur, jamais exposee au navigateur.",
    );
  }

  const from = readEnv("RESEND_FROM_EMAIL");
  const fromDomain = getEmailDomain(from);
  if (from && fromDomain !== "okado.app") {
    pushIssue(
      issues,
      "error",
      `RESEND_FROM_EMAIL utilise le domaine "${fromDomain || "inconnu"}".`,
      "Utiliser une adresse du domaine verifie, par exemple OKADO <noreply@okado.app>.",
    );
  }
  if (from.includes("@resend.dev")) {
    pushIssue(
      issues,
      "error",
      "RESEND_FROM_EMAIL utilise resend.dev, ce qui limite les envois aux emails de test.",
      "Basculer vers une adresse okado.app verifiee dans Resend.",
    );
  }

  const stripeSecret = readEnv("STRIPE_SECRET_KEY");
  const stripePrice = readEnv("STRIPE_PRICE_ID_MONTHLY");
  const stripeWebhook = readEnv("STRIPE_WEBHOOK_SECRET");
  if (stripeSecret && !/^sk_(test|live)_/.test(stripeSecret)) {
    pushIssue(issues, "warning", "STRIPE_SECRET_KEY n'a pas le prefixe Stripe attendu.", "Verifier la cle API Stripe.");
  }
  if (stripePrice && !stripePrice.startsWith("price_")) {
    pushIssue(issues, "error", "STRIPE_PRICE_ID_MONTHLY doit etre un price id Stripe.", "Valeur attendue: price_xxx.");
  }
  if (stripeWebhook && !stripeWebhook.startsWith("whsec_")) {
    pushIssue(
      issues,
      "error",
      "STRIPE_WEBHOOK_SECRET doit etre le secret de signature du webhook.",
      "Valeur attendue: whsec_xxx depuis Stripe Developers > Webhooks.",
    );
  }

  if (readEnv("ALLOW_INSECURE_LOCAL_TLS") === "true" && process.env.NODE_ENV === "production") {
    pushIssue(
      issues,
      "error",
      "ALLOW_INSECURE_LOCAL_TLS ne doit pas etre actif en production.",
      "Supprimer cette variable de l'environnement Production Vercel.",
    );
  }

  const posthogKey = readEnv("NEXT_PUBLIC_POSTHOG_KEY");
  const posthogHost = readEnv("NEXT_PUBLIC_POSTHOG_HOST");
  if (!posthogKey) {
    pushIssue(
      issues,
      "warning",
      "NEXT_PUBLIC_POSTHOG_KEY est manquant.",
      "Ajouter la cle projet PostHog EU dans Vercel pour activer l'analytics produit.",
    );
  }
  if (posthogHost && posthogHost !== "https://eu.i.posthog.com") {
    pushIssue(
      issues,
      "warning",
      `NEXT_PUBLIC_POSTHOG_HOST vaut "${posthogHost}".`,
      "Pour la region EU, la valeur attendue est https://eu.i.posthog.com.",
    );
  }
}

function checkSecurityHardeningFiles(issues) {
  const repoRoot = path.resolve(root, "../..");
  const migrationPath = path.join(
    repoRoot,
    "supabase",
    "migrations",
    "20260710_security_p0_hardening.sql",
  );
  const publicSecurityStorePath = path.join(root, "src", "lib", "public-security-store.ts");
  const expressRedeemRoutePath = path.join(
    root,
    "src",
    "app",
    "api",
    "public",
    "redeem",
    "[code]",
    "route.ts",
  );

  if (!fs.existsSync(migrationPath)) {
    pushIssue(
      issues,
      "error",
      "Migration P0 sécurité introuvable.",
      "Ajouter et jouer supabase/migrations/20260710_security_p0_hardening.sql.",
    );
    return;
  }

  const migration = fs.readFileSync(migrationPath, "utf8");
  for (const expected of [
    "enable row level security",
    "public.public_rate_limits",
    "public.daily_participation_locks",
    "consume_public_rate_limit",
    "claim_daily_participation_lock",
  ]) {
    if (!migration.includes(expected)) {
      pushIssue(
        issues,
        "error",
        `Migration P0 sécurité incomplète: ${expected} absent.`,
        "Vérifier la migration de durcissement avant go-live.",
      );
    }
  }

  if (!fs.existsSync(publicSecurityStorePath)) {
    pushIssue(
      issues,
      "error",
      "Helper de rate-limit persistant introuvable.",
      "Restaurer src/lib/public-security-store.ts.",
    );
  }

  const redemptionPinMigrationPath = path.join(
    repoRoot,
    "supabase",
    "migrations",
    "20260723_redemption_pin.sql",
  );
  if (!fs.existsSync(redemptionPinMigrationPath)) {
    pushIssue(
      issues,
      "error",
      "Migration PIN de retrait introuvable.",
      "Ajouter et jouer supabase/migrations/20260723_redemption_pin.sql.",
    );
  } else if (!fs.readFileSync(redemptionPinMigrationPath, "utf8").includes("redemption_pin_hash")) {
    pushIssue(
      issues,
      "error",
      "Migration PIN de retrait incomplète: redemption_pin_hash absent.",
      "Vérifier la migration avant go-live.",
    );
  }

  const queryIndexesMigrationPath = path.join(
    repoRoot,
    "supabase",
    "migrations",
    "20260723_phase0_query_indexes.sql",
  );
  if (!fs.existsSync(queryIndexesMigrationPath)) {
    pushIssue(
      issues,
      "error",
      "Migration des index Phase 0 introuvable.",
      "Ajouter et jouer supabase/migrations/20260723_phase0_query_indexes.sql.",
    );
  } else {
    const queryIndexesMigration = fs.readFileSync(queryIndexesMigrationPath, "utf8");
    for (const expected of ["reward_email_deliveries_campaign_status_idx", "leads_campaign_status_prize_idx"]) {
      if (!queryIndexesMigration.includes(expected)) {
        pushIssue(
          issues,
          "error",
          `Migration des index Phase 0 incomplète: ${expected} absent.`,
          "Vérifier la migration des index avant go-live.",
        );
      }
    }
  }

  if (!fs.existsSync(expressRedeemRoutePath)) {
    pushIssue(
      issues,
      "error",
      "Route de retrait express introuvable.",
      "Restaurer la validation publique du code et du PIN commerçant.",
    );
  } else if (!fs.readFileSync(expressRedeemRoutePath, "utf8").includes("assertPersistentPublicRateLimit")) {
    pushIssue(
      issues,
      "error",
      "La validation express n'utilise pas le rate limit persistant.",
      "Ne pas ouvrir le retrait PIN sur un rate limit en mémoire.",
    );
  }
}

function printReport(issues) {
  console.log("\nOkado Go-To-Market technical check");
  console.log("==================================\n");

  if (issues.length === 0) {
    console.log("OK - Configuration critique coherente.");
    console.log("\nA verifier manuellement avant go-live:");
    console.log("- Supabase Auth > Site URL: https://app.okado.app");
    console.log("- Supabase Auth > Redirect URLs: https://app.okado.app/api/auth/google/callback");
    console.log("- Google OAuth > Authorized redirect URI: https://aeespnvqrfgzuuhchnnp.supabase.co/auth/v1/callback");
    console.log("- Stripe webhook production: https://app.okado.app/api/webhooks/stripe");
    console.log("- Resend webhook production: https://app.okado.app/api/webhooks/resend");
    console.log("- Backup Supabase exporte avant les premiers clients pilotes.");
    return;
  }

  for (const [index, issue] of issues.entries()) {
    const prefix = issue.level === "error" ? "ERROR" : "WARN";
    console.log(`${index + 1}. [${prefix}] ${issue.message}`);
    if (issue.hint) {
      console.log(`   -> ${issue.hint}`);
    }
  }

  const errors = issues.filter((issue) => issue.level === "error").length;
  console.log(`\nResultat: ${errors} erreur(s), ${issues.length - errors} avertissement(s).`);
  if (errors > 0) {
    process.exitCode = 1;
  }
}

loadDotenvLocal();
const issues = [];
checkRequiredEnv(issues);
checkConventions(issues);
checkSecurityHardeningFiles(issues);

if (shouldCheckLive) {
  await checkLiveEndpoint(issues);
}

printReport(issues);
