import { handleMarketingLinkUpdate } from "@/lib/merchant-marketing-links";

export async function PATCH(request: Request, { params }: {
  params: Promise<{ merchantId: string; locationId: string }>;
}) {
  return handleMarketingLinkUpdate(request, await params);
}
