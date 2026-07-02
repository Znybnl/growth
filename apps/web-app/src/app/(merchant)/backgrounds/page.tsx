import { BackgroundLibraryManager } from "@/components/merchant/background-library-manager";
import { getBackgroundLibrary } from "@/lib/background-library-repository";
import { requireAuthenticatedSession } from "@/lib/auth";
import { isSaasAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";

export default async function BackgroundLibraryPage() {
  const session = await requireAuthenticatedSession();

  if (!isSaasAdminEmail(session.user.email)) {
    redirect("/");
  }

  const items = await getBackgroundLibrary();

  return <BackgroundLibraryManager initialItems={items} />;
}
