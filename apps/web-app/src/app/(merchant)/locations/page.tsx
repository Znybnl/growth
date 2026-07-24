import { LocationManager } from "@/components/merchant/location-manager";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getMerchantWorkspaceContext } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const session = await requireAuthenticatedSession();
  const context = await getMerchantWorkspaceContext(session.user.id, session.merchant);
  return <LocationManager workspace={context.workspace} locations={context.locations} />;
}

