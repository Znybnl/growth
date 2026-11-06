import { notFound } from "next/navigation";
import { EMPTY_MERCHANT_ALERTS } from "@/lib/merchant-alerts";
import { PerformanceProof } from "./proof";

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { seed } = await searchParams;
  const snapshot = { ...EMPTY_MERCHANT_ALERTS, emailCount: 9 };
  return <PerformanceProof
    initialAlerts={seed === "ready" ? Promise.resolve(snapshot) : undefined}
    delayInitialAlerts={seed === "slow"}
  />;
}
