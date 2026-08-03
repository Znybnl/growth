"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  SESSION_LAST_ACTIVITY_STORAGE_PREFIX,
  SESSION_STARTED_STORAGE_PREFIX,
} from "@/lib/session-security";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);

    await fetch("/api/auth/signout", {
      method: "POST",
    });

    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (
          key?.startsWith(SESSION_STARTED_STORAGE_PREFIX) ||
          key?.startsWith(SESSION_LAST_ACTIVITY_STORAGE_PREFIX)
        ) {
          window.localStorage.removeItem(key);
          index -= 1;
        }
      }
    } catch {
      // Ignore storage cleanup failures.
    }

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
