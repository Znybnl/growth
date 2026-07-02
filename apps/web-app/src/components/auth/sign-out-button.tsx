"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);

    await fetch("/api/auth/signout", {
      method: "POST",
    });

    router.push("/connexion");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="rounded-[16px] border border-[#d7e0ed] px-3 py-2 text-xs font-semibold text-[#182033] disabled:opacity-60"
    >
      {isLoading ? "Sortie..." : "Déconnexion"}
    </button>
  );
}
