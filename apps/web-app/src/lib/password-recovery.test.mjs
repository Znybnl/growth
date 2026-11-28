import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  authErrorStatus,
  completePasswordRecovery,
  normalizeRecoveryEmail,
  recoveryEmailRateLimitKey,
} from "./password-recovery.ts";

function fakeAuth(overrides = {}) {
  const calls = [];
  const auth = {
    async verifyOtp(input) {
      calls.push(["verifyOtp", input]);
      return { data: { user: { id: "recovered-user" } }, error: null };
    },
    async getUser() {
      calls.push(["getUser"]);
      return { data: { user: { id: "recovered-user" } }, error: null };
    },
    async updateUser(input) {
      calls.push(["updateUser", input]);
      return { error: null };
    },
    async signOut(input) {
      calls.push(["signOut", input]);
      return { error: null };
    },
    ...overrides,
  };
  return { auth, calls };
}

test("normalise l’adresse et ne conserve jamais sa valeur dans la clé de limitation", () => {
  assert.equal(normalizeRecoveryEmail("  CAMILLE@example.com "), "camille@example.com");
  assert.equal(normalizeRecoveryEmail("pas-une-adresse"), null);
  assert.equal(normalizeRecoveryEmail(""), null);
  assert.equal(normalizeRecoveryEmail("x".repeat(250) + "@example.com"), null);

  const key = recoveryEmailRateLimitKey("CAMILLE@example.com");
  assert.match(key, /^auth-password-recovery-email:[a-f0-9]{64}$/);
  assert.equal(key, recoveryEmailRateLimitKey("camille@example.com"));
  assert.doesNotMatch(key, /camille|example/i);
  assert.notEqual(key, recoveryEmailRateLimitKey("autre@example.com"));
});

test("le jeton doit être vérifié avant la mise à jour et vise l’utilisateur retourné par Supabase", async () => {
  const { auth, calls } = fakeAuth();
  const result = await completePasswordRecovery({
    auth,
    tokenHash: "verified-one-time-token",
    recoveryUserId: "previous-browser-user",
    password: "nouveau-secret",
  });

  assert.deepEqual(result, { kind: "success", sessionsRevoked: true });
  assert.deepEqual(calls, [
    ["verifyOtp", { token_hash: "verified-one-time-token", type: "recovery" }],
    ["updateUser", { password: "nouveau-secret" }],
    ["signOut", { scope: "global" }],
  ]);
});

test("un lien invalide ne modifie pas le mot de passe", async () => {
  const { auth, calls } = fakeAuth({
    async verifyOtp(input) {
      calls.push(["verifyOtp", input]);
      return { data: { user: null }, error: { status: 400 } };
    },
  });
  const result = await completePasswordRecovery({ auth, tokenHash: "invalid", password: "secret" });

  assert.deepEqual(result, { kind: "invalid_link" });
  assert.equal(calls.some(([name]) => name === "updateUser"), false);
});

test("une session ordinaire ou rattachée à un autre utilisateur ne permet pas le changement", async () => {
  const first = fakeAuth();
  const noMarker = await completePasswordRecovery({
    auth: first.auth,
    password: "secret",
  });
  assert.deepEqual(noMarker, { kind: "recovery_required" });
  assert.equal(first.calls.some(([name]) => name === "updateUser"), false);

  const second = fakeAuth();
  const wrongUser = await completePasswordRecovery({
    auth: second.auth,
    recoveryUserId: "different-user",
    password: "secret",
  });
  assert.deepEqual(wrongUser, { kind: "recovery_required" });
  assert.equal(second.calls.some(([name]) => name === "updateUser"), false);
});

test("une erreur de politique conserve la session vérifiée pour permettre un nouvel essai", async () => {
  const { auth, calls } = fakeAuth({
    async updateUser(input) {
      calls.push(["updateUser", input]);
      return { error: { status: 422 } };
    },
  });
  const result = await completePasswordRecovery({
    auth,
    tokenHash: "one-time-token",
    password: "weak",
  });

  assert.deepEqual(result, { kind: "password_rejected", recoveryUserId: "recovered-user" });
  assert.equal(calls.some(([name]) => name === "signOut"), false);
});

test("un échec de révocation ferme la session locale et signale les autres sessions possibles", async () => {
  const { auth, calls } = fakeAuth({
    async signOut(input) {
      calls.push(["signOut", input]);
      return input.scope === "global" ? { error: { status: 503 } } : { error: null };
    },
  });
  const result = await completePasswordRecovery({
    auth,
    tokenHash: "one-time-token",
    password: "new-password",
  });

  assert.deepEqual(result, { kind: "success", sessionsRevoked: false });
  assert.deepEqual(calls.slice(-2), [
    ["signOut", { scope: "global" }],
    ["signOut", { scope: "local" }],
  ]);
});

test("extrait seulement un statut numérique d’une erreur Supabase", () => {
  assert.equal(authErrorStatus({ status: 429 }), 429);
  assert.equal(authErrorStatus({ status: "429" }), null);
  assert.equal(authErrorStatus(null), null);
});

test("le modèle e-mail utilise TokenHash dans le fragment et ne contient aucun lien de suivi", () => {
  const html = readFileSync(new URL("../../emails/password-recovery.html", import.meta.url), "utf8");
  assert.match(html, /#token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/);
  assert.doesNotMatch(html, /\.ConfirmationURL|\.Email|tracking|utm_/i);
});
