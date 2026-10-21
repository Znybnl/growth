import { handleReusablePrizes } from "@/lib/reusable-prize-api";

export async function GET(request: Request, { params }: {
  params: Promise<{ merchantId: string; locationId: string }>;
}) {
  return handleReusablePrizes(request, await params);
}
