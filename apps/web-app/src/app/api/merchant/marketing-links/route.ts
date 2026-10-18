import { handleMarketingLinkUpdate } from "@/lib/merchant-marketing-links";

export async function PATCH(request: Request) {
  return handleMarketingLinkUpdate(request);
}
