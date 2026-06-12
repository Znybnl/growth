import {
  ActionKind,
  ButtonSize,
  GameType,
  GoalType,
  LeadStatus,
  TextAlign,
  TextFont,
} from "@/lib/types";

export function formatPercent(value: number) {
  return `${value}%`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function goalLabel(goalType: GoalType) {
  switch (goalType) {
    case "lead_capture":
      return "Collecte CRM";
    case "review_prompt":
      return "Avis Google";
    case "social_follow":
      return "Social / trafic";
    default:
      return "Campagne";
  }
}

export function goalDescription(goalType: GoalType) {
  switch (goalType) {
    case "review_prompt":
      return "Drive-to-review conforme, sans bloquer le jeu.";
    case "social_follow":
      return "Visite du canal social puis participation.";
    case "lead_capture":
      return "Participation directe après opt-in.";
    default:
      return "Activation locale.";
  }
}

export function gameTypeLabel(gameType: GameType) {
  switch (gameType) {
    case "wheel":
      return "Roue de la fortune";
    case "scratch":
      return "Ticket à gratter";
    default:
      return "Jeu";
  }
}

export function leadStatusLabel(status: LeadStatus) {
  switch (status) {
    case "claimed":
      return "À retirer";
    case "redeemed":
      return "Retiré";
    case "expired":
      return "Expiré";
    case "lost":
      return "Perdu";
    default:
      return status;
  }
}

export function shortPrizeLabel(label: string) {
  const compact = label
    .replace("signature", "")
    .replace("offert", "")
    .replace(" du jour", "")
    .replace(" upgrade", "")
    .replace(" capsule", "")
    .trim();

  return compact.length > 16 ? `${compact.slice(0, 14)}...` : compact;
}

export function sluggy(label: string) {
  return label.toLowerCase().replaceAll(" ", "-");
}

export function actionKindLabel(kind: ActionKind) {
  switch (kind) {
    case "google":
      return "Google";
    case "instagram":
      return "Instagram";
    case "facebook":
      return "Facebook";
    case "tiktok":
      return "TikTok";
    case "tripadvisor":
      return "Tripadvisor";
    case "crm":
      return "Données clients";
    default:
      return "Personnalisé";
  }
}

export function actionKindCta(kind: ActionKind) {
  switch (kind) {
    case "google":
      return "Laisser un avis Google";
    case "instagram":
      return "Ouvrir Instagram";
    case "facebook":
      return "Ouvrir Facebook";
    case "tiktok":
      return "Ouvrir TikTok";
    case "tripadvisor":
      return "Ouvrir Tripadvisor";
    case "crm":
      return "Partager mes coordonnees";
    default:
      return "Ouvrir le lien";
  }
}

export function textAlignLabel(align: TextAlign) {
  switch (align) {
    case "left":
      return "Gauche";
    case "center":
      return "Centre";
    case "right":
      return "Droite";
    default:
      return "Centre";
  }
}

export function textFontLabel(font: TextFont) {
  switch (font) {
    case "display":
      return "Display";
    case "serif":
      return "Serif";
    case "sans":
      return "Sans";
    default:
      return "Sans";
  }
}

export function buttonSizeLabel(size: ButtonSize) {
  switch (size) {
    case "sm":
      return "Petit";
    case "lg":
      return "Grand";
    default:
      return "Moyen";
  }
}
