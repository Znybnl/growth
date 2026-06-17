import { hashPassword, verifyPassword } from "@/lib/passwords";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  Merchant,
  MerchantAccountSettingsInput,
  MerchantOnboardingInput,
  MerchantSignInInput,
  MerchantSignUpInput,
  MerchantUser,
} from "@/lib/types";

type MerchantRow = {
  id: string;
  company_name: string;
  logo_text: string;
  logo_url: string | null;
  industry: string | null;
  city: string | null;
  contact_name: string | null;
  phone: string | null;
  website_url: string | null;
  onboarding_completed: boolean | null;
  preferred_goals: string[] | null;
  diffusion_support: string[] | null;
  google_review_url: string | null;
  instagram_url: string | null;
  default_prize_cost: number | null;
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

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function toMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    companyName: row.company_name,
    logoText: row.logo_text,
    logoUrl: row.logo_url ?? undefined,
    industry: row.industry ?? undefined,
    city: row.city ?? undefined,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    onboardingCompleted: row.onboarding_completed ?? false,
    preferredGoals: row.preferred_goals ?? [],
    diffusionSupport: row.diffusion_support ?? [],
    googleReviewUrl: row.google_review_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    defaultPrizeCost: row.default_prize_cost ?? undefined,
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
  const phone = input.phone.trim();
  const createdAt = new Date().toISOString();

  const merchantInsert = await supabase.from("merchants").insert({
    id: merchantId,
    company_name: companyName,
    logo_text: companyName.slice(0, 2).toUpperCase(),
    logo_url: null,
    industry: "",
    city,
    contact_name: `${firstName} ${lastName}`.trim(),
    phone,
    website_url: "",
    onboarding_completed: false,
    preferred_goals: [],
    diffusion_support: [],
    google_review_url: "",
    instagram_url: "",
    default_prize_cost: 3,
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
      city,
      contactName: `${firstName} ${lastName}`.trim(),
      phone,
      websiteUrl: undefined,
      onboardingCompleted: false,
      preferredGoals: [],
      diffusionSupport: [],
      googleReviewUrl: "",
      instagramUrl: "",
      defaultPrizeCost: 3,
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

  if (error || !data || !verifyPassword(input.password, data.password_hash)) {
    throw new Error("Identifiants invalides.");
  }

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
    throw new Error("Connexion Google impossible.");
  }

  if (existingUser.data) {
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

  const merchantInsert = await supabase.from("merchants").insert({
    id: merchantId,
    company_name: companyName,
    logo_text: companyName.slice(0, 2).toUpperCase(),
    logo_url: null,
    industry: "",
    city: "",
    contact_name: contactName,
    phone: "",
    website_url: "",
    onboarding_completed: false,
    preferred_goals: [],
    diffusion_support: [],
    google_review_url: "",
    instagram_url: "",
    default_prize_cost: 3,
    created_at: createdAt,
  });

  if (merchantInsert.error) {
    throw new Error("Creation du marchand impossible.");
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
    throw new Error("Creation du compte Google impossible.");
  }

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
      city: undefined,
      contactName: contactName || undefined,
      phone: undefined,
      websiteUrl: undefined,
      onboardingCompleted: false,
      preferredGoals: [],
      diffusionSupport: [],
      googleReviewUrl: "",
      instagramUrl: "",
      defaultPrizeCost: 3,
      createdAt,
    },
  };
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
      city: input.city.trim(),
      contact_name: input.contactName.trim(),
      phone: input.phone.trim(),
      preferred_goals: input.preferredGoals,
      diffusion_support: input.diffusionSupport,
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
      city: input.city.trim(),
      contact_name: input.contactName.trim(),
      phone: input.phone.trim(),
      website_url: input.websiteUrl.trim(),
      google_review_url: input.googleReviewUrl.trim(),
      instagram_url: input.instagramUrl.trim(),
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

  const [merchant, user] = await Promise.all([
    getSupabaseMerchantProfile(userQuery.data.merchant_id),
    getSupabaseMerchantUser(userId),
  ]);

  if (!merchant || !user) {
    throw new Error("Compte introuvable apres mise a jour.");
  }

  return { merchant, user };
}
