import assert from "node:assert/strict";
import test from "node:test";

import { runOnceForSession } from "./session-action-guard.ts";

test("session action runs once, then permits the next prepared session", () => {
  const guard = { current: null };
  const calls = [];

  assert.equal(runOnceForSession(guard, "session-a", () => calls.push("a")), true);
  assert.equal(runOnceForSession(guard, "session-a", () => calls.push("duplicate")), false);
  assert.equal(runOnceForSession(guard, "session-b", () => calls.push("b")), true);
  assert.deepEqual(calls, ["a", "b"]);
});
