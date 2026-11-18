import test from "node:test";
import assert from "node:assert/strict";
import { isPermanentRewardEmailBounce } from "./reward-email-bounce.ts";

const delivery = { status: "bounced", resendEmailId: "current", lastEventAt: "2026-10-01T12:00:00.123456+00:00" };
const event = { eventType: "email.bounced", resendEmailId: "current", payload: {
  created_at: "2026-10-01T12:00:00.123456Z", data: { bounce: { type: "Permanent" } },
} };

test("seul un rebond permanent de l'événement courant interdit le renvoi", () => {
  assert.equal(isPermanentRewardEmailBounce(delivery, [event]), true);
  for (const type of ["Transient", "Undetermined", ""]) {
    assert.equal(isPermanentRewardEmailBounce(delivery, [{ ...event, payload: { ...event.payload, data: { bounce: { type } } } }]), false);
  }
  assert.equal(isPermanentRewardEmailBounce({ ...delivery, status: "sent" }, [event]), false);
  assert.equal(isPermanentRewardEmailBounce({ ...delivery, resendEmailId: "new" }, [event]), false);
  assert.equal(isPermanentRewardEmailBounce({ ...delivery, lastEventAt: "2026-10-01T12:00:00.123457Z" }, [event]), false);
  assert.equal(isPermanentRewardEmailBounce(delivery, [{ ...event, payload: {} }]), false);
});
