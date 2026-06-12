import { hashPassword, verifyPassword } from "@/lib/passwords";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  Merchant,
  MerchantOnboardingInput,
  MerchantSignInInput,
  MerchantSignUpInput,
  MerchantUser,
} from "@/lib/types";

const defaultLogoUrl =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#132238"/>
          <stop offset="100%" stop-color="#243a57"/>
        </linearGradient>
      </defs>
      <rect width="220" height="220" rx="56" fill="url(#bg)"/>
      <rect x="28" y="28" width="164" height="164" rx="38" fill="#f4efe6" opacity="0.95"/>
      <text x="110" y="118" text-anchor="middle" font-size="72" font-family="Georgia, serif" font-weight="700" fill="#132238">MS</text>
      <text x="110" y="154" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" letter-spacing="4" fill="#786746">MAISON</text>
    </svg>
  `);

type MerchantRow = {
  id: string;
  company_name: string;
  logo_text: string;
  logo_url: string | null;
  city: string | null;
  contact_name: string | null;
  phone: string | null;
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

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function toMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    companyName: row.company_name,
    logoText: row.logo_text,
    logoUrl: row.logo_url ?? undefined,
    city: row.city ?? undefined,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
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
    logo_url: defaultLogoUrl,
    city,
    contact_name: `${firstName} ${lastName}`.trim(),
    phone,
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
      logoUrl: defaultLogoUrl,
      city,
      contactName: `${firstName} ${lastName}`.trim(),
      phone,
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
