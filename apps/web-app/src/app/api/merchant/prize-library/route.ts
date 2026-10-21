import { handleReusablePrizes } from "@/lib/reusable-prize-api";

export async function GET(request: Request) {
  return handleReusablePrizes(request);
}
