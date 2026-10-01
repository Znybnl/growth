import type { ActionKind, CampaignAction, Merchant } from "./types";

type WizardGoalType = "review_prompt" | "social_follow" | "lead_capture";

export type WizardMarketingActionDefault = Pick<CampaignAction, "id" | "kind" | "url">;

export function wizardMarketingActionUrl(merchant: Merchant, kind: ActionKind): string;

export function createWizardMarketingActionDefaults(
  merchant: Merchant,
  goalType: WizardGoalType | null,
): WizardMarketingActionDefault[];

export function createAdminWizardMarketingActionDefaults(
  merchant: Merchant,
): Array<WizardMarketingActionDefault & { label?: string }>;
