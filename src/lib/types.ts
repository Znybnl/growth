export type GoalType = "lead_capture" | "review_prompt" | "social_follow";
export type GameType = "wheel" | "scratch";
export type TextAlign = "left" | "center" | "right";
export type TextFont = "display" | "sans" | "serif";
export type ButtonSize = "sm" | "md" | "lg";
export type BackgroundMode = "color" | "image";
export type ActionKind =
  | "google"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "tripadvisor"
  | "crm"
  | "custom";

export type LeadStatus = "claimed" | "redeemed" | "expired" | "lost";

export type EventType =
  | "scan"
  | "form_started"
  | "lead_created"
  | "review_clicked"
  | "review_confirmed"
  | "social_clicked"
  | "game_played"
  | "prize_won"
  | "prize_redeemed"
  | "prize_expired";

export interface Merchant {
  id: string;
  companyName: string;
  logoText: string;
  logoUrl?: string;
  city?: string;
  contactName?: string;
  phone?: string;
  onboardingCompleted?: boolean;
  preferredGoals?: string[];
  diffusionSupport?: string[];
  googleReviewUrl?: string;
  instagramUrl?: string;
  defaultPrizeCost?: number;
  createdAt: string;
}

export interface MerchantUser {
  id: string;
  merchantId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface MerchantSignUpInput {
  companyName: string;
  city: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface MerchantSignInInput {
  email: string;
  password: string;
}

export interface MerchantOnboardingInput {
  companyName: string;
  city: string;
  contactName: string;
  phone: string;
  preferredGoals: string[];
  diffusionSupport: string[];
}

export interface CampaignAccent {
  ink: string;
  paper: string;
  signal: string;
}

export interface CampaignLogoSettings {
  sizePercent: number;
  marginBottomPx: number;
  align: TextAlign;
}

export interface CampaignBackgroundSettings {
  mode: BackgroundMode;
  color: string;
  imageUrl?: string;
}

export interface CampaignHeadingSettings {
  textColor: string;
  fontSizePx: number;
  fontFamily: TextFont;
  align: TextAlign;
}

export interface CampaignButtonSettings {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  size: ButtonSize;
  textSizePx: number;
}

export interface CampaignLayoutSettings {
  blockSpacingPx: number;
}

export interface CampaignWheelSettings {
  rimColor: string;
  winColor: string;
  alternateWinColor: string;
  loseColor: string;
  alternateLoseColor: string;
}

export interface CampaignPresentation {
  logo: CampaignLogoSettings;
  background: CampaignBackgroundSettings;
  heading: CampaignHeadingSettings;
  button: CampaignButtonSettings;
  layout: CampaignLayoutSettings;
  wheel: CampaignWheelSettings;
}

export interface CampaignAction {
  id: string;
  kind: ActionKind;
  label: string;
  url: string;
}

export interface CampaignRewardRules {
  rewardExpiryMinutes: number;
  purchaseRequired: boolean;
  availableAfterHours: number;
  availabilityDurationDays: number;
  isWinningEveryTime: boolean;
}

export interface Campaign {
  id: string;
  merchantId: string;
  title: string;
  subtitle: string;
  goalType: GoalType;
  ctaLabel: string;
  successMetric: string;
  targetUrl?: string;
  isActive: boolean;
  createdAt: string;
  accent: CampaignAccent;
  gameType: GameType;
  logoUrl?: string;
  presentation: CampaignPresentation;
  actions: CampaignAction[];
  rewardRules: CampaignRewardRules;
}

export interface Prize {
  id: string;
  campaignId: string;
  label: string;
  totalQuantity: null | number;
  remainingQuantity: null | number;
  probability: number;
  estimatedUnitCost: number;
}

export interface Lead {
  id: string;
  campaignId: string;
  firstName: string;
  email: string;
  phone?: string;
  marketingConsent: boolean;
  consentTimestamp: string;
  prizeId?: string;
  status: LeadStatus;
  createdAt: string;
  actionConfirmed: boolean;
  redemptionCode?: string;
  rewardAvailableAt?: string;
  rewardExpiresAt?: string;
}

export interface CampaignEvent {
  id: string;
  campaignId: string;
  leadId?: string;
  eventType: EventType;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface PublicCampaignPrize {
  id: string;
  label: string;
}

export interface PublicCampaign {
  id: string;
  title: string;
  subtitle: string;
  goalType: GoalType;
  gameType: GameType;
  ctaLabel: string;
  targetUrl?: string;
  merchantName: string;
  merchantLogoText: string;
  logoUrl?: string;
  accent: CampaignAccent;
  prizes: PublicCampaignPrize[];
  presentation: CampaignPresentation;
  actions: CampaignAction[];
  rewardRules: CampaignRewardRules;
}

export interface DrawRequest {
  campaignId: string;
  firstName: string;
  email: string;
  marketingConsent: boolean;
}

export interface DrawResult {
  lead: Lead;
  prize: Prize | null;
  campaign: PublicCampaign;
}

export interface CampaignKpi {
  scans: number;
  leads: number;
  actions: number;
  games: number;
  wins: number;
  redeemed: number;
  conversionRate: number;
  actionRate: number;
  redemptionRate: number;
  estimatedSpend: number;
  costPerLead: number;
  costPerRedeemed: number;
}

export interface CampaignPerformance {
  campaign: Campaign;
  merchant: Merchant;
  prizes: Prize[];
  kpis: CampaignKpi;
}

export interface MerchantDashboardData {
  merchant: Merchant;
  campaigns: CampaignPerformance[];
  totalLeads: number;
  totalRedeemed: number;
  averageConversion: number;
}

export interface MerchantLeadRow extends Lead {
  campaignTitle: string;
  goalType: GoalType;
  prizeLabel: string;
}

export interface CampaignDataView {
  performance: CampaignPerformance;
  leads: MerchantLeadRow[];
  events: CampaignEvent[];
}

export interface CampaignSetupInput {
  id?: string;
  merchantId: string;
  title: string;
  subtitle: string;
  goalType: GoalType;
  ctaLabel: string;
  successMetric: string;
  targetUrl?: string;
  isActive: boolean;
  accent: CampaignAccent;
  gameType: GameType;
  logoUrl?: string;
  presentation: CampaignPresentation;
  actions: CampaignAction[];
  rewardRules: CampaignRewardRules;
  prizes: Array<{
    id?: string;
    label: string;
    totalQuantity: null | number;
    probability: number;
    estimatedUnitCost: number;
  }>;
}
