import { notFound } from "next/navigation";
import { TrackingCoverageFixture } from "../../../../e2e/fixtures/tracking-coverage";

export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TrackingCoverageFixture />;
}
