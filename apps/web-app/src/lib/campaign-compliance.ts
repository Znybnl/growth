import { CampaignSetupInput } from "@/lib/types";

const GOOGLE_REVIEW_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "search.google.com",
  "maps.google.com",
  "g.page",
  "maps.app.goo.gl",
]);

const INCENTIVE_COPY_PATTERN =
  /(?:avis|note|5\s*étoiles|bonne note).{0,80}(?:gagn(?:e|er|é)|cadeau|lot|récompens)|(?:gagn(?:e|er|é)|cadeau|lot|récompens).{0,80}(?:avis|note|5\s*étoiles|bonne note)/iu;

export class CampaignComplianceError extends Error {
  readonly code = "campaign_not_publishable";
  readonly status = 422;
}

function assertSecureActionUrl(url: string, kind: string) {
  if (kind === "crm") return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Chaque action marketing doit contenir un lien valide.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Les liens d’action doivent utiliser HTTPS.");
  }

  if (kind === "google" && !GOOGLE_REVIEW_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("Le lien d’avis doit pointer vers une adresse Google officielle.");
  }
}

function assertNoReviewIncentiveCopy(input: CampaignSetupInput) {
  const googleAction = input.actions.find((action) => action.kind === "google");
  if (!googleAction) return;

  // Review copy and game copy are separate UI surfaces. Checking them as one
  // sentence creates false positives for legitimate copy such as
  // "Grattez et gagnez !" next to the independent Google review action.
  const copyFields = [input.subtitle, googleAction.label, input.ctaLabel];
  if (copyFields.some((copy) => INCENTIVE_COPY_PATTERN.test(copy))) {
    throw new Error("Une invitation à laisser un avis ne peut pas promettre ou conditionner un lot.");
  }
}

function assertCampaignCanPublishInternal(input: CampaignSetupInput) {
  if (!input.isActive) return;

  if (!input.title.trim()) throw new Error("Le nom de l’animation est requis avant publication.");
  if (input.prizes.length === 0) throw new Error("Ajoutez au moins un lot avant de publier l’animation.");

  const totalProbability = input.prizes.reduce((sum, prize) => {
    if (!Number.isFinite(prize.probability) || prize.probability < 0 || prize.probability > 100) {
      throw new Error("La probabilité de chaque lot doit être comprise entre 0 et 100 %.");
    }
    if (prize.totalQuantity !== null && prize.totalQuantity <= 0) {
      throw new Error("La quantité d’un lot doit être supérieure à 0 (ou illimitée).");
    }
    return sum + prize.probability;
  }, 0);

  if (totalProbability > 100.0001) throw new Error("Le total des probabilités ne peut pas dépasser 100 %.");
  if (input.rewardRules.isWinningEveryTime && totalProbability < 99.9999) {
    throw new Error("Un jeu 100 % gagnant doit totaliser exactement 100 % de probabilités.");
  }

  for (const action of input.actions) assertSecureActionUrl(action.url, action.kind);

  if (!input.presentation.email.subject.trim() || !input.presentation.email.body.trim()) {
    throw new Error("L’e-mail de gain doit avoir un objet et un message avant publication.");
  }

  assertNoReviewIncentiveCopy(input);
}

/** Server-side publication gate for crafted requests as well as the editor. */
export function assertCampaignCanPublish(input: CampaignSetupInput) {
  try {
    return assertCampaignCanPublishInternal(input);
  } catch (error) {
    if (error instanceof CampaignComplianceError) throw error;
    throw new CampaignComplianceError(error instanceof Error ? error.message : "Campagne non publiable");
  }
}
