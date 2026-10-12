import { notFound } from "next/navigation";
import { RewardReminderProof } from "@/components/merchant/reward-reminder-proof";
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className="mx-auto max-w-3xl bg-soft-white p-4 sm:p-8"><h1 className="mb-6 text-2xl font-semibold">Relance — données fictives</h1><RewardReminderProof /></main>;
}
