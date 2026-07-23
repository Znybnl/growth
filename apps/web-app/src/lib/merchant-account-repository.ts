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
};

type AuthSyncInput = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  merchantId: string;
  merchantUserId: string;
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
  diffusionSupport: ["QR code vitrine et comptoir", "Script équipe magasin"],
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
  authUser: Pick<SupabaseAuthUser, "email" | "app_metadata">,
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

  return {
    user: { ...merchantUser, workspaceId: workspaceContext.workspace?.id, role: activeRole },
    merchant: activeMerchant,
    workspace: workspaceContext.workspace,
    locations: workspaceContext.locations,
    activeLocationId: activeMerchant.id,
  };
}

export async function ensureDemoMerchantInSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const createdAt = DEMO_MERCHANT_PROFILE.createdAt;
  const trialEndDate = new Date(Date.parse(createdAt) + 30 * 24 * 60 * 60 * 1000).toISOString();
  const workspaceId = `workspace-${DEMO_MERCHANT_PROFILE.merchantId}`;
  const workspaceAvailable = await ensureMerchantWorkspaceRecord({
    workspaceId,
    name: DEMO_MERCHANT_PROFILE.companyName,
    createdAt,
  });
  const merchantUpsert = await supabase.from("merchants").upsert({
    id: DEMO_MERCHANT_PROFILE.merchantId,
    ...(workspaceAvailable
      ? {
          workspace_id: workspaceId,
          location_code: "SORA-PAR",
          location_status: "active",
          time_zone: "Europe/Paris",
        }
      : {}),
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
    custom_link_url: DEMO_MERCHANT_PROFILE.customLinkUrl,
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

  if (workspaceAvailable) {
    const membership = await supabase.from("merchant_workspace_memberships").upsert(
      {
        id: `membership-${resolvedMerchantUserId}`,
        workspace_id: workspaceId,
        merchant_user_id: resolvedMerchantUserId,
        role: "owner",
        status: "active",
        created_at: createdAt,
      },
      { onConflict: "workspace_id,merchant_user_id" },
    );
    if (!membership.error) {
      await supabase.from("merchant_membership_locations").upsert(
        { membership_id: `membership-${resolvedMerchantUserId}`, merchant_id: DEMO_MERCHANT_PROFILE.merchantId },
        { onConflict: "membership_id,merchant_id" },
      );
    }
  }

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
    throw new E…1549 tokens truncated…e = getSupabaseAdmin();
  const email = profile.email.trim().toLowerCase();
  const existingUser = await supabase
    .from("merchant_users")
    .select("*")
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
      isNew: false,
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
    custom_link_url: "",
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
    isNew: true,
  };
}

type MerchantWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  default_time_zone: string;
  created_at: string;
};

function toMerchantWorkspace(row: MerchantWorkspaceRow): MerchantWorkspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    defaultTimeZone: row.default_time_zone,
    createdAt: row.created_at,
  };
}

export async function getSupabaseMerchantWorkspaceContext(
  merchantUserId: string,
  fallbackMerchant: Merchant,
) {
  if (!isSupabaseConfigured()) {
    return {
      workspace: undefined,
      locations: [{ merchant: fallbackMerchant, role: "owner" as const }],
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const membershipQuery = await supabase
      .from("merchant_workspace_memberships")
      .select("id, workspace_id, role, status")
      .eq("merchant_user_id", merchantUserId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string; workspace_id: string; role: MerchantWorkspaceRole; status: string }>();

    if (membershipQuery.error || !membershipQuery.data) {
      return {
        workspace: undefined,
        locations: [{ merchant: fallbackMerchant, role: "owner" as const }],
      };
    }

    const membership = membershipQuery.data;
    const [{ data: workspaceRow }, { data: locationRows }] = await Promise.all([
      supabase
        .from("merchant_workspaces")
        .select("id, name, slug, default_time_zone, created_at")
        .eq("id", membership.workspace_id)
        .maybeSingle<MerchantWorkspaceRow>(),
      supabase
        .from("merchant_membership_locations")
        .select("merchant_id")
        .eq("membership_id", membership.id),
    ]);

    const locationIds = (locationRows ?? []).map((row) => row.merchant_id);
    const profiles = await Promise.all(
      locationIds.map((locationId) => getSupabaseMerchantProfile(locationId)),
    );
    const locations = profiles
      .filter((merchant): merchant is Merchant => Boolean(merchant))
      .filter((merchant) => merchant.locationStatus !== "archived")
      .map((merchant) => ({ merchant, role: membership.role }));

    return {
      workspace: workspaceRow ? toMerchantWorkspace(workspaceRow) : undefined,
      locations:
        locations.length > 0
          ? locations
          : [{ merchant: fallbackMerchant, role: membership.role }],
    };
  } catch {
    return {
      workspace: undefined,
      locations: [{ merchant: fallbackMerchant, role: "owner" as const }],
    };
  }
}

export async function createSupabaseMerchantLocation(input: {
  workspaceId: string;
  merchantUserId: string;
  companyName: string;
  city: string;
  address?: string;
  timeZone?: string;
}) {
  const supabase = getSupabaseAdmin();
  const membership = await supabase
    .from("merchant_workspace_memberships")
    .select("id, role")
    .eq("workspace_id", input.workspaceId)
    .eq("merchant_user_id", input.merchantUserId)
    .eq("status", "active")
    .maybeSingle<{ id: string; role: MerchantWorkspaceRole }>();

  if (membership.error || !membership.data || !["owner", "admin"].includes(membership.data.role)) {
    throw new Error("Vous n'avez pas les droits pour ajouter un site.");
  }

  const companyName = input.companyName.trim();
  const city = input.city.trim();
  if (!companyName || !city) throw new Error("Le nom du site et la ville sont requis.");

  const merchantId = generateId("merchant");
  const locationCode = `${companyName.slice(0, 3)}-${city.slice(0, 3)}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 8);
  const createdAt = new Date().toISOString();
  const insert = await supabase
    .from("merchants")
    .insert({
      id: merchantId,
      workspace_id: input.workspaceId,
      location_code: locationCode || merchantId.slice(-6).toUpperCase(),
      location_status: "active",
      company_name: companyName,
      logo_text: companyName.slice(0, 2).toUpperCase(),
      logo_url: null,
      industry: "",
      restaurant_type: "Brasserie",
      city,
      address: input.address?.trim() ?? "",
      contact_name: "",
      phone: "",
      restaurant_email: "",
      website_url: "",
      onboarding_completed: true,
      preferred_goals: [],
      diffusion_support: [],
      google_review_url: "",
      instagram_url: "",
      facebook_url: "",
      tiktok_url: "",
      tripadvisor_url: "",
      custom_link_url: "",
      default_prize_cost: 3,
      time_zone: input.timeZone ?? "Europe/Paris",
      created_at: createdAt,
    })
    .select("*")
    .single<MerchantRow>();

  if (insert.error || !insert.data) throw new Error("Le site n'a pas pu être créé.");

  const memberships = await supabase
    .from("merchant_workspace_memberships")
    .select("id, role")
    .eq("workspace_id", input.workspaceId)
    .in("role", ["owner", "admin"]);
  if (memberships.data?.length) {
    await supabase.from("merchant_membership_locations").insert(
      memberships.data.map((item) => ({ membership_id: item.id, merchant_id: merchantId })),
    );
  }

  return toMerchant(insert.data);
}

export async function archiveSupabaseMerchantLocation(input: {
  workspaceId: string;
  merchantUserId: string;
  merchantId: string;
}) {
  const supabase = getSupabaseAdmin();
  const membership = await supabase
    .from("merchant_workspace_memberships")
    .select("role")
    .eq("workspace_id", input.workspaceId)
    .eq("merchant_user_id", input.merchantUserId)
    .eq("status", "active")
    .maybeSingle<{ role: MerchantWorkspaceRole }>();
  if (membership.error || !membership.data || !["owner", "admin"].includes(membership.data.role)) {
    throw new Error("Vous n'avez pas les droits pour archiver un site.");
  }

  const activeCount = await supabase
    .from("merchants")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId)
    .eq("location_status", "active");
  if ((activeCount.count ?? 0) <= 1) throw new Error("Conservez au moins un site actif.");

  const updated = await supabase
    .from("merchants")
    .update({ location_status: "archived" })
    .eq("id", input.merchantId)
    .eq("workspace_id", input.workspaceId)
    .select("*")
    .maybeSingle<MerchantRow>();
  if (updated.error || !updated.data) throw new Error("Le site n'a pas pu être archivé.");
  return toMerchant(updated.data);
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

export async function syncMerchantBillingFromStripeCustomerIdInSupabase(
  stripeCustomerId: string,
) {
  const merchant = await findMerchantByStripeCustomerIdInSupabase(stripeCustomerId);

  if (!merchant) {
    throw new Error("Marchand Stripe introuvable.");
  }

  const stripe = getStripeClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 20,
  });

  const subscription =
    subscriptions.data.find((item) =>
      ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(item.status),
    ) ?? subscriptions.data[0];

  if (!subscription) {
    return merchant;
  }

  await updateMerchantBillingFromStripeSubscriptionInSupabase(merchant.id, subscription);
  return getSupabaseMerchantProfile(merchant.id);
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
      custom_link_url: input.customLinkUrl.trim(),
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
      custom_link_url: input.customLinkUrl.trim(),
      time_zone: input.timeZone.trim() || "Europe/Paris",
      default_prize_cost: input.defaultPrizeCost,
      ...(input.redemptionPin ? { redemption_pin_hash: hashPassword(input.redemptionPin) } : {}),
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

