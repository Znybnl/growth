import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(".env.local", "utf8");

for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);

  if (match) {
    process.env[match[1]] = match[2];
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function isDuplicateAuthUserError(message) {
  const normalized = message.toLowerCase();
  return normalized.includes("already been registered") || normalized.includes("already exists");
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      throw error;
    }

    users.push(...(data.users ?? []));

    if ((data.users ?? []).length < 200) {
      break;
    }

    page += 1;
  }

  return users;
}

function findAuthUser(users, email, merchantUserId) {
  return (
    users.find(
      (user) =>
        user.email?.toLowerCase() === email ||
        user.app_metadata?.merchant_user_id === merchantUserId,
    ) ?? null
  );
}

async function ensureAuthUser(user, authUsers) {
  const email = user.email.trim().toLowerCase();
  const existing = findAuthUser(authUsers, email, user.id);
  const payload = {
    app_metadata: {
      merchant_id: user.merchant_id,
      merchant_user_id: user.id,
      source: "okado-merchant",
    },
    user_metadata: {
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: `${user.first_name} ${user.last_name}`.trim(),
    },
  };

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      ...payload,
    });

    if (error) {
      throw error;
    }

    return { email, action: "updated" };
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password: email === "camille@maisonsora.fr" ? "demo1234" : crypto.randomUUID(),
    email_confirm: true,
    ...payload,
  });

  if (error && !isDuplicateAuthUserError(error.message)) {
    throw error;
  }

  return { email, action: "created" };
}

const { data: merchantUsers, error } = await supabase
  .from("merchant_users")
  .select("id, merchant_id, first_name, last_name, email")
  .order("created_at", { ascending: true });

if (error) {
  throw error;
}

const results = [];
const authUsers = await listAllAuthUsers();

for (const merchantUser of merchantUsers ?? []) {
  results.push(await ensureAuthUser(merchantUser, authUsers));
}

console.log(JSON.stringify({ total: results.length, results }, null, 2));
