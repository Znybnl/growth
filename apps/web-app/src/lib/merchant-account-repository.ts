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
  authUserId?: string;
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
  /** When the caller already has the Supabase Auth id, avoid scanning all Auth users. */
  existingAuthUserId?: string;
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
  const result = await getSupabaseAdmin().from("merchant_workspaces").upsert({
    id: input.workspaceId,
    name: input.name,
    slug: input.workspaceId,
    default_time_zone: input.timeZone ?? "Europe/Paris",
    created_at: input.createdAt,
  });

  if (result.error) {
    throw new Error(`CrÃ©ation de lâ€™espace marchand impossible: ${result.error.message}`);
  }

  return true;
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
  const existingUser = input.existingAuthUserId
    ? null
    : await findSupabaseAuthUserByEmailOrMerchantUserId(email, input.merchantUserId);
  const existingAuthUserId = input.existingAuthUserId ?? existingUser?.id;

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

  if (existingAuthUserId) {
    const updatePayload: {
      app_metadata: typeof appMetadata;
      email?: string;
      password?: string;
      user_metadata: typeof userMetadata;
    } = {
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    };

    if (existingUser && existingUser.email?.toLowerCase() !== email) {
      updatePayload.email = email;
    }

    if (input.password) {
      updatePayload.password = input.password;
    }

    const { error } = await supabase.auth.admin.updateUserById(existingAuthUserId, updatePayload);

    if (error) {
      throw new Error("Mise a jour de l'utilisateur Supabase Auth impossible.");
    }

    return existingAuthUserId;
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
  authUser: Pick<SupabaseAuthUser, "id" | "email" | "app_metadata" | "user_metadata">,
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
      existingAuthUserId: authUser.id,
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
  cë|¶‰ËkºwµçYT›ÛNÈİ]\Îˆİš[™ÈOŠ
NÂ‚ˆYˆ
Y[X™\œÚ\]Y\K™\œ›Üˆ[Y[X™\œÚ\]Y\K™]JHÂˆ™]\›ˆÂˆÛÜšÜÜXÙNˆ[™Yš[™YˆØØ][ÛœÎˆŞÈY\˜Ú[ˆ˜[˜XÚÓY\˜Ú[›ÛNˆ›İÛ™\ˆˆ\ÈÛÛœİWKˆNÂˆB‚ˆÛÛœİY[X™\œÚ\HY[X™\œÚ\]Y\K™]NÂˆÛÛœİŞÈ]NˆÛÜšÜÜXÙT›İÈKÈ]NˆØØ][Û”›İÜÈWHH]ØZ]›ÛZ\ÙK˜[
Âˆİ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İÛÜšÜÜXÙ\ÈŠBˆœÙ[Xİ
šY˜[YKÛYËY˜][İ[YWŞ›Û™KÜ™X]YØ]ŠBˆ™\JšY‹Y[X™\œÚ\ÛÜšÜÜXÙWÚY
Bˆ›X^X™TÚ[™ÛOY\˜Ú[ÛÜšÜÜXÙT›İÏŠ
Kˆİ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÛY[X™\œÚ\ÛØØ][ÛœÈŠBˆœÙ[Xİ
›Y\˜Ú[ÚYŠBˆ™\J›Y[X™\œÚ\ÚY‹Y[X™\œÚ\šY
KˆJNÂ‚ˆÛÛœİØØ][Û’YÈH
ØØ][Û”›İÜÈÏÈ×JK›X\

›İÊHOˆ›İË›Y\˜Ú[ÚY
NÂˆÛÛœİ›Ùš[\ÈH]ØZ]›ÛZ\ÙK˜[
ˆØØ][Û’YË›X\

ØØ][Û’Y
HO‚ˆØØ][Û’YOOH˜[˜XÚÓY\˜Ú[šYˆÈ›ÛZ\ÙKœ™\ÛÛ™J˜[˜XÚÓY\˜Ú[
BˆˆÙ]İ\X˜\ÙSY\˜Ú[›Ùš[JØØ][Û’Y
Kˆ
Kˆ
NÂˆÛÛœİØØ][ÛœÈH›Ùš[\Âˆ™š[\Š
Y\˜Ú[
NˆY\˜Ú[\ÈY\˜Ú[Oˆ›ÛÛX[ŠY\˜Ú[
JBˆ™š[\Š
Y\˜Ú[
HOˆY\˜Ú[›ØØ][Û”İ]\ÈOOH˜\˜Ú]™YŠBˆ›X\

Y\˜Ú[
HOˆ
ÈY\˜Ú[›ÛNˆY[X™\œÚ\œ›ÛHJJNÂ‚ˆ™]\›ˆÂˆÛÜšÜÜXÙNˆÛÜšÜÜXÙT›İÈÈÓY\˜Ú[ÛÜšÜÜXÙJÛÜšÜÜXÙT›İÊHˆ[™Yš[™YˆØØ][ÛœÎ‚ˆØØ][ÛœË›[™İˆˆÈØØ][ÛœÂˆˆŞÈY\˜Ú[ˆ˜[˜XÚÓY\˜Ú[›ÛNˆY[X™\œÚ\œ›ÛHWKˆNÂˆHØ]ÚÂˆ™]\›ˆÂˆÛÜšÜÜXÙNˆ[™Yš[™YˆØØ][ÛœÎˆŞÈY\˜Ú[ˆ˜[˜XÚÓY\˜Ú[›ÛNˆ›İÛ™\ˆˆ\ÈÛÛœİWKˆNÂˆBŸB‚™^Ü\Ş[˜È[˜İ[ÛˆÜ™X]Tİ\X˜\ÙSY\˜Ú[ØØ][ÛŠ[œ]ˆÂˆÛÜšÜÜXÙRYˆİš[™ÎÂˆY\˜Ú[\Ù\’Yˆİš[™ÎÂˆÛÛ\[S˜[YNˆİš[™ÎÂˆÚ]Nˆİš[™ÎÂˆY™\ÜÏÎˆİš[™ÎÂˆ[YV›Û™OÎˆİš[™ÎÂŸJHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİY[X™\œÚ\H]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İÛÜšÜÜXÙWÛY[X™\œÚ\ÈŠBˆœÙ[Xİ
šY›ÛHŠBˆ™\JÛÜšÜÜXÙWÚY‹[œ]ÛÜšÜÜXÙRY
Bˆ™\J›Y\˜Ú[İ\Ù\—ÚY‹[œ]›Y\˜Ú[\Ù\’Y
Bˆ™\Jœİ]\È‹˜Xİ]™HŠBˆ›X^X™TÚ[™ÛOÈYˆİš[™ÎÈ›ÛNˆY\˜Ú[ÛÜšÜÜXÙT›ÛHOŠ
NÂ‚ˆYˆ
Y[X™\œÚ\™\œ›Üˆ[Y[X™\œÚ\™]HVÈ›İÛ™\ˆ‹˜YZ[ˆ—Kš[˜ÛY\ÊY[X™\œÚ\™]Kœ›ÛJJHÂˆ›İÈ™]È\œ›ÜŠ•›İ\È‰Ø]™^ˆ\È\È›Ú]Èİ\ˆZ›İ]\ˆ[ˆÚ]KˆŠNÂˆB‚ˆÛÛœİÛÛ\[S˜[YHH[œ]˜ÛÛ\[S˜[YKš[J
NÂˆÛÛœİÚ]HH[œ]˜Ú]Kš[J
NÂˆYˆ
XÛÛ\[S˜[YHXÚ]JH›İÈ™]È\œ›ÜŠ“H›ÛHHÚ]H]Hš[HÛÛ™\]Z\ËˆŠNÂ‚ˆÛÛœİY\˜Ú[YHÙ[™\˜]RY
›Y\˜Ú[ŠNÂˆÛÛœİØØ][ÛÛÙHH	ØÛÛ\[S˜[YKœÛXÙJÊ_KIØÚ]KœÛXÙJÊ_Xˆ››Ü›X[^™J“‘‘ŠBˆœ™\XÙJÖ×LÌWLÍ™—KÙËˆŠBˆœ™\XÙJÖ×˜K^ŒNWKÙÚKˆŠBˆÕ\\Ø\ÙJ
BˆœÛXÙJ
NÂˆÛÛœİÜ™X]Y]H™]È]J
KÒTÓÔİš[™Ê
NÂˆÛÛœİ[œÙ\H]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆš[œÙ\
ÂˆYˆY\˜Ú[YˆÛÜšÜÜXÙWÚYˆ[œ]ÛÜšÜÜXÙRYˆØØ][Û—ØÛÙNˆØØ][ÛÛÙHY\˜Ú[YœÛXÙJMŠKÕ\\Ø\ÙJ
KˆØØ][Û—Üİ]\Îˆ˜Xİ]™H‹ˆÛÛ\[WÛ˜[YNˆÛÛ\[S˜[YKˆÙÛ×İ^ˆÛÛ\[S˜[YKœÛXÙJŠKÕ\\Ø\ÙJ
KˆÙÛ×İ\›ˆ[ˆ[™\İNˆˆ‹ˆ™\İ]\˜[İ\Nˆœ˜\ÜÙ\šYH‹ˆÚ]KˆY™\ÜÎˆ[œ]˜Y™\ÜÏËš[J
HÏÈˆ‹ˆÛÛXİÛ˜[YNˆˆ‹ˆÛ™Nˆˆ‹ˆ™\İ]\˜[Ù[XZ[ˆˆ‹ˆÙXœÚ]Wİ\›ˆˆ‹ˆÛ˜›Ø\™[™×ØÛÛ\]YˆYKˆ™Y™\œ™YÙÛØ[Îˆ×KˆY™\Ú[Û—Üİ\Üˆ×KˆÛÛÙÛWÜ™]šY]×İ\›ˆˆ‹ˆ[œİYÜ˜[Wİ\›ˆˆ‹ˆ˜XÙX›ÛÚ×İ\›ˆˆ‹ˆZİÚ×İ\›ˆˆ‹ˆš\Yš\ÛÜ—İ\›ˆˆ‹ˆİ\İÛWÛ[š×İ\›ˆˆ‹ˆY˜][Üš^™WØÛÜİˆËˆ™Y[\[Û—Ü[—Ú\Úˆ\Ú\ÜİÛÜ™
ŒŠKˆ[YWŞ›Û™Nˆ[œ][YV›Û™HÏÈ‘]\›ÜKÔ\š\È‹ˆÜ™X]YØ]ˆÜ™X]Y]ˆJBˆœÙ[Xİ
ŠˆŠBˆœÚ[™ÛOY\˜Ú[›İÏŠ
NÂ‚ˆYˆ
[œÙ\™\œ›ÜˆZ[œÙ\™]JH›İÈ™]È\œ›ÜŠ“HÚ]H‰ØH\ÈH0ê™HÜ°êpêKˆŠNÂ‚ˆÛÛœİY[X™\œÚ\ÈH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İÛÜšÜÜXÙWÛY[X™\œÚ\ÈŠBˆœÙ[Xİ
šY›ÛHŠBˆ™\JÛÜšÜÜXÙWÚY‹[œ]ÛÜšÜÜXÙRY
Bˆš[Šœ›ÛH‹È›İÛ™\ˆ‹˜YZ[ˆ—JNÂˆYˆ
Y[X™\œÚ\Ë™]OË›[™İ
HÂˆ]ØZ]İ\X˜\ÙK™œ›ÛJ›Y\˜Ú[ÛY[X™\œÚ\ÛØØ][ÛœÈŠKš[œÙ\
ˆY[X™\œÚ\Ë™]K›X\

][JHOˆ
ÈY[X™\œÚ\ÚYˆ][KšYY\˜Ú[ÚYˆY\˜Ú[YJJKˆ
NÂˆB‚ˆ™]\›ˆÓY\˜Ú[
[œÙ\™]JNÂŸB‚™^Ü\Ş[˜È[˜İ[Ûˆ\˜Ú]™Tİ\X˜\ÙSY\˜Ú[ØØ][ÛŠ[œ]ˆÂˆÛÜšÜÜXÙRYˆİš[™ÎÂˆY\˜Ú[\Ù\’Yˆİš[™ÎÂˆY\˜Ú[Yˆİš[™ÎÂŸJHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİY[X™\œÚ\H]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İÛÜšÜÜXÙWÛY[X™\œÚ\ÈŠBˆœÙ[Xİ
œ›ÛHŠBˆ™\JÛÜšÜÜXÙWÚY‹[œ]ÛÜšÜÜXÙRY
Bˆ™\J›Y\˜Ú[İ\Ù\—ÚY‹[œ]›Y\˜Ú[\Ù\’Y
Bˆ™\Jœİ]\È‹˜Xİ]™HŠBˆ›X^X™TÚ[™ÛOÈ›ÛNˆY\˜Ú[ÛÜšÜÜXÙT›ÛHOŠ
NÂˆYˆ
Y[X™\œÚ\™\œ›Üˆ[Y[X™\œÚ\™]HVÈ›İÛ™\ˆ‹˜YZ[ˆ—Kš[˜ÛY\ÊY[X™\œÚ\™]Kœ›ÛJJHÂˆ›İÈ™]È\œ›ÜŠ•›İ\È‰Ø]™^ˆ\È\È›Ú]Èİ\ˆ\˜Ú]™\ˆ[ˆÚ]KˆŠNÂˆB‚ˆÛÛœİXİ]™PÛİ[H]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆœÙ[Xİ
šY‹ÈÛİ[ˆ™^Xİ‹XYˆYHJBˆ™\JÛÜšÜÜXÙWÚY‹[œ]ÛÜšÜÜXÙRY
Bˆ™\J›ØØ][Û—Üİ]\È‹˜Xİ]™HŠNÂˆYˆ

Xİ]™PÛİ[˜Ûİ[ÏÈ
HHJH›İÈ™]È\œ›ÜŠÛÛœÙ\™^ˆ]H[Ú[œÈ[ˆÚ]HXİY‹ˆŠNÂ‚ˆÛÛœİ\]YH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆ\]JÈØØ][Û—Üİ]\Îˆ˜\˜Ú]™YˆJBˆ™\JšY‹[œ]›Y\˜Ú[Y
Bˆ™\JÛÜšÜÜXÙWÚY‹[œ]ÛÜšÜÜXÙRY
BˆœÙ[Xİ
ŠˆŠBˆ›X^X™TÚ[™ÛOY\˜Ú[›İÏŠ
NÂˆYˆ
\]Y™\œ›Üˆ]\]Y™]JH›İÈ™]È\œ›ÜŠ“HÚ]H‰ØH\ÈH0ê™H\˜Ú]°êKˆŠNÂˆ™]\›ˆÓY\˜Ú[
\]Y™]JNÂŸB‚™^Ü\Ş[˜È[˜İ[ÛˆÙ]Y\˜Ú[İš\Pİ\İÛY\’Y[”İ\X˜\ÙJˆY\˜Ú[Yˆİš[™Ëˆİš\Pİ\İÛY\’Yˆİš[™ËŠHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİÈ\œ›ÜˆHH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆ\]JÈİš\WØİ\İÛY\—ÚYˆİš\Pİ\İÛY\’YJBˆ™\JšY‹Y\˜Ú[Y
NÂ‚ˆYˆ
\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠ[œ™YÚ\İ™[Y[HÛY[İš\H[\ÜÜÚX›Nˆ	Ù\œ›Ü‹›Y\ÜØYÙ_X
NÂˆBŸB‚™^Ü\Ş[˜È[˜İ[Ûˆš[™Y\˜Ú[Tİš\Pİ\İÛY\’Y[”İ\X˜\ÙJİš\Pİ\İÛY\’Yˆİš[™ÊHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİÈ]K\œ›ÜˆHH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆœÙ[Xİ
ŠˆŠBˆ™\Jœİš\WØİ\İÛY\—ÚY‹İš\Pİ\İÛY\’Y
Bˆ›X^X™TÚ[™ÛOY\˜Ú[›İÏŠ
NÂ‚ˆYˆ
\œ›ÜˆY]JHÂˆ™]\›ˆ[ÂˆB‚ˆ™]\›ˆÓY\˜Ú[
]JNÂŸB‚™^Ü\Ş[˜È[˜İ[ÛˆŞ[˜ÓY\˜Ú[š[[™Ñœ›ÛTİš\Pİ\İÛY\’Y[”İ\X˜\ÙJˆİš\Pİ\İÛY\’Yˆİš[™ËŠHÂˆÛÛœİY\˜Ú[H]ØZ]š[™Y\˜Ú[Tİš\Pİ\İÛY\’Y[”İ\X˜\ÙJİš\Pİ\İÛY\’Y
NÂ‚ˆYˆ
[Y\˜Ú[
HÂˆ›İÈ™]È\œ›ÜŠ“X\˜Ú[™İš\H[›İ]˜X›KˆŠNÂˆB‚ˆÛÛœİİš\HHÙ]İš\PÛY[

NÂˆÛÛœİİXœØÜš\[ÛœÈH]ØZ]İš\KœİXœØÜš\[ÛœË›\İ
Âˆİ\İÛY\ˆİš\Pİ\İÛY\’Yˆİ]\Îˆ˜[‹ˆ[Z]ˆŒˆJNÂ‚ˆÛÛœİİXœØÜš\[ÛˆBˆİXœØÜš\[ÛœË™]K™š[™

][JHO‚ˆÈ˜Xİ]™H‹šX[[™È‹œ\İÙYH‹[œZY‹š[˜ÛÛ\]H‹œ]\ÙY—Kš[˜ÛY\Ê][Kœİ]\ÊKˆ
HÏÈİXœØÜš\[ÛœË™]VÌNÂ‚ˆYˆ
\İXœØÜš\[ÛŠHÂˆ™]\›ˆY\˜Ú[ÂˆB‚ˆ]ØZ]\]SY\˜Ú[š[[™Ñœ›ÛTİš\TİXœØÜš\[Û’[”İ\X˜\ÙJY\˜Ú[šYİXœØÜš\[ÛŠNÂˆ™]\›ˆÙ]İ\X˜\ÙSY\˜Ú[›Ùš[JY\˜Ú[šY
NÂŸB‚™^Ü\Ş[˜È[˜İ[Ûˆ\]SY\˜Ú[š[[™Ñœ›ÛTİš\TİXœØÜš\[Û’[”İ\X˜\ÙJˆY\˜Ú[Yˆİš[™ËˆİXœØÜš\[Ûˆİš\K”İXœØÜš\[Û‹ŠHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİİ\İÛY\’YBˆ\[ÙˆİXœØÜš\[Û‹˜İ\İÛY\ˆOOHœİš[™ÈˆÈİXœØÜš\[Û‹˜İ\İÛY\ˆˆİXœØÜš\[Û‹˜İ\İÛY\‹šYÂˆÛÛœİİ\œ™[\š[Ù[™˜[YHHİXœØÜš\[Û‹š][\Ë™]Bˆ›X\

][JHOˆ][K˜İ\œ™[Ü\š[ÙÙ[™
Bˆ™š[\Š
˜[YJNˆ˜[YH\È[X™\ˆOˆ\[Ùˆ˜[YHOOH›[X™\ˆŠBˆœÛÜ

YšYÚ
HOˆYHšYÚ
VÌNÂˆÛÛœİİ\œ™[\š[Ù[™Bˆ\[Ùˆİ\œ™[\š[Ù[™˜[YHOOH›[X™\ˆ‚ˆÈ™]È]Jİ\œ™[\š[Ù[™˜[YH
ˆL
KÒTÓÔİš[™Ê
Bˆˆ[ÂˆÛÛœİšX[[™Bˆ\[ÙˆİXœØÜš\[Û‹šX[Ù[™OOH›[X™\ˆ‚ˆÈ™]È]JİXœØÜš\[Û‹šX[Ù[™
ˆL
KÒTÓÔİš[™Ê
Bˆˆ[ÂˆÛÛœİšX[İ\Bˆ\[ÙˆİXœØÜš\[Û‹šX[Üİ\OOH›[X™\ˆ‚ˆÈ™]È]JİXœØÜš\[Û‹šX[Üİ\
ˆL
KÒTÓÔİš[™Ê
Bˆˆ[Â‚ˆÛÛœİÈ\œ›ÜˆHH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆ\]JÂˆİš\WØİ\İÛY\—ÚYˆİ\İÛY\’Yˆİš\WÜİXœØÜš\[Û—ÚYˆİXœØÜš\[Û‹šYˆİš\WÜİXœØÜš\[Û—Üİ]\ÎˆİXœØÜš\[Û‹œİ]\ËˆšX[Üİ\Ù]NˆšX[İ\ˆšX[Ù[™Ù]NˆšX[[™ˆİXœØÜš\[Û—Øİ\œ™[Ü\š[ÙÙ[™ˆİ\œ™[\š[Ù[™ˆİXœØÜš\[Û—ØØ[˜Ù[Ø]Ü\š[ÙÙ[™ˆİXœØÜš\[Û‹˜Ø[˜Ù[Ø]Ü\š[ÙÙ[™ˆJBˆ™\JšY‹Y\˜Ú[Y
NÂ‚ˆYˆ
\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠŞ[˜Ú›Ûš\Ø][ÛˆH	ØX›Û›™[Y[İš\H[\ÜÜÚX›Nˆ	Ù\œ›Ü‹›Y\ÜØYÙ_X
NÂˆBŸB‚™^Ü\Ş[˜È[˜İ[ÛˆX\šÓY\˜Ú[İXœØÜš\[ÛØ[˜Ù[Y[”İ\X˜\ÙJİXœØÜš\[Û’Yˆİš[™ÊHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİÈ\œ›ÜˆHH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆ\]JÂˆİš\WÜİXœØÜš\[Û—Üİ]\Îˆ˜Ø[˜Ù[Y‹ˆİXœØÜš\[Û—ØØ[˜Ù[Ø]Ü\š[ÙÙ[™ˆYKˆJBˆ™\Jœİš\WÜİXœØÜš\[Û—ÚY‹İXœØÜš\[Û’Y
NÂ‚ˆYˆ
\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠ°ê\Ú[X][Ûˆİš\H[\ÜÜÚX›H0è[œ™YÚ\İ™\ˆ	Ù\œ›Ü‹›Y\ÜØYÙ_X
NÂˆBŸB‚™^Ü[˜İ[ÛˆÙ]Y\˜Ú[š[[™Ñ›ÜXØÛİ[
Y\˜Ú[ˆY\˜Ú[
NˆY\˜Ú[š[[™Ôİ[[X\HÂˆ™]\›ˆÙ]Y\˜Ú[š[[™Ôİ[[X\JY\˜Ú[
NÂŸB‚™^Ü\Ş[˜È[˜İ[Ûˆ\]SY\˜Ú[Û˜›Ø\™[™Ò[”İ\X˜\ÙJˆ\Ù\’Yˆİš[™Ëˆ[œ]ˆY\˜Ú[Û˜›Ø\™[™Ò[œ]ŠHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİ\Ù\”]Y\HH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İ\Ù\œÈŠBˆœÙ[Xİ
›Y\˜Ú[ÚYŠBˆ™\JšY‹\Ù\’Y
BˆœÚ[™ÛOÈY\˜Ú[ÚYˆİš[™ÈOŠ
NÂ‚ˆYˆ
\Ù\”]Y\K™\œ›Üˆ]\Ù\”]Y\K™]JHÂˆ›İÈ™]È\œ›ÜŠ•][\Ø]]\ˆ[›İ]˜X›KˆŠNÂˆB‚ˆÛÛœİÛÛ\[S˜[YHH[œ]˜ÛÛ\[S˜[YKš[J
NÂˆÛÛœİ\]HH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆ\]JÂˆÛÛ\[WÛ˜[YNˆÛÛ\[S˜[YKˆÙÛ×İ^ˆÛÛ\[S˜[YKœÛXÙJŠKÕ\\Ø\ÙJ
Kˆ[™\İNˆ[œ]š[™\İKš[J
Kˆ™\İ]\˜[İ\Nˆ[œ]œ™\İ]\˜[\Kš[J
KˆÚ]Nˆ[œ]˜Ú]Kš[J
KˆY™\ÜÎˆ[œ]˜Y™\ÜËš[J
KˆÛÛXİÛ˜[YNˆ[œ]˜ÛÛXİ˜[YKš[J
KˆÛ™Nˆ[œ]œÛ™Kš[J
Kˆ™\İ]\˜[Ù[XZ[ˆ[œ]œ™\İ]\˜[[XZ[š[J
KÓİÙ\Ø\ÙJ
KˆÙXœÚ]Wİ\›ˆ[œ]ÙXœÚ]U\›š[J
KˆY˜][Üš^™WØÛÜİˆ[œ]™Y˜][š^™PÛÜİˆ™Y™\œ™YÙÛØ[Îˆ[œ]œ™Y™\œ™YÛØ[ËˆY™\Ú[Û—Üİ\Üˆ[œ]™Y™\Ú[Û”İ\ÜˆÛÛÙÛWÜ™]šY]×İ\›ˆ[œ]™ÛÛÙÛT™]šY]Õ\›š[J
Kˆ[œİYÜ˜[Wİ\›ˆ[œ]š[œİYÜ˜[U\›š[J
Kˆ˜XÙX›ÛÚ×İ\›ˆ[œ]™˜XÙX›ÛÚÕ\›š[J
KˆZİÚ×İ\›ˆ[œ]ZİÚÕ\›š[J
Kˆš\Yš\ÛÜ—İ\›ˆ[œ]š\Yš\ÛÜ•\›š[J
Kˆİ\İÛWÛ[š×İ\›ˆ[œ]˜İ\İÛS[šÕ\›š[J
Kˆ™Y[\[Û—Ü[—Ú\Úˆ\Ú\ÜİÛÜ™
[œ]œ™Y[\[Û”[Ëš[J
HŒŠKˆÛ˜›Ø\™[™×ØÛÛ\]YˆYKˆJBˆ™\JšY‹\Ù\”]Y\K™]K›Y\˜Ú[ÚY
NÂ‚ˆYˆ
\]K™\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠ“Û˜›Ø\™[™È[\ÜÜÚX›KˆŠNÂˆB‚ˆÛÛœİY\˜Ú[H]ØZ]Ù]İ\X˜\ÙSY\˜Ú[›Ùš[J\Ù\”]Y\K™]K›Y\˜Ú[ÚY
NÂ‚ˆYˆ
[Y\˜Ú[
HÂˆ›İÈ™]È\œ›ÜŠ“X\˜Ú[™[›İ]˜X›KˆŠNÂˆB‚ˆ™]\›ˆY\˜Ú[ÂŸB‚™^Ü\Ş[˜È[˜İ[Ûˆ\]SY\˜Ú[XØÛİ[[”İ\X˜\ÙJˆ\Ù\’Yˆİš[™Ëˆ[œ]ˆY\˜Ú[XØÛİ[Ù][™ÜÒ[œ]ŠHÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİ\Ù\”]Y\HH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İ\Ù\œÈŠBˆœÙ[Xİ
šYY\˜Ú[ÚYŠBˆ™\JšY‹\Ù\’Y
BˆœÚ[™ÛOÈYˆİš[™ÎÈY\˜Ú[ÚYˆİš[™ÈOŠ
NÂ‚ˆYˆ
\Ù\”]Y\K™\œ›Üˆ]\Ù\”]Y\K™]JHÂˆ›İÈ™]È\œ›ÜŠ•][\Ø]]\ˆ[›İ]˜X›KˆŠNÂˆB‚ˆÛÛœİ[XZ[H[œ]™[XZ[š[J
KÓİÙ\Ø\ÙJ
NÂˆÛÛœİ^\İ[™Õ\Ù\ˆH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İ\Ù\œÈŠBˆœÙ[Xİ
šYŠBˆ™\J™[XZ[‹[XZ[
Bˆ›™\JšY‹\Ù\’Y
Bˆ›X^X™TÚ[™ÛOÈYˆİš[™ÈOŠ
NÂ‚ˆYˆ
^\İ[™Õ\Ù\‹™\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠ•™\šYšXØ][ÛˆH	ØY™\ÜÙHK[XZ[[\ÜÜÚX›KˆŠNÂˆB‚ˆYˆ
^\İ[™Õ\Ù\‹™]JHÂˆ›İÈ™]È\œ›ÜŠÙ]HY™\ÜÙHK[XZ[\İZ˜H][\ÙYKˆŠNÂˆB‚ˆÛÛœİÛÛ\[S˜[YHH[œ]˜ÛÛ\[S˜[YKš[J
NÂˆÛÛœİY\˜Ú[\]HH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[ÈŠBˆ\]JÂˆÛÛ\[WÛ˜[YNˆÛÛ\[S˜[YKˆÙÛ×İ^ˆÛÛ\[S˜[YKœÛXÙJŠKÕ\\Ø\ÙJ
Kˆ[™\İNˆ[œ]š[™\İKš[J
Kˆ™\İ]\˜[İ\Nˆ[œ]œ™\İ]\˜[\Kš[J
KˆÚ]Nˆ[œ]˜Ú]Kš[J
KˆY™\ÜÎˆ[œ]˜Y™\ÜËš[J
KˆÛÛXİÛ˜[YNˆ[œ]˜ÛÛXİ˜[YKš[J
KˆÛ™Nˆ[œ]œÛ™Kš[J
Kˆ™\İ]\˜[Ù[XZ[ˆ[œ]œ™\İ]\˜[[XZ[š[J
KÓİÙ\Ø\ÙJ
KˆÙXœÚ]Wİ\›ˆ[œ]ÙXœÚ]U\›š[J
KˆÛÛÙÛWÜ™]šY]×İ\›ˆ[œ]™ÛÛÙÛT™]šY]Õ\›š[J
Kˆ[œİYÜ˜[Wİ\›ˆ[œ]š[œİYÜ˜[U\›š[J
Kˆ˜XÙX›ÛÚ×İ\›ˆ[œ]™˜XÙX›ÛÚÕ\›š[J
KˆZİÚ×İ\›ˆ[œ]ZİÚÕ\›š[J
Kˆš\Yš\ÛÜ—İ\›ˆ[œ]š\Yš\ÛÜ•\›š[J
Kˆİ\İÛWÛ[š×İ\›ˆ[œ]˜İ\İÛS[šÕ\›š[J
Kˆ[YWŞ›Û™Nˆ[œ][YV›Û™Kš[J
H‘]\›ÜKÔ\š\È‹ˆY˜][Üš^™WØÛÜİˆ[œ]™Y˜][š^™PÛÜİˆ‹‹Š[œ]œ™Y[\[Û”[ˆÈÈ™Y[\[Û—Ü[—Ú\Úˆ\Ú\ÜİÛÜ™
[œ]œ™Y[\[Û”[ŠHHˆßJKˆJBˆ™\JšY‹\Ù\”]Y\K™]K›Y\˜Ú[ÚY
NÂ‚ˆYˆ
Y\˜Ú[\]K™\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠ“Z\ÙHH›İ\ˆHÛÛ\H[\ÜÜÚX›KˆŠNÂˆB‚ˆÛÛœİ\Ù\•\]HH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İ\Ù\œÈŠBˆ\]JÂˆš\œİÛ˜[YNˆ[œ]™š\œİ˜[YKš[J
Kˆ\İÛ˜[YNˆ[œ]›\İ˜[YKš[J
Kˆ[XZ[ˆJBˆ™\JšY‹\Ù\’Y
NÂ‚ˆYˆ
\Ù\•\]K™\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠ“Z\ÙHH›İ\ˆH›Ùš[][\Ø]]\ˆ[\ÜÜÚX›KˆŠNÂˆB‚ˆ]ØZ][œİ\™Tİ\X˜\ÙP]]\Ù\ŠÂˆ[XZ[ˆš\œİ˜[YNˆ[œ]™š\œİ˜[YKš[J
Kˆ\İ˜[YNˆ[œ]›\İ˜[YKš[J
KˆY\˜Ú[Yˆ\Ù\”]Y\K™]K›Y\˜Ú[ÚYˆY\˜Ú[\Ù\’Yˆ\Ù\’YˆJNÂ‚ˆÛÛœİÛY\˜Ú[\Ù\—HH]ØZ]›ÛZ\ÙK˜[
ÂˆÙ]İ\X˜\ÙSY\˜Ú[›Ùš[J\Ù\”]Y\K™]K›Y\˜Ú[ÚY
KˆÙ]İ\X˜\ÙSY\˜Ú[\Ù\Š\Ù\’Y
KˆJNÂ‚ˆYˆ
[Y\˜Ú[]\Ù\ŠHÂˆ›İÈ™]È\œ›ÜŠÛÛ\H[›İ]˜X›H\™\ÈZ\ÙHH›İ\‹ˆŠNÂˆB‚ˆ™]\›ˆÈY\˜Ú[\Ù\ˆNÂŸB‚™^Ü\Ş[˜È[˜İ[ÛˆŞ[˜ÓY\˜Ú[\Ù\œÕÔİ\X˜\ÙP]][”İ\X˜\ÙJ
HÂˆÛÛœİİ\X˜\ÙHHÙ]İ\X˜\ÙPYZ[Š
NÂˆÛÛœİÈ]K\œ›ÜˆHH]ØZ]İ\X˜\ÙBˆ™œ›ÛJ›Y\˜Ú[İ\Ù\œÈŠBˆœÙ[Xİ
šYY\˜Ú[ÚYš\œİÛ˜[YK\İÛ˜[YK[XZ[ŠBˆ›Ü™\Š˜Ü™X]YØ]‹È\ØÙ[™[™ÎˆYHJNÂ‚ˆYˆ
\œ›ÜŠHÂˆ›İÈ™]È\œ›ÜŠ“Xİ\™H\ÈÛÛ\\ÈX\˜Ú[™È[\ÜÜÚX›KˆŠNÂˆB‚ˆÛÛœİY\˜Ú[\Ù\œÈBˆ
]H\È\œ˜^OÂˆYˆİš[™ÎÂˆY\˜Ú[ÚYˆİš[™ÎÂˆš\œİÛ˜[YNˆİš[™ÎÂˆ\İÛ˜[YNˆİš[™ÎÂˆ[XZ[ˆİš[™ÎÂˆOˆ[
HÏÈ×NÂ‚ˆÛÛœİŞ[˜ÙYˆİš[™Ö×HH×NÂ‚ˆ›Üˆ
ÛÛœİ\Ù\ˆÙˆY\˜Ú[\Ù\œÊHÂˆ]ØZ][œİ\™Tİ\X˜\ÙP]]\Ù\ŠÂˆ[XZ[ˆ\Ù\‹™[XZ[ˆ\ÜİÛÜ™‚ˆ\Ù\‹™[XZ[ÓİÙ\Ø\ÙJ
HOOHSS×ÓQTÒS•ÓÑÒS‹™[XZ[ˆÈSS×ÓQTÒS•ÓÑÒS‹œ\ÜİÛÜ™ˆˆ[™Yš[™Yˆš\œİ˜[YNˆ\Ù\‹™š\œİÛ˜[YKˆ\İ˜[YNˆ\Ù\‹›\İÛ˜[YKˆY\˜Ú[Yˆ\Ù\‹›Y\˜Ú[ÚYˆY\˜Ú[\Ù\’Yˆ\Ù\‹šYˆJNÂˆŞ[˜ÙYœ\Ú
\Ù\‹™[XZ[
NÂˆB‚ˆ™]\›ˆÂˆİ[ˆŞ[˜ÙY›[™İˆ[XZ[ÎˆŞ[˜ÙYˆNÂŸB