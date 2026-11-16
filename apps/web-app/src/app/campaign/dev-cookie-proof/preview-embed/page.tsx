import { notFound } from "next/navigation";
import { ParticipationFixture } from "../../../../../e2e/fixtures/participation";

export default function CookieFreePreviewFixture() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ParticipationFixture mechanic="wheel" preview />;
}
