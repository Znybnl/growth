import { redirect } from "next/navigation";

import { isSaasAdminEmail } from "@/lib/admin";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getAllPrizeSuggestions } from "@/lib/prize-suggestion-repository";
import { PrizeSuggestionsManager } from "@/components/merchant/prize-suggestions-manager";

export default async function PrizeSuggestionsAdminPage() {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");
  const suggestions = await getAllPrizeSuggestions();
  return <PrizeSuggestionsManager initialSuggestions={suggestions} />;
}
