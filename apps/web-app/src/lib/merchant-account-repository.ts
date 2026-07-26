import { hashPassword, verifyPassword } from "@/lib/passwords";
import { getStripeClient } from "@/lib/stripe";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  Merchant,
  MerchantAccountSettingsInput,
  MerchantBillingSummary,
  MerchantWorkspace,
  MerchantWorkspaceRole,
  MerchantOnboardingInput,
  MerchantSignInInput,
  MerchantSignUpInput,
  MerchantSubscriptionStatus,
  MerchantUser,
} from "@/lib/types";
import { getMerchantBillingSummary } from "@/lib/billing";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import Stripe from "stripe";

type MerchantRow = {
  id: string;
  workspace_id?: string | null;
  location_code?: string | null;
  location_status?: "active" | "archived" | null;
  time_zone?: string | null;
  company_name: string;
  logo_text: string;
  logo_url: string | null;
  industry: string | null;
  restaurant_type: string | null;
  city: string | null;
  address: string | null;
  contact_name: string | null;
  phone: string | null;
  restaurant_email: string | null;
  website_url: string | null;
  onboarding_completed: boolean | null;
  preferred_goals: string[] | null;
  diffusion_support: string[] | null;
  google_review_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  tripadvisor_url: string | null;
  custom_link_url: string | null;
  default_prize_cost: number | null;
  redemption_pin_hash?: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: MerchantSubscriptionStatus | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
  created_at: string;
};

type MerchantUserRow = {
  id: string;
  merchant_id: string;
  workspace_id?: string | null;
  role?: MerchantWorkspaceRole | null;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

type GoogleMerchantProfile = {
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
};

type AuthSyncInput = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  merchantId: string;
  merchantUserId: string;
  authProvider?: "google" | "email";
  avatarUrl?: string;
};

type AuthIdentityInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

const DEMO_MERCHANT_LOGIN = {
  email: "camille@maisonsora.fr",
  password: "demo1234",
} as const;

const DEMO_MERCHANT_PROFILE = {
  merchantId: "merchant-maison-sora",
  merchantUserId: "user-maison-sora-admin",
  companyName: "Maison Sora",
  logoText: "MS",
  industry: "Mode et maison",
  restaurantType: "Brasserie",
  city: "Paris Marais",
  address: "12 rue du Marais, 75004 Paris",
  contactName: "Pierre-Henri Brunelle",
  phone: "01 40 00 00 00",
  restaurantEmail: "contact@maisonsora.fr",
  websiteUrl: "https://maisonsora.fr",
  onboardingCompleted: true,
  preferredGoals: ["Avis Google", "Collecte CRM"],
  diffusionSupport: ["QR code vitrine et comptoir", "Script √©quipe magasin"],
  googleReviewUrl: "https://g.page/r/CampaignReview",
  instagramUrl: "https://instagram.com/maisonsora",
  facebookUrl: "https://facebook.com/maisonsora",
  tiktokUrl: "https://tiktok.com/@maisonsora",
  tripadvisorUrl: "https://tripadvisor.com/",
  customLinkUrl: "",
  defaultPrizeCost: 3.4,
  firstName: "Pierre-Henri",
  lastName: "Brunelle",
  createdAt: "2026-06-01T08:00:00.000Z",
} as const;

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function ensureMerchantWorkspaceRecord(input: {
  workspaceId: string;
  name: string;
  createdAt: string;
  timeZone?: string;
}) {
  try {
    const result = await getSupabaseAdmin().from("merchant_workspaces").upsert({
      id: input.workspaceId,
      name: input.name,
      slug: input.workspaceId,
      default_time_zone: input.timeZone ?? "Europe/Paris",
      created_at: input.createdAt,
    });
    return !result.error;
  } catch {
    return false;
  }
}

function isDuplicateAuthUserError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already been registered") || normalized.includes("already exists");
}

async function findSupabaseAuthUserByEmailOrMerchantUserId(
  email: string,
  merchantUserId: string,
) {
  const supabase = getSupabaseAdmin();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error("Lecture des utilisateurs Supabase Auth impossible.");
    }

    const users = data.users ?? [];
    const match =
      users.find(
        (user) =>
          user.email?.toLowerCase() === email ||
          user.app_metadata?.merchant_user_id === merchantUserId,
      ) ?? null;

    if (match) {
      return match;
    }

    if (users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function ensureSupabaseAuthUser(input: AuthSyncInput) {
  const supabase = getSupabaseAdmin();
  const email = input.email.trim().toLowerCase();
  const existingUser = await findSupabaseAuthUserByEmailOrMerchantUserId(
    email,
    input.merchantUserId,
  );

  const existingProvider =
    existingUser?.app_metadata?.auth_provider ?? existingUser?.app_metadata?.provider;
  const appMetadata = {
    merchant_id: input.merchantId,
    merchant_user_id: input.merchantUserId,
    source: "okado-merchant",
    auth_provider: input.authProvider ?? existingProvider ?? "email",
  };
  const userMetadata = {
    first_name: input.firstName,
    last_name: input.lastName,
    full_name: `${input.firstName} ${input.lastName}`.trim(),
    ...(input.avatarUrl
      ? { avatar_url: input.avatarUrl }
      : typeof existingUser?.user_metadata?.avatar_url === "string"
        ? { avatar_url: existingUser.user_metadata.avatar_url }
        : {}),
  };

  if (existingUser) {
    const updatePayload: {
      app_metadata: typeof appMetadata;
      email?: string;
      password?: string;
      user_metadata: typeof userMetadata;
    } = {
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    };

    if (existingUser.email?.toLowerCase() !== email) {
      updatePayload.email = email;
    }

    if (input.password) {
      updatePayload.password = input.password;
    }

    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, updatePayload);

    if (error) {
      throw new Error("Mise a jour de l'utilisateur Supabase Auth impossible.");
    }

    return existingUser.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password ?? crypto.randomUUID(),
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });

  if (error) {
    if (isDuplicateAuthUserError(error.message)) {
      const duplicateUser = await findSupabaseAuthUserByEmailOrMerchantUserId(
        email,
        input.merchantUserId,
      );

      if (duplicateUser) {
        return duplicateUser.id;
      }
    }

    throw new Error("Creation de l'utilisateur Supabase Auth impossible.");
  }

  return data.user.id;
}

async function createSupabaseAuthIdentity(input: AuthIdentityInput) {
  const supabase = getSupabaseAdmin();
  const email = input.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: {
      source: "okado-merchant",
    },
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: `${input.firstName} ${input.lastName}`.trim(),
    },
  });

  if (error || !data.user) {
    if (error && isDuplicateAuthUserError(error.message)) {
      throw new Error("Un compte existe deja avec cette adresse e-mail.");
    }

    throw new Error("Creation de l'utilisateur Supabase Auth impossible.");
  }

  return data.user.id;
}

async function deleteSupabaseAuthUserById(authUserId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.deleteUser(authUserId);

  if (error) {
    throw new Error("Suppression de l'utilisateur Supabase Auth impossible.");
  }
}

function toMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    locationCode: row.location_code ?? undefined,
    locationStatus: row.location_status ?? "active",
    companyName: row.company_name,
    logoText: row.logo_text,
    logoUrl: row.logo_url ?? undefined,
    industry: row.industry ?? undefined,
    restaurantType: row.restaurant_type ?? undefined,
    city: row.city ?? undefined,
    address: row.address ?? undefined,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
    restaurantEmail: row.restaurant_email ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    onboardingCompleted: row.onboarding_completed ?? false,
    preferredGoals: row.preferred_goals ?? [],
    diffusionSupport: row.diffusion_support ?? [],
    googleReviewUrl: row.google_review_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    facebookUrl: row.facebook_url ?? undefined,
    tiktokUrl: row.tiktok_url ?? undefined,
    tripadvisorUrl: row.tripadvisor_url ?? undefined,
    customLinkUrl: row.custom_link_url ?? undefined,
    timeZone: row.time_zone ?? undefined,
    defaultPrizeCost: row.default_prize_cost ?? undefined,
    redemptionPinConfigured: Boolean(row.redemption_pin_hash),
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    stripeSubscriptionStatus: row.stripe_subscription_status ?? undefined,
    trialStartDate: row.trial_start_date ?? undefined,
    trialEndDate: row.trial_end_date ?? undefined,
    subscriptionCurrentPeriodEnd: row.subscription_current_period_end ?? undefined,
    subscriptionCancelAtPeriodEnd: row.subscription_cancel_at_period_end ?? false,
    createdAt: row.created_at,
  };
}

function toMerchantUser(row: MerchantUserRow): MerchantUser {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    workspaceId: row.workspace_id ?? undefined,
    role: row.role ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    password: "",
    createdAt: row.created_at,
  };
}

export async function getSupabaseMerchantProfile(merchantId: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .single<MerchantRow>();

  if (error || !data) {
    return null;
  }

  return toMerchant(data);
}

export async function verifySupabaseMerchantRedemptionPin(merchantId: string, pin: string) {
  if (!/^\d{4,6}$/.test(pin)) return false;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("merchants")
    .select("redemption_pin_hash")
    .eq("id", merchantId)
    .maybeSingle<{ redemption_pin_hash: string | null }>();

  if (error || !data?.redemption_pin_hash) return false;
  return verifyPassword(pin, data.redemption_pin_hash);
}

export async function getSupabaseMerchantUser(userId: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("merchant_users")
    .select("*")
    .eq("id", userId)
    .single<MerchantUserRow>();

  if (error || !data) {
    return null;
  }

  return toMerchantUser(data);
}

export async function getSupabaseMerchantUserByEmail(email: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("merchant_users")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle<MerchantUserRow>();

  if (error || !data) {
    return null;
  }

  return toMerchantUser(data);
}

export async function resolveMerchantSessionFromAuthUser(
  authUser: Pick<SupabaseAuthUser, "email" | "app_metadata" | "user_metadata">,
  activeLocationId?: string,
) {
  const merchantUserId =
    typeof authUser.app_metadata?.merchant_user_id === "string"
      ? authUser.app_metadata.merchant_user_id
      : null;
  let merchantUser = merchantUserId ? await getSupabaseMerchantUser(merchantUserId) : null;

  if (!merchantUser && authUser.email) {
    merchantUser = await getSupabaseMerchantUserByEmail(authUser.email);
  }

  if (!merchantUser) {
    throw new Error("Compte marchand introuvable.");
  }

  if (!merchantUserId || merchantUserId !== merchantUser.id) {
    await ensureSupabaseAuthUser({
      email: merchantUser.email,
      firstName: merchantUser.firstName,
      lastName: merchantUser.lastName,
      merchantId: merchantUser.merchantId,
      merchantUserId: merchantUser.id,
    });
  }

  const merchant = await getSupabaseMerchantProfile(merchantUser.merchantId);

  if (!merchant) {
    throw new Error("Marchand introuvable.");
  }

  const workspaceContext = await getSupabaseMerchantWorkspaceContext(merchantUser.id, merchant);
  const activeLocation =
    workspaceContext.locations.find(({ merchant: location }) => location.id === activeLocationId)?.merchant ??
    workspaceContext.locations.find(({ merchant: location }) => location.id === merchant.id)?.merchant ??
    merchant;
  const activeMerchant: Merchant = {
    ...activeLocation,
    // Stripe/trial data remains backward-compatible on the original account
    // while the workspace billing migration is rolled out.
    stripeCustomerId: activeLocation.stripeCustomerId ?? merchant.stripeCustomerId,
    stripeSubscriptionId: activeLocation.stripeSubscriptionId ?? merchant.stripeSubscriptionId,
    stripeSubscriptionStatus:
      activeLocation.stripeSubscriptionStatus ?? merchant.stripeSubscriptionStatus,
    trialStartDate: activeLocation.trialStartDate ?? merchant.trialStartDate,
    trialEndDate: activeLocation.trialEndDate ?? merchant.trialEndDate,
    subscriptionCurrentPeriodEnd:
      activeLocation.subscriptionCurrentPeriodEnd ?? merchant.subscriptionCurrentPeriodEnd,
    subscriptionCancelAtPeriodEnd:
      activeLocation.subscriptionCancelAtPeriodEnd ?? merchant.subscriptionCancelAtPeriodEnd,
  };
  const activeRole =
    workspaceContext.locations.find(({ merchant: location }) => location.id === activeLocation.id)?.role ??
    "owner";

  const authProvider: MerchantUser["authProvider"] =
    authUser.app_metadata?.auth_provider === "google" ||
    authUser.app_metadata?.provider === "google"
      ? "google"
      : "email";
  const avatarUrl =
    authProvider === "gÁù<∂âûÀk∫wµÁ@ÄÄÄÄÄπΩ…ëï»†âç…ïÖ—ïë}Ö–à∞ÅÏÅÖÕçïπë•πúËÅ—…’îÅÙ§(ÄÄÄÄÄÄπ±•µ•–†ƒ§(ÄÄÄÄÄÄπµÖÂâïM•πù±îÒÏÅ•êËÅÕ—…•πúÏÅ›Ω…≠Õ¡Öçï}•êËÅÕ—…•πúÏÅ…Ω±îËÅ5ï…ç°Öπ—]Ω…≠Õ¡ÖçïIΩ±îÏÅÕ—Ö—’ÃËÅÕ—…•πúÅÙ¯†§Ï((ÄÄÄÅ•òÄ°µïµâï…Õ°•¡E’ï…‰πï……Ω»ÅÒÄÖµïµâï…Õ°•¡E’ï…‰πëÖ—Ñ§ÅÏ(ÄÄÄÄÄÅ…ï—’…∏ÅÏ(ÄÄÄÄÄÄÄÅ›Ω…≠Õ¡ÖçîËÅ’πëïô•πïê∞(ÄÄÄÄÄÄÄÅ±ΩçÖ—•ΩπÃËÅmÏÅµï…ç°Öπ–ËÅôÖ±±âÖç≠5ï…ç°Öπ–∞Å…Ω±îËÄâΩ›πï»àÅÖÃÅçΩπÕ–Åıt∞(ÄÄÄÄÄÅÙÏ(ÄÄÄÅÙ((ÄÄÄÅçΩπÕ–Åµïµâï…Õ°•¿ÄÙÅµïµâï…Õ°•¡E’ï…‰πëÖ—ÑÏ(ÄÄÄÅçΩπÕ–ÅmÏÅëÖ—ÑËÅ›Ω…≠Õ¡ÖçïIΩ‹ÅÙ∞ÅÏÅëÖ—ÑËÅ±ΩçÖ—•ΩπIΩ›ÃÅıtÄÙÅÖ›Ö•–ÅA…Ωµ•ÕîπÖ±∞°l(ÄÄÄÄÄÅÕ’¡ÖâÖÕî(ÄÄÄÄÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}›Ω…≠Õ¡ÖçïÃà§(ÄÄÄÄÄÄÄÄπÕï±ïç–†â•ê∞ÅπÖµî∞ÅÕ±’ú∞ÅëïôÖ’±—}—•µï}ÈΩπî∞Åç…ïÖ—ïë}Ö–à§(ÄÄÄÄÄÄÄÄπïƒ†â•êà∞Åµïµâï…Õ°•¿π›Ω…≠Õ¡Öçï}•ê§(ÄÄÄÄÄÄÄÄπµÖÂâïM•πù±îÒ5ï…ç°Öπ—]Ω…≠Õ¡ÖçïIΩ‹¯†§∞(ÄÄÄÄÄÅÕ’¡ÖâÖÕî(ÄÄÄÄÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}µïµâï…Õ°•¡}±ΩçÖ—•ΩπÃà§(ÄÄÄÄÄÄÄÄπÕï±ïç–†âµï…ç°Öπ—}•êà§(ÄÄÄÄÄÄÄÄπïƒ†âµïµâï…Õ°•¡}•êà∞Åµïµâï…Õ°•¿π•ê§∞(ÄÄÄÅt§Ï((ÄÄÄÅçΩπÕ–Å±ΩçÖ—•Ωπ%ëÃÄÙÄ°±ΩçÖ—•ΩπIΩ›ÃÄ¸¸Åmt§πµÖ¿†°…Ω‹§ÄÙ¯Å…Ω‹πµï…ç°Öπ—}•ê§Ï(ÄÄÄÅçΩπÕ–Å¡…Ωô•±ïÃÄÙÅÖ›Ö•–ÅA…Ωµ•ÕîπÖ±∞†(ÄÄÄÄÄÅ±ΩçÖ—•Ωπ%ëÃπµÖ¿†°±ΩçÖ—•Ωπ%ê§ÄÙ¯Åùï—M’¡ÖâÖÕï5ï…ç°Öπ—A…Ωô•±î°±ΩçÖ—•Ωπ%ê§§∞(ÄÄÄÄ§Ï(ÄÄÄÅçΩπÕ–Å±ΩçÖ—•ΩπÃÄÙÅ¡…Ωô•±ïÃ(ÄÄÄÄÄÄπô•±—ï»†°µï…ç°Öπ–§ËÅµï…ç°Öπ–Å•ÃÅ5ï…ç°Öπ–ÄÙ¯Å	ΩΩ±ïÖ∏°µï…ç°Öπ–§§(ÄÄÄÄÄÄπô•±—ï»†°µï…ç°Öπ–§ÄÙ¯Åµï…ç°Öπ–π±ΩçÖ—•ΩπM—Ö—’ÃÄÑÙÙÄâÖ…ç°•Ÿïêà§(ÄÄÄÄÄÄπµÖ¿†°µï…ç°Öπ–§ÄÙ¯Ä°ÏÅµï…ç°Öπ–∞Å…Ω±îËÅµïµâï…Õ°•¿π…Ω±îÅÙ§§Ï((ÄÄÄÅ…ï—’…∏ÅÏ(ÄÄÄÄÄÅ›Ω…≠Õ¡ÖçîËÅ›Ω…≠Õ¡ÖçïIΩ‹Ä¸Å—Ω5ï…ç°Öπ—]Ω…≠Õ¡Öçî°›Ω…≠Õ¡ÖçïIΩ‹§ÄËÅ’πëïô•πïê∞(ÄÄÄÄÄÅ±ΩçÖ—•ΩπÃË(ÄÄÄÄÄÄÄÅ±ΩçÖ—•ΩπÃπ±ïπù—†Ä¯Ä¿(ÄÄÄÄÄÄÄÄÄÄ¸Å±ΩçÖ—•ΩπÃ(ÄÄÄÄÄÄÄÄÄÄËÅmÏÅµï…ç°Öπ–ËÅôÖ±±âÖç≠5ï…ç°Öπ–∞Å…Ω±îËÅµïµâï…Õ°•¿π…Ω±îÅıt∞(ÄÄÄÅÙÏ(ÄÅÙÅçÖ—ç†ÅÏ(ÄÄÄÅ…ï—’…∏ÅÏ(ÄÄÄÄÄÅ›Ω…≠Õ¡ÖçîËÅ’πëïô•πïê∞(ÄÄÄÄÄÅ±ΩçÖ—•ΩπÃËÅmÏÅµï…ç°Öπ–ËÅôÖ±±âÖç≠5ï…ç°Öπ–∞Å…Ω±îËÄâΩ›πï»àÅÖÃÅçΩπÕ–Åıt∞(ÄÄÄÅÙÏ(ÄÅÙ)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏Åç…ïÖ—ïM’¡ÖâÖÕï5ï…ç°Öπ—1ΩçÖ—•Ω∏°•π¡’–ËÅÏ(ÄÅ›Ω…≠Õ¡Öçï%êËÅÕ—…•πúÏ(ÄÅµï…ç°Öπ—UÕï…%êËÅÕ—…•πúÏ(ÄÅçΩµ¡ÖπÂ9ÖµîËÅÕ—…•πúÏ(ÄÅç•—‰ËÅÕ—…•πúÏ(ÄÅÖëë…ïÕÃ¸ËÅÕ—…•πúÏ(ÄÅ—•µïiΩπî¸ËÅÕ—…•πúÏ)Ù§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–Åµïµâï…Õ°•¿ÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}›Ω…≠Õ¡Öçï}µïµâï…Õ°•¡Ãà§(ÄÄÄÄπÕï±ïç–†â•ê∞Å…Ω±îà§(ÄÄÄÄπïƒ†â›Ω…≠Õ¡Öçï}•êà∞Å•π¡’–π›Ω…≠Õ¡Öçï%ê§(ÄÄÄÄπïƒ†âµï…ç°Öπ—}’Õï…}•êà∞Å•π¡’–πµï…ç°Öπ—UÕï…%ê§(ÄÄÄÄπïƒ†âÕ—Ö—’Ãà∞ÄâÖç—•Ÿîà§(ÄÄÄÄπµÖÂâïM•πù±îÒÏÅ•êËÅÕ—…•πúÏÅ…Ω±îËÅ5ï…ç°Öπ—]Ω…≠Õ¡ÖçïIΩ±îÅÙ¯†§Ï((ÄÅ•òÄ°µïµâï…Õ°•¿πï……Ω»ÅÒÄÖµïµâï…Õ°•¿πëÖ—ÑÅÒÄÖlâΩ›πï»à∞ÄâÖëµ•∏âtπ•πç±’ëïÃ°µïµâï…Õ°•¿πëÖ—Ñπ…Ω±î§§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†âYΩ’ÃÅ∏ùÖŸïËÅ¡ÖÃÅ±ïÃÅë…Ω•—ÃÅ¡Ω’»ÅÖ©Ω’—ï»Å’∏ÅÕ•—î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–ÅçΩµ¡ÖπÂ9ÖµîÄÙÅ•π¡’–πçΩµ¡ÖπÂ9Öµîπ—…•¥†§Ï(ÄÅçΩπÕ–Åç•—‰ÄÙÅ•π¡’–πç•—‰π—…•¥†§Ï(ÄÅ•òÄ†ÖçΩµ¡ÖπÂ9ÖµîÅÒÄÖç•—‰§Å—°…Ω‹Åπï‹Å……Ω»†â1îÅπΩ¥Åë‘ÅÕ•—îÅï–Å±ÑÅŸ•±±îÅÕΩπ–Å…ï≈’•Ã∏à§Ï((ÄÅçΩπÕ–Åµï…ç°Öπ—%êÄÙÅùïπï…Ö—ï%ê†âµï…ç°Öπ–à§Ï(ÄÅçΩπÕ–Å±ΩçÖ—•ΩπΩëîÄÙÅÄëÌçΩµ¡ÖπÂ9ÖµîπÕ±•çî†¿∞ÄÃ•Ù¥ëÌç•—‰πÕ±•çî†¿∞ÄÃ•ıÄ(ÄÄÄÄππΩ…µÖ±•Èî†â9à§(ÄÄÄÄπ…ï¡±Öçî†Ωmq‘¿Ã¿¿µq‘¿ÃŸôtΩú∞Äàà§(ÄÄÄÄπ…ï¡±Öçî†ΩmyÑµË¿¥ÂtΩù§∞Äàà§(ÄÄÄÄπ—ΩU¡¡ï…ÖÕî†§(ÄÄÄÄπÕ±•çî†¿∞Ä‡§Ï(ÄÅçΩπÕ–Åç…ïÖ—ïë–ÄÙÅπï‹ÅÖ—î†§π—Ω%M=M—…•πú†§Ï(ÄÅçΩπÕ–Å•πÕï…–ÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπ•πÕï…–°Ï(ÄÄÄÄÄÅ•êËÅµï…ç°Öπ—%ê∞(ÄÄÄÄÄÅ›Ω…≠Õ¡Öçï}•êËÅ•π¡’–π›Ω…≠Õ¡Öçï%ê∞(ÄÄÄÄÄÅ±ΩçÖ—•Ωπ}çΩëîËÅ±ΩçÖ—•ΩπΩëîÅÒÅµï…ç°Öπ—%êπÕ±•çî†¥ÿ§π—ΩU¡¡ï…ÖÕî†§∞(ÄÄÄÄÄÅ±ΩçÖ—•Ωπ}Õ—Ö—’ÃËÄâÖç—•Ÿîà∞(ÄÄÄÄÄÅçΩµ¡ÖπÂ}πÖµîËÅçΩµ¡ÖπÂ9Öµî∞(ÄÄÄÄÄÅ±ΩùΩ}—ï·–ËÅçΩµ¡ÖπÂ9ÖµîπÕ±•çî†¿∞Ä»§π—ΩU¡¡ï…ÖÕî†§∞(ÄÄÄÄÄÅ±ΩùΩ}’…∞ËÅπ’±∞∞(ÄÄÄÄÄÅ•πë’Õ—…‰ËÄàà∞(ÄÄÄÄÄÅ…ïÕ—Ö’…Öπ—}—Â¡îËÄâ	…ÖÕÕï…•îà∞(ÄÄÄÄÄÅç•—‰∞(ÄÄÄÄÄÅÖëë…ïÕÃËÅ•π¡’–πÖëë…ïÕÃ¸π—…•¥†§Ä¸¸Äàà∞(ÄÄÄÄÄÅçΩπ—Öç—}πÖµîËÄàà∞(ÄÄÄÄÄÅ¡°ΩπîËÄàà∞(ÄÄÄÄÄÅ…ïÕ—Ö’…Öπ—}ïµÖ•∞ËÄàà∞(ÄÄÄÄÄÅ›ïâÕ•—ï}’…∞ËÄàà∞(ÄÄÄÄÄÅΩπâΩÖ…ë•πù}çΩµ¡±ï—ïêËÅ—…’î∞(ÄÄÄÄÄÅ¡…ïôï……ïë}ùΩÖ±ÃËÅmt∞(ÄÄÄÄÄÅë•ôô’Õ•Ωπ}Õ’¡¡Ω…–ËÅmt∞(ÄÄÄÄÄÅùΩΩù±ï}…ïŸ•ï›}’…∞ËÄàà∞(ÄÄÄÄÄÅ•πÕ—Öù…Öµ}’…∞ËÄàà∞(ÄÄÄÄÄÅôÖçïâΩΩ≠}’…∞ËÄàà∞(ÄÄÄÄÄÅ—•≠—Ω≠}’…∞ËÄàà∞(ÄÄÄÄÄÅ—…•¡ÖëŸ•ÕΩ…}’…∞ËÄàà∞(ÄÄÄÄÄÅç’Õ—Ωµ}±•π≠}’…∞ËÄàà∞(ÄÄÄÄÄÅëïôÖ’±—}¡…•Èï}çΩÕ–ËÄÃ∞(ÄÄÄÄÄÅ—•µï}ÈΩπîËÅ•π¡’–π—•µïiΩπîÄ¸¸Äâ’…Ω¡îΩAÖ…•Ãà∞(ÄÄÄÄÄÅç…ïÖ—ïë}Ö–ËÅç…ïÖ—ïë–∞(ÄÄÄÅÙ§(ÄÄÄÄπÕï±ïç–†à®à§(ÄÄÄÄπÕ•πù±îÒ5ï…ç°Öπ—IΩ‹¯†§Ï((ÄÅ•òÄ°•πÕï…–πï……Ω»ÅÒÄÖ•πÕï…–πëÖ—Ñ§Å—°…Ω‹Åπï‹Å……Ω»†â1îÅÕ•—îÅ∏ùÑÅ¡ÖÃÅ¡‘É©—…îÅçÀß§∏à§Ï((ÄÅçΩπÕ–Åµïµâï…Õ°•¡ÃÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}›Ω…≠Õ¡Öçï}µïµâï…Õ°•¡Ãà§(ÄÄÄÄπÕï±ïç–†â•ê∞Å…Ω±îà§(ÄÄÄÄπïƒ†â›Ω…≠Õ¡Öçï}•êà∞Å•π¡’–π›Ω…≠Õ¡Öçï%ê§(ÄÄÄÄπ•∏†â…Ω±îà∞ÅlâΩ›πï»à∞ÄâÖëµ•∏ât§Ï(ÄÅ•òÄ°µïµâï…Õ°•¡ÃπëÖ—Ñ¸π±ïπù—†§ÅÏ(ÄÄÄÅÖ›Ö•–ÅÕ’¡ÖâÖÕîπô…Ω¥†âµï…ç°Öπ—}µïµâï…Õ°•¡}±ΩçÖ—•ΩπÃà§π•πÕï…–†(ÄÄÄÄÄÅµïµâï…Õ°•¡ÃπëÖ—ÑπµÖ¿†°•—ï¥§ÄÙ¯Ä°ÏÅµïµâï…Õ°•¡}•êËÅ•—ï¥π•ê∞Åµï…ç°Öπ—}•êËÅµï…ç°Öπ—%êÅÙ§§∞(ÄÄÄÄ§Ï(ÄÅÙ((ÄÅ…ï—’…∏Å—Ω5ï…ç°Öπ–°•πÕï…–πëÖ—Ñ§Ï)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏ÅÖ…ç°•ŸïM’¡ÖâÖÕï5ï…ç°Öπ—1ΩçÖ—•Ω∏°•π¡’–ËÅÏ(ÄÅ›Ω…≠Õ¡Öçï%êËÅÕ—…•πúÏ(ÄÅµï…ç°Öπ—UÕï…%êËÅÕ—…•πúÏ(ÄÅµï…ç°Öπ—%êËÅÕ—…•πúÏ)Ù§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–Åµïµâï…Õ°•¿ÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}›Ω…≠Õ¡Öçï}µïµâï…Õ°•¡Ãà§(ÄÄÄÄπÕï±ïç–†â…Ω±îà§(ÄÄÄÄπïƒ†â›Ω…≠Õ¡Öçï}•êà∞Å•π¡’–π›Ω…≠Õ¡Öçï%ê§(ÄÄÄÄπïƒ†âµï…ç°Öπ—}’Õï…}•êà∞Å•π¡’–πµï…ç°Öπ—UÕï…%ê§(ÄÄÄÄπïƒ†âÕ—Ö—’Ãà∞ÄâÖç—•Ÿîà§(ÄÄÄÄπµÖÂâïM•πù±îÒÏÅ…Ω±îËÅ5ï…ç°Öπ—]Ω…≠Õ¡ÖçïIΩ±îÅÙ¯†§Ï(ÄÅ•òÄ°µïµâï…Õ°•¿πï……Ω»ÅÒÄÖµïµâï…Õ°•¿πëÖ—ÑÅÒÄÖlâΩ›πï»à∞ÄâÖëµ•∏âtπ•πç±’ëïÃ°µïµâï…Õ°•¿πëÖ—Ñπ…Ω±î§§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†âYΩ’ÃÅ∏ùÖŸïËÅ¡ÖÃÅ±ïÃÅë…Ω•—ÃÅ¡Ω’»ÅÖ…ç°•Ÿï»Å’∏ÅÕ•—î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–ÅÖç—•ŸïΩ’π–ÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπÕï±ïç–†â•êà∞ÅÏÅçΩ’π–ËÄâï·Öç–à∞Å°ïÖêËÅ—…’îÅÙ§(ÄÄÄÄπïƒ†â›Ω…≠Õ¡Öçï}•êà∞Å•π¡’–π›Ω…≠Õ¡Öçï%ê§(ÄÄÄÄπïƒ†â±ΩçÖ—•Ωπ}Õ—Ö—’Ãà∞ÄâÖç—•Ÿîà§Ï(ÄÅ•òÄ†°Öç—•ŸïΩ’π–πçΩ’π–Ä¸¸Ä¿§ÄÙÄƒ§Å—°…Ω‹Åπï‹Å……Ω»†âΩπÕï…ŸïËÅÖ‘ÅµΩ•πÃÅ’∏ÅÕ•—îÅÖç—•ò∏à§Ï((ÄÅçΩπÕ–Å’¡ëÖ—ïêÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπ’¡ëÖ—î°ÏÅ±ΩçÖ—•Ωπ}Õ—Ö—’ÃËÄâÖ…ç°•ŸïêàÅÙ§(ÄÄÄÄπïƒ†â•êà∞Å•π¡’–πµï…ç°Öπ—%ê§(ÄÄÄÄπïƒ†â›Ω…≠Õ¡Öçï}•êà∞Å•π¡’–π›Ω…≠Õ¡Öçï%ê§(ÄÄÄÄπÕï±ïç–†à®à§(ÄÄÄÄπµÖÂâïM•πù±îÒ5ï…ç°Öπ—IΩ‹¯†§Ï(ÄÅ•òÄ°’¡ëÖ—ïêπï……Ω»ÅÒÄÖ’¡ëÖ—ïêπëÖ—Ñ§Å—°…Ω‹Åπï‹Å……Ω»†â1îÅÕ•—îÅ∏ùÑÅ¡ÖÃÅ¡‘É©—…îÅÖ…ç°•€§∏à§Ï(ÄÅ…ï—’…∏Å—Ω5ï…ç°Öπ–°’¡ëÖ—ïêπëÖ—Ñ§Ï)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏ÅÕï—5ï…ç°Öπ—M—…•¡ï’Õ—Ωµï…%ë%πM’¡ÖâÖÕî†(ÄÅµï…ç°Öπ—%êËÅÕ—…•πú∞(ÄÅÕ—…•¡ï’Õ—Ωµï…%êËÅÕ—…•πú∞(§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–ÅÏÅï……Ω»ÅÙÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπ’¡ëÖ—î°ÏÅÕ—…•¡ï}ç’Õ—Ωµï…}•êËÅÕ—…•¡ï’Õ—Ωµï…%êÅÙ§(ÄÄÄÄπïƒ†â•êà∞Åµï…ç°Öπ—%ê§Ï((ÄÅ•òÄ°ï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»°Åπ…ïù•Õ—…ïµïπ–Åë‘Åç±•ïπ–ÅM—…•¡îÅ•µ¡ΩÕÕ•â±îËÄëÌï……Ω»πµïÕÕÖùïıÄ§Ï(ÄÅÙ)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏Åô•πë5ï…ç°Öπ—	ÂM—…•¡ï’Õ—Ωµï…%ë%πM’¡ÖâÖÕî°Õ—…•¡ï’Õ—Ωµï…%êËÅÕ—…•πú§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–ÅÏÅëÖ—Ñ∞Åï……Ω»ÅÙÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπÕï±ïç–†à®à§(ÄÄÄÄπïƒ†âÕ—…•¡ï}ç’Õ—Ωµï…}•êà∞ÅÕ—…•¡ï’Õ—Ωµï…%ê§(ÄÄÄÄπµÖÂâïM•πù±îÒ5ï…ç°Öπ—IΩ‹¯†§Ï((ÄÅ•òÄ°ï……Ω»ÅÒÄÖëÖ—Ñ§ÅÏ(ÄÄÄÅ…ï—’…∏Åπ’±∞Ï(ÄÅÙ((ÄÅ…ï—’…∏Å—Ω5ï…ç°Öπ–°ëÖ—Ñ§Ï)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏ÅÕÂπç5ï…ç°Öπ—	•±±•πù…ΩµM—…•¡ï’Õ—Ωµï…%ë%πM’¡ÖâÖÕî†(ÄÅÕ—…•¡ï’Õ—Ωµï…%êËÅÕ—…•πú∞(§ÅÏ(ÄÅçΩπÕ–Åµï…ç°Öπ–ÄÙÅÖ›Ö•–Åô•πë5ï…ç°Öπ—	ÂM—…•¡ï’Õ—Ωµï…%ë%πM’¡ÖâÖÕî°Õ—…•¡ï’Õ—Ωµï…%ê§Ï((ÄÅ•òÄ†Öµï…ç°Öπ–§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†â5Ö…ç°ÖπêÅM—…•¡îÅ•π—…Ω’ŸÖâ±î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–ÅÕ—…•¡îÄÙÅùï—M—…•¡ï±•ïπ–†§Ï(ÄÅçΩπÕ–ÅÕ’âÕç…•¡—•ΩπÃÄÙÅÖ›Ö•–ÅÕ—…•¡îπÕ’âÕç…•¡—•ΩπÃπ±•Õ–°Ï(ÄÄÄÅç’Õ—Ωµï»ËÅÕ—…•¡ï’Õ—Ωµï…%ê∞(ÄÄÄÅÕ—Ö—’ÃËÄâÖ±∞à∞(ÄÄÄÅ±•µ•–ËÄ»¿∞(ÄÅÙ§Ï((ÄÅçΩπÕ–ÅÕ’âÕç…•¡—•Ω∏ÄÙ(ÄÄÄÅÕ’âÕç…•¡—•ΩπÃπëÖ—Ñπô•πê†°•—ï¥§ÄÙ¯(ÄÄÄÄÄÅlâÖç—•Ÿîà∞Äâ—…•Ö±•πúà∞Äâ¡ÖÕ—}ë’îà∞Äâ’π¡Ö•êà∞Äâ•πçΩµ¡±ï—îà∞Äâ¡Ö’Õïêâtπ•πç±’ëïÃ°•—ï¥πÕ—Ö—’Ã§∞(ÄÄÄÄ§Ä¸¸ÅÕ’âÕç…•¡—•ΩπÃπëÖ—Öl¡tÏ((ÄÅ•òÄ†ÖÕ’âÕç…•¡—•Ω∏§ÅÏ(ÄÄÄÅ…ï—’…∏Åµï…ç°Öπ–Ï(ÄÅÙ((ÄÅÖ›Ö•–Å’¡ëÖ—ï5ï…ç°Öπ—	•±±•πù…ΩµM—…•¡ïM’âÕç…•¡—•Ωπ%πM’¡ÖâÖÕî°µï…ç°Öπ–π•ê∞ÅÕ’âÕç…•¡—•Ω∏§Ï(ÄÅ…ï—’…∏Åùï—M’¡ÖâÖÕï5ï…ç°Öπ—A…Ωô•±î°µï…ç°Öπ–π•ê§Ï)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏Å’¡ëÖ—ï5ï…ç°Öπ—	•±±•πù…ΩµM—…•¡ïM’âÕç…•¡—•Ωπ%πM’¡ÖâÖÕî†(ÄÅµï…ç°Öπ—%êËÅÕ—…•πú∞(ÄÅÕ’âÕç…•¡—•Ω∏ËÅM—…•¡îπM’âÕç…•¡—•Ω∏∞(§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–Åç’Õ—Ωµï…%êÄÙ(ÄÄÄÅ—Â¡ïΩòÅÕ’âÕç…•¡—•Ω∏πç’Õ—Ωµï»ÄÙÙÙÄâÕ—…•πúàÄ¸ÅÕ’âÕç…•¡—•Ω∏πç’Õ—Ωµï»ÄËÅÕ’âÕç…•¡—•Ω∏πç’Õ—Ωµï»π•êÏ(ÄÅçΩπÕ–Åç’……ïπ—Aï…•ΩëπëYÖ±’îÄÙÅÕ’âÕç…•¡—•Ω∏π•—ïµÃπëÖ—Ñ(ÄÄÄÄπµÖ¿†°•—ï¥§ÄÙ¯Å•—ï¥πç’……ïπ—}¡ï…•Ωë}ïπê§(ÄÄÄÄπô•±—ï»†°ŸÖ±’î§ËÅŸÖ±’îÅ•ÃÅπ’µâï»ÄÙ¯Å—Â¡ïΩòÅŸÖ±’îÄÙÙÙÄâπ’µâï»à§(ÄÄÄÄπÕΩ…–†°±ïô–∞Å…•ù°–§ÄÙ¯Å±ïô–Ä¥Å…•ù°–•l¡tÏ(ÄÅçΩπÕ–Åç’……ïπ—Aï…•ΩëπêÄÙ(ÄÄÄÅ—Â¡ïΩòÅç’……ïπ—Aï…•ΩëπëYÖ±’îÄÙÙÙÄâπ’µâï»à(ÄÄÄÄÄÄ¸Åπï‹ÅÖ—î°ç’……ïπ—Aï…•ΩëπëYÖ±’îÄ®Äƒ¿¿¿§π—Ω%M=M—…•πú†§(ÄÄÄÄÄÄËÅπ’±∞Ï(ÄÅçΩπÕ–Å—…•Ö±πêÄÙ(ÄÄÄÅ—Â¡ïΩòÅÕ’âÕç…•¡—•Ω∏π—…•Ö±}ïπêÄÙÙÙÄâπ’µâï»à(ÄÄÄÄÄÄ¸Åπï‹ÅÖ—î°Õ’âÕç…•¡—•Ω∏π—…•Ö±}ïπêÄ®Äƒ¿¿¿§π—Ω%M=M—…•πú†§(ÄÄÄÄÄÄËÅπ’±∞Ï(ÄÅçΩπÕ–Å—…•Ö±M—Ö…–ÄÙ(ÄÄÄÅ—Â¡ïΩòÅÕ’âÕç…•¡—•Ω∏π—…•Ö±}Õ—Ö…–ÄÙÙÙÄâπ’µâï»à(ÄÄÄÄÄÄ¸Åπï‹ÅÖ—î°Õ’âÕç…•¡—•Ω∏π—…•Ö±}Õ—Ö…–Ä®Äƒ¿¿¿§π—Ω%M=M—…•πú†§(ÄÄÄÄÄÄËÅπ’±∞Ï((ÄÅçΩπÕ–ÅÏÅï……Ω»ÅÙÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπ’¡ëÖ—î°Ï(ÄÄÄÄÄÅÕ—…•¡ï}ç’Õ—Ωµï…}•êËÅç’Õ—Ωµï…%ê∞(ÄÄÄÄÄÅÕ—…•¡ï}Õ’âÕç…•¡—•Ωπ}•êËÅÕ’âÕç…•¡—•Ω∏π•ê∞(ÄÄÄÄÄÅÕ—…•¡ï}Õ’âÕç…•¡—•Ωπ}Õ—Ö—’ÃËÅÕ’âÕç…•¡—•Ω∏πÕ—Ö—’Ã∞(ÄÄÄÄÄÅ—…•Ö±}Õ—Ö…—}ëÖ—îËÅ—…•Ö±M—Ö…–∞(ÄÄÄÄÄÅ—…•Ö±}ïπë}ëÖ—îËÅ—…•Ö±πê∞(ÄÄÄÄÄÅÕ’âÕç…•¡—•Ωπ}ç’……ïπ—}¡ï…•Ωë}ïπêËÅç’……ïπ—Aï…•Ωëπê∞(ÄÄÄÄÄÅÕ’âÕç…•¡—•Ωπ}çÖπçï±}Ö—}¡ï…•Ωë}ïπêËÅÕ’âÕç…•¡—•Ω∏πçÖπçï±}Ö—}¡ï…•Ωë}ïπê∞(ÄÄÄÅÙ§(ÄÄÄÄπïƒ†â•êà∞Åµï…ç°Öπ—%ê§Ï((ÄÅ•òÄ°ï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»°ÅMÂπç°…Ωπ•ÕÖ—•Ω∏ÅëîÅ∞ùÖâΩππïµïπ–ÅM—…•¡îÅ•µ¡ΩÕÕ•â±îËÄëÌï……Ω»πµïÕÕÖùïıÄ§Ï(ÄÅÙ)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏ÅµÖ…≠5ï…ç°Öπ—M’âÕç…•¡—•ΩπÖπçï±ïë%πM’¡ÖâÖÕî°Õ’âÕç…•¡—•Ωπ%êËÅÕ—…•πú§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–ÅÏÅï……Ω»ÅÙÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπ’¡ëÖ—î°Ï(ÄÄÄÄÄÅÕ—…•¡ï}Õ’âÕç…•¡—•Ωπ}Õ—Ö—’ÃËÄâçÖπçï±ïêà∞(ÄÄÄÄÄÅÕ’âÕç…•¡—•Ωπ}çÖπçï±}Ö—}¡ï…•Ωë}ïπêËÅ—…’î∞(ÄÄÄÅÙ§(ÄÄÄÄπïƒ†âÕ—…•¡ï}Õ’âÕç…•¡—•Ωπ}•êà∞ÅÕ’âÕç…•¡—•Ωπ%ê§Ï((ÄÅ•òÄ°ï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»°ÅK•Õ•±•Ö—•Ω∏ÅM—…•¡îÅ•µ¡ΩÕÕ•â±îÉÄÅïπ…ïù•Õ—…ï»ËÄëÌï……Ω»πµïÕÕÖùïıÄ§Ï(ÄÅÙ)Ù()ï·¡Ω…–Åô’πç—•Ω∏Åùï—5ï…ç°Öπ—	•±±•πùΩ…ççΩ’π–°µï…ç°Öπ–ËÅ5ï…ç°Öπ–§ËÅ5ï…ç°Öπ—	•±±•πùM’µµÖ…‰ÅÏ(ÄÅ…ï—’…∏Åùï—5ï…ç°Öπ—	•±±•πùM’µµÖ…‰°µï…ç°Öπ–§Ï)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏Å’¡ëÖ—ï5ï…ç°Öπ—=πâΩÖ…ë•πù%πM’¡ÖâÖÕî†(ÄÅ’Õï…%êËÅÕ—…•πú∞(ÄÅ•π¡’–ËÅ5ï…ç°Öπ—=πâΩÖ…ë•πù%π¡’–∞(§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–Å’Õï…E’ï…‰ÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}’Õï…Ãà§(ÄÄÄÄπÕï±ïç–†âµï…ç°Öπ—}•êà§(ÄÄÄÄπïƒ†â•êà∞Å’Õï…%ê§(ÄÄÄÄπÕ•πù±îÒÏÅµï…ç°Öπ—}•êËÅÕ—…•πúÅÙ¯†§Ï((ÄÅ•òÄ°’Õï…E’ï…‰πï……Ω»ÅÒÄÖ’Õï…E’ï…‰πëÖ—Ñ§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†âU—•±•ÕÖ—ï’»Å•π—…Ω’ŸÖâ±î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–ÅçΩµ¡ÖπÂ9ÖµîÄÙÅ•π¡’–πçΩµ¡ÖπÂ9Öµîπ—…•¥†§Ï(ÄÅçΩπÕ–Å’¡ëÖ—îÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπ’¡ëÖ—î°Ï(ÄÄÄÄÄÅçΩµ¡ÖπÂ}πÖµîËÅçΩµ¡ÖπÂ9Öµî∞(ÄÄÄÄÄÅ±ΩùΩ}—ï·–ËÅçΩµ¡ÖπÂ9ÖµîπÕ±•çî†¿∞Ä»§π—ΩU¡¡ï…ÖÕî†§∞(ÄÄÄÄÄÅ•πë’Õ—…‰ËÅ•π¡’–π•πë’Õ—…‰π—…•¥†§∞(ÄÄÄÄÄÅ…ïÕ—Ö’…Öπ—}—Â¡îËÅ•π¡’–π…ïÕ—Ö’…Öπ—QÂ¡îπ—…•¥†§∞(ÄÄÄÄÄÅç•—‰ËÅ•π¡’–πç•—‰π—…•¥†§∞(ÄÄÄÄÄÅÖëë…ïÕÃËÅ•π¡’–πÖëë…ïÕÃπ—…•¥†§∞(ÄÄÄÄÄÅçΩπ—Öç—}πÖµîËÅ•π¡’–πçΩπ—Öç—9Öµîπ—…•¥†§∞(ÄÄÄÄÄÅ¡°ΩπîËÅ•π¡’–π¡°Ωπîπ—…•¥†§∞(ÄÄÄÄÄÅ…ïÕ—Ö’…Öπ—}ïµÖ•∞ËÅ•π¡’–π…ïÕ—Ö’…Öπ—µÖ•∞π—…•¥†§π—Ω1Ω›ï…ÖÕî†§∞(ÄÄÄÄÄÅ›ïâÕ•—ï}’…∞ËÅ•π¡’–π›ïâÕ•—ïU…∞π—…•¥†§∞(ÄÄÄÄÄÅëïôÖ’±—}¡…•Èï}çΩÕ–ËÅ•π¡’–πëïôÖ’±—A…•ÈïΩÕ–∞(ÄÄÄÄÄÅ¡…ïôï……ïë}ùΩÖ±ÃËÅ•π¡’–π¡…ïôï……ïëΩÖ±Ã∞(ÄÄÄÄÄÅë•ôô’Õ•Ωπ}Õ’¡¡Ω…–ËÅ•π¡’–πë•ôô’Õ•ΩπM’¡¡Ω…–∞(ÄÄÄÄÄÅùΩΩù±ï}…ïŸ•ï›}’…∞ËÅ•π¡’–πùΩΩù±ïIïŸ•ï›U…∞π—…•¥†§∞(ÄÄÄÄÄÅ•πÕ—Öù…Öµ}’…∞ËÅ•π¡’–π•πÕ—Öù…ÖµU…∞π—…•¥†§∞(ÄÄÄÄÄÅôÖçïâΩΩ≠}’…∞ËÅ•π¡’–πôÖçïâΩΩ≠U…∞π—…•¥†§∞(ÄÄÄÄÄÅ—•≠—Ω≠}’…∞ËÅ•π¡’–π—•≠—Ω≠U…∞π—…•¥†§∞(ÄÄÄÄÄÅ—…•¡ÖëŸ•ÕΩ…}’…∞ËÅ•π¡’–π—…•¡ÖëŸ•ÕΩ…U…∞π—…•¥†§∞(ÄÄÄÄÄÅç’Õ—Ωµ}±•π≠}’…∞ËÅ•π¡’–πç’Õ—Ωµ1•π≠U…∞π—…•¥†§∞(ÄÄÄÄÄÄ∏∏∏°•π¡’–π…ïëïµ¡—•ΩπA•∏Ä¸ÅÏÅ…ïëïµ¡—•Ωπ}¡•π}°ÖÕ†ËÅ°ÖÕ°AÖÕÕ›Ω…ê°•π¡’–π…ïëïµ¡—•ΩπA•∏§ÅÙÄËÅÌÙ§∞(ÄÄÄÄÄÅΩπâΩÖ…ë•πù}çΩµ¡±ï—ïêËÅ—…’î∞(ÄÄÄÅÙ§(ÄÄÄÄπïƒ†â•êà∞Å’Õï…E’ï…‰πëÖ—Ñπµï…ç°Öπ—}•ê§Ï((ÄÅ•òÄ°’¡ëÖ—îπï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†â=πâΩÖ…ë•πúÅ•µ¡ΩÕÕ•â±î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–Åµï…ç°Öπ–ÄÙÅÖ›Ö•–Åùï—M’¡ÖâÖÕï5ï…ç°Öπ—A…Ωô•±î°’Õï…E’ï…‰πëÖ—Ñπµï…ç°Öπ—}•ê§Ï((ÄÅ•òÄ†Öµï…ç°Öπ–§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†â5Ö…ç°ÖπêÅ•π—…Ω’ŸÖâ±î∏à§Ï(ÄÅÙ((ÄÅ…ï—’…∏Åµï…ç°Öπ–Ï)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏Å’¡ëÖ—ï5ï…ç°Öπ—ççΩ’π—%πM’¡ÖâÖÕî†(ÄÅ’Õï…%êËÅÕ—…•πú∞(ÄÅ•π¡’–ËÅ5ï…ç°Öπ—ççΩ’π—Mï——•πùÕ%π¡’–∞(§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–Å’Õï…E’ï…‰ÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}’Õï…Ãà§(ÄÄÄÄπÕï±ïç–†â•ê∞Åµï…ç°Öπ—}•êà§(ÄÄÄÄπïƒ†â•êà∞Å’Õï…%ê§(ÄÄÄÄπÕ•πù±îÒÏÅ•êËÅÕ—…•πúÏÅµï…ç°Öπ—}•êËÅÕ—…•πúÅÙ¯†§Ï((ÄÅ•òÄ°’Õï…E’ï…‰πï……Ω»ÅÒÄÖ’Õï…E’ï…‰πëÖ—Ñ§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†âU—•±•ÕÖ—ï’»Å•π—…Ω’ŸÖâ±î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–ÅïµÖ•∞ÄÙÅ•π¡’–πïµÖ•∞π—…•¥†§π—Ω1Ω›ï…ÖÕî†§Ï(ÄÅçΩπÕ–Åï·•Õ—•πùUÕï»ÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}’Õï…Ãà§(ÄÄÄÄπÕï±ïç–†â•êà§(ÄÄÄÄπïƒ†âïµÖ•∞à∞ÅïµÖ•∞§(ÄÄÄÄππïƒ†â•êà∞Å’Õï…%ê§(ÄÄÄÄπµÖÂâïM•πù±îÒÏÅ•êËÅÕ—…•πúÅÙ¯†§Ï((ÄÅ•òÄ°ï·•Õ—•πùUÕï»πï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†âYï…•ô•çÖ—•Ω∏ÅëîÅ∞ùÖë…ïÕÕîÅîµµÖ•∞Å•µ¡ΩÕÕ•â±î∏à§Ï(ÄÅÙ((ÄÅ•òÄ°ï·•Õ—•πùUÕï»πëÖ—Ñ§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†âï——îÅÖë…ïÕÕîÅîµµÖ•∞ÅïÕ–Åëï©ÑÅ’—•±•Õïî∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–ÅçΩµ¡ÖπÂ9ÖµîÄÙÅ•π¡’–πçΩµ¡ÖπÂ9Öµîπ—…•¥†§Ï(ÄÅçΩπÕ–Åµï…ç°Öπ—U¡ëÖ—îÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—Ãà§(ÄÄÄÄπ’¡ëÖ—î°Ï(ÄÄÄÄÄÅçΩµ¡ÖπÂ}πÖµîËÅçΩµ¡ÖπÂ9Öµî∞(ÄÄÄÄÄÅ±ΩùΩ}—ï·–ËÅçΩµ¡ÖπÂ9ÖµîπÕ±•çî†¿∞Ä»§π—ΩU¡¡ï…ÖÕî†§∞(ÄÄÄÄÄÅ•πë’Õ—…‰ËÅ•π¡’–π•πë’Õ—…‰π—…•¥†§∞(ÄÄÄÄÄÅ…ïÕ—Ö’…Öπ—}—Â¡îËÅ•π¡’–π…ïÕ—Ö’…Öπ—QÂ¡îπ—…•¥†§∞(ÄÄÄÄÄÅç•—‰ËÅ•π¡’–πç•—‰π—…•¥†§∞(ÄÄÄÄÄÅÖëë…ïÕÃËÅ•π¡’–πÖëë…ïÕÃπ—…•¥†§∞(ÄÄÄÄÄÅçΩπ—Öç—}πÖµîËÅ•π¡’–πçΩπ—Öç—9Öµîπ—…•¥†§∞(ÄÄÄÄÄÅ¡°ΩπîËÅ•π¡’–π¡°Ωπîπ—…•¥†§∞(ÄÄÄÄÄÅ…ïÕ—Ö’…Öπ—}ïµÖ•∞ËÅ•π¡’–π…ïÕ—Ö’…Öπ—µÖ•∞π—…•¥†§π—Ω1Ω›ï…ÖÕî†§∞(ÄÄÄÄÄÅ›ïâÕ•—ï}’…∞ËÅ•π¡’–π›ïâÕ•—ïU…∞π—…•¥†§∞(ÄÄÄÄÄÅùΩΩù±ï}…ïŸ•ï›}’…∞ËÅ•π¡’–πùΩΩù±ïIïŸ•ï›U…∞π—…•¥†§∞(ÄÄÄÄÄÅ•πÕ—Öù…Öµ}’…∞ËÅ•π¡’–π•πÕ—Öù…ÖµU…∞π—…•¥†§∞(ÄÄÄÄÄÅôÖçïâΩΩ≠}’…∞ËÅ•π¡’–πôÖçïâΩΩ≠U…∞π—…•¥†§∞(ÄÄÄÄÄÅ—•≠—Ω≠}’…∞ËÅ•π¡’–π—•≠—Ω≠U…∞π—…•¥†§∞(ÄÄÄÄÄÅ—…•¡ÖëŸ•ÕΩ…}’…∞ËÅ•π¡’–π—…•¡ÖëŸ•ÕΩ…U…∞π—…•¥†§∞(ÄÄÄÄÄÅç’Õ—Ωµ}±•π≠}’…∞ËÅ•π¡’–πç’Õ—Ωµ1•π≠U…∞π—…•¥†§∞(ÄÄÄÄÄÅ—•µï}ÈΩπîËÅ•π¡’–π—•µïiΩπîπ—…•¥†§ÅÒÄâ’…Ω¡îΩAÖ…•Ãà∞(ÄÄÄÄÄÅëïôÖ’±—}¡…•Èï}çΩÕ–ËÅ•π¡’–πëïôÖ’±—A…•ÈïΩÕ–∞(ÄÄÄÄÄÄ∏∏∏°•π¡’–π…ïëïµ¡—•ΩπA•∏Ä¸ÅÏÅ…ïëïµ¡—•Ωπ}¡•π}°ÖÕ†ËÅ°ÖÕ°AÖÕÕ›Ω…ê°•π¡’–π…ïëïµ¡—•ΩπA•∏§ÅÙÄËÅÌÙ§∞(ÄÄÄÅÙ§(ÄÄÄÄπïƒ†â•êà∞Å’Õï…E’ï…‰πëÖ—Ñπµï…ç°Öπ—}•ê§Ï((ÄÅ•òÄ°µï…ç°Öπ—U¡ëÖ—îπï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†â5•ÕîÅÑÅ©Ω’»Åë‘ÅçΩµ¡—îÅ•µ¡ΩÕÕ•â±î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–Å’Õï…U¡ëÖ—îÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}’Õï…Ãà§(ÄÄÄÄπ’¡ëÖ—î°Ï(ÄÄÄÄÄÅô•…Õ—}πÖµîËÅ•π¡’–πô•…Õ—9Öµîπ—…•¥†§∞(ÄÄÄÄÄÅ±ÖÕ—}πÖµîËÅ•π¡’–π±ÖÕ—9Öµîπ—…•¥†§∞(ÄÄÄÄÄÅïµÖ•∞∞(ÄÄÄÅÙ§(ÄÄÄÄπïƒ†â•êà∞Å’Õï…%ê§Ï((ÄÅ•òÄ°’Õï…U¡ëÖ—îπï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†â5•ÕîÅÑÅ©Ω’»Åë‘Å¡…Ωô•∞Å’—•±•ÕÖ—ï’»Å•µ¡ΩÕÕ•â±î∏à§Ï(ÄÅÙ((ÄÅÖ›Ö•–ÅïπÕ’…ïM’¡ÖâÖÕï’—°UÕï»°Ï(ÄÄÄÅïµÖ•∞∞(ÄÄÄÅô•…Õ—9ÖµîËÅ•π¡’–πô•…Õ—9Öµîπ—…•¥†§∞(ÄÄÄÅ±ÖÕ—9ÖµîËÅ•π¡’–π±ÖÕ—9Öµîπ—…•¥†§∞(ÄÄÄÅµï…ç°Öπ—%êËÅ’Õï…E’ï…‰πëÖ—Ñπµï…ç°Öπ—}•ê∞(ÄÄÄÅµï…ç°Öπ—UÕï…%êËÅ’Õï…%ê∞(ÄÅÙ§Ï((ÄÅçΩπÕ–Åmµï…ç°Öπ–∞Å’Õï…tÄÙÅÖ›Ö•–ÅA…Ωµ•ÕîπÖ±∞°l(ÄÄÄÅùï—M’¡ÖâÖÕï5ï…ç°Öπ—A…Ωô•±î°’Õï…E’ï…‰πëÖ—Ñπµï…ç°Öπ—}•ê§∞(ÄÄÄÅùï—M’¡ÖâÖÕï5ï…ç°Öπ—UÕï»°’Õï…%ê§∞(ÄÅt§Ï((ÄÅ•òÄ†Öµï…ç°Öπ–ÅÒÄÖ’Õï»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†âΩµ¡—îÅ•π—…Ω’ŸÖâ±îÅÖ¡…ïÃÅµ•ÕîÅÑÅ©Ω’»∏à§Ï(ÄÅÙ((ÄÅ…ï—’…∏ÅÏÅµï…ç°Öπ–∞Å’Õï»ÅÙÏ)Ù()ï·¡Ω…–ÅÖÕÂπåÅô’πç—•Ω∏ÅÕÂπç5ï…ç°Öπ—UÕï…ÕQΩM’¡ÖâÖÕï’—°%πM’¡ÖâÖÕî†§ÅÏ(ÄÅçΩπÕ–ÅÕ’¡ÖâÖÕîÄÙÅùï—M’¡ÖâÖÕïëµ•∏†§Ï(ÄÅçΩπÕ–ÅÏÅëÖ—Ñ∞Åï……Ω»ÅÙÄÙÅÖ›Ö•–ÅÕ’¡ÖâÖÕî(ÄÄÄÄπô…Ω¥†âµï…ç°Öπ—}’Õï…Ãà§(ÄÄÄÄπÕï±ïç–†â•ê∞Åµï…ç°Öπ—}•ê∞Åô•…Õ—}πÖµî∞Å±ÖÕ—}πÖµî∞ÅïµÖ•∞à§(ÄÄÄÄπΩ…ëï»†âç…ïÖ—ïë}Ö–à∞ÅÏÅÖÕçïπë•πúËÅ—…’îÅÙ§Ï((ÄÅ•òÄ°ï……Ω»§ÅÏ(ÄÄÄÅ—°…Ω‹Åπï‹Å……Ω»†â1ïç—’…îÅëïÃÅçΩµ¡—ïÃÅµÖ…ç°ÖπëÃÅ•µ¡ΩÕÕ•â±î∏à§Ï(ÄÅÙ((ÄÅçΩπÕ–Åµï…ç°Öπ—UÕï…ÃÄÙ(ÄÄÄÄ°ëÖ—ÑÅÖÃÅ……Ö‰ÒÏ(ÄÄÄÄÄÅ•êËÅÕ—…•πúÏ(ÄÄÄÄÄÅµï…ç°Öπ—}•êËÅÕ—…•πúÏ(ÄÄÄÄÄÅô•…Õ—}πÖµîËÅÕ—…•πúÏ(ÄÄÄÄÄÅ±ÖÕ—}πÖµîËÅÕ—…•πúÏ(ÄÄÄÄÄÅïµÖ•∞ËÅÕ—…•πúÏ(ÄÄÄÅÙ¯ÅÅπ’±∞§Ä¸¸ÅmtÏ((ÄÅçΩπÕ–ÅÕÂπçïêËÅÕ—…•πùmtÄÙÅmtÏ((ÄÅôΩ»Ä°çΩπÕ–Å’Õï»ÅΩòÅµï…ç°Öπ—UÕï…Ã§ÅÏ(ÄÄÄÅÖ›Ö•–ÅïπÕ’…ïM’¡ÖâÖÕï’—°UÕï»°Ï(ÄÄÄÄÄÅïµÖ•∞ËÅ’Õï»πïµÖ•∞∞(ÄÄÄÄÄÅ¡ÖÕÕ›Ω…êË(ÄÄÄÄÄÄÄÅ’Õï»πïµÖ•∞π—Ω1Ω›ï…ÖÕî†§ÄÙÙÙÅ5=}5I!9Q}1=%8πïµÖ•∞(ÄÄÄÄÄÄÄÄÄÄ¸Å5=}5I!9Q}1=%8π¡ÖÕÕ›Ω…ê(ÄÄÄÄÄÄÄÄÄÄËÅ’πëïô•πïê∞(ÄÄÄÄÄÅô•…Õ—9ÖµîËÅ’Õï»πô•…Õ—}πÖµî∞(ÄÄÄÄÄÅ±ÖÕ—9ÖµîËÅ’Õï»π±ÖÕ—}πÖµî∞(ÄÄÄÄÄÅµï…ç°Öπ—%êËÅ’Õï»πµï…ç°Öπ—}•ê∞(ÄÄÄÄÄÅµï…ç°Öπ—UÕï…%êËÅ’Õï»π•ê∞(ÄÄÄÅÙ§Ï(ÄÄÄÅÕÂπçïêπ¡’Õ†°’Õï»πïµÖ•∞§Ï(ÄÅÙ((ÄÅ…ï—’…∏ÅÏ(ÄÄÄÅ—Ω—Ö∞ËÅÕÂπçïêπ±ïπù—†∞(ÄÄÄÅïµÖ•±ÃËÅÕÂπçïê∞(ÄÅÙÏ)Ù