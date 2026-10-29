import { notFound } from "next/navigation";
import { OnboardingScreen } from "@/components/auth/onboarding-screen";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <OnboardingScreen
    merchant={{
      id: "merchant-onboarding-fixture", companyName: "Commerce fictif", logoText: "Démo",
      contactName: "PRIVATE_CONTACT_FIXTURE", onboardingCompleted: false,
      createdAt: "2026-10-28T00:00:00Z",
    }}
    user={{ id: "user-onboarding-fixture", merchantId: "merchant-onboarding-fixture",
      email: "onboarding@example.test" }}
  />;
}
