export type MerchantAlerts = {
  emailCount: number;
  emailCampaignId: string | null;
  emailSnapshot: Array<{ id: string; status: string; eventAt: string | null }>;
  lowStockCount: number;
  exhaustedStockCount: number;
  stockCampaignId: string | null;
};

export const EMPTY_MERCHANT_ALERTS: MerchantAlerts = {
  emailCount: 0, emailCampaignId: null, emailSnapshot: [], lowStockCount: 0,
  exhaustedStockCount: 0, stockCampaignId: null,
};
