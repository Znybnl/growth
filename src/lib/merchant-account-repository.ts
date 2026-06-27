import { hashPassword, verifyPassword } from "@/lib/passwords";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  Merchant,
  MerchantAccountSettingsInput,
  MerchantBillingSummary,
  MerchantOnboardingInput,
  MerchantSignInInput,
  MerchantSignUpInput,
  MerchantSubscriptionStatus,
  MerchantUser,
} from "@/lib/types";
import { getMerchantBillingSummary } from "@/lib/billing";
import Stripe from "stripe";

type MerchantRow = {
  id: string;
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
  default_prize_cost: number | null;
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
};

type AuthSyncInput = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  merchantId: string;
  merchantUserId: string;
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
  diffusionSupport: ["QR code vitrine et comptoir", "Script équipe magasin"],
  googleReviewUrl: "https://g.page/r/CampaignReview",
  instagramUrl: "https://instagram.com/maisonsora",
  facebookUrl: "https://facebook.com/maisonsora",
  tiktokUrl: "https://tiktok.com/@maisonsora",
  tripadvisorUrl: "https://tripadvisor.com/",
  defaultPrizeCost: 3.4,
  firstName: "Pierre-Henri",
  lastName: "Brunelle",
  createdAt: "2026-06-01T08:00:00.000Z",
} as const;

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
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

  const appMetadata = {
    merchant_id: input.merchantId,
    merchant_user_id: input.merchantUserId,
    source: "okado-merchant",
  };
  const userMetadata = {
    first_name: input.firstName,
    last_name: input.lastName,
    full_name: `${input.firstName} ${input.lastName}`.trim(),
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

function toMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
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
    defaultPrizeCost: row.default_prize_cost ?? undefined,
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

export async function getSupabaseMerchantUser(userId: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("merchant_users")
    .select("id, merchant_id, first_name, last_name, email, password_hash, created_at")
    .eq("id", userId)
    .single<MerchantUserRow>();

  if (error || !data) {
    return null;
  }

  return toMerchantUser(data);
}

export async function ensureDemoMerchantInSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const createdAt = DEMO_MERCHANT_PROFILE.createdAt;
  const trialEndDate = new Date(Date.parse(createdAt) + 30 * 24 * 60 * 60 * 1000).toISOString();
  const merchantUpsert = await supabase.from("merchants").upsert({
    id: DEMO_MERCHANT_PROFILE.merchantId,
    company_name: DEMO_MERCHANT_PROFILE.companyName,
    logo_text: DEMO_MERCHANT_PROFILE.logoText,
    logo_url: null,
    industry: DEMO_MERCHANT_PROFILE.industry,
    restaurant_type: DEMO_MERCHANT_PROFILE.restaurantType,
    city: DEMO_MERCHANT_PROFILE.city,
    address: DEMO_MERCHANT_PROFILE.address,
    contact_name: DEMO_MERCHANT_PROFILE.contactName,
    phone: DEMO_MERCHANT_PROFILE.phone,
    restaurant_email: DEMO_MERCHANT_PROFILE.restaurantEmail,
    website_url: DEMO_MERCHANT_PROFILE.websiteUrl,
    onboarding_completed: DEMO_MERCHANT_PROFILE.onboardingCompleted,
    preferred_goals: [...DEMO_MERCHANT_PROFILE.preferredGoals],
    diffusion_support: [...DEMO_MERCHANT_PROFILE.diffusionSupport],
    google_review_url: DEMO_MERCHANT_PROFILE.googleReviewUrl,
    instagram_url: DEMO_MERCHANT_PROFILE.instagramUrl,
    facebook_url: DEMO_MERCHANT_PROFILE.facebookUrl,
    tiktok_url: DEMO_MERCHANT_PROFILE.tiktokUrl,
    tripadvisor_url: DEMO_MERCHANT_PROFILE.tripadvisorUrl,
    default_prize_cost: DEMO_MERCHANT_PROFILE.defaultPrizeCost,
    trial_start_date: createdAt,
    trial_end_date: trialEndDate,
    created_at: createdAt,
  });

  if (merchantUpsert.error) {
    throw new Error(`Synchronisation du marchand démo impossible: ${merchantUpsert.error.message}`);
  }

  const existingMerchantUserQuery = await supabase
    .from("merchant_users")
    .select("id")
    .eq("email", DEMO_MERCHANT_LOGIN.email)
    .maybeSingle();

  if (existingMerchantUserQuery.error) {
    throw new Error(
      `Lecture de l'utilisateur démo impossible: ${existingMerchantUserQuery.error.message}`,
    );
  }

  const resolvedMerchantUserId =
    existingMerchantUserQuery.data?.id ?? DEMO_MERCHANT_PROFILE.merchantUserId;
  const merchantUserPayload = {
    merchant_id: DEMO_MERCHANT_PROFILE.merchantId,
    first_name: DEMO_MERCHANT_PROFILE.firstName,
    last_name: DEMO_MERCHANT_PROFILE.lastName,
    email: DEMO_MERCHANT_LOGIN.email,
    password_hash: hashPassword(DEMO_MERCHANT_LOGIN.password),
    created_at: createdAt,
  };
  const merchantUserResult = existingMerchantUserQuery.data
    ? await supabase
        .from("merchant_users")
        .update(merchantUserPayload)
        .eq("id", resolvedMerchantUserId)
    : await supabase.from("merchant_users").insert({
        id: resolvedMerchantUserId,
        ...merchantUserPayload,
      });

  if (merchantUserResult.error) {
    throw new Error(
      `Synchronisation de l'utilisateur démo impossible: ${merchantUserResult.error.message}`,
    );
  }

  await ensureSupabaseAuthUser({
    email: DEMO_MERCHANT_LOGIN.email,
    password: DEMO_MERCHANT_LOGIN.password,
    firstName: DEMO_MERCHANT_PROFILE.firstName,
    lastName: DEMO_MERCHANT_PROFILE.lastName,
    merchantId: DEMO_MERCHANT_PROFILE.merchantId,
    merchantUserId: resolvedMerchantUserId,
  });

  return {
    merchantId: DEMO_MERCHANT_PROFILE.merchantId,
    merchantUserId: resolvedMerchantUserId,
  };
}

export async function createMerchantAccountInSupabase(input: MerchantSignUpInput) {
  const supabase = getSupabaseAdmin();
  const email = input.email.trim().toLowerCase();

  if (input.password !== input.confirmPassword) {
    throw new Error("Les mots de passe ne correspondent pas.");
  }

  const existing = await supabase
    .from("merchant_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing.data) {
    throw new Error("Un compte existe deja avec cette adresse e-mail.");
  }

  const merchantId = generateId("merchant");
  const userId = generateId("user");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const companyName = input.companyName.trim();
  const city = input.city.trim();
  const phone = (input.phone ?? "").trim();
  const createdAt = new Date().toISOString();
  const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const merchantInsert = await supabase.from("merchants").insert({
    id: merchantId,
    company_name: companyName,
    logo_text: companyName.slice(0, 2).toUpperCase(),
    logo_url: null,
    industry: "",
    restaurant_type: "Brasserie",
    city,
    address: "",
    contact_name: `${firstName} ${lastName}`.trim(),
    phone,
    restaurant_email: "",
    website_url: "",
    onboarding_completed: false,
    preferred_goals: [],
    diffusion_support: [],
    google_review_url: "",
    instagram_url: "",
    facebook_url: "",
    tiktok_url: "",
    tripadvisor_url: "",
    default_prize_cost: 3,
    trial_start_date: createdAt,
    trial_end_date: trialEndDate,
    created_at: createdAt,
  });

  if (merchantInsert.error) {
    throw new Error("Creation du marchand impossible.");
  }

  const userInsert = await supabase.from("merchant_users").insert({
    id: userId,
    merchant_id: merchantId,
    first_name: firstName,
    last_name: lastName,
    email,
    password_hash: hashPassword(input.password),
    created_at: createdAt,
  });

  if (userInsert.error) {
    await supabase.from("merchants").delete().eq("id", merchantId);
    throw new Error("Creation du compte impossible.");
  }

  try {
    await ensureSupabaseAuthUser({
      email,
      password: input.password,
      firstName,
      lastName,
      merchantId,
      merchantUserId: userId,
    });
  } catch (error) {
    await supabase.from("merchant_users").delete().eq("id", userId);
    await supabase.from("merchants").delete().eq("id", merchantId);
    throw error;
  }

  return {
    user: {
      id: userId,
      merchantId,
      firstName,
      lastName,
      email,
      password: "",
      createdAt,
    },
    merchant: {
      id: merchantId,
      companyName,
      logoText: companyName.slice(0, 2).toUpperCase(),
      logoUrl: undefined,
      industry: undefined,
      restaurantType: "Brasserie",
      city,
      address: undefined,
      contactName: `${firstName} ${lastName}`.trim(),
      phone,
      restaurantEmail: undefined,
      websiteUrl: undefined,
      onboardingCompleted: false,
      preferredGoals: [],
      diffusionSupport: [],
      googleReviewUrl: "",
      instagramUrl: "",
      facebookUrl: "",
      tiktokUrl: "",
      tripadvisorUrl: "",
      defaultPrizeCost: 3,
      trialStartDate: createdAt,
      trialEndDate,
      subscriptionCancelAtPeriodEnd: false,
      createdAt,
    },
  };
}

export async function authenticateMerchantInSupabase(input: MerchantSignInInput) {
  const supabase = getSupabaseAdmin();
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("merchant_users")
    .select("id, merchant_id, first_name, last_name, email, password_hash, created_at")
    .eq("email", email)
    .single<MerchantUserRow>();

  const isDemoLogin =
    email === DEMO_MERCHANT_LOGIN.email && input.password === DEMO_MERCHANT_LOGIN.password;

  if (error || !data) {
    throw new Error("Identifiants invalides.");
  }

  let isValidPassword = verifyPassword(input.password, data.password_hash);

  if (!isValidPassword && isDemoLogin) {
    const nextHash = hashPassword(DEMO_MERCHANT_LOGIN.password);
    const { error: updateError } = await supabase
      .from("merchant_users")
      .update({ password_hash: nextHash })
      .eq("id", data.id);

    if (!updateError) {
      data.password_hash = nextHash;
      isValidPassword = true;
    }
  }

  if (!isValidPassword) {
    throw new Error("Identifiants invalides.");
  }

  await ensureSupabaseAuthUser({
    email,
    password: input.password,
    firstName: data.first_name,
    lastName: data.last_name,
    merchantId: data.merchant_id,
    merchantUserId: data.id,
  });

  const merchant = await getSupabaseMerchantProfile(data.merchant_id);

  if (!merchant) {
    throw new Error("Marchand introuvable.");
  }

  return {
    user: toMerchantUser(data),
    merchant,
  };
}

function deriveCompanyName(profile: GoogleMerchantProfile) {
  const trimmedName = profile.fullName.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const localPart = profile.email.split("@")[0]?.trim();
  return localPart ? localPart.slice(0, 48) : "Mon commerce";
}

export async function authenticateOrProvisionMerchantWithGoogle(
  profile: GoogleMerchantProfile,
) {
  const supabase = getSupabaseAdmin();
  const email = profile.email.trim().toLowerCase();
  const existingUser = await supabase
    .from("merchant_users")
    .select("id, merchant_id, first_name, last_name, email, password_hash, created_at")
    .eq("email", email)
    .maybeSingle<MerchantUserRow>();

  if (existingUser.error) {
    throw new Error(`Connexion Google impossible: ${existingUser.error.message}`);
  }

  if (existingUser.data) {
    await ensureSupabaseAuthUser({
      email,
      firstName: existingUser.data.first_name,
      lastName: existingUser.data.last_name,
      merchantId: existingUser.data.merchant_id,
      merchantUserId: existingUser.data.id,
    });

    const merchant = await getSupabaseMerchantProfile(existingUser.data.merchant_id);

    if (!merchant) {
      throw new Error("Marchand introuvable.");
    }

    return {
      user: toMerchantUser(existingUser.data),
      merchant,
    };
  }

  const merchantId = generateId("merchant");
  const userId = generateId("user");
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();
  const fullName = profile.fullName.trim();
  const companyName = deriveCompanyName(profile);
  const contactName = fullName || `${firstName} ${lastName}`.trim();
  const createdAt = new Date().toISOString();
  const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const merchantInsert = await supabase.from("merchants").insert({
    id: merchantId,
    company_name: companyName,
    logo_text: companyName.slice(0, 2).toUpperCase(),
    logo_url: null,
    industry: "",
    restaurant_type: "Brasserie",
    city: "",
    address: "",
    contact_name: contactName,
    phone: "",
    restaurant_email: "",
    website_url: "",
    onboarding_completed: false,
    preferred_goals: [],
    diffusion_support: [],
    google_review_url: "",
    instagram_url: "",
    facebook_url: "",
    tiktok_url: "",
    tripadvisor_url: "",
    default_prize_cost: 3,
    trial_start_date: createdAt,
    trial_end_date: trialEndDate,
    created_at: createdAt,
  });

  if (merchantInsert.error) {
    throw new Error(`Création du marchand impossible: ${merchantInsert.error.message}`);
  }

  const userInsert = await supabase.from("merchant_users").insert({
    id: userId,
    merchant_id: merchantId,
    first_name: firstName || fullName || "Compte",
    last_name: lastName,
    email,
    password_hash: hashPassword(crypto.randomUUID()),
    created_at: createdAt,
  });

  if (userInsert.error) {
    await supabase.from("merchants").delete().eq("id", merchantId);
    throw new Error(`Création du compte Google impossible: ${userInsert.error.message}`);
  }

  await ensureSupabaseAuthUser({
    email,
    firstName: firstName || fullName || "Compte",
    lastName,
    merchantId,
    merchantUserId: userId,
  });

  return {
    user: {
      id: userId,
      merchantId,
      firstName: firstName || fullName || "Compte",
      lastName,
      email,
      password: "",
      createdAt,
    },
    merchant: {
      id: merchantId,
      companyName,
      logoText: companyName.slice(0, 2).toUpperCase(),
      logoUrl: undefined,
      industry: undefined,
      restaurantType: "Brasserie",
      city: undefined,
      address: undefined,
      contactName: contactName || undefined,
      phone: undefined,
      restaurantEmail: undefined,
      websiteUrl: undefined,
      onboardingCompleted: false,
      preferredGoals: [],
      diffusionSupport: [],
      googleReviewUrl: "",
      instagramUrl: "",
      facebookUrl: "",
      tiktokUrl: "",
      tripadvisorUrl: "",
      defaultPrizeCost: 3,
      trialStartDate: createdAt,
      trialEndDate,
      subscriptionCancelAtPeriodEnd: false,
      createdAt,
    },
  };
}

export async function setMerchantStripeCustomerIdInSupabase(
  merchantId: string,
  stripeCustomerId: string,
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("merchants")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", merchantId);

  if (error) {
    throw new Error(`Enregistrement du client Stripe impossible: ${error.message}`);
  }
}

export async function findMerchantByStripeCustomerIdInSupabase(stripeCustomerId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<MerchantRow>();

  if (error || !data) {
    return null;
  }

  return toMerchant(data);
}

export async function updateMerchantBillingFromStripeSubscriptionInSupabase(
  merchantId: string,
  subscription: Stripe.Subscription,
) {
  const supabase = getSupabaseAdmin();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const currentPeriodEndValue = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number")
    .sort((left, right) => left - right)[0];
  const currentPeriodEnd =
    typeof currentPeriodEndValue === "number"
      ? new Date(currentPeriodEndValue * 1000).toISOString()
      : null;
  const trialEnd =
    typeof subscription.trial_end === "number"
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
  const trialStart =
    typeof subscription.trial_start === "number"
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null;

  const { error } = await supabase
    .from("merchants")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      trial_start_date: trialStart,
      trial_end_date: trialEnd,
      subscription_current_period_end: currentPeriodEnd,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("id", merchantId);

  if (error) {
    throw new Error(`Synchronisation de l'abonnement Stripe impossible: ${error.message}`);
  }
}

export async function markMerchantSubscriptionCanceledInSupabase(subscriptionId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("merchants")
    .update({
      stripe_subscription_status: "canceled",
      subscription_cancel_at_period_end: true,
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`Résiliation Stripe impossible à enregistrer: ${error.message}`);
  }
}

export function getMerchantBillingForAccount(merchant: Merchant): MerchantBillingSummary {
  return getMerchantBillingSummary(merchant);
}

export async function updateMerchantOnboardingInSupabase(
  userId: string,
  input: MerchantOnboardingInput,
) {
  const supabase = getSupabaseAdmin();
  const userQuery = await supabase
    .from("merchant_users")
    .select("merchant_id")
    .eq("id", userId)
    .single<{ merchant_id: string }>();

  if (userQuery.error || !userQuery.data) {
    throw new Error("Utilisateur introuvable.");
  }

  const companyName = input.companyName.trim();
  const update = await supabase
    .from("merchants")
    .update({
      company_name: companyName,
      logo_text: companyName.slice(0, 2).toUpperCase(),
      industry: input.industry.trim(),
      restaurant_type: input.restaurantType.trim(),
      city: input.city.trim(),
      address: input.address.trim(),
      contact_name: input.contactName.trim(),
      phone: input.phone.trim(),
      restaurant_email: input.restaurantEmail.trim().toLowerCase(),
      website_url: input.websiteUrl.trim(),
      default_prize_cost: input.defaultPrizeCost,
      preferred_goals: input.preferredGoals,
      diffusion_support: input.diffusionSupport,
      google_review_url: input.googleReviewUrl.trim(),
      instagram_url: input.instagramUrl.trim(),
      facebook_url: input.facebookUrl.trim(),
      tiktok_url: input.tiktokUrl.trim(),
      tripadvisor_url: input.tripadvisorUrl.trim(),
      onboarding_completed: true,
    })
    .eq("id", userQuery.data.merchant_id);

  if (update.error) {
    throw new Error("Onboarding impossible.");
  }

  const merchant = await getSupabaseMerchantProfile(userQuery.data.merchant_id);

  if (!merchant) {
    throw new Error("Marchand introuvable.");
  }

  return merchant;
}

export async function updateMerchantAccountInSupabase(
  userId: string,
  input: MerchantAccountSettingsInput,
) {
  const supabase = getSupabaseAdmin();
  const userQuery = await supabase
    .from("merchant_users")
    .select("id, merchant_id")
    .eq("id", userId)
    .single<{ id: string; merchant_id: string }>();

  if (userQuery.error || !userQuery.data) {
    throw new Error("Utilisateur introuvable.");
  }

  const email = input.email.trim().toLowerCase();
  const existingUser = await supabase
    .from("merchant_users")
    .select("id")
    .eq("email", email)
    .neq("id", userId)
    .maybeSingle<{ id: string }>();

  if (existingUser.error) {
    throw new Error("Verification de l'adresse e-mail impossible.");
  }

  if (existingUser.data) {
    throw new Error("Cette adresse e-mail est deja utilisee.");
  }

  const companyName = input.companyName.trim();
  const merchantUpdate = await supabase
    .from("merchants")
    .update({
      company_name: companyName,
      logo_text: companyName.slice(0, 2).toUpperCase(),
      industry: input.industry.trim(),
      restaurant_type: input.restaurantType.trim(),
      city: input.city.trim(),
      address: input.address.trim(),
      contact_name: input.contactName.trim(),
      phone: input.phone.trim(),
      restaurant_email: input.restaurantEmail.trim().toLowerCase(),
      website_url: input.websiteUrl.trim(),
      google_review_url: input.googleReviewUrl.trim(),
      instagram_url: input.instagramUrl.trim(),
      facebook_url: input.facebookUrl.trim(),
      tiktok_url: input.tiktokUrl.trim(),
      tripadvisor_url: input.tripadvisorUrl.trim(),
      default_prize_cost: input.defaultPrizeCost,
    })
    .eq("id", userQuery.data.merchant_id);

  if (merchantUpdate.error) {
    throw new Error("Mise a jour du compte impossible.");
  }

  const userUpdate = await supabase
    .from("merchant_users")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email,
    })
    .eq("id", userId);

  if (userUpdate.error) {
    throw new Error("Mise a jour du profil utilisateur impossible.");
  }

  await ensureSupabaseAuthUser({
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    merchantId: userQuery.data.merchant_id,
    merchantUserId: userId,
  });

  const [merchant, user] = await Promise.all([
    getSupabaseMerchantProfile(userQuery.data.merchant_id),
    getSupabaseMerchantUser(userId),
  ]);

  if (!merchant || !user) {
    throw new Error("Compte introuvable apres mise a jour.");
  }

  return { merchant, user };
}

export async function syncMerchantUsersToSupabaseAuthInSupabase() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("merchant_users")
    .select("id, merchant_id, first_name, last_name, email")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Lecture des comptes marchands impossible.");
  }

  const merchantUsers =
    (data as Array<{
      id: string;
      merchant_id: string;
      first_name: string;
      last_name: string;
      email: string;
    }> | null) ?? [];

  const synced: string[] = [];

  for (const user of merchantUsers) {
    await ensureSupabaseAuthUser({
      email: user.email,
      password:
        user.email.toLowerCase() === DEMO_MERCHANT_LOGIN.email
          ? DEMO_MERCHANT_LOGIN.password
          : undefined,
      firstName: user.first_name,
      lastName: user.last_name,
      merchantId: user.merchant_id,
      merchantUserId: user.id,
    });
    synced.push(user.email);
  }

  return {
    total: synced.length,
    emails: synced,
  };
}
