import { BackgroundLibraryManager } from "@/components/merchant/background-library-manager";
import { getBackgroundLibrary } from "@/lib/background-library-repository";
import { requireAuthenticatedSession } from "@/lib/auth";

export default async function BackgroundLibraryPage() {
  await requireAuthenticatedSession();
  const items = await getBackgroundLibrary();

  return <BackgroundLibraryManager initialItems={items} />;
}
