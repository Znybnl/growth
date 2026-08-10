import { LocationManager } from "@/components/merchant/location-manager";
import { requireAuthenticatedSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const session = await requireAuthenticatedSession();
  return <LocationManager workspace={session.workspace} locations={session.locations} />;
}