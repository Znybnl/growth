export type GoalType = "lead_capture" | "review_prompt" | "social_follow";
export type GameType = "wheel" | "scratch";
export type TextAlign = "left" | "center" | "right";
export type TextFont = "display" | "sans" | "serif";
export type LogoMode = "none" | "image" | "text";
export type ButtonSize = "sm" | "md" | "lg";
export type BackgroundMode = "color" | "image";
export type PosterTemplateId = "classic-wheel" | "soft-gradient-wheel" | "terracotta-wheel";
export type ActionKind =
  | "google"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "tripadvisor"
  | "crm"
  | "custom";

export type LeadStatus = "claimed" | "redeemed" | "expired" | "lost";
export type RewardEmailDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "suppressed"
  | "failed";

export type MerchantSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

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
  | "prize_expired"
  | "prize_reset";

export interface Merchant {
  id: string;
  companyName: string;
  logoText: string;
  logoUrl?: string;
  industry?: string;
  restaurantType?: string;
  city?: string;
  address?: string;
  contactName?: string;
  phone?: string;
  restaurantEmail?: string;
  websiteUrl?: string;
  onboardingCompleted?: boolean;
  preferredGoals?: string[];
  diffusionSupport?: string[];
  googleReviewUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  tripadvisorUrl?: string;
  customLinkUrl?: string;
  defaultPrizeCost?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: MerchantSubscriptionStatus;
  trialStartDate?: string;
  trialEndDate?: string;
  subscriptionCurrentPeriodEnd?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
  createdAt: string;
}

export interface MerchantBillingSummary {
  trialStartDate?: string;
  trialEndDate?: string;
  subscriptionStatus?: MerchantSubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string;
  subscriptionCancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  hasPaymentMethodOnFile: boolean;
  isTrialActive: boolean;
  isSubscribed: boolean;
  isPastDue: boolean;
  isBillingLocked: boolean;
  daysLeftInTrial: number;
  nextBillingDate?: string;
}

export type AffiliateAccountStatus = "active" | "disabled";
export type AffiliateReferralStatus = "registered" | "trialing" | "active" | "canceled";
export type AffiliateCommissionStatus = "pending" | "payable" | "paid" | "void";

export interface AffiliateAccount {
  id: string;
  merchantId: string;
  code: string;
  status: AffiliateAccountStatus;
  commissionRateBps: number;
  commissionDurationMonths: number;
  payoutDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateReferralItem {
  id: string;
  affiliateMerchantId: string;
  referredMerchantId: string;
  referredMerchantName: string;
  referredMerchantEmail?: string;
  status: AffiliateReferralStatus;
  firstSubscriptionPaidAt?: string;
  commissionEligibleUntil?: string;
  createdAt: string;
  totalCommissionCents: number;
  paidCommissionCents: number;
  pendingCommissionCents: number;
}

export interface AffiliateSummary {
  account: AffiliateAccount;
  referralLinkPath: string;
  totals: {
    referrals: number;
    activeReferrals: number;
    pendingCommissionCents: number;
    paidCommissionCents: number;
    totalCommissionCents: number;
  };
  referrals: AffiliateReferralItem[];
}

export interface AffiliateAdminCommissionItem {
  id: string;
  affiliateMerchantId: string;
  affiliateMerchantName: string;
  referredMerchantId: string;
  referredMerchantName: string;
  stripeInvoiceId: string;
  stripeSubscriptionId?: string;
  invoicePaidAt: string;
  invoiceAmountCents: number;
  commissionAmountCents: number;
  currency: string;
  status: AffiliateCommissionStatus;
  createdAt: string;
}

export interface AffiliateAdminAccountItem {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantEmail?: string;
  code: string;
  status: AffiliateAccountStatus;
  commissionRateBps: number;
  commissionDurationMonths: number;
  referralCount: number;
  pendingCommissionCents: number;
  paidCommissionCents: number;
}

export interface AffiliateAdminOverview {
  totals: {
    affiliates: number;
    activeAffiliates: number;
    referrals: number;
    pendingCommissionCents: number;
    payableCommissionCents: number;
    paidCommissionCents: number;
  };
  accounts: AffiliateAdminAccountItem[];
  commissions: AffiliateAdminCommissionItem[];
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
  phone?: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
}

export interface MerchantSignInInput {
  email: string;
  password: string;
}

export interface MerchantOnboardingInput {
  companyName: string;
  industry: string;
  restaurantType: string;
  city: string;
  contactName: string;
  phone: string;
  restaurantEmail: string;
  websiteUrl: string;
  address: string;
  defaultPrizeCost: number;
  preferredGoals: string[];
  diffusionSupport: string[];
  googleReviewUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  tripadvisorUrl: string;
  customLinkUrl: string;
}

export interface MerchantAccountSettingsInput {
  companyName: string;
  industry: string;
  restaurantType: string;
  city: string;
  address: string;
  contactName: string;
  phone: string;
  restaurantEmail: string;
  websiteUrl: string;
  googleReviewUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  tripadvisorUrl: string;
  customLinkUrl: string;
  defaultPrizeCost: number;
  firstName: string;
  lastName: string;
  email: string;
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

export interface BackgroundLibraryAsset {
  id: string;
  label: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: "built-in" | "uploaded";
  width?: number;
  height?: number;
  createdAt?: string;
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
  isBold: boolean;
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

export interface CampaignPosterSettings {
  templateId?: PosterTemplateId;
  logoMode?: LogoMode;
  logoText?: string;
  logoUrl?: string;
  logoSizePercent: number;
  logoBottomMarginPx: number;
  backgroundMode?: BackgroundMode;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  headline: string;
  headlineTextColor: string;
  headlineFontSizePx: number;
  headlineFontFamily: TextFont;
  wheel: CampaignWheelSettings;
  footerBackgroundColor: string;
}

export interface CampaignEmailSettings {
  senderName: string;
  replyTo: string;
  subject: string;
  preheader: string;
  headline: string;
  body: string;
  buttonLabel: string;
  footerNote: string;
  accentColor: string;
}

export interface CampaignPresentation {
  logo: CampaignLogoSettings;
  background: CampaignBackgroundSettings;
  heading: CampaignHeadingSettings;
  button: CampaignButtonSettings;
  layout: CampaignLayoutSettings;
  wheel: CampaignWheelSettings;
  poster: CampaignPosterSettings;
  email: CampaignEmailSettings;
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
  logoMode?: LogoMode;
  logoText?: string;
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
  usageConditions?: string;
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
  prizeUsageConditions?: string;
}

export interface CampaignEvent {
  id: string;
  campaignId: string;
  leadId?: string;
  eventType: EventType;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface RewardEmailDelivery {
  id: string;
  leadId: string;
  campaignId: string;
  resendEmailId?: string;
  recipientEmail: string;
  senderEmail?: string;
  replyToEmail?: string;
  subject: string;
  status: RewardEmailDeliveryStatus;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  bouncedAt?: string;
  complainedAt?: string;
  lastEventAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
  updatedAt: string;
}

export interface RewardEmailEvent {
  id: string;
  rewardEmailDeliveryId?: string;
  resendEmailId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface MerchantFailedEmailItem {
  deliveryId: string;
  campaignId: string;
  campaignTitle: string;
  leadId: string;
  leadFirstName: string;
  recipientEmail: string;
  status: RewardEmailDeliveryStatus;
  errorMessage?: string;
  lastEventAt: string;
}

export interface MerchantWebhookItem {
  id: string;
  createdAt: string;
  eventType: string;
  resendEmailId?: string;
  campaignTitle?: string;
  recipientEmail?: string;
  deliveryStatus?: RewardEmailDeliveryStatus;
  summary?: string;
}

export interface MerchantPendingClaimItem {
  leadId: string;
  campaignId: string;
  campaignTitle: string;
  firstName: string;
  email: string;
  prizeLabel: string;
  redemptionCode: string;
  status: LeadStatus;
  availableAt?: string;
  expiresAt?: string;
}

export interface MerchantBusinessLogItem {
  id: string;
  createdAt: string;
  level: "info" | "warn" | "error";
  event: string;
  merchantId?: string;
  campaignId?: string;
  leadId?: string;
  email?: string;
  redemptionCode?: string;
  summary?: string;
}

export interface MerchantSupportOverview {
  failedEmails: MerchantFailedEmailItem[];
  webhooks: MerchantWebhookItem[];
  pendingClaims: MerchantPendingClaimItem[];
  businessLogs: MerchantBusinessLogItem[];
}

export interface PublicCampaignPrize {
  id: string;
  label: string;
  totalQuantity: null | number;
  remainingQuantity: null | number;
  probability: number;
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
  logoMode?: LogoMode;
  logoText?: string;
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

export interface DrawSession {
  id: string;
  campaignId: string;
  prizeId?: string;
  status: "pending" | "completed" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface CreateDrawSessionRequest {
  campaignId: string;
}

export interface CreateDrawSessionResult {
  session: DrawSession;
  prize: Prize | null;
  campaign: PublicCampaign;
}

export interface FinalizeDrawSessionRequest {
  sessionId: string;
  firstName: string;
  email: string;
  marketingConsent?: boolean;
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

export interface CampaignLibraryItem {
  id: string;
  title: string;
  gameType: GameType;
  isActive: boolean;
  createdAt: string;
}

export interface MerchantDashboardData {
  merchant: Merchant;
  campaigns: CampaignPerformance[];
  totalLeads: number;
  totalRedeemed: number;
  averageConversion: number;
  activityPoints: Array<{
    label: string;
    scans: number;
    participations: number;
  }>;
}

export interface MerchantLeadRow extends Lead {
  campaignTitle: string;
  goalType: GoalType;
  prizeLabel: string;
  prizeUsageConditions?: string;
  emailDeliveryStatus?: RewardEmailDeliveryStatus;
  emailSentAt?: string;
  emailDeliveredAt?: string;
  emailErrorMessage?: string;
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
  logoMode?: LogoMode;
  logoText?: string;
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
    usageConditions?: string;
  }>;
}
