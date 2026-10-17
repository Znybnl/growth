import { isBeautyIndustry } from "@/lib/merchant-options";

export const ONBOARDING_STEPS = [
  { id: "profil", label: "Profil", title: "Informations de base" },
  { id: "reseaux", label: "Liens marketing", title: "Liens repris dans vos campagnes" },
  { id: "pin", label: "Code PIN", title: "Sécurisez les retraits" },
] as const;

type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export function shouldShowAppointmentUrl(industry: string) {
  return isBeautyIndustry(industry);
}

export function validateOnboardingStep(
  stepId: OnboardingStepId,
  values: { companyName: string; industry: string; city: string; redemptionPin: string },
) {
  if (stepId === "profil") {
    if (!values.companyName.trim()) return "Renseignez le nom de l’enseigne pour continuer.";
    if (!values.industry.trim()) return "Choisissez un secteur d’activité pour continuer.";
    if (!values.city.trim()) return "Renseignez la ville du commerce pour continuer.";
  }
  if (stepId === "pin" && !/^\d{4}$/.test(values.redemptionPin)) {
    return "Le code PIN doit contenir exactement 4 chiffres.";
  }
  return null;
}
