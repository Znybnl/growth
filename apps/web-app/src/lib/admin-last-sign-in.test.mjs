import assert from "node:assert/strict";
import { test } from "node:test";
import { readAdminLastSignIns } from "./admin-last-sign-in.ts";

const authUser = (id, at) => ({ id: "auth-secret", email: "private@example.test",
  app_metadata: { merchant_user_id: id, merchant_id: "private-account" }, last_sign_in_at: at });
const client = (users) => ({ auth: { admin: { listUsers: async () => ({ data: { users }, error: null }) } } });

test("returns only safe date/status fields, distinguishing never and unavailable", async () => {
  const users = [authUser("one", "2026-10-25T12:34:00+01:00"), authUser("two", null),
    authUser("three", undefined), authUser("four", "bad-date")];
  const result = await readAdminLastSignIns(client(users), ["one", "two", "three", "four", "missing"]);
  assert.deepEqual([...result.values()], [{ status: "available", at: "2026-10-25T11:34:00.000Z" },
    { status: "never" }, ...Array.from({ length: 3 }, () => ({ status: "unavailable" }))]);
  assert.doesNotMatch(JSON.stringify([...result]), /auth-secret|private/);
});

test("uses server-controlled linkage, never email or user_metadata", async () => {
  const user = { ...authUser("unknown", null), user_metadata: { merchant_user_id: "one" } };
  assert.deepEqual((await readAdminLastSignIns(client([user]), ["one"])).get("one"), { status: "unavailable" });
});

test("ambiguous Auth linkage is unavailable, not an invented date", async () => {
  const result = await readAdminLastSignIns(client([authUser("one", null), authUser("one", "2026-10-25T12:00Z")]), ["one"]);
  assert.deepEqual(result.get("one"), { status: "unavailable" });
});

test("paginates beyond ten pages without per-row calls or nextPage reliance", async () => {
  const calls = [];
  const db = { auth: { admin: { listUsers: async ({ page, perPage }) => {
    calls.push([page, perPage]);
    return { data: { users: page <= 10 ? Array.from({ length: 200 }, (_, i) => authUser(`unrelated-${page}-${i}`, null))
      : [authUser("last", "2026-10-25T12:00Z")], nextPage: 1 }, error: null };
  } } } };
  const result = await readAdminLastSignIns(db, ["last"]);
  assert.equal(calls.length, 11);
  assert.deepEqual(calls[10], [11, 200]);
  assert.equal(result.get("last").status, "available");
});

test("error, thrown failure or interrupted pagination degrades without throwing", async () => {
  for (const listUsers of [async () => ({ error: new Error("private"), data: null }),
    async () => { throw new Error("private"); },
    async ({ page }) => page === 1 ? { data: { users: Array.from({ length: 200 }, (_, i) => authUser(String(i), null)) } }
      : { error: new Error("private"), data: null }]) {
    assert.deepEqual((await readAdminLastSignIns({ auth: { admin: { listUsers } } }, ["0"])).get("0"), { status: "unavailable" });
  }
});

test("bounded scan never exposes a partial result", async () => {
  let calls = 0;
  const db = { auth: { admin: { listUsers: async () => {
    calls++;
    return { data: { users: Array.from({ length: 200 }, (_, i) => authUser(String(i), null)) } };
  } } } };
  assert.equal((await readAdminLastSignIns(db, ["0"])).get("0").status, "unavailable");
  assert.equal(calls, 500);
});

test("empty overview does not call Auth", async () => {
  assert.equal((await readAdminLastSignIns({}, [])).size, 0);
});
