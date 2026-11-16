import { notFound } from "next/navigation";
import { ParticipationFixture } from "../../../../e2e/fixtures/participation";

// A synthetic game used only by browser tests; never available in production.
export default function CookieFreeGameFixture() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ParticipationFixture mechanic="wheel" />;
}
