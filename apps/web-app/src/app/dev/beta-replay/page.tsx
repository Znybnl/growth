import { notFound } from "next/navigation";
import { BetaReplayProof } from "../../../../e2e/fixtures/beta-replay";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <BetaReplayProof />;
}
