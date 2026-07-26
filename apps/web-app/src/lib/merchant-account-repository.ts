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
  diffusionSupport: ["QR code vitrine et comptoir", "Script Ã©quipe magasin"],
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
    subscriptionCancelAëM¹¶‰žËkºwµçut€ô…Ý…¥ÐAÉ½µ¥Í”¹…±°¡l4(€€€€€ÍÕÁ…‰…Í”4(€€€€€€€€¹™É½´ ‰µ•É¡…¹Ñ}Ý½É­ÍÁ…•Ìˆ¤4(€€€€€€€€¹Í•±•Ð ‰¥°¹…µ”°Í±Õœ°‘•™…Õ±Ñ}Ñ¥µ•}é½¹”°É•…Ñ•‘}…Ðˆ¤4(€€€€€€€€¹•Ä ‰¥ˆ°µ•µ‰•ÉÍ¡¥À¹Ý½É­ÍÁ…•}¥¤4(€€€€€€€€¹µ…å‰•M¥¹±”ñ5•É¡…¹Ñ]½É­ÍÁ…•I½Üø ¤°4(€€€€€ÍÕÁ…‰…Í”4(€€€€€€€€¹™É½´ ‰µ•É¡…¹Ñ}µ•µ‰•ÉÍ¡¥Á}±½…Ñ¥½¹Ìˆ¤4(€€€€€€€€¹Í•±•Ð ‰µ•É¡…¹Ñ}¥ˆ¤4(€€€€€€€€¹•Ä ‰µ•µ‰•ÉÍ¡¥Á}¥ˆ°µ•µ‰•ÉÍ¡¥À¹¥¤°4(€€€t¤ì4(4(€€€½¹ÍÐ±½…Ñ¥½¹%‘Ì€ô€¡±½…Ñ¥½¹I½ÝÌ€üümt¤¹µ…À ¡É½Ü¤€ôøÉ½Ü¹µ•É¡…¹Ñ}¥¤ì4(€€€½¹ÍÐÁÉ½™¥±•Ì€ô…Ý…¥ÐAÉ½µ¥Í”¹…±° 4(€€€€€±½…Ñ¥½¹%‘Ì¹µ…À ¡±½…Ñ¥½¹%¤€ôø•ÑMÕÁ…‰…Í•5•É¡…¹ÑAÉ½™¥±”¡±½…Ñ¥½¹%¤¤°4(€€€€¤ì4(€€€½¹ÍÐ±½…Ñ¥½¹Ì€ôÁÉ½™¥±•Ì4(€€€€€€¹™¥±Ñ•È ¡µ•É¡…¹Ð¤èµ•É¡…¹Ð¥Ì5•É¡…¹Ð€ôø	½½±•…¸¡µ•É¡…¹Ð¤¤4(€€€€€€¹™¥±Ñ•È ¡µ•É¡…¹Ð¤€ôøµ•É¡…¹Ð¹±½…Ñ¥½¹MÑ…ÑÕÌ€„ôô€‰…É¡¥Ù•ˆ¤4(€€€€€€¹µ…À ¡µ•É¡…¹Ð¤€ôø€¡ìµ•É¡…¹Ð°É½±”èµ•µ‰•ÉÍ¡¥À¹É½±”ô¤¤ì4(4(€€€É•ÑÕÉ¸ì4(€€€€€Ý½É­ÍÁ…”èÝ½É­ÍÁ…•I½Ü€üÑ½5•É¡…¹Ñ]½É­ÍÁ…”¡Ý½É­ÍÁ…•I½Ü¤€èÕ¹‘•™¥¹•°4(€€€€€±½…Ñ¥½¹Ìè4(€€€€€€€±½…Ñ¥½¹Ì¹±•¹Ñ €ø€À4(€€€€€€€€€€ü±½…Ñ¥½¹Ì4(€€€€€€€€€€èmìµ•É¡…¹Ðè™…±±‰…­5•É¡…¹Ð°É½±”èµ•µ‰•ÉÍ¡¥À¹É½±”õt°4(€€€ôì4(€ô…Ñ ì4(€€€É•ÑÕÉ¸ì4(€€€€€Ý½É­ÍÁ…”èÕ¹‘•™¥¹•°4(€€€€€±½…Ñ¥½¹Ìèmìµ•É¡…¹Ðè™…±±‰…­5•É¡…¹Ð°É½±”è€‰½Ý¹•Èˆ…Ì½¹ÍÐõt°4(€€€ôì4(€ô4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸É•…Ñ•MÕÁ…‰…Í•5•É¡…¹Ñ1½…Ñ¥½¸¡¥¹ÁÕÐèì4(€Ý½É­ÍÁ…•%èÍÑÉ¥¹œì4(€µ•É¡…¹ÑUÍ•É%èÍÑÉ¥¹œì4(€½µÁ…¹å9…µ”èÍÑÉ¥¹œì4(€¥ÑäèÍÑÉ¥¹œì4(€…‘‘É•ÍÌüèÍÑÉ¥¹œì4(€Ñ¥µ•i½¹”üèÍÑÉ¥¹œì4)ô¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐµ•µ‰•ÉÍ¡¥À€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}Ý½É­ÍÁ…•}µ•µ‰•ÉÍ¡¥ÁÌˆ¤4(€€€€¹Í•±•Ð ‰¥°É½±”ˆ¤4(€€€€¹•Ä ‰Ý½É­ÍÁ…•}¥ˆ°¥¹ÁÕÐ¹Ý½É­ÍÁ…•%¤4(€€€€¹•Ä ‰µ•É¡…¹Ñ}ÕÍ•É}¥ˆ°¥¹ÁÕÐ¹µ•É¡…¹ÑUÍ•É%¤4(€€€€¹•Ä ‰ÍÑ…ÑÕÌˆ°€‰…Ñ¥Ù”ˆ¤4(€€€€¹µ…å‰•M¥¹±”ñì¥èÍÑÉ¥¹œìÉ½±”è5•É¡…¹Ñ]½É­ÍÁ…•I½±”ôø ¤ì4(4(€¥˜€¡µ•µ‰•ÉÍ¡¥À¹•ÉÉ½Èñð€…µ•µ‰•ÉÍ¡¥À¹‘…Ñ„ñð€…l‰½Ý¹•Èˆ°€‰…‘µ¥¸‰t¹¥¹±Õ‘•Ì¡µ•µ‰•ÉÍ¡¥À¹‘…Ñ„¹É½±”¤¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰Y½ÕÌ¸…Ù•èÁ…Ì±•Ì‘É½¥ÑÌÁ½ÕÈ…©½ÕÑ•ÈÕ¸Í¥Ñ”¸ˆ¤ì4(€ô4(4(€½¹ÍÐ½µÁ…¹å9…µ”€ô¥¹ÁÕÐ¹½µÁ…¹å9…µ”¹ÑÉ¥´ ¤ì4(€½¹ÍÐ¥Ñä€ô¥¹ÁÕÐ¹¥Ñä¹ÑÉ¥´ ¤ì4(€¥˜€ …½µÁ…¹å9…µ”ñð€…¥Ñä¤Ñ¡É½Ü¹•ÜÉÉ½È ‰1”¹½´‘ÔÍ¥Ñ”•Ð±„Ù¥±±”Í½¹ÐÉ•ÅÕ¥Ì¸ˆ¤ì4(4(€½¹ÍÐµ•É¡…¹Ñ%€ô•¹•É…Ñ•% ‰µ•É¡…¹Ðˆ¤ì4(€½¹ÍÐ±½…Ñ¥½¹½‘”€ô€‘í½µÁ…¹å9…µ”¹Í±¥” À°€Ì¥ô´‘í¥Ñä¹Í±¥” À°€Ì¥õ€4(€€€€¹¹½Éµ…±¥é” ‰9ˆ¤4(€€€€¹É•Á±…” ½mqÔÀÌÀÀµqÔÀÌÙ™t½œ°€ˆˆ¤4(€€€€¹É•Á±…” ½my„µèÀ´åt½¤°€ˆˆ¤4(€€€€¹Ñ½UÁÁ•É…Í” ¤4(€€€€¹Í±¥” À°€à¤ì4(€½¹ÍÐÉ•…Ñ•‘Ð€ô¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì4(€½¹ÍÐ¥¹Í•ÉÐ€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹¥¹Í•ÉÐ¡ì4(€€€€€¥èµ•É¡…¹Ñ%°4(€€€€€Ý½É­ÍÁ…•}¥è¥¹ÁÕÐ¹Ý½É­ÍÁ…•%°4(€€€€€±½…Ñ¥½¹}½‘”è±½…Ñ¥½¹½‘”ñðµ•É¡…¹Ñ%¹Í±¥” ´Ø¤¹Ñ½UÁÁ•É…Í” ¤°4(€€€€€±½…Ñ¥½¹}ÍÑ…ÑÕÌè€‰…Ñ¥Ù”ˆ°4(€€€€€½µÁ…¹å}¹…µ”è½µÁ…¹å9…µ”°4(€€€€€±½½}Ñ•áÐè½µÁ…¹å9…µ”¹Í±¥” À°€È¤¹Ñ½UÁÁ•É…Í” ¤°4(€€€€€±½½}ÕÉ°è¹Õ±°°4(€€€€€¥¹‘ÕÍÑÉäè€ˆˆ°4(€€€€€É•ÍÑ…ÕÉ…¹Ñ}ÑåÁ”è€‰	É…ÍÍ•É¥”ˆ°4(€€€€€¥Ñä°4(€€€€€…‘‘É•ÍÌè¥¹ÁÕÐ¹…‘‘É•ÍÌü¹ÑÉ¥´ ¤€üü€ˆˆ°4(€€€€€½¹Ñ…Ñ}¹…µ”è€ˆˆ°4(€€€€€Á¡½¹”è€ˆˆ°4(€€€€€É•ÍÑ…ÕÉ…¹Ñ}•µ…¥°è€ˆˆ°4(€€€€€Ý•‰Í¥Ñ•}ÕÉ°è€ˆˆ°4(€€€€€½¹‰½…É‘¥¹}½µÁ±•Ñ•èÑÉÕ”°4(€€€€€ÁÉ•™•ÉÉ•‘}½…±Ìèmt°4(€€€€€‘¥™™ÕÍ¥½¹}ÍÕÁÁ½ÉÐèmt°4(€€€€€½½±•}É•Ù¥•Ý}ÕÉ°è€ˆˆ°4(€€€€€¥¹ÍÑ…É…µ}ÕÉ°è€ˆˆ°4(€€€€€™…•‰½½­}ÕÉ°è€ˆˆ°4(€€€€€Ñ¥­Ñ½­}ÕÉ°è€ˆˆ°4(€€€€€ÑÉ¥Á…‘Ù¥Í½É}ÕÉ°è€ˆˆ°4(€€€€€ÕÍÑ½µ}±¥¹­}ÕÉ°è€ˆˆ°4(€€€€€‘•™…Õ±Ñ}ÁÉ¥é•}½ÍÐè€Ì°4(€€€€€Ñ¥µ•}é½¹”è¥¹ÁÕÐ¹Ñ¥µ•i½¹”€üü€‰ÕÉ½Á”½A…É¥Ìˆ°4(€€€€€É•…Ñ•‘}…ÐèÉ•…Ñ•‘Ð°4(€€€ô¤4(€€€€¹Í•±•Ð ˆ¨ˆ¤4(€€€€¹Í¥¹±”ñ5•É¡…¹ÑI½Üø ¤ì4(4(€¥˜€¡¥¹Í•ÉÐ¹•ÉÉ½Èñð€…¥¹Í•ÉÐ¹‘…Ñ„¤Ñ¡É½Ü¹•ÜÉÉ½È ‰1”Í¥Ñ”¸„Á…ÌÁÔƒ©ÑÉ”Ë§¤¸ˆ¤ì4(4(€½¹ÍÐµ•µ‰•ÉÍ¡¥ÁÌ€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}Ý½É­ÍÁ…•}µ•µ‰•ÉÍ¡¥ÁÌˆ¤4(€€€€¹Í•±•Ð ‰¥°É½±”ˆ¤4(€€€€¹•Ä ‰Ý½É­ÍÁ…•}¥ˆ°¥¹ÁÕÐ¹Ý½É­ÍÁ…•%¤4(€€€€¹¥¸ ‰É½±”ˆ°l‰½Ý¹•Èˆ°€‰…‘µ¥¸‰t¤ì4(€¥˜€¡µ•µ‰•ÉÍ¡¥ÁÌ¹‘…Ñ„ü¹±•¹Ñ ¤ì4(€€€…Ý…¥ÐÍÕÁ…‰…Í”¹™É½´ ‰µ•É¡…¹Ñ}µ•µ‰•ÉÍ¡¥Á}±½…Ñ¥½¹Ìˆ¤¹¥¹Í•ÉÐ 4(€€€€€µ•µ‰•ÉÍ¡¥ÁÌ¹‘…Ñ„¹µ…À ¡¥Ñ•´¤€ôø€¡ìµ•µ‰•ÉÍ¡¥Á}¥è¥Ñ•´¹¥°µ•É¡…¹Ñ}¥èµ•É¡…¹Ñ%ô¤¤°4(€€€€¤ì4(€ô4(4(€É•ÑÕÉ¸Ñ½5•É¡…¹Ð¡¥¹Í•ÉÐ¹‘…Ñ„¤ì4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸…É¡¥Ù•MÕÁ…‰…Í•5•É¡…¹Ñ1½…Ñ¥½¸¡¥¹ÁÕÐèì4(€Ý½É­ÍÁ…•%èÍÑÉ¥¹œì4(€µ•É¡…¹ÑUÍ•É%èÍÑÉ¥¹œì4(€µ•É¡…¹Ñ%èÍÑÉ¥¹œì4)ô¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐµ•µ‰•ÉÍ¡¥À€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}Ý½É­ÍÁ…•}µ•µ‰•ÉÍ¡¥ÁÌˆ¤4(€€€€¹Í•±•Ð ‰É½±”ˆ¤4(€€€€¹•Ä ‰Ý½É­ÍÁ…•}¥ˆ°¥¹ÁÕÐ¹Ý½É­ÍÁ…•%¤4(€€€€¹•Ä ‰µ•É¡…¹Ñ}ÕÍ•É}¥ˆ°¥¹ÁÕÐ¹µ•É¡…¹ÑUÍ•É%¤4(€€€€¹•Ä ‰ÍÑ…ÑÕÌˆ°€‰…Ñ¥Ù”ˆ¤4(€€€€¹µ…å‰•M¥¹±”ñìÉ½±”è5•É¡…¹Ñ]½É­ÍÁ…•I½±”ôø ¤ì4(€¥˜€¡µ•µ‰•ÉÍ¡¥À¹•ÉÉ½Èñð€…µ•µ‰•ÉÍ¡¥À¹‘…Ñ„ñð€…l‰½Ý¹•Èˆ°€‰…‘µ¥¸‰t¹¥¹±Õ‘•Ì¡µ•µ‰•ÉÍ¡¥À¹‘…Ñ„¹É½±”¤¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰Y½ÕÌ¸…Ù•èÁ…Ì±•Ì‘É½¥ÑÌÁ½ÕÈ…É¡¥Ù•ÈÕ¸Í¥Ñ”¸ˆ¤ì4(€ô4(4(€½¹ÍÐ…Ñ¥Ù•½Õ¹Ð€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹Í•±•Ð ‰¥ˆ°ì½Õ¹Ðè€‰•á…Ðˆ°¡•…èÑÉÕ”ô¤4(€€€€¹•Ä ‰Ý½É­ÍÁ…•}¥ˆ°¥¹ÁÕÐ¹Ý½É­ÍÁ…•%¤4(€€€€¹•Ä ‰±½…Ñ¥½¹}ÍÑ…ÑÕÌˆ°€‰…Ñ¥Ù”ˆ¤ì4(€¥˜€ ¡…Ñ¥Ù•½Õ¹Ð¹½Õ¹Ð€üü€À¤€ðô€Ä¤Ñ¡É½Ü¹•ÜÉÉ½È ‰½¹Í•ÉÙ•è…Ôµ½¥¹ÌÕ¸Í¥Ñ”…Ñ¥˜¸ˆ¤ì4(4(€½¹ÍÐÕÁ‘…Ñ•€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹ÕÁ‘…Ñ”¡ì±½…Ñ¥½¹}ÍÑ…ÑÕÌè€‰…É¡¥Ù•ˆô¤4(€€€€¹•Ä ‰¥ˆ°¥¹ÁÕÐ¹µ•É¡…¹Ñ%¤4(€€€€¹•Ä ‰Ý½É­ÍÁ…•}¥ˆ°¥¹ÁÕÐ¹Ý½É­ÍÁ…•%¤4(€€€€¹Í•±•Ð ˆ¨ˆ¤4(€€€€¹µ…å‰•M¥¹±”ñ5•É¡…¹ÑI½Üø ¤ì4(€¥˜€¡ÕÁ‘…Ñ•¹•ÉÉ½Èñð€…ÕÁ‘…Ñ•¹‘…Ñ„¤Ñ¡É½Ü¹•ÜÉÉ½È ‰1”Í¥Ñ”¸„Á…ÌÁÔƒ©ÑÉ”…É¡¥Û¤¸ˆ¤ì4(€É•ÑÕÉ¸Ñ½5•É¡…¹Ð¡ÕÁ‘…Ñ•¹‘…Ñ„¤ì4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸Í•Ñ5•É¡…¹ÑMÑÉ¥Á•ÕÍÑ½µ•É%‘%¹MÕÁ…‰…Í” 4(€µ•É¡…¹Ñ%èÍÑÉ¥¹œ°4(€ÍÑÉ¥Á•ÕÍÑ½µ•É%èÍÑÉ¥¹œ°4(¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐì•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹ÕÁ‘…Ñ”¡ìÍÑÉ¥Á•}ÕÍÑ½µ•É}¥èÍÑÉ¥Á•ÕÍÑ½µ•É%ô¤4(€€€€¹•Ä ‰¥ˆ°µ•É¡…¹Ñ%¤ì4(4(€¥˜€¡•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È¡¹É•¥ÍÑÉ•µ•¹Ð‘Ô±¥•¹ÐMÑÉ¥Á”¥µÁ½ÍÍ¥‰±”è€‘í•ÉÉ½È¹µ•ÍÍ…•õ€¤ì4(€ô4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸™¥¹‘5•É¡…¹Ñ	åMÑÉ¥Á•ÕÍÑ½µ•É%‘%¹MÕÁ…‰…Í”¡ÍÑÉ¥Á•ÕÍÑ½µ•É%èÍÑÉ¥¹œ¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐì‘…Ñ„°•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹Í•±•Ð ˆ¨ˆ¤4(€€€€¹•Ä ‰ÍÑÉ¥Á•}ÕÍÑ½µ•É}¥ˆ°ÍÑÉ¥Á•ÕÍÑ½µ•É%¤4(€€€€¹µ…å‰•M¥¹±”ñ5•É¡…¹ÑI½Üø ¤ì4(4(€¥˜€¡•ÉÉ½Èñð€…‘…Ñ„¤ì4(€€€É•ÑÕÉ¸¹Õ±°ì4(€ô4(4(€É•ÑÕÉ¸Ñ½5•É¡…¹Ð¡‘…Ñ„¤ì4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸Íå¹5•É¡…¹Ñ	¥±±¥¹É½µMÑÉ¥Á•ÕÍÑ½µ•É%‘%¹MÕÁ…‰…Í” 4(€ÍÑÉ¥Á•ÕÍÑ½µ•É%èÍÑÉ¥¹œ°4(¤ì4(€½¹ÍÐµ•É¡…¹Ð€ô…Ý…¥Ð™¥¹‘5•É¡…¹Ñ	åMÑÉ¥Á•ÕÍÑ½µ•É%‘%¹MÕÁ…‰…Í”¡ÍÑÉ¥Á•ÕÍÑ½µ•É%¤ì4(4(€¥˜€ …µ•É¡…¹Ð¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰5…É¡…¹MÑÉ¥Á”¥¹ÑÉ½ÕÙ…‰±”¸ˆ¤ì4(€ô4(4(€½¹ÍÐÍÑÉ¥Á”€ô•ÑMÑÉ¥Á•±¥•¹Ð ¤ì4(€½¹ÍÐÍÕ‰ÍÉ¥ÁÑ¥½¹Ì€ô…Ý…¥ÐÍÑÉ¥Á”¹ÍÕ‰ÍÉ¥ÁÑ¥½¹Ì¹±¥ÍÐ¡ì4(€€€ÕÍÑ½µ•ÈèÍÑÉ¥Á•ÕÍÑ½µ•É%°4(€€€ÍÑ…ÑÕÌè€‰…±°ˆ°4(€€€±¥µ¥Ðè€ÈÀ°4(€ô¤ì4(4(€½¹ÍÐÍÕ‰ÍÉ¥ÁÑ¥½¸€ô4(€€€ÍÕ‰ÍÉ¥ÁÑ¥½¹Ì¹‘…Ñ„¹™¥¹ ¡¥Ñ•´¤€ôø4(€€€€€l‰…Ñ¥Ù”ˆ°€‰ÑÉ¥…±¥¹œˆ°€‰Á…ÍÑ}‘Õ”ˆ°€‰Õ¹Á…¥ˆ°€‰¥¹½µÁ±•Ñ”ˆ°€‰Á…ÕÍ•‰t¹¥¹±Õ‘•Ì¡¥Ñ•´¹ÍÑ…ÑÕÌ¤°4(€€€€¤€üüÍÕ‰ÍÉ¥ÁÑ¥½¹Ì¹‘…Ñ…lÁtì4(4(€¥˜€ …ÍÕ‰ÍÉ¥ÁÑ¥½¸¤ì4(€€€É•ÑÕÉ¸µ•É¡…¹Ðì4(€ô4(4(€…Ý…¥ÐÕÁ‘…Ñ•5•É¡…¹Ñ	¥±±¥¹É½µMÑÉ¥Á•MÕ‰ÍÉ¥ÁÑ¥½¹%¹MÕÁ…‰…Í”¡µ•É¡…¹Ð¹¥°ÍÕ‰ÍÉ¥ÁÑ¥½¸¤ì4(€É•ÑÕÉ¸•ÑMÕÁ…‰…Í•5•É¡…¹ÑAÉ½™¥±”¡µ•É¡…¹Ð¹¥¤ì4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸ÕÁ‘…Ñ•5•É¡…¹Ñ	¥±±¥¹É½µMÑÉ¥Á•MÕ‰ÍÉ¥ÁÑ¥½¹%¹MÕÁ…‰…Í” 4(€µ•É¡…¹Ñ%èÍÑÉ¥¹œ°4(€ÍÕ‰ÍÉ¥ÁÑ¥½¸èMÑÉ¥Á”¹MÕ‰ÍÉ¥ÁÑ¥½¸°4(¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐÕÍÑ½µ•É%€ô4(€€€ÑåÁ•½˜ÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÕÍÑ½µ•È€ôôô€‰ÍÑÉ¥¹œˆ€üÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÕÍÑ½µ•È€èÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÕÍÑ½µ•È¹¥ì4(€½¹ÍÐÕÉÉ•¹ÑA•É¥½‘¹‘Y…±Õ”€ôÍÕ‰ÍÉ¥ÁÑ¥½¸¹¥Ñ•µÌ¹‘…Ñ„4(€€€€¹µ…À ¡¥Ñ•´¤€ôø¥Ñ•´¹ÕÉÉ•¹Ñ}Á•É¥½‘}•¹¤4(€€€€¹™¥±Ñ•È ¡Ù…±Õ”¤èÙ…±Õ”¥Ì¹Õµ‰•È€ôøÑåÁ•½˜Ù…±Õ”€ôôô€‰¹Õµ‰•Èˆ¤4(€€€€¹Í½ÉÐ ¡±•™Ð°É¥¡Ð¤€ôø±•™Ð€´É¥¡Ð¥lÁtì4(€½¹ÍÐÕÉÉ•¹ÑA•É¥½‘¹€ô4(€€€ÑåÁ•½˜ÕÉÉ•¹ÑA•É¥½‘¹‘Y…±Õ”€ôôô€‰¹Õµ‰•Èˆ4(€€€€€€ü¹•Ü…Ñ”¡ÕÉÉ•¹ÑA•É¥½‘¹‘Y…±Õ”€¨€ÄÀÀÀ¤¹Ñ½%M=MÑÉ¥¹œ ¤4(€€€€€€è¹Õ±°ì4(€½¹ÍÐÑÉ¥…±¹€ô4(€€€ÑåÁ•½˜ÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÑÉ¥…±}•¹€ôôô€‰¹Õµ‰•Èˆ4(€€€€€€ü¹•Ü…Ñ”¡ÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÑÉ¥…±}•¹€¨€ÄÀÀÀ¤¹Ñ½%M=MÑÉ¥¹œ ¤4(€€€€€€è¹Õ±°ì4(€½¹ÍÐÑÉ¥…±MÑ…ÉÐ€ô4(€€€ÑåÁ•½˜ÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÑÉ¥…±}ÍÑ…ÉÐ€ôôô€‰¹Õµ‰•Èˆ4(€€€€€€ü¹•Ü…Ñ”¡ÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÑÉ¥…±}ÍÑ…ÉÐ€¨€ÄÀÀÀ¤¹Ñ½%M=MÑÉ¥¹œ ¤4(€€€€€€è¹Õ±°ì4(4(€½¹ÍÐì•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹ÕÁ‘…Ñ”¡ì4(€€€€€ÍÑÉ¥Á•}ÕÍÑ½µ•É}¥èÕÍÑ½µ•É%°4(€€€€€ÍÑÉ¥Á•}ÍÕ‰ÍÉ¥ÁÑ¥½¹}¥èÍÕ‰ÍÉ¥ÁÑ¥½¸¹¥°4(€€€€€ÍÑÉ¥Á•}ÍÕ‰ÍÉ¥ÁÑ¥½¹}ÍÑ…ÑÕÌèÍÕ‰ÍÉ¥ÁÑ¥½¸¹ÍÑ…ÑÕÌ°4(€€€€€ÑÉ¥…±}ÍÑ…ÉÑ}‘…Ñ”èÑÉ¥…±MÑ…ÉÐ°4(€€€€€ÑÉ¥…±}•¹‘}‘…Ñ”èÑÉ¥…±¹°4(€€€€€ÍÕ‰ÍÉ¥ÁÑ¥½¹}ÕÉÉ•¹Ñ}Á•É¥½‘}•¹èÕÉÉ•¹ÑA•É¥½‘¹°4(€€€€€ÍÕ‰ÍÉ¥ÁÑ¥½¹}…¹•±}…Ñ}Á•É¥½‘}•¹èÍÕ‰ÍÉ¥ÁÑ¥½¸¹…¹•±}…Ñ}Á•É¥½‘}•¹°4(€€€ô¤4(€€€€¹•Ä ‰¥ˆ°µ•É¡…¹Ñ%¤ì4(4(€¥˜€¡•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È¡Må¹¡É½¹¥Í…Ñ¥½¸‘”°…‰½¹¹•µ•¹ÐMÑÉ¥Á”¥µÁ½ÍÍ¥‰±”è€‘í•ÉÉ½È¹µ•ÍÍ…•õ€¤ì4(€ô4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸µ…É­5•É¡…¹ÑMÕ‰ÍÉ¥ÁÑ¥½¹…¹•±•‘%¹MÕÁ…‰…Í”¡ÍÕ‰ÍÉ¥ÁÑ¥½¹%èÍÑÉ¥¹œ¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐì•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹ÕÁ‘…Ñ”¡ì4(€€€€€ÍÑÉ¥Á•}ÍÕ‰ÍÉ¥ÁÑ¥½¹}ÍÑ…ÑÕÌè€‰…¹•±•ˆ°4(€€€€€ÍÕ‰ÍÉ¥ÁÑ¥½¹}…¹•±}…Ñ}Á•É¥½‘}•¹èÑÉÕ”°4(€€€ô¤4(€€€€¹•Ä ‰ÍÑÉ¥Á•}ÍÕ‰ÍÉ¥ÁÑ¥½¹}¥ˆ°ÍÕ‰ÍÉ¥ÁÑ¥½¹%¤ì4(4(€¥˜€¡•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È¡K¥Í¥±¥…Ñ¥½¸MÑÉ¥Á”¥µÁ½ÍÍ¥‰±”ƒ€•¹É•¥ÍÑÉ•Èè€‘í•ÉÉ½È¹µ•ÍÍ…•õ€¤ì4(€ô4)ô4(4)•áÁ½ÉÐ™Õ¹Ñ¥½¸•Ñ5•É¡…¹Ñ	¥±±¥¹½É½Õ¹Ð¡µ•É¡…¹Ðè5•É¡…¹Ð¤è5•É¡…¹Ñ	¥±±¥¹MÕµµ…Éäì4(€É•ÑÕÉ¸•Ñ5•É¡…¹Ñ	¥±±¥¹MÕµµ…Éä¡µ•É¡…¹Ð¤ì4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸ÕÁ‘…Ñ•5•É¡…¹Ñ=¹‰½…É‘¥¹%¹MÕÁ…‰…Í” 4(€ÕÍ•É%èÍÑÉ¥¹œ°4(€¥¹ÁÕÐè5•É¡…¹Ñ=¹‰½…É‘¥¹%¹ÁÕÐ°4(¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐÕÍ•ÉEÕ•Éä€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}ÕÍ•ÉÌˆ¤4(€€€€¹Í•±•Ð ‰µ•É¡…¹Ñ}¥ˆ¤4(€€€€¹•Ä ‰¥ˆ°ÕÍ•É%¤4(€€€€¹Í¥¹±”ñìµ•É¡…¹Ñ}¥èÍÑÉ¥¹œôø ¤ì4(4(€¥˜€¡ÕÍ•ÉEÕ•Éä¹•ÉÉ½Èñð€…ÕÍ•ÉEÕ•Éä¹‘…Ñ„¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰UÑ¥±¥Í…Ñ•ÕÈ¥¹ÑÉ½ÕÙ…‰±”¸ˆ¤ì4(€ô4(4(€½¹ÍÐ½µÁ…¹å9…µ”€ô¥¹ÁÕÐ¹½µÁ…¹å9…µ”¹ÑÉ¥´ ¤ì4(€½¹ÍÐÕÁ‘…Ñ”€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹ÕÁ‘…Ñ”¡ì4(€€€€€½µÁ…¹å}¹…µ”è½µÁ…¹å9…µ”°4(€€€€€±½½}Ñ•áÐè½µÁ…¹å9…µ”¹Í±¥” À°€È¤¹Ñ½UÁÁ•É…Í” ¤°4(€€€€€¥¹‘ÕÍÑÉäè¥¹ÁÕÐ¹¥¹‘ÕÍÑÉä¹ÑÉ¥´ ¤°4(€€€€€É•ÍÑ…ÕÉ…¹Ñ}ÑåÁ”è¥¹ÁÕÐ¹É•ÍÑ…ÕÉ…¹ÑQåÁ”¹ÑÉ¥´ ¤°4(€€€€€¥Ñäè¥¹ÁÕÐ¹¥Ñä¹ÑÉ¥´ ¤°4(€€€€€…‘‘É•ÍÌè¥¹ÁÕÐ¹…‘‘É•ÍÌ¹ÑÉ¥´ ¤°4(€€€€€½¹Ñ…Ñ}¹…µ”è¥¹ÁÕÐ¹½¹Ñ…Ñ9…µ”¹ÑÉ¥´ ¤°4(€€€€€Á¡½¹”è¥¹ÁÕÐ¹Á¡½¹”¹ÑÉ¥´ ¤°4(€€€€€É•ÍÑ…ÕÉ…¹Ñ}•µ…¥°è¥¹ÁÕÐ¹É•ÍÑ…ÕÉ…¹Ñµ…¥°¹ÑÉ¥´ ¤¹Ñ½1½Ý•É…Í” ¤°4(€€€€€Ý•‰Í¥Ñ•}ÕÉ°è¥¹ÁÕÐ¹Ý•‰Í¥Ñ•UÉ°¹ÑÉ¥´ ¤°4(€€€€€‘•™…Õ±Ñ}ÁÉ¥é•}½ÍÐè¥¹ÁÕÐ¹‘•™…Õ±ÑAÉ¥é•½ÍÐ°4(€€€€€ÁÉ•™•ÉÉ•‘}½…±Ìè¥¹ÁÕÐ¹ÁÉ•™•ÉÉ•‘½…±Ì°4(€€€€€‘¥™™ÕÍ¥½¹}ÍÕÁÁ½ÉÐè¥¹ÁÕÐ¹‘¥™™ÕÍ¥½¹MÕÁÁ½ÉÐ°4(€€€€€½½±•}É•Ù¥•Ý}ÕÉ°è¥¹ÁÕÐ¹½½±•I•Ù¥•ÝUÉ°¹ÑÉ¥´ ¤°4(€€€€€¥¹ÍÑ…É…µ}ÕÉ°è¥¹ÁÕÐ¹¥¹ÍÑ…É…µUÉ°¹ÑÉ¥´ ¤°4(€€€€€™…•‰½½­}ÕÉ°è¥¹ÁÕÐ¹™…•‰½½­UÉ°¹ÑÉ¥´ ¤°4(€€€€€Ñ¥­Ñ½­}ÕÉ°è¥¹ÁÕÐ¹Ñ¥­Ñ½­UÉ°¹ÑÉ¥´ ¤°4(€€€€€ÑÉ¥Á…‘Ù¥Í½É}ÕÉ°è¥¹ÁÕÐ¹ÑÉ¥Á…‘Ù¥Í½ÉUÉ°¹ÑÉ¥´ ¤°4(€€€€€ÕÍÑ½µ}±¥¹­}ÕÉ°è¥¹ÁÕÐ¹ÕÍÑ½µ1¥¹­UÉ°¹ÑÉ¥´ ¤°4(€€€€€€¸¸¸¡¥¹ÁÕÐ¹É•‘•µÁÑ¥½¹A¥¸€üìÉ•‘•µÁÑ¥½¹}Á¥¹}¡…Í è¡…Í¡A…ÍÍÝ½É¡¥¹ÁÕÐ¹É•‘•µÁÑ¥½¹A¥¸¤ô€èíô¤°4(€€€€€½¹‰½…É‘¥¹}½µÁ±•Ñ•èÑÉÕ”°4(€€€ô¤4(€€€€¹•Ä ‰¥ˆ°ÕÍ•ÉEÕ•Éä¹‘…Ñ„¹µ•É¡…¹Ñ}¥¤ì4(4(€¥˜€¡ÕÁ‘…Ñ”¹•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰=¹‰½…É‘¥¹œ¥µÁ½ÍÍ¥‰±”¸ˆ¤ì4(€ô4(4(€½¹ÍÐµ•É¡…¹Ð€ô…Ý…¥Ð•ÑMÕÁ…‰…Í•5•É¡…¹ÑAÉ½™¥±”¡ÕÍ•ÉEÕ•Éä¹‘…Ñ„¹µ•É¡…¹Ñ}¥¤ì4(4(€¥˜€ …µ•É¡…¹Ð¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰5…É¡…¹¥¹ÑÉ½ÕÙ…‰±”¸ˆ¤ì4(€ô4(4(€É•ÑÕÉ¸µ•É¡…¹Ðì4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸ÕÁ‘…Ñ•5•É¡…¹Ñ½Õ¹Ñ%¹MÕÁ…‰…Í” 4(€ÕÍ•É%èÍÑÉ¥¹œ°4(€¥¹ÁÕÐè5•É¡…¹Ñ½Õ¹ÑM•ÑÑ¥¹Í%¹ÁÕÐ°4(¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐÕÍ•ÉEÕ•Éä€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}ÕÍ•ÉÌˆ¤4(€€€€¹Í•±•Ð ‰¥°µ•É¡…¹Ñ}¥ˆ¤4(€€€€¹•Ä ‰¥ˆ°ÕÍ•É%¤4(€€€€¹Í¥¹±”ñì¥èÍÑÉ¥¹œìµ•É¡…¹Ñ}¥èÍÑÉ¥¹œôø ¤ì4(4(€¥˜€¡ÕÍ•ÉEÕ•Éä¹•ÉÉ½Èñð€…ÕÍ•ÉEÕ•Éä¹‘…Ñ„¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰UÑ¥±¥Í…Ñ•ÕÈ¥¹ÑÉ½ÕÙ…‰±”¸ˆ¤ì4(€ô4(4(€½¹ÍÐ•µ…¥°€ô¥¹ÁÕÐ¹•µ…¥°¹ÑÉ¥´ ¤¹Ñ½1½Ý•É…Í” ¤ì4(€½¹ÍÐ•á¥ÍÑ¥¹UÍ•È€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}ÕÍ•ÉÌˆ¤4(€€€€¹Í•±•Ð ‰¥ˆ¤4(€€€€¹•Ä ‰•µ…¥°ˆ°•µ…¥°¤4(€€€€¹¹•Ä ‰¥ˆ°ÕÍ•É%¤4(€€€€¹µ…å‰•M¥¹±”ñì¥èÍÑÉ¥¹œôø ¤ì4(4(€¥˜€¡•á¥ÍÑ¥¹UÍ•È¹•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰Y•É¥™¥…Ñ¥½¸‘”°…‘É•ÍÍ””µµ…¥°¥µÁ½ÍÍ¥‰±”¸ˆ¤ì4(€ô4(4(€¥˜€¡•á¥ÍÑ¥¹UÍ•È¹‘…Ñ„¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰•ÑÑ”…‘É•ÍÍ””µµ…¥°•ÍÐ‘•©„ÕÑ¥±¥Í•”¸ˆ¤ì4(€ô4(4(€½¹ÍÐ½µÁ…¹å9…µ”€ô¥¹ÁÕÐ¹½µÁ…¹å9…µ”¹ÑÉ¥´ ¤ì4(€½¹ÍÐµ•É¡…¹ÑUÁ‘…Ñ”€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹ÑÌˆ¤4(€€€€¹ÕÁ‘…Ñ”¡ì4(€€€€€½µÁ…¹å}¹…µ”è½µÁ…¹å9…µ”°4(€€€€€±½½}Ñ•áÐè½µÁ…¹å9…µ”¹Í±¥” À°€È¤¹Ñ½UÁÁ•É…Í” ¤°4(€€€€€¥¹‘ÕÍÑÉäè¥¹ÁÕÐ¹¥¹‘ÕÍÑÉä¹ÑÉ¥´ ¤°4(€€€€€É•ÍÑ…ÕÉ…¹Ñ}ÑåÁ”è¥¹ÁÕÐ¹É•ÍÑ…ÕÉ…¹ÑQåÁ”¹ÑÉ¥´ ¤°4(€€€€€¥Ñäè¥¹ÁÕÐ¹¥Ñä¹ÑÉ¥´ ¤°4(€€€€€…‘‘É•ÍÌè¥¹ÁÕÐ¹…‘‘É•ÍÌ¹ÑÉ¥´ ¤°4(€€€€€½¹Ñ…Ñ}¹…µ”è¥¹ÁÕÐ¹½¹Ñ…Ñ9…µ”¹ÑÉ¥´ ¤°4(€€€€€Á¡½¹”è¥¹ÁÕÐ¹Á¡½¹”¹ÑÉ¥´ ¤°4(€€€€€É•ÍÑ…ÕÉ…¹Ñ}•µ…¥°è¥¹ÁÕÐ¹É•ÍÑ…ÕÉ…¹Ñµ…¥°¹ÑÉ¥´ ¤¹Ñ½1½Ý•É…Í” ¤°4(€€€€€Ý•‰Í¥Ñ•}ÕÉ°è¥¹ÁÕÐ¹Ý•‰Í¥Ñ•UÉ°¹ÑÉ¥´ ¤°4(€€€€€½½±•}É•Ù¥•Ý}ÕÉ°è¥¹ÁÕÐ¹½½±•I•Ù¥•ÝUÉ°¹ÑÉ¥´ ¤°4(€€€€€¥¹ÍÑ…É…µ}ÕÉ°è¥¹ÁÕÐ¹¥¹ÍÑ…É…µUÉ°¹ÑÉ¥´ ¤°4(€€€€€™…•‰½½­}ÕÉ°è¥¹ÁÕÐ¹™…•‰½½­UÉ°¹ÑÉ¥´ ¤°4(€€€€€Ñ¥­Ñ½­}ÕÉ°è¥¹ÁÕÐ¹Ñ¥­Ñ½­UÉ°¹ÑÉ¥´ ¤°4(€€€€€ÑÉ¥Á…‘Ù¥Í½É}ÕÉ°è¥¹ÁÕÐ¹ÑÉ¥Á…‘Ù¥Í½ÉUÉ°¹ÑÉ¥´ ¤°4(€€€€€ÕÍÑ½µ}±¥¹­}ÕÉ°è¥¹ÁÕÐ¹ÕÍÑ½µ1¥¹­UÉ°¹ÑÉ¥´ ¤°4(€€€€€Ñ¥µ•}é½¹”è¥¹ÁÕÐ¹Ñ¥µ•i½¹”¹ÑÉ¥´ ¤ñð€‰ÕÉ½Á”½A…É¥Ìˆ°4(€€€€€‘•™…Õ±Ñ}ÁÉ¥é•}½ÍÐè¥¹ÁÕÐ¹‘•™…Õ±ÑAÉ¥é•½ÍÐ°4(€€€€€€¸¸¸¡¥¹ÁÕÐ¹É•‘•µÁÑ¥½¹A¥¸€üìÉ•‘•µÁÑ¥½¹}Á¥¹}¡…Í è¡…Í¡A…ÍÍÝ½É¡¥¹ÁÕÐ¹É•‘•µÁÑ¥½¹A¥¸¤ô€èíô¤°4(€€€ô¤4(€€€€¹•Ä ‰¥ˆ°ÕÍ•ÉEÕ•Éä¹‘…Ñ„¹µ•É¡…¹Ñ}¥¤ì4(4(€¥˜€¡µ•É¡…¹ÑUÁ‘…Ñ”¹•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰5¥Í”„©½ÕÈ‘Ô½µÁÑ”¥µÁ½ÍÍ¥‰±”¸ˆ¤ì4(€ô4(4(€½¹ÍÐÕÍ•ÉUÁ‘…Ñ”€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}ÕÍ•ÉÌˆ¤4(€€€€¹ÕÁ‘…Ñ”¡ì4(€€€€€™¥ÉÍÑ}¹…µ”è¥¹ÁÕÐ¹™¥ÉÍÑ9…µ”¹ÑÉ¥´ ¤°4(€€€€€±…ÍÑ}¹…µ”è¥¹ÁÕÐ¹±…ÍÑ9…µ”¹ÑÉ¥´ ¤°4(€€€€€•µ…¥°°4(€€€ô¤4(€€€€¹•Ä ‰¥ˆ°ÕÍ•É%¤ì4(4(€¥˜€¡ÕÍ•ÉUÁ‘…Ñ”¹•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰5¥Í”„©½ÕÈ‘ÔÁÉ½™¥°ÕÑ¥±¥Í…Ñ•ÕÈ¥µÁ½ÍÍ¥‰±”¸ˆ¤ì4(€ô4(4(€…Ý…¥Ð•¹ÍÕÉ•MÕÁ…‰…Í•ÕÑ¡UÍ•È¡ì4(€€€•µ…¥°°4(€€€™¥ÉÍÑ9…µ”è¥¹ÁÕÐ¹™¥ÉÍÑ9…µ”¹ÑÉ¥´ ¤°4(€€€±…ÍÑ9…µ”è¥¹ÁÕÐ¹±…ÍÑ9…µ”¹ÑÉ¥´ ¤°4(€€€µ•É¡…¹Ñ%èÕÍ•ÉEÕ•Éä¹‘…Ñ„¹µ•É¡…¹Ñ}¥°4(€€€µ•É¡…¹ÑUÍ•É%èÕÍ•É%°4(€ô¤ì4(4(€½¹ÍÐmµ•É¡…¹Ð°ÕÍ•Ét€ô…Ý…¥ÐAÉ½µ¥Í”¹…±°¡l4(€€€•ÑMÕÁ…‰…Í•5•É¡…¹ÑAÉ½™¥±”¡ÕÍ•ÉEÕ•Éä¹‘…Ñ„¹µ•É¡…¹Ñ}¥¤°4(€€€•ÑMÕÁ…‰…Í•5•É¡…¹ÑUÍ•È¡ÕÍ•É%¤°4(€t¤ì4(4(€¥˜€ …µ•É¡…¹Ðñð€…ÕÍ•È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰½µÁÑ”¥¹ÑÉ½ÕÙ…‰±”…ÁÉ•Ìµ¥Í”„©½ÕÈ¸ˆ¤ì4(€ô4(4(€É•ÑÕÉ¸ìµ•É¡…¹Ð°ÕÍ•Èôì4)ô4(4)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸Íå¹5•É¡…¹ÑUÍ•ÉÍQ½MÕÁ…‰…Í•ÕÑ¡%¹MÕÁ…‰…Í” ¤ì4(€½¹ÍÐÍÕÁ…‰…Í”€ô•ÑMÕÁ…‰…Í•‘µ¥¸ ¤ì4(€½¹ÍÐì‘…Ñ„°•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”4(€€€€¹™É½´ ‰µ•É¡…¹Ñ}ÕÍ•ÉÌˆ¤4(€€€€¹Í•±•Ð ‰¥°µ•É¡…¹Ñ}¥°™¥ÉÍÑ}¹…µ”°±…ÍÑ}¹…µ”°•µ…¥°ˆ¤4(€€€€¹½É‘•È ‰É•…Ñ•‘}…Ðˆ°ì…Í•¹‘¥¹œèÑÉÕ”ô¤ì4(4(€¥˜€¡•ÉÉ½È¤ì4(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰1•ÑÕÉ”‘•Ì½µÁÑ•Ìµ…É¡…¹‘Ì¥µÁ½ÍÍ¥‰±”¸ˆ¤ì4(€ô4(4(€½¹ÍÐµ•É¡…¹ÑUÍ•ÉÌ€ô4(€€€€¡‘…Ñ„…ÌÉÉ…äñì4(€€€€€¥èÍÑÉ¥¹œì4(€€€€€µ•É¡…¹Ñ}¥èÍÑÉ¥¹œì4(€€€€€™¥ÉÍÑ}¹…µ”èÍÑÉ¥¹œì4(€€€€€±…ÍÑ}¹…µ”èÍÑÉ¥¹œì4(€€€€€•µ…¥°èÍÑÉ¥¹œì4(€€€ôøð¹Õ±°¤€üümtì4(4(€½¹ÍÐÍå¹•èÍÑÉ¥¹mt€ômtì4(4(€™½È€¡½¹ÍÐÕÍ•È½˜µ•É¡…¹ÑUÍ•ÉÌ¤ì4(€€€…Ý…¥Ð•¹ÍÕÉ•MÕÁ…‰…Í•ÕÑ¡UÍ•È¡ì4(€€€€€•µ…¥°èÕÍ•È¹•µ…¥°°4(€€€€€Á…ÍÍÝ½Éè4(€€€€€€€ÕÍ•È¹•µ…¥°¹Ñ½1½Ý•É…Í” ¤€ôôô5=}5I!9Q}1=%8¹•µ…¥°4(€€€€€€€€€€ü5=}5I!9Q}1=%8¹Á…ÍÍÝ½É4(€€€€€€€€€€èÕ¹‘•™¥¹•°4(€€€€€™¥ÉÍÑ9…µ”èÕÍ•È¹™¥ÉÍÑ}¹…µ”°4(€€€€€±…ÍÑ9…µ”èÕÍ•È¹±…ÍÑ}¹…µ”°4(€€€€€µ•É¡…¹Ñ%èÕÍ•È¹µ•É¡…¹Ñ}¥°4(€€€€€µ•É¡…¹ÑUÍ•É%èÕÍ•È¹¥°4(€€€ô¤ì4(€€€Íå¹•¹ÁÕÍ ¡ÕÍ•È¹•µ…¥°¤ì4(€ô4(4(€É•ÑÕÉ¸ì4(€€€Ñ½Ñ…°èÍå¹•¹±•¹Ñ °4(€€€•µ…¥±ÌèÍå¹•°4(€ôì4)ô4(